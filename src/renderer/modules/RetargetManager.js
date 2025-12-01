import * as THREE from 'three';

// Bind pose modes for retargeting
export const BindPoseModes = {
  DEFAULT: 0,  // Use skeleton's actual bind pose
  CURRENT: 1   // Use skeleton's current pose as bind pose
};

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
   * Deep clone of the skeleton. New bones are generated. Skeleton's parent
   * objects will not be linked to the cloned one
   * Returned skeleton has new attributes:
   *  - Always: .parentIndices, .transformsWorld, .transformsWorldInverses
   *  - embedWorld == true:  .transformsWorldEmbedded
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
      const parentIdx = this.findIndexOfBone(skeleton, bones[i].parent);
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
   * Full formula: trgLocal = invBindTrgWorldParent * invTrgEmbedded * srcEmbedded * 
   *                         bindSrcWorldParent * srcLocal * invBindSrcWorld * 
   *                         invSrcEmbedded * trgEmbedded * bindTrgWorld
   * Split as: left = invBindTrgWorldParent * invTrgEmbedded * srcEmbedded * bindSrcWorldParent
   *          right = invBindSrcWorld * invSrcEmbedded * trgEmbedded * bindTrgWorld
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
      // left = invBindTrgWorldParent * invTrgEmbedded * srcEmbedded * bindSrcWorldParent
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
      // right = invBindSrcWorld * invSrcEmbedded * trgEmbedded * bindTrgWorld
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
    
    // trgLocal = left * srcLocal * right
    resultQuat.copy(srcLocalQuat);
    resultQuat.premultiply(this.precomputedQuats.left[srcIndex]);
    resultQuat.multiply(this.precomputedQuats.right[srcIndex]);
    
    return resultQuat;
  }
  
  /**
   * Initialize retargeting data structures
   * @param {Object} options - Retargeting options
   * @param {number} options.srcPoseMode - Source bind pose mode (DEFAULT or CURRENT)
   * @param {number} options.trgPoseMode - Target bind pose mode (DEFAULT or CURRENT)
   * @param {boolean} options.srcEmbedWorld - Embed source world transforms
   * @param {boolean} options.trgEmbedWorld - Embed target world transforms
   */
  initializeRetargeting(options = {}) {
    const srcSkeleton = this.getSourceSkeleton();
    const trgSkeleton = this.getTargetSkeleton();
    
    if (!srcSkeleton || !trgSkeleton) {
      throw new Error('Source or target skeleton not found');
    }
    
    // Extract options with defaults
    const {
      srcPoseMode = BindPoseModes.DEFAULT,
      trgPoseMode = BindPoseModes.DEFAULT,
      srcEmbedWorld = true,
      trgEmbedWorld = true
    } = options;
    
    console.log('Initializing retargeting...');
    console.log('  Source skeleton:', srcSkeleton.bones.length, 'bones');
    console.log('  Target skeleton:', trgSkeleton.bones.length, 'bones');
    console.log('  Pose modes:', {
      source: srcPoseMode === BindPoseModes.CURRENT ? 'CURRENT' : 'DEFAULT',
      target: trgPoseMode === BindPoseModes.CURRENT ? 'CURRENT' : 'DEFAULT'
    });
    console.log('  Embed world:', { source: srcEmbedWorld, target: trgEmbedWorld });
    
    // Compute bone mapping indices
    this.boneMapIndices = this.computeBoneMapIndices();
    const mappedCount = this.boneMapIndices.idxMap.filter(i => i >= 0).length;
    console.log('  Mapped bones:', mappedCount);
    
    // Clone skeletons for bind pose with options
    this.srcBindPose = this.cloneRawSkeleton(srcSkeleton, srcPoseMode, srcEmbedWorld);
    this.trgBindPose = this.cloneRawSkeleton(trgSkeleton, trgPoseMode, trgEmbedWorld);
    
    console.log('  Bind poses cloned');
    console.log('  Source embedded transforms:', !!this.srcBindPose.transformsWorldEmbedded);
    console.log('  Target embedded transforms:', !!this.trgBindPose.transformsWorldEmbedded);
    
    // Precompute quaternions for efficient retargeting
    this.precomputedQuats = this.precomputeRetargetingQuats();
    console.log('  Quaternions precomputed');
    
    // Compute proportion ratio for position scaling
    this.proportionRatio = this.computeProportionRatio();
    
    console.log('Retargeting initialized successfully:', {
      proportionRatio: this.proportionRatio.toFixed(3),
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
    const trgSkeleton = this.getTargetSkeleton();
    const boneIndex = this.findIndexOfBoneByName(srcSkeleton, boneName);
    
    if (boneIndex < 0) {
      return null;
    }
    
    // Check if bone is mapped, or if target has same bone name (fallback)
    let targetBoneName = null;
    if (this.boneMapIndices.idxMap[boneIndex] >= 0) {
      // Use explicit mapping
      targetBoneName = this.boneMapIndices.nameMap[boneName];
    } else {
      // Fallback: check if target skeleton has same bone name
      const targetBoneIndex = this.findIndexOfBoneByName(trgSkeleton, boneName);
      if (targetBoneIndex >= 0) {
        targetBoneName = boneName;
        console.log(`Using fallback mapping for unmapped bone: ${boneName}`);
      } else {
        // Bone not mapped and no matching name found
        console.warn(`Skipping unmapped bone: ${boneName} (not found in target)`);
        return null;
      }
    }
    
    if (!targetBoneName) {
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
    const trgSkeleton = this.getTargetSkeleton();
    const boneIndex = this.findIndexOfBoneByName(srcSkeleton, boneName);
    
    if (boneIndex < 0) {
      return null;
    }
    
    // Check if bone is mapped, or if target has same bone name (fallback)
    let targetBoneName = null;
    if (this.boneMapIndices.idxMap[boneIndex] >= 0) {
      targetBoneName = this.boneMapIndices.nameMap[boneName];
    } else {
      const targetBoneIndex = this.findIndexOfBoneByName(trgSkeleton, boneName);
      if (targetBoneIndex >= 0) {
        targetBoneName = boneName;
      }
    }
    
    if (!targetBoneName) {
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
    
    return new THREE.VectorKeyframeTrack(
      targetBoneName + '.position',
      srcTrack.times.slice(),
      trgValues
    );
  }
  
  /**
   * Retarget scale track
   * @param {THREE.VectorKeyframeTrack} srcTrack
   * @returns {THREE.VectorKeyframeTrack|null}
   */
  retargetScaleTrack(srcTrack) {
    const boneName = srcTrack.name.slice(0, srcTrack.name.length - 6); // Remove ".scale"
    const srcSkeleton = this.getSourceSkeleton();
    const trgSkeleton = this.getTargetSkeleton();
    const boneIndex = this.findIndexOfBoneByName(srcSkeleton, boneName);
    
    if (boneIndex < 0) {
      return null;
    }
    
    // Check if bone is mapped, or if target has same bone name (fallback)
    let targetBoneName = null;
    let trgIndex = -1;
    if (this.boneMapIndices.idxMap[boneIndex] >= 0) {
      trgIndex = this.boneMapIndices.idxMap[boneIndex];
      targetBoneName = this.boneMapIndices.nameMap[boneName];
    } else {
      const targetBoneIndex = this.findIndexOfBoneByName(trgSkeleton, boneName);
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
      console.error('❌ No bone mappings found!');
      console.log('Source model:', this.sourceModel);
      console.log('Target model:', this.targetModel);
      window.uiManager.showNotification('No bone mappings defined. Use auto-map or manual mapping.', 'error');
      return null;
    }
    
    console.log('🎯 Starting retargeting with', Object.keys(this.boneMapping).length, 'bone mappings');
    console.log('Bone mappings:', this.boneMapping);
    
    try {
      // Initialize retargeting if not done
      if (!this.srcBindPose || !this.trgBindPose) {
        this.initializeRetargeting();
      }
      
      const srcSkeleton = this.getSourceSkeleton();
      const trgTracks = [];
      const srcTracks = sourceClip.tracks;
      
      console.log('📊 Processing', srcTracks.length, 'animation tracks');
      let skippedCount = 0;
      let retargetedCount = 0;
      
      for (let i = 0; i < srcTracks.length; i++) {
        const track = srcTracks[i];
        let newTrack = null;
        
        // Check track type and retarget accordingly
        if (track.name.endsWith('.position') && track.name.includes(srcSkeleton.bones[0].name)) {
          newTrack = this.retargetPositionTrack(track);
        } else if (track.name.endsWith('.quaternion')) {
          newTrack = this.retargetQuaternionTrack(track);
        } else if (track.name.endsWith('.scale')) {
          newTrack = this.retargetScaleTrack(track);
        }
        
        if (newTrack) {
          trgTracks.push(newTrack);
          retargetedCount++;
          if (retargetedCount <= 50) { // Log first 50 to see all mapped bones
            console.log(`  ✓ ${track.name.split('.')[0]} → ${newTrack.name}`);
          }
        } else {
          skippedCount++;
        }
      }
      
      console.log(`✅ Retargeted ${retargetedCount} tracks, ❌ Skipped ${skippedCount} tracks`);
      
      if (trgTracks.length === 0) {
        console.error('❌ No tracks were successfully retargeted!');
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
