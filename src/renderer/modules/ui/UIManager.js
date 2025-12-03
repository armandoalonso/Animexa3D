import * as THREE from 'three';
import { NotificationService } from '../services/NotificationService.js';
import { FileOperationsUIController } from './controllers/FileOperationsUIController.js';
import { AnimationUIController } from './controllers/AnimationUIController.js';
import { ExportUIController } from './controllers/ExportUIController.js';
import { SceneControlsUIController } from './controllers/SceneControlsUIController.js';
import { TextureUIController } from './controllers/TextureUIController.js';
import { RetargetingUIController } from './controllers/RetargetingUIController.js';

export class UIManager {
  constructor(sceneManager, modelLoader, animationManager, exportManager, retargetManager, textureManager, projectManager, cameraPresetManager) {
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.animationManager = animationManager;
    this.exportManager = exportManager;
    this.retargetManager = retargetManager;
    this.textureManager = textureManager;
    this.projectManager = projectManager;
    this.cameraPresetManager = cameraPresetManager;
    
    // Initialize notification service
    this.notificationService = new NotificationService('#notification-container');
    
    // Initialize UI controllers
    this.fileOperationsController = new FileOperationsUIController({
      modelLoader,
      projectManager,
      animationManager,
      textureManager,
      sceneManager,
      notificationService: this.notificationService,
      displayTextures: () => this.displayTextures(),
      clearTextureDisplay: () => this.clearTextureDisplay()
    });
    
    this.animationUIController = new AnimationUIController({
      modelLoader,
      animationManager,
      notificationService: this.notificationService
    });
    
    this.exportUIController = new ExportUIController({
      exportManager,
      notificationService: this.notificationService
    });
    
    this.sceneControlsUIController = new SceneControlsUIController({
      sceneManager,
      cameraPresetManager,
      notificationService: this.notificationService
    });
    
    this.textureUIController = new TextureUIController({
      textureManager,
      notificationService: this.notificationService
    });
    
    this.retargetingUIController = new RetargetingUIController({
      retargetManager,
      animationManager,
      showNotification: (msg, type, duration) => this.notificationService.show(msg, type, duration)
    });
    
    // Make UIManager globally accessible for other modules
    window.uiManager = this;
    
    this.initEventListeners();
    this.refreshCustomCameraPresets();
  }
  
  initEventListeners() {
    // Initialize controller event listeners
    this.fileOperationsController.initEventListeners();
    this.animationUIController.initEventListeners();
    this.exportUIController.initEventListeners();
    this.sceneControlsUIController.initEventListeners();
    this.textureUIController.initEventListeners();
    this.retargetingUIController.initEventListeners();
    
    // Export Model (not yet extracted)
    document.getElementById('btn-export-model').addEventListener('click', () => this.handleOpenExportModelModal());
    document.getElementById('btn-choose-export-model-folder').addEventListener('click', () => this.handleChooseExportModelFolder());
    document.getElementById('btn-start-model-export').addEventListener('click', () => this.handleStartModelExport());
    document.getElementById('export-model-filename').addEventListener('input', () => this.updateExportModelButton());
    
    const addAnimBtn = document.getElementById('btn-add-animation');
    console.log('Add animation button found during init:', addAnimBtn);
    if (addAnimBtn) {
      addAnimBtn.addEventListener('click', () => this.handleOpenAddAnimationModal());
    } else {
      console.error('Add animation button NOT FOUND during initialization!');
    }
    
    // Animation controls (direct manager integration)
    document.getElementById('btn-play').addEventListener('click', () => this.animationManager.togglePlayPause());
    document.getElementById('btn-pause').addEventListener('click', () => this.animationManager.pauseAnimation());
    document.getElementById('btn-stop').addEventListener('click', () => this.animationManager.stopAnimation());
    document.getElementById('loop-toggle').addEventListener('change', (e) => {
      this.animationManager.setLoop(e.target.checked);
    });
    document.getElementById('time-slider').addEventListener('input', (e) => {
      this.animationManager.scrubTimeline(parseFloat(e.target.value));
    });
    
    // Rename animation modal
    document.getElementById('btn-confirm-rename-animation').addEventListener('click', () => this.handleConfirmRenameAnimation());
    
    // Export modal
    document.getElementById('export-resolution').addEventListener('change', (e) => this.handleResolutionChange(e));
    document.getElementById('export-fps').addEventListener('change', (e) => this.handleFpsChange(e));
    document.getElementById('btn-choose-folder').addEventListener('click', () => this.handleChooseExportFolder());
    document.getElementById('btn-start-export').addEventListener('click', () => this.handleStartExport());
    document.getElementById('btn-cancel-export').addEventListener('click', () => this.handleCancelExport());
    
    // Capture modal
    document.getElementById('capture-resolution').addEventListener('change', (e) => this.handleCaptureResolutionChange(e));
    document.getElementById('btn-choose-capture-folder').addEventListener('click', () => this.handleChooseCaptureFolder());
    document.getElementById('btn-do-capture').addEventListener('click', () => this.handleDoCapture());
    
    // Retargeting modal
    document.getElementById('btn-load-target-model').addEventListener('click', () => this.handleLoadTargetModel());
    document.getElementById('btn-auto-map').addEventListener('click', () => this.handleAutoMap());
    document.getElementById('btn-clear-mapping').addEventListener('click', () => this.handleClearMapping());
    document.getElementById('btn-save-mapping').addEventListener('click', () => this.handleSaveMappingDialog());
    document.getElementById('btn-load-mapping').addEventListener('click', () => this.handleLoadMappingDialog());
    document.getElementById('btn-create-mapping').addEventListener('click', () => this.handleCreateMapping());
    document.getElementById('btn-apply-retarget').addEventListener('click', () => this.handleApplyRetarget());
    document.getElementById('btn-confirm-save-mapping').addEventListener('click', () => this.handleConfirmSaveMapping());
    document.getElementById('target-root-bone-select').addEventListener('change', (e) => this.handleTargetRootBoneChange(e));
    document.getElementById('source-root-bone-select').addEventListener('change', (e) => this.handleSourceRootBoneChange(e));
    
    // Rename animation modal
    document.getElementById('btn-confirm-rename-animation').addEventListener('click', () => this.handleConfirmRenameAnimation());
    
    // Add Animation modal
    document.getElementById('btn-load-animation-file').addEventListener('click', () => this.handleLoadAnimationFile());
    document.getElementById('btn-add-selected-animations').addEventListener('click', () => this.handleAddSelectedAnimations());
    
    // Modal close buttons
    document.querySelectorAll('.modal .delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.classList.remove('is-active');
      });
    });
    
    // Cancel buttons in modals
    document.querySelectorAll('.modal-card-foot .button:not(#btn-start-export):not(#btn-choose-folder)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.classList.remove('is-active');
      });
    });
    
    // Modal background close
    document.querySelectorAll('.modal-background').forEach(bg => {
      bg.addEventListener('click', (e) => {
        e.target.closest('.modal')?.classList.remove('is-active');
      });
    });
  }
  
  async handleSaveProject() {
    try {
      await this.projectManager.saveProject();
      this.showNotification('Project saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving project:', error);
      this.showNotification(`Failed to save project: ${error.message}`, 'error');
    }
  }

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
        document.getElementById('btn-retarget').disabled = false;
        document.getElementById('btn-add-animation').disabled = false;
        document.getElementById('btn-save-project').disabled = false;
        document.getElementById('btn-export-model').disabled = false;
        
        this.showNotification('Project loaded successfully!', 'success');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      this.showNotification(`Failed to load project: ${error.message}`, 'error');
    } finally {
      // Hide loading overlay after all UI updates are complete
      loadingOverlay.classList.remove('active');
    }
  }

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
        this.showNotification('Model has no animations', 'warning');
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
      document.getElementById('btn-retarget').disabled = false;
      document.getElementById('btn-add-animation').disabled = false;
      
      // Enable save project button
      document.getElementById('btn-save-project').disabled = false;
      
    } catch (error) {
      console.error('Error opening model:', error);
      this.showNotification(`Failed to open model: ${error.message}`, 'error');
    }
  }
  
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
      document.getElementById('btn-retarget').disabled = true;
      document.getElementById('btn-add-animation').disabled = true;
      document.getElementById('btn-save-project').disabled = true;
      document.getElementById('btn-export').disabled = true;
      document.getElementById('btn-capture').disabled = true;
      // btn-export-model stays enabled - validation happens in handler
      
      // Reset animation list
      document.getElementById('animation-list').innerHTML = '<div class="empty-state"><p class="has-text-grey">No model loaded</p></div>';
      
      // Reset model info
      const modelInfo = document.getElementById('model-info');
      if (modelInfo) {
        modelInfo.style.display = 'none';
      }
      
      this.showNotification('New project started', 'success');
    } catch (error) {
      console.error('Error creating new project:', error);
      this.showNotification(`Failed to create new project: ${error.message}`, 'error');
    }
  }
  
  showNotification(message, type = 'info', duration = 5000) {
    return this.notificationService.showNotification(message, type, duration);
  }
  
  // Proxy methods for FileOperationsController to access texture display
  displayTextures() {
    return this.textureUIController.displayTextures();
  }
  
  clearTextureDisplay() {
    return this.textureUIController.clearTextureDisplay();
  }
  
  // Proxy method for refreshing camera presets (called from constructor)
  refreshCustomCameraPresets() {
    return this.sceneControlsUIController.refreshCustomCameraPresets();
  }
  
  // Retargeting Handlers
  
  handleOpenRetargetModal() {
    const currentModel = this.modelLoader.getCurrentModelData();
    
    if (!currentModel) {
      this.showNotification('Please load a model first', 'warning');
      return;
    }
    
    // Set current model as TARGET (it will receive animations)
    this.retargetManager.setTargetModel(currentModel);
    this.updateRetargetingUI();
    
    // Setup drag-drop handlers for retarget source model loading
    this.setupRetargetDropZone();
    
    document.getElementById('retarget-modal').classList.add('is-active');
  }
  
  setupRetargetDropZone() {
    const dropZone = document.getElementById('retarget-drop-zone');
    const dropOverlay = document.getElementById('retarget-drop-overlay');
    
    if (!dropZone || !dropOverlay) return;
    
    // Remove previous listeners if any
    const newDropZone = dropZone.cloneNode(true);
    dropZone.parentNode.replaceChild(newDropZone, dropZone);
    
    const finalDropZone = document.getElementById('retarget-drop-zone');
    const finalDropOverlay = document.getElementById('retarget-drop-overlay');
    
    // Re-attach button click handler
    const loadButton = finalDropZone.querySelector('#btn-load-target-model');
    if (loadButton) {
      loadButton.addEventListener('click', () => this.handleLoadTargetModel());
    }
    
    let dragCounter = 0;
    
    finalDropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        finalDropZone.classList.add('drag-over');
        finalDropOverlay.classList.add('active');
      }
    });
    
    finalDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    finalDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        finalDropZone.classList.remove('drag-over');
        finalDropOverlay.classList.remove('active');
      }
    });
    
    finalDropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      finalDropZone.classList.remove('drag-over');
      finalDropOverlay.classList.remove('active');
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      
      const file = files[0];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      // Check if it's a valid model file
      if (!['.fbx', '.gltf', '.glb'].includes(ext)) {
        this.showNotification('Please drop an FBX or GLTF/GLB file', 'warning');
        return;
      }
      
      // Read the file and load as source model (use loadAnimationFile to handle bone-only files)
      try {
        const arrayBuffer = await file.arrayBuffer();
        const modelData = await this.modelLoader.loadAnimationFile(
          arrayBuffer,
          ext.replace('.', ''),
          file.name
        );
        
        // Set as SOURCE model for retargeting (provides animations)
        this.retargetManager.setSourceModel(modelData);
        this.updateRetargetingUI();
        
        // Enable controls
        document.getElementById('btn-auto-map').disabled = false;
        document.getElementById('btn-clear-mapping').disabled = false;
        document.getElementById('btn-save-mapping').disabled = false;
        document.getElementById('btn-load-mapping').disabled = false;
        
        this.showNotification(`Source model loaded: ${file.name} (${modelData.animations.length} animations, ${modelData.boneNames.length} bones)`, 'success');
        
      } catch (error) {
        console.error('Error loading dropped source model:', error);
        this.showNotification('Failed to load model: ' + error.message, 'error');
      }
    });
  }
  
  async handleLoadTargetModel() {
    try {
      const fileData = await window.electronAPI.openModelDialog();
      
      if (!fileData) return;
      
      const arrayBuffer = new Uint8Array(fileData.data).buffer;
      const modelData = await this.modelLoader.loadAnimationFile(
        arrayBuffer,
        fileData.extension.replace('.', ''),
        fileData.name
      );
      
      // Set as SOURCE model for retargeting (provides animations)
      this.retargetManager.setSourceModel(modelData);
      this.updateRetargetingUI();
      
      // Enable controls
      document.getElementById('btn-auto-map').disabled = false;
      document.getElementById('btn-clear-mapping').disabled = false;
      document.getElementById('btn-save-mapping').disabled = false;
      document.getElementById('btn-load-mapping').disabled = false;
      
      this.showNotification(`Source model loaded: ${fileData.name} (${modelData.animations.length} animations, ${modelData.boneNames.length} bones)`, 'success');
      
    } catch (error) {
      console.error('Error loading source model:', error);
      this.showNotification(`Failed to load source model: ${error.message}`, 'error');
    }
  }
  
  updateRetargetingUI() {
    const sourceInfo = this.retargetManager.sourceSkeletonInfo;
    const targetInfo = this.retargetManager.targetSkeletonInfo;
    
    // Update TARGET info (current model - on the left)
    if (targetInfo) {
      document.getElementById('source-rig-type').textContent = this.retargetManager.targetRigType;
      document.getElementById('source-bone-count').textContent = targetInfo.bones.length;
      
      // Build target bone tree in source position
      const targetTree = this.retargetManager.buildBoneTree(targetInfo, false);
      document.getElementById('source-bone-tree').innerHTML = targetTree;
      
      // Add click handlers to target bones
      this.addBoneClickHandlers('target');
      
      // Populate target root bone dropdown
      this.populateRootBoneDropdown('target', targetInfo.boneNames, this.retargetManager.targetRootBone);
    }
    
    // Update SOURCE info (uploaded model - on the right)
    if (sourceInfo) {
      document.getElementById('target-rig-type').textContent = this.retargetManager.sourceRigType;
      document.getElementById('target-bone-count').textContent = sourceInfo.bones.length;
      
      // Build source bone tree in target position
      const sourceTree = this.retargetManager.buildBoneTree(sourceInfo, true);
      document.getElementById('target-bone-tree').innerHTML = sourceTree;
      
      // Add click handlers to source bones
      this.addBoneClickHandlers('source');
      
      // Populate source root bone dropdown
      this.populateRootBoneDropdown('source', sourceInfo.boneNames, this.retargetManager.sourceRootBone);
    }
    
    // Update animation list from SOURCE model
    if (sourceInfo && this.retargetManager.sourceModel) {
      // Get animations from source model if available
      let sourceAnimations = [];
      if (this.retargetManager.sourceModel.animations) {
        sourceAnimations = this.retargetManager.sourceModel.animations;
      } else if (this.retargetManager.sourceModel.traverse) {
        // Try to find animations in the model
        this.retargetManager.sourceModel.traverse((child) => {
          if (child.animations && child.animations.length > 0) {
            sourceAnimations = child.animations;
          }
        });
      }
      this.updateRetargetAnimationList(sourceAnimations);
    } else {
      // No source loaded yet, show empty
      this.updateRetargetAnimationList([]);
    }
    
    // Update mapping display
    this.updateMappingDisplay();
  }
  
  addBoneClickHandlers(side) {
    const container = side === 'source' ? 
      document.getElementById('target-bone-tree') : 
      document.getElementById('source-bone-tree');
    
    const boneItems = container.querySelectorAll('.bone-item');
    
    boneItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking the toggle
        if (e.target.classList.contains('bone-toggle')) return;
        
        // Clear previous selection on both sides
        document.querySelectorAll('#source-bone-tree .bone-item').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll('#target-bone-tree .bone-item').forEach(b => b.classList.remove('selected'));
        
        item.classList.add('selected');
        
        const boneName = item.getAttribute('data-bone');
        const dataSide = item.getAttribute('data-side');
        
        if (dataSide === 'source') {
          // Clicked on source bone (right side - provides animations)
          this.retargetManager.selectedSourceBone = boneName;
          document.getElementById('selected-target-bone').value = boneName;
          
          // If this bone is mapped, highlight the corresponding bone on the other side
          const mappedTargetBone = this.retargetManager.boneMapping[boneName];
          if (mappedTargetBone) {
            const mappedBone = document.querySelector(`#source-bone-tree [data-bone="${mappedTargetBone}"]`);
            if (mappedBone) {
              mappedBone.classList.add('selected');
              mappedBone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        } else {
          // Clicked on target bone (left side - receives animations)
          this.retargetManager.selectedTargetBone = boneName;
          document.getElementById('selected-source-bone').value = boneName;
          
          // If this bone is mapped (find reverse mapping), highlight the corresponding bone on the other side
          const mappedSourceBone = Object.keys(this.retargetManager.boneMapping).find(
            key => this.retargetManager.boneMapping[key] === boneName
          );
          if (mappedSourceBone) {
            const mappedBone = document.querySelector(`#target-bone-tree [data-bone="${mappedSourceBone}"]`);
            if (mappedBone) {
              mappedBone.classList.add('selected');
              mappedBone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }
        
        // Enable create mapping button if both selected
        if (this.retargetManager.selectedSourceBone && this.retargetManager.selectedTargetBone) {
          document.getElementById('btn-create-mapping').disabled = false;
        }
      });
    });
  }
  
  updateRetargetAnimationList(animations) {
    const container = document.getElementById('retarget-animation-list');
    
    if (!animations || animations.length === 0) {
      container.innerHTML = '<p class="has-text-grey">No animations available</p>';
      return;
    }
    
    container.innerHTML = '';
    
    // Extract filename without extension from the source model
    const sourceModel = this.retargetManager.sourceModel;
    const fileName = sourceModel?.filename || '';
    const fileNameWithoutExt = fileName ? (fileName.substring(0, fileName.lastIndexOf('.')) || fileName) : '';
    
    console.log('Retarget animation list - filename:', fileName, 'without ext:', fileNameWithoutExt);
    
    animations.forEach((clip, index) => {
      const item = document.createElement('div');
      item.className = 'retarget-animation-item-selectable';
      item.innerHTML = `
        <div class="field">
          <label class="checkbox">
            <input type="checkbox" class="retarget-animation-checkbox" data-index="${index}" checked>
            <strong>${clip.name || `Animation ${index + 1}`}</strong> 
            <span class="has-text-grey">(${clip.duration.toFixed(2)}s)</span>
          </label>
        </div>
        <div class="field">
          <label class="label is-small">Rename (optional)</label>
          <div class="field has-addons">
            <div class="control is-expanded">
              <input type="text" class="input is-small retarget-animation-rename-input" data-index="${index}" 
                     placeholder="Leave empty to keep original name" value="">
            </div>
            <div class="control">
              <button class="button is-small retarget-use-filename-btn" data-index="${index}" 
                      title="Use file name">
                <span class="icon is-small">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
    
    // Add event listeners to use-filename buttons
    const filenameButtons = container.querySelectorAll('.retarget-use-filename-btn');
    filenameButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.getAttribute('data-index');
        const input = container.querySelector(`.retarget-animation-rename-input[data-index="${index}"]`);
        if (input && fileNameWithoutExt) {
          input.value = fileNameWithoutExt;
          console.log('Set filename for animation', index, ':', fileNameWithoutExt);
        } else {
          console.log('Could not set filename - input:', input, 'filename:', fileNameWithoutExt);
        }
      });
    });
  }
  
  handleAutoMap() {
    const includeHandBones = document.getElementById('auto-map-include-hands').checked;
    const result = this.retargetManager.autoMapBones(includeHandBones);
    if (result) {
      this.updateMappingDisplay();
      this.updateRetargetingUI();
      document.getElementById('btn-apply-retarget').disabled = false;
    }
  }
  
  handleClearMapping() {
    this.retargetManager.clearMappings();
    this.updateMappingDisplay();
    this.updateRetargetingUI();
  }
  
  handleCreateMapping() {
    const sourceBone = this.retargetManager.selectedSourceBone;
    const targetBone = this.retargetManager.selectedTargetBone;
    
    this.retargetManager.addManualMapping(sourceBone, targetBone);
    this.updateMappingDisplay();
    this.updateRetargetingUI();
    
    // Clear selection
    this.retargetManager.selectedSourceBone = null;
    this.retargetManager.selectedTargetBone = null;
    document.getElementById('selected-source-bone').value = '';
    document.getElementById('selected-target-bone').value = '';
    document.getElementById('btn-create-mapping').disabled = true;
    
    // Enable apply button
    document.getElementById('btn-apply-retarget').disabled = false;
  }
  
  /**
   * Populate root bone dropdown for a model
   */
  populateRootBoneDropdown(side, boneNames, autoDetectedRoot) {
    const selectId = side === 'target' ? 'target-root-bone-select' : 'source-root-bone-select';
    const select = document.getElementById(selectId);
    
    if (!select) return;
    
    // Clear existing options
    select.innerHTML = '<option value="">Auto-detect...</option>';
    
    // Add all bones as options
    boneNames.forEach(boneName => {
      const option = document.createElement('option');
      option.value = boneName;
      option.textContent = boneName;
      
      // Mark the auto-detected root with a note
      if (boneName === autoDetectedRoot) {
        option.textContent += ' (auto-detected)';
      }
      
      select.appendChild(option);
    });
    
    // Set to auto-detected value
    if (autoDetectedRoot) {
      select.value = autoDetectedRoot;
    }
  }
  
  /**
   * Handle target root bone selection change
   */
  handleTargetRootBoneChange(event) {
    const boneName = event.target.value;
    
    if (boneName) {
      this.retargetManager.setTargetRootBone(boneName);
      this.showNotification(`Target root bone set to: ${boneName}`, 'info', 3000);
    } else {
      this.retargetManager.setTargetRootBone(null);
      this.showNotification('Using auto-detected target root bone', 'info', 3000);
    }
  }
  
  /**
   * Handle source root bone selection change
   */
  handleSourceRootBoneChange(event) {
    const boneName = event.target.value;
    
    if (boneName) {
      this.retargetManager.setSourceRootBone(boneName);
      this.showNotification(`Source root bone set to: ${boneName}`, 'info', 3000);
    } else {
      this.retargetManager.setSourceRootBone(null);
      this.showNotification('Using auto-detected source root bone', 'info', 3000);
    }
  }
  
  updateMappingDisplay() {
    const mapping = this.retargetManager.getBoneMapping();
    const mappingList = document.getElementById('bone-mapping-list');
    const mappingInfo = document.getElementById('mapping-info');
    const info = this.retargetManager.getMappingInfo();
    
    if (Object.keys(mapping).length === 0) {
      mappingList.innerHTML = '<p class="has-text-grey">No mappings yet</p>';
      mappingInfo.style.display = 'none';
      return;
    }
    
    // Update info
    mappingInfo.style.display = 'block';
    document.getElementById('mapped-bone-count').textContent = info.mappingCount;
    document.getElementById('mapping-confidence').textContent = 
      Math.round(info.confidence * 100) + '%';
    
    // Update mapping list
    mappingList.innerHTML = '';
    
    Object.entries(mapping).forEach(([source, target]) => {
      const item = document.createElement('div');
      item.className = 'mapping-item';
      item.innerHTML = `
        <span>${source}</span>
        <span class="mapping-arrow">→</span>
        <span>${target}</span>
        <button class="button is-small is-danger" data-source="${source}">✕</button>
      `;
      
      const removeBtn = item.querySelector('button');
      removeBtn.addEventListener('click', () => {
        this.retargetManager.removeMapping(source);
        this.updateMappingDisplay();
        this.updateRetargetingUI();
      });
      
      mappingList.appendChild(item);
    });
  }
  
  handleSaveMappingDialog() {
    document.getElementById('save-mapping-modal').classList.add('is-active');
  }
  
  async handleConfirmSaveMapping() {
    const name = document.getElementById('mapping-name-input').value;
    
    if (!name || name.trim() === '') {
      this.showNotification('Please enter a name', 'warning');
      return;
    }
    
    await this.retargetManager.saveBoneMapping(name);
    
    document.getElementById('save-mapping-modal').classList.remove('is-active');
    document.getElementById('mapping-name-input').value = '';
  }
  
  async handleLoadMappingDialog() {
    document.getElementById('load-mapping-modal').classList.add('is-active');
    
    // Load available mappings
    const result = await window.electronAPI.listBoneMappings();
    const container = document.getElementById('available-mappings-list');
    
    if (!result.success || result.mappings.length === 0) {
      container.innerHTML = '<p class="has-text-grey">No saved mappings found</p>';
      return;
    }
    
    container.innerHTML = '';
    
    result.mappings.forEach(name => {
      const item = document.createElement('div');
      item.className = 'mapping-list-item';
      item.innerHTML = `
        <div class="mapping-name">${name}</div>
      `;
      
      item.addEventListener('click', async () => {
        const data = await this.retargetManager.loadBoneMapping(name);
        if (data) {
          this.updateMappingDisplay();
          this.updateRetargetingUI();
          document.getElementById('load-mapping-modal').classList.remove('is-active');
          document.getElementById('btn-apply-retarget').disabled = false;
        }
      });
      
      container.appendChild(item);
    });
  }
  
  async handleApplyRetarget() {
    const selectedAnimations = [];
    const checkboxes = document.querySelectorAll('#retarget-animation-list .retarget-animation-checkbox:checked');
    
    if (checkboxes.length === 0) {
      this.showNotification('Please select at least one animation to retarget', 'warning');
      return;
    }
    
    checkboxes.forEach(cb => {
      const index = parseInt(cb.getAttribute('data-index'));
      selectedAnimations.push(index);
    });
    
    // Get animations from the SOURCE model (not the target/current model)
    const sourceModelData = this.retargetManager.sourceModel;
    if (!sourceModelData || !sourceModelData.animations) {
      console.error('Source model data:', sourceModelData);
      this.showNotification('No animations found in source model', 'error');
      return;
    }
    
    // Read retargeting options from UI
    const sourcePoseMode = parseInt(document.getElementById('source-pose-mode').value);
    const targetPoseMode = parseInt(document.getElementById('target-pose-mode').value);
    const embedTransforms = document.getElementById('embed-transforms').checked;
    const preserveRootMotion = document.getElementById('preserve-root-motion').checked;
    
    // Read advanced options
    const useWorldSpaceTransform = document.getElementById('use-world-space-transform').checked;
    const autoValidatePose = document.getElementById('auto-validate-pose').checked;
    const autoApplyTPose = document.getElementById('auto-apply-tpose').checked;
    const useOptimalScale = document.getElementById('use-optimal-scale').checked;
    
    // Set retargeting options
    this.retargetManager.setRetargetOptions({
      useWorldSpaceTransformation: useWorldSpaceTransform,
      autoValidatePose: autoValidatePose,
      autoApplyTPose: autoApplyTPose,
      useOptimalScale: useOptimalScale
    });
    
    console.log('Retargeting with options:', {
      sourceAnimationCount: sourceModelData.animations.length,
      selectedIndices: selectedAnimations,
      boneMapping: Object.keys(this.retargetManager.boneMapping).length + ' bones mapped',
      sourcePoseMode,
      targetPoseMode,
      embedTransforms,
      preserveRootMotion,
      useWorldSpaceTransform,
      autoValidatePose,
      autoApplyTPose,
      useOptimalScale
    });
    
    // If preserving root motion, ensure root bones are mapped
    if (preserveRootMotion) {
      const effectiveSourceRoot = this.retargetManager.getEffectiveSourceRootBone();
      const effectiveTargetRoot = this.retargetManager.getEffectiveTargetRootBone();
      
      if (effectiveSourceRoot && effectiveTargetRoot) {
        if (!this.retargetManager.boneMapping[effectiveSourceRoot]) {
          this.retargetManager.boneMapping[effectiveSourceRoot] = effectiveTargetRoot;
          console.log(`🎯 Added root bone mapping for root motion: ${effectiveSourceRoot} → ${effectiveTargetRoot}`);
          this.showNotification(`Added root bone mapping: ${effectiveSourceRoot} → ${effectiveTargetRoot}`, 'info', 4000);
        } else {
          console.log(`✓ Root bone already mapped: ${effectiveSourceRoot} → ${this.retargetManager.boneMapping[effectiveSourceRoot]}`);
        }
      } else {
        console.warn('⚠️ Root motion enabled but root bones not identified');
        this.showNotification('Warning: Root bones not identified. Root motion may not work correctly.', 'warning', 5000);
      }
    }
    
    // Initialize retargeting with options
    try {
      const options = {
        srcPoseMode: sourcePoseMode,
        trgPoseMode: targetPoseMode,
        srcEmbedWorld: embedTransforms,
        trgEmbedWorld: embedTransforms
      };
      
      console.log('Initializing with pose modes:', {
        source: sourcePoseMode === 0 ? 'DEFAULT' : 'CURRENT',
        target: targetPoseMode === 0 ? 'DEFAULT' : 'CURRENT'
      });
      
      this.retargetManager.initializeRetargeting(options);
    } catch (error) {
      console.error('Retargeting initialization error:', error);
      this.showNotification('Failed to initialize retargeting: ' + error.message, 'error');
      return;
    }
    
    const animations = sourceModelData.animations;
    const retargetedClips = [];
    
    for (const index of selectedAnimations) {
      const clip = animations[index];
      if (clip) {
        console.log(`Retargeting clip ${index}: ${clip.name}`);
        const retargetedClip = this.retargetManager.retargetAnimation(clip, preserveRootMotion);
        if (retargetedClip) {
          // Check if there's a rename input for this animation
          const renameInput = document.querySelector(`.retarget-animation-rename-input[data-index="${index}"]`);
          const newName = renameInput ? renameInput.value.trim() : '';
          
          if (newName) {
            // Clone and rename the retargeted clip
            const renamedClip = retargetedClip.clone();
            renamedClip.name = newName;
            retargetedClips.push(renamedClip);
          } else {
            retargetedClips.push(retargetedClip);
          }
        }
      }
    }
    
    if (retargetedClips.length > 0) {
      // ADD retargeted animations to the target model (preserves existing animations)
      this.animationManager.addAnimations(retargetedClips);
      
      this.showNotification(
        `Successfully retargeted and added ${retargetedClips.length} animation(s)`,
        'success'
      );
      
      // Close modal
      document.getElementById('retarget-modal').classList.remove('is-active');
    } else {
      this.showNotification('No animations were successfully retargeted', 'warning');
    }
  }
  
  // Add Animation Handlers
  
  handleOpenAddAnimationModal() {
    const currentModel = this.modelLoader.getCurrentModelData();
    
    if (!currentModel) {
      this.showNotification('Please load a model first', 'warning');
      return;
    }
    
    // Reset modal state
    document.getElementById('animation-file-info').style.display = 'none';
    document.getElementById('animation-selection-container').style.display = 'none';
    document.getElementById('btn-add-selected-animations').disabled = true;
    this.loadedAnimationData = null;
    
    // Setup drag-drop handlers for animation files
    const dropZone = document.getElementById('animation-drop-zone');
    const dropOverlay = document.querySelector('.animation-drop-overlay');
    
    // Remove previous listeners if any
    dropZone.replaceWith(dropZone.cloneNode(true));
    const newDropZone = document.getElementById('animation-drop-zone');
    const newDropOverlay = document.querySelector('.animation-drop-overlay');
    
    let dragCounter = 0;
    
    newDropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        newDropZone.classList.add('drag-over');
        newDropOverlay.classList.add('active');
      }
    });
    
    newDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    newDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        newDropZone.classList.remove('drag-over');
        newDropOverlay.classList.remove('active');
      }
    });
    
    newDropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      newDropZone.classList.remove('drag-over');
      newDropOverlay.classList.remove('active');
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      
      const file = files[0];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      // Check if it's a valid animation file
      if (!['.fbx', '.gltf', '.glb'].includes(ext)) {
        this.showNotification('Please drop an FBX or GLTF/GLB file', 'warning');
        return;
      }
      
      // Read the file
      try {
        const arrayBuffer = await file.arrayBuffer();
        const animationData = await this.modelLoader.loadAnimationFile(
          arrayBuffer,
          ext.replace('.', ''),
          file.name
        );
        
        // Store loaded animation data with filename
        this.loadedAnimationData = animationData;
        this.loadedAnimationData.fileName = file.name;
        
        // Update file info
        document.getElementById('anim-file-name').textContent = file.name;
        document.getElementById('anim-file-count').textContent = animationData.animations.length;
        document.getElementById('anim-file-bones').textContent = animationData.boneNames.length;
        document.getElementById('animation-file-info').style.display = 'block';
        
        // Verify bone structure compatibility
        const currentModel = this.modelLoader.getCurrentModelData();
        const verification = this.modelLoader.verifyBoneStructureCompatibility(
          currentModel.skeletons,
          animationData.skeletons
        );
        
        // Display verification result
        this.displayBoneVerification(verification);
        
        // If compatible or at least partially compatible, show animation selection
        if (verification.compatible || verification.matchPercentage >= 50) {
          this.displayAnimationSelection(animationData.animations);
        } else {
          document.getElementById('animation-selection-container').style.display = 'none';
          document.getElementById('btn-add-selected-animations').disabled = true;
        }
      } catch (error) {
        console.error('Error loading dropped animation file:', error);
        this.showNotification('Failed to load animation file: ' + error.message, 'danger');
      }
    });
    
    document.getElementById('add-animation-modal').classList.add('is-active');
  }
  
  async handleLoadAnimationFile() {
    try {
      const fileData = await window.electronAPI.openModelDialog();
      
      if (!fileData) return;
      
      const arrayBuffer = new Uint8Array(fileData.data).buffer;
      const animationData = await this.modelLoader.loadAnimationFile(
        arrayBuffer,
        fileData.extension.replace('.', ''),
        fileData.name
      );
      
      // Store loaded animation data with filename
      this.loadedAnimationData = animationData;
      this.loadedAnimationData.fileName = fileData.name;
      
      // Update file info
      document.getElementById('anim-file-name').textContent = fileData.name;
      document.getElementById('anim-file-count').textContent = animationData.animations.length;
      document.getElementById('anim-file-bones').textContent = animationData.boneNames.length;
      document.getElementById('animation-file-info').style.display = 'block';
      
      // Verify bone structure compatibility
      const currentModel = this.modelLoader.getCurrentModelData();
      const verification = this.modelLoader.verifyBoneStructureCompatibility(
        currentModel.skeletons,
        animationData.skeletons
      );
      
      // Display verification result
      this.displayBoneVerification(verification);
      
      // Only show animation selection if confidence is >= 90%
      if (verification.matchPercentage >= 90) {
        this.displayAnimationSelection(animationData.animations);
        document.getElementById('btn-add-selected-animations').disabled = false;
      } else {
        document.getElementById('animation-selection-container').style.display = 'none';
        document.getElementById('btn-add-selected-animations').disabled = true;
      }
      
    } catch (error) {
      console.error('Error loading animation file:', error);
      this.showNotification(`Failed to load animation file: ${error.message}`, 'error');
    }
  }
  
  displayBoneVerification(verification) {
    const container = document.getElementById('bone-verification-result');
    
    let statusClass = '';
    let statusIcon = '';
    
    if (verification.matchPercentage >= 90) {
      statusClass = 'has-text-success';
      statusIcon = '✓';
    } else if (verification.matchPercentage >= 70) {
      statusClass = 'has-text-warning';
      statusIcon = '⚠';
    } else {
      statusClass = 'has-text-danger';
      statusIcon = '✗';
    }
    
    let html = `
      <div class="notification is-light ${statusClass.replace('has-text-', 'is-')}">
        <p class="${statusClass}"><strong>${statusIcon} ${verification.message}</strong></p>
        <p>Match Percentage: <strong>${verification.matchPercentage}%</strong></p>
        <p>Model Bones: ${verification.sourceBoneCount} | Animation File Bones: ${verification.targetBoneCount}</p>
      </div>
    `;
    
    // Show guidance if match is too low
    if (verification.matchPercentage < 90) {
      html += `
        <div class="notification is-warning is-light">
          <p><strong>⚠ Bone structure confidence is below 90%</strong></p>
          <p class="help">This animation file has a different bone structure than your model. Please use the <strong>Retarget Animation</strong> menu from the main toolbar to properly retarget this animation.</p>
        </div>
      `;
    }
    
    if (verification.missingBones.length > 0) {
      html += `
        <details style="margin-top: 0.5rem;">
          <summary class="has-text-danger"><strong>Missing Bones (${verification.missingBones.length})</strong></summary>
          <div style="max-height: 150px; overflow-y: auto; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; margin-top: 0.5rem;">
            ${verification.missingBones.map(bone => `<p style="font-size: 0.9rem;">• ${bone}</p>`).join('')}
          </div>
        </details>
      `;
    }
    
    if (verification.extraBones.length > 0) {
      html += `
        <details style="margin-top: 0.5rem;">
          <summary class="has-text-info"><strong>Extra Bones in Animation (${verification.extraBones.length})</strong></summary>
          <div style="max-height: 150px; overflow-y: auto; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; margin-top: 0.5rem;">
            ${verification.extraBones.map(bone => `<p style="font-size: 0.9rem;">• ${bone}</p>`).join('')}
          </div>
        </details>
      `;
    }
    
    container.innerHTML = html;
  }
  
  displayAnimationSelection(animations) {
    const container = document.getElementById('animation-selection-list');
    
    if (!animations || animations.length === 0) {
      container.innerHTML = '<p class="has-text-grey">No animations found in file</p>';
      document.getElementById('animation-selection-container').style.display = 'none';
      return;
    }
    
    container.innerHTML = '';
    
    // Extract filename without extension from the loaded file
    const fileName = this.loadedAnimationData?.fileName || this.loadedAnimationData?.filename || '';
    const fileNameWithoutExt = fileName ? (fileName.substring(0, fileName.lastIndexOf('.')) || fileName) : '';
    
    animations.forEach((clip, index) => {
      const item = document.createElement('div');
      item.className = 'animation-item-selectable';
      item.innerHTML = `
        <div class="field">
          <label class="checkbox">
            <input type="checkbox" class="animation-checkbox" data-index="${index}" checked>
            <strong>${clip.name || `Animation ${index + 1}`}</strong> 
            <span class="has-text-grey">(${clip.duration.toFixed(2)}s)</span>
          </label>
        </div>
        <div class="field">
          <label class="label is-small">Rename (optional)</label>
          <div class="field has-addons">
            <div class="control is-expanded">
              <input type="text" class="input is-small animation-rename-input" data-index="${index}" 
                     placeholder="Leave empty to keep original name" value="">
            </div>
            <div class="control">
              <button class="button is-small use-filename-btn" data-index="${index}" 
                      title="Use file name">
                <span class="icon is-small">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
    
    // Add event listeners to checkboxes
    const checkboxes = container.querySelectorAll('.animation-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        this.updateAddAnimationButton();
      });
    });
    
    // Add event listeners to use-filename buttons
    const filenameButtons = container.querySelectorAll('.use-filename-btn');
    filenameButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.getAttribute('data-index');
        const input = container.querySelector(`.animation-rename-input[data-index="${index}"]`);
        if (input && fileNameWithoutExt) {
          input.value = fileNameWithoutExt;
        }
      });
    });
    
    document.getElementById('animation-selection-container').style.display = 'block';
    this.updateAddAnimationButton();
  }
  
  updateAddAnimationButton() {
    const checkboxes = document.querySelectorAll('.animation-checkbox:checked');
    document.getElementById('btn-add-selected-animations').disabled = checkboxes.length === 0;
  }
  
  async handleAddSelectedAnimations() {
    if (!this.loadedAnimationData) {
      this.showNotification('No animation data loaded', 'error');
      return;
    }
    
    // Get selected animation indices
    const selectedIndices = [];
    const checkboxes = document.querySelectorAll('.animation-checkbox:checked');
    
    checkboxes.forEach(cb => {
      const index = parseInt(cb.getAttribute('data-index'));
      selectedIndices.push(index);
    });
    
    if (selectedIndices.length === 0) {
      this.showNotification('Please select at least one animation', 'warning');
      return;
    }
    
    // Get selected animations
    let selectedAnimations = selectedIndices.map(index => 
      this.loadedAnimationData.animations[index]
    );
    
    // Apply renames
    const renameInputs = document.querySelectorAll('.animation-rename-input');
    selectedAnimations = selectedAnimations.map((anim, idx) => {
      const originalIndex = selectedIndices[idx];
      const renameInput = document.querySelector(`.animation-rename-input[data-index="${originalIndex}"]`);
      const newName = renameInput ? renameInput.value.trim() : '';
      
      if (newName) {
        // Clone the animation and rename it
        const clonedAnim = anim.clone();
        clonedAnim.name = newName;
        return clonedAnim;
      }
      return anim;
    });
    
    // Directly add animations (no retargeting - bones must match >= 90%)
    const totalAnimations = this.animationManager.addAnimations(selectedAnimations);
    
    this.showNotification(
      `Successfully added ${selectedAnimations.length} animation(s)! Total animations: ${totalAnimations}`,
      'success'
    );
    
    // Close modal
    document.getElementById('add-animation-modal').classList.remove('is-active');
  }
  
  /**
   * Display materials and textures in the texture panel
   */
  displayTextures() {
    const container = document.getElementById('texture-list');
    const materials = this.textureManager.getMaterials();

    if (!materials || materials.length === 0) {
      container.innerHTML = '<div class="empty-state"><p class="has-text-grey">No materials found</p></div>';
      return;
    }

    container.innerHTML = '';

    // Add drop overlay for texture section
    const dropOverlay = document.createElement('div');
    dropOverlay.id = 'drop-overlay-textures';
    dropOverlay.className = 'drop-overlay-textures';
    dropOverlay.innerHTML = `
      <div class="drop-content-textures">
        <p class="title is-5">Drop Texture Here</p>
        <p class="subtitle is-6">PNG, JPG, TGA, etc.</p>
      </div>
    `;
    container.appendChild(dropOverlay);

    // Setup drag handlers for texture section
    this.setupTextureSectionDragDrop(container);

    materials.forEach((materialData, index) => {
      const materialCard = this.createMaterialCard(materialData, index);
      container.appendChild(materialCard);
    });
  }

  /**
   * Create a material card element
   */
  createMaterialCard(materialData, index) {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.setAttribute('data-material-uuid', materialData.uuid);

    // Material header
    const header = document.createElement('div');
    header.className = 'material-header';
    header.innerHTML = `
      <div class="material-name">${materialData.name}</div>
      <span class="material-toggle">▼</span>
    `;
    header.style.cursor = 'pointer';
    
    // Add click handler for collapse/expand
    header.addEventListener('click', () => {
      const isCollapsed = card.classList.toggle('collapsed');
      const toggle = header.querySelector('.material-toggle');
      toggle.textContent = isCollapsed ? '▶' : '▼';
    });
    
    card.appendChild(header);

    // Texture slots container
    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'texture-slots';

    // Common texture types to display (even if empty)
    const commonSlots = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
    
    // Display existing textures
    Object.entries(materialData.textures).forEach(([key, textureData]) => {
      const slot = this.createTextureSlot(materialData.uuid, key, textureData, false);
      slotsContainer.appendChild(slot);
    });

    // Display empty slots for common texture types that don't exist
    commonSlots.forEach(slotKey => {
      if (!materialData.textures[slotKey]) {
        const slotInfo = this.textureManager.getTextureSlotInfo(slotKey);
        const emptySlot = this.createTextureSlot(materialData.uuid, slotKey, {
          label: slotInfo.label,
          shortLabel: slotInfo.shortLabel,
          source: null
        }, true);
        slotsContainer.appendChild(emptySlot);
      }
    });

    card.appendChild(slotsContainer);

    return card;
  }

  /**
   * Create a texture slot element
   */
  createTextureSlot(materialUuid, textureKey, textureData, isEmpty) {
    const slot = document.createElement('div');
    slot.className = `texture-slot ${isEmpty ? 'empty-slot' : ''}`;
    slot.setAttribute('data-material-uuid', materialUuid);
    slot.setAttribute('data-texture-key', textureKey);

    // Enable drag and drop for texture images
    this.setupTextureSlotDragDrop(slot, materialUuid, textureKey);

    // Thumbnail
    const thumbnail = document.createElement('div');
    thumbnail.className = `texture-thumbnail ${isEmpty ? 'no-texture' : ''}`;
    
    if (!isEmpty && textureData.texture) {
      const thumbnailUrl = this.textureManager.getTextureThumbnail(textureData.texture);
      if (thumbnailUrl) {
        thumbnail.style.backgroundImage = `url(${thumbnailUrl})`;
        thumbnail.style.backgroundSize = 'cover';
        thumbnail.style.backgroundPosition = 'center';
      } else {
        thumbnail.textContent = '?';
      }
    } else {
      thumbnail.textContent = '—';
    }

    // Info
    const info = document.createElement('div');
    info.className = 'texture-info';
    
    const label = document.createElement('div');
    label.className = 'texture-label';
    label.textContent = textureData.shortLabel || textureData.label;
    
    const source = document.createElement('div');
    source.className = `texture-source ${isEmpty ? 'no-texture-text' : ''}`;
    source.textContent = isEmpty ? 'No texture' : (textureData.source || 'Unknown');
    source.title = source.textContent; // Tooltip for full name
    
    info.appendChild(label);
    info.appendChild(source);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'texture-actions';
    
    const button = document.createElement('button');
    button.className = `btn-change-texture ${isEmpty ? 'btn-add-texture' : ''}`;
    button.textContent = '+';
    button.title = isEmpty ? 'Add texture' : 'Change texture';
    button.setAttribute('data-material-uuid', materialUuid);
    button.setAttribute('data-texture-key', textureKey);
    
    button.addEventListener('click', () => {
      this.handleChangeTexture(materialUuid, textureKey);
    });
    
    actions.appendChild(button);

    // Add delete button if texture exists
    if (!isEmpty) {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn-delete-texture';
      deleteButton.textContent = '×';
      deleteButton.title = 'Delete texture';
      deleteButton.setAttribute('data-material-uuid', materialUuid);
      deleteButton.setAttribute('data-texture-key', textureKey);
      
      deleteButton.addEventListener('click', () => {
        this.handleDeleteTexture(materialUuid, textureKey);
      });
      
      actions.appendChild(deleteButton);
    }

    slot.appendChild(thumbnail);
    slot.appendChild(info);
    slot.appendChild(actions);

    return slot;
  }

  /**
   * Setup drag and drop handlers for the entire texture section
   */
  setupTextureSectionDragDrop(container) {
    const textureSection = container.closest('.sidebar-section-textures');
    const dropOverlay = container.querySelector('#drop-overlay-textures');
    
    if (!textureSection) return;

    textureSection.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Don't show if dragging over a specific slot
      if (!e.target.closest('.texture-slot')) {
        if (dropOverlay) {
          dropOverlay.classList.add('active');
        }
      }
    });

    textureSection.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    textureSection.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only remove overlay if actually leaving the texture section
      if (!textureSection.contains(e.relatedTarget)) {
        if (dropOverlay) {
          dropOverlay.classList.remove('active');
        }
      }
    });

    textureSection.addEventListener('drop', (e) => {
      // Only handle drops outside of texture slots
      if (!e.target.closest('.texture-slot')) {
        e.preventDefault();
        e.stopPropagation();
        if (dropOverlay) {
          dropOverlay.classList.remove('active');
        }
        this.showNotification('Drop the texture directly onto a texture slot (Albedo, Normal, etc.)', 'info');
      }
    });
  }

  /**
   * Setup drag and drop handlers for a texture slot
   */
  setupTextureSlotDragDrop(slot, materialUuid, textureKey) {
    const container = document.getElementById('texture-list');
    const dropOverlay = container?.querySelector('#drop-overlay-textures');

    slot.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Hide section overlay when over specific slot
      if (dropOverlay) {
        dropOverlay.classList.remove('active');
      }
      
      slot.classList.add('texture-slot-drag-over');
    });

    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    slot.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only remove highlight if actually leaving the slot
      if (!slot.contains(e.relatedTarget)) {
        slot.classList.remove('texture-slot-drag-over');
      }
    });

    slot.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.remove('texture-slot-drag-over');
      
      // Hide section overlay
      if (dropOverlay) {
        dropOverlay.classList.remove('active');
      }

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];
      const extension = file.name.split('.').pop().toLowerCase();

      // Validate image file
      if (!['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tga', 'tiff', 'tif', 'webp'].includes(extension)) {
        this.showNotification('Please drop an image file (PNG, JPG, TGA, etc.)', 'warning');
        return;
      }

      // Save file to temp and update texture
      await this.handleDroppedImage(file, materialUuid, textureKey);
    });
  }

  /**
   * Handle dropped image file on texture slot
   */
  async handleDroppedImage(file, materialUuid, textureKey) {
    try {
      this.showNotification('Loading texture...', 'info', 2000);

      // Read the file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Array.from(new Uint8Array(arrayBuffer));

      // Save to temp directory
      const tempPath = await window.electronAPI.saveTextureToTemp(file.name, buffer);

      // Update the texture
      const success = await this.textureManager.updateTexture(materialUuid, textureKey, tempPath);

      if (success) {
        this.showNotification(`Texture updated: ${file.name}`, 'success');
        
        // Refresh the texture display
        this.displayTextures();
      } else {
        this.showNotification('Failed to update texture', 'error');
      }
    } catch (error) {
      console.error('Error handling dropped image:', error);
      this.showNotification(`Failed to load texture: ${error.message}`, 'error');
    }
  }

  /**
   * Handle texture change button click
   */
  async handleChangeTexture(materialUuid, textureKey) {
    try {
      const imagePath = await window.electronAPI.openImageDialog();
      
      if (!imagePath) {
        return; // User cancelled
      }

      // Show loading notification
      this.showNotification('Updating texture...', 'info', 2000);

      // Update the texture
      const success = await this.textureManager.updateTexture(materialUuid, textureKey, imagePath);

      if (success) {
        this.showNotification('Texture updated successfully!', 'success');
        
        // Refresh the texture display
        this.displayTextures();
      } else {
        this.showNotification('Failed to update texture', 'error');
      }
    } catch (error) {
      console.error('Error changing texture:', error);
      this.showNotification(`Failed to change texture: ${error.message}`, 'error');
    }
  }

  /**
   * Handle texture delete button click
   */
  handleDeleteTexture(materialUuid, textureKey) {
    const materialData = this.textureManager.getMaterialByUuid(materialUuid);
    const textureData = materialData?.textures[textureKey];
    const slotInfo = this.textureManager.getTextureSlotInfo(textureKey);
    
    const textureName = textureData?.source || slotInfo.label;
    const materialName = materialData?.name || 'Unknown Material';
    
    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to remove the ${textureName} texture from ${materialName}?`);
    
    if (!confirmed) {
      return;
    }

    try {
      // Remove the texture
      const success = this.textureManager.removeTexture(materialUuid, textureKey);

      if (success) {
        this.showNotification('Texture removed successfully!', 'success');
        
        // Refresh the texture display
        this.displayTextures();
      } else {
        this.showNotification('Failed to remove texture', 'error');
      }
    } catch (error) {
      console.error('Error deleting texture:', error);
      this.showNotification(`Failed to delete texture: ${error.message}`, 'error');
    }
  }

  /**
   * Clear texture display
   */
  clearTextureDisplay() {
    const container = document.getElementById('texture-list');
    container.innerHTML = '<div class="empty-state"><p class="has-text-grey">No model loaded</p></div>';
  }

  /**
   * Camera Preset Handlers
   */

  /**
   * Save current camera view as a custom preset
   */
  handleSaveCameraView() {
    // Open the save preset modal
    const modal = document.getElementById('save-camera-preset-modal');
    const nameInput = document.getElementById('camera-preset-name-input');
    
    modal.classList.add('is-active');
    nameInput.value = '';
    
    // Remove existing keydown listener if any
    if (nameInput._cameraPresetKeydownHandler) {
      nameInput.removeEventListener('keydown', nameInput._cameraPresetKeydownHandler);
      delete nameInput._cameraPresetKeydownHandler;
    }
    
    // Add Enter key listener
    const keydownHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('btn-confirm-save-camera-preset').click();
      }
    };
    
    nameInput._cameraPresetKeydownHandler = keydownHandler;
    nameInput.addEventListener('keydown', keydownHandler);
    
    // Focus the input after a short delay to ensure modal is rendered
    setTimeout(() => {
      nameInput.focus();
      nameInput.select(); // Select any existing text
    }, 150);
  }

  /**
   * Confirm and save the camera preset with the entered name
   */
  handleConfirmSaveCameraPreset() {
    const nameInput = document.getElementById('camera-preset-name-input');
    const name = nameInput.value.trim();
    
    if (!name) {
      this.showNotification('Please enter a name for the camera view', 'warning');
      return;
    }

    // Check if preset already exists
    if (this.cameraPresetManager.hasPreset(name)) {
      // Show warning notification and don't save
      this.showNotification(`A preset named "${name}" already exists. Please use a different name.`, 'warning', 4000);
      return;
    }

    const success = this.cameraPresetManager.saveCurrentView(name);

    if (success) {
      this.showNotification(`Camera view "${name}" saved!`, 'success');
      this.refreshCustomCameraPresets();
      
      // Close modal
      document.getElementById('save-camera-preset-modal').classList.remove('is-active');
      nameInput.value = '';
    } else {
      this.showNotification('Failed to save camera view', 'error');
    }
  }

  /**
   * Load a custom camera preset
   */
  handleLoadCustomPreset(event) {
    const presetName = event.target.value;

    if (!presetName) {
      return;
    }

    const preset = this.cameraPresetManager.loadPreset(presetName);

    if (preset) {
      // Apply the preset to the camera
      this.sceneManager.applyCameraState(preset);
      
      this.showNotification(`Loaded camera view "${presetName}"`, 'success', 2000);
      
      // Enable delete button
      document.getElementById('btn-delete-camera-preset').disabled = false;
    } else {
      this.showNotification('Failed to load camera preset', 'error');
    }
  }

  /**
   * Delete the currently selected custom camera preset
   */
  handleDeleteCameraPreset() {
    const dropdown = document.getElementById('custom-camera-preset');
    const presetName = dropdown.value;

    if (!presetName) {
      return;
    }

    const success = this.cameraPresetManager.deletePreset(presetName);

    if (success) {
      this.showNotification(`Camera view "${presetName}" deleted`, 'success');
      this.refreshCustomCameraPresets();
      
      // Disable delete button
      document.getElementById('btn-delete-camera-preset').disabled = true;
    } else {
      this.showNotification('Failed to delete camera preset', 'error');
    }
  }

  /**
   * Refresh the custom camera preset dropdown
   */
  refreshCustomCameraPresets() {
    const dropdown = document.getElementById('custom-camera-preset');
    const deleteBtn = document.getElementById('btn-delete-camera-preset');
    const presetNames = this.cameraPresetManager.getPresetNames();

    // Clear existing options except the placeholder
    dropdown.innerHTML = '<option value="">Select Custom View...</option>';

    // Add all custom presets
    presetNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      dropdown.appendChild(option);
    });

    // Reset selection to placeholder
    dropdown.value = '';
    deleteBtn.disabled = true;

    // Show/hide the custom preset section based on whether presets exist
    const customSection = dropdown.closest('.control-section');
    if (presetNames.length === 0) {
      // Still show it, but user will see "Select Custom View..." as the only option
    }
  }

  /**
   * Rename Animation Handlers
   */

  /**
   * Confirm and rename the animation with the entered name
   */
  handleConfirmRenameAnimation() {
    const input = document.getElementById('rename-animation-input');
    const newName = input.value.trim();
    const index = parseInt(input.dataset.animationIndex);

    if (!newName) {
      this.showNotification('Please enter a name for the animation', 'warning');
      return;
    }

    const success = this.animationManager.renameAnimation(index, newName);

    if (success) {
      // Close modal
      document.getElementById('rename-animation-modal').classList.remove('is-active');
      input.value = '';
      delete input.dataset.animationIndex;
    }
  }
  
  /**
   * Export Model Handlers
   */
  
  handleOpenExportModelModal() {
    const currentModel = this.modelLoader.getCurrentModelData();
    
    if (!currentModel) {
      this.showNotification('Please load a model first', 'warning');
      return;
    }
    
    // Pre-fill filename with current model name if available
    const modelName = currentModel.filename || 'exported-model';
    const filenameWithoutExt = modelName.substring(0, modelName.lastIndexOf('.')) || modelName;
    document.getElementById('export-model-filename').value = filenameWithoutExt;
    
    // Open modal
    document.getElementById('export-model-modal').classList.add('is-active');
  }
  
  async handleChooseExportModelFolder() {
    const folder = await window.electronAPI.chooseExportFolder();
    if (folder) {
      document.getElementById('export-model-folder').value = folder;
      this.updateExportModelButton();
    }
  }
  
  updateExportModelButton() {
    const folder = document.getElementById('export-model-folder').value;
    const filename = document.getElementById('export-model-filename').value;
    const btn = document.getElementById('btn-start-model-export');
    
    btn.disabled = !folder || !filename.trim();
  }
  
  async handleStartModelExport() {
    const folder = document.getElementById('export-model-folder').value;
    const filename = document.getElementById('export-model-filename').value.trim();
    const formatRadio = document.querySelector('input[name="export-model-format"]:checked');
    const format = formatRadio ? formatRadio.value : 'glb';
    const embedTextures = document.getElementById('export-model-embed-textures').checked;
    
    if (!folder || !filename) {
      this.showNotification('Please select a folder and filename', 'warning');
      return;
    }
    
    // Close modal
    document.getElementById('export-model-modal').classList.remove('is-active');
    
    // Show loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
      loadingText.textContent = `Exporting ${format.toUpperCase()}...`;
    }
    if (loadingOverlay) {
      loadingOverlay.classList.add('active');
    }
    
    try {
      await this.exportManager.exportModel({
        format,
        folder,
        filename,
        embedTextures
      });
    } catch (error) {
      console.error('Export model error:', error);
      this.showNotification(`Export failed: ${error.message}`, 'error');
    } finally {
      // Hide loading overlay after export completes
      if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
      }
    }
  }
}

