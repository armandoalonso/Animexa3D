/**
 * ProjectAssetService
 * Service for collecting and preparing project assets
 * No UI dependencies - fully testable
 */
export class ProjectAssetService {
  /**
   * Collect texture files from materials
   * @param {Array} materials - Material objects with texture data
   * @returns {Array} Array of texture file objects
   */
  static collectTextureFiles(materials) {
    if (!Array.isArray(materials)) {
      return [];
    }

    const textureFiles = [];

    for (const material of materials) {
      if (!material.textures) {
        continue;
      }

      for (const [key, textureData] of Object.entries(material.textures)) {
        const texturePath = textureData.extractedPath || textureData.source;

        // Only collect valid file paths (not embedded textures)
        if (this._isValidTexturePath(texturePath)) {
          textureFiles.push({
            sourcePath: texturePath,
            materialUuid: material.uuid,
            textureKey: key,
            label: textureData.label,
            materialName: material.name
          });
        }
      }
    }

    return textureFiles;
  }

  /**
   * Prepare model data for export/save
   * @param {Object} modelData - Current model data
   * @param {Object} modelObject - Three.js model object
   * @returns {Object} Prepared model data
   */
  static prepareModelData(modelData, modelObject) {
    if (!modelData) {
      throw new Error('Model data is required');
    }

    if (!modelObject) {
      throw new Error('Model object is required');
    }

    return {
      name: modelData.name,
      path: modelData.path || null,
      extension: this._getFileExtension(modelData.name),
      bufferData: modelData.bufferData,
      position: {
        x: modelObject.position.x || 0,
        y: modelObject.position.y || 0,
        z: modelObject.position.z || 0
      },
      rotation: {
        x: modelObject.rotation.x || 0,
        y: modelObject.rotation.y || 0,
        z: modelObject.rotation.z || 0
      },
      scale: {
        x: modelObject.scale.x || 1,
        y: modelObject.scale.y || 1,
        z: modelObject.scale.z || 1
      }
    };
  }

  /**
   * Collect animation data from clips
   * @param {Array} animationClips - Animation clips
   * @returns {Array} Prepared animation data
   */
  static collectAnimationData(animationClips) {
    if (!Array.isArray(animationClips)) {
      return [];
    }

    return animationClips.map(clip => ({
      name: clip.name,
      duration: clip.duration,
      trackCount: clip.tracks ? clip.tracks.length : 0,
      tracks: clip.tracks ? clip.tracks.map(track => ({
        name: track.name,
        type: track.constructor.name,
        valueSize: track.getValueSize(),
        timesLength: track.times.length,
        valuesLength: track.values.length
      })) : []
    }));
  }

  /**
   * Calculate total asset size (for progress indicators)
   * @param {Object} modelData - Model data
   * @param {Array} textureFiles - Texture file paths
   * @returns {number} Estimated size in bytes
   */
  static calculateTotalAssetSize(modelData, textureFiles) {
    let totalSize = 0;

    // Add model buffer size
    if (modelData && modelData.bufferData) {
      totalSize += modelData.bufferData.byteLength || modelData.bufferData.length;
    }

    // Estimate texture sizes (actual size would need file system access)
    totalSize += textureFiles.length * 1024 * 1024; // Estimate 1MB per texture

    return totalSize;
  }

  /**
   * Validate that all required assets are available
   * @param {Object} modelData - Model data
   * @param {Array} animations - Animation clips
   * @param {Array} materials - Material data
   * @returns {Object} Validation result
   */
  static validateAssets(modelData, animations, materials) {
    const errors = [];
    const warnings = [];

    // Check model
    if (!modelData) {
      errors.push('No model data available');
    } else {
      if (!modelData.name) {
        errors.push('Model name is missing');
      }
      if (!modelData.bufferData) {
        warnings.push('Model buffer data is missing - may not be saveable');
      }
    }

    // Check animations
    if (animations && animations.length > 0) {
      animations.forEach((clip, index) => {
        if (!clip.name) {
          warnings.push(`Animation at index ${index} has no name`);
        }
        if (!clip.tracks || clip.tracks.length === 0) {
          warnings.push(`Animation "${clip.name}" has no tracks`);
        }
      });
    }

    // Check materials and textures
    if (materials && materials.length > 0) {
      materials.forEach(material => {
        if (!material.uuid) {
          warnings.push(`Material "${material.name}" has no UUID`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      hasWarnings: warnings.length > 0
    };
  }

  /**
   * Get asset summary for display
   * @param {Object} modelData - Model data
   * @param {Array} animations - Animation clips
   * @param {Array} materials - Material data
   * @returns {Object} Asset summary
   */
  static getAssetSummary(modelData, animations, materials) {
    const textureFiles = this.collectTextureFiles(materials);

    return {
      modelName: modelData ? modelData.name : 'Unknown',
      modelExtension: modelData ? this._getFileExtension(modelData.name) : 'unknown',
      animationCount: animations ? animations.length : 0,
      materialCount: materials ? materials.length : 0,
      textureCount: textureFiles.length,
      hasModel: !!modelData,
      hasAnimations: animations && animations.length > 0,
      hasTextures: textureFiles.length > 0
    };
  }

  /**
   * Check if texture path is valid (not embedded)
   * @private
   */
  static _isValidTexturePath(path) {
    if (!path) return false;
    if (typeof path !== 'string') return false;
    if (path === 'Embedded Texture') return false;
    if (path.startsWith('data:')) return false; // Data URLs
    if (path.startsWith('blob:')) return false; // Blob URLs
    return true;
  }

  /**
   * Get file extension from filename
   * @private
   */
  static _getFileExtension(filename) {
    if (!filename || typeof filename !== 'string') {
      return '';
    }
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  /**
   * Filter materials that have textures
   * @param {Array} materials - Material objects
   * @returns {Array} Materials with textures
   */
  static filterMaterialsWithTextures(materials) {
    if (!Array.isArray(materials)) {
      return [];
    }

    return materials.filter(material => {
      if (!material.textures) return false;
      
      const textureEntries = Object.entries(material.textures);
      return textureEntries.some(([_, textureData]) => {
        const texturePath = textureData.extractedPath || textureData.source;
        return this._isValidTexturePath(texturePath);
      });
    });
  }

  /**
   * Create texture manifest for project
   * @param {Array} textureFiles - Collected texture files
   * @returns {Object} Texture manifest
   */
  static createTextureManifest(textureFiles) {
    const manifest = {
      count: textureFiles.length,
      byMaterial: {},
      byType: {}
    };

    for (const textureFile of textureFiles) {
      // Group by material
      if (!manifest.byMaterial[textureFile.materialUuid]) {
        manifest.byMaterial[textureFile.materialUuid] = {
          materialName: textureFile.materialName,
          textures: []
        };
      }
      manifest.byMaterial[textureFile.materialUuid].textures.push({
        key: textureFile.textureKey,
        label: textureFile.label,
        path: textureFile.sourcePath
      });

      // Group by texture type
      if (!manifest.byType[textureFile.textureKey]) {
        manifest.byType[textureFile.textureKey] = [];
      }
      manifest.byType[textureFile.textureKey].push({
        materialName: textureFile.materialName,
        path: textureFile.sourcePath
      });
    }

    return manifest;
  }
}
