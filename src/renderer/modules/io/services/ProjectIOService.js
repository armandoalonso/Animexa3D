/**
 * ProjectIOService
 * Wrapper for file I/O operations through Electron API
 * This is an injected dependency to allow for testing with mocks
 */
export class ProjectIOService {
  constructor(electronAPI) {
    if (!electronAPI) {
      throw new Error('Electron API is required');
    }
    this.electronAPI = electronAPI;
  }

  /**
   * Show save project dialog
   * @returns {Promise<string|null>} Selected file path or null if cancelled
   */
  async showSaveDialog() {
    return await this.electronAPI.saveProjectDialog();
  }

  /**
   * Show open project dialog
   * @returns {Promise<string|null>} Selected file path or null if cancelled
   */
  async showOpenDialog() {
    return await this.electronAPI.openProjectDialog();
  }

  /**
   * Save project to file (zip format)
   * @param {string} path - File path to save to
   * @param {Object} projectData - Serialized project data
   * @param {Array} textureFiles - Texture files to include
   * @returns {Promise<Object>} Result with success flag and optional error
   */
  async saveProjectToFile(path, projectData, textureFiles) {
    if (!path) {
      throw new Error('Save path is required');
    }

    if (!projectData) {
      throw new Error('Project data is required');
    }

    const result = await this.electronAPI.saveProject(path, projectData, textureFiles || []);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save project');
    }

    return result;
  }

  /**
   * Load project from file (unzip and parse)
   * @param {string} path - File path to load from
   * @returns {Promise<Object>} Result with project data and extracted path
   */
  async loadProjectFromFile(path) {
    if (!path) {
      throw new Error('Load path is required');
    }

    const result = await this.electronAPI.loadProject(path);

    if (!result.success) {
      throw new Error(result.error || 'Failed to load project');
    }

    return {
      projectData: result.data,
      extractedPath: result.extractedPath
    };
  }

  /**
   * Read file as buffer
   * @param {string} path - File path
   * @returns {Promise<ArrayBuffer>} File buffer
   */
  async readFileAsBuffer(path) {
    if (!path) {
      throw new Error('File path is required');
    }

    return await this.electronAPI.readFileAsBuffer(path);
  }

  /**
   * Check if file exists
   * @param {string} path - File path
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(path) {
    try {
      await this.readFileAsBuffer(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file info (size, extension, etc.)
   * @param {string} path - File path
   * @returns {Object} File information
   */
  static getFileInfo(path) {
    if (!path || typeof path !== 'string') {
      throw new Error('Valid file path is required');
    }

    const parts = path.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    const extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';

    return {
      path,
      filename,
      extension,
      basename: filename.replace(`.${extension}`, '')
    };
  }
}
