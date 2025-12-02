/**
 * ProjectSerializationService
 * Pure logic service for serializing and deserializing project data
 * No UI dependencies - fully testable
 */
export class ProjectSerializationService {
  /**
   * Get the current project version
   * @returns {string} Version string
   */
  static getProjectVersion() {
    return '1.0.0';
  }

  /**
   * Serialize project data into a saveable format
   * @param {Object} model - Model data and object
   * @param {Array} animations - Animation clips
   * @param {Array} materials - Material data with textures
   * @param {Object} scene - Scene settings (camera, lighting, etc.)
   * @returns {Object} Serialized project data
   */
  static serializeProject(model, animations, materials, scene) {
    if (!model || !model.object) {
      throw new Error('Model object is required for serialization');
    }

    const projectData = {
      version: this.getProjectVersion(),
      timestamp: new Date().toISOString(),
      model: this._serializeModel(model),
      animations: this._serializeAnimations(animations),
      materials: this._serializeMaterials(materials),
      scene: this._serializeScene(scene)
    };

    return projectData;
  }

  /**
   * Serialize model data
   * @private
   */
  static _serializeModel(model) {
    if (!model.data || !model.object) {
      throw new Error('Invalid model structure');
    }

    return {
      name: model.data.name,
      fileName: model.data.name, // For backward compatibility
      path: model.data.path || null,
      extension: model.data.name.split('.').pop().toLowerCase(),
      bufferData: model.data.bufferData ? Array.from(new Uint8Array(model.data.bufferData)) : null,
      position: {
        x: model.object.position.x || 0,
        y: model.object.position.y || 0,
        z: model.object.position.z || 0
      },
      rotation: {
        x: model.object.rotation.x || 0,
        y: model.object.rotation.y || 0,
        z: model.object.rotation.z || 0
      }
    };
  }

  /**
   * Serialize animations
   * @private
   */
  static _serializeAnimations(animations) {
    if (!Array.isArray(animations)) {
      return [];
    }

    return animations.map(clip => ({
      name: clip.name,
      duration: clip.duration,
      tracks: clip.tracks.map(track => ({
        name: track.name,
        times: Array.from(track.times),
        values: Array.from(track.values),
        type: track.constructor.name // VectorKeyframeTrack, QuaternionKeyframeTrack, etc.
      }))
    }));
  }

  /**
   * Serialize materials with textures
   * @private
   */
  static _serializeMaterials(materials) {
    if (!Array.isArray(materials)) {
      return [];
    }

    return materials.map(material => ({
      uuid: material.uuid,
      name: material.name,
      textures: Object.entries(material.textures || {}).map(([key, textureData]) => ({
        key: key,
        label: textureData.label,
        source: textureData.source,
        path: textureData.extractedPath || textureData.source,
        fileName: textureData.fileName || null
      }))
    }));
  }

  /**
   * Serialize scene settings
   * @private
   */
  static _serializeScene(scene) {
    if (!scene) {
      throw new Error('Scene settings are required');
    }

    return {
      backgroundColor: scene.backgroundColor,
      gridVisible: scene.gridVisible,
      camera: {
        position: {
          x: scene.camera.position.x,
          y: scene.camera.position.y,
          z: scene.camera.position.z
        },
        target: {
          x: scene.camera.target.x,
          y: scene.camera.target.y,
          z: scene.camera.target.z
        }
      },
      lighting: {
        ambientIntensity: scene.lighting.ambientIntensity,
        directionalIntensity: scene.lighting.directionalIntensity,
        directionalPosition: {
          x: scene.lighting.directionalPosition.x,
          y: scene.lighting.directionalPosition.y,
          z: scene.lighting.directionalPosition.z
        }
      }
    };
  }

  /**
   * Deserialize project data
   * @param {Object} data - Raw project data
   * @returns {Object} Validated and structured project data
   */
  static deserializeProject(data) {
    this.validateProjectData(data);

    return {
      version: data.version,
      timestamp: data.timestamp,
      model: data.model,
      animations: data.animations || [],
      materials: data.materials || [],
      scene: data.scene || this._getDefaultSceneSettings()
    };
  }

  /**
   * Validate project data structure
   * @param {Object} data - Project data to validate
   * @throws {Error} If validation fails
   */
  static validateProjectData(data) {
    if (!data) {
      throw new Error('Project data is required');
    }

    if (!data.version) {
      throw new Error('Project version is missing');
    }

    if (!data.model) {
      throw new Error('Model data is required');
    }

    if (!data.model.name && !data.model.fileName) {
      throw new Error('Model name/fileName is required');
    }

    if (!data.model.extension) {
      throw new Error('Model extension is required');
    }

    const supportedExtensions = ['glb', 'gltf', 'fbx'];
    if (!supportedExtensions.includes(data.model.extension.toLowerCase())) {
      throw new Error(`Unsupported model format: ${data.model.extension}`);
    }

    // Validate animations structure
    if (data.animations && !Array.isArray(data.animations)) {
      throw new Error('Animations must be an array');
    }

    // Validate materials structure
    if (data.materials && !Array.isArray(data.materials)) {
      throw new Error('Materials must be an array');
    }

    return true;
  }

  /**
   * Get default scene settings
   * @private
   */
  static _getDefaultSceneSettings() {
    return {
      backgroundColor: '#1a1a1a',
      gridVisible: true,
      camera: {
        position: { x: 0, y: 2, z: 5 },
        target: { x: 0, y: 0, z: 0 }
      },
      lighting: {
        ambientIntensity: 0.5,
        directionalIntensity: 0.8,
        directionalPosition: { x: 5, y: 10, z: 7.5 }
      }
    };
  }

  /**
   * Check if project data is compatible with current version
   * @param {Object} data - Project data
   * @returns {boolean} True if compatible
   */
  static isCompatibleVersion(data) {
    if (!data || !data.version) {
      return false;
    }

    // For now, we only have version 1.0.0
    // In the future, add version comparison logic
    return data.version === '1.0.0';
  }

  /**
   * Get project metadata summary
   * @param {Object} projectData - Deserialized project data
   * @returns {Object} Metadata summary
   */
  static getProjectMetadata(projectData) {
    return {
      version: projectData.version,
      timestamp: projectData.timestamp,
      modelName: projectData.model.name || projectData.model.fileName,
      modelFormat: projectData.model.extension,
      animationCount: projectData.animations ? projectData.animations.length : 0,
      materialCount: projectData.materials ? projectData.materials.length : 0,
      hasTextures: projectData.materials ? projectData.materials.some(m => m.textures && m.textures.length > 0) : false
    };
  }
}
