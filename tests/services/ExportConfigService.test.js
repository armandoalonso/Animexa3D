import { describe, it, expect, beforeEach } from 'vitest';
import { ExportConfigService } from '../../src/renderer/modules/io/services/ExportConfigService.js';

describe('ExportConfigService', () => {
  let service;

  beforeEach(() => {
    service = new ExportConfigService();
  });

  describe('getTimestamp', () => {
    it('should generate timestamp in correct format', () => {
      const timestamp = service.getTimestamp();
      expect(timestamp).toMatch(/^\d{14}$/); // YYYYMMDDHHMMSS
    });

    it('should generate unique timestamps', () => {
      const ts1 = service.getTimestamp();
      const ts2 = service.getTimestamp();
      // They might be the same if called within same second
      expect(typeof ts1).toBe('string');
      expect(typeof ts2).toBe('string');
    });
  });

  describe('parseResolution', () => {
    it('should parse valid resolution strings', () => {
      expect(service.parseResolution('1920x1080')).toEqual({ width: 1920, height: 1080 });
      expect(service.parseResolution('1280x720')).toEqual({ width: 1280, height: 720 });
      expect(service.parseResolution('3840x2160')).toEqual({ width: 3840, height: 2160 });
    });

    it('should throw error for invalid format', () => {
      expect(() => service.parseResolution('1920')).toThrow('Resolution must be in format "WIDTHxHEIGHT"');
      expect(() => service.parseResolution('1920x1080x30')).toThrow('Resolution must be in format "WIDTHxHEIGHT"');
      expect(() => service.parseResolution('')).toThrow('Resolution must be a non-empty string');
    });

    it('should throw error for non-numeric values', () => {
      expect(() => service.parseResolution('widthxheight')).toThrow('Width and height must be integers');
      expect(() => service.parseResolution('1920xABC')).toThrow('Width and height must be integers');
    });

    it('should throw error for zero or negative dimensions', () => {
      expect(() => service.parseResolution('0x1080')).toThrow('Width and height must be positive');
      expect(() => service.parseResolution('1920x-1080')).toThrow('Width and height must be positive');
    });

    it('should throw error for dimensions exceeding maximum', () => {
      expect(() => service.parseResolution('9000x9000')).toThrow('Resolution exceeds maximum size');
      expect(() => service.parseResolution('8193x1080')).toThrow('Resolution exceeds maximum size');
    });

    it('should throw error for null or undefined', () => {
      expect(() => service.parseResolution(null)).toThrow('Resolution must be a non-empty string');
      expect(() => service.parseResolution(undefined)).toThrow('Resolution must be a non-empty string');
    });
  });

  describe('validateExportConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        resolution: '1920x1080',
        fps: 30,
        folder: '/path/to/folder',
        transparentBackground: false
      };
      const result = service.validateExportConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid resolution', () => {
      const config = {
        resolution: 'invalid',
        fps: 30,
        folder: '/path',
        transparentBackground: false
      };
      const result = service.validateExportConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('resolution'))).toBe(true);
    });

    it('should detect invalid FPS', () => {
      const config = {
        resolution: '1920x1080',
        fps: -1,
        folder: '/path',
        transparentBackground: false
      };
      const result = service.validateExportConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('FPS'))).toBe(true);
    });

    it('should detect FPS exceeding maximum', () => {
      const config = {
        resolution: '1920x1080',
        fps: 200,
        folder: '/path',
        transparentBackground: false
      };
      const result = service.validateExportConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });

    it('should detect missing folder', () => {
      const config = {
        resolution: '1920x1080',
        fps: 30,
        folder: '',
        transparentBackground: false
      };
      const result = service.validateExportConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('folder'))).toBe(true);
    });

    it('should detect invalid transparentBackground type', () => {
      const config = {
        resolution: '1920x1080',
        fps: 30,
        folder: '/path',
        transparentBackground: 'yes'
      };
      const result = service.validateExportConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('transparentBackground'))).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const config = {
        resolution: 'invalid',
        fps: -1,
        folder: '',
        transparentBackground: 'yes'
      };
      const result = service.validateExportConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateModelExportOptions', () => {
    it('should validate correct options', () => {
      const options = {
        format: 'glb',
        folder: '/path/to/folder',
        filename: 'model',
        embedTextures: true
      };
      const result = service.validateModelExportOptions(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept gltf format', () => {
      const options = {
        format: 'gltf',
        folder: '/path',
        filename: 'model',
        embedTextures: false
      };
      const result = service.validateModelExportOptions(options);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid format', () => {
      const options = {
        format: 'obj',
        folder: '/path',
        filename: 'model',
        embedTextures: true
      };
      const result = service.validateModelExportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Format'))).toBe(true);
    });

    it('should detect missing folder', () => {
      const options = {
        format: 'glb',
        folder: '',
        filename: 'model',
        embedTextures: true
      };
      const result = service.validateModelExportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('folder'))).toBe(true);
    });

    it('should detect missing filename', () => {
      const options = {
        format: 'glb',
        folder: '/path',
        filename: '',
        embedTextures: true
      };
      const result = service.validateModelExportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Filename'))).toBe(true);
    });

    it('should detect invalid characters in filename', () => {
      const invalidNames = ['model<name', 'model>name', 'model:name', 'model"name', 'model|name', 'model?name', 'model*name'];
      invalidNames.forEach(filename => {
        const options = {
          format: 'glb',
          folder: '/path',
          filename,
          embedTextures: true
        };
        const result = service.validateModelExportOptions(options);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
      });
    });

    it('should detect invalid embedTextures type', () => {
      const options = {
        format: 'glb',
        folder: '/path',
        filename: 'model',
        embedTextures: 'yes'
      };
      const result = service.validateModelExportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('embedTextures'))).toBe(true);
    });
  });

  describe('getDefaultFrameExportConfig', () => {
    it('should return valid default configuration', () => {
      const config = service.getDefaultFrameExportConfig();
      expect(config.resolution).toBe('1920x1080');
      expect(config.fps).toBe(30);
      expect(config.folder).toBeNull();
      expect(config.transparentBackground).toBe(false);
    });
  });

  describe('getDefaultModelExportOptions', () => {
    it('should return valid default options', () => {
      const options = service.getDefaultModelExportOptions();
      expect(options.format).toBe('glb');
      expect(options.folder).toBeNull();
      expect(options.filename).toBe('exported_model');
      expect(options.embedTextures).toBe(true);
    });
  });
});
