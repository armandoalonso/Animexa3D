/**
 * BoneMappingService - Handles bone name mapping between skeletons
 * Responsible for detecting rig types, automatic mapping, and manual mapping operations
 */
export class BoneMappingService {
  constructor() {
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
   * @param {boolean} includeHandBones - Whether to include finger bones in mapping
   * @returns {Object} - { mapping: {}, confidence: number }
   */
  generateAutomaticMapping(sourceBones, targetBones, includeHandBones = false) {
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
    
    // Hand bones (fingers) - only added if includeHandBones is true
    const handBoneRoles = this._getHandBoneRoles();
    
    // Merge hand bones if requested
    if (includeHandBones) {
      Object.assign(boneRoles, handBoneRoles);
      console.log('✋ Including hand bones in automatic mapping');
    }
    
    // Track which target bones have been mapped to prevent duplicates
    const usedTargetBones = new Set();
    
    // Helper function to find matching bone
    const findBone = (bones, patterns) => {
      // First try exact matches
      for (const bone of bones) {
        const boneLower = bone.toLowerCase()
          .replace(/mixamorig:/gi, '')
          .replace(/[_\s]/g, '');
        
        for (const pattern of patterns) {
          const patternClean = pattern.replace(/[_\s]/g, '');
          if (boneLower === patternClean) {
            return bone;
          }
        }
      }
      
      // Then try contains matches (but avoid matching fingers to base hands)
      for (const bone of bones) {
        const boneLower = bone.toLowerCase()
          .replace(/mixamorig:/gi, '')
          .replace(/[_\s]/g, '');
        
        for (const pattern of patterns) {
          const patternClean = pattern.replace(/[_\s]/g, '');
          // Allow contains match, but prevent "hand" from matching finger bones
          if (boneLower.includes(patternClean)) {
            // If pattern is just "hand", make sure it doesn't match finger bone names
            if (patternClean === 'hand' || patternClean === 'handl' || patternClean === 'handr') {
              // Check if this is actually a finger bone (contains thumb, index, middle, ring, pinky)
              if (boneLower.includes('thumb') || boneLower.includes('index') || 
                  boneLower.includes('middle') || boneLower.includes('ring') || 
                  boneLower.includes('pinky')) {
                continue; // Skip this match, it's a finger bone
              }
            }
            return bone;
          }
        }
      }
      
      return null;
    };
    
    // Map base bones first (before hand finger bones) to prevent conflicts
    const baseBoneRoles = {};
    const fingerBoneRoles = {};
    
    // Separate base bones from finger bones
    for (const [role, patterns] of Object.entries(boneRoles)) {
      if (role.includes('Thumb') || role.includes('Index') || role.includes('Middle') || 
          role.includes('Ring') || role.includes('Pinky')) {
        fingerBoneRoles[role] = patterns;
      } else {
        baseBoneRoles[role] = patterns;
      }
    }
    
    // Map base bones first
    for (const [role, patterns] of Object.entries(baseBoneRoles)) {
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
    
    // Then map finger bones
    for (const [role, patterns] of Object.entries(fingerBoneRoles)) {
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
    
    // Calculate confidence score based on base bones only (not finger bones)
    const baseRolesForConfidence = this._getBaseRolesForConfidence();
    const baseBoneCount = Object.keys(baseRolesForConfidence).length;
    
    // Count how many base bone roles were successfully mapped
    let mappedBaseBones = 0;
    for (const role of Object.keys(baseRolesForConfidence)) {
      const patterns = baseRolesForConfidence[role];
      // Check if any bone in the mapping matches this role's patterns
      const isMapped = Object.keys(mapping).some(boneName => {
        const boneLower = boneName.toLowerCase().replace(/mixamorig:/gi, '').replace(/[_\s]/g, '');
        return patterns.some(pattern => {
          const patternClean = pattern.replace(/[_\s]/g, '');
          return boneLower === patternClean || boneLower.includes(patternClean);
        });
      });
      if (isMapped) {
        mappedBaseBones++;
      }
    }
    
    const confidence = mappedBaseBones / baseBoneCount;
    
    return { mapping, confidence };
  }

  /**
   * Add manual bone mapping
   * @param {string} sourceBone - Source bone name
   * @param {string} targetBone - Target bone name
   */
  addManualMapping(sourceBone, targetBone) {
    if (!sourceBone || !targetBone) {
      throw new Error('Both source and target bones must be specified');
    }
    
    this.boneMapping[sourceBone] = targetBone;
  }

  /**
   * Remove bone mapping
   * @param {string} sourceBone - Source bone name
   */
  removeMapping(sourceBone) {
    if (this.boneMapping[sourceBone]) {
      delete this.boneMapping[sourceBone];
      return true;
    }
    return false;
  }

  /**
   * Clear all bone mappings
   */
  clearMappings() {
    this.boneMapping = {};
    this.mappingConfidence = 0;
  }

  /**
   * Set bone mapping from external source
   * @param {Object} mapping - Bone mapping object
   * @param {number} confidence - Mapping confidence (optional)
   */
  setBoneMapping(mapping, confidence = 0) {
    this.boneMapping = { ...mapping };
    this.mappingConfidence = confidence;
  }

  /**
   * Get current bone mapping
   * @returns {Object} - Bone mapping object
   */
  getBoneMapping() {
    return { ...this.boneMapping };
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

  /**
   * Set rig types
   * @param {string} sourceType - Source rig type
   * @param {string} targetType - Target rig type
   */
  setRigTypes(sourceType, targetType) {
    this.sourceRigType = sourceType;
    this.targetRigType = targetType;
  }

  /**
   * Get hand bone roles for mapping
   * @private
   * @returns {Object} - Hand bone roles
   */
  _getHandBoneRoles() {
    return {
      // Left Hand Fingers
      'LeftHandThumb1': ['lefthandthumb1', 'left_handthumb1', 'thumb_01_l', 'thumb1_l', 'l_thumb1', 'thumb_1_l'],
      'LeftHandThumb2': ['lefthandthumb2', 'left_handthumb2', 'thumb_02_l', 'thumb2_l', 'l_thumb2', 'thumb_2_l'],
      'LeftHandThumb3': ['lefthandthumb3', 'left_handthumb3', 'thumb_03_l', 'thumb3_l', 'l_thumb3', 'thumb_3_l'],
      'LeftHandThumb4': ['lefthandthumb4', 'left_handthumb4', 'thumb_04_l', 'thumb4_l', 'l_thumb4', 'thumb_4_l'],
      
      'LeftHandIndex1': ['lefthandindex1', 'left_handindex1', 'index_01_l', 'index1_l', 'l_index1', 'index_1_l'],
      'LeftHandIndex2': ['lefthandindex2', 'left_handindex2', 'index_02_l', 'index2_l', 'l_index2', 'index_2_l'],
      'LeftHandIndex3': ['lefthandindex3', 'left_handindex3', 'index_03_l', 'index3_l', 'l_index3', 'index_3_l'],
      'LeftHandIndex4': ['lefthandindex4', 'left_handindex4', 'index_04_l', 'index4_l', 'l_index4', 'index_4_l'],
      
      'LeftHandMiddle1': ['lefthandmiddle1', 'left_handmiddle1', 'middle_01_l', 'middle1_l', 'l_middle1', 'middle_1_l'],
      'LeftHandMiddle2': ['lefthandmiddle2', 'left_handmiddle2', 'middle_02_l', 'middle2_l', 'l_middle2', 'middle_2_l'],
      'LeftHandMiddle3': ['lefthandmiddle3', 'left_handmiddle3', 'middle_03_l', 'middle3_l', 'l_middle3', 'middle_3_l'],
      'LeftHandMiddle4': ['lefthandmiddle4', 'left_handmiddle4', 'middle_04_l', 'middle4_l', 'l_middle4', 'middle_4_l'],
      
      'LeftHandRing1': ['lefthandring1', 'left_handring1', 'ring_01_l', 'ring1_l', 'l_ring1', 'ring_1_l'],
      'LeftHandRing2': ['lefthandring2', 'left_handring2', 'ring_02_l', 'ring2_l', 'l_ring2', 'ring_2_l'],
      'LeftHandRing3': ['lefthandring3', 'left_handring3', 'ring_03_l', 'ring3_l', 'l_ring3', 'ring_3_l'],
      'LeftHandRing4': ['lefthandring4', 'left_handring4', 'ring_04_l', 'ring4_l', 'l_ring4', 'ring_4_l'],
      
      'LeftHandPinky1': ['lefthandpinky1', 'left_handpinky1', 'pinky_01_l', 'pinky1_l', 'l_pinky1', 'pinky_1_l'],
      'LeftHandPinky2': ['lefthandpinky2', 'left_handpinky2', 'pinky_02_l', 'pinky2_l', 'l_pinky2', 'pinky_2_l'],
      'LeftHandPinky3': ['lefthandpinky3', 'left_handpinky3', 'pinky_03_l', 'pinky3_l', 'l_pinky3', 'pinky_3_l'],
      'LeftHandPinky4': ['lefthandpinky4', 'left_handpinky4', 'pinky_04_l', 'pinky4_l', 'l_pinky4', 'pinky_4_l'],
      
      // Right Hand Fingers
      'RightHandThumb1': ['righthandthumb1', 'right_handthumb1', 'thumb_01_r', 'thumb1_r', 'r_thumb1', 'thumb_1_r'],
      'RightHandThumb2': ['righthandthumb2', 'right_handthumb2', 'thumb_02_r', 'thumb2_r', 'r_thumb2', 'thumb_2_r'],
      'RightHandThumb3': ['righthandthumb3', 'right_handthumb3', 'thumb_03_r', 'thumb3_r', 'r_thumb3', 'thumb_3_r'],
      'RightHandThumb4': ['righthandthumb4', 'right_handthumb4', 'thumb_04_r', 'thumb4_r', 'r_thumb4', 'thumb_4_r'],
      
      'RightHandIndex1': ['righthandindex1', 'right_handindex1', 'index_01_r', 'index1_r', 'r_index1', 'index_1_r'],
      'RightHandIndex2': ['righthandindex2', 'right_handindex2', 'index_02_r', 'index2_r', 'r_index2', 'index_2_r'],
      'RightHandIndex3': ['righthandindex3', 'right_handindex3', 'index_03_r', 'index3_r', 'r_index3', 'index_3_r'],
      'RightHandIndex4': ['righthandindex4', 'right_handindex4', 'index_04_r', 'index4_r', 'r_index4', 'index_4_r'],
      
      'RightHandMiddle1': ['righthandmiddle1', 'right_handmiddle1', 'middle_01_r', 'middle1_r', 'r_middle1', 'middle_1_r'],
      'RightHandMiddle2': ['righthandmiddle2', 'right_handmiddle2', 'middle_02_r', 'middle2_r', 'r_middle2', 'middle_2_r'],
      'RightHandMiddle3': ['righthandmiddle3', 'right_handmiddle3', 'middle_03_r', 'middle3_r', 'r_middle3', 'middle_3_r'],
      'RightHandMiddle4': ['righthandmiddle4', 'right_handmiddle4', 'middle_04_r', 'middle4_r', 'r_middle4', 'middle_4_r'],
      
      'RightHandRing1': ['righthandring1', 'right_handring1', 'ring_01_r', 'ring1_r', 'r_ring1', 'ring_1_r'],
      'RightHandRing2': ['righthandring2', 'right_handring2', 'ring_02_r', 'ring2_r', 'r_ring2', 'ring_2_r'],
      'RightHandRing3': ['righthandring3', 'right_handring3', 'ring_03_r', 'ring3_r', 'r_ring3', 'ring_3_r'],
      'RightHandRing4': ['righthandring4', 'right_handring4', 'ring_04_r', 'ring4_r', 'r_ring4', 'ring_4_r'],
      
      'RightHandPinky1': ['righthandpinky1', 'right_handpinky1', 'pinky_01_r', 'pinky1_r', 'r_pinky1', 'pinky_1_r'],
      'RightHandPinky2': ['righthandpinky2', 'right_handpinky2', 'pinky_02_r', 'pinky2_r', 'r_pinky2', 'pinky_2_r'],
      'RightHandPinky3': ['righthandpinky3', 'right_handpinky3', 'pinky_03_r', 'pinky3_r', 'r_pinky3', 'pinky_3_r'],
      'RightHandPinky4': ['righthandpinky4', 'right_handpinky4', 'pinky_04_r', 'pinky4_r', 'r_pinky4', 'pinky_4_r']
    };
  }

  /**
   * Get base bone roles for confidence calculation
   * @private
   * @returns {Object} - Base bone roles
   */
  _getBaseRolesForConfidence() {
    return {
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
  }
}
