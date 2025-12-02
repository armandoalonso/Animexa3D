/**
 * UI Adapter for ModelLoader
 * Handles all DOM manipulation and user notifications
 * No business logic - pure UI layer
 */
export class ModelLoaderUIAdapter {
  /**
   * Show loading overlay and hide empty state
   */
  showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    if (emptyState) {
      emptyState.classList.add('hidden');
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      emptyState.classList.remove('hidden');
    }
  }

  /**
   * Hide empty state
   */
  hideEmptyState() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      emptyState.classList.add('hidden');
    }
  }

  /**
   * Update model information display
   * @param {string} filename - Model filename
   * @param {number} polygons - Polygon count
   * @param {number} animations - Animation count
   * @param {number} bones - Bone count
   */
  updateModelInfo(filename, polygons, animations, bones) {
    const nameEl = document.getElementById('info-name');
    const polygonsEl = document.getElementById('info-polygons');
    const animationsEl = document.getElementById('info-animations');
    const bonesEl = document.getElementById('info-bones');
    const modelInfoEl = document.getElementById('model-info');
    
    if (nameEl) nameEl.textContent = filename;
    if (polygonsEl) polygonsEl.textContent = polygons.toLocaleString();
    if (animationsEl) animationsEl.textContent = animations;
    if (bonesEl) bonesEl.textContent = bones > 0 ? bones : 'N/A';
    if (modelInfoEl) modelInfoEl.style.display = 'block';
  }

  /**
   * Clear model information display
   */
  clearModelInfo() {
    const modelInfoEl = document.getElementById('model-info');
    if (modelInfoEl) {
      modelInfoEl.style.display = 'none';
    }
  }

  /**
   * Show success notification
   * @param {string} filename - Model filename
   */
  showLoadSuccess(filename) {
    if (window.uiManager) {
      window.uiManager.showNotification(
        `Model loaded successfully: ${filename}`,
        'success'
      );
    }
  }

  /**
   * Show error notification
   * @param {string} message - Error message
   */
  showLoadError(message) {
    if (window.uiManager) {
      window.uiManager.showNotification(
        `Failed to load model: ${message}`,
        'error'
      );
    }
  }

  /**
   * Show compatibility results notification
   * @param {Object} compatibilityResult - Compatibility analysis result
   */
  showCompatibilityResults(compatibilityResult) {
    if (!window.uiManager) return;
    
    const notificationType = compatibilityResult.compatible ? 'success' : 'warning';
    window.uiManager.showNotification(
      compatibilityResult.message,
      notificationType
    );
  }

  /**
   * Display detailed compatibility information in console
   * @param {Object} compatibilityResult - Compatibility analysis result
   */
  logCompatibilityDetails(compatibilityResult) {
    console.log('Bone Compatibility Analysis:', {
      compatible: compatibilityResult.compatible,
      matchPercentage: compatibilityResult.matchPercentage,
      sourceBones: compatibilityResult.sourceBoneCount,
      targetBones: compatibilityResult.targetBoneCount,
      matchingBones: compatibilityResult.matchingBones?.length || 0,
      missingBones: compatibilityResult.missingBones?.length || 0,
      extraBones: compatibilityResult.extraBones?.length || 0
    });
    
    if (compatibilityResult.missingBones?.length > 0) {
      console.warn('Missing bones in target:', compatibilityResult.missingBones);
    }
    
    if (compatibilityResult.extraBones?.length > 0) {
      console.info('Extra bones in target:', compatibilityResult.extraBones);
    }
  }

  /**
   * Log model loading details
   * @param {string} filename - Model filename
   * @param {Object} stats - Model statistics
   */
  logLoadDetails(filename, stats) {
    console.log('Model loaded:', {
      filename,
      polygons: stats.polygons,
      bones: stats.bones,
      animations: stats.animations,
      hasSkeleton: stats.hasSkeleton,
      hasAnimations: stats.hasAnimations
    });
  }

  /**
   * Log animation file details
   * @param {string} filename - Animation filename
   * @param {number} animationCount - Number of animations
   * @param {number} boneCount - Number of bones
   */
  logAnimationFileDetails(filename, animationCount, boneCount) {
    console.log('Animation file loaded:', {
      filename,
      animations: animationCount,
      bones: boneCount,
      hasAnimations: animationCount > 0,
      hasSkeleton: boneCount > 0
    });
  }

  /**
   * Show notification for animation file loading
   * @param {string} filename - Animation filename
   * @param {number} animationCount - Number of animations
   */
  showAnimationFileLoaded(filename, animationCount) {
    if (window.uiManager) {
      window.uiManager.showNotification(
        `Animation file loaded: ${filename} (${animationCount} animation${animationCount !== 1 ? 's' : ''})`,
        'success'
      );
    }
  }

  /**
   * Reset all UI elements to initial state
   */
  reset() {
    this.hideLoadingOverlay();
    this.clearModelInfo();
  }
}
