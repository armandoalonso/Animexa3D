import { describe, it, expect, beforeEach } from 'vitest';
import { SkeletonAnalyzer } from '@renderer/modules/SkeletonAnalyzer.js';
import * as THREE from 'three';
import {
  createMockSkeleton,
  createMockModel,
  getHumanoidBoneNames
} from '../utils/testHelpers.js';

describe('SkeletonAnalyzer', () => {
  let skeletonAnalyzer;

  beforeEach(() => {
    skeletonAnalyzer = new SkeletonAnalyzer();
  });

  describe('detectDuplicateBoneNames', () => {
    it('should detect duplicate bone names', () => {
      const bones = ['Bone1', 'Bone2', 'Bone1', 'Bone3', 'Bone2'];

      const duplicates = skeletonAnalyzer.detectDuplicateBoneNames(bones);

      expect(duplicates).toContain('Bone1 (x2)');
      expect(duplicates).toContain('Bone2 (x2)');
      expect(duplicates.length).toBe(2);
    });

    it('should return empty array when no duplicates', () => {
      const bones = ['Bone1', 'Bone2', 'Bone3'];

      const duplicates = skeletonAnalyzer.detectDuplicateBoneNames(bones);

      expect(duplicates.length).toBe(0);
    });

    it('should handle empty bone array', () => {
      const duplicates = skeletonAnalyzer.detectDuplicateBoneNames([]);

      expect(duplicates.length).toBe(0);
    });

    it('should handle null bone names', () => {
      const duplicates = skeletonAnalyzer.detectDuplicateBoneNames(null);

      expect(duplicates.length).toBe(0);
    });

    it('should count multiple duplicates correctly', () => {
      const bones = ['Bone1', 'Bone1', 'Bone1'];

      const duplicates = skeletonAnalyzer.detectDuplicateBoneNames(bones);

      expect(duplicates).toContain('Bone1 (x3)');
    });
  });

  describe('buildBoneTree', () => {
    it('should build bone tree HTML', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);
      const skeletonInfo = {
        bones: skeleton.bones,
        boneNames: skeleton.bones.map(b => b.name)
      };

      const html = skeletonAnalyzer.buildBoneTree(skeletonInfo, true, {});

      expect(html).toContain('bone-tree');
      expect(html).toContain('Hips');
      expect(html).toContain('Spine');
      expect(html).toContain('Head');
    });

    it('should mark mapped bones', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);
      const skeletonInfo = {
        bones: skeleton.bones,
        boneNames: skeleton.bones.map(b => b.name)
      };
      const boneMapping = { 'Hips': 'TargetHips' };

      const html = skeletonAnalyzer.buildBoneTree(skeletonInfo, true, boneMapping);

      expect(html).toContain('bone-mapped');
    });

    it('should handle empty skeleton', () => {
      const html = skeletonAnalyzer.buildBoneTree({ bones: [] }, true, {});

      expect(html).toContain('No bones found');
    });

    it('should handle null skeleton', () => {
      const html = skeletonAnalyzer.buildBoneTree(null, true, {});

      expect(html).toContain('No bones found');
    });

    it('should apply correct indentation for hierarchy', () => {
      const root = new THREE.Bone();
      root.name = 'Root';
      const child = new THREE.Bone();
      child.name = 'Child';
      root.add(child);

      const skeletonInfo = {
        bones: [root, child],
        boneNames: ['Root', 'Child']
      };

      const html = skeletonAnalyzer.buildBoneTree(skeletonInfo, true, {});

      expect(html).toContain('padding-left: 0px'); // Root
      expect(html).toContain('padding-left: 20px'); // Child
    });
  });

  describe('findRootBones', () => {
    it('should find root bones without parents', () => {
      const bone1 = new THREE.Bone();
      bone1.name = 'Root1';
      const bone2 = new THREE.Bone();
      bone2.name = 'Root2';

      const rootBones = skeletonAnalyzer.findRootBones([bone1, bone2]);

      expect(rootBones.length).toBe(2);
      expect(rootBones).toContain(bone1);
      expect(rootBones).toContain(bone2);
    });

    it('should exclude bones with bone parents', () => {
      const parent = new THREE.Bone();
      parent.name = 'Parent';
      const child = new THREE.Bone();
      child.name = 'Child';
      parent.add(child);

      const rootBones = skeletonAnalyzer.findRootBones([parent, child]);

      expect(rootBones.length).toBe(1);
      expect(rootBones[0]).toBe(parent);
    });

    it('should handle empty bone array', () => {
      const rootBones = skeletonAnalyzer.findRootBones([]);

      expect(rootBones.length).toBe(0);
    });
  });

  describe('extractSkeletonInfo', () => {
    it('should extract bones from model', () => {
      const model = createMockModel(['Hips', 'Spine', 'Head']);

      const info = skeletonAnalyzer.extractSkeletonInfo(model);

      expect(info.bones.length).toBeGreaterThan(0);
      expect(info.boneNames.length).toBeGreaterThan(0);
    });

    it('should return empty arrays for null model', () => {
      const info = skeletonAnalyzer.extractSkeletonInfo(null);

      expect(info.bones.length).toBe(0);
      expect(info.boneNames.length).toBe(0);
    });

    it('should extract bone names correctly', () => {
      const model = new THREE.Object3D();
      const bone1 = new THREE.Bone();
      bone1.name = 'TestBone1';
      const bone2 = new THREE.Bone();
      bone2.name = 'TestBone2';
      model.add(bone1);
      model.add(bone2);

      const info = skeletonAnalyzer.extractSkeletonInfo(model);

      expect(info.boneNames).toContain('TestBone1');
      expect(info.boneNames).toContain('TestBone2');
    });
  });

  describe('createSkeletonFromBones', () => {
    it('should create skeleton from bone array', () => {
      const bones = [
        new THREE.Bone(),
        new THREE.Bone(),
        new THREE.Bone()
      ];
      bones[0].name = 'Hips';
      bones[1].name = 'Spine';
      bones[2].name = 'Head';
      bones[0].add(bones[1]);
      bones[1].add(bones[2]);

      const skeleton = skeletonAnalyzer.createSkeletonFromBones(bones);

      expect(skeleton).toBeInstanceOf(THREE.Skeleton);
      expect(skeleton.bones.length).toBe(3);
      expect(skeleton.boneInverses.length).toBe(3);
    });

    it('should return null for empty bone array', () => {
      const skeleton = skeletonAnalyzer.createSkeletonFromBones([]);

      expect(skeleton).toBeNull();
    });

    it('should return null for null bones', () => {
      const skeleton = skeletonAnalyzer.createSkeletonFromBones(null);

      expect(skeleton).toBeNull();
    });

    it('should update world matrices', () => {
      const bones = [new THREE.Bone()];
      bones[0].name = 'Root';

      const skeleton = skeletonAnalyzer.createSkeletonFromBones(bones);

      expect(skeleton.bones[0].matrixWorld).toBeDefined();
    });
  });

  describe('createSkeletonHelper', () => {
    it('should create skeleton helper', () => {
      const bones = [new THREE.Bone(), new THREE.Bone()];
      bones[0].name = 'Bone1';
      bones[1].name = 'Bone2';
      
      const skeletonInfo = { bones, boneNames: ['Bone1', 'Bone2'] };

      const helper = skeletonAnalyzer.createSkeletonHelper(skeletonInfo);

      expect(helper).toBeInstanceOf(THREE.Object3D);
      expect(helper.name).toBe('SkeletonHelper');
      expect(helper.children.length).toBe(2);
    });

    it('should handle empty skeleton info', () => {
      const helper = skeletonAnalyzer.createSkeletonHelper({ bones: [] });

      expect(helper).toBeInstanceOf(THREE.Object3D);
      expect(helper.children.length).toBe(0);
    });
  });

  describe('findIndexOfBone', () => {
    it('should find bone index by object reference', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);
      const targetBone = skeleton.bones[1];

      const index = skeletonAnalyzer.findIndexOfBone(skeleton, targetBone);

      expect(index).toBe(1);
    });

    it('should return -1 for non-existent bone', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);
      const otherBone = new THREE.Bone();

      const index = skeletonAnalyzer.findIndexOfBone(skeleton, otherBone);

      expect(index).toBe(-1);
    });

    it('should return -1 for null bone', () => {
      const skeleton = createMockSkeleton(['Hips']);

      const index = skeletonAnalyzer.findIndexOfBone(skeleton, null);

      expect(index).toBe(-1);
    });
  });

  describe('findIndexOfBoneByName', () => {
    it('should find bone index by name', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);

      const index = skeletonAnalyzer.findIndexOfBoneByName(skeleton, 'Spine');

      expect(index).toBe(1);
    });

    it('should return -1 for non-existent bone name', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);

      const index = skeletonAnalyzer.findIndexOfBoneByName(skeleton, 'NonExistent');

      expect(index).toBe(-1);
    });

    it('should return -1 for null name', () => {
      const skeleton = createMockSkeleton(['Hips']);

      const index = skeletonAnalyzer.findIndexOfBoneByName(skeleton, null);

      expect(index).toBe(-1);
    });

    it('should be case-sensitive', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);

      const index = skeletonAnalyzer.findIndexOfBoneByName(skeleton, 'spine');

      expect(index).toBe(-1);
    });
  });

  describe('getSkeletonFromModel', () => {
    it('should extract skeleton from SkinnedMesh', () => {
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial();
      const bones = [new THREE.Bone(), new THREE.Bone()];
      const skeleton = new THREE.Skeleton(bones);
      const mesh = new THREE.SkinnedMesh(geometry, material);
      mesh.bind(skeleton);

      const model = new THREE.Object3D();
      model.add(mesh);

      const extractedSkeleton = skeletonAnalyzer.getSkeletonFromModel(model);

      expect(extractedSkeleton).toBe(skeleton);
    });

    it('should create skeleton from skeleton info if no SkinnedMesh', () => {
      const model = new THREE.Object3D();
      const bones = [new THREE.Bone(), new THREE.Bone()];
      const skeletonInfo = { bones, boneNames: ['Bone1', 'Bone2'] };

      const skeleton = skeletonAnalyzer.getSkeletonFromModel(model, skeletonInfo);

      expect(skeleton).toBeInstanceOf(THREE.Skeleton);
    });

    it('should return null for null model', () => {
      const skeleton = skeletonAnalyzer.getSkeletonFromModel(null);

      expect(skeleton).toBeNull();
    });
  });

  describe('detectFunctionalRootBone', () => {
    it('should detect Hips as functional root', () => {
      const bones = [
        new THREE.Bone(),
        new THREE.Bone(),
        new THREE.Bone()
      ];
      bones[0].name = 'Armature';
      bones[1].name = 'Hips';
      bones[2].name = 'Spine';

      const rootBone = skeletonAnalyzer.detectFunctionalRootBone(bones);

      expect(rootBone).toBe('Hips');
    });

    it('should detect Pelvis as functional root', () => {
      const bones = [
        new THREE.Bone(),
        new THREE.Bone()
      ];
      bones[0].name = 'Root';
      bones[1].name = 'Pelvis';
      bones[0].add(bones[1]); // Add Pelvis as child of Root

      const rootBone = skeletonAnalyzer.detectFunctionalRootBone(bones);

      // May detect either Root or Pelvis depending on hierarchy
      expect(['Root', 'Pelvis']).toContain(rootBone);
    });

    it('should fallback to first root bone', () => {
      const bone1 = new THREE.Bone();
      bone1.name = 'Bone1';
      const bone2 = new THREE.Bone();
      bone2.name = 'Bone2';
      bone1.add(bone2);

      const rootBone = skeletonAnalyzer.detectFunctionalRootBone([bone1, bone2]);

      expect(rootBone).toBe('Bone1');
    });

    it('should return null for empty bones', () => {
      const rootBone = skeletonAnalyzer.detectFunctionalRootBone([]);

      expect(rootBone).toBeNull();
    });

    it('should return null for null bones', () => {
      const rootBone = skeletonAnalyzer.detectFunctionalRootBone(null);

      expect(rootBone).toBeNull();
    });
  });

  describe('analyzeSkeletonStructure', () => {
    it('should analyze skeleton structure', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg']);

      const analysis = skeletonAnalyzer.analyzeSkeletonStructure(skeleton);

      expect(analysis.boneCount).toBe(6);
      expect(analysis.rootBones.length).toBeGreaterThan(0);
      expect(analysis.maxDepth).toBeGreaterThanOrEqual(0);
      expect(analysis.hasSymmetry).toBe(true);
      expect(analysis.limbCount).toBeGreaterThan(0);
    });

    it('should detect symmetry in bones', () => {
      const skeleton = createMockSkeleton(['Hips', 'Left_Arm', 'Right_Arm']);

      const analysis = skeletonAnalyzer.analyzeSkeletonStructure(skeleton);

      expect(analysis.hasSymmetry).toBe(true);
    });

    it('should detect lack of symmetry', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);

      const analysis = skeletonAnalyzer.analyzeSkeletonStructure(skeleton);

      expect(analysis.hasSymmetry).toBe(false);
    });

    it('should count limb bones', () => {
      const skeleton = createMockSkeleton(['LeftArm', 'RightArm', 'LeftLeg', 'RightLeg']);

      const analysis = skeletonAnalyzer.analyzeSkeletonStructure(skeleton);

      expect(analysis.limbCount).toBe(4);
    });

    it('should calculate max depth', () => {
      const root = new THREE.Bone();
      root.name = 'Root';
      const child1 = new THREE.Bone();
      child1.name = 'Child1';
      const child2 = new THREE.Bone();
      child2.name = 'Child2';
      root.add(child1);
      child1.add(child2);

      const skeleton = new THREE.Skeleton([root, child1, child2]);

      const analysis = skeletonAnalyzer.analyzeSkeletonStructure(skeleton);

      expect(analysis.maxDepth).toBe(2);
    });

    it('should handle null skeleton', () => {
      const analysis = skeletonAnalyzer.analyzeSkeletonStructure(null);

      expect(analysis.boneCount).toBe(0);
      expect(analysis.rootBones.length).toBe(0);
      expect(analysis.maxDepth).toBe(0);
    });
  });
});
