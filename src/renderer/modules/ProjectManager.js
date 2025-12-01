export class ProjectManager {
  constructor(sceneManager, modelLoader, animationManager, textureManager) {
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.animationManager = animationManager;
    this.textureManager = textureManager;
  }

  /**
   * Save the current project state to a file
   * @returns {Promise<boolean>} Success status
   */
  async saveProject() {
    try {
      const currentModel = this.modelLoader.getCurrentModelData();
      
      if (!currentModel) {
        throw new Error('No model loaded to save');
      }

      // Gather all project data
      const projectData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        
        // Model information
        model: {
          name: currentModel.name,
          path: currentModel.path || null,
          extension: currentModel.name.split('.').pop(),
          bufferData: currentModel.bufferData ? Array.from(new Uint8Array(currentModel.bufferData)) : null
        },
        
        // Animations (including added animations)
        animations: this.animationManager.getAnimations().map(clip => ({
          name: clip.name,
          duration: clip.duration,
          // Animation data will be serialized on save
        })),
        
        // Textures and materials
        materials: this.textureManager.getMaterials().map(material => ({
          uuid: material.uuid,
          name: material.name,
          textures: Object.entries(material.textures).map(([key, textureData]) => ({
            key: key,
            label: textureData.label,
            source: textureData.source,
            path: textureData.extractedPath || textureData.source
          }))
        })),
        
        // Scene settings
        scene: {
          backgroundColor: '#' + this.sceneManager.scene.background.getHexString(),
          gridVisible: this.sceneManager.gridVisible,
          
          // Camera
          camera: {
            position: {
              x: this.sceneManager.camera.position.x,
              y: this.sceneManager.camera.position.y,
              z: this.sceneManager.camera.position.z
            },
            target: {
              x: this.sceneManager.controls.target.x,
              y: this.sceneManager.controls.target.y,
              z: this.sceneManager.controls.target.z
            }
          },
          
          // Lighting
          lighting: {
            ambientIntensity: this.sceneManager.ambientLight.intensity,
            directionalIntensity: this.sceneManager.directionalLight.intensity,
            directionalPosition: {
              x: this.sceneManager.directionalLight.position.x,
              y: this.sceneManager.directionalLight.position.y,
              z: this.sceneManager.directionalLight.position.z
            }
          }
        }
      };

      // Show save dialog
      const savePath = await window.electronAPI.saveProjectDialog();
      
      if (!savePath) {
        return false; // User cancelled
      }

      // Collect texture file paths
      const textureFiles = [];
      for (const material of this.textureManager.getMaterials()) {
        for (const [key, textureData] of Object.entries(material.textures)) {
          const texturePath = textureData.extractedPath || textureData.source;
          if (texturePath && typeof texturePath === 'string' && texturePath !== 'Embedded Texture') {
            textureFiles.push({
              sourcePath: texturePath,
              materialUuid: material.uuid,
              textureKey: key
            });
          }
        }
      }

      // Send to main process for zipping
      const result = await window.electronAPI.saveProject(savePath, projectData, textureFiles);
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error || 'Failed to load project');
      }
      
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    } finally {
      // Hide loading overlay after everything is done
      loadingOverlay.classList.remove('active');
    }
  }

  /**
   * Load a project from a file
   * @returns {Promise<boolean>} Success status
   */
  async loadProject() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
      // Show open dialog
      const openPath = await window.electronAPI.openProjectDialog();
      
      if (!openPath) {
        return false; // User cancelled
      }

      // Show loading overlay
      loadingOverlay.classList.add('active');

      // Load and unzip project data from main process
      const result = await window.electronAPI.loadProject(openPath);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load project');
      }

      const projectData = result.data;
      const extractedPath = result.extractedPath;

      // 1. Load the model
      if (projectData.model && projectData.model.fileName) {
        const modelPath = `${extractedPath}/${projectData.model.fileName}`;
        const modelBuffer = await window.electronAPI.readFileAsBuffer(modelPath);
        const extension = projectData.model.extension;
        
        const modelData = await this.modelLoader.loadFromBuffer(
          modelBuffer,
          extension,
          projectData.model.fileName
        );

        // 2. Load animations
        if (projectData.animations && projectData.animations.length > 0) {
          // The animations are already part of the model data, but we might have added animations
          // For now, we'll use the model's animations
          this.animationManager.loadAnimations(modelData.animations || []);
        } else {
          this.animationManager.loadAnimations([]);
        }

        // 3. Load textures
        if (projectData.materials && projectData.materials.length > 0) {
          // Extract materials from loaded model
          const materials = this.textureManager.extractMaterials(modelData.model);
          
          // Apply saved textures
          for (const savedMaterial of projectData.materials) {
            for (const savedTexture of savedMaterial.textures) {
              if (savedTexture.fileName) {
                // Find the corresponding material in the loaded model
                const material = materials.find(m => m.name === savedMaterial.name);
                
                if (material) {
                  try {
                    // Load the texture from the extracted path
                    const texturePath = `${extractedPath}/textures/${savedTexture.fileName}`;
                    await this.textureManager.updateTexture(
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

        // 4. Restore scene settings
        if (projectData.scene) {
          // Background color
          if (projectData.scene.backgroundColor) {
            this.sceneManager.setBackgroundColor(projectData.scene.backgroundColor);
            document.getElementById('bg-color').value = projectData.scene.backgroundColor;
          }
          
          // Grid visibility
          if (typeof projectData.scene.gridVisible !== 'undefined') {
            this.sceneManager.toggleGrid(projectData.scene.gridVisible);
            document.getElementById('grid-toggle').checked = projectData.scene.gridVisible;
          }
          
          // Camera
          if (projectData.scene.camera) {
            const cam = projectData.scene.camera;
            this.sceneManager.camera.position.set(cam.position.x, cam.position.y, cam.position.z);
            this.sceneManager.controls.target.set(cam.target.x, cam.target.y, cam.target.z);
            this.sceneManager.controls.update();
          }
          
          // Lighting
          if (projectData.scene.lighting) {
            const lighting = projectData.scene.lighting;
            
            // Ambient light
            this.sceneManager.updateAmbientLightIntensity(lighting.ambientIntensity);
            document.getElementById('amb-light-intensity').value = lighting.ambientIntensity;
            document.getElementById('amb-light-value').textContent = lighting.ambientIntensity;
            
            // Directional light
            this.sceneManager.updateDirectionalLightIntensity(lighting.directionalIntensity);
            document.getElementById('dir-light-intensity').value = lighting.directionalIntensity;
            document.getElementById('dir-light-value').textContent = lighting.directionalIntensity;
            
            // Directional light position
            const pos = lighting.directionalPosition;
            this.sceneManager.updateLightPosition(pos.x, pos.y, pos.z);
            document.getElementById('light-x').value = pos.x;
            document.getElementById('light-y').value = pos.y;
            document.getElementById('light-z').value = pos.z;
            document.getElementById('light-x-value').textContent = pos.x;
            document.getElementById('light-y-value').textContent = pos.y;
            document.getElementById('light-z-value').textContent = pos.z;
          }
        }

        return true;
      } else {
        throw new Error('Invalid project file: missing model data');
      }
      
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  }

  /**
   * Get current project state for quick save
   * @returns {Object} Project state
   */
  getProjectState() {
    const currentModel = this.modelLoader.getCurrentModelData();
    
    if (!currentModel) {
      return null;
    }

    return {
      hasModel: true,
      modelName: currentModel.name,
      animationCount: this.animationManager.getAnimations().length,
      materialCount: this.textureManager.getMaterials().length
    };
  }
}
