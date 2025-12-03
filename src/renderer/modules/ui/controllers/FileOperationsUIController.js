/**
 * FileOperationsUIController
 * 
 * Handles UI interactions for file operations including:
 * - Opening models
 * - Saving projects
 * - Loading projects
 * - Creating new projects
 * 
 * This controller is a thin adapter layer between UI events and
 * the underlying managers (ModelLoader, ProjectManager, etc.).
 */

export class FileOperationsUIController {
  constructor(dependencies) {
    const {
      modelLoader,
      projectManager,
      animationManager,
      textureManager,
      sceneManager,
      notificationService,
      displayTextures,
      clearTextureDisplay
    } = dependencies;

    this.modelLoader = modelLoader;
    this.projectManager = projectManager;
    this.animationManager = animationManager;
    this.textureManager = textureManager;
    this.sceneManager = sceneManager;
    this.notificationService = notificationService;
    this.displayTextures = displayTextures;
    this.clearTextureDisplay = clearTextureDisplay;
  }

  /**
   * Initialize event listeners for file operations
   */
  initEventListeners() {
    document.getElementById('btn-new-project').addEventListener('click', () => this.handleNewProject());
    document.getElementById('btn-open-model').addEventListener('click', () => this.handleOpenModel());
    document.getElementById('btn-save-project').addEventListener('click', () => this.handleSaveProject());
    document.getElementById('btn-load-project').addEventListener('click', () => this.handleLoadProject());
  }

  /**
   * Handle saving the current project
   */
  async handleSaveProject() {
    try {
      await this.projectManager.saveProject();
      this.notificationService.showNotification('Project saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving project:', error);
      this.notificationService.showNotification(`Failed to save project: ${error.message}`, 'error');
    }
  }

  /**
   * Handle loading a project from file
   */
  async handleLoadProject() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
      const success = await this.projectManager.loadProject();
      
      if (success) {
        // Refresh UI displays
        await this.displayTextures();
        
        // Wait for render cycle to complete
        await new Promise(resolve => requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 300);
          });
        }));
        
        // Enable relevant buttons
        this.enableProjectButtons();
        
        this.notificationService.showNotification('Project loaded successfully!', 'success');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      this.notificationService.showNotification(`Failed to load project: ${error.message}`, 'error');
    } finally {
      // Hide loading overlay after all UI updates are complete
      loadingOverlay.classList.remove('active');
    }
  }

  /**
   * Handle opening a model file
   */
  async handleOpenModel() {
    console.log('handleOpenModel called');
    try {
      const fileData = await window.electronAPI.openModelDialog();
      console.log('File data received:', fileData);
      
      if (!fileData) return; // User cancelled
      
      const arrayBuffer = new Uint8Array(fileData.data).buffer;
      console.log('About to load model from buffer');
      const modelData = await this.modelLoader.loadFromBuffer(
        arrayBuffer,
        fileData.extension.replace('.', ''),
        fileData.name
      );
      
      console.log('Model loaded, modelData exists:', !!modelData);
      
      // Store the file path for saving
      if (modelData) {
        modelData.path = fileData.path;
      }
      
      console.log('Model loaded successfully:', modelData);
      
      // Load animations
      if (modelData.animations && modelData.animations.length > 0) {
        console.log('Loading animations:', modelData.animations.length);
        this.animationManager.loadAnimations(modelData.animations);
      } else {
        console.log('No animations, loading empty array');
        this.animationManager.loadAnimations([]);
        this.notificationService.showNotification('Model has no animations', 'warning');
      }

      console.log('About to extract materials');
      // Extract and display textures
      const materials = this.textureManager.extractMaterials(modelData.model);
      console.log('Extracted materials:', materials.length);
      
      // Log material and texture details
      materials.forEach((mat, idx) => {
        console.log(`Material ${idx + 1}: ${mat.name}`);
        const textureKeys = Object.keys(mat.textures);
        if (textureKeys.length > 0) {
          console.log(`  Textures found: ${textureKeys.join(', ')}`);
        } else {
          console.log('  No textures');
        }
      });
      
      // Extract embedded textures and display (non-blocking)
      if (materials.length > 0) {
        this.textureManager.extractEmbeddedTextures(materials).then(() => {
          this.displayTextures();
        }).catch(error => {
          console.error('Error extracting textures:', error);
          this.displayTextures(); // Display anyway
        });
      } else {
        this.clearTextureDisplay();
      }
      
      // Enable buttons after model is loaded
      this.enableProjectButtons();
      
    } catch (error) {
      console.error('Error opening model:', error);
      this.notificationService.showNotification(`Failed to open model: ${error.message}`, 'error');
    }
  }

  /**
   * Handle creating a new project
   */
  handleNewProject() {
    // Confirm before clearing
    const hasContent = this.modelLoader.getCurrentModelData() !== null;
    
    if (hasContent) {
      const confirmed = confirm('Are you sure you want to start a new project? All unsaved changes will be lost.');
      if (!confirmed) return;
    }
    
    try {
      // Clear the scene
      this.sceneManager.clearScene();
      
      // Clear animations
      this.animationManager.loadAnimations([]);
      
      // Clear model data
      this.modelLoader.clearCurrentModel();
      
      // Clear textures
      this.textureManager.clearTextures();
      this.clearTextureDisplay();
      
      // Reset UI state
      this.disableProjectButtons();
      
      // Reset animation list
      document.getElementById('animation-list').innerHTML = '<div class="empty-state"><p class="has-text-grey">No model loaded</p></div>';
      
      // Reset model info
      const modelInfo = document.getElementById('model-info');
      if (modelInfo) {
        modelInfo.style.display = 'none';
      }
      
      this.notificationService.showNotification('New project started', 'success');
    } catch (error) {
      console.error('Error creating new project:', error);
      this.notificationService.showNotification(`Failed to create new project: ${error.message}`, 'error');
    }
  }

  /**
   * Enable project-related buttons after loading model/project
   */
  enableProjectButtons() {
    document.getElementById('btn-retarget').disabled = false;
    document.getElementById('btn-add-animation').disabled = false;
    document.getElementById('btn-save-project').disabled = false;
    document.getElementById('btn-export-model').disabled = false;
  }

  /**
   * Disable project-related buttons when no model is loaded
   */
  disableProjectButtons() {
    document.getElementById('btn-retarget').disabled = true;
    document.getElementById('btn-add-animation').disabled = true;
    document.getElementById('btn-save-project').disabled = true;
    document.getElementById('btn-export').disabled = true;
    document.getElementById('btn-capture').disabled = true;
    // btn-export-model stays enabled - validation happens in handler
  }
}
