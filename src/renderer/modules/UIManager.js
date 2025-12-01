export class UIManager {
  constructor(sceneManager, modelLoader, animationManager, exportManager, retargetManager, textureManager) {
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.animationManager = animationManager;
    this.exportManager = exportManager;
    this.retargetManager = retargetManager;
    this.textureManager = textureManager;
    
    // Make UIManager globally accessible for other modules
    window.uiManager = this;
    
    this.initEventListeners();
  }
  
  initEventListeners() {
    // File operations
    document.getElementById('btn-open-model').addEventListener('click', () => this.handleOpenModel());
    document.getElementById('btn-export').addEventListener('click', () => this.handleOpenExportModal());
    document.getElementById('btn-capture').addEventListener('click', () => this.handleCaptureFrame());
    document.getElementById('btn-retarget').addEventListener('click', () => this.handleOpenRetargetModal());
    
    const addAnimBtn = document.getElementById('btn-add-animation');
    console.log('Add animation button found during init:', addAnimBtn);
    if (addAnimBtn) {
      addAnimBtn.addEventListener('click', () => this.handleOpenAddAnimationModal());
    } else {
      console.error('Add animation button NOT FOUND during initialization!');
    }
    
    // Scene controls
    document.getElementById('bg-color').addEventListener('input', (e) => this.handleBackgroundColor(e));
    document.getElementById('camera-preset').addEventListener('change', (e) => this.handleCameraPreset(e));
    document.getElementById('grid-toggle').addEventListener('change', (e) => this.handleGridToggle(e));
    
    // Light controls
    document.getElementById('light-x').addEventListener('input', (e) => this.handleLightPosition());
    document.getElementById('light-y').addEventListener('input', (e) => this.handleLightPosition());
    document.getElementById('light-z').addEventListener('input', (e) => this.handleLightPosition());
    document.getElementById('dir-light-intensity').addEventListener('input', (e) => this.handleDirectionalLightIntensity(e));
    document.getElementById('amb-light-intensity').addEventListener('input', (e) => this.handleAmbientLightIntensity(e));
    
    // Animation controls
    document.getElementById('btn-play').addEventListener('click', () => this.animationManager.togglePlayPause());
    document.getElementById('btn-pause').addEventListener('click', () => this.animationManager.pauseAnimation());
    document.getElementById('btn-stop').addEventListener('click', () => this.animationManager.stopAnimation());
    document.getElementById('loop-toggle').addEventListener('change', (e) => {
      this.animationManager.setLoop(e.target.checked);
    });
    document.getElementById('time-slider').addEventListener('input', (e) => {
      this.animationManager.scrubTimeline(parseFloat(e.target.value));
    });
    
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
    
    // Add Animation modal
    document.getElementById('btn-load-animation-file').addEventListener('click', () => this.handleLoadAnimationFile());
    document.getElementById('btn-add-selected-animations').addEventListener('click', () => this.handleAddSelectedAnimations());
    document.getElementById('btn-auto-map-inline').addEventListener('click', () => this.handleInlineAutoMap());
    document.getElementById('btn-clear-mapping-inline').addEventListener('click', () => this.handleInlineClearMapping());
    document.getElementById('btn-toggle-bone-trees').addEventListener('click', () => this.handleToggleBoneTrees());
    document.getElementById('btn-create-mapping-inline').addEventListener('click', () => this.handleInlineCreateMapping());
    
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
  
  async handleOpenModel() {
    console.log('handleOpenModel called');
    try {
      const fileData = await window.electronAPI.openModelDialog();
      console.log('File data received:', fileData);
      
      if (!fileData) return; // User cancelled
      
      const arrayBuffer = new Uint8Array(fileData.data).buffer;
      const modelData = await this.modelLoader.loadFromBuffer(
        arrayBuffer,
        fileData.extension.replace('.', ''),
        fileData.name
      );
      
      console.log('Model loaded successfully:', modelData);
      
      // Load animations
      if (modelData.animations && modelData.animations.length > 0) {
        this.animationManager.loadAnimations(modelData.animations);
      } else {
        this.animationManager.loadAnimations([]);
        this.showNotification('Model has no animations', 'warning');
      }

      // Extract and display textures
      const materials = this.textureManager.extractMaterials(modelData.model);
      console.log('Extracted materials:', materials);
      
      // Extract embedded textures if any
      if (materials.length > 0) {
        await this.textureManager.extractEmbeddedTextures(materials);
        this.displayTextures();
      } else {
        this.clearTextureDisplay();
      }
      
      // Enable retarget button after model is loaded
      document.getElementById('btn-retarget').disabled = false;
      
      // Enable add animation button after model is loaded
      const addAnimBtn = document.getElementById('btn-add-animation');
      if (addAnimBtn) {
        addAnimBtn.disabled = false;
        console.log('Add animation button enabled');
      } else {
        console.error('Add animation button not found!');
      }
      
    } catch (error) {
      console.error('Error opening model:', error);
      this.showNotification(`Failed to open model: ${error.message}`, 'error');
    }
  }
  
  handleBackgroundColor(event) {
    const color = event.target.value;
    this.sceneManager.setBackgroundColor(color);
  }
  
  handleCameraPreset(event) {
    this.sceneManager.applyCameraPreset(event.target.value);
  }
  
  handleGridToggle(event) {
    this.sceneManager.toggleGrid(event.target.checked);
  }
  
  handleLightPosition() {
    const x = parseFloat(document.getElementById('light-x').value);
    const y = parseFloat(document.getElementById('light-y').value);
    const z = parseFloat(document.getElementById('light-z').value);
    
    document.getElementById('light-x-value').textContent = x;
    document.getElementById('light-y-value').textContent = y;
    document.getElementById('light-z-value').textContent = z;
    
    this.sceneManager.updateLightPosition(x, y, z);
  }
  
  handleDirectionalLightIntensity(event) {
    const value = parseFloat(event.target.value);
    document.getElementById('dir-light-value').textContent = value;
    this.sceneManager.updateDirectionalLightIntensity(value);
  }
  
  handleAmbientLightIntensity(event) {
    const value = parseFloat(event.target.value);
    document.getElementById('amb-light-value').textContent = value;
    this.sceneManager.updateAmbientLightIntensity(value);
  }
  
  handleOpenExportModal() {
    document.getElementById('export-modal').classList.add('is-active');
  }
  
  handleResolutionChange(event) {
    const customDiv = document.getElementById('custom-resolution');
    if (event.target.value === 'custom') {
      customDiv.style.display = 'block';
    } else {
      customDiv.style.display = 'none';
    }
    this.updateExportButton();
  }
  
  handleFpsChange(event) {
    const customDiv = document.getElementById('custom-fps');
    if (event.target.value === 'custom') {
      customDiv.style.display = 'block';
    } else {
      customDiv.style.display = 'none';
    }
  }
  
  async handleChooseExportFolder() {
    const folder = await window.electronAPI.chooseExportFolder();
    if (folder) {
      document.getElementById('export-folder').value = folder;
      this.exportManager.setExportFolder(folder);
      this.updateExportButton();
    }
  }
  
  updateExportButton() {
    const folder = document.getElementById('export-folder').value;
    const resolution = document.getElementById('export-resolution').value;
    const btn = document.getElementById('btn-start-export');
    
    btn.disabled = !folder || !resolution;
  }
  
  async handleStartExport() {
    const resolutionSelect = document.getElementById('export-resolution').value;
    const fpsSelect = document.getElementById('export-fps').value;
    const folder = this.exportManager.getExportFolder();
    const transparentBackground = document.getElementById('transparent-bg-toggle').checked;
    
    if (!folder) {
      this.showNotification('Please select an output folder', 'error');
      return;
    }
    
    let resolution;
    if (resolutionSelect === 'custom') {
      const size = parseInt(document.getElementById('export-size').value);
      resolution = `${size}x${size}`;
    } else {
      resolution = resolutionSelect;
    }
    
    let fps;
    if (fpsSelect === 'custom') {
      fps = parseInt(document.getElementById('export-fps-custom').value);
    } else {
      fps = parseInt(fpsSelect);
    }
    
    // Close export settings modal
    document.getElementById('export-modal').classList.remove('is-active');
    
    // Start export
    await this.exportManager.startExport({ resolution, fps, folder, transparentBackground });
  }
  
  handleCancelExport() {
    this.exportManager.cancelCurrentExport();
  }
  
  handleCaptureFrame() {
    // Open the capture modal
    document.getElementById('capture-modal').classList.add('is-active');
    
    // Pre-fill with export folder if it exists
    const exportFolder = this.exportManager.getExportFolder();
    if (exportFolder) {
      document.getElementById('capture-folder').value = exportFolder;
      document.getElementById('btn-do-capture').disabled = false;
    }
  }
  
  handleCaptureResolutionChange(event) {
    const customDiv = document.getElementById('capture-custom-resolution');
    if (event.target.value === 'custom') {
      customDiv.style.display = 'block';
    } else {
      customDiv.style.display = 'none';
    }
  }
  
  async handleChooseCaptureFolder() {
    const folder = await window.electronAPI.chooseExportFolder();
    if (folder) {
      document.getElementById('capture-folder').value = folder;
      document.getElementById('btn-do-capture').disabled = false;
    }
  }
  
  async handleDoCapture() {
    const resolutionSelect = document.getElementById('capture-resolution').value;
    const folder = document.getElementById('capture-folder').value;
    const transparentBackground = document.getElementById('capture-transparent-bg-toggle').checked;
    
    if (!folder) {
      this.showNotification('Please select an output folder', 'warning');
      return;
    }
    
    let resolution;
    if (resolutionSelect === 'custom') {
      const size = parseInt(document.getElementById('capture-size').value);
      resolution = `${size}x${size}`;
    } else {
      resolution = resolutionSelect;
    }
    
    // Close the modal
    document.getElementById('capture-modal').classList.remove('is-active');
    
    try {
      await this.exportManager.captureCurrentFrame({ resolution, folder, transparentBackground });
      this.showNotification('Frame captured successfully!', 'success');
    } catch (error) {
      this.showNotification(`Failed to capture frame: ${error.message}`, 'error');
    }
  }
  
  showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification is-${type}`;
    notification.innerHTML = `
      <button class="delete"></button>
      ${message}
    `;
    
    const deleteBtn = notification.querySelector('.delete');
    deleteBtn.addEventListener('click', () => {
      notification.remove();
    });
    
    container.appendChild(notification);
    
    // Auto-dismiss
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
  
  // Retargeting Handlers
  
  handleOpenRetargetModal() {
    const currentModel = this.modelLoader.getCurrentModelData();
    
    if (!currentModel) {
      this.showNotification('Please load a model first', 'warning');
      return;
    }
    
    // Set current model as source
    this.retargetManager.setSourceModel(currentModel);
    this.updateRetargetingUI();
    
    document.getElementById('retarget-modal').classList.add('is-active');
  }
  
  async handleLoadTargetModel() {
    try {
      const fileData = await window.electronAPI.openModelDialog();
      
      if (!fileData) return;
      
      const arrayBuffer = new Uint8Array(fileData.data).buffer;
      const modelData = await this.modelLoader.loadFromBuffer(
        arrayBuffer,
        fileData.extension.replace('.', ''),
        fileData.name
      );
      
      // Set as target model for retargeting
      this.retargetManager.setTargetModel(modelData);
      this.updateRetargetingUI();
      
      // Enable controls
      document.getElementById('btn-auto-map').disabled = false;
      document.getElementById('btn-clear-mapping').disabled = false;
      document.getElementById('btn-save-mapping').disabled = false;
      document.getElementById('btn-load-mapping').disabled = false;
      
      this.showNotification(`Target model loaded: ${fileData.name}`, 'success');
      
    } catch (error) {
      console.error('Error loading target model:', error);
      this.showNotification(`Failed to load target model: ${error.message}`, 'error');
    }
  }
  
  updateRetargetingUI() {
    const sourceInfo = this.retargetManager.sourceSkeletonInfo;
    const targetInfo = this.retargetManager.targetSkeletonInfo;
    
    // Update source info
    if (sourceInfo) {
      document.getElementById('source-rig-type').textContent = this.retargetManager.sourceRigType;
      document.getElementById('source-bone-count').textContent = sourceInfo.bones.length;
      
      // Build source bone tree
      const sourceTree = this.retargetManager.buildBoneTree(sourceInfo, true);
      document.getElementById('source-bone-tree').innerHTML = sourceTree;
      
      // Add click handlers to source bones
      this.addBoneClickHandlers('source');
    }
    
    // Update target info
    if (targetInfo) {
      document.getElementById('target-rig-type').textContent = this.retargetManager.targetRigType;
      document.getElementById('target-bone-count').textContent = targetInfo.bones.length;
      
      // Build target bone tree
      const targetTree = this.retargetManager.buildBoneTree(targetInfo, false);
      document.getElementById('target-bone-tree').innerHTML = targetTree;
      
      // Add click handlers to target bones
      this.addBoneClickHandlers('target');
    }
    
    // Update animation list
    const animations = this.animationManager.getAnimations();
    this.updateRetargetAnimationList(animations);
    
    // Update mapping display
    this.updateMappingDisplay();
  }
  
  addBoneClickHandlers(side) {
    const container = side === 'source' ? 
      document.getElementById('source-bone-tree') : 
      document.getElementById('target-bone-tree');
    
    const boneItems = container.querySelectorAll('.bone-item');
    
    boneItems.forEach(item => {
      item.addEventListener('click', () => {
        // Remove previous selection
        container.querySelectorAll('.bone-item').forEach(b => b.classList.remove('selected'));
        
        // Add selection
        item.classList.add('selected');
        
        const boneName = item.getAttribute('data-bone');
        
        if (side === 'source') {
          this.retargetManager.selectedSourceBone = boneName;
          document.getElementById('selected-source-bone').value = boneName;
        } else {
          this.retargetManager.selectedTargetBone = boneName;
          document.getElementById('selected-target-bone').value = boneName;
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
    
    animations.forEach((clip, index) => {
      const item = document.createElement('div');
      item.className = 'retarget-animation-item';
      item.innerHTML = `
        <input type="checkbox" id="retarget-anim-${index}" data-index="${index}">
        <label for="retarget-anim-${index}">${clip.name || `Animation ${index + 1}`}</label>
      `;
      container.appendChild(item);
    });
  }
  
  handleAutoMap() {
    const result = this.retargetManager.autoMapBones();
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
    const checkboxes = document.querySelectorAll('#retarget-animation-list input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
      this.showNotification('Please select at least one animation to retarget', 'warning');
      return;
    }
    
    checkboxes.forEach(cb => {
      const index = parseInt(cb.getAttribute('data-index'));
      selectedAnimations.push(index);
    });
    
    const animations = this.animationManager.getAnimations();
    const retargetedClips = [];
    
    for (const index of selectedAnimations) {
      const clip = animations[index];
      const retargetedClip = this.retargetManager.retargetAnimation(clip);
      if (retargetedClip) {
        retargetedClips.push(retargetedClip);
      }
    }
    
    if (retargetedClips.length > 0) {
      // Add retargeted animations to the target model
      this.animationManager.loadAnimations(retargetedClips);
      
      this.showNotification(
        `Successfully retargeted ${retargetedClips.length} animation(s)`,
        'success'
      );
      
      // Close modal
      document.getElementById('retarget-modal').classList.remove('is-active');
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
    document.getElementById('retargeting-section').style.display = 'none';
    document.getElementById('inline-bone-trees').style.display = 'none';
    document.getElementById('btn-add-selected-animations').disabled = true;
    this.loadedAnimationData = null;
    this.inlineRetargetingActive = false;
    this.inlineBoneMapping = {};
    this.inlineSelectedCurrentBone = null;
    this.inlineSelectedAnimBone = null;
    
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
      
      // Store loaded animation data
      this.loadedAnimationData = animationData;
      
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
      
      // If compatible or at least partially compatible, show animation selection
      if (verification.compatible || verification.matchPercentage >= 50) {
        this.displayAnimationSelection(animationData.animations);
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
    const retargetingSection = document.getElementById('retargeting-section');
    
    let statusClass = '';
    let statusIcon = '';
    
    if (verification.matchPercentage === 100) {
      statusClass = 'has-text-success';
      statusIcon = '✓';
    } else if (verification.compatible) {
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
    
    // Show retargeting section if compatibility is poor (< 80%)
    if (verification.matchPercentage < 80) {
      retargetingSection.style.display = 'block';
      this.inlineRetargetingActive = true;
    } else {
      retargetingSection.style.display = 'none';
      this.inlineRetargetingActive = false;
    }
  }
  
  displayAnimationSelection(animations) {
    const container = document.getElementById('animation-selection-list');
    
    if (!animations || animations.length === 0) {
      container.innerHTML = '<p class="has-text-grey">No animations found in file</p>';
      document.getElementById('animation-selection-container').style.display = 'none';
      return;
    }
    
    container.innerHTML = '';
    
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
          <input type="text" class="input is-small animation-rename-input" data-index="${index}" 
                 placeholder="Leave empty to keep original name" value="">
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
    
    document.getElementById('animation-selection-container').style.display = 'block';
    this.updateAddAnimationButton();
  }
  
  // Inline Retargeting Handlers (for Add Animation Modal)
  
  handleInlineAutoMap() {
    if (!this.loadedAnimationData) {
      this.showNotification('No animation file loaded', 'error');
      return;
    }
    
    const currentModel = this.modelLoader.getCurrentModelData();
    
    // Generate automatic mapping: current model -> animation file
    const result = this.retargetManager.generateAutomaticMapping(
      currentModel.skeletons.boneNames,
      this.loadedAnimationData.boneNames
    );
    
    this.inlineBoneMapping = result.mapping;
    const mappedCount = Object.keys(this.inlineBoneMapping).length;
    const confidencePercent = Math.round(result.confidence * 100);
    
    // Update UI
    document.getElementById('inline-mapped-count').textContent = mappedCount;
    document.getElementById('inline-mapping-confidence').textContent = confidencePercent + '%';
    document.getElementById('inline-mapping-info').style.display = 'block';
    document.getElementById('btn-clear-mapping-inline').disabled = false;
    
    this.showNotification(
      `Auto-mapped ${mappedCount} bones with ${confidencePercent}% confidence`,
      confidencePercent > 70 ? 'success' : 'warning'
    );
    
    // Update mappings display if tree is visible
    if (document.getElementById('inline-bone-trees').style.display === 'block') {
      this.updateInlineMappingDisplay();
    }
    
    // Enable add button if animations are selected
    this.updateAddAnimationButton();
  }
  
  handleInlineClearMapping() {
    this.inlineBoneMapping = {};
    document.getElementById('inline-mapped-count').textContent = '0';
    document.getElementById('inline-mapping-confidence').textContent = '0%';
    document.getElementById('inline-mapping-info').style.display = 'none';
    document.getElementById('btn-clear-mapping-inline').disabled = true;
    
    this.updateInlineMappingDisplay();
    this.showNotification('Mappings cleared', 'info');
  }
  
  handleToggleBoneTrees() {
    const treeContainer = document.getElementById('inline-bone-trees');
    const button = document.getElementById('btn-toggle-bone-trees');
    
    if (treeContainer.style.display === 'none') {
      // Show trees
      treeContainer.style.display = 'block';
      button.querySelector('span:last-child').textContent = 'Hide Bone Trees';
      
      // Build bone trees
      this.buildInlineBoneTrees();
    } else {
      // Hide trees
      treeContainer.style.display = 'none';
      button.querySelector('span:last-child').textContent = 'Show Bone Trees';
    }
  }
  
  buildInlineBoneTrees() {
    const currentModel = this.modelLoader.getCurrentModelData();
    
    // Build current model tree
    const currentTreeHtml = this.buildSimpleBoneTree(currentModel.skeletons.boneNames, 'current');
    document.getElementById('inline-current-model-tree').innerHTML = currentTreeHtml;
    
    // Build animation file tree
    const animTreeHtml = this.buildSimpleBoneTree(this.loadedAnimationData.boneNames, 'anim');
    document.getElementById('inline-animation-file-tree').innerHTML = animTreeHtml;
    
    // Add click handlers
    this.addInlineBoneClickHandlers();
    
    // Update mapping display
    this.updateInlineMappingDisplay();
  }
  
  buildSimpleBoneTree(boneNames, side) {
    if (!boneNames || boneNames.length === 0) {
      return '<p class="has-text-grey is-size-7">No bones</p>';
    }
    
    let html = '<div class="bone-tree-simple">';
    boneNames.forEach(boneName => {
      const isMapped = side === 'current' ?
        Object.keys(this.inlineBoneMapping).includes(boneName) :
        Object.values(this.inlineBoneMapping).includes(boneName);
      
      const mappedClass = isMapped ? 'bone-mapped' : '';
      html += `
        <div class="bone-item-inline ${mappedClass}" data-bone="${boneName}" data-side="${side}">
          <span class="bone-name">${boneName}</span>
        </div>
      `;
    });
    html += '</div>';
    
    return html;
  }
  
  addInlineBoneClickHandlers() {
    // Current model bones
    document.querySelectorAll('[data-side="current"]').forEach(item => {
      item.addEventListener('click', () => {
        // Clear previous selection
        document.querySelectorAll('[data-side="current"]').forEach(b => b.classList.remove('selected'));
        item.classList.add('selected');
        
        const boneName = item.getAttribute('data-bone');
        this.inlineSelectedCurrentBone = boneName;
        document.getElementById('inline-selected-current-bone').value = boneName;
        
        this.updateInlineCreateMappingButton();
      });
    });
    
    // Animation file bones
    document.querySelectorAll('[data-side="anim"]').forEach(item => {
      item.addEventListener('click', () => {
        // Clear previous selection
        document.querySelectorAll('[data-side="anim"]').forEach(b => b.classList.remove('selected'));
        item.classList.add('selected');
        
        const boneName = item.getAttribute('data-bone');
        this.inlineSelectedAnimBone = boneName;
        document.getElementById('inline-selected-anim-bone').value = boneName;
        
        this.updateInlineCreateMappingButton();
      });
    });
  }
  
  updateInlineCreateMappingButton() {
    const btn = document.getElementById('btn-create-mapping-inline');
    btn.disabled = !(this.inlineSelectedCurrentBone && this.inlineSelectedAnimBone);
  }
  
  handleInlineCreateMapping() {
    if (!this.inlineSelectedCurrentBone || !this.inlineSelectedAnimBone) {
      this.showNotification('Please select both bones', 'warning');
      return;
    }
    
    this.inlineBoneMapping[this.inlineSelectedCurrentBone] = this.inlineSelectedAnimBone;
    
    // Update UI
    const mappedCount = Object.keys(this.inlineBoneMapping).length;
    document.getElementById('inline-mapped-count').textContent = mappedCount;
    document.getElementById('inline-mapping-info').style.display = 'block';
    document.getElementById('btn-clear-mapping-inline').disabled = false;
    
    this.showNotification(
      `Mapped: ${this.inlineSelectedCurrentBone} → ${this.inlineSelectedAnimBone}`,
      'success'
    );
    
    // Clear selection
    this.inlineSelectedCurrentBone = null;
    this.inlineSelectedAnimBone = null;
    document.getElementById('inline-selected-current-bone').value = '';
    document.getElementById('inline-selected-anim-bone').value = '';
    document.getElementById('btn-create-mapping-inline').disabled = true;
    
    // Rebuild trees to show new mapping
    this.buildInlineBoneTrees();
    this.updateAddAnimationButton();
  }
  
  updateInlineMappingDisplay() {
    const container = document.getElementById('inline-mapping-list');
    
    if (Object.keys(this.inlineBoneMapping).length === 0) {
      container.innerHTML = '<p class="has-text-grey is-size-7">No mappings yet</p>';
      return;
    }
    
    let html = '';
    Object.entries(this.inlineBoneMapping).forEach(([source, target]) => {
      html += `
        <div class="mapping-item-inline">
          <span class="is-size-7">${source} → ${target}</span>
          <button class="button is-danger is-small" data-source="${source}" style="margin-left: auto;">✕</button>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
    // Add remove handlers
    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const source = btn.getAttribute('data-source');
        delete this.inlineBoneMapping[source];
        
        const mappedCount = Object.keys(this.inlineBoneMapping).length;
        document.getElementById('inline-mapped-count').textContent = mappedCount;
        
        if (mappedCount === 0) {
          document.getElementById('inline-mapping-info').style.display = 'none';
          document.getElementById('btn-clear-mapping-inline').disabled = true;
        }
        
        this.updateInlineMappingDisplay();
        if (document.getElementById('inline-bone-trees').style.display === 'block') {
          this.buildInlineBoneTrees();
        }
        
        this.showNotification(`Removed mapping for ${source}`, 'info');
      });
    });
  }
  
  updateAddAnimationButton() {
    const checkboxes = document.querySelectorAll('.animation-checkbox:checked');
    const hasMappingIfNeeded = !this.inlineRetargetingActive || Object.keys(this.inlineBoneMapping).length > 0;
    document.getElementById('btn-add-selected-animations').disabled = checkboxes.length === 0 || !hasMappingIfNeeded;
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
    
    // If retargeting is active and we have mappings, retarget the animations
    if (this.inlineRetargetingActive && Object.keys(this.inlineBoneMapping).length > 0) {
      const currentModel = this.modelLoader.getCurrentModelData();
      
      // Temporarily set up retargeting context
      this.retargetManager.setSourceModel({
        model: currentModel.model,
        skeletons: currentModel.skeletons
      });
      
      this.retargetManager.setTargetModel({
        model: currentModel.model, // Using same model
        skeletons: this.loadedAnimationData.skeletons
      });
      
      // Set the bone mapping
      this.retargetManager.boneMapping = this.inlineBoneMapping;
      
      // Retarget each animation
      const retargetedAnimations = [];
      for (const animation of selectedAnimations) {
        try {
          // For add-animation workflow, we need to adapt animation to current model
          // This is a simplified retargeting - we rename bones in the animation tracks
          const retargetedClip = this.retargetAnimationForCurrentModel(animation);
          if (retargetedClip) {
            retargetedAnimations.push(retargetedClip);
          }
        } catch (error) {
          console.error('Failed to retarget animation:', animation.name, error);
        }
      }
      
      if (retargetedAnimations.length > 0) {
        selectedAnimations = retargetedAnimations;
        this.showNotification(
          `Retargeted ${retargetedAnimations.length} animation(s)`,
          'success'
        );
      } else {
        this.showNotification('Failed to retarget animations', 'error');
        return;
      }
    }
    
    // Add animations to the animation manager
    const totalAnimations = this.animationManager.addAnimations(selectedAnimations);
    
    this.showNotification(
      `Successfully added ${selectedAnimations.length} animation(s)! Total animations: ${totalAnimations}`,
      'success'
    );
    
    // Close modal
    document.getElementById('add-animation-modal').classList.remove('is-active');
  }
  
  retargetAnimationForCurrentModel(sourceClip) {
    // Clone the animation clip
    const newClip = sourceClip.clone();
    newClip.name = sourceClip.name;
    
    // Remap track names based on bone mapping
    const newTracks = [];
    
    for (const track of newClip.tracks) {
      // Extract bone name from track name (format: boneName.property)
      const trackParts = track.name.split('.');
      const boneName = trackParts.slice(0, -1).join('.');
      const property = trackParts[trackParts.length - 1];
      
      // Check if this bone is mapped
      const mappedBone = this.inlineBoneMapping[boneName];
      
      if (mappedBone) {
        // Create new track with mapped bone name
        const newTrackName = `${mappedBone}.${property}`;
        const TrackType = track.constructor;
        const newTrack = new TrackType(newTrackName, track.times, track.values);
        newTracks.push(newTrack);
      } else {
        // Keep original track if no mapping found
        newTracks.push(track);
      }
    }
    
    newClip.tracks = newTracks;
    return newClip;
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
    header.innerHTML = `<div class="material-name">${materialData.name}</div>`;
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
    button.textContent = isEmpty ? 'Add' : 'Change';
    button.setAttribute('data-material-uuid', materialUuid);
    button.setAttribute('data-texture-key', textureKey);
    
    button.addEventListener('click', () => {
      this.handleChangeTexture(materialUuid, textureKey);
    });
    
    actions.appendChild(button);

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
   * Clear texture display
   */
  clearTextureDisplay() {
    const container = document.getElementById('texture-list');
    container.innerHTML = '<div class="empty-state"><p class="has-text-grey">No model loaded</p></div>';
  }
}

