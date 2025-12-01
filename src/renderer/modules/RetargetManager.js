import * as THREE from 'three';

export class RetargetManager {
  constructor(sceneManager, modelLoader, animationManager) {
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.animationManager = animationManager;
    
    // Store source and target model data
    this.sourceModel = null;
    this.targetModel = null;
    this.sourceSkeletonInfo = null;
    this.targetSkeletonInfo = null;
    
    // Bone mapping: { sourceBoneName: targetBoneName }
    this.boneMapping = {};
    
    // Detected rig types
    this.sourceRigType = 'unknown';
    this.targetRigType = 'unknown';
    
    // Selected bones for manual mapping
    this.selectedSourceBone = null;
    this.selectedTargetBone = null;
    
    // Confidence score for automatic mapping
    this.mappingConfidence = 0;
    
    // Retargeting data structures
    this.srcBindPose = null;
    this.trgBindPose = null;
    this.precomputedQuats = null;
    this.proportionRatio = 1.0;
    this.boneMapIndices = null;
    
    // Root bone tracking
    this.sourceRootBone = null;
    this.targetRootBone = null;
  }
  
  /**
   * Detect duplicate bone names in skeleton
   * @param {Array<string>} boneNames - Array of bone names
   * @returns {Array<string>} - Array of duplicate bone names
   */
  detectDuplicateBoneNames(boneNames) {
    if (!boneNames || boneNames.length === 0) return [];
    
    const nameCount = {};
    const duplicates = [];
    
    for (const name of boneNames) {
      nameCount[name] = (nameCount[name] || 0) + 1;
    }
    
    for (const [name, count] of Object.entries(nameCount)) {
      if (count > 1) {
        duplicates.push(`${name} (x${count})`);
      }
    }
    
    return duplicates;
  }
  
  /**
   * Detect rig type based on bone names
   * @param {Array<string>} boneNames - Array of bone names
   * @returns {string} - Rig type: 'mixamo', 'ue5', 'unity', 'humanoid', or 'custom'
   */
  detectRigType(boneNames) {
    if (!boneNames || boneNames.length === 0) {
      return 'custom';
    }
    
    // Convert to lowercase for case-insensitive matching
    const lowerBoneNames = boneNames.map(name => name.toLowerCase());
    const boneNameString = lowerBoneNames.join('|');
    
    // Check for Mixamo rig (has "mixamorig:" prefix)
    if (boneNames.some(name => name.includes('mixamorig:'))) {
      return 'mixamo';
    }
    
    // Check for UE5/Unreal Engine rig
    if (boneNameString.includes('pelvis') && 
        boneNameString.includes('spine_01') && 
        (boneNameString.includes('clavicle_l') || boneNameString.includes('clavicle_r'))) {
      return 'ue5';
    }
    
    // Check for Unity Humanoid rig
    if (boneNameString.includes('hips') && 
        boneNameString.includes('spine') && 
        boneNameString.includes('chest') &&
        (boneNameString.includes('leftupperarm') || boneNameString.includes('left upper arm'))) {
      return 'unity';
    }
    
    // Check for generic humanoid rig (has common bones)
    const hasHips = boneNameString.includes('hips') || boneNameString.includes('pelvis');
    const hasSpine = boneNameString.includes('spine');
    const hasHead = boneNameString.includes('head') || boneNameString.includes('neck');
    const hasArms = boneNameString.includes('arm') || boneNameString.includes('shoulder');
    const hasLegs = boneNameString.includes('leg') || boneNameString.includes('thigh');
    
    if (hasHips && hasSpine && hasHead && hasArms && hasLegs) {
      return 'humanoid';
    }
    
    return 'custom';
  }
  
  /**
   * Generate automatic bone mapping between two rigs
   * @param {Array<string>} sourceBones - Source skeleton bone names
   * @param {Array<string>} targetBones - Target skeleton bone names
   * @returns {Object} - { mapping: {}, confidence: number }
   */
  generateAutomaticMapping(sourceBones, targetBones) {
    const mapping = {};
    let matchedCount = 0;
    
    // Standard humanoid bone roles and their common naming variations
    const boneRoles = {
      'Root': ['root', 'reference', 'armature'],
      'Hips': ['hips', 'pelvis', 'hip'],
      'Spine': ['spine', 'spine1', 'spine_01'],
      'Spine1': ['spine1', 'spine2', 'spine_02', 'chest'],
      'Spine2': ['spine2', 'spine3', 'spine_03', 'upperchest'],
      'Neck': ['neck', 'neck1'],
      'Head': ['head', 'head1'],
      
      'LeftShoulder': ['leftshoulder', 'left_shoulder', 'shoulder_l', 'clavicle_l', 'l_clavicle'],
      'LeftArm': ['leftarm', 'left_arm', 'upperarm_l', 'arm_l', 'l_upperarm'],
      'LeftForeArm': ['leftforearm', 'left_forearm', 'lowerarm_l', 'forearm_l', 'l_forearm'],
      'LeftHand': ['lefthand', 'left_hand', 'hand_l', 'l_hand'],
      
      'RightShoulder': ['rightshoulder', 'right_shoulder', 'shoulder_r', 'clavicle_r', 'r_clavicle'],
      'RightArm': ['rightarm', 'right_arm', 'upperarm_r', 'arm_r', 'r_upperarm'],
      'RightForeArm': ['rightforearm', 'right_forearm', 'lowerarm_r', 'forearm_r', 'r_forearm'],
      'RightHand': ['righthand', 'right_hand', 'hand_r', 'r_hand'],
      
      'LeftUpLeg': ['leftupleg', 'left_upleg', 'thigh_l', 'leg_l', 'l_thigh'],
      'LeftLeg': ['leftleg', 'left_leg', 'calf_l', 'shin_l', 'l_calf'],
      'LeftFoot': ['leftfoot', 'left_foot', 'foot_l', 'l_foot'],
      'LeftToeBase': ['lefttoebase', 'left_toebase', 'toe_l', 'l_toe'],
      
      'RightUpLeg': ['rightupleg', 'right_upleg', 'thigh_r', 'leg_r', 'r_thigh'],
      'RightLeg': ['rightleg', 'right_leg', 'calf_r', 'shin_r', 'r_calf'],
      'RightFoot': ['rightfoot', 'right_foot', 'foot_r', 'r_foot'],
      'RightToeBase': ['righttoebase', 'right_toebase', 'toe_r', 'r_toe']
    };
    
    // Track which target bones have been mapped to prevent duplicates
    const usedTargetBones = new Set();
    
    // Helper function to find matching bone
    const findBone = (bones, patterns) => {
      for (const bone of bones) {
        const boneLower = bone.toLowerCase()
          .replace(/mixamorig:/gi, '')
          .replace(/[_\s]/g, '');
        
        for (const pattern of patterns) {
          const patternClean = pattern.replace(/[_\s]/g, '');
          if (boneLower === patternClean || boneLower.includes(patternClean)) {
            return bone;
          }
        }
      }
      return null;
    };
    
    // Map each bone role
    for (const [role, patterns] of Object.entries(boneRoles)) {
      const sourceBone = findBone(sourceBones, patterns);
      const targetBone = findBone(targetBones, patterns);
      
      // Only map if we have both bones AND the target hasn't been mapped yet
      if (sourceBone && targetBone && !usedTargetBones.has(targetBone)) {
        mapping[sourceBone] = targetBone;
        usedTargetBones.add(targetBone); // Mark target as used
        matchedCount++;
      } else if (sourceBone && targetBone && usedTargetBones.has(targetBone)) {
        console.log(`  ⚠️ Skipping ${role}: source '${sourceBone}' → target '${targetBone}' (target already mapped)`);
      }
    }
    
    // Calculate confidence score
    const totalRoles = Object.keys(boneRoles).length;
    const confidence = matchedCount / totalRoles;
    
    return { mapping, confidence };
  }
  
  /**
   * Build visual bone hierarchy tree for UI
   * @param {Object} skeletonInfo - Skeleton information
   * @param {boolean} isSource - Whether this is source or target skeleton
   * @returns {string} - HTML string for bone tree
   */
  buildBoneTree(skeletonInfo, isSource) {
    if (!skeletonInfo || !skeletonInfo.bones || skeletonInfo.bones.length === 0) {
      return '<p class="has-text-grey">No bones found</p>';
    }
    
    const bones = skeletonInfo.bones;
    
    console.log('buildBoneTree:', {
      isSource,
      boneCount: bones.length,
      firstBone: bones[0]?.name,
      firstBoneHasParent: !!bones[0]?.parent,
      firstBoneParentType: bones[0]?.parent?.type
    });
    
    // Build tree structure
    const buildTreeNode = (bone, depth = 0) => {
      const isMapped = isSource ? 
        Object.keys(this.boneMapping).includes(bone.name) :
        Object.values(this.boneMapping).includes(bone.name);
      
      const indent = depth * 20;
      const mappedClass = isMapped ? 'bone-mapped' : '';
      const sideClass = isSource ? 'source' : 'target';
      
      let html = `
        <div class="bone-item ${mappedClass}" 
             data-bone="${bone.name}" 
             data-side="${sideClass}"
             style="padding-left: ${indent}px;">
          <span class="bone-name">${bone.name}</span>
        </div>
      `;
      
      // Add children
      if (bone.children && bone.children.length > 0) {
        for (const child of bone.children) {
          // Only render children that are bones
          if (child.isBone || child.type === 'Bone') {
            html += buildTreeNode(child, depth + 1);
          }
        }
      }
      
      return html;
    };
    
    // Find root bones (bones without parents or parent is not a bone)
    const boneSet = new Set(bones);
    const rootBones = bones.filter(bone => {
      if (!bone.parent) return true;
      // Check if parent is a bone and is in our bone list
      const parentIsBone = (bone.parent.isBone || bone.parent.type === 'Bone');
      const parentInSet = boneSet.has(bone.parent);
      return !parentIsBone || !parentInSet;
    });
    
    console.log('buildBoneTree found', rootBones.length, 'root bones:', rootBones.map(b => b.name));
    
    if (rootBones.length === 0) {
      // Fallback: if no root found, use first bone
      console.warn('No root bones found, using first bone as root');
      rootBones.push(bones[0]);
    }
    
    let html = '<div class="bone-tree">';
    for (const rootBone of rootBones) {
      html += buildTreeNode(rootBone);
    }
    html += '</div>';
    
    return html;
  }
  
  /**
   * Find root bones in a bone array
   * @param {Array<THREE.Bone>} bones - Array of bones
   * @returns {Array<THREE.Bone>} - Array of root bones
   */
  findRootBones(bones) {
    const boneSet = new Set(bones);
    const rootBones = bones.filter(bone => {
      if (!bone.parent) return true;
      const parentIsBone = (bone.parent.isBone || bone.parent.type === 'Bone');
      const parentInSet = boneSet.has(bone.parent);
      return !parentIsBone || !parentInSet;
    });
    return rootBones;
  }
  
  /**
   * Set source model for retargeting
   * @param {Object} modelData - Model data from ModelLoader (can be model object or data with skeletons)
   */
  setSourceModel(modelData) {
    // Store the full modelData to preserve filename and animations
    this.sourceModel = modelData;
    
    this.sourceSkeletonInfo = modelData.skeletons || this.extractSkeletonInfo(modelData.model || modelData);
    this.sourceRigType = this.detectRigType(this.sourceSkeletonInfo.boneNames);
    
    // Track root bone
    if (this.sourceSkeletonInfo.bones && this.sourceSkeletonInfo.bones.length > 0) {
      const rootBones = this.findRootBones(this.sourceSkeletonInfo.bones);
      this.sourceRootBone = rootBones.length > 0 ? rootBones[0].name : this.sourceSkeletonInfo.bones[0].name;
    }
    
    console.log('Source model set:', {
      filename: modelData.filename || 'unknown',
      rigType: this.sourceRigType,
      boneCount: this.sourceSkeletonInfo.bones.length,
      animationCount: modelData.animations?.length || 0,
      rootBone: this.sourceRootBone
    });
  }
  
  /**
   * Create a simple skeleton helper from skeleton info (for animation-only files)
   * @param {Object} skeletonInfo
   * @returns {THREE.Object3D}
   */
  createSkeletonHelper(skeletonInfo) {
    const helper = new THREE.Object3D();
    helper.name = 'SkeletonHelper';
    
    // Add bones to the helper
    if (skeletonInfo.bones && skeletonInfo.bones.length > 0) {
      skeletonInfo.bones.forEach(bone => {
        helper.add(bone);
      });
    }
    
    return helper;
  }
  
  /**
   * Extract skeleton info from a model (fallback method)
   * @param {THREE.Object3D} model
   * @returns {Object}
   */
  extractSkeletonInfo(model) {
    if (!model) {
      return { bones: [], boneNames: [] };
    }
    
    const bones = [];
    const boneNames = [];
    
    model.traverse((child) => {
      if (child.isBone || child.type === 'Bone') {
        bones.push(child);
        boneNames.push(child.name);
      }
    });
    
    return { bones, boneNames };
  }
  
  /**
   * Set target model for retargeting
   * @param {Object} modelData - Model data from ModelLoader
   */
  setTargetModel(modelData) {
    this.targetModel = modelData.model;
    this.targetSkeletonInfo = modelData.skeletons;
    this.targetRigType = this.detectRigType(this.targetSkeletonInfo.boneNames);
    
    // Track root bone
    if (this.targetSkeletonInfo.bones && this.targetSkeletonInfo.bones.length > 0) {
      const rootBones = this.findRootBones(this.targetSkeletonInfo.bones);
      this.targetRootBone = rootBones.length > 0 ? rootBones[0].name : this.targetSkeletonInfo.bones[0].name;
    }
    
    console.log('Target model set:', {
      rigType: this.targetRigType,
      boneCount: this.targetSkeletonInfo.bones.length,
      rootBone: this.targetRootBone
    });
  }
  
  /**
   * Generate automatic bone mapping
   */
  autoMapBones() {
    if (!this.sourceSkeletonInfo || !this.targetSkeletonInfo) {
      window.uiManager.showNotification('Please load both source and target models', 'error');
      return;
    }
    
    const result = this.generateAutomaticMapping(
      this.sourceSkeletonInfo.boneNames,
      this.targetSkeletonInfo.boneNames
    );
    
    this.boneMapping = result.mapping;
    this.mappingConfidence = result.confidence;
    
    const mappedCount = Object.keys(this.boneMapping).length;
    const confidencePercent = Math.round(result.confidence * 100);
    
    // Log mapping details for debugging
    console.log('🔗 Bone Mapping Results:');
    console.log(`  Mapped: ${mappedCount} bones`);
    console.log(`  Confidence: ${confidencePercent}%`);
    console.log('  Mappings:');
    for (const [src, trg] of Object.entries(this.boneMapping)) {
      console.log(`    ${src} → ${trg}`);
    }
    
    window.uiManager.showNotification(
      `Auto-mapped ${mappedCount} bones with ${confidencePercent}% confidence`,
      confidencePercent > 70 ? 'success' : 'warning'
    );
    
    return result;
  }
  
  /**
   * Add manual bone mapping
   * @param {string} sourceBone - Source bone name
   * @param {string} targetBone - Target bone name
   */
  addManualMapping(sourceBone, targetBone) {
    if (!sourceBone || !targetBone) {
      window.uiManager.showNotification('Please select both source and target bones', 'warning');
      return;
    }
    
    this.boneMapping[sourceBone] = targetBone;
    window.uiManager.showNotification(`Mapped: ${sourceBone} → ${targetBone}`, 'success');
  }
  
  /**
   * Remove bone mapping
   * @param {string} sourceBone - Source bone name
   */
  removeMapping(sourceBone) {
    if (this.boneMapping[sourceBone]) {
      delete this.boneMapping[sourceBone];
      window.uiManager.showNotification(`Removed mapping for ${sourceBone}`, 'info');
    }
  }
  
  /**
   * Clear all bone mappings
   */
  clearMappings() {
    this.boneMapping = {};
    this.mappingConfidence = 0;
    window.uiManager.showNotification('All mappings cleared', 'info');
  }
  
  /**
   * Save bone mapping to file
   * @param {string} name - Mapping name
   */
  async saveBoneMapping(name) {
    if (!name || name.trim() === '') {
      window.uiManager.showNotification('Please enter a name for the mapping', 'warning');
      return;
    }
    
    const mappingData = {
      name: name,
      sourceRigType: this.sourceRigType,
      targetRigType: this.targetRigType,
      mapping: this.boneMapping,
      confidence: this.mappingConfidence,
      createdAt: new Date().toISOString()
    };
    
    const result = await window.electronAPI.saveBoneMapping(name, mappingData);
    
    if (result.success) {
      window.uiManager.showNotification(`Bone mapping "${name}" saved successfully`, 'success');
    } else {
      window.uiManager.showNotification(`Failed to save mapping: ${result.error}`, 'error');
    }
  }
  
  /**
   * Load bone mapping from file
   * @param {string} name - Mapping name
   */
  async loadBoneMapping(name) {
    const result = await window.electronAPI.loadBoneMapping(name);
    
    if (result.success) {
      const data = result.data;
      this.boneMapping = data.mapping;
      this.mappingConfidence = data.confidence || 0;
      
      window.uiManager.showNotification(`Loaded bone mapping "${name}"`, 'success');
      
      return data;
    } else {
      window.uiManager.showNotification(`Failed to load mapping: ${result.error}`, 'error');
      return null;
    }
  }
  
  // ============================================================================
  // HELPER FUNCTIONS FOR ROBUST RETARGETING
  // ============================================================================
  
  /**
   * Find bone index by bone object
   * @param {THREE.Skeleton} skeleton
   * @param {THREE.Bone} bone
   * @returns {number} - Index or -1
   */
  findIndexOfBone(skeleton, bone) {
    if (!bone) return -1;
    const bones = skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      if (bones[i] === bone) return i;
    }
    return -1;
  }
  
  /**
   * Find bone index by name
   * @param {THREE.Skeleton} skeleton
   * @param {string} name
   * @returns {number} - Index or -1
   */
  findIndexOfBoneByName(skeleton, name) {
    if (!name) return -1;
    const bones = skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      if (bones[i].name === name) return i;
    }
    return -1;
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
   * Deep clone skeleton with additional retargeting attributes
   * @param {THREE.Skeleton} skeleton
   * @param {boolean} useCurrentPose - Use current pose instead of bind pose
   * @param {boolean} embedWorld - Include world transforms
   * @returns {THREE.Skeleton}
   */
  cloneRawSkeleton(skeleton, useCurrentPose = false, embedWorld = false) {
    const bones = skeleton.bones;
    const resultBones = new Array(bones.length);
    const parentIndices = new Int16Array(bones.length);
    
    // Clone bones without hierarchy
    for (let i = 0; i < bones.length; i++) {
      resultBones[i] = bones[i].clone(false);
      resultBones[i].parent = null;
    }
    
    // Rebuild hierarchy
    for (let i = 0; i < bones.length; i++) {
      const parentIdx = this.findIndexOfBone(skeleton, bones[i].parent);
      if (parentIdx > -1) {
        resultBones[parentIdx].add(resultBones[i]);
      }
      parentIndices[i] = parentIdx;
    }
    
    // Update world matrices
    resultBones[0].updateWorldMatrix(false, true);
    
    // Generate skeleton
    let resultSkeleton;
    if (useCurrentPose) {
      // Use current pose as bind pose
      resultSkeleton = new THREE.Skeleton(resultBones);
    } else {
      // Use actual bind pose
      const boneInverses = new Array(skeleton.boneInverses.length);
      for (let i = 0; i < boneInverses.length; i++) {
        boneInverses[i] = skeleton.boneInverses[i].clone();
      }
      resultSkeleton = new THREE.Skeleton(resultBones, boneInverses);
      resultSkeleton.pose();
    }
    
    resultSkeleton.parentIndices = parentIndices;
    
    // Precompute transforms (world space)
    const transforms = new Array(skeleton.bones.length);
    const transformsInverses = new Array(skeleton.bones.length);
    
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
    if (embedWorld && skeleton.bones[0].parent) {
      const embedded = {
        forward: this.newTransform(),
        inverse: this.newTransform()
      };
      
      skeleton.bones[0].parent.matrixWorld.decompose(
        embedded.forward.p,
        embedded.forward.q,
        embedded.forward.s
      );
      
      skeleton.bones[0].parent.matrixWorld.clone().invert().decompose(
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
   * @returns {Object} - { idxMap: Int16Array, nameMap: Object }
   */
  computeBoneMapIndices() {
    const srcSkeleton = this.getSourceSkeleton();
    const trgSkeleton = this.getTargetSkeleton();
    
    if (!srcSkeleton || !trgSkeleton) return null;
    
    const srcBones = srcSkeleton.bones;
    const result = {
      idxMap: new Int16Array(srcBones.length),
      nameMap: this.boneMapping
    };
    
    result.idxMap.fill(-1);
    
    // Map bone names to indices
    for (const srcName in this.boneMapping) {
      const trgName = this.boneMapping[srcName];
      const srcIdx = this.findIndexOfBoneByName(srcSkeleton, srcName);
      if (srcIdx < 0) continue;
      
      const trgIdx = this.findIndexOfBoneByName(trgSkeleton, trgName);
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
   * Precompute retargeting quaternions for efficiency
   * Based on: trgLocal = invBindTrgWorldParent * bindSrcWorldParent * srcLocal * invBindSrcWorld * bindTrgWorld
   * Split as: left = invBindTrgWorldParent * bindSrcWorldParent, right = invBindSrcWorld * bindTrgWorld
   * @returns {Object} - { left: Array, right: Array }
   */
  precomputeRetargetingQuats() {
    const left = new Array(this.srcBindPose.bones.length);
    const right = new Array(this.srcBindPose.bones.length);
    
    for (let srcIndex = 0; srcIndex < left.length; srcIndex++) {
      const trgIndex = this.boneMapIndices.idxMap[srcIndex];
      
      if (trgIndex < 0) {
        left[srcIndex] = null;
        right[srcIndex] = null;
        continue;
      }
      
      // Compute LEFT side: invBindTrgWorldParent * bindSrcWorldParent
      let leftQuat = new THREE.Quaternion(0, 0, 0, 1);
      
      // Start with bindSrcWorldParent
      if (this.srcBindPose.bones[srcIndex].parent) {
        const parentIdx = this.srcBindPose.parentIndices[srcIndex];
        leftQuat.copy(this.srcBindPose.transformsWorld[parentIdx].q);
      }
      
      // Apply embedded transforms if present
      if (this.srcBindPose.transformsWorldEmbedded) {
        leftQuat.premultiply(this.srcBindPose.transformsWorldEmbedded.forward.q);
      }
      if (this.trgBindPose.transformsWorldEmbedded) {
        leftQuat.premultiply(this.trgBindPose.transformsWorldEmbedded.inverse.q);
      }
      
      // Apply invBindTrgWorldParent
      if (this.trgBindPose.bones[trgIndex].parent) {
        const parentIdx = this.trgBindPose.parentIndices[trgIndex];
        leftQuat.premultiply(this.trgBindPose.transformsWorldInverses[parentIdx].q);
      }
      
      left[srcIndex] = leftQuat;
      
      // Compute RIGHT side: invBindSrcWorld * bindTrgWorld
      let rightQuat = new THREE.Quaternion(0, 0, 0, 1);
      rightQuat.copy(this.trgBindPose.transformsWorld[trgIndex].q); // bindTrgWorld
      
      // Apply embedded transforms if present
      if (this.trgBindPose.transformsWorldEmbedded) {
        rightQuat.premultiply(this.trgBindPose.transformsWorldEmbedded.forward.q);
      }
      if (this.srcBindPose.transformsWorldEmbedded) {
        rightQuat.premultiply(this.srcBindPose.transformsWorldEmbedded.inverse.q);
      }
      
      rightQuat.premultiply(this.srcBindPose.transformsWorldInverses[srcIndex].q); // invBindSrcWorld
      
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
    
    // trgLocal = left * srcLocal * right
    resultQuat.copy(srcLocalQuat);
    resultQuat.premultiply(this.precomputedQuats.left[srcIndex]);
    resultQuat.multiply(this.precomputedQuats.right[srcIndex]);
    
    return resultQuat;
  }
  
  /**
   * Initialize retargeting data structures
   */
  initializeRetargeting() {
    const srcSkeleton = this.getSourceSkeleton();
    const trgSkeleton = this.getTargetSkeleton();
    
    if (!srcSkeleton || !trgSkeleton) {
      throw new Error('Source or target skeleton not found');
    }
    
    console.log('Initializing retargeting...');
    console.log('  Source skeleton:', srcSkeleton.bones.length, 'bones');
    console.log('  Target skeleton:', trgSkeleton.bones.length, 'bones');
    
    // Compute bone mapping indices
    this.boneMapIndices = this.computeBoneMapIndices();
    const mappedCount = this.boneMapIndices.idxMap.filter(i => i >= 0).length;
    console.log('  Mapped bones:', mappedCount);
    
    // Clone skeletons for bind pose
    this.srcBindPose = this.cloneRawSkeleton(srcSkeleton, false, true);
    this.trgBindPose = this.cloneRawSkeleton(trgSkeleton, false, true);
    
    console.log('  Bind poses cloned');
    console.log('  Source has embedded transforms:', !!this.srcBindPose.transformsWorldEmbedded);
    console.log('  Target has embedded transforms:', !!this.trgBindPose.transformsWorldEmbedded);
    
    // Precompute quaternions for efficient retargeting
    this.precomputedQuats = this.precomputeRetargetingQuats();
    console.log('  Quaternions precomputed');
    
    // Compute proportion ratio for position scaling
    this.proportionRatio = this.computeProportionRatio();
    
    console.log('Retargeting initialized:', {
      proportionRatio: this.proportionRatio,
      mappedBones: mappedCount
    });
  }
  
  /**
   * Get source skeleton
   * @returns {THREE.Skeleton|null}
   */
  getSourceSkeleton() {
    if (!this.sourceModel) return null;
    
    // Get the actual THREE.Object3D (could be in .model property or be the object itself)
    const sourceObject = this.sourceModel.model || this.sourceModel;
    
    // First try to find a SkinnedMesh with skeleton
    let skeleton = null;
    if (sourceObject.traverse) {
      sourceObject.traverse((child) => {
        if (child.isSkinnedMesh && !skeleton) {
          skeleton = child.skeleton;
        }
      });
    }
    
    // If no skeleton found but we have skeleton info, create one
    if (!skeleton && this.sourceSkeletonInfo && this.sourceSkeletonInfo.bones.length > 0) {
      console.log('Creating skeleton from source skeleton info');
      skeleton = this.createSkeletonFromBones(this.sourceSkeletonInfo.bones);
    }
    
    return skeleton;
  }
  
  /**
   * Get target skeleton
   * @returns {THREE.Skeleton|null}
   */
  getTargetSkeleton() {
    if (!this.targetModel) return null;
    
    // First try to find a SkinnedMesh with skeleton
    let skeleton = null;
    this.targetModel.traverse((child) => {
      if (child.isSkinnedMesh && !skeleton) {
        skeleton = child.skeleton;
      }
    });
    
    // If no skeleton found but we have skeleton info, create one
    if (!skeleton && this.targetSkeletonInfo && this.targetSkeletonInfo.bones.length > 0) {
      console.log('Creating skeleton from target skeleton info');
      skeleton = this.createSkeletonFromBones(this.targetSkeletonInfo.bones);
    }
    
    return skeleton;
  }
  
  /**
   * Create a THREE.Skeleton from an array of bones
   * @param {Array<THREE.Bone>} bones
   * @returns {THREE.Skeleton}
   */
  createSkeletonFromBones(bones) {
    if (!bones || bones.length === 0) return null;
    
    // Update world matrices for all bones
    if (bones[0].parent) {
      bones[0].parent.updateWorldMatrix(true, true);
    }
    bones[0].updateWorldMatrix(false, true);
    
    // Create skeleton with bone inverses
    const boneInverses = [];
    for (let i = 0; i < bones.length; i++) {
      const boneInverse = new THREE.Matrix4();
      boneInverse.copy(bones[i].matrixWorld).invert();
      boneInverses.push(boneInverse);
    }
    
    return new THREE.Skeleton(bones, boneInverses);
  }
  
  /**
   * Retarget quaternion track
   * @param {THREE.QuaternionKeyframeTrack} srcTrack
   * @returns {THREE.QuaternionKeyframeTrack|null}
   */
  retargetQuaternionTrack(srcTrack) {
    const boneName = srcTrack.name.slice(0, srcTrack.name.length - 11); // Remove ".quaternion"
    const srcSkeleton = this.getSourceSkeleton();
    const boneIndex = this.findIndexOfBoneByName(srcSkeleton, boneName);
    
    if (boneIndex < 0 || this.boneMapIndices.idxMap[boneIndex] < 0) {
      return null;
    }
    
    const quat = new THREE.Quaternion(0, 0, 0, 1);
    const srcValues = srcTrack.values;
    const trgValues = new Float32Array(srcValues.length);
    
    for (let i = 0; i < srcValues.length; i += 4) {
      quat.set(srcValues[i], srcValues[i + 1], srcValues[i + 2], srcValues[i + 3]);
      this.retargetQuaternion(boneIndex, quat, quat);
      trgValues[i] = quat.x;
      trgValues[i + 1] = quat.y;
      trgValues[i + 2] = quat.z;
      trgValues[i + 3] = quat.w;
    }
    
    const targetBoneName = this.boneMapIndices.nameMap[boneName];
    return new THREE.QuaternionKeyframeTrack(
      targetBoneName + '.quaternion',
      srcTrack.times.slice(),
      trgValues
    );
  }
  
  /**
   * Retarget position track (for root motion)
   * @param {THREE.VectorKeyframeTrack} srcTrack
   * @returns {THREE.VectorKeyframeTrack|null}
   */
  retargetPositionTrack(srcTrack) {
    const boneName = srcTrack.name.slice(0, srcTrack.name.length - 9); // Remove ".position"
    const srcSkeleton = this.getSourceSkeleton();
    const boneIndex = this.findIndexOfBoneByName(srcSkeleton, boneName);
    
    if (boneIndex < 0 || this.boneMapIndices.idxMap[boneIndex] < 0) {
      return null;
    }
    
    const srcValues = srcTrack.values;
    const trgValues = new Float32Array(srcValues.length);
    
    // Only retarget root bone position
    if (boneIndex === 0) {
      const srcBindPos = this.srcBindPose.bones[boneIndex].getWorldPosition(new THREE.Vector3());
      const trgBindPos = this.trgBindPose.bones[boneIndex].getWorldPosition(new THREE.Vector3());
      
      const pos = new THREE.Vector3();
      const diffPosition = new THREE.Vector3();
      
      for (let i = 0; i < srcValues.length; i += 3) {
        pos.set(srcValues[i], srcValues[i + 1], srcValues[i + 2]);
        
        // Apply embedded transforms if needed
        if (this.srcBindPose.transformsWorldEmbedded) {
          pos.applyQuaternion(this.srcBindPose.transformsWorldEmbedded.forward.q);
        }
        
        diffPosition.subVectors(pos, srcBindPos);
        
        // Scale the position by proportion ratio
        diffPosition.multiplyScalar(this.proportionRatio);
        
        if (this.trgBindPose.transformsWorldEmbedded) {
          diffPosition.applyQuaternion(this.trgBindPose.transformsWorldEmbedded.inverse.q);
        }
        
        diffPosition.add(trgBindPos);
        
        trgValues[i] = diffPosition.x;
        trgValues[i + 1] = diffPosition.y;
        trgValues[i + 2] = diffPosition.z;
      }
    } else {
      // For non-root bones, copy positions as-is (usually not animated)
      trgValues.set(srcValues);
    }
    
    const targetBoneName = this.boneMapIndices.nameMap[boneName];
    return new THREE.VectorKeyframeTrack(
      targetBoneName + '.position',
      srcTrack.times.slice(),
      trgValues
    );
  }
  
  /**
   * Retarget animation from source to target model
   * @param {THREE.AnimationClip} sourceClip - Source animation clip
   * @returns {THREE.AnimationClip|null} - Retargeted animation clip or null
   */
  retargetAnimation(sourceClip) {
    if (!this.sourceModel || !this.targetModel) {
      window.uiManager.showNotification('Please load both source and target models', 'error');
      return null;
    }
    
    if (Object.keys(this.boneMapping).length === 0) {
      window.uiManager.showNotification('No bone mappings defined. Use auto-map or manual mapping.', 'error');
      return null;
    }
    
    try {
      // Initialize retargeting if not done
      if (!this.srcBindPose || !this.trgBindPose) {
        this.initializeRetargeting();
      }
      
      const srcSkeleton = this.getSourceSkeleton();
      const trgTracks = [];
      const srcTracks = sourceClip.tracks;
      
      for (let i = 0; i < srcTracks.length; i++) {
        const track = srcTracks[i];
        let newTrack = null;
        
        // Check track type and retarget accordingly
        if (track.name.endsWith('.position') && track.name.includes(srcSkeleton.bones[0].name)) {
          newTrack = this.retargetPositionTrack(track);
        } else if (track.name.endsWith('.quaternion')) {
          newTrack = this.retargetQuaternionTrack(track);
        } else if (track.name.endsWith('.scale')) {
          // For now, skip scale tracks (could be added later)
          continue;
        }
        
        if (newTrack) {
          trgTracks.push(newTrack);
        }
      }
      
      if (trgTracks.length === 0) {
        window.uiManager.showNotification('No tracks were retargeted', 'warning');
        return null;
      }
      
      const retargetedClip = new THREE.AnimationClip(
        `${sourceClip.name}_retargeted`,
        sourceClip.duration,
        trgTracks
      );
      
      window.uiManager.showNotification(
        `Successfully retargeted animation: ${sourceClip.name} (${trgTracks.length} tracks)`,
        'success'
      );
      
      return retargetedClip;
      
    } catch (error) {
      console.error('Retargeting error:', error);
      window.uiManager.showNotification(
        `Retargeting failed: ${error.message}`,
        'error'
      );
      return null;
    }
  }
  
  /**
   * Retarget all animations from source to target
   * @param {Array<THREE.AnimationClip>} sourceClips - Array of source animation clips
   * @returns {Array<THREE.AnimationClip>} - Array of retargeted clips
   */
  retargetAllAnimations(sourceClips) {
    const retargetedClips = [];
    
    for (const clip of sourceClips) {
      const retargetedClip = this.retargetAnimation(clip);
      if (retargetedClip) {
        retargetedClips.push(retargetedClip);
      }
    }
    
    window.uiManager.showNotification(
      `Retargeted ${retargetedClips.length} of ${sourceClips.length} animations`,
      retargetedClips.length > 0 ? 'success' : 'warning'
    );
    
    return retargetedClips;
  }
  
  // ============================================================================
  // T-POSE AND POSE ALIGNMENT UTILITIES
  // ============================================================================
  
  /**
   * Extend bone chain to follow parent direction (for T-pose)
   * @param {THREE.Skeleton} skeleton
   * @param {string} originName - Origin bone name
   * @param {string} endName - End bone name (optional)
   */
  extendChain(skeleton, originName, endName = null) {
    const base = skeleton.getBoneByName ? 
      skeleton.getBoneByName(originName) : 
      skeleton.bones.find(b => b.name === originName);
    
    if (!base) return;
    
    let previous = null;
    let end = base;
    
    if (!endName) {
      // Find the last bone in the chain
      while (end.children.length) {
        end = end.children[0];
      }
      previous = end;
    } else {
      previous = skeleton.getBoneByName ? 
        skeleton.getBoneByName(endName) : 
        skeleton.bones.find(b => b.name === endName);
    }
    
    if (!previous) return;
    
    let current = previous.parent;
    let next = current ? current.parent : null;
    
    while (next && next !== base.parent) {
      const prevPos = previous.getWorldPosition(new THREE.Vector3());
      const currPos = current.getWorldPosition(new THREE.Vector3());
      const nextPos = next.getWorldPosition(new THREE.Vector3());
      
      // Direction from next to current
      const desired_dir = new THREE.Vector3();
      desired_dir.subVectors(currPos, nextPos).normalize();
      
      // Direction from current to previous
      const current_dir = new THREE.Vector3();
      current_dir.subVectors(prevPos, currPos).normalize();
      
      // Compute rotation to align current-to-previous with next-to-current
      const angle = current_dir.angleTo(desired_dir);
      
      if (Math.abs(angle) > 0.001) {
        const axis = new THREE.Vector3();
        axis.crossVectors(current_dir, desired_dir).normalize();
        
        const rot = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        
        let currRot = current.getWorldQuaternion(new THREE.Quaternion());
        currRot = rot.multiply(currRot);
        
        const nextRot = next.getWorldQuaternion(new THREE.Quaternion());
        const localRot = nextRot.invert().multiply(currRot);
        
        current.quaternion.copy(localRot);
        current.updateMatrix();
        current.updateMatrixWorld(false, true);
      }
      
      previous = current;
      current = next;
      next = next.parent;
    }
  }
  
  /**
   * Align bone direction to a specific axis
   * @param {THREE.Skeleton} skeleton
   * @param {string} originName - Origin bone name
   * @param {string} endName - End bone name (optional)
   * @param {THREE.Vector3} axis - Target axis
   */
  alignBoneToAxis(skeleton, originName, endName, axis) {
    const oBone = skeleton.getBoneByName ? 
      skeleton.getBoneByName(originName) : 
      skeleton.bones.find(b => b.name === originName);
    
    if (!oBone) return;
    
    oBone.updateMatrixWorld(true, true);
    
    let eBone = null;
    if (endName) {
      eBone = skeleton.getBoneByName ? 
        skeleton.getBoneByName(endName) : 
        skeleton.bones.find(b => b.name === endName);
    } else if (oBone.children.length > 0) {
      eBone = oBone.children[0];
    }
    
    if (!eBone) return;
    
    const oPos = oBone.getWorldPosition(new THREE.Vector3());
    const ePos = eBone.getWorldPosition(new THREE.Vector3());
    
    const dir = new THREE.Vector3();
    dir.subVectors(ePos, oPos).normalize();
    
    const angle = dir.angleTo(axis);
    
    if (Math.abs(angle) > 0.001) {
      const new_axis = new THREE.Vector3();
      new_axis.crossVectors(dir, axis).normalize();
      
      const rot = new THREE.Quaternion().setFromAxisAngle(new_axis, angle);
      
      let oRot = oBone.getWorldQuaternion(new THREE.Quaternion());
      oRot = rot.multiply(oRot);
      
      let oLocalRot = oRot;
      if (oBone.parent) {
        const oParentRot = oBone.parent.getWorldQuaternion(new THREE.Quaternion());
        oLocalRot = oParentRot.invert().multiply(oRot);
      }
      
      oBone.quaternion.copy(oLocalRot);
      oBone.updateMatrix();
      oBone.updateMatrixWorld(false, true);
    }
  }
  
  /**
   * Apply T-Pose to skeleton (useful for normalizing bind poses)
   * @param {THREE.Skeleton} skeleton
   * @param {Object} boneMap - Bone name mapping
   */
  applyTPose(skeleton, boneMap = null) {
    if (!boneMap) {
      // Use automatic bone detection
      boneMap = this.detectTPoseBones(skeleton);
    }
    
    const x_axis = new THREE.Vector3(1, 0, 0);
    const y_axis = new THREE.Vector3(0, 1, 0);
    const z_axis = new THREE.Vector3(0, 0, 1);
    
    // Extend chains
    if (boneMap.Hips && boneMap.Spine) {
      this.extendChain(skeleton, boneMap.Hips, boneMap.Spine);
    }
    
    // Extend limbs
    const limbs = [
      ['LeftUpLeg', 'LeftFoot'],
      ['RightUpLeg', 'RightFoot'],
      ['LeftArm', 'LeftHand'],
      ['RightArm', 'RightHand']
    ];
    
    for (const [start, end] of limbs) {
      if (boneMap[start] && boneMap[end]) {
        this.extendChain(skeleton, boneMap[start], boneMap[end]);
      }
    }
    
    // Align arms to X axis (T-pose)
    if (boneMap.LeftArm && boneMap.LeftHand) {
      this.alignBoneToAxis(skeleton, boneMap.LeftArm, boneMap.LeftHand, 
        new THREE.Vector3(-1, 0, 0)); // Left arm along -X
    }
    if (boneMap.RightArm && boneMap.RightHand) {
      this.alignBoneToAxis(skeleton, boneMap.RightArm, boneMap.RightHand, 
        new THREE.Vector3(1, 0, 0)); // Right arm along +X
    }
    
    // Align legs down Y axis
    if (boneMap.LeftUpLeg && boneMap.LeftFoot) {
      this.alignBoneToAxis(skeleton, boneMap.LeftUpLeg, boneMap.LeftFoot, 
        new THREE.Vector3(0, -1, 0)); // Left leg down
    }
    if (boneMap.RightUpLeg && boneMap.RightFoot) {
      this.alignBoneToAxis(skeleton, boneMap.RightUpLeg, boneMap.RightFoot, 
        new THREE.Vector3(0, -1, 0)); // Right leg down
    }
    
    console.log('Applied T-Pose to skeleton');
  }
  
  /**
   * Detect bone names for T-Pose application
   * @param {THREE.Skeleton} skeleton
   * @returns {Object} - Bone name map
   */
  detectTPoseBones(skeleton) {
    const boneMap = {};
    
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
   * Retarget all animations from source to target
   * @param {Array<THREE.AnimationClip>} sourceClips - Array of source animation clips
   * @returns {Array<THREE.AnimationClip>} - Array of retargeted clips
   */
  retargetAllAnimations(sourceClips) {
    const retargetedClips = [];
    
    for (const clip of sourceClips) {
      const retargetedClip = this.retargetAnimation(clip);
      if (retargetedClip) {
        retargetedClips.push(retargetedClip);
      }
    }
    
    window.uiManager.showNotification(
      `Retargeted ${retargetedClips.length} of ${sourceClips.length} animations`,
      retargetedClips.length > 0 ? 'success' : 'warning'
    );
    
    return retargetedClips;
  }
  
  /**
   * Get current bone mapping
   * @returns {Object} - Bone mapping object
   */
  getBoneMapping() {
    return this.boneMapping;
  }
  
  /**
   * Get mapping info
   * @returns {Object} - Mapping information
   */
  getMappingInfo() {
    return {
      sourceRigType: this.sourceRigType,
      targetRigType: this.targetRigType,
      mappingCount: Object.keys(this.boneMapping).length,
      confidence: this.mappingConfidence
    };
  }
}
