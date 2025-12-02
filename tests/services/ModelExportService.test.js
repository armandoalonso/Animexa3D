import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelExportService } from '../../src/renderer/modules/io/services/ModelExportService.js';

describe('ModelExportService', () => {
  let service;

  beforeEach(() => {
    service = new ModelExportService();
  });

  describe('prepareModelForExport', () => {
    it('should store original transform and reset model', () => {
      const mockModel = {
        scale: { clone: vi.fn().mockReturnValue({ x: 2, y: 2, z: 2 }), set: vi.fn() },
        position: { clone: vi.fn().mockReturnValue({ x: 10, y: 5, z: -3 }), set: vi.fn() },
        rotation: { clone: vi.fn().mockReturnValue({ x: 0.5, y: 1.0, z: 0.2 }) },
        updateMatrix: vi.fn(),
        updateMatrixWorld: vi.fn()
      };

      const original = service.prepareModelForExport(mockModel);

      expect(original.scale).toEqual({ x: 2, y: 2, z: 2 });
      expect(original.position).toEqual({ x: 10, y: 5, z: -3 });
      expect(original.rotation).toEqual({ x: 0.5, y: 1.0, z: 0.2 });
      expect(mockModel.scale.set).toHaveBeenCalledWith(1, 1, 1);
      expect(mockModel.position.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockModel.updateMatrix).toHaveBeenCalled();
      expect(mockModel.updateMatrixWorld).toHaveBeenCalledWith(true);
    });

    it('should throw error if model is null', () => {
      expect(() => service.prepareModelForExport(null)).toThrow('Model is required');
    });
  });

  describe('restoreModelTransform', () => {
    it('should restore model to original transform', () => {
      const mockModel = {
        scale: { copy: vi.fn() },
        position: { copy: vi.fn() },
        rotation: { copy: vi.fn() },
        updateMatrix: vi.fn(),
        updateMatrixWorld: vi.fn()
      };

      const originalTransform = {
        scale: { x: 2, y: 2, z: 2 },
        position: { x: 10, y: 5, z: -3 },
        rotation: { x: 0.5, y: 1.0, z: 0.2 }
      };

      service.restoreModelTransform(mockModel, originalTransform);

      expect(mockModel.scale.copy).toHaveBeenCalledWith(originalTransform.scale);
      expect(mockModel.position.copy).toHaveBeenCalledWith(originalTransform.position);
      expect(mockModel.rotation.copy).toHaveBeenCalledWith(originalTransform.rotation);
      expect(mockModel.updateMatrix).toHaveBeenCalled();
      expect(mockModel.updateMatrixWorld).toHaveBeenCalledWith(true);
    });

    it('should throw error if model is null', () => {
      expect(() => service.restoreModelTransform(null, {})).toThrow('Model and original transform are required');
    });

    it('should throw error if originalTransform is null', () => {
      expect(() => service.restoreModelTransform({}, null)).toThrow('Model and original transform are required');
    });
  });

  describe('createExportOptions', () => {
    it('should create correct options for GLB format', () => {
      const animations = [{ name: 'Walk' }, { name: 'Run' }];
      const options = service.createExportOptions('glb', animations, true, 4096);

      expect(options.binary).toBe(true);
      expect(options.animations).toEqual(animations);
      expect(options.embedImages).toBe(true);
      expect(options.maxTextureSize).toBe(4096);
    });

    it('should create correct options for GLTF format', () => {
      const animations = [];
      const options = service.createExportOptions('gltf', animations, false, 2048);

      expect(options.binary).toBe(false);
      expect(options.animations).toEqual(animations);
      expect(options.embedImages).toBe(false);
      expect(options.maxTextureSize).toBe(2048);
    });

    it('should use default values for optional parameters', () => {
      const options = service.createExportOptions('glb');

      expect(options.animations).toEqual([]);
      expect(options.embedImages).toBe(true);
      expect(options.maxTextureSize).toBe(4096);
    });

    it('should throw error for invalid format', () => {
      expect(() => service.createExportOptions('obj')).toThrow('Format must be "glb" or "gltf"');
    });
  });

  describe('convertToBuffer', () => {
    it('should convert GLB ArrayBuffer to array', () => {
      const arrayBuffer = new ArrayBuffer(8);
      const view = new Uint8Array(arrayBuffer);
      view.set([1, 2, 3, 4, 5, 6, 7, 8]);

      const buffer = service.convertToBuffer(arrayBuffer, 'glb');

      expect(buffer).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('should convert GLTF object to JSON buffer', () => {
      const gltfObject = { asset: { version: '2.0' }, scenes: [] };
      const buffer = service.convertToBuffer(gltfObject, 'gltf');

      expect(Array.isArray(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify it's valid JSON by decoding
      const decoder = new TextDecoder();
      const json = decoder.decode(new Uint8Array(buffer));
      const parsed = JSON.parse(json);
      expect(parsed.asset.version).toBe('2.0');
    });

    it('should throw error if GLB result is not ArrayBuffer', () => {
      expect(() => service.convertToBuffer({}, 'glb')).toThrow('GLB export result must be an ArrayBuffer');
    });
  });

  describe('generateExportFilename', () => {
    it('should generate filename with GLB extension', () => {
      expect(service.generateExportFilename('mymodel', 'glb')).toBe('mymodel.glb');
    });

    it('should generate filename with GLTF extension', () => {
      expect(service.generateExportFilename('mymodel', 'gltf')).toBe('mymodel.gltf');
    });

    it('should throw error if filename is empty', () => {
      expect(() => service.generateExportFilename('', 'glb')).toThrow('Filename is required');
    });

    it('should throw error for invalid format', () => {
      expect(() => service.generateExportFilename('model', 'obj')).toThrow('Format must be "glb" or "gltf"');
    });
  });

  describe('validateExportRequirements', () => {
    it('should validate correct requirements', () => {
      const mockModel = { name: 'Model' };
      const animations = [{ name: 'Anim1' }];

      const result = service.validateExportRequirements(mockModel, animations);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing model', () => {
      const result = service.validateExportRequirements(null, []);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('No model'))).toBe(true);
    });

    it('should detect invalid animations parameter', () => {
      const mockModel = { name: 'Model' };
      const result = service.validateExportRequirements(mockModel, 'not-an-array');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Animations must be an array'))).toBe(true);
    });

    it('should allow empty animations array', () => {
      const mockModel = { name: 'Model' };
      const result = service.validateExportRequirements(mockModel, []);

      expect(result.valid).toBe(true);
    });
  });

  describe('getExportMetadata', () => {
    it('should generate complete metadata', () => {
      const mockModel = {
        scale: { clone: vi.fn().mockReturnValue({ x: 1, y: 1, z: 1 }) }
      };
      const animations = [{ name: 'Walk' }, { name: 'Run' }];

      const metadata = service.getExportMetadata(mockModel, animations, 'glb', true);

      expect(metadata.format).toBe('glb');
      expect(metadata.embedTextures).toBe(true);
      expect(metadata.animationCount).toBe(2);
      expect(metadata.hasModel).toBe(true);
      expect(metadata.modelScale).toEqual({ x: 1, y: 1, z: 1 });
      expect(metadata.timestamp).toBeDefined();
    });

    it('should handle null model', () => {
      const metadata = service.getExportMetadata(null, [], 'gltf', false);

      expect(metadata.hasModel).toBe(false);
      expect(metadata.modelScale).toBeNull();
    });
  });
});
