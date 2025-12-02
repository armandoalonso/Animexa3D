/**
 * SceneStateService - Pure logic for scene configuration state management
 * Handles capturing, restoring, and validating scene state without UI dependencies
 */
export class SceneStateService {
  /**
   * Get default scene settings
   * @returns {Object} Default scene configuration
   */
  static getDefaultSettings() {
    return {
      backgroundColor: 0x2c3e50,
      gridVisible: true,
      gridSize: 100,
      gridDivisions: 100,
      gridColor1: 0x888888,
      gridColor2: 0x444444,
      ambientLightColor: 0xffffff,
      ambientLightIntensity: 0.4,
      directionalLightColor: 0xffffff,
      directionalLightIntensity: 0.8,
      directionalLightPosition: { x: 5, y: 10, z: 7.5 },
      cameraFov: 45,
      cameraNear: 0.1,
      cameraFar: 1000,
      cameraPosition: { x: 0, y: 1.6, z: 3 },
      cameraTarget: { x: 0, y: 1, z: 0 },
      controlsDamping: true,
      controlsDampingFactor: 0.05
    };
  }

  /**
   * Capture current scene state from Three.js objects
   * @param {Object} sceneObjects - Object containing scene, camera, lights, grid, controls
   * @returns {Object} Captured scene state
   */
  static captureSceneState(sceneObjects) {
    const { scene, camera, ambientLight, directionalLight, grid, controls } = sceneObjects;

    if (!scene || !camera) {
      throw new Error('Scene and camera are required to capture state');
    }

    const state = {
      backgroundColor: scene.background ? scene.background.getHex() : 0x2c3e50,
      gridVisible: grid ? grid.visible : true,
      cameraPosition: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      cameraRotation: {
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z
      },
      cameraFov: camera.fov,
      timestamp: Date.now()
    };

    // Capture light settings if available
    if (ambientLight) {
      state.ambientLightColor = ambientLight.color.getHex();
      state.ambientLightIntensity = ambientLight.intensity;
    }

    if (directionalLight) {
      state.directionalLightColor = directionalLight.color.getHex();
      state.directionalLightIntensity = directionalLight.intensity;
      state.directionalLightPosition = {
        x: directionalLight.position.x,
        y: directionalLight.position.y,
        z: directionalLight.position.z
      };
    }

    // Capture controls state if available
    if (controls) {
      state.controlsTarget = {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z
      };
      state.controlsDamping = controls.enableDamping;
      state.controlsDampingFactor = controls.dampingFactor;
    }

    // Capture grid settings if available
    if (grid) {
      state.gridSize = grid.geometry ? grid.geometry.parameters.size : 100;
      state.gridDivisions = grid.geometry ? grid.geometry.parameters.divisions : 100;
    }

    return state;
  }

  /**
   * Validate scene configuration object
   * @param {Object} config - Scene configuration to validate
   * @returns {Object} Validation result with isValid flag and errors array
   */
  static validateSceneConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
      return { isValid: false, errors: ['Configuration must be an object'] };
    }

    // Validate colors (should be numbers in hex format)
    const colorFields = [
      'backgroundColor',
      'ambientLightColor',
      'directionalLightColor',
      'gridColor1',
      'gridColor2'
    ];

    colorFields.forEach(field => {
      if (config[field] !== undefined) {
        if (typeof config[field] !== 'number' || config[field] < 0 || config[field] > 0xFFFFFF) {
          errors.push(`${field} must be a valid hex color (0x000000 - 0xFFFFFF)`);
        }
      }
    });

    // Validate intensity values (0-10 range is reasonable)
    const intensityFields = ['ambientLightIntensity', 'directionalLightIntensity'];
    intensityFields.forEach(field => {
      if (config[field] !== undefined) {
        if (typeof config[field] !== 'number' || config[field] < 0 || config[field] > 10) {
          errors.push(`${field} must be a number between 0 and 10`);
        }
      }
    });

    // Validate grid settings
    if (config.gridSize !== undefined) {
      if (typeof config.gridSize !== 'number' || config.gridSize <= 0) {
        errors.push('gridSize must be a positive number');
      }
    }

    if (config.gridDivisions !== undefined) {
      if (typeof config.gridDivisions !== 'number' || config.gridDivisions <= 0 || config.gridDivisions > 1000) {
        errors.push('gridDivisions must be a positive number (max 1000)');
      }
    }

    // Validate camera settings
    if (config.cameraFov !== undefined) {
      if (typeof config.cameraFov !== 'number' || config.cameraFov <= 0 || config.cameraFov >= 180) {
        errors.push('cameraFov must be between 0 and 180 degrees');
      }
    }

    if (config.cameraNear !== undefined) {
      if (typeof config.cameraNear !== 'number' || config.cameraNear <= 0) {
        errors.push('cameraNear must be a positive number');
      }
    }

    if (config.cameraFar !== undefined) {
      if (typeof config.cameraFar !== 'number' || config.cameraFar <= 0) {
        errors.push('cameraFar must be a positive number');
      }
    }

    // Validate near/far relationship
    if (config.cameraNear !== undefined && config.cameraFar !== undefined) {
      if (config.cameraNear >= config.cameraFar) {
        errors.push('cameraNear must be less than cameraFar');
      }
    }

    // Validate position objects
    const positionFields = ['cameraPosition', 'cameraTarget', 'directionalLightPosition'];
    positionFields.forEach(field => {
      if (config[field] !== undefined) {
        if (typeof config[field] !== 'object' || config[field] === null) {
          errors.push(`${field} must be an object`);
        } else {
          const { x, y, z } = config[field];
          if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
            errors.push(`${field} must have numeric x, y, z properties`);
          }
          if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
            errors.push(`${field} values must be finite numbers`);
          }
        }
      }
    });

    // Validate boolean fields
    const booleanFields = ['gridVisible', 'controlsDamping'];
    booleanFields.forEach(field => {
      if (config[field] !== undefined && typeof config[field] !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
    });

    // Validate damping factor
    if (config.controlsDampingFactor !== undefined) {
      if (typeof config.controlsDampingFactor !== 'number' || 
          config.controlsDampingFactor < 0 || 
          config.controlsDampingFactor > 1) {
        errors.push('controlsDampingFactor must be between 0 and 1');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge partial config with defaults
   * @param {Object} partialConfig - Partial configuration object
   * @returns {Object} Complete configuration with defaults filled in
   */
  static mergeWithDefaults(partialConfig = {}) {
    const defaults = this.getDefaultSettings();
    return { ...defaults, ...partialConfig };
  }

  /**
   * Create a scene state diff between two states
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @returns {Object} Object containing only changed properties
   */
  static createStateDiff(oldState, newState) {
    const diff = {};

    for (const key in newState) {
      if (Object.prototype.hasOwnProperty.call(newState, key)) {
        const oldValue = oldState[key];
        const newValue = newState[key];

        // Deep compare for objects
        if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
          const subDiff = this.createStateDiff(oldValue || {}, newValue);
          if (Object.keys(subDiff).length > 0) {
            diff[key] = newValue;
          }
        } else if (oldValue !== newValue) {
          diff[key] = newValue;
        }
      }
    }

    return diff;
  }

  /**
   * Check if a state is valid and complete
   * @param {Object} state - State to check
   * @returns {boolean} True if state has all required properties
   */
  static isCompleteState(state) {
    const required = ['cameraPosition', 'cameraFov'];
    return required.every(prop => state && state[prop] !== undefined);
  }

  /**
   * Sanitize state values to ensure they're safe to apply
   * @param {Object} state - State to sanitize
   * @returns {Object} Sanitized state
   */
  static sanitizeState(state) {
    const sanitized = { ...state };

    // Ensure numbers are finite
    const numericFields = [
      'backgroundColor',
      'ambientLightIntensity',
      'directionalLightIntensity',
      'cameraFov',
      'cameraNear',
      'cameraFar',
      'gridSize',
      'gridDivisions'
    ];

    numericFields.forEach(field => {
      if (sanitized[field] !== undefined && !isFinite(sanitized[field])) {
        const defaults = this.getDefaultSettings();
        sanitized[field] = defaults[field];
      }
    });

    // Ensure position objects are valid
    const positionFields = ['cameraPosition', 'cameraTarget', 'directionalLightPosition'];
    positionFields.forEach(field => {
      if (sanitized[field]) {
        const pos = sanitized[field];
        if (!isFinite(pos.x)) pos.x = 0;
        if (!isFinite(pos.y)) pos.y = 0;
        if (!isFinite(pos.z)) pos.z = 0;
      }
    });

    return sanitized;
  }
}
