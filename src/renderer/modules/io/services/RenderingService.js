/**
 * RenderingService
 * Pure business logic for managing rendering state during export operations.
 * Handles scene preparation and restoration without direct DOM manipulation.
 */
export class RenderingService {
  /**
   * Prepare renderer and scene for offscreen rendering
   * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
   * @param {THREE.Camera} camera - The camera
   * @param {THREE.Scene} scene - The scene
   * @param {number} width - Export width in pixels
   * @param {number} height - Export height in pixels
   * @param {boolean} transparentBackground - Whether to use transparent background
   * @param {Function} toggleGridFn - Function to toggle grid visibility
   * @returns {Object} Original settings to restore later
   */
  prepareOffscreenRender(renderer, camera, scene, width, height, transparentBackground, toggleGridFn) {
    if (!renderer || !camera || !scene) {
      throw new Error('Renderer, camera, and scene are required');
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Width and height must be positive');
    }

    // Store original settings
    const originalSettings = {
      width: renderer.domElement.width,
      height: renderer.domElement.height,
      aspect: camera.aspect,
      alpha: renderer.getClearAlpha(),
      backgroundColor: scene.background ? scene.background.clone() : null
    };

    // Hide grid if toggle function provided
    if (typeof toggleGridFn === 'function') {
      toggleGridFn(false);
    }

    // Set transparent background if requested
    if (transparentBackground) {
      renderer.setClearAlpha(0);
      scene.background = null;
    }

    // Set export resolution
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    return originalSettings;
  }

  /**
   * Restore renderer and scene to original state
   * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
   * @param {THREE.Camera} camera - The camera
   * @param {THREE.Scene} scene - The scene
   * @param {Object} originalSettings - Settings from prepareOffscreenRender
   * @param {boolean} gridWasVisible - Whether grid should be restored
   * @param {Function} toggleGridFn - Function to toggle grid visibility
   */
  restoreRenderState(renderer, camera, scene, originalSettings, gridWasVisible, toggleGridFn) {
    if (!renderer || !camera || !scene || !originalSettings) {
      throw new Error('All parameters are required for restoration');
    }

    // Restore original renderer settings
    renderer.setSize(originalSettings.width, originalSettings.height);
    camera.aspect = originalSettings.aspect;
    camera.updateProjectionMatrix();

    // Restore background
    renderer.setClearAlpha(originalSettings.alpha);
    scene.background = originalSettings.backgroundColor;

    // Show grid if it was visible
    if (gridWasVisible && typeof toggleGridFn === 'function') {
      toggleGridFn(true);
    }
  }

  /**
   * Capture current frame from renderer
   * @param {THREE.WebGLRenderer} renderer - The renderer
   * @param {THREE.Scene} scene - The scene to render
   * @param {THREE.Camera} camera - The camera
   * @param {string} format - Image format ('image/png', 'image/jpeg')
   * @param {number} quality - Image quality (0-1, for JPEG)
   * @returns {string} Data URL of captured frame
   */
  captureFrame(renderer, scene, camera, format = 'image/png', quality = 1.0) {
    if (!renderer || !scene || !camera) {
      throw new Error('Renderer, scene, and camera are required');
    }

    // Render the current frame
    renderer.render(scene, camera);

    // Capture as data URL
    return renderer.domElement.toDataURL(format, quality);
  }

  /**
   * Validate rendering configuration
   * @param {Object} config - Rendering configuration
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validateRenderingConfig(config) {
    const errors = [];

    if (!config.renderer) {
      errors.push('Renderer is required');
    }

    if (!config.camera) {
      errors.push('Camera is required');
    }

    if (!config.scene) {
      errors.push('Scene is required');
    }

    if (typeof config.width !== 'number' || config.width <= 0) {
      errors.push('Width must be a positive number');
    }

    if (typeof config.height !== 'number' || config.height <= 0) {
      errors.push('Height must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate aspect ratio from dimensions
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   * @returns {number} Aspect ratio
   */
  calculateAspectRatio(width, height) {
    if (height === 0) {
      throw new Error('Height cannot be zero');
    }
    return width / height;
  }
}
