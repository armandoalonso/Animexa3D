/**
 * ProjectUIAdapter
 * Handles all UI-related operations for project management
 * Thin adapter layer - no business logic
 */
export class ProjectUIAdapter {
  constructor() {
    this.loadingOverlay = null;
    this.emptyState = null;
    this.buttons = {};
    this.initialized = false;
  }

  /**
   * Initialize UI element references
   */
  initialize() {
    if (this.initialized) return;

    this.loadingOverlay = document.getElementById('loading-overlay');
    this.emptyState = document.getElementById('empty-state');
    
    this.buttons = {
      retarget: document.getElementById('btn-retarget'),
      addAnimation: document.getElementById('btn-add-animation'),
      saveProject: document.getElementById('btn-save-project'),
      exportModel: document.getElementById('btn-export-model')
    };

    this.initialized = true;
  }

  /**
   * Show loading overlay
   */
  showLoadingOverlay() {
    this.initialize();
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('active');
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay() {
    this.initialize();
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('active');
    }
  }

  /**
   * Hide empty state
   */
  hideEmptyState() {
    this.initialize();
    if (this.emptyState) {
      this.emptyState.classList.add('hidden');
    }
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    this.initialize();
    if (this.emptyState) {
      this.emptyState.classList.remove('hidden');
    }
  }

  /**
   * Enable project buttons after successful load
   */
  enableProjectButtons() {
    this.initialize();
    
    Object.values(this.buttons).forEach(button => {
      if (button) {
        button.disabled = false;
      }
    });
  }

  /**
   * Disable project buttons
   */
  disableProjectButtons() {
    this.initialize();
    
    Object.values(this.buttons).forEach(button => {
      if (button) {
        button.disabled = true;
      }
    });
  }

  /**
   * Update UI for loaded project
   * @param {Object} projectMetadata - Project metadata
   */
  updateProjectUI(projectMetadata) {
    this.hideEmptyState();
    this.enableProjectButtons();
    // Additional UI updates can be added here
  }

  /**
   * Update scene UI controls with loaded values
   * @param {Object} sceneSettings - Scene settings to apply to UI
   */
  updateSceneControls(sceneSettings) {
    if (!sceneSettings) return;

    // Background color
    if (sceneSettings.backgroundColor) {
      const bgColorInput = document.getElementById('bg-color');
      if (bgColorInput) {
        bgColorInput.value = sceneSettings.backgroundColor;
      }
    }

    // Grid visibility
    if (typeof sceneSettings.gridVisible !== 'undefined') {
      const gridToggle = document.getElementById('grid-toggle');
      if (gridToggle) {
        gridToggle.checked = sceneSettings.gridVisible;
      }
    }

    // Lighting controls
    if (sceneSettings.lighting) {
      this._updateLightingControls(sceneSettings.lighting);
    }
  }

  /**
   * Update lighting controls
   * @private
   */
  _updateLightingControls(lighting) {
    // Ambient light
    if (typeof lighting.ambientIntensity !== 'undefined') {
      const ambInput = document.getElementById('amb-light-intensity');
      const ambValue = document.getElementById('amb-light-value');
      if (ambInput) ambInput.value = lighting.ambientIntensity;
      if (ambValue) ambValue.textContent = lighting.ambientIntensity;
    }

    // Directional light
    if (typeof lighting.directionalIntensity !== 'undefined') {
      const dirInput = document.getElementById('dir-light-intensity');
      const dirValue = document.getElementById('dir-light-value');
      if (dirInput) dirInput.value = lighting.directionalIntensity;
      if (dirValue) dirValue.textContent = lighting.directionalIntensity;
    }

    // Directional light position
    if (lighting.directionalPosition) {
      const pos = lighting.directionalPosition;
      
      const xInput = document.getElementById('light-x');
      const yInput = document.getElementById('light-y');
      const zInput = document.getElementById('light-z');
      
      const xValue = document.getElementById('light-x-value');
      const yValue = document.getElementById('light-y-value');
      const zValue = document.getElementById('light-z-value');

      if (xInput) xInput.value = pos.x;
      if (yInput) yInput.value = pos.y;
      if (zInput) zInput.value = pos.z;
      
      if (xValue) xValue.textContent = pos.x;
      if (yValue) yValue.textContent = pos.y;
      if (zValue) zValue.textContent = pos.z;
    }
  }

  /**
   * Show notification message
   * @param {string} message - Message to display
   * @param {string} type - Notification type (success, error, info)
   */
  showNotification(message, type = 'info') {
    if (window.uiManager) {
      window.uiManager.showNotification(message, type);
    } else {
      // Fallback if UIManager not available
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Show save success notification
   * @param {string} filePath - Saved file path
   */
  showSaveSuccess(filePath) {
    const filename = filePath.split(/[/\\]/).pop();
    this.showNotification(`Project saved: ${filename}`, 'success');
  }

  /**
   * Show save error notification
   * @param {Error} error - Error object
   */
  showSaveError(error) {
    this.showNotification(`Failed to save project: ${error.message}`, 'error');
  }

  /**
   * Show load success notification
   */
  showLoadSuccess() {
    this.showNotification('Project loaded successfully', 'success');
  }

  /**
   * Show load error notification
   * @param {Error} error - Error object
   */
  showLoadError(error) {
    this.showNotification(`Failed to load project: ${error.message}`, 'error');
  }

  /**
   * Show validation error notification
   * @param {Array} errors - Array of error messages
   */
  showValidationErrors(errors) {
    const message = errors.length === 1 
      ? errors[0] 
      : `Multiple validation errors: ${errors.join(', ')}`;
    this.showNotification(message, 'error');
  }

  /**
   * Reset UI to initial state
   */
  reset() {
    this.hideLoadingOverlay();
    this.showEmptyState();
    this.disableProjectButtons();
  }
}
