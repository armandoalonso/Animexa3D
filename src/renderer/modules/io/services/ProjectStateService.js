import * as THREE from 'three';

/**
 * ProjectStateService
 * Service for capturing and restoring application state
 * No UI dependencies - fully testable
 */
export class ProjectStateService {
  /**
   * Capture current state from all managers
   * @param {Object} managers - Object containing all manager instances
   * @returns {Object} Captured state
   */
  static captureCurrentState(managers) {
    const { sceneManager, modelLoader, animationManager, textureManager } = managers;

    if (!sceneManager || !modelLoader || !animationManager || !textureManager) {
      throw new Error('All managers are required to capture state');
    }

    const currentModel = modelLoader.getCurrentModelData();
    const currentModelObject = sceneManager.getModel();

    if (!currentModel) {
      throw new Error('No model loaded to capture state');
    }

    return {
      model: {
        data: currentModel,
        object: currentModelObject
      },
      animations: animationManager.getAnimations(),
      materials: textureManager.getMaterials(),
      scene: this._captureSceneState(sceneManager)
    };
  }

  /**
   * Capture scene-specific state
   * @private
   */
  static _captureSceneState(sceneManager) {
    return {
      backgroundColor: '#' + sceneManager.scene.background.getHexString(),
      gridVisible: sceneManager.gridVisible,
      camera: {
        position: {
          x: sceneManager.camera.position.x,
          y: sceneManager.camera.position.y,
          z: sceneManager.camera.position.z
        },
        target: {
          x: sceneManager.controls.target.x,
          y: sceneManager.controls.target.y,
          z: sceneManager.controls.target.z
        }
      },
      lighting: {
        ambientIntensity: sceneManager.ambientLight.intensity,
        directionalIntensity: sceneManager.directionalLight.intensity,
        directionalPosition: {
          x: sceneManager.directionalLight.position.x,
          y: sceneManager.directionalLight.position.y,
          z: sceneManager.directionalLight.position.z
        }
      }
    };
  }

  /**
   * Restore state to managers
   * @param {Object} state - State to restore
   * @param {Object} managers - Manager instances
   * @returns {Promise<void>}
   */
  static async restoreState(state, managers) {
    const { sceneManager, modelLoader, animationManager, textureManager } = managers;

    if (!sceneManager || !modelLoader || !animationManager || !textureManager) {
      throw new Error('All managers are required to restore state');
    }

    this.validateProjectState(state);

    // Restore model
    await this._restoreModel(state.model, sceneManager, modelLoader);

    // Restore animations
    await this._restoreAnimations(state.animations, animationManager);

    // Restore materials and textures
    await this._restoreMaterials(state.materials, textureManager, modelLoader);

    // Restore scene settings
    await this._restoreSceneSettings(state.scene, sceneManager);
  }

  /**
   * Restore model state
   * @private
   */
  static async _restoreModel(modelState, sceneManager, modelLoader) {
    const { data, loadedModelData } = modelState;

    // Apply saved rotation BEFORE adding to scene
    if (data.rotation) {
      loadedModelData.model.rotation.set(
        data.rotation.x || 0,
        data.rotation.y || 0,
        data.rotation.z || 0
      );
    }

    // Apply saved position BEFORE adding to scene
    if (data.position) {
      loadedModelData.model.position.set(
        data.position.x || 0,
        data.position.y || 0,
        data.position.z || 0
      );
    }

    // Add model to scene with preservation flags
    sceneManager.addModel(loadedModelData.model, {
      preserveRotation: true,
      preservePosition: true
    });

    // Create animation mixer if animations exist
    if (loadedModelData.animations && loadedModelData.animations.length > 0) {
      sceneManager.createMixer(loadedModelData.model);
    }

    // Update model info UI (this could be moved to adapter if needed)
    const polyCount = modelLoader.countPolygons(loadedModelData.model);
    const boneCount = modelLoader.countBones(loadedModelData.model);
    modelLoader.updateModelInfo(
      data.name || data.fileName,
      polyCount,
      loadedModelData.animations.length,
      boneCount
    );

    // Store as current model data
    modelLoader.currentModelData = loadedModelData;
  }

  /**
   * Restore animations state
   * @private
   */
  static async _restoreAnimations(animations, animationManager) {
    if (!animations || animations.length === 0) {
      animationManager.loadAnimations([]);
      return;
    }

    // Restore animations from saved project data
    const restoredAnimations = animations.map(savedClip => {
      const tracks = savedClip.tracks.map(savedTrack => {
        const times = new Float32Array(savedTrack.times);
        const values = new Float32Array(savedTrack.values);

        // Reconstruct the appropriate track type
        let TrackConstructor;
        switch (savedTrack.type) {
          case 'VectorKeyframeTrack':
            TrackConstructor = THREE.VectorKeyframeTrack;
            break;
          case 'QuaternionKeyframeTrack':
            TrackConstructor = THREE.QuaternionKeyframeTrack;
            break;
          case 'NumberKeyframeTrack':
            TrackConstructor = THREE.NumberKeyframeTrack;
            break;
          case 'ColorKeyframeTrack':
            TrackConstructor = THREE.ColorKeyframeTrack;
            break;
          case 'BooleanKeyframeTrack':
            TrackConstructor = THREE.BooleanKeyframeTrack;
            break;
          case 'StringKeyframeTrack':
            TrackConstructor = THREE.StringKeyframeTrack;
            break;
          default:
            TrackConstructor = THREE.KeyframeTrack;
        }

        return new TrackConstructor(savedTrack.name, times, values);
      });

      return new THREE.AnimationClip(savedClip.name, savedClip.duration, tracks);
    });

    animationManager.loadAnimations(restoredAnimations);
  }

  /**
   * Restore materials and textures
   * @private
   */
  static async _restoreMaterials(savedMaterials, textureManager, modelLoader, extractedPath) {
    if (!savedMaterials || savedMaterials.length === 0) {
      return;
    }

    // Extract materials from loaded model
    const materials = textureManager.extractMaterials(modelLoader.getCurrentModelData().model);

    // Apply saved textures
    for (const savedMaterial of savedMaterials) {
      for (const savedTexture of savedMaterial.textures) {
        if (savedTexture.fileName) {
          // Find the corresponding material in the loaded model
          const material = materials.find(m => m.name === savedMaterial.name);

          if (material) {
            try {
              // Load the texture from the extracted path
              const texturePath = `${extractedPath}/textures/${savedTexture.fileName}`;
              await textureManager.updateTexture(
                material.uuid,
                savedTexture.key,
                texturePath
              );
            } catch (error) {
              console.warn(`Failed to load texture ${savedTexture.fileName}:`, error);
            }
          }
        }
      }
    }

    // Wait for textures to be fully applied and rendered
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Restore scene settings
   * @private
   */
  static async _restoreSceneSettings(sceneSettings, sceneManager) {
    if (!sceneSettings) return;

    // Background color
    if (sceneSettings.backgroundColor) {
      sceneManager.setBackgroundColor(sceneSettings.backgroundColor);
    }

    // Grid visibility
    if (typeof sceneSettings.gridVisible !== 'undefined') {
      sceneManager.toggleGrid(sceneSettings.gridVisible);
    }

    // Camera
    if (sceneSettings.camera) {
      const cam = sceneSettings.camera;
      sceneManager.camera.position.set(cam.position.x, cam.position.y, cam.position.z);
      sceneManager.controls.target.set(cam.target.x, cam.target.y, cam.target.z);
      sceneManager.controls.update();
    }

    // Lighting
    if (sceneSettings.lighting) {
      const lighting = sceneSettings.lighting;

      // Ambient light
      sceneManager.updateAmbientLightIntensity(lighting.ambientIntensity);

      // Directional light
      sceneManager.updateDirectionalLightIntensity(lighting.directionalIntensity);

      // Directional light position
      const pos = lighting.directionalPosition;
      sceneManager.updateLightPosition(pos.x, pos.y, pos.z);
    }
  }

  /**
   * Validate project state
   * @param {Object} state - State to validate
   * @throws {Error} If validation fails
   */
  static validateProjectState(state) {
    if (!state) {
      throw new Error('Project state is required');
    }

    if (!state.model) {
      throw new Error('Model state is required');
    }

    if (!state.scene) {
      throw new Error('Scene state is required');
    }

    // Validate model structure
    if (!state.model.data && !state.model.loadedModelData) {
      throw new Error('Model data is missing');
    }

    return true;
  }

  /**
   * Get project metadata summary
   * @param {Object} state - Current state
   * @returns {Object} Metadata
   */
  static getProjectMetadata(state) {
    if (!state || !state.model) {
      return null;
    }

    const modelData = state.model.data;

    return {
      hasModel: true,
      modelName: modelData.name,
      animationCount: state.animations ? state.animations.length : 0,
      materialCount: state.materials ? state.materials.length : 0,
      sceneConfigured: !!state.scene
    };
  }

  /**
   * Check if state is valid for saving
   * @param {Object} state - State to check
   * @returns {boolean} True if valid
   */
  static canSaveState(state) {
    try {
      this.validateProjectState(state);
      return state.model && state.model.data;
    } catch (error) {
      return false;
    }
  }
}
