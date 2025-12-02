import * as THREE from 'three';
import { ProjectSerializationService } from './services/ProjectSerializationService.js';
import { ProjectStateService } from './services/ProjectStateService.js';
import { ProjectAssetService } from './services/ProjectAssetService.js';
import { ProjectIOService } from './services/ProjectIOService.js';
import { ProjectUIAdapter } from './adapters/ProjectUIAdapter.js';

/**
 * ProjectManager - Thin orchestrator
 * Coordinates between services and adapters
 * Minimal business logic - delegates to specialized services
 */
export class ProjectManager {
  constructor(sceneManager, modelLoader, animationManager, textureManager) {
    // Manager dependencies
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.animationManager = animationManager;
    this.textureManager = textureManager;

    // Services (pure logic)
    this.serializationService = ProjectSerializationService;
    this.stateService = ProjectStateService;
    this.assetService = ProjectAssetService;

    // I/O Service (injected dependency)
    this.ioService = new ProjectIOService(window.electronAPI);

    // UI Adapter
    this.uiAdapter = new ProjectUIAdapter();
    this.uiAdapter.initialize();
  }

  /**
   * Save the current project state to a file
   * @returns {Promise<boolean>} Success status
   */
  async saveProject() {
    try {
      // 1. Capture current state using StateService
      const state = this.stateService.captureCurrentState({
        sceneManager: this.sceneManager,
        modelLoader: this.modelLoader,
        animationManager: this.animationManager,
        textureManager: this.textureManager
      });

      // 2. Serialize project data using SerializationService
      const projectData = this.serializationService.serializeProject(
        state.model,
        state.animations,
        state.materials,
        state.scene
      );

      // 3. Collect texture files using AssetService
      const textureFiles = this.assetService.collectTextureFiles(state.materials);

      // 4. Show save dialog via IOService
      const savePath = await this.ioService.showSaveDialog();
      
      if (!savePath) {
        return false; // User cancelled
      }

      // 5. Save project via IOService
      await this.ioService.saveProjectToFile(savePath, projectData, textureFiles);

      // 6. Update UI via UIAdapter
      this.uiAdapter.showSaveSuccess(savePath);
      
      return true;
      
    } catch (error) {
      console.error('Error saving project:', error);
      this.uiAdapter.showSaveError(error);
      throw error;
    }
  }

  /**
   * Load a project from a file
   * @returns {Promise<boolean>} Success status
   */
  async loadProject(projectPath = null) {
    try {
      // 1. Show open dialog if no path provided
      if (!projectPath) {
        projectPath = await this.ioService.showOpenDialog();
        
        if (!projectPath) {
          return false; // User cancelled
        }
      }

      // 2. Show loading UI
      this.uiAdapter.showLoadingOverlay();
      this.uiAdapter.hideEmptyState();

      // 3. Load and unzip project data via IOService
      const { projectData, extractedPath } = await this.ioService.loadProjectFromFile(projectPath);
      
      // 4. Validate project data
      this.serializationService.validateProjectData(projectData);

      // 5. Deserialize project data
      const deserializedData = this.serializationService.deserializeProject(projectData);

      // 6. Load the model
      const loadedModelData = await this._loadProjectModel(deserializedData, extractedPath);

      // 7. Restore state using StateService
      await this.stateService.restoreState(
        {
          model: {
            data: deserializedData.model,
            loadedModelData: loadedModelData
          },
          animations: deserializedData.animations,
          materials: deserializedData.materials,
          scene: deserializedData.scene
        },
        {
          sceneManager: this.sceneManager,
          modelLoader: this.modelLoader,
          animationManager: this.animationManager,
          textureManager: this.textureManager
        }
      );

      // 8. Restore materials/textures with extracted path
      await this._loadProjectTextures(deserializedData, extractedPath);

      // 9. Update UI controls
      this.uiAdapter.updateSceneControls(deserializedData.scene);

      // 10. Hide loading and enable UI
      this.uiAdapter.hideLoadingOverlay();
      this.uiAdapter.enableProjectButtons();
      this.uiAdapter.showLoadSuccess();

      return true;

    } catch (error) {
      console.error('Error loading project:', error);
      this.uiAdapter.hideLoadingOverlay();
      this.uiAdapter.showLoadError(error);
      return false;
    }
  }
  
  /**
   * Load project model (helper method)
   * @private
   */
  async _loadProjectModel(projectData, extractedPath) {
    if (!projectData.model || !projectData.model.fileName) {
      throw new Error('No model data in project');
    }
    
    const modelPath = `${extractedPath}/${projectData.model.fileName}`;
    const modelBuffer = await this.ioService.readFileAsBuffer(modelPath);
    const extension = projectData.model.extension;
    
    // Load model data but don't add to scene yet
    let modelData;
    if (extension === 'glb' || extension === 'gltf') {
      modelData = await this.modelLoader.loadGLTF(modelBuffer);
    } else if (extension === 'fbx') {
      modelData = await this.modelLoader.loadFBX(modelBuffer);
    } else {
      throw new Error(`Unsupported file format: ${extension}`);
    }
    
    modelData.filename = projectData.model.fileName;
    modelData.name = projectData.model.fileName;
    modelData.bufferData = modelBuffer;
    
    return modelData;
  }
  
  /**
   * Load project textures (helper method)
   * @private
   */
  async _loadProjectTextures(projectData, extractedPath) {
    if (projectData.materials && projectData.materials.length > 0) {
      // Extract materials from loaded model
      const materials = this.textureManager.extractMaterials(this.modelLoader.getCurrentModelData().model);
      
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
  }

  /**
   * Get current project state for quick save
   * @returns {Object} Project state summary
   */
  getProjectState() {
    try {
      const state = this.stateService.captureCurrentState({
        sceneManager: this.sceneManager,
        modelLoader: this.modelLoader,
        animationManager: this.animationManager,
        textureManager: this.textureManager
      });

      return this.stateService.getProjectMetadata(state);
    } catch (error) {
      return null;
    }
  }
}
