import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectManager } from '../../src/renderer/modules/io/ProjectManager.js';
import * as THREE from 'three';

describe('ProjectManager', () => {
  let projectManager;
  let mockSceneManager;
  let mockModelLoader;
  let mockAnimationManager;
  let mockTextureManager;
  let mockElectronAPI;

  beforeEach(() => {
    // Mock SceneManager
    mockSceneManager = {
      scene: {
        background: { r: 1, g: 1, b: 1 },
        fog: null
      },
      camera: {
        position: { x: 0, y: 5, z: 10 },
        fov: 50
      },
      controls: {
        autoRotate: false,
        autoRotateSpeed: 2.0
      },
      renderer: {
        toneMappingExposure: 1.0
      },
      getActiveModel: vi.fn(),
      getModel: vi.fn(),
      addModel: vi.fn(),
      clearScene: vi.fn(),
      createMixer: vi.fn(),
      setBackgroundColor: vi.fn(),
      setCameraPosition: vi.fn(),
      setCameraFOV: vi.fn(),
      setAutoRotate: vi.fn(),
      setExposure: vi.fn()
    };

    // Mock ModelLoader
    mockModelLoader = {
      loadFromBufferSilent: vi.fn(),
      getCurrentModelData: vi.fn(),
      clearCurrentModel: vi.fn(),
      uiAdapter: {
        updateModelInfo: vi.fn(),
        clearModelInfo: vi.fn()
      }
    };

    // Mock AnimationManager
    mockAnimationManager = {
      animations: [],
      currentAnimation: null,
      getAllAnimations: vi.fn(() => []),
      getAnimations: vi.fn(() => []),
      clearAnimations: vi.fn(),
      addAnimation: vi.fn(),
      playAnimation: vi.fn(),
      loadAnimations: vi.fn()
    };

    // Mock TextureManager
    mockTextureManager = {
      extractMaterials: vi.fn(() => []),
      getMaterials: vi.fn(() => []),
      updateTexture: vi.fn()
    };

    // Mock electron API
    mockElectronAPI = {
      saveProject: vi.fn(),
      loadProject: vi.fn(),
      showSaveDialog: vi.fn(),
      showOpenDialog: vi.fn(),
      readFile: vi.fn()
    };

    // Set global electronAPI
    global.window = { electronAPI: mockElectronAPI };

    // Create ProjectManager instance
    projectManager = new ProjectManager(
      mockSceneManager,
      mockModelLoader,
      mockAnimationManager,
      mockTextureManager
    );
  });

  describe('_loadProjectModel', () => {
    it('should load FBX model using loadFromBufferSilent', async () => {
      // Arrange
      const projectData = {
        model: {
          fileName: 'test-model.fbx',
          extension: 'fbx'
        }
      };
      const extractedPath = '/tmp/project-extract';
      const mockModelBuffer = new ArrayBuffer(100);
      const mockModelData = {
        model: { name: 'TestModel' },
        animations: [],
        skeletons: { bones: [], boneNames: [] },
        filename: 'test-model.fbx'
      };

      // Mock IOService readFileAsBuffer
      projectManager.ioService.readFileAsBuffer = vi.fn().mockResolvedValue(mockModelBuffer);
      
      // Mock ModelLoader loadFromBufferSilent
      mockModelLoader.loadFromBufferSilent.mockResolvedValue(mockModelData);

      // Act
      const result = await projectManager._loadProjectModel(projectData, extractedPath);

      // Assert
      expect(projectManager.ioService.readFileAsBuffer).toHaveBeenCalledWith(
        `${extractedPath}/${projectData.model.fileName}`
      );
      expect(mockModelLoader.loadFromBufferSilent).toHaveBeenCalledWith(
        mockModelBuffer,
        'fbx',
        'test-model.fbx'
      );
      expect(result).toEqual(mockModelData);
    });

    it('should load GLTF model using loadFromBufferSilent', async () => {
      // Arrange
      const projectData = {
        model: {
          fileName: 'test-model.glb',
          extension: 'glb'
        }
      };
      const extractedPath = '/tmp/project-extract';
      const mockModelBuffer = new ArrayBuffer(100);
      const mockModelData = {
        model: { name: 'TestModel' },
        animations: [],
        skeletons: { bones: [], boneNames: [] },
        filename: 'test-model.glb'
      };

      // Mock IOService readFileAsBuffer
      projectManager.ioService.readFileAsBuffer = vi.fn().mockResolvedValue(mockModelBuffer);
      
      // Mock ModelLoader loadFromBufferSilent
      mockModelLoader.loadFromBufferSilent.mockResolvedValue(mockModelData);

      // Act
      const result = await projectManager._loadProjectModel(projectData, extractedPath);

      // Assert
      expect(projectManager.ioService.readFileAsBuffer).toHaveBeenCalledWith(
        `${extractedPath}/${projectData.model.fileName}`
      );
      expect(mockModelLoader.loadFromBufferSilent).toHaveBeenCalledWith(
        mockModelBuffer,
        'glb',
        'test-model.glb'
      );
      expect(result).toEqual(mockModelData);
    });

    it('should load GLB model using loadFromBufferSilent', async () => {
      // Arrange
      const projectData = {
        model: {
          fileName: 'test-model.gltf',
          extension: 'gltf'
        }
      };
      const extractedPath = '/tmp/project-extract';
      const mockModelBuffer = new ArrayBuffer(100);
      const mockModelData = {
        model: { name: 'TestModel' },
        animations: [],
        skeletons: { bones: [], boneNames: [] },
        filename: 'test-model.gltf'
      };

      // Mock IOService readFileAsBuffer
      projectManager.ioService.readFileAsBuffer = vi.fn().mockResolvedValue(mockModelBuffer);
      
      // Mock ModelLoader loadFromBufferSilent
      mockModelLoader.loadFromBufferSilent.mockResolvedValue(mockModelData);

      // Act
      const result = await projectManager._loadProjectModel(projectData, extractedPath);

      // Assert
      expect(mockModelLoader.loadFromBufferSilent).toHaveBeenCalledWith(
        mockModelBuffer,
        'gltf',
        'test-model.gltf'
      );
      expect(result).toEqual(mockModelData);
    });

    it('should throw error if no model data in project', async () => {
      // Arrange
      const projectData = {
        model: null
      };
      const extractedPath = '/tmp/project-extract';

      // Act & Assert
      await expect(
        projectManager._loadProjectModel(projectData, extractedPath)
      ).rejects.toThrow('No model data in project');
    });

    it('should throw error if no fileName in model data', async () => {
      // Arrange
      const projectData = {
        model: {
          extension: 'fbx'
        }
      };
      const extractedPath = '/tmp/project-extract';

      // Act & Assert
      await expect(
        projectManager._loadProjectModel(projectData, extractedPath)
      ).rejects.toThrow('No model data in project');
    });

    it('should propagate error from loadFromBufferSilent', async () => {
      // Arrange
      const projectData = {
        model: {
          fileName: 'test-model.fbx',
          extension: 'fbx'
        }
      };
      const extractedPath = '/tmp/project-extract';
      const mockModelBuffer = new ArrayBuffer(100);
      const expectedError = new Error('Failed to parse model');

      // Mock IOService readFileAsBuffer
      projectManager.ioService.readFileAsBuffer = vi.fn().mockResolvedValue(mockModelBuffer);
      
      // Mock ModelLoader loadFromBufferSilent to throw error
      mockModelLoader.loadFromBufferSilent.mockRejectedValue(expectedError);

      // Act & Assert
      await expect(
        projectManager._loadProjectModel(projectData, extractedPath)
      ).rejects.toThrow('Failed to parse model');
    });
  });

  describe('getProjectState', () => {
    it('should return project metadata when state is valid', () => {
      // Arrange
      mockSceneManager.getActiveModel = vi.fn().mockReturnValue({ name: 'TestModel' });
      mockSceneManager.getModel = vi.fn().mockReturnValue({ name: 'TestModel' });
      mockModelLoader.getCurrentModelData = vi.fn().mockReturnValue({
        filename: 'test.fbx',
        model: { name: 'TestModel' },
        bufferData: new ArrayBuffer(100)
      });

      // Act
      const state = projectManager.getProjectState();

      // Assert
      expect(state).toBeDefined();
      expect(state).not.toBeNull();
      expect(state).toHaveProperty('hasModel');
    });

    it('should return null on error', () => {
      // Arrange
      mockSceneManager.getActiveModel = vi.fn().mockImplementation(() => {
        throw new Error('Scene error');
      });

      // Act
      const state = projectManager.getProjectState();

      // Assert
      expect(state).toBeNull();
    });
  });

  describe('saveProject', () => {
    it('should save project successfully', async () => {
      // Arrange
      const mockSavePath = 'C:\\projects\\test.3dproj';
      mockSceneManager.getActiveModel = vi.fn().mockReturnValue({ name: 'TestModel' });
      mockSceneManager.getModel = vi.fn().mockReturnValue({ name: 'TestModel' });
      mockModelLoader.getCurrentModelData = vi.fn().mockReturnValue({
        filename: 'test.fbx',
        model: { name: 'TestModel' },
        bufferData: new ArrayBuffer(100)
      });
      mockTextureManager.extractMaterials = vi.fn().mockReturnValue([]);
      
      projectManager.ioService.showSaveDialog = vi.fn().mockResolvedValue(mockSavePath);
      projectManager.ioService.saveProjectToFile = vi.fn().mockResolvedValue();

      // Act
      const result = await projectManager.saveProject();

      // Assert
      expect(result).toBe(true);
      expect(projectManager.ioService.showSaveDialog).toHaveBeenCalled();
      expect(projectManager.ioService.saveProjectToFile).toHaveBeenCalled();
    });

    it('should return false when user cancels save dialog', async () => {
      // Arrange
      mockSceneManager.getModel = vi.fn().mockReturnValue({ name: 'TestModel' });
      mockModelLoader.getCurrentModelData = vi.fn().mockReturnValue({
        filename: 'test.fbx',
        model: { name: 'TestModel' },
        bufferData: new ArrayBuffer(100)
      });
      projectManager.ioService.showSaveDialog = vi.fn().mockResolvedValue(null);

      // Act
      const result = await projectManager.saveProject();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle save errors', async () => {
      // Arrange
      const mockSavePath = 'C:\\projects\\test.3dproj';
      const expectedError = new Error('Failed to write file');
      
      mockSceneManager.getActiveModel = vi.fn().mockReturnValue({ name: 'TestModel' });
      mockSceneManager.getModel = vi.fn().mockReturnValue({ name: 'TestModel' });
      mockModelLoader.getCurrentModelData = vi.fn().mockReturnValue({
        filename: 'test.fbx',
        model: { name: 'TestModel' },
        bufferData: new ArrayBuffer(100)
      });
      mockTextureManager.extractMaterials = vi.fn().mockReturnValue([]);
      
      projectManager.ioService.showSaveDialog = vi.fn().mockResolvedValue(mockSavePath);
      projectManager.ioService.saveProjectToFile = vi.fn().mockRejectedValue(expectedError);

      // Act & Assert
      await expect(projectManager.saveProject()).rejects.toThrow('Failed to write file');
    });
  });

  describe('loadProject', () => {
    it('should load project successfully with FBX model', async () => {
      // Arrange
      const mockProjectPath = 'C:\\projects\\test.3dproj';
      const mockExtractedPath = '/tmp/extract-123';
      const mockProjectData = {
        version: '1.0.0',
        model: {
          fileName: 'test-model.fbx',
          extension: 'fbx',
          position: { x: 0, y: 0, z: 0 }
        },
        animations: [],
        materials: [],
        scene: {
          backgroundColor: '#FFFFFF',
          cameraPosition: { x: 0, y: 5, z: 10 }
        }
      };
      const mockModelData = {
        model: new THREE.Object3D(),
        animations: [],
        skeletons: { bones: [], boneNames: [] },
        stats: {
          polygons: 1000,
          animations: 0,
          bones: 0,
          hasAnimations: false
        }
      };
      mockModelData.model.name = 'TestModel';

      projectManager.ioService.showOpenDialog = vi.fn().mockResolvedValue(mockProjectPath);
      projectManager.ioService.loadProjectFromFile = vi.fn().mockResolvedValue({
        projectData: mockProjectData,
        extractedPath: mockExtractedPath
      });
      projectManager.ioService.readFileAsBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(100));
      mockModelLoader.loadFromBufferSilent = vi.fn().mockResolvedValue(mockModelData);
      mockModelLoader.getCurrentModelData = vi.fn().mockReturnValue(mockModelData);
      mockModelLoader.uiAdapter = {
        updateModelInfo: vi.fn()
      };

      // Act
      const result = await projectManager.loadProject();

      // Assert
      expect(result).toBe(true);
      expect(projectManager.ioService.loadProjectFromFile).toHaveBeenCalledWith(mockProjectPath);
      expect(mockModelLoader.loadFromBufferSilent).toHaveBeenCalled();
      expect(mockModelLoader.uiAdapter.updateModelInfo).toHaveBeenCalledWith(
        'test-model.fbx',
        1000,
        0,
        0
      );
      // Verify setBackgroundColor was called with the hex string from project data
      expect(mockSceneManager.setBackgroundColor).toHaveBeenCalledWith('#FFFFFF');
    });

    it('should return false when user cancels open dialog', async () => {
      // Arrange
      projectManager.ioService.showOpenDialog = vi.fn().mockResolvedValue(null);

      // Act
      const result = await projectManager.loadProject();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle load errors and hide loading overlay', async () => {
      // Arrange
      const mockProjectPath = 'C:\\projects\\test.3dproj';
      const expectedError = new Error('Failed to read project file');
      
      projectManager.ioService.showOpenDialog = vi.fn().mockResolvedValue(mockProjectPath);
      projectManager.ioService.loadProjectFromFile = vi.fn().mockRejectedValue(expectedError);

      // Act
      const result = await projectManager.loadProject();

      // Assert
      expect(result).toBe(false);
    });

    it('should use provided path if given', async () => {
      // Arrange
      const mockProjectPath = 'C:\\projects\\specific.3dproj';
      const mockExtractedPath = '/tmp/extract-123';
      const mockProjectData = {
        version: '1.0.0',
        model: {
          fileName: 'test-model.fbx',
          extension: 'fbx',
          position: { x: 0, y: 0, z: 0 }
        },
        animations: [],
        materials: [],
        scene: {
          backgroundColor: '#FFFFFF',
          cameraPosition: { x: 0, y: 5, z: 10 }
        }
      };
      const mockModelData = {
        model: new THREE.Object3D(),
        animations: [],
        skeletons: { bones: [], boneNames: [] },
        stats: {
          polygons: 1000,
          animations: 0,
          bones: 0,
          hasAnimations: false
        }
      };
      mockModelData.model.name = 'TestModel';

      projectManager.ioService.loadProjectFromFile = vi.fn().mockResolvedValue({
        projectData: mockProjectData,
        extractedPath: mockExtractedPath
      });
      projectManager.ioService.readFileAsBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(100));
      mockModelLoader.loadFromBufferSilent = vi.fn().mockResolvedValue(mockModelData);
      mockModelLoader.getCurrentModelData = vi.fn().mockReturnValue(mockModelData);
      mockModelLoader.uiAdapter = {
        updateModelInfo: vi.fn()
      };

      // Act
      const result = await projectManager.loadProject(mockProjectPath);

      // Assert
      expect(result).toBe(true);
      expect(projectManager.ioService.showOpenDialog).not.toHaveBeenCalled();
      expect(projectManager.ioService.loadProjectFromFile).toHaveBeenCalledWith(mockProjectPath);
    });
  });

  describe('_loadProjectTextures', () => {
    it('should load textures for materials', async () => {
      // Arrange
      const mockProjectData = {
        materials: [
          {
            name: 'Material1',
            textures: [
              { key: 'map', fileName: 'texture1.jpg' }
            ]
          }
        ]
      };
      const mockExtractedPath = '/tmp/extract-123';
      const mockMaterial = { name: 'Material1', uuid: 'uuid-123' };

      mockModelLoader.getCurrentModelData = vi.fn().mockReturnValue({
        model: { name: 'TestModel' }
      });
      mockTextureManager.extractMaterials = vi.fn().mockReturnValue([mockMaterial]);
      mockTextureManager.updateTexture = vi.fn().mockResolvedValue();

      // Act
      await projectManager._loadProjectTextures(mockProjectData, mockExtractedPath);

      // Assert
      expect(mockTextureManager.updateTexture).toHaveBeenCalledWith(
        'uuid-123',
        'map',
        `${mockExtractedPath}/textures/texture1.jpg`
      );
    });

    it('should handle missing materials gracefully', async () => {
      // Arrange
      const mockProjectData = {
        materials: []
      };
      const mockExtractedPath = '/tmp/extract-123';

      mockModelLoader.getCurrentModelData = vi.fn().mockReturnValue({
        model: { name: 'TestModel' }
      });
      mockTextureManager.extractMaterials = vi.fn().mockReturnValue([]);

      // Act & Assert (should not throw)
      await expect(
        projectManager._loadProjectTextures(mockProjectData, mockExtractedPath)
      ).resolves.not.toThrow();
    });

    it('should continue loading other textures if one fails', async () => {
      // Arrange
      const mockProjectData = {
        materials: [
          {
            name: 'Material1',
            textures: [
              { key: 'map', fileName: 'texture1.jpg' },
              { key: 'normalMap', fileName: 'texture2.jpg' }
            ]
          }
        ]
      };
      const mockExtractedPath = '/tmp/extract-123';
      const mockMaterial = { name: 'Material1', uuid: 'uuid-123' };

      mockModelLoader.getCurrentModelData = vi.fn().mockReturnValue({
        model: { name: 'TestModel' }
      });
      mockTextureManager.extractMaterials = vi.fn().mockReturnValue([mockMaterial]);
      mockTextureManager.updateTexture = vi.fn()
        .mockRejectedValueOnce(new Error('Failed to load texture1'))
        .mockResolvedValueOnce();

      // Act & Assert (should not throw)
      await expect(
        projectManager._loadProjectTextures(mockProjectData, mockExtractedPath)
      ).resolves.not.toThrow();
      
      expect(mockTextureManager.updateTexture).toHaveBeenCalledTimes(2);
    });
  });
});
