import { describe, it, expect, beforeEach } from 'vitest';
import { MaterialManagementService } from '../../src/renderer/modules/io/services/MaterialManagementService.js';
import * as THREE from 'three';

describe('MaterialManagementService', () => {
  let service;

  beforeEach(() => {
    service = new MaterialManagementService();
  });

  describe('getMaterials', () => {
    it('should return empty array initially', () => {
      expect(service.getMaterials()).toEqual([]);
    });

    it('should return materials after setting them', () => {
      const materials = [
        { uuid: '1', name: 'Material1', textures: {}, meshes: [] },
        { uuid: '2', name: 'Material2', textures: {}, meshes: [] }
      ];
      service.setMaterials(materials);

      expect(service.getMaterials()).toEqual(materials);
    });
  });

  describe('setMaterials', () => {
    it('should set materials collection', () => {
      const materials = [
        { uuid: '1', name: 'Material1', textures: {}, meshes: [] }
      ];
      service.setMaterials(materials);

      expect(service.getMaterials()).toHaveLength(1);
      expect(service.getMaterials()[0].uuid).toBe('1');
    });

    it('should replace existing materials', () => {
      service.setMaterials([{ uuid: '1', name: 'Old', textures: {}, meshes: [] }]);
      service.setMaterials([{ uuid: '2', name: 'New', textures: {}, meshes: [] }]);

      expect(service.getMaterials()).toHaveLength(1);
      expect(service.getMaterials()[0].uuid).toBe('2');
    });
  });

  describe('addMaterial', () => {
    it('should add a single material', () => {
      const materialData = { 
        uuid: '1', 
        name: 'TestMaterial',
        material: new THREE.MeshStandardMaterial(),
        textures: {}, 
        meshes: [] 
      };
      
      service.addMaterial(materialData);

      expect(service.getMaterials()).toHaveLength(1);
      expect(service.getMaterials()[0]).toBe(materialData);
    });

    it('should add multiple materials', () => {
      service.addMaterial({ uuid: '1', name: 'Mat1', textures: {}, meshes: [] });
      service.addMaterial({ uuid: '2', name: 'Mat2', textures: {}, meshes: [] });

      expect(service.getMaterials()).toHaveLength(2);
    });
  });

  describe('getMaterialByUuid', () => {
    beforeEach(() => {
      service.setMaterials([
        { uuid: 'uuid1', name: 'Material1', textures: {}, meshes: [] },
        { uuid: 'uuid2', name: 'Material2', textures: {}, meshes: [] }
      ]);
    });

    it('should find material by UUID', () => {
      const material = service.getMaterialByUuid('uuid1');
      
      expect(material).toBeDefined();
      expect(material.name).toBe('Material1');
    });

    it('should return undefined for non-existent UUID', () => {
      const material = service.getMaterialByUuid('nonexistent');
      
      expect(material).toBeUndefined();
    });
  });

  describe('trackMaterialUsage', () => {
    beforeEach(() => {
      service.setMaterials([
        { uuid: 'uuid1', name: 'Material1', textures: {}, meshes: [] }
      ]);
    });

    it('should track meshes using a material', () => {
      const meshes = [
        new THREE.Mesh(),
        new THREE.Mesh()
      ];
      
      service.trackMaterialUsage('uuid1', meshes);
      
      const material = service.getMaterialByUuid('uuid1');
      expect(material.meshes).toEqual(meshes);
    });

    it('should do nothing for non-existent material', () => {
      const meshes = [new THREE.Mesh()];
      
      expect(() => {
        service.trackMaterialUsage('nonexistent', meshes);
      }).not.toThrow();
    });
  });

  describe('updateMaterialTexture', () => {
    beforeEach(() => {
      service.setMaterials([
        { uuid: 'uuid1', name: 'Material1', textures: {}, meshes: [] }
      ]);
    });

    it('should update texture data', () => {
      const textureData = { 
        texture: new THREE.Texture(), 
        label: 'Albedo',
        source: 'texture.png'
      };
      
      const result = service.updateMaterialTexture('uuid1', 'map', textureData);
      
      expect(result).toBe(true);
      const material = service.getMaterialByUuid('uuid1');
      expect(material.textures.map).toBe(textureData);
    });

    it('should return false for non-existent material', () => {
      const textureData = { texture: new THREE.Texture() };
      
      const result = service.updateMaterialTexture('nonexistent', 'map', textureData);
      
      expect(result).toBe(false);
    });
  });

  describe('removeMaterialTexture', () => {
    beforeEach(() => {
      service.setMaterials([
        { 
          uuid: 'uuid1', 
          name: 'Material1', 
          textures: { 
            map: { texture: new THREE.Texture() } 
          }, 
          meshes: [] 
        }
      ]);
    });

    it('should remove texture from material', () => {
      const result = service.removeMaterialTexture('uuid1', 'map');
      
      expect(result).toBe(true);
      const material = service.getMaterialByUuid('uuid1');
      expect(material.textures.map).toBeUndefined();
    });

    it('should return false for non-existent material', () => {
      const result = service.removeMaterialTexture('nonexistent', 'map');
      
      expect(result).toBe(false);
    });

    it('should return false for non-existent texture', () => {
      const result = service.removeMaterialTexture('uuid1', 'normalMap');
      
      expect(result).toBe(false);
    });
  });

  describe('clearMaterials', () => {
    it('should clear all materials', () => {
      service.setMaterials([
        { uuid: '1', name: 'Mat1', textures: {}, meshes: [] },
        { uuid: '2', name: 'Mat2', textures: {}, meshes: [] }
      ]);
      
      service.clearMaterials();
      
      expect(service.getMaterials()).toEqual([]);
    });
  });

  describe('getMaterialCount', () => {
    it('should return 0 for empty collection', () => {
      expect(service.getMaterialCount()).toBe(0);
    });

    it('should return correct count', () => {
      service.setMaterials([
        { uuid: '1', name: 'Mat1', textures: {}, meshes: [] },
        { uuid: '2', name: 'Mat2', textures: {}, meshes: [] }
      ]);
      
      expect(service.getMaterialCount()).toBe(2);
    });
  });

  describe('hasMaterial', () => {
    beforeEach(() => {
      service.setMaterials([
        { uuid: 'uuid1', name: 'Material1', textures: {}, meshes: [] }
      ]);
    });

    it('should return true for existing material', () => {
      expect(service.hasMaterial('uuid1')).toBe(true);
    });

    it('should return false for non-existent material', () => {
      expect(service.hasMaterial('nonexistent')).toBe(false);
    });
  });

  describe('getMaterialsWithTexture', () => {
    beforeEach(() => {
      service.setMaterials([
        { 
          uuid: '1', 
          name: 'Mat1', 
          textures: { map: { texture: new THREE.Texture() } }, 
          meshes: [] 
        },
        { 
          uuid: '2', 
          name: 'Mat2', 
          textures: { normalMap: { texture: new THREE.Texture() } }, 
          meshes: [] 
        },
        { 
          uuid: '3', 
          name: 'Mat3', 
          textures: { map: { texture: new THREE.Texture() } }, 
          meshes: [] 
        }
      ]);
    });

    it('should find materials with specific texture slot', () => {
      const materials = service.getMaterialsWithTexture('map');
      
      expect(materials).toHaveLength(2);
      expect(materials[0].uuid).toBe('1');
      expect(materials[1].uuid).toBe('3');
    });

    it('should return empty array for unused texture slot', () => {
      const materials = service.getMaterialsWithTexture('roughnessMap');
      
      expect(materials).toHaveLength(0);
    });
  });

  describe('getMaterialsByName', () => {
    beforeEach(() => {
      service.setMaterials([
        { uuid: '1', name: 'WoodMaterial', textures: {}, meshes: [] },
        { uuid: '2', name: 'MetalMaterial', textures: {}, meshes: [] },
        { uuid: '3', name: 'WoodFloor', textures: {}, meshes: [] }
      ]);
    });

    it('should find materials by partial name match', () => {
      const materials = service.getMaterialsByName('Wood');
      
      expect(materials).toHaveLength(2);
    });

    it('should be case insensitive', () => {
      const materials = service.getMaterialsByName('wood');
      
      expect(materials).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const materials = service.getMaterialsByName('NonExistent');
      
      expect(materials).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty collection', () => {
      const stats = service.getStatistics();
      
      expect(stats.totalMaterials).toBe(0);
      expect(stats.materialsWithTextures).toBe(0);
      expect(stats.totalTextures).toBe(0);
      expect(stats.textureSlotUsage).toEqual({});
    });

    it('should return correct statistics', () => {
      service.setMaterials([
        { 
          uuid: '1', 
          name: 'Mat1', 
          textures: { 
            map: { texture: new THREE.Texture() },
            normalMap: { texture: new THREE.Texture() }
          }, 
          meshes: [] 
        },
        { 
          uuid: '2', 
          name: 'Mat2', 
          textures: { 
            map: { texture: new THREE.Texture() }
          }, 
          meshes: [] 
        },
        { 
          uuid: '3', 
          name: 'Mat3', 
          textures: {}, 
          meshes: [] 
        }
      ]);

      const stats = service.getStatistics();
      
      expect(stats.totalMaterials).toBe(3);
      expect(stats.materialsWithTextures).toBe(2);
      expect(stats.totalTextures).toBe(3);
      expect(stats.textureSlotUsage.map).toBe(2);
      expect(stats.textureSlotUsage.normalMap).toBe(1);
    });
  });

  describe('isValidMaterialData', () => {
    it('should validate correct material data', () => {
      const materialData = {
        uuid: '123',
        name: 'TestMaterial',
        material: new THREE.MeshStandardMaterial(),
        textures: {},
        meshes: []
      };
      
      expect(service.isValidMaterialData(materialData)).toBe(true);
    });

    it('should reject material data without uuid', () => {
      const materialData = {
        name: 'TestMaterial',
        material: new THREE.MeshStandardMaterial(),
        textures: {},
        meshes: []
      };
      
      expect(service.isValidMaterialData(materialData)).toBe(false);
    });

    it('should reject material data without name', () => {
      const materialData = {
        uuid: '123',
        material: new THREE.MeshStandardMaterial(),
        textures: {},
        meshes: []
      };
      
      expect(service.isValidMaterialData(materialData)).toBe(false);
    });

    it('should reject material data without meshes array', () => {
      const materialData = {
        uuid: '123',
        name: 'TestMaterial',
        material: new THREE.MeshStandardMaterial(),
        textures: {}
      };
      
      expect(service.isValidMaterialData(materialData)).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(service.isValidMaterialData(null)).toBe(false);
      expect(service.isValidMaterialData(undefined)).toBe(false);
    });
  });
});
