import { describe, it, expect, beforeEach } from 'vitest';
import { TextureMetadataService } from '../../src/renderer/modules/io/services/TextureMetadataService.js';

describe('TextureMetadataService', () => {
  let service;

  beforeEach(() => {
    service = new TextureMetadataService();
  });

  describe('getTextureSlotInfo', () => {
    it('should return correct info for map slot', () => {
      const info = service.getTextureSlotInfo('map');
      
      expect(info.label).toBe('Albedo/Diffuse');
      expect(info.shortLabel).toBe('Albedo');
    });

    it('should return correct info for normalMap slot', () => {
      const info = service.getTextureSlotInfo('normalMap');
      
      expect(info.label).toBe('Normal Map');
      expect(info.shortLabel).toBe('Normal');
    });

    it('should return correct info for all standard slots', () => {
      const slots = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
        'aoMap', 'emissiveMap', 'specularMap', 'alphaMap', 
        'bumpMap', 'displacementMap', 'lightMap', 'envMap'
      ];

      slots.forEach(slot => {
        const info = service.getTextureSlotInfo(slot);
        expect(info.label).toBeDefined();
        expect(info.shortLabel).toBeDefined();
      });
    });

    it('should return key as label for unknown slots', () => {
      const info = service.getTextureSlotInfo('unknownSlot');
      
      expect(info.label).toBe('unknownSlot');
      expect(info.shortLabel).toBe('unknownSlot');
    });
  });

  describe('getAllTextureSlots', () => {
    it('should return all texture slots', () => {
      const slots = service.getAllTextureSlots();
      
      expect(Object.keys(slots)).toHaveLength(12);
      expect(slots.map).toBeDefined();
      expect(slots.normalMap).toBeDefined();
      expect(slots.roughnessMap).toBeDefined();
    });

    it('should return a copy of slots (not reference)', () => {
      const slots1 = service.getAllTextureSlots();
      const slots2 = service.getAllTextureSlots();
      
      expect(slots1).not.toBe(slots2);
      expect(slots1).toEqual(slots2);
    });
  });

  describe('getTextureSlotKeys', () => {
    it('should return array of slot keys', () => {
      const keys = service.getTextureSlotKeys();
      
      expect(Array.isArray(keys)).toBe(true);
      expect(keys).toContain('map');
      expect(keys).toContain('normalMap');
      expect(keys).toContain('roughnessMap');
    });

    it('should return all 12 standard slot keys', () => {
      const keys = service.getTextureSlotKeys();
      
      expect(keys).toHaveLength(12);
    });
  });

  describe('isValidTextureSlot', () => {
    it('should validate known texture slots', () => {
      expect(service.isValidTextureSlot('map')).toBe(true);
      expect(service.isValidTextureSlot('normalMap')).toBe(true);
      expect(service.isValidTextureSlot('roughnessMap')).toBe(true);
    });

    it('should reject unknown texture slots', () => {
      expect(service.isValidTextureSlot('invalidSlot')).toBe(false);
      expect(service.isValidTextureSlot('fooBar')).toBe(false);
      expect(service.isValidTextureSlot('')).toBe(false);
    });
  });

  describe('isValidTextureType', () => {
    it('should validate common image extensions', () => {
      expect(service.isValidTextureType('jpg')).toBe(true);
      expect(service.isValidTextureType('jpeg')).toBe(true);
      expect(service.isValidTextureType('png')).toBe(true);
      expect(service.isValidTextureType('gif')).toBe(true);
      expect(service.isValidTextureType('bmp')).toBe(true);
      expect(service.isValidTextureType('webp')).toBe(true);
      expect(service.isValidTextureType('tga')).toBe(true);
      expect(service.isValidTextureType('tiff')).toBe(true);
      expect(service.isValidTextureType('tif')).toBe(true);
    });

    it('should handle extensions with dots', () => {
      expect(service.isValidTextureType('.jpg')).toBe(true);
      expect(service.isValidTextureType('.png')).toBe(true);
    });

    it('should handle uppercase extensions', () => {
      expect(service.isValidTextureType('JPG')).toBe(true);
      expect(service.isValidTextureType('PNG')).toBe(true);
      expect(service.isValidTextureType('TGA')).toBe(true);
    });

    it('should reject invalid extensions', () => {
      expect(service.isValidTextureType('txt')).toBe(false);
      expect(service.isValidTextureType('pdf')).toBe(false);
      expect(service.isValidTextureType('doc')).toBe(false);
      expect(service.isValidTextureType('')).toBe(false);
    });
  });

  describe('getTextureSlotList', () => {
    it('should return array of slot objects', () => {
      const list = service.getTextureSlotList();
      
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it('should include key, label, and shortLabel for each slot', () => {
      const list = service.getTextureSlotList();
      
      list.forEach(slot => {
        expect(slot.key).toBeDefined();
        expect(slot.label).toBeDefined();
        expect(slot.shortLabel).toBeDefined();
      });
    });

    it('should contain expected slots', () => {
      const list = service.getTextureSlotList();
      const keys = list.map(s => s.key);
      
      expect(keys).toContain('map');
      expect(keys).toContain('normalMap');
      expect(keys).toContain('roughnessMap');
    });
  });

  describe('shouldUseLinearColorSpace', () => {
    it('should return true for linear slots', () => {
      expect(service.shouldUseLinearColorSpace('normalMap')).toBe(true);
      expect(service.shouldUseLinearColorSpace('roughnessMap')).toBe(true);
      expect(service.shouldUseLinearColorSpace('metalnessMap')).toBe(true);
      expect(service.shouldUseLinearColorSpace('aoMap')).toBe(true);
    });

    it('should return false for sRGB slots', () => {
      expect(service.shouldUseLinearColorSpace('map')).toBe(false);
      expect(service.shouldUseLinearColorSpace('emissiveMap')).toBe(false);
      expect(service.shouldUseLinearColorSpace('specularMap')).toBe(false);
    });

    it('should return false for unknown slots', () => {
      expect(service.shouldUseLinearColorSpace('unknownSlot')).toBe(false);
    });
  });

  describe('getRecommendedFormat', () => {
    it('should recommend png for slots needing precision', () => {
      expect(service.getRecommendedFormat('normalMap')).toBe('png');
      expect(service.getRecommendedFormat('alphaMap')).toBe('png');
      expect(service.getRecommendedFormat('displacementMap')).toBe('png');
    });

    it('should recommend jpg for slots that can use compression', () => {
      expect(service.getRecommendedFormat('map')).toBe('jpg');
      expect(service.getRecommendedFormat('roughnessMap')).toBe('jpg');
      expect(service.getRecommendedFormat('metalnessMap')).toBe('jpg');
      expect(service.getRecommendedFormat('emissiveMap')).toBe('jpg');
    });

    it('should return png as default for unknown slots', () => {
      expect(service.getRecommendedFormat('unknownSlot')).toBe('png');
    });

    it('should provide recommendations for all standard slots', () => {
      const keys = service.getTextureSlotKeys();
      
      keys.forEach(key => {
        const format = service.getRecommendedFormat(key);
        expect(['jpg', 'png']).toContain(format);
      });
    });
  });
});
