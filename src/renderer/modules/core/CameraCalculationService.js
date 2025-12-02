/**
 * CameraCalculationService - Pure logic for camera positioning and framing calculations
 * Handles camera distance, position, and preset calculations without Three.js dependencies
 */
export class CameraCalculationService {
  /**
   * Calculate the distance needed to frame an object in the camera view
   * @param {Object} modelSize - Size of the model with x, y, z properties
   * @param {number} cameraFov - Camera field of view in degrees
   * @param {number} paddingFactor - Additional padding multiplier (default 2.5)
   * @returns {number} Required camera distance
   */
  static calculateFramingDistance(modelSize, cameraFov, paddingFactor = 2.5) {
    if (!modelSize || typeof modelSize.x !== 'number' || typeof modelSize.y !== 'number' || typeof modelSize.z !== 'number') {
      throw new Error('Invalid model size: must have numeric x, y, z properties');
    }

    if (typeof cameraFov !== 'number' || cameraFov <= 0 || cameraFov >= 180) {
      throw new Error('Camera FOV must be between 0 and 180 degrees');
    }

    if (typeof paddingFactor !== 'number' || paddingFactor <= 0) {
      throw new Error('Padding factor must be a positive number');
    }

    // Calculate the maximum dimension of the model
    const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);

    // Convert FOV from degrees to radians
    const fovRadians = (cameraFov * Math.PI) / 180;

    // Calculate base distance to fit model in view
    const baseDistance = maxDimension / (2 * Math.tan(fovRadians / 2));

    // Apply padding factor for comfortable viewing
    return baseDistance * paddingFactor;
  }

  /**
   * Calculate camera position given distance and angle
   * @param {number} distance - Distance from target
   * @param {number} angleHorizontal - Horizontal angle in radians (default Math.PI/4 = 45°)
   * @param {number} angleVertical - Vertical angle multiplier (default 0.3)
   * @param {Object} modelSize - Size of the model for height calculation
   * @returns {Object} Camera position with x, y, z properties
   */
  static calculateCameraPosition(distance, angleHorizontal = Math.PI / 4, angleVertical = 0.3, modelSize = null) {
    if (typeof distance !== 'number' || distance <= 0) {
      throw new Error('Distance must be a positive number');
    }

    if (typeof angleHorizontal !== 'number') {
      throw new Error('Horizontal angle must be a number');
    }

    if (typeof angleVertical !== 'number' || angleVertical < 0) {
      throw new Error('Vertical angle multiplier must be a non-negative number');
    }

    // Calculate X and Z from horizontal angle
    const x = Math.sin(angleHorizontal) * distance;
    const z = Math.cos(angleHorizontal) * distance;

    // Calculate Y (elevated view)
    let y;
    if (modelSize && typeof modelSize.y === 'number') {
      y = modelSize.y * 0.5 + distance * angleVertical;
    } else {
      y = distance * angleVertical;
    }

    return { x, y, z };
  }

  /**
   * Get predefined camera presets
   * @param {number} distance - Distance from target (default 3)
   * @param {number} height - Height of target (default 1.6)
   * @returns {Object} Camera presets object
   */
  static getCameraPresets(distance = 3, height = 1.6) {
    if (typeof distance !== 'number' || distance <= 0) {
      throw new Error('Distance must be a positive number');
    }

    if (typeof height !== 'number') {
      throw new Error('Height must be a number');
    }

    return {
      perspective: {
        position: { x: 0, y: height, z: distance },
        target: { x: 0, y: height * 0.625, z: 0 } // height * (1/1.6) ≈ 0.625
      },
      front: {
        position: { x: 0, y: height, z: distance },
        target: { x: 0, y: height, z: 0 }
      },
      back: {
        position: { x: 0, y: height, z: -distance },
        target: { x: 0, y: height, z: 0 }
      },
      left: {
        position: { x: -distance, y: height, z: 0 },
        target: { x: 0, y: height, z: 0 }
      },
      right: {
        position: { x: distance, y: height, z: 0 },
        target: { x: 0, y: height, z: 0 }
      },
      top: {
        position: { x: 0, y: distance * (5 / 3), z: 0 }, // Scale top view distance
        target: { x: 0, y: 0, z: 0 }
      },
      bottom: {
        position: { x: 0, y: -distance * (5 / 3), z: 0 },
        target: { x: 0, y: 0, z: 0 }
      }
    };
  }

  /**
   * Calculate optimal camera target (look-at point) for a model
   * @param {Object} modelCenter - Center point of the model
   * @returns {Object} Target position with x, y, z properties
   */
  static calculateCameraTarget(modelCenter) {
    if (!modelCenter || 
        typeof modelCenter.x !== 'number' || 
        typeof modelCenter.y !== 'number' || 
        typeof modelCenter.z !== 'number') {
      throw new Error('Invalid model center: must have numeric x, y, z properties');
    }

    // Camera target is simply the model center
    return {
      x: modelCenter.x,
      y: modelCenter.y,
      z: modelCenter.z
    };
  }

  /**
   * Calculate camera aspect ratio
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   * @returns {number} Aspect ratio
   */
  static calculateAspectRatio(width, height) {
    if (typeof width !== 'number' || width <= 0) {
      throw new Error('Width must be a positive number');
    }

    if (typeof height !== 'number' || height <= 0) {
      throw new Error('Height must be a positive number');
    }

    return width / height;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  static degreesToRadians(degrees) {
    if (typeof degrees !== 'number') {
      throw new Error('Degrees must be a number');
    }

    return (degrees * Math.PI) / 180;
  }

  /**
   * Convert radians to degrees
   * @param {number} radians - Angle in radians
   * @returns {number} Angle in degrees
   */
  static radiansToDegrees(radians) {
    if (typeof radians !== 'number') {
      throw new Error('Radians must be a number');
    }

    return (radians * 180) / Math.PI;
  }

  /**
   * Calculate the visible height at a given distance for a given FOV
   * @param {number} distance - Distance from camera
   * @param {number} cameraFov - Camera field of view in degrees
   * @returns {number} Visible height at that distance
   */
  static calculateVisibleHeight(distance, cameraFov) {
    if (typeof distance !== 'number' || distance <= 0) {
      throw new Error('Distance must be a positive number');
    }

    if (typeof cameraFov !== 'number' || cameraFov <= 0 || cameraFov >= 180) {
      throw new Error('Camera FOV must be between 0 and 180 degrees');
    }

    const fovRadians = this.degreesToRadians(cameraFov);
    return 2 * Math.tan(fovRadians / 2) * distance;
  }

  /**
   * Calculate the visible width at a given distance for a given FOV and aspect ratio
   * @param {number} distance - Distance from camera
   * @param {number} cameraFov - Camera field of view in degrees
   * @param {number} aspectRatio - Camera aspect ratio (width / height)
   * @returns {number} Visible width at that distance
   */
  static calculateVisibleWidth(distance, cameraFov, aspectRatio) {
    if (typeof aspectRatio !== 'number' || aspectRatio <= 0) {
      throw new Error('Aspect ratio must be a positive number');
    }

    const visibleHeight = this.calculateVisibleHeight(distance, cameraFov);
    return visibleHeight * aspectRatio;
  }

  /**
   * Validate camera preset
   * @param {Object} preset - Preset object with position and target
   * @returns {boolean} True if preset is valid
   */
  static isValidPreset(preset) {
    if (!preset || typeof preset !== 'object') {
      return false;
    }

    const { position, target } = preset;

    if (!position || !target) {
      return false;
    }

    const isValidPos = (
      typeof position.x === 'number' && isFinite(position.x) &&
      typeof position.y === 'number' && isFinite(position.y) &&
      typeof position.z === 'number' && isFinite(position.z)
    );

    const isValidTarget = (
      typeof target.x === 'number' && isFinite(target.x) &&
      typeof target.y === 'number' && isFinite(target.y) &&
      typeof target.z === 'number' && isFinite(target.z)
    );

    return isValidPos && isValidTarget;
  }

  /**
   * Calculate camera position for an isometric-style view
   * @param {number} distance - Distance from target
   * @returns {Object} Isometric camera position
   */
  static calculateIsometricPosition(distance) {
    if (typeof distance !== 'number' || distance <= 0) {
      throw new Error('Distance must be a positive number');
    }

    // Isometric angle is typically 45° horizontal and 35.264° vertical
    const angleH = Math.PI / 4; // 45°
    const angleV = Math.atan(Math.sqrt(2)); // ≈ 54.736° from horizontal, or 35.264° from vertical

    const x = distance * Math.sin(angleH) * Math.cos(angleV);
    const y = distance * Math.sin(angleV);
    const z = distance * Math.cos(angleH) * Math.cos(angleV);

    return { x, y, z };
  }

  /**
   * Calculate smooth camera transition parameters
   * @param {Object} startPos - Starting position
   * @param {Object} endPos - Ending position
   * @param {number} duration - Duration in seconds
   * @param {number} fps - Frames per second (default 60)
   * @returns {Object} Transition parameters with frames and stepSize
   */
  static calculateCameraTransition(startPos, endPos, duration, fps = 60) {
    if (!startPos || !endPos) {
      throw new Error('Start and end positions are required');
    }

    if (typeof duration !== 'number' || duration <= 0) {
      throw new Error('Duration must be a positive number');
    }

    if (typeof fps !== 'number' || fps <= 0) {
      throw new Error('FPS must be a positive number');
    }

    const totalFrames = Math.floor(duration * fps);
    
    const delta = {
      x: endPos.x - startPos.x,
      y: endPos.y - startPos.y,
      z: endPos.z - startPos.z
    };

    const stepSize = {
      x: delta.x / totalFrames,
      y: delta.y / totalFrames,
      z: delta.z / totalFrames
    };

    return {
      totalFrames,
      stepSize,
      duration,
      fps
    };
  }
}
