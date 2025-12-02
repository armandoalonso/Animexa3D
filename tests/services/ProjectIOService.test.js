import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectIOService } from '../../src/renderer/modules/io/services/ProjectIOService.js';

describe('ProjectIOService', () => {
  let mockElectronAPI;
  let ioService;

  beforeEach(() => {
    mockElectronAPI = {
      saveProjectDialog: vi.fn(),
      openProjectDialog: vi.fn(),
      saveProject: vi.fn(),
      loadProject: vi.fn(),
      readFileAsBuffer: vi.fn()
    };

    ioService = new ProjectIOService(mockElectronAPI);
  });

  describe('constructor', () => {
    it('should require electron API', () => {
      expect(() => {
        new ProjectIOService(null);
      }).toThrow('Electron API is required');
    });

    it('should store electron API reference', () => {
      expect(ioService.electronAPI).toBe(mockElectronAPI);
    });
  });

  describe('showSaveDialog', () => {
    it('should call electron API save dialog', async () => {
      mockElectronAPI.saveProjectDialog.mockResolvedValue('/path/to/project.animex');

      const result = await ioService.showSaveDialog();

      expect(mockElectronAPI.saveProjectDialog).toHaveBeenCalled();
      expect(result).toBe('/path/to/project.animex');
    });

    it('should return null if user cancels', async () => {
      mockElectronAPI.saveProjectDialog.mockResolvedValue(null);

      const result = await ioService.showSaveDialog();

      expect(result).toBeNull();
    });
  });

  describe('showOpenDialog', () => {
    it('should call electron API open dialog', async () => {
      mockElectronAPI.openProjectDialog.mockResolvedValue('/path/to/project.animex');

      const result = await ioService.showOpenDialog();

      expect(mockElectronAPI.openProjectDialog).toHaveBeenCalled();
      expect(result).toBe('/path/to/project.animex');
    });

    it('should return null if user cancels', async () => {
      mockElectronAPI.openProjectDialog.mockResolvedValue(null);

      const result = await ioService.showOpenDialog();

      expect(result).toBeNull();
    });
  });

  describe('saveProjectToFile', () => {
    it('should save project with all data', async () => {
      const projectData = { version: '1.0.0', model: {} };
      const textureFiles = [{ sourcePath: 'texture.png' }];
      
      mockElectronAPI.saveProject.mockResolvedValue({ success: true });

      await ioService.saveProjectToFile('/path/to/save', projectData, textureFiles);

      expect(mockElectronAPI.saveProject).toHaveBeenCalledWith(
        '/path/to/save',
        projectData,
        textureFiles
      );
    });

    it('should throw error if path is missing', async () => {
      await expect(ioService.saveProjectToFile(null, {}, [])).rejects.toThrow(
        'Save path is required'
      );
    });

    it('should throw error if project data is missing', async () => {
      await expect(ioService.saveProjectToFile('/path', null, [])).rejects.toThrow(
        'Project data is required'
      );
    });

    it('should throw error if save fails', async () => {
      mockElectronAPI.saveProject.mockResolvedValue({ 
        success: false, 
        error: 'Disk full' 
      });

      await expect(
        ioService.saveProjectToFile('/path', {}, [])
      ).rejects.toThrow('Disk full');
    });

    it('should handle empty texture files array', async () => {
      mockElectronAPI.saveProject.mockResolvedValue({ success: true });

      await ioService.saveProjectToFile('/path', { version: '1.0.0' }, []);

      expect(mockElectronAPI.saveProject).toHaveBeenCalledWith(
        '/path',
        { version: '1.0.0' },
        []
      );
    });

    it('should default texture files to empty array if not provided', async () => {
      mockElectronAPI.saveProject.mockResolvedValue({ success: true });

      await ioService.saveProjectToFile('/path', { version: '1.0.0' });

      expect(mockElectronAPI.saveProject).toHaveBeenCalledWith(
        '/path',
        { version: '1.0.0' },
        []
      );
    });
  });

  describe('loadProjectFromFile', () => {
    it('should load and return project data', async () => {
      const mockData = { version: '1.0.0', model: {} };
      mockElectronAPI.loadProject.mockResolvedValue({
        success: true,
        data: mockData,
        extractedPath: '/temp/extracted'
      });

      const result = await ioService.loadProjectFromFile('/path/to/project.animex');

      expect(mockElectronAPI.loadProject).toHaveBeenCalledWith('/path/to/project.animex');
      expect(result).toEqual({
        projectData: mockData,
        extractedPath: '/temp/extracted'
      });
    });

    it('should throw error if path is missing', async () => {
      await expect(ioService.loadProjectFromFile(null)).rejects.toThrow(
        'Load path is required'
      );
    });

    it('should throw error if load fails', async () => {
      mockElectronAPI.loadProject.mockResolvedValue({
        success: false,
        error: 'File not found'
      });

      await expect(
        ioService.loadProjectFromFile('/invalid/path')
      ).rejects.toThrow('File not found');
    });

    it('should throw generic error if no error message provided', async () => {
      mockElectronAPI.loadProject.mockResolvedValue({ success: false });

      await expect(
        ioService.loadProjectFromFile('/path')
      ).rejects.toThrow('Failed to load project');
    });
  });

  describe('readFileAsBuffer', () => {
    it('should read file and return buffer', async () => {
      const mockBuffer = new ArrayBuffer(100);
      mockElectronAPI.readFileAsBuffer.mockResolvedValue(mockBuffer);

      const result = await ioService.readFileAsBuffer('/path/to/file');

      expect(mockElectronAPI.readFileAsBuffer).toHaveBeenCalledWith('/path/to/file');
      expect(result).toBe(mockBuffer);
    });

    it('should throw error if path is missing', async () => {
      await expect(ioService.readFileAsBuffer(null)).rejects.toThrow(
        'File path is required'
      );
    });
  });

  describe('fileExists', () => {
    it('should return true if file can be read', async () => {
      mockElectronAPI.readFileAsBuffer.mockResolvedValue(new ArrayBuffer(10));

      const result = await ioService.fileExists('/path/to/file');

      expect(result).toBe(true);
    });

    it('should return false if file cannot be read', async () => {
      mockElectronAPI.readFileAsBuffer.mockRejectedValue(new Error('File not found'));

      const result = await ioService.fileExists('/invalid/path');

      expect(result).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('should extract file information from path', () => {
      const result = ProjectIOService.getFileInfo('/path/to/my-project.animex');

      expect(result).toEqual({
        path: '/path/to/my-project.animex',
        filename: 'my-project.animex',
        extension: 'animex',
        basename: 'my-project'
      });
    });

    it('should handle Windows paths', () => {
      const result = ProjectIOService.getFileInfo('C:\\Users\\test\\project.animex');

      expect(result.filename).toBe('project.animex');
      expect(result.extension).toBe('animex');
    });

    it('should handle files without extension', () => {
      const result = ProjectIOService.getFileInfo('/path/to/file');

      expect(result.extension).toBe('');
      expect(result.basename).toBe('file');
    });

    it('should throw error for invalid path', () => {
      expect(() => {
        ProjectIOService.getFileInfo(null);
      }).toThrow('Valid file path is required');
    });

    it('should throw error for non-string path', () => {
      expect(() => {
        ProjectIOService.getFileInfo(123);
      }).toThrow('Valid file path is required');
    });
  });
});
