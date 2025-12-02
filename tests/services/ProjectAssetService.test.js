import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectAssetService } from '../../src/renderer/modules/io/services/ProjectAssetService.js';

describe('ProjectAssetService', () => {
  describe('collectTextureFiles', () => {
    it('should collect valid texture files from materials', () => {
      const materials = [
        {
          uuid: 'material-1',
          name: 'Material1',
          textures: {
            map: { 
              label: 'Base Color', 
              source: 'texture1.png', 
              extractedPath: '/path/to/texture1.png' 
            },
            normalMap: {
              label: 'Normal',
              source: 'normal.png',
              extractedPath: '/path/to/normal.png'
            }
          }
        }
      ];

      const result = ProjectAssetService.collectTextureFiles(materials);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        sourcePath: '/path/to/texture1.png',
        materialUuid: 'material-1',
        textureKey: 'map',
        label: 'Base Color',
        materialName: 'Material1'
      });
    });

    it('should exclude embedded textures', () => {
      const materials = [
        {
          uuid: 'material-1',
          name: 'Material1',
          textures: {
            map: { source: 'Embedded Texture' }
          }
        }
      ];

      const result = ProjectAssetService.collectTextureFiles(materials);

      expect(result).toHaveLength(0);
    });

    it('should exclude data URLs', () => {
      const materials = [
        {
          uuid: 'material-1',
          name: 'Material1',
          textures: {
            map: { source: 'data:image/png;base64,iVBORw0K...' }
          }
        }
      ];

      const result = ProjectAssetService.collectTextureFiles(materials);

      expect(result).toHaveLength(0);
    });

    it('should exclude blob URLs', () => {
      const materials = [
        {
          uuid: 'material-1',
          name: 'Material1',
          textures: {
            map: { source: 'blob:http://localhost/12345' }
          }
        }
      ];

      const result = ProjectAssetService.collectTextureFiles(materials);

      expect(result).toHaveLength(0);
    });

    it('should handle empty materials array', () => {
      const result = ProjectAssetService.collectTextureFiles([]);
      expect(result).toEqual([]);
    });

    it('should handle null materials', () => {
      const result = ProjectAssetService.collectTextureFiles(null);
      expect(result).toEqual([]);
    });

    it('should handle materials without textures property', () => {
      const materials = [
        { uuid: 'material-1', name: 'Material1' }
      ];

      const result = ProjectAssetService.collectTextureFiles(materials);
      expect(result).toEqual([]);
    });
  });

  describe('prepareModelData', () => {
    it('should prepare model data with position and rotation', () => {
      const modelData = {
        name: 'test-model.glb',
        path: '/path/to/model',
        bufferData: new ArrayBuffer(100)
      };

      const modelObject = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.1, y: 0.2, z: 0.3 },
        scale: { x: 1, y: 1, z: 1 }
      };

      const result = ProjectAssetService.prepareModelData(modelData, modelObject);

      expect(result.name).toBe('test-model.glb');
      expect(result.extension).toBe('glb');
      expect(result.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(result.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
      expect(result.scale).toEqual({ x: 1, y: 1, z: 1 });
    });

    it('should throw error if modelData is missing', () => {
      expect(() => {
        ProjectAssetService.prepareModelData(null, {});
      }).toThrow('Model data is required');
    });

    it('should throw error if modelObject is missing', () => {
      expect(() => {
        ProjectAssetService.prepareModelData({ name: 'test.glb' }, null);
      }).toThrow('Model object is required');
    });

    it('should handle missing position values', () => {
      const modelData = { name: 'test.glb', bufferData: new ArrayBuffer(10) };
      const modelObject = {
        position: {},
        rotation: {},
        scale: {}
      };

      const result = ProjectAssetService.prepareModelData(modelData, modelObject);

      expect(result.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.rotation).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.scale).toEqual({ x: 1, y: 1, z: 1 });
    });
  });

  describe('collectAnimationData', () => {
    it('should collect animation metadata', () => {
      const animationClips = [
        {
          name: 'walk',
          duration: 2.0,
          tracks: [
            {
              name: '.position',
              constructor: { name: 'VectorKeyframeTrack' },
              times: new Float32Array([0, 1]),
              values: new Float32Array([0, 0, 0, 1, 1, 1]),
              getValueSize: () => 3
            }
          ]
        }
      ];

      const result = ProjectAssetService.collectAnimationData(animationClips);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'walk',
        duration: 2.0,
        trackCount: 1
      });
      expect(result[0].tracks[0]).toMatchObject({
        name: '.position',
        type: 'VectorKeyframeTrack',
        valueSize: 3,
        timesLength: 2,
        valuesLength: 6
      });
    });

    it('should handle empty animations', () => {
      const result = ProjectAssetService.collectAnimationData([]);
      expect(result).toEqual([]);
    });

    it('should handle null animations', () => {
      const result = ProjectAssetService.collectAnimationData(null);
      expect(result).toEqual([]);
    });
  });

  describe('validateAssets', () => {
    it('should validate complete asset set', () => {
      const modelData = { name: 'test.glb', bufferData: new ArrayBuffer(10) };
      const animations = [{ name: 'walk', tracks: [{}] }];
      const materials = [{ uuid: 'mat-1', name: 'Material' }];

      const result = ProjectAssetService.validateAssets(modelData, animations, materials);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for missing model', () => {
      const result = ProjectAssetService.validateAssets(null, [], []);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No model data available');
    });

    it('should report warning for missing buffer data', () => {
      const modelData = { name: 'test.glb' };

      const result = ProjectAssetService.validateAssets(modelData, [], []);

      expect(result.warnings).toContain('Model buffer data is missing - may not be saveable');
      expect(result.hasWarnings).toBe(true);
    });

    it('should report error for missing model name', () => {
      const modelData = { bufferData: new ArrayBuffer(10) };

      const result = ProjectAssetService.validateAssets(modelData, [], []);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name is missing');
    });

    it('should report warning for animation without name', () => {
      const modelData = { name: 'test.glb', bufferData: new ArrayBuffer(10) };
      const animations = [{ tracks: [{}] }];

      const result = ProjectAssetService.validateAssets(modelData, animations, []);

      expect(result.warnings).toContain('Animation at index 0 has no name');
    });

    it('should report warning for animation without tracks', () => {
      const modelData = { name: 'test.glb', bufferData: new ArrayBuffer(10) };
      const animations = [{ name: 'walk', tracks: [] }];

      const result = ProjectAssetService.validateAssets(modelData, animations, []);

      expect(result.warnings).toContain('Animation "walk" has no tracks');
    });

    it('should report warning for material without UUID', () => {
      const modelData = { name: 'test.glb', bufferData: new ArrayBuffer(10) };
      const materials = [{ name: 'Material' }];

      const result = ProjectAssetService.validateAssets(modelData, [], materials);

      expect(result.warnings).toContain('Material "Material" has no UUID');
    });
  });

  describe('getAssetSummary', () => {
    it('should generate asset summary', () => {
      const modelData = { name: 'test-model.glb' };
      const animations = [{ name: 'walk' }, { name: 'run' }];
      const materials = [
        {
          uuid: 'mat-1',
          name: 'Material1',
          textures: {
            map: { source: 'texture1.png', extractedPath: '/path/to/texture1.png' }
          }
        }
      ];

      const result = ProjectAssetService.getAssetSummary(modelData, animations, materials);

      expect(result).toMatchObject({
        modelName: 'test-model.glb',
        modelExtension: 'glb',
        animationCount: 2,
        materialCount: 1,
        textureCount: 1,
        hasModel: true,
        hasAnimations: true,
        hasTextures: true
      });
    });

    it('should handle null model', () => {
      const result = ProjectAssetService.getAssetSummary(null, [], []);

      expect(result.modelName).toBe('Unknown');
      expect(result.hasModel).toBe(false);
    });
  });

  describe('filterMaterialsWithTextures', () => {
    it('should filter materials that have valid textures', () => {
      const materials = [
        {
          name: 'WithTexture',
          textures: {
            map: { source: 'texture1.png', extractedPath: '/path/to/texture1.png' }
          }
        },
        {
          name: 'WithoutTexture',
          textures: {}
        },
        {
          name: 'WithEmbedded',
          textures: {
            map: { source: 'Embedded Texture' }
          }
        }
      ];

      const result = ProjectAssetService.filterMaterialsWithTextures(materials);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('WithTexture');
    });

    it('should handle null materials', () => {
      const result = ProjectAssetService.filterMaterialsWithTextures(null);
      expect(result).toEqual([]);
    });
  });

  describe('createTextureManifest', () => {
    it('should create texture manifest grouped by material and type', () => {
      const textureFiles = [
        {
          sourcePath: '/path/to/texture1.png',
          materialUuid: 'mat-1',
          materialName: 'Material1',
          textureKey: 'map',
          label: 'Base Color'
        },
        {
          sourcePath: '/path/to/normal1.png',
          materialUuid: 'mat-1',
          materialName: 'Material1',
          textureKey: 'normalMap',
          label: 'Normal'
        }
      ];

      const result = ProjectAssetService.createTextureManifest(textureFiles);

      expect(result.count).toBe(2);
      expect(result.byMaterial['mat-1']).toBeDefined();
      expect(result.byMaterial['mat-1'].textures).toHaveLength(2);
      expect(result.byType['map']).toHaveLength(1);
      expect(result.byType['normalMap']).toHaveLength(1);
    });
  });
});
