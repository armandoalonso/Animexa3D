import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ProjectSerializationService } from '../../src/renderer/modules/io/services/ProjectSerializationService.js';

describe('ProjectSerializationService', () => {
  let mockModel;
  let mockAnimations;
  let mockMaterials;
  let mockScene;

  beforeEach(() => {
    // Mock model data
    const modelObject = new THREE.Object3D();
    modelObject.position.set(1, 2, 3);
    modelObject.rotation.set(0.1, 0.2, 0.3);

    mockModel = {
      data: {
        name: 'test-model.glb',
        path: '/path/to/model',
        bufferData: new ArrayBuffer(100)
      },
      object: modelObject
    };

    // Mock animations
    mockAnimations = [
      new THREE.AnimationClip('walk', 2.0, [
        new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, 1, 1, 1])
      ])
    ];

    // Mock materials
    mockMaterials = [
      {
        uuid: 'material-123',
        name: 'Material1',
        textures: {
          map: { label: 'Base Color', source: 'texture1.png', extractedPath: '/path/to/texture1.png' }
        }
      }
    ];

    // Mock scene
    mockScene = {
      backgroundColor: '#1a1a1a',
      gridVisible: true,
      camera: {
        position: { x: 0, y: 5, z: 10 },
        target: { x: 0, y: 0, z: 0 }
      },
      lighting: {
        ambientIntensity: 0.5,
        directionalIntensity: 0.8,
        directionalPosition: { x: 5, y: 10, z: 7.5 }
      }
    };
  });

  describe('getProjectVersion', () => {
    it('should return version 1.0.0', () => {
      expect(ProjectSerializationService.getProjectVersion()).toBe('1.0.0');
    });
  });

  describe('serializeProject', () => {
    it('should serialize complete project data', () => {
      const result = ProjectSerializationService.serializeProject(
        mockModel,
        mockAnimations,
        mockMaterials,
        mockScene
      );

      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('animations');
      expect(result).toHaveProperty('materials');
      expect(result).toHaveProperty('scene');
    });

    it('should throw error if model is missing', () => {
      expect(() => {
        ProjectSerializationService.serializeProject(null, mockAnimations, mockMaterials, mockScene);
      }).toThrow('Model object is required');
    });

    it('should serialize model with position and rotation', () => {
      const result = ProjectSerializationService.serializeProject(
        mockModel,
        mockAnimations,
        mockMaterials,
        mockScene
      );

      expect(result.model.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(result.model.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
    });

    it('should serialize animations with tracks', () => {
      const result = ProjectSerializationService.serializeProject(
        mockModel,
        mockAnimations,
        mockMaterials,
        mockScene
      );

      expect(result.animations).toHaveLength(1);
      expect(result.animations[0].name).toBe('walk');
      expect(result.animations[0].duration).toBe(2.0);
      expect(result.animations[0].tracks).toHaveLength(1);
      expect(result.animations[0].tracks[0].type).toBe('VectorKeyframeTrack');
    });

    it('should serialize materials with textures', () => {
      const result = ProjectSerializationService.serializeProject(
        mockModel,
        mockAnimations,
        mockMaterials,
        mockScene
      );

      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].uuid).toBe('material-123');
      expect(result.materials[0].textures).toHaveLength(1);
      expect(result.materials[0].textures[0].key).toBe('map');
    });

    it('should handle empty animations array', () => {
      const result = ProjectSerializationService.serializeProject(
        mockModel,
        [],
        mockMaterials,
        mockScene
      );

      expect(result.animations).toEqual([]);
    });

    it('should handle null animations', () => {
      const result = ProjectSerializationService.serializeProject(
        mockModel,
        null,
        mockMaterials,
        mockScene
      );

      expect(result.animations).toEqual([]);
    });
  });

  describe('deserializeProject', () => {
    it('should deserialize valid project data', () => {
      const serialized = ProjectSerializationService.serializeProject(
        mockModel,
        mockAnimations,
        mockMaterials,
        mockScene
      );

      const result = ProjectSerializationService.deserializeProject(serialized);

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('animations');
      expect(result).toHaveProperty('materials');
      expect(result).toHaveProperty('scene');
    });

    it('should provide default scene settings if missing', () => {
      const data = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        model: { name: 'test.glb', extension: 'glb' }
      };

      const result = ProjectSerializationService.deserializeProject(data);

      expect(result.scene).toBeDefined();
      expect(result.scene.backgroundColor).toBe('#1a1a1a');
      expect(result.scene.gridVisible).toBe(true);
    });
  });

  describe('validateProjectData', () => {
    it('should validate correct project data', () => {
      const data = {
        version: '1.0.0',
        model: {
          name: 'test-model.glb',
          extension: 'glb'
        }
      };

      expect(() => {
        ProjectSerializationService.validateProjectData(data);
      }).not.toThrow();
    });

    it('should throw error if data is null', () => {
      expect(() => {
        ProjectSerializationService.validateProjectData(null);
      }).toThrow('Project data is required');
    });

    it('should throw error if version is missing', () => {
      expect(() => {
        ProjectSerializationService.validateProjectData({ model: {} });
      }).toThrow('Project version is missing');
    });

    it('should throw error if model is missing', () => {
      expect(() => {
        ProjectSerializationService.validateProjectData({ version: '1.0.0' });
      }).toThrow('Model data is required');
    });

    it('should throw error if model extension is missing', () => {
      expect(() => {
        ProjectSerializationService.validateProjectData({
          version: '1.0.0',
          model: { name: 'test.glb' }
        });
      }).toThrow('Model extension is required');
    });

    it('should throw error for unsupported extension', () => {
      expect(() => {
        ProjectSerializationService.validateProjectData({
          version: '1.0.0',
          model: { name: 'test.obj', extension: 'obj' }
        });
      }).toThrow('Unsupported model format: obj');
    });

    it('should accept glb extension', () => {
      expect(() => {
        ProjectSerializationService.validateProjectData({
          version: '1.0.0',
          model: { name: 'test.glb', extension: 'glb' }
        });
      }).not.toThrow();
    });

    it('should accept fbx extension', () => {
      expect(() => {
        ProjectSerializationService.validateProjectData({
          version: '1.0.0',
          model: { name: 'test.fbx', extension: 'fbx' }
        });
      }).not.toThrow();
    });

    it('should throw error if animations is not an array', () => {
      expect(() => {
        ProjectSerializationService.validateProjectData({
          version: '1.0.0',
          model: { name: 'test.glb', extension: 'glb' },
          animations: 'not-an-array'
        });
      }).toThrow('Animations must be an array');
    });

    it('should throw error if materials is not an array', () => {
      expect(() => {
        ProjectSerializationService.validateProjectData({
          version: '1.0.0',
          model: { name: 'test.glb', extension: 'glb' },
          materials: 'not-an-array'
        });
      }).toThrow('Materials must be an array');
    });
  });

  describe('isCompatibleVersion', () => {
    it('should return true for version 1.0.0', () => {
      expect(ProjectSerializationService.isCompatibleVersion({ version: '1.0.0' })).toBe(true);
    });

    it('should return false for missing version', () => {
      expect(ProjectSerializationService.isCompatibleVersion({})).toBe(false);
    });

    it('should return false for null data', () => {
      expect(ProjectSerializationService.isCompatibleVersion(null)).toBe(false);
    });
  });

  describe('getProjectMetadata', () => {
    it('should extract metadata from project data', () => {
      const serialized = ProjectSerializationService.serializeProject(
        mockModel,
        mockAnimations,
        mockMaterials,
        mockScene
      );

      const metadata = ProjectSerializationService.getProjectMetadata(serialized);

      expect(metadata.version).toBe('1.0.0');
      expect(metadata.modelName).toBe('test-model.glb');
      expect(metadata.modelFormat).toBe('glb');
      expect(metadata.animationCount).toBe(1);
      expect(metadata.materialCount).toBe(1);
      expect(metadata.hasTextures).toBe(true);
    });

    it('should handle project with no textures', () => {
      const noTextureMaterials = [
        { uuid: 'material-123', name: 'Material1', textures: {} }
      ];

      const serialized = ProjectSerializationService.serializeProject(
        mockModel,
        mockAnimations,
        noTextureMaterials,
        mockScene
      );

      const metadata = ProjectSerializationService.getProjectMetadata(serialized);

      expect(metadata.hasTextures).toBe(false);
    });
  });
});
