import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

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
      
      if (sourceBone && targetBone) {
        mapping[sourceBone] = targetBone;
        matchedCount++;
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
    const boneNames = skeletonInfo.boneNames;
    
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
          html += buildTreeNode(child, depth + 1);
        }
      }
      
      return html;
    };
    
    // Find root bones (bones without parents)
    const rootBones = bones.filter(bone => !bone.parent || bone.parent.type !== 'Bone');
    
    let html = '<div class="bone-tree">';
    for (const rootBone of rootBones) {
      html += buildTreeNode(rootBone);
    }
    html += '</div>';
    
    return html;
  }
  
  /**
   * Set source model for retargeting
   * @param {Object} modelData - Model data from ModelLoader
   */
  setSourceModel(modelData) {
    this.sourceModel = modelData.model;
    this.sourceSkeletonInfo = modelData.skeletons;
    this.sourceRigType = this.detectRigType(this.sourceSkeletonInfo.boneNames);
    
    console.log('Source model set:', {
      rigType: this.sourceRigType,
      boneCount: this.sourceSkeletonInfo.bones.length
    });
  }
  
  /**
   * Set target model for retargeting
   * @param {Object} modelData - Model data from ModelLoader
   */
  setTargetModel(modelData) {
    this.targetModel = modelData.model;
    this.targetSkeletonInfo = modelData.skeletons;
    this.targetRigType = this.detectRigType(this.targetSkeletonInfo.boneNames);
    
    console.log('Target model set:', {
      rigType: this.targetRigType,
      boneCount: this.targetSkeletonInfo.bones.length
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
      // Find target skinned mesh
      let targetSkinnedMesh = null;
      this.targetModel.traverse((child) => {
        if (child.isSkinnedMesh && !targetSkinnedMesh) {
          targetSkinnedMesh = child;
        }
      });
      
      if (!targetSkinnedMesh) {
        window.uiManager.showNotification('Target model has no skinned mesh', 'error');
        return null;
      }
      
      // Clone the source clip to avoid modifying the original
      const clonedClip = sourceClip.clone();
      
      // Retarget the animation using SkeletonUtils
      const retargetedClip = SkeletonUtils.retargetClip(
        targetSkinnedMesh,
        targetSkinnedMesh.skeleton.bones[0], // root bone
        clonedClip,
        {
          // Bone name mapping
          names: this.boneMapping
        }
      );
      
      if (retargetedClip) {
        retargetedClip.name = `${sourceClip.name}_retargeted`;
        window.uiManager.showNotification(
          `Successfully retargeted animation: ${sourceClip.name}`,
          'success'
        );
        return retargetedClip;
      } else {
        window.uiManager.showNotification('Retargeting failed', 'error');
        return null;
      }
      
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
