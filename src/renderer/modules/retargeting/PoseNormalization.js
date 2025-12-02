import * as THREE from 'three';

/**
 * PoseNormalization - T-pose/A-pose utilities for skeleton normalization
 * Handles pose detection, pose application, and pose validation
 */
export class PoseNormalization {
  constructor(skeletonAnalyzer) {
    this.skeletonAnalyzer = skeletonAnalyzer;
  }

  /**
   * Detect pose type from skeleton
   * @param {THREE.Skeleton} skeleton - Skeleton to analyze
   * @returns {string} - Pose type: 'T-pose', 'A-pose', 'other', 'unknown'
   */
  detectPoseType(skeleton) {
    try {
      // Find arm bones
      const leftArmBone = skeleton.bones.find(b => 
        /left.*arm|arm.*l|upperarm.*l|l.*upperarm/i.test(b.name) && !/hand|finger/i.test(b.name)
      );
      const rightArmBone = skeleton.bones.find(b => 
        /right.*arm|arm.*r|upperarm.*r|r.*upperarm/i.test(b.name) && !/hand|finger/i.test(b.name)
      );
      
      if (!leftArmBone || !rightArmBone) {
        console.log('Could not find arm bones for pose detection');
        return 'unknown';
      }
      
      // Get first child (forearm) to measure direction
      const leftChild = leftArmBone.children.find(c => c.isBone);
      const rightChild = rightArmBone.children.find(c => c.isBone);
      
      if (!leftChild || !rightChild) {
        console.log('Could not find forearm bones for pose detection');
        return 'unknown';
      }
      
      // Calculate arm directions in world space
      const leftDir = new THREE.Vector3();
      const rightDir = new THREE.Vector3();
      
      leftDir.subVectors(
        leftChild.getWorldPosition(new THREE.Vector3()),
        leftArmBone.getWorldPosition(new THREE.Vector3())
      ).normalize();
      
      rightDir.subVectors(
        rightChild.getWorldPosition(new THREE.Vector3()),
        rightArmBone.getWorldPosition(new THREE.Vector3())
      ).normalize();
      
      // Measure angle from horizontal
      const horizontalAxis = new THREE.Vector3(1, 0, 0);
      const leftAngle = Math.abs(leftDir.angleTo(horizontalAxis)) * 180 / Math.PI;
      const rightAngle = Math.abs(rightDir.angleTo(horizontalAxis.negate())) * 180 / Math.PI;
      
      // Also check vertical component
      const leftVertical = Math.abs(leftDir.y);
      const rightVertical = Math.abs(rightDir.y);
      
      console.log('Pose detection:', {
        leftAngle: leftAngle.toFixed(1),
        rightAngle: rightAngle.toFixed(1),
        leftVertical: leftVertical.toFixed(2),
        rightVertical: rightVertical.toFixed(2)
      });
      
      // T-pose: arms horizontal (0-25 degrees from horizontal, low vertical component)
      if (leftAngle < 25 && rightAngle < 25 && leftVertical < 0.3 && rightVertical < 0.3) {
        return 'T-pose';
      }
      
      // A-pose: arms at ~30-60 degrees down from horizontal
      if (leftAngle > 25 && leftAngle < 75 && leftVertical > 0.3) {
        return 'A-pose';
      }
      
      return 'other';
    } catch (error) {
      console.error('Error detecting pose type:', error);
      return 'unknown';
    }
  }

  /**
   * Validate retargeting poses and return analysis
   * @param {THREE.Skeleton} srcBindPose - Source bind pose
   * @param {THREE.Skeleton} trgBindPose - Target bind pose
   * @returns {Object} - Pose validation results
   */
  validatePoses(srcBindPose, trgBindPose) {
    if (!srcBindPose || !trgBindPose) {
      return {
        valid: false,
        message: 'Bind poses not initialized',
        sourceInTPose: false,
        targetInTPose: false
      };
    }
    
    const srcPose = this.detectPoseType(srcBindPose);
    const trgPose = this.detectPoseType(trgBindPose);
    
    const compatible = (srcPose === trgPose) || 
                       (srcPose === 'T-pose' && trgPose === 'A-pose') ||
                       (srcPose === 'A-pose' && trgPose === 'T-pose');
    
    let recommendation = '';
    if (!compatible) {
      recommendation = `Source is ${srcPose} and target is ${trgPose}. Consider applying T-pose normalization.`;
    } else if (srcPose !== 'T-pose' && trgPose !== 'T-pose') {
      recommendation = 'Poses are compatible but T-pose normalization may improve results.';
    } else {
      recommendation = 'Poses are compatible for retargeting.';
    }
    
    return {
      valid: compatible,
      sourceInTPose: srcPose === 'T-pose',
      targetInTPose: trgPose === 'T-pose',
      sourcePose: srcPose,
      targetPose: trgPose,
      recommendation: recommendation
    };
  }

  /**
   * Detect bone names for T-Pose application
   * @param {THREE.Skeleton} skeleton
   * @returns {Object} - Bone name map
   */
  detectTPoseBones(skeleton) {
    const boneMap = {};
    
    // Validate skeleton input
    if (!skeleton || !skeleton.bones) {
      console.error('Invalid skeleton passed to detectTPoseBones:', skeleton);
      throw new Error('Invalid skeleton: missing bones array');
    }
    
    const patterns = {
      'Hips': ['hips', 'pelvis'],
      'Spine': ['spine', 'spine1'],
      'LeftUpLeg': ['leftupleg', 'left_upleg', 'thigh_l', 'l_thigh'],
      'LeftFoot': ['leftfoot', 'left_foot', 'foot_l', 'l_foot'],
      'RightUpLeg': ['rightupleg', 'right_upleg', 'thigh_r', 'r_thigh'],
      'RightFoot': ['rightfoot', 'right_foot', 'foot_r', 'r_foot'],
      'LeftArm': ['leftarm', 'left_arm', 'upperarm_l', 'l_upperarm'],
      'LeftHand': ['lefthand', 'left_hand', 'hand_l', 'l_hand'],
      'RightArm': ['rightarm', 'right_arm', 'upperarm_r', 'r_upperarm'],
      'RightHand': ['righthand', 'right_hand', 'hand_r', 'r_hand']
    };
    
    for (const [key, searchPatterns] of Object.entries(patterns)) {
      for (const bone of skeleton.bones) {
        const boneLower = bone.name.toLowerCase()
          .replace(/mixamorig:/gi, '')
          .replace(/[_\s]/g, '');
        
        for (const pattern of searchPatterns) {
          const patternClean = pattern.replace(/[_\s]/g, '');
          if (boneLower === patternClean || boneLower.includes(patternClean)) {
            boneMap[key] = bone.name;
            break;
          }
        }
        if (boneMap[key]) break;
      }
    }
    
    return boneMap;
  }

  /**
   * Extend bone chain to follow parent direction (for T-pose)
   * @param {THREE.Skeleton} skeleton
   * @param {THREE.Bone|string} origin - Origin bone or name
   * @param {THREE.Bone|string} end - End bone or name (optional)
   */
  extendChain(skeleton, origin, end = null) {
    // Get bone references
    const base = typeof origin === 'string' ? 
      skeleton.bones.find(b => b.name === origin) : origin;
    
    if (!base) {
      console.warn('extendChain: origin bone not found:', origin);
      return;
    }
    
    // Find end bone
    let previous = null;
    if (!end) {
      // Find last bone in chain
      let current = base;
      while (current.children.length > 0) {
        current = current.children[0];
      }
      previous = current;
    } else {
      previous = typeof end === 'string' ?
        skeleton.bones.find(b => b.name === end) : end;
    }
    
    if (!previous) {
      console.warn('extendChain: end bone not found:', end);
      return;
    }
    
    // Walk up the chain and extend
    let current = previous.parent;
    let next = current ? current.parent : null;
    
    while (next && next !== base.parent) {
      const prevPos = previous.getWorldPosition(new THREE.Vector3());
      const currPos = current.getWorldPosition(new THREE.Vector3());
      const nextPos = next.getWorldPosition(new THREE.Vector3());
      
      // Desired direction: from next to current
      const desired_dir = new THREE.Vector3();
      desired_dir.subVectors(currPos, nextPos).normalize();
      
      // Current direction: from current to previous
      const current_dir = new THREE.Vector3();
      current_dir.subVectors(prevPos, currPos).normalize();
      
      // Compute rotation angle
      const angle = current_dir.angleTo(desired_dir);
      
      if (Math.abs(angle) > 0.001) {
        // Compute rotation axis
        const axis = new THREE.Vector3();
        axis.crossVectors(current_dir, desired_dir).normalize();
        
        // Create rotation quaternion
        const rot = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        
        // Get current world rotation
        let currRot = current.getWorldQuaternion(new THREE.Quaternion());
        currRot = rot.multiply(currRot);
        
        // Convert to local space
        const nextRot = next.getWorldQuaternion(new THREE.Quaternion());
        const localRot = nextRot.invert().multiply(currRot);
        
        // Apply rotation
        current.quaternion.copy(localRot);
        current.updateMatrix();
        current.updateMatrixWorld(false, true);
      }
      
      // Move up the chain
      previous = current;
      current = next;
      next = next.parent;
    }
  }

  /**
   * Align bone direction to a specific axis
   * @param {THREE.Skeleton} skeleton
   * @param {string|THREE.Bone} origin - Origin bone or name
   * @param {string|THREE.Bone} end - End bone or name (optional)
   * @param {THREE.Vector3} axis - Target axis
   */
  alignBoneToAxis(skeleton, origin, end, axis) {
    // Get origin bone
    const oBone = typeof origin === 'string' ?
      skeleton.bones.find(b => b.name === origin) : origin;
    
    if (!oBone) {
      console.warn('alignBoneToAxis: origin bone not found:', origin);
      return;
    }
    
    oBone.updateMatrixWorld(true, true);
    
    // Get end bone
    let eBone = null;
    if (end) {
      eBone = typeof end === 'string' ?
        skeleton.bones.find(b => b.name === end) : end;
    } else if (oBone.children.length > 0) {
      eBone = oBone.children[0];
    }
    
    if (!eBone) {
      console.warn('alignBoneToAxis: end bone not found:', end);
      return;
    }
    
    // Get world positions
    const oPos = oBone.getWorldPosition(new THREE.Vector3());
    const ePos = eBone.getWorldPosition(new THREE.Vector3());
    
    // Compute current direction
    const dir = new THREE.Vector3();
    dir.subVectors(ePos, oPos).normalize();
    
    // Compute rotation angle
    const angle = dir.angleTo(axis);
    
    if (Math.abs(angle) > 0.001) {
      // Compute rotation axis
      const new_axis = new THREE.Vector3();
      new_axis.crossVectors(dir, axis).normalize();
      
      // Create rotation quaternion
      const rot = new THREE.Quaternion().setFromAxisAngle(new_axis, angle);
      
      // Get current world rotation
      let oRot = oBone.getWorldQuaternion(new THREE.Quaternion());
      oRot = rot.multiply(oRot);
      
      // Convert to local space
      let oLocalRot = oRot;
      if (oBone.parent) {
        const oParentRot = oBone.parent.getWorldQuaternion(new THREE.Quaternion());
        oLocalRot = oParentRot.invert().multiply(oRot);
      }
      
      // Apply rotation
      oBone.quaternion.copy(oLocalRot);
      oBone.updateMatrix();
      oBone.updateMatrixWorld(false, true);
    }
  }

  /**
   * Rotate bone to look at a specific axis using a plane defined by two vectors
   * @param {THREE.Bone} bone - Bone to rotate
   * @param {THREE.Vector3} dir_a - First direction vector
   * @param {THREE.Vector3} dir_b - Second direction vector
   * @param {THREE.Vector3} axis - Target axis
   */
  lookBoneAtAxis(bone, dir_a, dir_b, axis) {
    // Compute normal of the plane (current looking direction)
    const rot_axis = new THREE.Vector3();
    rot_axis.crossVectors(dir_a, dir_b).normalize();
    
    // Compute angle to desired axis
    const angle = rot_axis.angleTo(axis);
    
    if (Math.abs(angle) > 0.001) {
      // Compute rotation axis
      const new_axis = new THREE.Vector3();
      new_axis.crossVectors(rot_axis, axis).normalize();
      
      // Create rotation quaternion
      const rot = new THREE.Quaternion().setFromAxisAngle(new_axis, angle);
      
      // Get current world rotation
      let global_rot = bone.getWorldQuaternion(new THREE.Quaternion());
      global_rot = rot.multiply(global_rot);
      
      // Convert to local space
      let local_rot = global_rot;
      if (bone.parent) {
        const parent_rot = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        local_rot = parent_rot.invert().multiply(global_rot);
      }
      
      // Apply rotation
      bone.quaternion.copy(local_rot);
      bone.updateMatrix();
      bone.updateMatrixWorld(false, true);
    }
  }

  /**
   * Apply T-Pose to skeleton (useful for normalizing bind poses)
   * @param {THREE.Skeleton} skeleton
   * @param {Object} boneMap - Bone name mapping (optional)
   * @returns {Object} - { skeleton, map }
   */
  applyTPose(skeleton, boneMap = null) {
    if (!boneMap) {
      // Use automatic bone detection
      boneMap = this.detectTPoseBones(skeleton);
    }
    
    console.log('Applying T-Pose with bone map:', boneMap);
    
    // Define standard axes
    const x_axis = new THREE.Vector3(1, 0, 0);
    const y_axis = new THREE.Vector3(0, 1, 0);
    const z_axis = new THREE.Vector3(0, 0, 1);
    const neg_x_axis = new THREE.Vector3(-1, 0, 0);
    const neg_y_axis = new THREE.Vector3(0, -1, 0);
    
    // Extend spine chain
    if (boneMap.Hips && boneMap.Spine) {
      this.extendChain(skeleton, boneMap.Hips, boneMap.Spine);
    }
    
    // Extend limb chains
    const limbs = [
      [boneMap.LeftUpLeg, boneMap.LeftFoot],
      [boneMap.RightUpLeg, boneMap.RightFoot],
      [boneMap.LeftArm, boneMap.LeftHand],
      [boneMap.RightArm, boneMap.RightHand]
    ];
    
    for (const [start, end] of limbs) {
      if (start && end) {
        this.extendChain(skeleton, start, end);
      }
    }
    
    // Align spine to Y axis
    if (boneMap.Hips && boneMap.Spine) {
      this.alignBoneToAxis(skeleton, boneMap.Hips, boneMap.Spine, y_axis);
    }
    
    // Align legs down Y axis
    if (boneMap.LeftUpLeg && boneMap.LeftFoot) {
      this.alignBoneToAxis(skeleton, boneMap.LeftUpLeg, boneMap.LeftFoot, neg_y_axis);
    }
    if (boneMap.RightUpLeg && boneMap.RightFoot) {
      this.alignBoneToAxis(skeleton, boneMap.RightUpLeg, boneMap.RightFoot, neg_y_axis);
    }
    
    // Align arms to X axis (T-pose characteristic)
    // Left arm points to character's left (+X in world space)
    // Right arm points to character's right (-X in world space)
    if (boneMap.LeftArm && boneMap.LeftHand) {
      console.log('Aligning left arm to +X axis');
      this.alignBoneToAxis(skeleton, boneMap.LeftArm, boneMap.LeftHand, x_axis);
    }
    if (boneMap.RightArm && boneMap.RightHand) {
      console.log('Aligning right arm to -X axis');
      this.alignBoneToAxis(skeleton, boneMap.RightArm, boneMap.RightHand, neg_x_axis);
    }
    
    // Optional: Align character to face Z axis
    if (boneMap.RightArm && boneMap.LeftArm && boneMap.Spine) {
      const rightArmBone = skeleton.bones.find(b => b.name === boneMap.RightArm);
      const leftArmBone = skeleton.bones.find(b => b.name === boneMap.LeftArm);
      const spineBone = skeleton.bones.find(b => b.name === boneMap.Spine);
      
      if (rightArmBone && leftArmBone && spineBone) {
        const rArmPos = rightArmBone.getWorldPosition(new THREE.Vector3());
        const lArmPos = leftArmBone.getWorldPosition(new THREE.Vector3());
        
        const arms_dir = new THREE.Vector3();
        arms_dir.subVectors(lArmPos, rArmPos).normalize();
        
        this.lookBoneAtAxis(skeleton.bones[0], arms_dir, y_axis, z_axis);
      }
    }
    
    // Update skeleton
    skeleton.bones[0].updateMatrixWorld(true, true);
    
    console.log('T-Pose applied successfully');
    
    return { skeleton, map: boneMap };
  }

  /**
   * Apply A-Pose normalization to skeleton
   * A-pose has arms at ~45 degree angle downward instead of horizontal (T-pose)
   * @param {THREE.Skeleton} skeleton - The skeleton to normalize
   * @param {Object} boneMap - Optional bone name mapping
   * @returns {Object} - { skeleton, map: boneMap }
   */
  applyAPose(skeleton, boneMap = null) {
    if (!boneMap) {
      // Use automatic bone detection (same as T-pose)
      boneMap = this.detectTPoseBones(skeleton);
    }
    
    console.log('Applying A-Pose with bone map:', boneMap);
    
    // Define standard axes
    const y_axis = new THREE.Vector3(0, 1, 0);
    const neg_y_axis = new THREE.Vector3(0, -1, 0);
    const z_axis = new THREE.Vector3(0, 0, 1);
    
    // A-pose arm directions: 45 degrees down from horizontal
    // Left arm: +X and -Y (pointing left and down)
    // Right arm: -X and -Y (pointing right and down)
    const left_arm_axis = new THREE.Vector3(1, -1, 0).normalize();  // 45° down-left
    const right_arm_axis = new THREE.Vector3(-1, -1, 0).normalize(); // 45° down-right
    
    // Extend spine chain
    if (boneMap.Hips && boneMap.Spine) {
      this.extendChain(skeleton, boneMap.Hips, boneMap.Spine);
    }
    
    // Extend limb chains
    const limbs = [
      [boneMap.LeftUpLeg, boneMap.LeftFoot],
      [boneMap.RightUpLeg, boneMap.RightFoot],
      [boneMap.LeftArm, boneMap.LeftHand],
      [boneMap.RightArm, boneMap.RightHand]
    ];
    
    for (const [start, end] of limbs) {
      if (start && end) {
        this.extendChain(skeleton, start, end);
      }
    }
    
    // Align spine to Y axis
    if (boneMap.Hips && boneMap.Spine) {
      this.alignBoneToAxis(skeleton, boneMap.Hips, boneMap.Spine, y_axis);
    }
    
    // Align legs down Y axis
    if (boneMap.LeftUpLeg && boneMap.LeftFoot) {
      this.alignBoneToAxis(skeleton, boneMap.LeftUpLeg, boneMap.LeftFoot, neg_y_axis);
    }
    if (boneMap.RightUpLeg && boneMap.RightFoot) {
      this.alignBoneToAxis(skeleton, boneMap.RightUpLeg, boneMap.RightFoot, neg_y_axis);
    }
    
    // Align arms to 45° angle (A-pose characteristic)
    // Left arm points to character's left and down (+X, -Y)
    // Right arm points to character's right and down (-X, -Y)
    if (boneMap.LeftArm && boneMap.LeftHand) {
      console.log('Aligning left arm to 45° down-left axis');
      this.alignBoneToAxis(skeleton, boneMap.LeftArm, boneMap.LeftHand, left_arm_axis);
    }
    if (boneMap.RightArm && boneMap.RightHand) {
      console.log('Aligning right arm to 45° down-right axis');
      this.alignBoneToAxis(skeleton, boneMap.RightArm, boneMap.RightHand, right_arm_axis);
    }
    
    // Optional: Align character to face Z axis
    if (boneMap.RightArm && boneMap.LeftArm && boneMap.Spine) {
      const rightArmBone = skeleton.bones.find(b => b.name === boneMap.RightArm);
      const leftArmBone = skeleton.bones.find(b => b.name === boneMap.LeftArm);
      const spineBone = skeleton.bones.find(b => b.name === boneMap.Spine);
      
      if (rightArmBone && leftArmBone && spineBone) {
        const rArmPos = rightArmBone.getWorldPosition(new THREE.Vector3());
        const lArmPos = leftArmBone.getWorldPosition(new THREE.Vector3());
        
        const arms_dir = new THREE.Vector3();
        arms_dir.subVectors(lArmPos, rArmPos).normalize();
        
        this.lookBoneAtAxis(skeleton.bones[0], arms_dir, y_axis, z_axis);
      }
    }
    
    // Update skeleton
    skeleton.bones[0].updateMatrixWorld(true, true);
    
    console.log('A-Pose applied successfully');
    
    return { skeleton, map: boneMap };
  }
}
