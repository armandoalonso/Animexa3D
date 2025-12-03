/**
 * RetargetingUIController.js
 * Handles all retargeting-related UI interactions including:
 * - Retarget modal management
 * - Bone tree display and interaction
 * - Bone mapping creation and management
 * - Animation retargeting execution
 */

export class RetargetingUIController {
  /**
   * @param {Object} dependencies - Required managers and services
   * @param {RetargetManager} dependencies.retargetManager - Animation retargeting manager
   * @param {AnimationManager} dependencies.animationManager - Animation playback manager
   * @param {Function} dependencies.showNotification - Notification callback
   */
  constructor({ retargetManager, animationManager, showNotification }) {
    this.retargetManager = retargetManager;
    this.animationManager = animationManager;
    this.showNotification = showNotification;
  }

  /**
   * Initialize event listeners for retargeting controls
   */
  initEventListeners() {
    // Retarget button
    const btnRetarget = document.getElementById('btn-retarget');
    if (btnRetarget) {
      btnRetarget.addEventListener('click', () => this.handleOpenRetargetModal());
    }

    // Close retarget modal buttons
    const closeRetargetBtns = document.querySelectorAll('#retarget-modal .modal-close, #retarget-modal .modal-background, #btn-close-retarget');
    closeRetargetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('retarget-modal').classList.remove('is-active');
      });
    });

    // Bone mapping controls
    const btnAutoMap = document.getElementById('btn-auto-map');
    if (btnAutoMap) {
      btnAutoMap.addEventListener('click', () => this.handleAutoMap());
    }

    const btnClearMapping = document.getElementById('btn-clear-mapping');
    if (btnClearMapping) {
      btnClearMapping.addEventListener('click', () => this.handleClearMapping());
    }

    const btnCreateMapping = document.getElementById('btn-create-mapping');
    if (btnCreateMapping) {
      btnCreateMapping.addEventListener('click', () => this.handleCreateMapping());
    }

    // Root bone selectors
    const targetRootBoneSelect = document.getElementById('target-root-bone-select');
    if (targetRootBoneSelect) {
      targetRootBoneSelect.addEventListener('change', (e) => this.handleTargetRootBoneChange(e));
    }

    const sourceRootBoneSelect = document.getElementById('source-root-bone-select');
    if (sourceRootBoneSelect) {
      sourceRootBoneSelect.addEventListener('change', (e) => this.handleSourceRootBoneChange(e));
    }

    // Mapping persistence
    const btnSaveMapping = document.getElementById('btn-save-mapping');
    if (btnSaveMapping) {
      btnSaveMapping.addEventListener('click', () => this.handleSaveMappingDialog());
    }

    const btnLoadMapping = document.getElementById('btn-load-mapping');
    if (btnLoadMapping) {
      btnLoadMapping.addEventListener('click', () => this.handleLoadMappingDialog());
    }

    // Save mapping modal
    const btnConfirmSaveMapping = document.getElementById('btn-confirm-save-mapping');
    if (btnConfirmSaveMapping) {
      btnConfirmSaveMapping.addEventListener('click', () => this.handleConfirmSaveMapping());
    }

    const closeSaveMappingBtns = document.querySelectorAll('#save-mapping-modal .modal-close, #save-mapping-modal .modal-background, #btn-cancel-save-mapping');
    closeSaveMappingBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('save-mapping-modal').classList.remove('is-active');
      });
    });

    // Load mapping modal
    const closeLoadMappingBtns = document.querySelectorAll('#load-mapping-modal .modal-close, #load-mapping-modal .modal-background, #btn-cancel-load-mapping');
    closeLoadMappingBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('load-mapping-modal').classList.remove('is-active');
      });
    });

    // Apply retarget button
    const btnApplyRetarget = document.getElementById('btn-apply-retarget');
    if (btnApplyRetarget) {
      btnApplyRetarget.addEventListener('click', () => this.handleApplyRetarget());
    }
  }

  /**
   * Open retarget modal and initialize with target model
   */
  handleOpenRetargetModal() {
    const currentModel = this.retargetManager.getTargetModelData();
    
    if (!currentModel) {
      this.showNotification('Please load a model first', 'warning');
      return;
    }

    // Set target model
    this.retargetManager.setTargetModel(currentModel);

    // Setup drop zone for source model
    this.setupRetargetDropZone();

    // Update UI
    this.updateRetargetingUI();

    // Show modal
    document.getElementById('retarget-modal').classList.add('is-active');
  }

  /**
   * Setup drag-and-drop zone for source model files
   */
  setupRetargetDropZone() {
    const dropZone = document.getElementById('source-model-drop-zone');
    const dropOverlay = document.querySelector('.source-model-drop-overlay');
    
    // Remove previous listeners by replacing the element
    const newDropZone = dropZone.cloneNode(true);
    dropZone.parentNode.replaceChild(newDropZone, dropZone);
    
    const newDropOverlay = newDropZone.querySelector('.source-model-drop-overlay');
    
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
      
      if (!['.fbx', '.gltf', '.glb'].includes(ext)) {
        this.showNotification('Please drop an FBX or GLTF/GLB file', 'warning');
        return;
      }
      
      try {
        this.showNotification('Loading source model...', 'info', 2000);
        const arrayBuffer = await file.arrayBuffer();
        await this.handleLoadTargetModel(arrayBuffer, ext.replace('.', ''), file.name);
      } catch (error) {
        console.error('Error loading dropped source model:', error);
        this.showNotification('Failed to load source model: ' + error.message, 'danger');
      }
    });
    
    // Also add click handler to browse for file
    const browseButton = newDropZone.querySelector('.btn-browse-source-model');
    if (browseButton) {
      browseButton.addEventListener('click', async () => {
        const result = await window.electronAPI.openFileDialog({
          title: 'Select Source Model',
          filters: [
            { name: 'Model Files', extensions: ['fbx', 'gltf', 'glb'] }
          ]
        });
        
        if (result && !result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          const fileName = filePath.split(/[\\/]/).pop();
          const ext = fileName.substring(fileName.lastIndexOf('.') + 1);
          
          try {
            this.showNotification('Loading source model...', 'info', 2000);
            const buffer = await window.electronAPI.readFile(filePath);
            await this.handleLoadTargetModel(buffer, ext, fileName);
          } catch (error) {
            console.error('Error loading selected source model:', error);
            this.showNotification('Failed to load source model: ' + error.message, 'danger');
          }
        }
      });
    }
  }

  /**
   * Handle loading source model for retargeting
   */
  async handleLoadTargetModel(arrayBuffer, format, filename) {
    try {
      const sourceModelData = await this.retargetManager.loadSourceModel(arrayBuffer, format, filename);
      
      if (sourceModelData) {
        this.showNotification(`Loaded source model: ${filename}`, 'success');
        this.updateRetargetingUI();
      } else {
        this.showNotification('Failed to load source model', 'error');
      }
    } catch (error) {
      console.error('Error in handleLoadTargetModel:', error);
      this.showNotification('Error loading source model: ' + error.message, 'error');
    }
  }

  /**
   * Update retargeting UI with current model information
   */
  updateRetargetingUI() {
    const targetModel = this.retargetManager.targetModel;
    const sourceModel = this.retargetManager.sourceModel;
    
    // Update target model info
    if (targetModel) {
      document.getElementById('target-model-name').textContent = targetModel.filename || 'Current Model';
      document.getElementById('target-rig-type').textContent = targetModel.rigType || 'Unknown';
      document.getElementById('target-bone-count').textContent = targetModel.boneNames?.length || 0;
      
      // Display target bone tree
      const targetTreeContainer = document.getElementById('source-bone-tree');
      targetTreeContainer.innerHTML = this.retargetManager.generateBoneTreeHTML(targetModel.boneHierarchy, 'target');
      
      // Populate target root bone dropdown
      if (targetModel.boneNames && targetModel.boneNames.length > 0) {
        const autoDetectedRoot = this.retargetManager.getEffectiveTargetRootBone();
        this.populateRootBoneDropdown('target', targetModel.boneNames, autoDetectedRoot);
      }
      
      // Add click handlers to target bones
      this.addBoneClickHandlers('target');
    }
    
    // Update source model info
    if (sourceModel) {
      document.getElementById('source-model-name').textContent = sourceModel.filename || 'No Model';
      document.getElementById('source-rig-type').textContent = sourceModel.rigType || 'Unknown';
      document.getElementById('source-bone-count').textContent = sourceModel.boneNames?.length || 0;
      
      // Display source bone tree
      const sourceTreeContainer = document.getElementById('target-bone-tree');
      sourceTreeContainer.innerHTML = this.retargetManager.generateBoneTreeHTML(sourceModel.boneHierarchy, 'source');
      
      // Populate source root bone dropdown
      if (sourceModel.boneNames && sourceModel.boneNames.length > 0) {
        const autoDetectedRoot = this.retargetManager.getEffectiveSourceRootBone();
        this.populateRootBoneDropdown('source', sourceModel.boneNames, autoDetectedRoot);
      }
      
      // Add click handlers to source bones
      this.addBoneClickHandlers('source');
      
      // Update animation list
      if (sourceModel.animations && sourceModel.animations.length > 0) {
        this.updateRetargetAnimationList(sourceModel.animations);
      } else {
        document.getElementById('retarget-animation-list').innerHTML = '<p class="has-text-grey">No animations available</p>';
      }
    } else {
      document.getElementById('source-model-name').textContent = 'Drop or browse for source model...';
      document.getElementById('source-rig-type').textContent = '—';
      document.getElementById('source-bone-count').textContent = '—';
      document.getElementById('target-bone-tree').innerHTML = '<p class="has-text-grey">No source model loaded</p>';
      document.getElementById('retarget-animation-list').innerHTML = '<p class="has-text-grey">No animations available</p>';
    }
  }

  /**
   * Add click handlers to bone items for mapping creation
   */
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

  /**
   * Update animation list from source model
   */
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

  /**
   * Handle auto-mapping of bones
   */
  handleAutoMap() {
    const includeHandBones = document.getElementById('auto-map-include-hands').checked;
    const result = this.retargetManager.autoMapBones(includeHandBones);
    if (result) {
      this.updateMappingDisplay();
      this.updateRetargetingUI();
      document.getElementById('btn-apply-retarget').disabled = false;
    }
  }

  /**
   * Handle clearing all bone mappings
   */
  handleClearMapping() {
    this.retargetManager.clearMappings();
    this.updateMappingDisplay();
    this.updateRetargetingUI();
  }

  /**
   * Handle manual creation of bone mapping
   */
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

  /**
   * Update the mapping display showing current bone mappings
   */
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

  /**
   * Open save mapping dialog
   */
  handleSaveMappingDialog() {
    document.getElementById('save-mapping-modal').classList.add('is-active');
  }

  /**
   * Confirm and save bone mapping with entered name
   */
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

  /**
   * Open load mapping dialog and display available mappings
   */
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

  /**
   * Execute retargeting with selected options and animations
   */
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
}
