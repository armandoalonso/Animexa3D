/**
 * ExportUIAdapter
 * Handles all UI interactions for export operations.
 * This is the only class that should manipulate the DOM during exports.
 */
export class ExportUIAdapter {
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  /**
   * Show the export progress modal
   */
  showProgressModal() {
    const progressModal = document.getElementById('progress-modal');
    if (progressModal) {
      progressModal.classList.add('is-active');
    }
  }

  /**
   * Hide the export progress modal
   */
  hideProgressModal() {
    const progressModal = document.getElementById('progress-modal');
    if (progressModal) {
      progressModal.classList.remove('is-active');
    }
  }

  /**
   * Update progress bar and text
   * @param {number} progress - Progress percentage (0-100)
   * @param {number} currentFrame - Current frame number
   * @param {number} totalFrames - Total frame count
   */
  updateProgressUI(progress, currentFrame, totalFrames) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressBar) {
      progressBar.value = progress;
    }

    if (progressText) {
      progressText.textContent = `Exporting frame ${currentFrame} of ${totalFrames}...`;
    }
  }

  /**
   * Update estimated time remaining
   * @param {number} etaSeconds - Estimated seconds remaining
   */
  updateETAUI(etaSeconds) {
    const etaElement = document.getElementById('progress-eta');
    if (etaElement) {
      etaElement.textContent = `Estimated time remaining: ${etaSeconds}s`;
    }
  }

  /**
   * Show export completion notification
   * @param {number} frameCount - Number of frames exported
   * @param {string} folder - Output folder path
   */
  showExportComplete(frameCount, folder) {
    if (this.uiManager) {
      this.uiManager.showNotification(
        `Export complete! ${frameCount} frames saved to ${folder}`,
        'success'
      );
    }
  }

  /**
   * Show export error notification
   * @param {string} errorMessage - Error message to display
   */
  showExportError(errorMessage) {
    if (this.uiManager) {
      this.uiManager.showNotification(
        `Export failed: ${errorMessage}`,
        'error'
      );
    }
  }

  /**
   * Show export cancelled notification
   */
  showExportCancelled() {
    if (this.uiManager) {
      this.uiManager.showNotification('Export cancelled', 'warning');
    }
  }

  /**
   * Show export starting notification
   */
  showExportStarting() {
    if (this.uiManager) {
      this.uiManager.showNotification('Starting export...', 'info', 2000);
    }
  }

  /**
   * Show model export progress notification
   */
  showModelExportProgress() {
    if (this.uiManager) {
      this.uiManager.showNotification('Exporting model...', 'info', 2000);
    }
  }

  /**
   * Show model export success notification
   * @param {string} filename - Name of exported file
   */
  showModelExportSuccess(filename) {
    if (this.uiManager) {
      this.uiManager.showNotification(
        `Model exported successfully: ${filename}`,
        'success'
      );
    }
  }

  /**
   * Show model export error notification
   * @param {string} errorMessage - Error message to display
   */
  showModelExportError(errorMessage) {
    if (this.uiManager) {
      this.uiManager.showNotification(
        `Export failed: ${errorMessage}`,
        'error'
      );
    }
  }

  /**
   * Show no animation selected error
   */
  showNoAnimationError() {
    if (this.uiManager) {
      this.uiManager.showNotification('No animation selected', 'error');
    }
  }

  /**
   * Show system notification via Electron
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @returns {Promise} Promise that resolves when notification is shown
   */
  async showSystemNotification(title, body) {
    if (window.electronAPI && window.electronAPI.showNotification) {
      return await window.electronAPI.showNotification(title, body);
    }
  }
}
