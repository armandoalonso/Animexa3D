import * as THREE from 'three';
import { BoneMappingService } from './BoneMappingService.js';
import { SkeletonAnalyzer } from './SkeletonAnalyzer.js';
import { PoseNormalization } from './PoseNormalization.js';
import { RetargetingEngine, BindPoseModes } from './RetargetingEngine.js';

// Re-export BindPoseModes for backward compatibility
export { BindPoseModes };

/**
 * RetargetManager - Coordinates retargeting operations between services
 * Acts as a facade for the retargeting subsystem, delegating to specialized services
 */
export class RetargetManager {
  constructor(sceneManager, modelLoader, animationManager, options = {}) {
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.animationManager = animationManager;
    
    // Initialize services with dependency injection
    this.skeletonAnalyzer = options.skeletonAnalyzer || new SkeletonAnalyzer();
    this.boneMappingService = options.boneMappingService || new BoneMappingService();
    this.poseNormalization = options.poseNormalization || new PoseNormalization(this.skeletonAnalyzer);
    this.retargetingEngine = options.retargetingEngine || new RetargetingEngine(this.skeletonAnalyzer);
    
    // Store source and target model data
    this.sourceModel = null;
    this.targetModel = null;
    this.sourceSkeletonInfo = null;
    this.targetSkeletonInfo = null;
    
    // Root bone tracking (auto-detected)
    this.sourceRootBone = null;
    this.targetRootBone = null;
    
    // User-selected root bones (override auto-detection)
    this.selectedSourceRootBone = null;
    this.selectedTargetRootBone = null;
    
    // Retargeting options
    this.retargetOptions = {
      useWorldSpaceTransformation: false,
      autoValidatePose: true,
      autoApplyTPose: false,
      useOptimalScale: true
    };
  }

  /**
   * Get target model data (for UI controllers)
   */
  getTargetModelData() {
    return {
      model: this.targetModel ? this.targetModel.model || this.targetModel : null,
      skeletons: this.targetSkeletonInfo
    };
  }

  // ============================================================================
  // DELEGATION METHODS - Forward calls to appropriate services
  // ============================================================================

  /**
   * Detect duplicate bone names in skeleton
   */
  detectDuplicateBoneNames(boneNames) {
    return this.skeletonAnalyzer.detectDuplicateBoneNames(boneNames);
  }

  /**
   * Detect rig type based on bone names
   */
  detectRigType(boneNames) {
    return this.boneMappingService.detectRigType(boneNames);
  }

  /**
   * Generate automatic bone mapping between two rigs
   */
  generateAutomaticMapping(sourceBones, targetBones, includeHandBones = false) {
    return this.boneMappingService.generateAutomaticMapping(sourceBones, targetBones, includeHandBones);
  }

  /**
   * Build visual bone hierarchy tree for UI
   */
  buildBoneTree(skeletonInfo, isSource) {
    return this.skeletonAnalyzer.buildBoneTree(
      skeletonInfo, 
      isSource, 
      this.boneMappingService.boneMapping
    );
  }

  /**
   * Find root bones in a bone array
   */
  findRootBones(bones) {
    return this.skeletonAnalyzer.findRootBones(bones);
  }

  /**
   * Find bone index by name
   */
  findIndexOfBoneByName(skeleton, name) {
    return this.skeletonAnalyzer.findIndexOfBoneByName(skeleton, name);
  }

  /**
   * Find bone index by bone object
   */
  findIndexOfBone(skeleton, bone) {
    return this.skeletonAnalyzer.findIndexOfBone(skeleton, bone);
  }

  /**
   * Detect pose type from skeleton
   */
  detectPoseType(skeleton) {
    return this.poseNormalization.detectPoseType(skeleton);
  }

  /**
   * Apply T-Pose to skeleton
   */
  applyTPose(skeleton, boneMap = null) {
    return this.poseNormalization.applyTPose(skeleton, boneMap);
  }

  /**
   * Apply A-Pose to skeleton
   */
  applyAPose(skeleton, boneMap = null) {
    return this.poseNormalization.applyAPose(skeleton, boneMap);
  }

  /**
   * Detect bone names for T-Pose application
   */
  detectTPoseBones(skeleton) {
    return this.poseNormalization.detectTPoseBones(skeleton);
  }

  // ============================================================================
  // MODEL AND SKELETON MANAGEMENT
  // ============================================================================

  /**
   * Set source model for retargeting
   */
  setSourceModel(modelData) {
    this.sourceModel = modelData;
    
    // Extract skeleton info - prefer provided skeletons if they have bones
    if (modelData.skeletons && modelData.skeletons.bones && modelData.skeletons.bones.length > 0) {
      this.sourceSkeletonInfo = modelData.skeletons;
      console.log('Using provided skeleton info for source model');
    } else {
      console.log('Extracting skeleton info from source model');
      const modelObject = modelData.model || modelData;
      this.sourceSkeletonInfo = this.skeletonAnalyzer.extractSkeletonInfo(modelObject);
    }
    
    console.log('Source skeleton info:', {
      hasBones: !!this.sourceSkeletonInfo.bones,
      boneCount: this.sourceSkeletonInfo.bones?.length || 0,
      hasBoneNames: !!this.sourceSkeletonInfo.boneNames,
      boneNameCount: this.sourceSkeletonInfo.boneNames?.length || 0
    });
    
    // Extract bone names from animation tracks if no skeleton mesh exists
    if ((!this.sourceSkeletonInfo.bones || this.sourceSkeletonInfo.bones.length === 0) && 
        (!this.sourceSkeletonInfo.boneNames || this.sourceSkeletonInfo.boneNames.length === 0) &&
        modelData.animations && modelData.animations.length > 0) {
      console.log('No skeleton mesh found, extracting bones from animation tracks');
      const boneNamesSet = new Set();
      for (const animation of modelData.animations) {
        for (const track of animation.tracks) {
          // Track names are in format "BoneName.position" or "BoneName.quaternion"
          const boneName = track.name.split('.')[0];
          boneNamesSet.add(boneName);
        }
      }
      const boneNames = Array.from(boneNamesSet);
      console.log(`Extracted ${boneNames.length} bone names from animation tracks:`, boneNames.slice(0, 5));
      this.sourceSkeletonInfo = { 
        bones: [], 
        boneNames: boneNames, 
        skeleton: null,
        fromAnimationTracks: true // Flag to indicate this came from animation data
      };
    }
    
    const sourceRigType = this.boneMappingService.detectRigType(this.sourceSkeletonInfo.boneNames);
    this.boneMappingService.sourceRigType = sourceRigType;
    
    // Track root bone
    if (this.sourceSkeletonInfo.bones && this.sourceSkeletonInfo.bones.length > 0) {
      this.sourceRootBone = this.skeletonAnalyzer.detectFunctionalRootBone(this.sourceSkeletonInfo.bones);
    }
    
    console.log('Source model set:', {
      filename: modelData.filename || 'unknown',
      rigType: sourceRigType,
      boneCount: this.sourceSkeletonInfo.bones?.length || 0,
      animationCount: modelData.animations?.length || 0,
      rootBone: this.sourceRootBone
    });
  }

  /**
   * Set target model for retargeting
   */
  setTargetModel(modelData) {
    this.targetModel = modelData;
    this.targetSkeletonInfo = modelData.skeletons;
    
    if (!this.targetSkeletonInfo || !this.targetSkeletonInfo.boneNames) {
      console.warn('Target skeleton info is missing or invalid in setTargetModel:', this.targetSkeletonInfo);
      return;
    }
    
    const targetRigType = this.boneMappingService.detectRigType(this.targetSkeletonInfo.boneNames);
    this.boneMappingService.targetRigType = targetRigType;
    
    // Track root bone
    if (this.targetSkeletonInfo.bones && this.targetSkeletonInfo.bones.length > 0) {
      this.targetRootBone = this.skeletonAnalyzer.detectFunctionalRootBone(this.targetSkeletonInfo.bones);
    }
    
    console.log('Target model set:', {
      filename: modelData.filename || 'unknown',
      rigType: targetRigType,
      boneCount: this.targetSkeletonInfo.bones.length,
      rootBone: this.targetRootBone
    });
  }

  /**
   * Get source skeleton
   */
  getSourceSkeleton() {
    if (!this.sourceModel) return null;
    const sourceObject = this.sourceModel.model || this.sourceModel;
    return this.skeletonAnalyzer.getSkeletonFromModel(sourceObject, this.sourceSkeletonInfo);
  }

  /**
   * Get target skeleton
   */
  getTargetSkeleton() {
    if (!this.targetModel) return null;
    const modelObject = this.targetModel.model || this.targetModel;
    return this.skeletonAnalyzer.getSkeletonFromModel(modelObject, this.targetSkeletonInfo);
  }

  /**
   * Extract skeleton info from a model
   */
  extractSkeletonInfo(model) {
    return this.skeletonAnalyzer.extractSkeletonInfo(model);
  }

  /**
   * Create a THREE.Skeleton from an array of bones
   */
  createSkeletonFromBones(bones) {
    return this.skeletonAnalyzer.createSkeletonFromBones(bones);
  }

  /**
   * Create a simple skeleton helper from skeleton info
   */
  createSkeletonHelper(skeletonInfo) {
    return this.skeletonAnalyzer.createSkeletonHelper(skeletonInfo);
  }

  // ============================================================================
  // BONE MAPPING OPERATIONS
  // ============================================================================

  /**
   * Generate automatic bone mapping
   */
  autoMapBones(includeHandBones = false) {
    if (!this.sourceSkeletonInfo || !this.targetSkeletonInfo) {
      window.uiManager.showNotification('Please load both source and target models', 'error');
      return;
    }
    
    const result = this.boneMappingService.generateAutomaticMapping(
      this.sourceSkeletonInfo.boneNames,
      this.targetSkeletonInfo.boneNames,
      includeHandBones
    );
    
    this.boneMappingService.setBoneMapping(result.mapping, result.confidence);
    
    // Ensure root bones are mapped if not already included
    const effectiveSourceRoot = this.getEffectiveSourceRootBone();
    const effectiveTargetRoot = this.getEffectiveTargetRootBone();
    
    if (effectiveSourceRoot && effectiveTargetRoot) {
      if (!this.boneMappingService.boneMapping[effectiveSourceRoot]) {
        this.boneMappingService.boneMapping[effectiveSourceRoot] = effectiveTargetRoot;
        console.log(`🎯 Auto-added root bone mapping: ${effectiveSourceRoot} → ${effectiveTargetRoot}`);
      }
    }
    
    const mappedCount = Object.keys(this.boneMappingService.boneMapping).length;
    const confidencePercent = Math.round(result.confidence * 100);
    
    console.log('🔗 Bone Mapping Results:');
    console.log(`  Mapped: ${mappedCount} bones`);
    console.log(`  Confidence: ${confidencePercent}%`);
    
    window.uiManager.showNotification(
      `Auto-mapped ${mappedCount} bones with ${confidencePercent}% confidence`,
      confidencePercent > 70 ? 'success' : 'warning'
    );
    
    return result;
  }

  /**
   * Add manual bone mapping
   */
  addManualMapping(sourceBone, targetBone) {
    if (!sourceBone || !targetBone) {
      window.uiManager.showNotification('Please select both source and target bones', 'warning');
      return;
    }
    
    this.boneMappingService.addManualMapping(sourceBone, targetBone);
    window.uiManager.showNotification(`Mapped: ${sourceBone} → ${targetBone}`, 'success');
  }

  /**
   * Remove bone mapping
   */
  removeMapping(sourceBone) {
    if (this.boneMappingService.removeMapping(sourceBone)) {
      window.uiManager.showNotification(`Removed mapping for ${sourceBone}`, 'info');
    }
  }

  /**
   * Clear all bone mappings
   */
  clearMappings() {
    this.boneMappingService.clearMappings();
    window.uiManager.showNotification('All mappings cleared', 'info');
  }

  /**
   * Get current bone mapping
   */
  getBoneMapping() {
    return this.boneMappingService.getBoneMapping();
  }

  /**
   * Get mapping info
   */
  getMappingInfo() {
    return this.boneMappingService.getMappingInfo();
  }

  /**
   * Save bone mapping to file
   */
  async saveBoneMapping(name) {
    if (!name || name.trim() === '') {
      window.uiManager.showNotification('Please enter a name for the mapping', 'warning');
      return;
    }
    
    const mappingData = {
      name: name,
      sourceRigType: this.boneMappingService.sourceRigType,
      targetRigType: this.boneMappingService.targetRigType,
      mapping: this.boneMappingService.getBoneMapping(),
      confidence: this.boneMappingService.mappingConfidence,
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
   */
  async loadBoneMapping(name) {
    const result = await window.electronAPI.loadBoneMapping(name);
    
    if (result.success) {
      const data = result.data;
      this.boneMappingService.setBoneMapping(data.mapping, data.confidence || 0);
      
      window.uiManager.showNotification(`Loaded bone mapping "${name}"`, 'success');
      
      return data;
    } else {
      window.uiManager.showNotification(`Failed to load mapping: ${result.error}`, 'error');
      return null;
    }
  }

  // ============================================================================
  // ROOT BONE MANAGEMENT
  // ============================================================================

  /**
   * Set custom root bone for source model
   */
  setSourceRootBone(boneName) {
    this.selectedSourceRootBone = boneName;
    console.log('Source root bone set to:', boneName);
  }

  /**
   * Set custom root bone for target model
   */
  setTargetRootBone(boneName) {
    this.selectedTargetRootBone = boneName;
    console.log('Target root bone set to:', boneName);
  }

  /**
   * Get the effective source root bone (user-selected or auto-detected)
   */
  getEffectiveSourceRootBone() {
    return this.selectedSourceRootBone || this.sourceRootBone;
  }

  /**
   * Get the effective target root bone (user-selected or auto-detected)
   */
  getEffectiveTargetRootBone() {
    return this.selectedTargetRootBone || this.targetRootBone;
  }

  // ============================================================================
  // RETARGETING OPERATIONS
  // ============================================================================

  /**
   * Initialize retargeting data structures
   */
  initializeRetargeting(options = {}) {
    const srcSkeleton = this.getSourceSkeleton();
    const trgSkeleton = this.getTargetSkeleton();
    
    if (!srcSkeleton || !trgSkeleton) {
      throw new Error('Source or target skeleton not found');
    }
    
    const {
      srcPoseMode = BindPoseModes.DEFAULT,
      trgPoseMode = BindPoseModes.DEFAULT,
      srcEmbedWorld = true,
      trgEmbedWorld = true
    } = options;
    
    // Initialize the retargeting engine
    this.retargetingEngine.initializeRetargeting(
      srcSkeleton,
      trgSkeleton,
      this.boneMappingService.getBoneMapping(),
      { srcPoseMode, trgPoseMode, srcEmbedWorld, trgEmbedWorld }
    );
    
    // Validate poses if enabled
    if (this.retargetOptions.autoValidatePose) {
      const poseValidation = this.poseNormalization.validatePoses(
        this.retargetingEngine.srcBindPose,
        this.retargetingEngine.trgBindPose
      );
      
      console.log('Pose validation:', poseValidation);
      
      if (window.uiManager) {
        const poseMessage = `🧍 Pose Detection: Source is ${poseValidation.sourcePose}, Target is ${poseValidation.targetPose}`;
        const poseType = poseValidation.valid ? 'info' : 'warning';
        window.uiManager.showNotification(poseMessage, poseType, 5000);
        
        if (!poseValidation.valid || poseValidation.recommendation.includes('may improve')) {
          window.uiManager.showNotification(`💡 ${poseValidation.recommendation}`, 'info', 6000);
        }
      }
      
      if (!poseValidation.valid && this.retargetOptions.autoApplyTPose) {
        console.log('⚠ Incompatible poses detected, applying T-pose normalization');
        try {
          const srcBoneMap = this.poseNormalization.detectTPoseBones(this.retargetingEngine.srcBindPose);
          const trgBoneMap = this.poseNormalization.detectTPoseBones(this.retargetingEngine.trgBindPose);
          
          this.poseNormalization.applyTPose(this.retargetingEngine.srcBindPose, srcBoneMap);
          this.poseNormalization.applyTPose(this.retargetingEngine.trgBindPose, trgBoneMap);
          
          console.log('✓ T-pose normalization applied');
          
          if (window.uiManager) {
            window.uiManager.showNotification('✓ Auto-applied T-pose normalization', 'success', 4000);
          }
        } catch (error) {
          console.error('Failed to apply T-pose normalization:', error);
          if (window.uiManager) {
            window.uiManager.showNotification('⚠ T-pose normalization failed', 'warning', 4000);
          }
        }
      }
    }
  }

  /**
   * Validate retargeting poses and return analysis
   */
  validateRetargetingPoses() {
    if (!this.retargetingEngine.srcBindPose || !this.retargetingEngine.trgBindPose) {
      return {
        valid: false,
        message: 'Bind poses not initialized',
        sourceInTPose: false,
        targetInTPose: false
      };
    }
    
    return this.poseNormalization.validatePoses(
      this.retargetingEngine.srcBindPose,
      this.retargetingEngine.trgBindPose
    );
  }

  /**
   * Retarget animation from source to target model
   */
  retargetAnimation(sourceClip, preserveRootMotion = true) {
    if (!this.sourceModel || !this.targetModel) {
      window.uiManager.showNotification('Please load both source and target models', 'error');
      return null;
    }
    
    if (Object.keys(this.boneMappingService.boneMapping).length === 0) {
      console.error('❌ No bone mappings found!');
      window.uiManager.showNotification('No bone mappings defined. Use auto-map or manual mapping.', 'error');
      return null;
    }
    
    console.log('🎯 Starting retargeting with', Object.keys(this.boneMappingService.boneMapping).length, 'bone mappings');
    
    try {
      // Initialize retargeting if not done
      if (!this.retargetingEngine.srcBindPose || !this.retargetingEngine.trgBindPose) {
        this.initializeRetargeting();
      }
      
      const srcSkeleton = this.getSourceSkeleton();
      const trgSkeleton = this.getTargetSkeleton();
      const trgTracks = [];
      const srcTracks = sourceClip.tracks;
      
      const effectiveSourceRoot = this.getEffectiveSourceRootBone();
      const effectiveTargetRoot = this.getEffectiveTargetRootBone();
      
      console.log('📊 Processing', srcTracks.length, 'animation tracks');
      console.log('Root bones - Source:', effectiveSourceRoot, 'Target:', effectiveTargetRoot);
      
      let skippedCount = 0;
      let retargetedCount = 0;
      let rootTracksCount = 0;
      
      for (let i = 0; i < srcTracks.length; i++) {
        const track = srcTracks[i];
        let newTrack = null;
        
        const trackParts = track.name.split('.');
        const boneName = trackParts.slice(0, -1).join('.');
        const property = trackParts[trackParts.length - 1];
        
        const isRootBone = effectiveSourceRoot && boneName === effectiveSourceRoot;
        const isPositionTrack = property === 'position';
        
        if (isPositionTrack) {
          if (isRootBone && preserveRootMotion) {
            newTrack = this.retargetingEngine.retargetPositionTrack(
              track, srcSkeleton, trgSkeleton, effectiveSourceRoot
            );
            rootTracksCount++;
            console.log(`  ✓ Root motion preserved: ${track.name}`);
          } else {
            console.log(`  ⊗ Position skipped: ${track.name}`);
            skippedCount++;
            continue;
          }
        } else if (track.name.endsWith('.quaternion')) {
          newTrack = this.retargetingEngine.retargetQuaternionTrack(
            track, srcSkeleton, trgSkeleton, effectiveSourceRoot
          );
        } else if (track.name.endsWith('.scale')) {
          newTrack = this.retargetingEngine.retargetScaleTrack(
            track, srcSkeleton, trgSkeleton
          );
        }
        
        if (newTrack) {
          trgTracks.push(newTrack);
          retargetedCount++;
        } else {
          skippedCount++;
        }
      }
      
      console.log(`✅ Retargeted ${retargetedCount} tracks (${rootTracksCount} root motion), ❌ Skipped ${skippedCount} tracks`);
      
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
   * Set retargeting options
   */
  setRetargetOptions(options) {
    this.retargetOptions = {
      ...this.retargetOptions,
      ...options
    };
    
    // Update engine options
    this.retargetingEngine.setRetargetOptions({
      useWorldSpaceTransformation: this.retargetOptions.useWorldSpaceTransformation,
      useOptimalScale: this.retargetOptions.useOptimalScale
    });
    
    console.log('Retargeting options updated:', this.retargetOptions);
  }

  /**
   * Set coordinate correction (for Unreal Engine imports)
   */
  setCoordinateCorrection(enabled) {
    this.retargetingEngine.setCoordinateCorrection(enabled);
  }

  // ============================================================================
  // LEGACY COMPATIBILITY - These maintain backward compatibility
  // ============================================================================

  // Expose boneMapping for backward compatibility
  get boneMapping() {
    return this.boneMappingService.boneMapping;
  }

  set boneMapping(value) {
    this.boneMappingService.boneMapping = value;
  }

  get mappingConfidence() {
    return this.boneMappingService.mappingConfidence;
  }

  get sourceRigType() {
    return this.boneMappingService.sourceRigType;
  }

  get targetRigType() {
    return this.boneMappingService.targetRigType;
  }

  get srcBindPose() {
    return this.retargetingEngine.srcBindPose;
  }

  get trgBindPose() {
    return this.retargetingEngine.trgBindPose;
  }

  get precomputedQuats() {
    return this.retargetingEngine.precomputedQuats;
  }

  get proportionRatio() {
    return this.retargetingEngine.proportionRatio;
  }

  get boneMapIndices() {
    return this.retargetingEngine.boneMapIndices;
  }

  get applyCoordinateCorrection() {
    return this.retargetingEngine.applyCoordinateCorrection;
  }

  set applyCoordinateCorrection(value) {
    this.retargetingEngine.applyCoordinateCorrection = value;
  }

  get coordinateCorrectionRotation() {
    return this.retargetingEngine.coordinateCorrectionRotation;
  }

  // Legacy methods that may be used by tests
  newTransform() {
    return this.retargetingEngine.newTransform();
  }

  cloneRawSkeleton(skeleton, poseMode, embedWorld) {
    return this.retargetingEngine.cloneRawSkeleton(skeleton, poseMode, embedWorld);
  }

  computeProportionRatio() {
    return this.retargetingEngine.computeProportionRatio();
  }

  computeOptimalScale() {
    return this.retargetingEngine.computeOptimalScale();
  }
}
