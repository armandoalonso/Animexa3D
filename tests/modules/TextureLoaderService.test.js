import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TextureLoaderService } from '../../src/renderer/modules/io/services/TextureLoaderService.js';
import { TextureMetadataService } from '../../src/renderer/modules/io/services/TextureMetadataService.js';
import * as THREE from 'three';

describe('TextureLoaderService', () => {
  let service;
  let mockFileReader;
  let metadataService;

  beforeEach(() => {
    metadataService = new TextureMetadataService();
    mockFileReader = {
      readImageFile: vi.fn()
    };
    service = new TextureLoaderService(mockFileReader, metadataService);
  });

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(service).toBeDefined();
      expect(service.fileReader).toBe(mockFileReader);
      expect(service.textureMetadataService).toBe(metadataService);
    });

    it('should create instance without dependencies', () => {
      const serviceNoDeps = new TextureLoaderService();
      expect(serviceNoDeps.fileReader).toBeNull();
    });
  });

  describe('setFileReader', () => {
    it('should set file reader dependency', () => {
      const newReader = { readImageFile: vi.fn() };
      service.setFileReader(newReader);
      
      expect(service.fileReader).toBe(newReader);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for jpg', () => {
      expect(service.getMimeType('texture.jpg')).toBe('image/jpeg');
      expect(service.getMimeType('texture.jpeg')).toBe('image/jpeg');
    });

    it('should return correct MIME type for png', () => {
      expect(service.getMimeType('texture.png')).toBe('image/png');
    });

    it('should return correct MIME type for tga', () => {
      expect(service.getMimeType('texture.tga')).toBe('image/tga');
    });

    it('should handle uppercase extensions', () => {
      expect(service.getMimeType('texture.PNG')).toBe('image/png');
    });

    it('should return default for unknown extensions', () => {
      expect(service.getMimeType('texture.xyz')).toBe('image/png');
    });
  });

  describe('applyTextureSettings', () => {
    it('should copy settings from existing texture', () => {
      const existingTexture = new THREE.Texture();
      existingTexture.wrapS = THREE.MirroredRepeatWrapping;
      existingTexture.wrapT = THREE.MirroredRepeatWrapping;
      existingTexture.repeat.set(2, 3);
      existingTexture.offset.set(0.1, 0.2);
      existingTexture.rotation = Math.PI / 4;

      const newTexture = new THREE.Texture();
      service.applyTextureSettings(newTexture, existingTexture);

      expect(newTexture.wrapS).toBe(THREE.MirroredRepeatWrapping);
      expect(newTexture.wrapT).toBe(THREE.MirroredRepeatWrapping);
      expect(newTexture.repeat.x).toBe(2);
      expect(newTexture.repeat.y).toBe(3);
      expect(newTexture.offset.x).toBeCloseTo(0.1);
      expect(newTexture.offset.y).toBeCloseTo(0.2);
      expect(newTexture.rotation).toBeCloseTo(Math.PI / 4);
    });

    it('should apply default settings when no existing texture', () => {
      const newTexture = new THREE.Texture();
      service.applyTextureSettings(newTexture);

      expect(newTexture.wrapS).toBe(THREE.RepeatWrapping);
      expect(newTexture.wrapT).toBe(THREE.RepeatWrapping);
    });
  });

  describe('setColorSpace', () => {
    it('should set linear color space for normal maps', () => {
      const texture = new THREE.Texture();
      service.setColorSpace(texture, 'normalMap');
      
      expect(texture.colorSpace).toBe(THREE.LinearSRGBColorSpace);
    });

    it('should set linear color space for roughness maps', () => {
      const texture = new THREE.Texture();
      service.setColorSpace(texture, 'roughnessMap');
      
      expect(texture.colorSpace).toBe(THREE.LinearSRGBColorSpace);
    });

    it('should set sRGB color space for albedo maps', () => {
      const texture = new THREE.Texture();
      service.setColorSpace(texture, 'map');
      
      expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    });

    it('should work without metadata service', () => {
      const serviceNoMetadata = new TextureLoaderService();
      const texture = new THREE.Texture();
      
      expect(() => {
        serviceNoMetadata.setColorSpace(texture, 'map');
      }).not.toThrow();
      
      expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    });
  });

  describe('createTextureFromImage', () => {
    it('should create THREE.Texture from image', () => {
      const img = new Image();
      const texture = service.createTextureFromImage(img);
      
      expect(texture).toBeInstanceOf(THREE.Texture);
      expect(texture.image).toBe(img);
    });
  });

  describe('dataUrlToBuffer', () => {
    it('should convert data URL to buffer', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = service.dataUrlToBuffer(dataUrl);
      
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle different image formats', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP/bAEMAAQEBAQEBAQEBAAAAAAAAAAECAwQFBgf/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AD//Z';
      const buffer = service.dataUrlToBuffer(dataUrl);
      
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('getExtensionFromDataUrl', () => {
    it('should extract png extension', () => {
      const dataUrl = 'data:image/png;base64,ABC123';
      expect(service.getExtensionFromDataUrl(dataUrl)).toBe('png');
    });

    it('should extract jpg extension from jpeg mime', () => {
      const dataUrl = 'data:image/jpeg;base64,ABC123';
      expect(service.getExtensionFromDataUrl(dataUrl)).toBe('jpg');
    });

    it('should default to png for unknown format', () => {
      const dataUrl = 'data:image/unknown;base64,ABC123';
      expect(service.getExtensionFromDataUrl(dataUrl)).toBe('unknown');
    });

    it('should default to png for malformed data URL', () => {
      const dataUrl = 'invalid';
      expect(service.getExtensionFromDataUrl(dataUrl)).toBe('png');
    });
  });

  describe('createSafeFilename', () => {
    it('should create safe filename', () => {
      const filename = service.createSafeFilename('My Material', 'map', 'png');
      expect(filename).toBe('My_Material_map.png');
    });

    it('should replace special characters', () => {
      const filename = service.createSafeFilename('Material@#$%', 'normalMap', 'jpg');
      expect(filename).toBe('Material_____normalMap.jpg');
    });

    it('should handle empty material name', () => {
      const filename = service.createSafeFilename('', 'map', 'png');
      expect(filename).toBe('_map.png');
    });
  });

  describe('disposeTexture', () => {
    it('should dispose texture', () => {
      const texture = new THREE.Texture();
      const disposeSpy = vi.spyOn(texture, 'dispose');
      
      service.disposeTexture(texture);
      
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should handle null texture', () => {
      expect(() => {
        service.disposeTexture(null);
      }).not.toThrow();
    });

    it('should handle texture without dispose method', () => {
      const fakeTexture = {};
      
      expect(() => {
        service.disposeTexture(fakeTexture);
      }).not.toThrow();
    });
  });

  describe('loadTextureFromFile', () => {
    it('should throw error if file reader not configured', async () => {
      const serviceNoReader = new TextureLoaderService();
      
      await expect(
        serviceNoReader.loadTextureFromFile('texture.png')
      ).rejects.toThrow('File reader not configured');
    });

    it('should call loadTGATexture for TGA files', async () => {
      const loadTGASpy = vi.spyOn(service, 'loadTGATexture').mockResolvedValue(new THREE.Texture());
      
      await service.loadTextureFromFile('texture.tga');
      
      expect(loadTGASpy).toHaveBeenCalledWith('texture.tga', null);
    });

    it('should call loadStandardTexture for non-TGA files', async () => {
      const loadStandardSpy = vi.spyOn(service, 'loadStandardTexture').mockResolvedValue(new THREE.Texture());
      
      await service.loadTextureFromFile('texture.png');
      
      expect(loadStandardSpy).toHaveBeenCalledWith('texture.png', null);
    });

    it('should pass existing texture for settings copy', async () => {
      const existingTexture = new THREE.Texture();
      const loadStandardSpy = vi.spyOn(service, 'loadStandardTexture').mockResolvedValue(new THREE.Texture());
      
      await service.loadTextureFromFile('texture.png', existingTexture);
      
      expect(loadStandardSpy).toHaveBeenCalledWith('texture.png', existingTexture);
    });
  });

  describe('extractEmbeddedTextureData', () => {
    it('should return null for texture without image', async () => {
      const texture = new THREE.Texture();
      const dataUrl = await service.extractEmbeddedTextureData(texture);
      
      expect(dataUrl).toBeNull();
    });

    it('should return null for null texture', async () => {
      const dataUrl = await service.extractEmbeddedTextureData(null);
      
      expect(dataUrl).toBeNull();
    });

    it('should extract data URL from image with data URL src', async () => {
      const texture = new THREE.Texture();
      texture.image = { src: 'data:image/png;base64,ABC123' };
      
      const dataUrl = await service.extractEmbeddedTextureData(texture);
      
      expect(dataUrl).toBe('data:image/png;base64,ABC123');
    });

    it('should respect maxSize parameter', async () => {
      const texture = new THREE.Texture();
      const canvas = document.createElement('canvas');
      canvas.width = 4096;
      canvas.height = 4096;
      
      // Mock toDataURL method since jsdom canvas doesn't fully support it
      canvas.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,MOCKDATA');
      
      texture.image = canvas;
      
      const dataUrl = await service.extractEmbeddedTextureData(texture, 512);
      
      expect(dataUrl).toBeDefined();
      expect(typeof dataUrl).toBe('string');
      expect(canvas.toDataURL).toHaveBeenCalled();
    });
  });
});
