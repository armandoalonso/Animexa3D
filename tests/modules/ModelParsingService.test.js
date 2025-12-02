import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelParsingService } from '../../src/renderer/modules/io/services/ModelParsingService.js';
import * as THREE from 'three';

describe('ModelParsingService', () => {
  let service;

  beforeEach(() => {
    service = new ModelParsingService();
  });

  describe('validateExtension', () => {
    it('should accept valid GLTF extension', () => {
      expect(service.validateExtension('gltf')).toBe('gltf');
      expect(service.validateExtension('GLTF')).toBe('gltf');
    });

    it('should accept valid GLB extension', () => {
      expect(service.validateExtension('glb')).toBe('glb');
      expect(service.validateExtension('GLB')).toBe('glb');
    });

    it('should accept valid FBX extension', () => {
      expect(service.validateExtension('fbx')).toBe('fbx');
      expect(service.validateExtension('FBX')).toBe('fbx');
    });

    it('should reject unsupported extension', () => {
      expect(() => service.validateExtension('obj')).toThrow('Unsupported file format: obj');
      expect(() => service.validateExtension('dae')).toThrow('Unsupported file format: dae');
    });

    it('should normalize extension to lowercase', () => {
      expect(service.validateExtension('GlTf')).toBe('gltf');
      expect(service.validateExtension('FbX')).toBe('fbx');
    });
  });

  describe('parseGLTF', () => {
    it('should parse GLTF buffer and return model data', async () => {
      const mockScene = new THREE.Scene();
      const mockAnimations = [{ name: 'Idle' }];
      
      // Mock the GLTF loader
      service.gltfLoader.parse = vi.fn((buffer, path, onSuccess) => {
        onSuccess({
          scene: mockScene,
          animations: mockAnimations
        });
      });

      const buffer = new ArrayBuffer(8);
      const result = await service.parseGLTF(buffer);

      expect(result).toHaveProperty('model', mockScene);
      expect(result).toHaveProperty('animations', mockAnimations);
      expect(service.gltfLoader.parse).toHaveBeenCalledWith(
        buffer,
        '',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle GLTF with no animations', async () => {
      const mockScene = new THREE.Scene();
      
      service.gltfLoader.parse = vi.fn((buffer, path, onSuccess) => {
        onSuccess({ scene: mockScene });
      });

      const buffer = new ArrayBuffer(8);
      const result = await service.parseGLTF(buffer);

      expect(result.animations).toEqual([]);
    });

    it('should reject on GLTF parse error', async () => {
      const mockError = new Error('Invalid GLTF file');
      
      service.gltfLoader.parse = vi.fn((buffer, path, onSuccess, onError) => {
        onError(mockError);
      });

      const buffer = new ArrayBuffer(8);
      await expect(service.parseGLTF(buffer)).rejects.toThrow('Invalid GLTF file');
    });
  });

  describe('parseFBX', () => {
    it('should parse FBX buffer and return model data', async () => {
      const mockObject = new THREE.Group();
      mockObject.animations = [{ name: 'Walk' }];
      
      service.fbxLoader.parse = vi.fn(() => mockObject);

      const buffer = new ArrayBuffer(8);
      const result = await service.parseFBX(buffer);

      expect(result).toHaveProperty('model', mockObject);
      expect(result).toHaveProperty('animations', mockObject.animations);
      expect(service.fbxLoader.parse).toHaveBeenCalledWith(buffer, '');
    });

    it('should handle FBX with no animations', async () => {
      const mockObject = new THREE.Group();
      
      service.fbxLoader.parse = vi.fn(() => mockObject);

      const buffer = new ArrayBuffer(8);
      const result = await service.parseFBX(buffer);

      expect(result.animations).toEqual([]);
    });

    it('should reject on FBX parse error', async () => {
      service.fbxLoader.parse = vi.fn(() => {
        throw new Error('Invalid FBX file');
      });

      const buffer = new ArrayBuffer(8);
      await expect(service.parseFBX(buffer)).rejects.toThrow('Invalid FBX file');
    });
  });

  describe('extractSkeletons', () => {
    it('should extract skeletons from skinned meshes', () => {
      const bone1 = new THREE.Bone();
      bone1.name = 'Root';
      const bone2 = new THREE.Bone();
      bone2.name = 'Spine';

      const skeleton = new THREE.Skeleton([bone1, bone2]);
      const mesh = new THREE.SkinnedMesh();
      mesh.bind(skeleton);

      const model = new THREE.Group();
      model.add(mesh);

      const result = service.extractSkeletons(model);

      expect(result.skeletons).toHaveLength(1);
      expect(result.bones).toHaveLength(2);
      expect(result.boneNames).toEqual(['Root', 'Spine']);
    });

    it('should avoid duplicate skeletons', () => {
      const bone1 = new THREE.Bone();
      bone1.name = 'Root';

      const skeleton = new THREE.Skeleton([bone1]);
      const mesh1 = new THREE.SkinnedMesh();
      mesh1.bind(skeleton);
      const mesh2 = new THREE.SkinnedMesh();
      mesh2.bind(skeleton);

      const model = new THREE.Group();
      model.add(mesh1);
      model.add(mesh2);

      const result = service.extractSkeletons(model);

      expect(result.skeletons).toHaveLength(1);
      expect(result.bones).toHaveLength(1);
    });

    it('should avoid duplicate bones', () => {
      const bone1 = new THREE.Bone();
      bone1.name = 'Root';
      const bone2 = new THREE.Bone();
      bone2.name = 'Spine';

      const skeleton1 = new THREE.Skeleton([bone1]);
      const skeleton2 = new THREE.Skeleton([bone1, bone2]);
      
      const mesh1 = new THREE.SkinnedMesh();
      mesh1.bind(skeleton1);
      const mesh2 = new THREE.SkinnedMesh();
      mesh2.bind(skeleton2);

      const model = new THREE.Group();
      model.add(mesh1);
      model.add(mesh2);

      const result = service.extractSkeletons(model);

      expect(result.bones).toHaveLength(2);
      expect(result.boneNames).toEqual(['Root', 'Spine']);
    });

    it('should return empty arrays for model without skeletons', () => {
      const mesh = new THREE.Mesh();
      const model = new THREE.Group();
      model.add(mesh);

      const result = service.extractSkeletons(model);

      expect(result.skeletons).toEqual([]);
      expect(result.bones).toEqual([]);
      expect(result.boneNames).toEqual([]);
    });
  });

  describe('extractAllBones', () => {
    it('should extract bones from hierarchy', () => {
      const root = new THREE.Bone();
      root.name = 'Root';
      const spine = new THREE.Bone();
      spine.name = 'Spine';
      const head = new THREE.Bone();
      head.name = 'Head';

      root.add(spine);
      spine.add(head);

      const model = new THREE.Group();
      model.add(root);

      const result = service.extractAllBones(model);

      expect(result.bones).toHaveLength(3);
      expect(result.boneNames).toEqual(['Root', 'Spine', 'Head']);
      expect(result.skeletons).toEqual([]);
    });

    it('should only extract Bone objects', () => {
      const bone = new THREE.Bone();
      bone.name = 'Root';
      const mesh = new THREE.Mesh();
      mesh.name = 'NotABone';

      const model = new THREE.Group();
      model.add(bone);
      model.add(mesh);

      const result = service.extractAllBones(model);

      expect(result.bones).toHaveLength(1);
      expect(result.boneNames).toEqual(['Root']);
    });

    it('should return empty arrays for model without bones', () => {
      const mesh = new THREE.Mesh();
      const model = new THREE.Group();
      model.add(mesh);

      const result = service.extractAllBones(model);

      expect(result.bones).toEqual([]);
      expect(result.boneNames).toEqual([]);
      expect(result.skeletons).toEqual([]);
    });
  });

  describe('extractSkeletonsWithFallback', () => {
    it('should use skeleton extraction when available', () => {
      const bone = new THREE.Bone();
      bone.name = 'Root';
      const skeleton = new THREE.Skeleton([bone]);
      const mesh = new THREE.SkinnedMesh();
      mesh.bind(skeleton);

      const model = new THREE.Group();
      model.add(mesh);

      const result = service.extractSkeletonsWithFallback(model);

      expect(result.bones).toHaveLength(1);
      expect(result.boneNames).toEqual(['Root']);
      expect(result.skeletons).toHaveLength(1);
    });

    it('should fallback to hierarchy extraction when no skinned meshes', () => {
      const bone = new THREE.Bone();
      bone.name = 'Root';

      const model = new THREE.Group();
      model.add(bone);

      const result = service.extractSkeletonsWithFallback(model);

      expect(result.bones).toHaveLength(1);
      expect(result.boneNames).toEqual(['Root']);
      expect(result.skeletons).toEqual([]);
    });

    it('should return empty data when no bones at all', () => {
      const mesh = new THREE.Mesh();
      const model = new THREE.Group();
      model.add(mesh);

      const result = service.extractSkeletonsWithFallback(model);

      expect(result.bones).toEqual([]);
      expect(result.boneNames).toEqual([]);
    });
  });

  describe('hasSkeletalData', () => {
    it('should return true when skeleton has bones', () => {
      const skeletons = {
        skeletons: [],
        bones: [new THREE.Bone()],
        boneNames: ['Root']
      };

      expect(service.hasSkeletalData(skeletons)).toBe(true);
    });

    it('should return false when skeleton has no bones', () => {
      const skeletons = {
        skeletons: [],
        bones: [],
        boneNames: []
      };

      expect(service.hasSkeletalData(skeletons)).toBe(false);
    });

    it('should return false when skeleton is null', () => {
      expect(service.hasSkeletalData(null)).toBe(false);
    });

    it('should return false when skeleton is undefined', () => {
      expect(service.hasSkeletalData(undefined)).toBe(false);
    });

    it('should return false when boneNames is missing', () => {
      const skeletons = { skeletons: [], bones: [] };
      expect(service.hasSkeletalData(skeletons)).toBe(false);
    });
  });
});
