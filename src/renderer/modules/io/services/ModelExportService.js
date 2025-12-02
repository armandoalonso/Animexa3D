/**
 * ModelExportService
 * Pure business logic for preparing models for export.
 * No UI dependencies, fully testable.
 */
export class ModelExportService {
  /**
   * Prepare model transform for export
   * Stores original transform and resets model to origin while preserving rotation
   * @param {THREE.Object3D} model - The model to prepare
   * @returns {Object} Original transform data to restore later
   */
  prepareModelForExport(model) {
    if (!model) {
      throw new Error('Model is required');
    }

    // Store original transform
    const originalTransform = {
      scale: model.scale.clone(),
      position: model.position.clone(),
      rotation: model.rotation.clone()
    };

    // Reset scale and position for export
    // Keep rotation to bake coordinate system fixes
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);

    // Update matrices to reflect changes
    model.updateMatrix();
    model.updateMatrixWorld(true);

    return originalTransform;
  }

  /**
   * Restore model transform after export
   * @param {THREE.Object3D} model - The model to restore
   * @param {Object} originalTransform - Original transform data from prepareModelForExport
   */
  restoreModelTransform(model, originalTransform) {
    if (!model || !originalTransform) {
      throw new Error('Model and original transform are required');
    }

    model.scale.copy(originalTransform.scale);
    model.position.copy(originalTransform.position);
    model.rotation.copy(originalTransform.rotation);
    
    model.updateMatrix();
    model.updateMatrixWorld(true);
  }

  /**
   * Create export options for GLTF exporter
   * @param {string} format - Export format ('glb' or 'gltf')
   * @param {Array} animations - Animation clips to include
   * @param {boolean} embedTextures - Whether to embed textures
   * @param {number} maxTextureSize - Maximum texture size
   * @returns {Object} Export options for GLTFExporter
   */
  createExportOptions(format, animations = [], embedTextures = true, maxTextureSize = 4096) {
    if (!['glb', 'gltf'].includes(format)) {
      throw new Error('Format must be "glb" or "gltf"');
    }

    return {
      binary: format === 'glb',
      animations: animations,
      embedImages: embedTextures,
      maxTextureSize: maxTextureSize
    };
  }

  /**
   * Convert export result to buffer for IPC communication
   * @param {*} exportResult - Result from GLTFExporter (ArrayBuffer or Object)
   * @param {string} format - Export format ('glb' or 'gltf')
   * @returns {Array<number>} Buffer as array of bytes
   */
  convertToBuffer(exportResult, format) {
    if (format === 'glb') {
      // GLB format - binary ArrayBuffer
      if (!(exportResult instanceof ArrayBuffer)) {
        throw new Error('GLB export result must be an ArrayBuffer');
      }
      return Array.from(new Uint8Array(exportResult));
    } else {
      // GLTF format - JSON string
      const jsonString = JSON.stringify(exportResult, null, 2);
      const encoder = new TextEncoder();
      return Array.from(encoder.encode(jsonString));
    }
  }

  /**
   * Generate full filename with extension
   * @param {string} filename - Base filename (without extension)
   * @param {string} format - Export format ('glb' or 'gltf')
   * @returns {string} Full filename with extension
   */
  generateExportFilename(filename, format) {
    if (!filename) {
      throw new Error('Filename is required');
    }
    if (!['glb', 'gltf'].includes(format)) {
      throw new Error('Format must be "glb" or "gltf"');
    }
    return `${filename}.${format}`;
  }

  /**
   * Validate export requirements
   * @param {THREE.Object3D} model - The model to export
   * @param {Array} animations - Animation clips
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validateExportRequirements(model, animations = []) {
    const errors = [];

    if (!model) {
      errors.push('No model to export');
    }

    if (!Array.isArray(animations)) {
      errors.push('Animations must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get export metadata for logging
   * @param {THREE.Object3D} model - The model being exported
   * @param {Array} animations - Animation clips being exported
   * @param {string} format - Export format
   * @param {boolean} embedTextures - Whether textures are embedded
   * @returns {Object} Export metadata
   */
  getExportMetadata(model, animations, format, embedTextures) {
    return {
      format,
      embedTextures,
      animationCount: animations.length,
      hasModel: !!model,
      modelScale: model ? model.scale.clone() : null,
      timestamp: new Date().toISOString()
    };
  }
}
