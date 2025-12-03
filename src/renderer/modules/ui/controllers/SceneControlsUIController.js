/**
 * SceneControlsUIController
 * 
 * Handles UI interactions for scene controls including:
 * - Background color
 * - Camera presets
 * - Grid visibility
 * - Light position and intensity
 * - Custom camera preset management
 * 
 * This controller is a thin adapter layer between UI events and SceneManager.
 */

export class SceneControlsUIController {
  constructor(dependencies) {
    const {
      sceneManager,
      cameraPresetManager,
      notificationService
    } = dependencies;

    this.sceneManager = sceneManager;
    this.cameraPresetManager = cameraPresetManager;
    this.notificationService = notificationService;
  }

  /**
   * Initialize event listeners for scene controls
   */
  initEventListeners() {
    // Scene controls
    document.getElementById('bg-color').addEventListener('input', (e) => this.handleBackgroundColor(e));
    document.getElementById('camera-preset').addEventListener('change', (e) => this.handleCameraPreset(e));
    document.getElementById('grid-toggle').addEventListener('change', (e) => this.handleGridToggle(e));
    
    // Custom camera preset controls
    document.getElementById('btn-save-camera-view').addEventListener('click', () => this.handleSaveCameraView());
    document.getElementById('custom-camera-preset').addEventListener('change', (e) => this.handleLoadCustomPreset(e));
    document.getElementById('btn-delete-camera-preset').addEventListener('click', () => this.handleDeleteCameraPreset());
    
    // Light controls
    document.getElementById('light-x').addEventListener('input', () => this.handleLightPosition());
    document.getElementById('light-y').addEventListener('input', () => this.handleLightPosition());
    document.getElementById('light-z').addEventListener('input', () => this.handleLightPosition());
    document.getElementById('dir-light-intensity').addEventListener('input', (e) => this.handleDirectionalLightIntensity(e));
    document.getElementById('amb-light-intensity').addEventListener('input', (e) => this.handleAmbientLightIntensity(e));
  }

  /**
   * Handle background color change
   */
  handleBackgroundColor(event) {
    const color = event.target.value;
    this.sceneManager.setBackgroundColor(color);
  }

  /**
   * Handle camera preset selection
   */
  handleCameraPreset(event) {
    this.sceneManager.applyCameraPreset(event.target.value);
  }

  /**
   * Handle grid visibility toggle
   */
  handleGridToggle(event) {
    this.sceneManager.toggleGrid(event.target.checked);
  }

  /**
   * Handle light position change
   */
  handleLightPosition() {
    const x = parseFloat(document.getElementById('light-x').value);
    const y = parseFloat(document.getElementById('light-y').value);
    const z = parseFloat(document.getElementById('light-z').value);
    
    document.getElementById('light-x-value').textContent = x;
    document.getElementById('light-y-value').textContent = y;
    document.getElementById('light-z-value').textContent = z;
    
    this.sceneManager.updateLightPosition(x, y, z);
  }

  /**
   * Handle directional light intensity change
   */
  handleDirectionalLightIntensity(event) {
    const value = parseFloat(event.target.value);
    document.getElementById('dir-light-value').textContent = value;
    this.sceneManager.updateDirectionalLightIntensity(value);
  }

  /**
   * Handle ambient light intensity change
   */
  handleAmbientLightIntensity(event) {
    const value = parseFloat(event.target.value);
    document.getElementById('amb-light-value').textContent = value;
    this.sceneManager.updateAmbientLightIntensity(value);
  }

  /**
   * Handle saving current camera view as preset
   */
  handleSaveCameraView() {
    // Open modal for naming the preset
    const modal = document.getElementById('save-camera-preset-modal');
    const input = document.getElementById('camera-preset-name');
    input.value = '';
    modal.classList.add('is-active');
  }

  /**
   * Confirm and save camera preset
   */
  handleConfirmSaveCameraPreset() {
    const name = document.getElementById('camera-preset-name').value.trim();
    
    if (!name) {
      this.notificationService.showNotification('Please enter a preset name', 'warning');
      return;
    }
    
    // Get current camera state from scene manager
    const cameraState = this.sceneManager.getCurrentCameraState();
    
    if (!cameraState) {
      this.notificationService.showNotification('Unable to capture camera state', 'error');
      return;
    }
    
    // Save preset
    this.cameraPresetManager.savePreset(name, cameraState);
    
    // Close modal
    document.getElementById('save-camera-preset-modal').classList.remove('is-active');
    
    // Refresh the custom presets dropdown
    this.refreshCustomCameraPresets();
    
    this.notificationService.showNotification(`Camera preset "${name}" saved`, 'success');
  }

  /**
   * Handle loading a custom camera preset
   */
  handleLoadCustomPreset(event) {
    const presetName = event.target.value;
    
    if (!presetName) return;
    
    const preset = this.cameraPresetManager.loadPreset(presetName);
    
    if (!preset) {
      this.notificationService.showNotification(`Preset "${presetName}" not found`, 'error');
      return;
    }
    
    // Apply the camera preset
    this.sceneManager.applyCameraState(preset);
    
    // Enable delete button
    document.getElementById('btn-delete-camera-preset').disabled = false;
    
    this.notificationService.showNotification(`Loaded preset "${presetName}"`, 'success');
  }

  /**
   * Handle deleting current custom camera preset
   */
  handleDeleteCameraPreset() {
    const select = document.getElementById('custom-camera-preset');
    const presetName = select.value;
    
    if (!presetName) {
      this.notificationService.showNotification('No preset selected', 'warning');
      return;
    }
    
    const confirmed = confirm(`Delete camera preset "${presetName}"?`);
    if (!confirmed) return;
    
    this.cameraPresetManager.deletePreset(presetName);
    
    // Refresh the dropdown
    this.refreshCustomCameraPresets();
    
    // Disable delete button
    document.getElementById('btn-delete-camera-preset').disabled = true;
    
    this.notificationService.showNotification(`Deleted preset "${presetName}"`, 'success');
  }

  /**
   * Refresh custom camera presets dropdown
   */
  refreshCustomCameraPresets() {
    const select = document.getElementById('custom-camera-preset');
    const presets = this.cameraPresetManager.getAllPresets();
    
    // Clear existing options except the first (placeholder)
    select.innerHTML = '<option value="">Load Custom Preset...</option>';
    
    // Add custom presets
    Object.keys(presets).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    
    // Disable delete button if no preset is selected
    document.getElementById('btn-delete-camera-preset').disabled = !select.value;
  }
}
