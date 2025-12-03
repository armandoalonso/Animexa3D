/**
 * ExportUIController
 * 
 * Handles UI interactions for export operations including:
 * - Opening export modal
 * - Configuring export settings (resolution, FPS)
 * - Starting and canceling exports
 * - Frame capture functionality
 * 
 * This controller is a thin adapter layer between UI events and
 * the underlying ExportManager.
 */

export class ExportUIController {
  constructor(dependencies) {
    const {
      exportManager,
      notificationService
    } = dependencies;

    this.exportManager = exportManager;
    this.notificationService = notificationService;
  }

  /**
   * Initialize event listeners for export operations
   */
  initEventListeners() {
    // Export modal listeners
    document.getElementById('export-resolution').addEventListener('change', (e) => this.handleResolutionChange(e));
    document.getElementById('export-fps').addEventListener('change', (e) => this.handleFpsChange(e));
    document.getElementById('btn-choose-folder').addEventListener('click', () => this.handleChooseExportFolder());
    document.getElementById('btn-start-export').addEventListener('click', () => this.handleStartExport());
    document.getElementById('btn-cancel-export').addEventListener('click', () => this.handleCancelExport());
    
    // Capture modal listeners
    document.getElementById('capture-resolution').addEventListener('change', (e) => this.handleCaptureResolutionChange(e));
    document.getElementById('btn-choose-capture-folder').addEventListener('click', () => this.handleChooseCaptureFolder());
    document.getElementById('btn-do-capture').addEventListener('click', () => this.handleDoCapture());
  }

  /**
   * Open the export modal
   */
  handleOpenExportModal() {
    document.getElementById('export-modal').classList.add('is-active');
  }

  /**
   * Handle resolution dropdown change
   */
  handleResolutionChange(event) {
    const customDiv = document.getElementById('custom-resolution');
    if (event.target.value === 'custom') {
      customDiv.style.display = 'block';
    } else {
      customDiv.style.display = 'none';
    }
    this.updateExportButton();
  }

  /**
   * Handle FPS dropdown change
   */
  handleFpsChange(event) {
    const customDiv = document.getElementById('custom-fps');
    if (event.target.value === 'custom') {
      customDiv.style.display = 'block';
    } else {
      customDiv.style.display = 'none';
    }
  }

  /**
   * Choose export folder
   */
  async handleChooseExportFolder() {
    const folder = await window.electronAPI.chooseExportFolder();
    if (folder) {
      document.getElementById('export-folder').value = folder;
      this.exportManager.setExportFolder(folder);
      this.updateExportButton();
    }
  }

  /**
   * Update export button enabled state
   */
  updateExportButton() {
    const folder = document.getElementById('export-folder').value;
    const resolution = document.getElementById('export-resolution').value;
    const btn = document.getElementById('btn-start-export');
    
    btn.disabled = !folder || !resolution;
  }

  /**
   * Start the export process
   */
  async handleStartExport() {
    const resolutionSelect = document.getElementById('export-resolution').value;
    const fpsSelect = document.getElementById('export-fps').value;
    const folder = this.exportManager.getExportFolder();
    const transparentBackground = document.getElementById('transparent-bg-toggle').checked;
    
    if (!folder) {
      this.notificationService.showNotification('Please select an output folder', 'error');
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

  /**
   * Cancel the current export
   */
  handleCancelExport() {
    this.exportManager.cancelCurrentExport();
  }

  /**
   * Open capture frame modal
   */
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

  /**
   * Handle capture resolution dropdown change
   */
  handleCaptureResolutionChange(event) {
    const customDiv = document.getElementById('capture-custom-resolution');
    if (event.target.value === 'custom') {
      customDiv.style.display = 'block';
    } else {
      customDiv.style.display = 'none';
    }
  }

  /**
   * Choose capture folder
   */
  async handleChooseCaptureFolder() {
    const folder = await window.electronAPI.chooseExportFolder();
    if (folder) {
      document.getElementById('capture-folder').value = folder;
      document.getElementById('btn-do-capture').disabled = false;
    }
  }

  /**
   * Capture current frame
   */
  async handleDoCapture() {
    const resolutionSelect = document.getElementById('capture-resolution').value;
    const folder = document.getElementById('capture-folder').value;
    const transparentBackground = document.getElementById('capture-transparent-bg-toggle').checked;
    
    if (!folder) {
      this.notificationService.showNotification('Please select an output folder', 'warning');
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
      this.notificationService.showNotification('Frame captured successfully!', 'success');
    } catch (error) {
      this.notificationService.showNotification(`Failed to capture frame: ${error.message}`, 'error');
    }
  }
}
