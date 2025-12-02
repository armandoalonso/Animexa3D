/**
 * ExportConfigService
 * Pure business logic for export configuration validation and parsing.
 * No UI dependencies, fully testable.
 */
export class ExportConfigService {
  /**
   * Generate a timestamp string for export operations
   * @returns {string} Timestamp in format YYYYMMDDHHMMSS
   */
  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Parse resolution string into width and height
   * @param {string} resolutionString - Resolution in format "WIDTHxHEIGHT" (e.g., "1920x1080")
   * @returns {{width: number, height: number}} Parsed dimensions
   * @throws {Error} If resolution string is invalid
   */
  parseResolution(resolutionString) {
    if (!resolutionString || typeof resolutionString !== 'string') {
      throw new Error('Resolution must be a non-empty string');
    }

    const parts = resolutionString.split('x');
    if (parts.length !== 2) {
      throw new Error('Resolution must be in format "WIDTHxHEIGHT"');
    }

    const width = Number(parts[0]);
    const height = Number(parts[1]);

    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      throw new Error('Width and height must be integers');
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Width and height must be positive');
    }

    if (width > 8192 || height > 8192) {
      throw new Error('Resolution exceeds maximum size of 8192x8192');
    }

    return { width, height };
  }

  /**
   * Validate export configuration for frame sequences
   * @param {Object} config - Export configuration
   * @param {string} config.resolution - Resolution string
   * @param {number} config.fps - Frames per second
   * @param {string} config.folder - Output folder path
   * @param {boolean} config.transparentBackground - Transparency flag
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validateExportConfig(config) {
    const errors = [];

    // Validate resolution
    try {
      this.parseResolution(config.resolution);
    } catch (error) {
      errors.push(`Invalid resolution: ${error.message}`);
    }

    // Validate FPS
    if (typeof config.fps !== 'number' || config.fps <= 0) {
      errors.push('FPS must be a positive number');
    }
    if (config.fps > 120) {
      errors.push('FPS exceeds maximum of 120');
    }

    // Validate folder
    if (!config.folder || typeof config.folder !== 'string') {
      errors.push('Output folder must be specified');
    }

    // Validate transparent background flag
    if (typeof config.transparentBackground !== 'boolean') {
      errors.push('transparentBackground must be a boolean');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate model export options
   * @param {Object} options - Model export options
   * @param {string} options.format - Export format ('glb' or 'gltf')
   * @param {string} options.folder - Output folder path
   * @param {string} options.filename - Output filename (without extension)
   * @param {boolean} options.embedTextures - Whether to embed textures
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validateModelExportOptions(options) {
    const errors = [];

    // Validate format
    if (!options.format || !['glb', 'gltf'].includes(options.format)) {
      errors.push('Format must be either "glb" or "gltf"');
    }

    // Validate folder
    if (!options.folder || typeof options.folder !== 'string') {
      errors.push('Output folder must be specified');
    }

    // Validate filename
    if (!options.filename || typeof options.filename !== 'string') {
      errors.push('Filename must be specified');
    } else {
      // Check for invalid characters in filename
      const invalidChars = /[<>:"|?*]/;
      if (invalidChars.test(options.filename)) {
        errors.push('Filename contains invalid characters');
      }
    }

    // Validate embedTextures flag
    if (typeof options.embedTextures !== 'boolean') {
      errors.push('embedTextures must be a boolean');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default export configuration
   * @returns {Object} Default configuration
   */
  getDefaultFrameExportConfig() {
    return {
      resolution: '1920x1080',
      fps: 30,
      folder: null,
      transparentBackground: false
    };
  }

  /**
   * Get default model export options
   * @returns {Object} Default options
   */
  getDefaultModelExportOptions() {
    return {
      format: 'glb',
      folder: null,
      filename: 'exported_model',
      embedTextures: true
    };
  }
}
