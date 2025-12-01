export class UIManager {
  constructor(sceneManager, modelLoader, animationManager, exportManager, retargetManager) {
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.animationManager = animationManager;
    this.exportManager = exportManager;
    this.retargetManager = retargetManager;
    
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
    try {
      const fileData = await window.electronAPI.openModelDialog();
      
      if (!fileData) return; // User cancelled
      
      const arrayBuffer = new Uint8Array(fileData.data).buffer;
      const modelData = await this.modelLoader.loadFromBuffer(
        arrayBuffer,
        fileData.extension.replace('.', ''),
        fileData.name
      );
      
      // Load animations
      if (modelData.animations && modelData.animations.length > 0) {
        this.animationManager.loadAnimations(modelData.animations);
      } else {
        this.animationManager.loadAnimations([]);
        this.showNotification('Model has no animations', 'warning');
      }
      
      // Enable retarget button after model is loaded
      document.getElementById('btn-retarget').disabled = false;
      
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
}
