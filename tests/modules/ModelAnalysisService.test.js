import { describe, it, expect, beforeEach } from 'vitest';
import { ModelAnalysisService } from '../../src/renderer/modules/io/services/ModelAnalysisService.js';
import * as THREE from 'three';

describe('ModelAnalysisService', () => {
  let service;

  beforeEach(() => {
    service = new ModelAnalysisService();
  });

  describe('countPolygons', () => {
    it('should count polygons from indexed geometry', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,  // vertex 0
        1, 0, 0,  // vertex 1
        1, 1, 0,  // vertex 2
        0, 1, 0   // vertex 3
      ]);
      const indices = new Uint16Array([0, 1, 2, 0, 2, 3]); // 2 triangles
      
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const mesh = new THREE.Mesh(geometry);
      const model = new THREE.Group();
      model.add(mesh);

      const count = service.countPolygons(model);
      expect(count).toBe(2);
    });

    it('should count polygons from non-indexed geometry', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,  1, 0, 0,  1, 1, 0,  // triangle 1
        0, 0, 0,  1, 1, 0,  0, 1, 0   // triangle 2
      ]);
      
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      const mesh = new THREE.Mesh(geometry);
      const model = new THREE.Group();
      model.add(mesh);

      const count = service.countPolygons(model);
      expect(count).toBe(2);
    });

    it('should count polygons from multiple meshes', () => {
      const geometry1 = new THREE.BufferGeometry();
      const vertices1 = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]);
      geometry1.setAttribute('position', new THREE.BufferAttribute(vertices1, 3));

      const geometry2 = new THREE.BufferGeometry();
      const vertices2 = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]);
      geometry2.setAttribute('position', new THREE.BufferAttribute(vertices2, 3));

      const mesh1 = new THREE.Mesh(geometry1);
      const mesh2 = new THREE.Mesh(geometry2);
      const model = new THREE.Group();
      model.add(mesh1);
      model.add(mesh2);

      const count = service.countPolygons(model);
      expect(count).toBe(2);
    });

    it('should return 0 for model without geometry', () => {
      const model = new THREE.Group();
      const count = service.countPolygons(model);
      expect(count).toBe(0);
    });
  });

  describe('countBones', () => {
    it('should count bones in skinned mesh', () => {
      const bone1 = new THREE.Bone();
      const bone2 = new THREE.Bone();
      const bone3 = new THREE.Bone();

      const skeleton = new THREE.Skeleton([bone1, bone2, bone3]);
      const mesh = new THREE.SkinnedMesh();
      mesh.bind(skeleton);

      const model = new THREE.Group();
      model.add(mesh);

      const count = service.countBones(model);
      expect(count).toBe(3);
    });

    it('should count bones in multiple skinned meshes', () => {
      const skeleton1 = new THREE.Skeleton([new THREE.Bone(), new THREE.Bone()]);
      const mesh1 = new THREE.SkinnedMesh();
      mesh1.bind(skeleton1);

      const skeleton2 = new THREE.Skeleton([new THREE.Bone()]);
      const mesh2 = new THREE.SkinnedMesh();
      mesh2.bind(skeleton2);

      const model = new THREE.Group();
      model.add(mesh1);
      model.add(mesh2);

      const count = service.countBones(model);
      expect(count).toBe(3);
    });

    it('should return 0 for model without skeletons', () => {
      const mesh = new THREE.Mesh();
      const model = new THREE.Group();
      model.add(mesh);

      const count = service.countBones(model);
      expect(count).toBe(0);
    });
  });

  describe('analyzeModelStructure', () => {
    it('should analyze complete model structure', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      const bone = new THREE.Bone();
      bone.name = 'Root';
      const skeleton = new THREE.Skeleton([bone]);
      const mesh = new THREE.SkinnedMesh(geometry);
      mesh.bind(skeleton);

      const model = new THREE.Group();
      model.add(mesh);

      const animations = [{ name: 'Idle' }, { name: 'Walk' }];
      const skeletons = {
        skeletons: [skeleton],
        bones: [bone],
        boneNames: ['Root']
      };

      const stats = service.analyzeModelStructure(model, animations, skeletons);

      expect(stats).toEqual({
        polygons: 1,
        bones: 1,
        animations: 2,
        skeletons: 1,
        boneNames: ['Root'],
        hasSkeleton: true,
        hasAnimations: true,
        hasGeometry: true
      });
    });

    it('should handle model without animations', () => {
      const mesh = new THREE.Mesh();
      const model = new THREE.Group();
      model.add(mesh);

      const stats = service.analyzeModelStructure(model, null, null);

      expect(stats.animations).toBe(0);
      expect(stats.hasAnimations).toBe(false);
    });

    it('should handle model without skeleton', () => {
      const mesh = new THREE.Mesh();
      const model = new THREE.Group();
      model.add(mesh);

      const skeletons = { skeletons: [], bones: [], boneNames: [] };
      const stats = service.analyzeModelStructure(model, [], skeletons);

      expect(stats.bones).toBe(0);
      expect(stats.hasSkeleton).toBe(false);
    });

    it('should handle empty model', () => {
      const model = new THREE.Group();
      const stats = service.analyzeModelStructure(model, [], null);

      expect(stats).toEqual({
        polygons: 0,
        bones: 0,
        animations: 0,
        skeletons: 0,
        boneNames: [],
        hasSkeleton: false,
        hasAnimations: false,
        hasGeometry: false
      });
    });
  });

  describe('verifyBoneCompatibility', () => {
    it('should report perfect match when all bones match', () => {
      const sourceSkeletons = { boneNames: ['Root', 'Spine', 'Head'] };
      const targetSkeletons = { boneNames: ['Root', 'Spine', 'Head'] };

      const result = service.verifyBoneCompatibility(sourceSkeletons, targetSkeletons);

      expect(result.compatible).toBe(true);
      expect(result.matchPercentage).toBe(100);
      expect(result.message).toContain('Perfect match');
      expect(result.matchingBones).toEqual(['Root', 'Spine', 'Head']);
      expect(result.missingBones).toEqual([]);
      expect(result.extraBones).toEqual([]);
    });

    it('should report good match when 80%+ bones match', () => {
      const sourceSkeletons = { boneNames: ['Root', 'Spine', 'Head', 'Neck', 'LeftArm'] };
      const targetSkeletons = { boneNames: ['Root', 'Spine', 'Head', 'Neck', 'RightArm'] };

      const result = service.verifyBoneCompatibility(sourceSkeletons, targetSkeletons);

      expect(result.compatible).toBe(true);
      expect(result.matchPercentage).toBe(80);
      expect(result.message).toContain('Good match');
      expect(result.matchingBones).toHaveLength(4);
      expect(result.missingBones).toEqual(['LeftArm']);
      expect(result.extraBones).toEqual(['RightArm']);
    });

    it('should report poor match when less than 80% bones match', () => {
      const sourceSkeletons = { boneNames: ['Root', 'Spine', 'Head'] };
      const targetSkeletons = { boneNames: ['Root', 'Pelvis', 'Chest'] };

      const result = service.verifyBoneCompatibility(sourceSkeletons, targetSkeletons);

      expect(result.compatible).toBe(false);
      expect(result.matchPercentage).toBeLessThan(80);
      expect(result.message).toContain('Poor match');
    });

    it('should handle null source skeletons', () => {
      const targetSkeletons = { boneNames: ['Root'] };

      const result = service.verifyBoneCompatibility(null, targetSkeletons);

      expect(result.compatible).toBe(false);
      expect(result.matchPercentage).toBe(0);
      expect(result.message).toContain('no skeleton data');
      expect(result.sourceBoneCount).toBe(0);
      expect(result.targetBoneCount).toBe(0);
    });

    it('should handle null target skeletons', () => {
      const sourceSkeletons = { boneNames: ['Root'] };

      const result = service.verifyBoneCompatibility(sourceSkeletons, null);

      expect(result.compatible).toBe(false);
      expect(result.matchPercentage).toBe(0);
      expect(result.message).toContain('no skeleton data');
    });

    it('should handle empty bone arrays', () => {
      const sourceSkeletons = { boneNames: [] };
      const targetSkeletons = { boneNames: [] };

      const result = service.verifyBoneCompatibility(sourceSkeletons, targetSkeletons);

      expect(result.compatible).toBe(false);
      expect(result.matchPercentage).toBe(0);
      expect(result.message).toContain('no bones');
    });

    it('should calculate correct bone counts', () => {
      const sourceSkeletons = { boneNames: ['Root', 'Spine', 'Head'] };
      const targetSkeletons = { boneNames: ['Root', 'Spine'] };

      const result = service.verifyBoneCompatibility(sourceSkeletons, targetSkeletons);

      expect(result.sourceBoneCount).toBe(3);
      expect(result.targetBoneCount).toBe(2);
    });
  });

  describe('generateCompatibilityMessage', () => {
    it('should generate perfect match message', () => {
      const message = service.generateCompatibilityMessage(100, true);
      expect(message).toContain('Perfect match');
    });

    it('should generate good match message', () => {
      const message = service.generateCompatibilityMessage(85.5, true);
      expect(message).toContain('Good match');
      expect(message).toContain('85.5%');
    });

    it('should generate poor match message', () => {
      const message = service.generateCompatibilityMessage(45.2, false);
      expect(message).toContain('Poor match');
      expect(message).toContain('45.2%');
    });
  });

  describe('getCompatibilityLevel', () => {
    it('should return perfect for 100% match', () => {
      expect(service.getCompatibilityLevel(100)).toBe('perfect');
    });

    it('should return good for 80-99% match', () => {
      expect(service.getCompatibilityLevel(80)).toBe('good');
      expect(service.getCompatibilityLevel(90)).toBe('good');
      expect(service.getCompatibilityLevel(99)).toBe('good');
    });

    it('should return fair for 60-79% match', () => {
      expect(service.getCompatibilityLevel(60)).toBe('fair');
      expect(service.getCompatibilityLevel(70)).toBe('fair');
      expect(service.getCompatibilityLevel(79)).toBe('fair');
    });

    it('should return poor for less than 60% match', () => {
      expect(service.getCompatibilityLevel(0)).toBe('poor');
      expect(service.getCompatibilityLevel(30)).toBe('poor');
      expect(service.getCompatibilityLevel(59)).toBe('poor');
    });
  });

  describe('validateModelData', () => {
    it('should validate complete model data', () => {
      const modelData = {
        model: new THREE.Group(),
        animations: [{ name: 'Idle' }],
        skeletons: { boneNames: ['Root'] }
      };

      const result = service.validateModelData(modelData);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should warn about missing animations', () => {
      const modelData = {
        model: new THREE.Group(),
        animations: [],
        skeletons: { boneNames: ['Root'] }
      };

      const result = service.validateModelData(modelData);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Model has no animations');
    });

    it('should warn about missing skeletal data', () => {
      const modelData = {
        model: new THREE.Group(),
        animations: [{ name: 'Idle' }],
        skeletons: { boneNames: [] }
      };

      const result = service.validateModelData(modelData);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Model has no skeletal data');
    });

    it('should error on null model data', () => {
      const result = service.validateModelData(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model data is null or undefined');
    });

    it('should error on missing model object', () => {
      const modelData = {
        animations: [],
        skeletons: { boneNames: [] }
      };

      const result = service.validateModelData(modelData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model object is missing');
    });
  });

  describe('getSummaryText', () => {
    it('should format complete model summary', () => {
      const stats = {
        polygons: 15000,
        bones: 50,
        animations: 3
      };

      const summary = service.getSummaryText(stats);

      expect(summary).toContain('15,000 polygons');
      expect(summary).toContain('50 bones');
      expect(summary).toContain('3 animations');
    });

    it('should handle single animation correctly', () => {
      const stats = {
        polygons: 1000,
        bones: 10,
        animations: 1
      };

      const summary = service.getSummaryText(stats);

      expect(summary).toContain('1 animation');
      expect(summary).not.toContain('animations');
    });

    it('should handle model with no bones', () => {
      const stats = {
        polygons: 5000,
        bones: 0,
        animations: 2
      };

      const summary = service.getSummaryText(stats);

      expect(summary).toContain('5,000 polygons');
      expect(summary).not.toContain('bones');
      expect(summary).toContain('2 animations');
    });

    it('should return no data message for empty stats', () => {
      const stats = {
        polygons: 0,
        bones: 0,
        animations: 0
      };

      const summary = service.getSummaryText(stats);

      expect(summary).toBe('No data available');
    });

    it('should format large numbers with commas', () => {
      const stats = {
        polygons: 1234567,
        bones: 0,
        animations: 0
      };

      const summary = service.getSummaryText(stats);

      expect(summary).toContain('1,234,567');
    });
  });
});
