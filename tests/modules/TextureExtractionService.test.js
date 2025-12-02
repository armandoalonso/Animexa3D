import { describe, it, expect, beforeEach } from 'vitest';
import { TextureExtractionService } from '../../src/renderer/modules/io/services/TextureExtractionService.js';
import * as THREE from 'three';

describe('TextureExtractionService', () => {
  let service;

  beforeEach(() => {
    service = new TextureExtractionService();
  });

  describe('extractMaterialsFromModel', () => {
    it('should extract materials from a simple model', () => {
      const material = new THREE.MeshStandardMaterial({ name: 'TestMaterial' });
      const geometry = new THREE.BoxGeometry();
      const mesh = new THREE.Mesh(geometry, material);
      const model = new THREE.Group();
      model.add(mesh);

      const materials = service.extractMaterialsFromModel(model);

      expect(materials).toHaveLength(1);
      expect(materials[0].name).toBe('TestMaterial');
      expect(materials[0].material).toBe(material);
      expect(materials[0].meshes).toContain(mesh);
    });

    it('should avoid duplicate materials', () => {
      const sharedMaterial = new THREE.MeshStandardMaterial({ name: 'SharedMaterial' });
      const geometry = new THREE.BoxGeometry();
      const mesh1 = new THREE.Mesh(geometry, sharedMaterial);
      const mesh2 = new THREE.Mesh(geometry, sharedMaterial);
      const model = new THREE.Group();
      model.add(mesh1);
      model.add(mesh2);

      const materials = service.extractMaterialsFromModel(model);

      expect(materials).toHaveLength(1);
      expect(materials[0].meshes).toHaveLength(2);
      expect(materials[0].meshes).toContain(mesh1);
      expect(materials[0].meshes).toContain(mesh2);
    });

    it('should handle array of materials', () => {
      const material1 = new THREE.MeshStandardMaterial({ name: 'Material1' });
      const material2 = new THREE.MeshStandardMaterial({ name: 'Material2' });
      const geometry = new THREE.BoxGeometry();
      const mesh = new THREE.Mesh(geometry, [material1, material2]);
      const model = new THREE.Group();
      model.add(mesh);

      const materials = service.extractMaterialsFromModel(model);

      expect(materials).toHaveLength(2);
      expect(materials[0].name).toBe('Material1');
      expect(materials[1].name).toBe('Material2');
    });

    it('should generate default names for unnamed materials', () => {
      const material = new THREE.MeshStandardMaterial();
      const geometry = new THREE.BoxGeometry();
      const mesh = new THREE.Mesh(geometry, material);
      const model = new THREE.Group();
      model.add(mesh);

      const materials = service.extractMaterialsFromModel(model);

      expect(materials[0].name).toBe('Material 1');
    });

    it('should ignore non-mesh objects', () => {
      const light = new THREE.PointLight();
      const camera = new THREE.PerspectiveCamera();
      const model = new THREE.Group();
      model.add(light);
      model.add(camera);

      const materials = service.extractMaterialsFromModel(model);

      expect(materials).toHaveLength(0);
    });
  });

  describe('extractTexturesFromMaterial', () => {
    it('should extract textures from material', () => {
      const texture = new THREE.Texture();
      texture.name = 'TestTexture';
      const material = new THREE.MeshStandardMaterial({
        map: texture
      });

      const textures = service.extractTexturesFromMaterial(material);

      expect(textures.map).toBeDefined();
      expect(textures.map.texture).toBe(texture);
      expect(textures.map.label).toBe('Albedo/Diffuse');
      expect(textures.map.shortLabel).toBe('Albedo');
    });

    it('should extract multiple texture types', () => {
      const albedoTexture = new THREE.Texture();
      const normalTexture = new THREE.Texture();
      const roughnessTexture = new THREE.Texture();
      
      const material = new THREE.MeshStandardMaterial({
        map: albedoTexture,
        normalMap: normalTexture,
        roughnessMap: roughnessTexture
      });

      const textures = service.extractTexturesFromMaterial(material);

      expect(Object.keys(textures)).toHaveLength(3);
      expect(textures.map).toBeDefined();
      expect(textures.normalMap).toBeDefined();
      expect(textures.roughnessMap).toBeDefined();
    });

    it('should return empty object for material without textures', () => {
      const material = new THREE.MeshStandardMaterial();
      const textures = service.extractTexturesFromMaterial(material);

      expect(Object.keys(textures)).toHaveLength(0);
    });

    it('should include correct labels for all texture slots', () => {
      const texture = new THREE.Texture();
      const material = new THREE.MeshStandardMaterial({
        normalMap: texture
      });

      const textures = service.extractTexturesFromMaterial(material);

      expect(textures.normalMap.label).toBe('Normal Map');
      expect(textures.normalMap.shortLabel).toBe('Normal');
    });
  });

  describe('getTextureSource', () => {
    it('should identify embedded data URL textures', () => {
      const texture = new THREE.Texture();
      texture.image = { src: 'data:image/png;base64,ABC123' };

      const source = service.getTextureSource(texture);

      expect(source).toBe('Embedded');
    });

    it('should identify blob textures', () => {
      const texture = new THREE.Texture();
      texture.image = { src: 'blob:http://localhost/abc-123' };

      const source = service.getTextureSource(texture);

      expect(source).toBe('Blob Texture');
    });

    it('should extract filename from URL', () => {
      const texture = new THREE.Texture();
      texture.image = { src: 'http://example.com/textures/wood.png?version=1' };

      const source = service.getTextureSource(texture);

      expect(source).toBe('wood.png');
    });

    it('should handle canvas elements', () => {
      const texture = new THREE.Texture();
      texture.image = document.createElement('canvas');

      const source = service.getTextureSource(texture);

      expect(source).toBe('Canvas/Embedded');
    });

    it('should use userData path if available', () => {
      const texture = new THREE.Texture();
      texture.userData = { path: '/path/to/texture.jpg' };

      const source = service.getTextureSource(texture);

      expect(source).toBe('texture.jpg');
    });

    it('should use texture name as fallback', () => {
      const texture = new THREE.Texture();
      texture.name = 'MyTexture';

      const source = service.getTextureSource(texture);

      expect(source).toBe('MyTexture');
    });

    it('should return default for unknown sources', () => {
      const texture = new THREE.Texture();

      const source = service.getTextureSource(texture);

      expect(source).toBe('Embedded/Generated');
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
      expect(service.getMimeType('texture.JPG')).toBe('image/jpeg');
    });

    it('should return default for unknown extensions', () => {
      expect(service.getMimeType('texture.xyz')).toBe('image/png');
    });

    it('should handle paths with multiple dots', () => {
      expect(service.getMimeType('/path/to/my.texture.file.jpg')).toBe('image/jpeg');
    });
  });

  describe('isEmbeddedTexture', () => {
    it('should identify data URL as embedded', () => {
      const texture = new THREE.Texture();
      texture.image = { src: 'data:image/png;base64,ABC' };

      expect(service.isEmbeddedTexture(texture)).toBe(true);
    });

    it('should identify canvas as embedded', () => {
      const texture = new THREE.Texture();
      texture.image = document.createElement('canvas');

      expect(service.isEmbeddedTexture(texture)).toBe(true);
    });

    it('should identify texture with currentSrc but no src as embedded', () => {
      const texture = new THREE.Texture();
      texture.image = { currentSrc: 'http://example.com/texture.png' };

      expect(service.isEmbeddedTexture(texture)).toBe(true);
    });

    it('should not identify external URL as embedded', () => {
      const texture = new THREE.Texture();
      texture.image = { src: 'http://example.com/texture.png' };

      expect(service.isEmbeddedTexture(texture)).toBe(false);
    });

    it('should return false for texture without image', () => {
      const texture = new THREE.Texture();

      expect(service.isEmbeddedTexture(texture)).toBe(false);
    });

    it('should return false for null texture', () => {
      expect(service.isEmbeddedTexture(null)).toBe(false);
    });
  });

  describe('extractFilename', () => {
    it('should extract filename from Unix path', () => {
      const filename = service.extractFilename('/path/to/texture.png');
      expect(filename).toBe('texture.png');
    });

    it('should extract filename from Windows path', () => {
      const filename = service.extractFilename('C:\\Users\\textures\\wood.jpg');
      expect(filename).toBe('wood.jpg');
    });

    it('should handle filename only', () => {
      const filename = service.extractFilename('texture.png');
      expect(filename).toBe('texture.png');
    });

    it('should handle mixed path separators', () => {
      const filename = service.extractFilename('C:/Users\\textures/file.png');
      expect(filename).toBe('file.png');
    });
  });
});
