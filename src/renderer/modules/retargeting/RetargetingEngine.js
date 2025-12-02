import * as THREE from 'three';

// Bind pose modes for retargeting
export const BindPoseModes = {
  DEFAULT: 0,  // Use skeleton's actual bind pose
  CURRENT: 1   // Use skeleton's current pose as bind pose
};

/**
 * RetargetingEngine - Core retargeting algorithms and transformations
 * Handles skeleton cloning, quaternion retargeting, and animation track transformation
 */
export class RetargetingEngine {
  constructor(skeletonAnalyzer) {
    this.skeletonAnalyzer = skeletonAnalyzer;
    
    // Retargeting data structures
    this.srcBindPose = null;
    this.trgBindPose = null;
    this.precomputedQuats = null;
    this.proportionRatio = 1.0;
    this.boneMapIndices = null;
    
    // Coordinate system correction (for Unreal Engine imports)
    this.applyCoordinateCorrection = false;
    this.coordinateCorrectionRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, -Math.PI / 2, 0) // -90 degrees around Y axis
    );
    
    // Retargeting options
    this.retargetOptions = {
      useWorldSpaceTransformation: false,
      useOptimalScale: true
    };
  }

  /**
   * Create transform object with position, quaternion, and scale
   * @returns {Object}
   */
  newTransform() {
    return {
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      s: new THREE.Vector3(1, 1, 1)
    };
  }

  /**
   * Deep clone of the skeleton. New bones are generated. Skeleton's parent
   * objects will not be linked to the cloned one
   * @param {THREE.Skeleton} skeleton
   * @param {number} poseMode - BindPoseModes enum value (DEFAULT or CURRENT)
   * @param {boolean} embedWorld - Include world transforms
   * @returns {THREE.Skeleton}
   */
  cloneRawSkeleton(skeleton, poseMode = BindPoseModes.DEFAULT, embedWorld = false) {
    const bones = skeleton.bones;
    const resultBones = new Array(bones.length);
    const parentIndices = new Int16Array(bones.length);
    
    // Clone bones without hierarchy
    for (let i = 0; i < bones.length; i++) {
      resultBones[i] = bones[i].clone(false);
      resultBones[i].parent = null;
    }
    
    // Rebuild hierarchy and track parent indices
    for (let i = 0; i < bones.length; i++) {
      const parentIdx = this.skeletonAnalyzer.findIndexOfBone(skeleton, bones[i].parent);
      if (parentIdx > -1) {
        resultBones[parentIdx].add(resultBones[i]);
      }
      parentIndices[i] = parentIdx;
    }
    
    // Update world matrices (assume bone 0 is root)
    resultBones[0].updateWorldMatrix(false, true);
    
    // Generate skeleton based on pose mode
    let resultSkeleton;
    switch (poseMode) {
      case BindPoseModes.CURRENT:
        // Use current pose as bind pose
        resultSkeleton = new THREE.Skeleton(resultBones);
        break;
      case BindPoseModes.DEFAULT:
      default:
        // Use actual bind pose
        const boneInverses = new Array(skeleton.boneInverses.length);
        for (let i = 0; i < boneInverses.length; i++) {
          boneInverses[i] = skeleton.boneInverses[i].clone();
        }
        resultSkeleton = new THREE.Skeleton(resultBones, boneInverses);
        resultSkeleton.pose();
        break;
    }
    
    // Attach custom attributes
    resultSkeleton.parentIndices = parentIndices;
    
    // Precompute world transforms (forward and inverse)
    const transforms = new Array(bones.length);
    const transformsInverses = new Array(bones.length);
    
    for (let i = 0; i < transforms.length; i++) {
      let t = this.newTransform();
      resultSkeleton.bones[i].matrixWorld.decompose(t.p, t.q, t.s);
      transforms[i] = t;
      
      t = this.newTransform();
      resultSkeleton.boneInverses[i].decompose(t.p, t.q, t.s);
      transformsInverses[i] = t;
    }
    
    resultSkeleton.transformsWorld = transforms;
    resultSkeleton.transformsWorldInverses = transformsInverses;
    
    // Embedded world transforms (for handling parent transforms)
    if (embedWorld && bones[0].parent) {
      const embedded = {
        forward: this.newTransform(),
        inverse: this.newTransform()
      };
      
      bones[0].parent.updateWorldMatrix(true, false);
      bones[0].parent.matrixWorld.decompose(
        embedded.forward.p,
        embedded.forward.q,
        embedded.forward.s
      );
      
      bones[0].parent.matrixWorld.clone().invert().decompose(
        embedded.inverse.p,
        embedded.inverse.q,
        embedded.inverse.s
      );
      
      resultSkeleton.transformsWorldEmbedded = embedded;
    }
    
    return resultSkeleton;
  }

  /**
   * Compute bone mapping indices
   * @param {THREE.Skeleton} srcSkeleton - Source skeleton
   * @param {THREE.Skeleton} trgSkeleton - Target skeleton
   * @param {Object} boneMapping - Bone name mapping
   * @returns {Object} - { idxMap: Int16Array, nameMap: Object }
   */
  computeBoneMapIndices(srcSkeleton, trgSkeleton, boneMapping) {
    if (!srcSkeleton || !trgSkeleton) return null;
    
    const srcBones = srcSkeleton.bones;
    const result = {
      idxMap: new Int16Array(srcBones.length),
      nameMap: boneMapping
    };
    
    result.idxMap.fill(-1);
    
    // Map bone names to indices
    for (const srcName in boneMapping) {
      const trgName = boneMapping[srcName];
      const srcIdx = this.skeletonAnalyzer.findIndexOfBoneByName(srcSkeleton, srcName);
      if (srcIdx < 0) continue;
      
      const trgIdx = this.skeletonAnalyzer.findIndexOfBoneByName(trgSkeleton, trgName);
      result.idxMap[srcIdx] = trgIdx;
    }
    
    return result;
  }

  /**
   * Compute proportion ratio between source and target skeletons
   * @returns {number}
   */
  computeProportionRatio() {
    if (!this.srcBindPose || !this.trgBindPose) return 1.0;
    
    const srcBones = this.srcBindPose.bones;
    const trgBones = this.trgBindPose.bones;
    
    let srcTotalLength = 0;
    let trgTotalLength = 0;
    let count = 0;
    
    // Calculate average bone length for mapped bones
    for (let i = 0; i < srcBones.length; i++) {
      const trgIdx = this.boneMapIndices.idxMap[i];
      if (trgIdx < 0) continue;
      
      const srcBone = srcBones[i];
      const trgBone = trgBones[trgIdx];
      
      if (srcBone.children.length > 0 && trgBone.children.length > 0) {
        const srcChild = srcBone.children[0];
        const trgChild = trgBone.children[0];
        
        const srcPos = srcBone.getWorldPosition(new THREE.Vector3());
        const srcChildPos = srcChild.getWorldPosition(new THREE.Vector3());
        const srcLength = srcPos.distanceTo(srcChildPos);
        
        const trgPos = trgBone.getWorldPosition(new THREE.Vector3());
        const trgChildPos = trgChild.getWorldPosition(new THREE.Vector3());
        const trgLength = trgPos.distanceTo(trgChildPos);
        
        if (srcLength > 0.001 && trgLength > 0.001) {
          srcTotalLength += srcLength;
          trgTotalLength += trgLength;
          count++;
        }
      }
    }
    
    return count > 0 ? trgTotalLength / srcTotalLength : 1.0;
  }

  /**
   * Compute optimal scale ratio between source and target skeletons
   * Uses multiple bone measurements and returns median to avoid outliers
   * @returns {number} - Optimal scale ratio
   */
  computeOptimalScale() {
    if (!this.srcBindPose || !this.trgBindPose) {
      console.warn('Cannot compute optimal scale: bind poses not initialized');
      return 1.0;
    }
    
    const measurements = [];
    
    // Define bone pairs to measure
    const bonePairs = [
      ['Hips', 'Spine'],
      ['Spine', 'Neck'],
      ['LeftArm', 'LeftForeArm'],
      ['LeftForeArm', 'LeftHand'],
      ['RightArm', 'RightForeArm'],
      ['RightForeArm', 'RightHand'],
      ['LeftUpLeg', 'LeftLeg'],
      ['LeftLeg', 'LeftFoot'],
      ['RightUpLeg', 'RightLeg'],
      ['RightLeg', 'RightFoot']
    ];
    
    for (const [startPattern, endPattern] of bonePairs) {
      // Find bones by pattern matching
      const srcStart = this.srcBindPose.bones.find(b => 
        new RegExp(startPattern, 'i').test(b.name)
      );
      const srcEnd = this.srcBindPose.bones.find(b => 
        new RegExp(endPattern, 'i').test(b.name)
      );
      const trgStart = this.trgBindPose.bones.find(b => 
        new RegExp(startPattern, 'i').test(b.name)
      );
      const trgEnd = this.trgBindPose.bones.find(b => 
        new RegExp(endPattern, 'i').test(b.name)
      );
      
      if (srcStart && srcEnd && trgStart && trgEnd) {
        const srcLength = srcStart.getWorldPosition(new THREE.Vector3())
          .distanceTo(srcEnd.getWorldPosition(new THREE.Vector3()));
        const trgLength = trgStart.getWorldPosition(new THREE.Vector3())
          .distanceTo(trgEnd.getWorldPosition(new THREE.Vector3()));
        
        if (srcLength > 0.001) {
          const ratio = trgLength / srcLength;
          measurements.push(ratio);
          console.log(`Scale measurement ${startPattern}-${endPattern}: ${ratio.toFixed(3)}`);
        }
      }
    }
    
    if (measurements.length === 0) {
      console.warn('No valid measurements for scale computation, using default');
      return 1.0;
    }
    
    // Return median to avoid outliers
    measurements.sort((a, b) => a - b);
    const mid = Math.floor(measurements.length / 2);
    const median = measurements.length % 2 === 0
      ? (measurements[mid - 1] + measurements[mid]) / 2
      : measurements[mid];
    
    console.log(`Optimal scale computed: ${median.toFixed(3)} (from ${measurements.length} measurements)`);
    console.log(`Scale range: ${measurements[0].toFixed(3)} to ${measurements[measurements.length - 1].toFixed(3)}`);
    
    return median;
  }

  /**
   * Precompute retargeting quaternions for efficiency
   * @returns {Object} - { left: Array, right: Array }
   */
  precomputeRetargetingQuats() {
    const left = new Array(this.srcBindPose.bones.length);
    const right = new Array(this.srcBindPose.bones.length);
    
    for (let srcIndex = 0; srcIndex < left.length; srcIndex++) {
      const trgIndex = this.boneMapIndices.idxMap[srcIndex];
      
      if (trgIndex < 0) {
        // Bone not mapped, cannot precompute
        left[srcIndex] = null;
        right[srcIndex] = null;
        continue;
      }
      
      // ==== COMPUTE LEFT SIDE ====
      let leftQuat = new THREE.Quaternion(0, 0, 0, 1);
      
      // Start with bindSrcWorldParent
      if (this.srcBindPose.bones[srcIndex].parent) {
        const parentIdx = this.srcBindPose.parentIndices[srcIndex];
        leftQuat.copy(this.srcBindPose.transformsWorld[parentIdx].q);
      }
      
      // Apply srcEmbedded (if exists)
      if (this.srcBindPose.transformsWorldEmbedded) {
        leftQuat.premultiply(this.srcBindPose.transformsWorldEmbedded.forward.q);
      }
      
      // Apply invTrgEmbedded (if exists)
      if (this.trgBindPose.transformsWorldEmbedded) {
        leftQuat.premultiply(this.trgBindPose.transformsWorldEmbedded.inverse.q);
      }
      
      // Apply invBindTrgWorldParent
      if (this.trgBindPose.bones[trgIndex].parent) {
        const parentIdx = this.trgBindPose.parentIndices[trgIndex];
        leftQuat.premultiply(this.trgBindPose.transformsWorldInverses[parentIdx].q);
      }
      
      left[srcIndex] = leftQuat;
      
      // ==== COMPUTE RIGHT SIDE ====
      let rightQuat = new THREE.Quaternion(0, 0, 0, 1);
      
      // Start with bindTrgWorld
      rightQuat.copy(this.trgBindPose.transformsWorld[trgIndex].q);
      
      // Apply trgEmbedded (if exists)
      if (this.trgBindPose.transformsWorldEmbedded) {
        rightQuat.premultiply(this.trgBindPose.transformsWorldEmbedded.forward.q);
      }
      
      // Apply invSrcEmbedded (if exists)
      if (this.srcBindPose.transformsWorldEmbedded) {
        rightQuat.premultiply(this.srcBindPose.transformsWorldEmbedded.inverse.q);
      }
      
      // Apply invBindSrcWorld
      rightQuat.premultiply(this.srcBindPose.transformsWorldInverses[srcIndex].q);
      
      right[srcIndex] = rightQuat;
    }
    
    return { left, right };
  }

  /**
   * Retarget a single quaternion
   * @param {number} srcIndex - Source bone index
   * @param {THREE.Quaternion} srcLocalQuat - Source local quaternion
   * @param {THREE.Quaternion} resultQuat - Result quaternion (optional)
   * @returns {THREE.Quaternion}
   */
  retargetQuaternion(srcIndex, srcLocalQuat, resultQuat = null) {
    if (!resultQuat) {
      resultQuat = new THREE.Quaternion(0, 0, 0, 1);
    }
    
    // Check if precomputed quaternions exist for this bone index
    if (!this.precomputedQuats.left[srcIndex] || !this.precomputedQuats.right[srcIndex]) {
      console.warn(`Missing precomputed quaternions for bone index ${srcIndex}, returning identity`);
      resultQuat.copy(srcLocalQuat);
      return resultQuat;
    }
    
    // trgLocal = left * srcLocal * right
    resultQuat.copy(srcLocalQuat);
    resultQuat.premultiply(this.precomputedQuats.left[srcIndex]);
    resultQuat.multiply(this.precomputedQuats.right[srcIndex]);
    
    return resultQuat;
  }

  /**
   * Retarget keyframe using world-space transformation approach
   * @param {number} srcBoneIndex - Source bone index
   * @param {*} keyframeData - Keyframe data (Vector3 or Quaternion)
   * @param {string} dataType - 'scale', 'rotation', or 'translation'
   * @returns {*} - Retargeted keyframe data
   */
  retargetKeyframeWorldSpace(srcBoneIndex, keyframeData, dataType) {
    const trgIndex = this.boneMapIndices.idxMap[srcBoneIndex];
    if (trgIndex < 0) return null;
    
    // Get T-pose transforms
    const srcBone = this.srcBindPose.bones[srcBoneIndex];
    const trgBone = this.trgBindPose.bones[trgIndex];
    
    // Get bind matrices
    const srcBindWorldMatrix = srcBone.matrixWorld.clone();
    const trgBindWorldMatrix = trgBone.matrixWorld.clone();
    const inverseBindMatrix = srcBindWorldMatrix.clone().invert();
    
    // Get target parent's inverse (for converting back to local space)
    const inverseParentMatrix = new THREE.Matrix4();
    if (trgBone.parent && trgBone.parent.isBone) {
      const parentIdx = this.trgBindPose.parentIndices[trgIndex];
      if (parentIdx >= 0) {
        inverseParentMatrix.copy(
          this.trgBindPose.bones[parentIdx].matrixWorld
        ).invert();
      }
    }
    
    // Create transform matrix from keyframe data
    const animMatrix = new THREE.Matrix4();
    const srcLocalMatrix = new THREE.Matrix4();
    srcLocalMatrix.compose(srcBone.position, srcBone.quaternion, srcBone.scale);
    
    switch(dataType) {
      case 'scale':
        const tempScale = new THREE.Matrix4().makeScale(
          keyframeData.x, keyframeData.y, keyframeData.z
        );
        animMatrix.multiplyMatrices(srcLocalMatrix, tempScale);
        break;
      case 'rotation':
        const tempRot = new THREE.Matrix4().makeRotationFromQuaternion(keyframeData);
        animMatrix.multiplyMatrices(srcLocalMatrix, tempRot);
        break;
      case 'translation':
        const tempTrans = new THREE.Matrix4().makeTranslation(
          keyframeData.x, keyframeData.y, keyframeData.z
        );
        animMatrix.multiplyMatrices(srcLocalMatrix, tempTrans);
        break;
    }
    
    // Apply world-space transformation
    let localMatrix = animMatrix.clone().premultiply(inverseBindMatrix);
    localMatrix.premultiply(trgBindWorldMatrix).multiply(inverseParentMatrix);
    
    // Decompose back to S/R/T
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    localMatrix.decompose(position, quaternion, scale);
    
    switch(dataType) {
      case 'scale': return scale;
      case 'rotation': return quaternion;
      case 'translation': return position;
    }
    
    return null;
  }

  /**
   * Retarget quaternion track
   * @param {THREE.QuaternionKeyframeTrack} srcTrack
   * @param {THREE.Skeleton} srcSkeleton
   * @param {THREE.Skeleton} trgSkeleton
   * @param {string} effectiveSourceRoot
   * @returns {THREE.QuaternionKeyframeTrack|null}
   */
  retargetQuaternionTrack(srcTrack, srcSkeleton, trgSkeleton, effectiveSourceRoot) {
    const boneName = srcTrack.name.slice(0, srcTrack.name.length - 11); // Remove ".quaternion"
    const boneIndex = this.skeletonAnalyzer.findIndexOfBoneByName(srcSkeleton, boneName);
    
    if (boneIndex < 0) {
      return null;
    }
    
    // Check if precomputed quaternions exist for this bone
    if (!this.precomputedQuats.left[boneIndex] || !this.precomputedQuats.right[boneIndex]) {
      console.warn(`Skipping bone with no precomputed quaternions: ${boneName}`);
      return null;
    }
    
    // Check if bone is mapped
    let targetBoneName = null;
    if (this.boneMapIndices.idxMap[boneIndex] >= 0) {
      targetBoneName = this.boneMapIndices.nameMap[boneName];
    } else {
      // Fallback: check if target skeleton has same bone name
      const targetBoneIndex = this.skeletonAnalyzer.findIndexOfBoneByName(trgSkeleton, boneName);
      if (targetBoneIndex >= 0) {
        targetBoneName = boneName;
        console.log(`Using fallback mapping for unmapped bone: ${boneName}`);
      } else {
        console.warn(`Skipping unmapped bone: ${boneName}`);
        return null;
      }
    }
    
    if (!targetBoneName) {
      return null;
    }
    
    // Check if this is the root bone (needs coordinate system correction)
    const isRootBone = effectiveSourceRoot && boneName === effectiveSourceRoot;
    
    const quat = new THREE.Quaternion(0, 0, 0, 1);
    const srcValues = srcTrack.values;
    const trgValues = new Float32Array(srcValues.length);
    
    // Temp quaternion for coordinate correction
    const correctedQuat = new THREE.Quaternion();
    const invCorrection = this.coordinateCorrectionRotation.clone().invert();
    
    for (let i = 0; i < srcValues.length; i += 4) {
      quat.set(srcValues[i], srcValues[i + 1], srcValues[i + 2], srcValues[i + 3]);
      
      // Apply coordinate system correction to root bone if enabled
      if (isRootBone && this.applyCoordinateCorrection) {
        correctedQuat.copy(invCorrection);
        correctedQuat.multiply(quat);
        correctedQuat.multiply(this.coordinateCorrectionRotation);
        quat.copy(correctedQuat);
      }
      
      // Use world-space transformation if enabled
      if (this.retargetOptions.useWorldSpaceTransformation) {
        const retargetedQuat = this.retargetKeyframeWorldSpace(boneIndex, quat, 'rotation');
        if (retargetedQuat) {
          quat.copy(retargetedQuat);
        }
      } else {
        this.retargetQuaternion(boneIndex, quat, quat);
      }
      
      trgValues[i] = quat.x;
      trgValues[i + 1] = quat.y;
      trgValues[i + 2] = quat.z;
      trgValues[i + 3] = quat.w;
    }
    
    return new THREE.QuaternionKeyframeTrack(
      targetBoneName + '.quaternion',
      srcTrack.times.slice(),
      trgValues
    );
  }

  /**
   * Retarget position track (for root motion)
   * @param {THREE.VectorKeyframeTrack} srcTrack
   * @param {THREE.Skeleton} srcSkeleton
   * @param {THREE.Skeleton} trgSkeleton
   * @param {string} effectiveSourceRoot
   * @returns {THREE.VectorKeyframeTrack|null}
   */
  retargetPositionTrack(srcTrack, srcSkeleton, trgSkeleton, effectiveSourceRoot) {
    const boneName = srcTrack.name.slice(0, srcTrack.name.length - 9); // Remove ".position"
    const boneIndex = this.skeletonAnalyzer.findIndexOfBoneByName(srcSkeleton, boneName);
    
    if (boneIndex < 0) {
      return null;
    }
    
    // Check if this is the designated root bone
    const isRootBone = effectiveSourceRoot && boneName === effectiveSourceRoot;
    
    if (!isRootBone) {
      console.log(`Skipping position track for non-root bone: ${boneName}`);
      return null;
    }
    
    // Check if bone is mapped
    let targetBoneName = null;
    if (this.boneMapIndices.idxMap[boneIndex] >= 0) {
      targetBoneName = this.boneMapIndices.nameMap[boneName];
    } else {
      const targetBoneIndex = this.skeletonAnalyzer.findIndexOfBoneByName(trgSkeleton, boneName);
      if (targetBoneIndex >= 0) {
        targetBoneName = boneName;
      }
    }
    
    if (!targetBoneName) {
      return null;
    }
    
    const srcValues = srcTrack.values;
    const trgValues = new Float32Array(srcValues.length);
    
    // Find target bone index
    const targetBoneIndex = this.skeletonAnalyzer.findIndexOfBoneByName(trgSkeleton, targetBoneName);
    
    if (targetBoneIndex < 0) {
      return null;
    }
    
    console.log(`Retargeting root position: ${boneName} → ${targetBoneName}`);
    
    // Get the bind pose positions
    const srcBone = this.srcBindPose.bones[boneIndex];
    const trgBone = this.trgBindPose.bones[targetBoneIndex];
    
    const srcBindLocalPos = new THREE.Vector3();
    srcBindLocalPos.copy(srcBone.position);
    
    const trgBindLocalPos = new THREE.Vector3();
    trgBindLocalPos.copy(trgBone.position);
    
    // Transfer the animation as RELATIVE movement from bind pose
    for (let i = 0; i < srcValues.length; i += 3) {
      const animPos = new THREE.Vector3(
        srcValues[i],
        srcValues[i + 1],
        srcValues[i + 2]
      );
      
      // Calculate the movement delta from source bind pose
      const movementDelta = new THREE.Vector3();
      movementDelta.subVectors(animPos, srcBindLocalPos);
      
      // Apply coordinate system correction if enabled
      if (this.applyCoordinateCorrection) {
        movementDelta.applyQuaternion(this.coordinateCorrectionRotation);
      }
      
      // Scale the movement by proportion ratio
      movementDelta.multiplyScalar(this.proportionRatio);
      
      // Apply the movement to target bind pose
      const targetPos = new THREE.Vector3();
      targetPos.addVectors(trgBindLocalPos, movementDelta);
      
      trgValues[i] = targetPos.x;
      trgValues[i + 1] = targetPos.y;
      trgValues[i + 2] = targetPos.z;
    }
    
    console.log(`  ✓ Root position track retargeted: ${srcValues.length / 3} keyframes`);
    
    return new THREE.VectorKeyframeTrack(
      targetBoneName + '.position',
      srcTrack.times.slice(),
      trgValues
    );
  }

  /**
   * Retarget scale track
   * @param {THREE.VectorKeyframeTrack} srcTrack
   * @param {THREE.Skeleton} srcSkeleton
   * @param {THREE.Skeleton} trgSkeleton
   * @returns {THREE.VectorKeyframeTrack|null}
   */
  retargetScaleTrack(srcTrack, srcSkeleton, trgSkeleton) {
    const boneName = srcTrack.name.slice(0, srcTrack.name.length - 6); // Remove ".scale"
    const boneIndex = this.skeletonAnalyzer.findIndexOfBoneByName(srcSkeleton, boneName);
    
    if (boneIndex < 0) {
      return null;
    }
    
    // Check if bone is mapped
    let targetBoneName = null;
    let trgIndex = -1;
    if (this.boneMapIndices.idxMap[boneIndex] >= 0) {
      trgIndex = this.boneMapIndices.idxMap[boneIndex];
      targetBoneName = this.boneMapIndices.nameMap[boneName];
    } else {
      const targetBoneIndex = this.skeletonAnalyzer.findIndexOfBoneByName(trgSkeleton, boneName);
      if (targetBoneIndex >= 0) {
        trgIndex = targetBoneIndex;
        targetBoneName = boneName;
      }
    }
    
    if (!targetBoneName || trgIndex < 0) {
      return null;
    }
    
    // Get bind pose scales
    const srcScale = this.srcBindPose.bones[boneIndex].scale;
    const trgScale = this.trgBindPose.bones[trgIndex].scale;
    
    // Compute scale ratio
    const scaleRatio = new THREE.Vector3(
      trgScale.x / srcScale.x,
      trgScale.y / srcScale.y,
      trgScale.z / srcScale.z
    );
    
    const srcValues = srcTrack.values;
    const trgValues = new Float32Array(srcValues.length);
    
    // Apply scale ratio to each keyframe
    for (let i = 0; i < srcValues.length; i += 3) {
      trgValues[i] = srcValues[i] * scaleRatio.x;
      trgValues[i + 1] = srcValues[i + 1] * scaleRatio.y;
      trgValues[i + 2] = srcValues[i + 2] * scaleRatio.z;
    }
    
    return new THREE.VectorKeyframeTrack(
      targetBoneName + '.scale',
      srcTrack.times.slice(),
      trgValues
    );
  }

  /**
   * Initialize retargeting data structures
   * @param {THREE.Skeleton} srcSkeleton - Source skeleton
   * @param {THREE.Skeleton} trgSkeleton - Target skeleton
   * @param {Object} boneMapping - Bone name mapping
   * @param {Object} options - Retargeting options
   */
  initializeRetargeting(srcSkeleton, trgSkeleton, boneMapping, options = {}) {
    if (!srcSkeleton || !trgSkeleton) {
      throw new Error('Source or target skeleton not found');
    }
    
    const {
      srcPoseMode = BindPoseModes.DEFAULT,
      trgPoseMode = BindPoseModes.DEFAULT,
      srcEmbedWorld = true,
      trgEmbedWorld = true
    } = options;
    
    console.log('Initializing retargeting...');
    console.log('  Source skeleton:', srcSkeleton.bones.length, 'bones');
    console.log('  Target skeleton:', trgSkeleton.bones.length, 'bones');
    
    // Compute bone mapping indices
    this.boneMapIndices = this.computeBoneMapIndices(srcSkeleton, trgSkeleton, boneMapping);
    const mappedCount = this.boneMapIndices.idxMap.filter(i => i >= 0).length;
    console.log('  Mapped bones:', mappedCount);
    
    // Clone skeletons for bind pose
    this.srcBindPose = this.cloneRawSkeleton(srcSkeleton, srcPoseMode, srcEmbedWorld);
    this.trgBindPose = this.cloneRawSkeleton(trgSkeleton, trgPoseMode, trgEmbedWorld);
    
    console.log('  Bind poses cloned');
    
    // Precompute quaternions for efficient retargeting
    this.precomputedQuats = this.precomputeRetargetingQuats();
    console.log('  Quaternions precomputed');
    
    // Compute proportion ratio for position scaling
    if (this.retargetOptions.useOptimalScale) {
      this.proportionRatio = this.computeOptimalScale();
      console.log('Using optimal scale computation');
    } else {
      this.proportionRatio = this.computeProportionRatio();
      console.log('Using basic proportion ratio');
    }
    
    console.log('Retargeting initialized successfully:', {
      proportionRatio: this.proportionRatio.toFixed(3),
      mappedBones: mappedCount
    });
  }

  /**
   * Set retargeting options
   * @param {Object} options - Retargeting options
   */
  setRetargetOptions(options) {
    this.retargetOptions = {
      ...this.retargetOptions,
      ...options
    };
  }

  /**
   * Set coordinate correction
   * @param {boolean} enabled - Whether to apply coordinate correction
   */
  setCoordinateCorrection(enabled) {
    this.applyCoordinateCorrection = enabled;
  }
}
