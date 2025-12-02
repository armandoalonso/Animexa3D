/**
 * Pure service for analyzing 3D models
 * No UI dependencies, fully testable
 */
export class ModelAnalysisService {
  /**
   * Count polygons/triangles in a model
   * @param {THREE.Object3D} model - The model to analyze
   * @returns {number} - Number of polygons
   */
  countPolygons(model) {
    let count = 0;
    model.traverse((child) => {
      if (child.geometry) {
        if (child.geometry.index) {
          count += child.geometry.index.count / 3;
        } else if (child.geometry.attributes.position) {
          count += child.geometry.attributes.position.count / 3;
        }
      }
    });
    return Math.floor(count);
  }

  /**
   * Count bones in skinned meshes
   * @param {THREE.Object3D} model - The model to analyze
   * @returns {number} - Number of bones
   */
  countBones(model) {
    let count = 0;
    model.traverse((child) => {
      if (child.isSkinnedMesh && child.skeleton) {
        count += child.skeleton.bones.length;
      }
    });
    return count;
  }

  /**
   * Analyze model structure and return comprehensive statistics
   * @param {THREE.Object3D} model - The model to analyze
   * @param {Array} animations - Animation clips
   * @param {Object} skeletons - Skeleton data
   * @returns {Object} - Model statistics
   */
  analyzeModelStructure(model, animations, skeletons) {
    const polyCount = this.countPolygons(model);
    const boneCount = this.countBones(model);
    const animationCount = animations ? animations.length : 0;
    const skeletonCount = skeletons?.skeletons?.length || 0;
    const boneNames = skeletons?.boneNames || [];
    
    return {
      polygons: polyCount,
      bones: boneCount,
      animations: animationCount,
      skeletons: skeletonCount,
      boneNames: boneNames,
      hasSkeleton: boneNames.length > 0,
      hasAnimations: animationCount > 0,
      hasGeometry: polyCount > 0
    };
  }

  /**
   * Verify if two bone structures are compatible for animation retargeting
   * @param {Object} sourceSkeletons - Source skeleton data
   * @param {Object} targetSkeletons - Target skeleton data
   * @returns {Object} - Compatibility result with details
   */
  verifyBoneCompatibility(sourceSkeletons, targetSkeletons) {
    if (!sourceSkeletons || !targetSkeletons) {
      return {
        compatible: false,
        message: 'One or both models have no skeleton data',
        matchPercentage: 0,
        matchingBones: [],
        missingBones: [],
        extraBones: [],
        sourceBoneCount: 0,
        targetBoneCount: 0
      };
    }
    
    const sourceBones = new Set(sourceSkeletons.boneNames || []);
    const targetBones = new Set(targetSkeletons.boneNames || []);
    
    if (sourceBones.size === 0 || targetBones.size === 0) {
      return {
        compatible: false,
        message: 'One or both models have no bones',
        matchPercentage: 0,
        matchingBones: [],
        missingBones: [],
        extraBones: [],
        sourceBoneCount: sourceBones.size,
        targetBoneCount: targetBones.size
      };
    }
    
    // Find matching, missing, and extra bones
    const matchingBones = [];
    const missingBones = [];
    const extraBones = [];
    
    for (const bone of sourceBones) {
      if (targetBones.has(bone)) {
        matchingBones.push(bone);
      } else {
        missingBones.push(bone);
      }
    }
    
    for (const bone of targetBones) {
      if (!sourceBones.has(bone)) {
        extraBones.push(bone);
      }
    }
    
    const matchPercentage = (matchingBones.length / sourceBones.size) * 100;
    
    // Consider compatible if at least 80% of bones match
    const compatible = matchPercentage >= 80;
    
    let message = this.generateCompatibilityMessage(matchPercentage, compatible);
    
    return {
      compatible,
      message,
      matchPercentage: Math.round(matchPercentage),
      matchingBones,
      missingBones,
      extraBones,
      sourceBoneCount: sourceBones.size,
      targetBoneCount: targetBones.size
    };
  }

  /**
   * Generate human-readable compatibility message
   * @param {number} matchPercentage - Percentage of matching bones
   * @param {boolean} compatible - Whether bones are compatible
   * @returns {string} - Compatibility message
   */
  generateCompatibilityMessage(matchPercentage, compatible) {
    if (matchPercentage === 100) {
      return 'Perfect match! All bones are compatible.';
    } else if (compatible) {
      return `Good match! ${matchPercentage.toFixed(1)}% of bones are compatible.`;
    } else {
      return `Poor match. Only ${matchPercentage.toFixed(1)}% of bones are compatible. Animation may not work correctly.`;
    }
  }

  /**
   * Calculate compatibility threshold
   * @param {number} matchPercentage - Percentage of matching bones
   * @returns {string} - Compatibility level: 'perfect', 'good', 'fair', 'poor'
   */
  getCompatibilityLevel(matchPercentage) {
    if (matchPercentage === 100) return 'perfect';
    if (matchPercentage >= 80) return 'good';
    if (matchPercentage >= 60) return 'fair';
    return 'poor';
  }

  /**
   * Validate model data completeness
   * @param {Object} modelData - Model data to validate
   * @returns {Object} - Validation result
   */
  validateModelData(modelData) {
    const errors = [];
    const warnings = [];
    
    if (!modelData) {
      errors.push('Model data is null or undefined');
      return { valid: false, errors, warnings };
    }
    
    if (!modelData.model) {
      errors.push('Model object is missing');
    }
    
    if (!modelData.animations || modelData.animations.length === 0) {
      warnings.push('Model has no animations');
    }
    
    if (!modelData.skeletons || !modelData.skeletons.boneNames || modelData.skeletons.boneNames.length === 0) {
      warnings.push('Model has no skeletal data');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get summary text for model statistics
   * @param {Object} stats - Model statistics
   * @returns {string} - Summary text
   */
  getSummaryText(stats) {
    const parts = [];
    
    if (stats.polygons > 0) {
      parts.push(`${stats.polygons.toLocaleString()} polygons`);
    }
    
    if (stats.bones > 0) {
      parts.push(`${stats.bones} bones`);
    }
    
    if (stats.animations > 0) {
      parts.push(`${stats.animations} animation${stats.animations !== 1 ? 's' : ''}`);
    }
    
    return parts.join(', ') || 'No data available';
  }
}
