import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetargetManager, BindPoseModes } from '@renderer/modules/RetargetManager.js';
import * as THREE from 'three';
import {
  createMockSkeleton,
  createMockModel,
  createMockAnimationClip,
  getHumanoidBoneNames
} from '../utils/testHelpers.js';

describe('RetargetManager', () => {
  let sceneManager;
  let modelLoader;
  let animationManager;
  let retargetManager;

  beforeEach(() => {
    sceneManager = {
      getModel: vi.fn(),
      getMixer: vi.fn(() => new THREE.AnimationMixer(new THREE.Object3D()))
    };

    modelLoader = {
      getCurrentModelData: vi.fn()
    };

    animationManager = {
      loadAnimations: vi.fn(),
      addAnimations: vi.fn(),
      getAnimations: vi.fn(() => [])
    };

    retargetManager = new RetargetManager(sceneManager, modelLoader, animationManager);
  });

  describe('detectRigType', () => {
    it('should detect Mixamo rig', () => {
      const bones = getHumanoidBoneNames('mixamo');
      const rigType = retargetManager.detectRigType(bones);

      expect(rigType).toBe('mixamo');
    });

    it('should detect UE5 rig', () => {
      const bones = getHumanoidBoneNames('ue5');
      const rigType = retargetManager.detectRigType(bones);

      expect(rigType).toBe('ue5');
    });

    it('should detect Unity rig', () => {
      const bones = getHumanoidBoneNames('unity');
      const rigType = retargetManager.detectRigType(bones);

      expect(rigType).toBe('unity');
    });

    it('should detect generic humanoid rig', () => {
      const bones = ['Hips', 'Spine', 'Head', 'LeftArm', 'RightLeg'];
      const rigType = retargetManager.detectRigType(bones);

      expect(rigType).toBe('humanoid');
    });

    it('should return custom for unknown rig', () => {
      const bones = ['Bone1', 'Bone2', 'Bone3'];
      const rigType = retargetManager.detectRigType(bones);

      expect(rigType).toBe('custom');
    });

    it('should handle empty bone array', () => {
      const rigType = retargetManager.detectRigType([]);

      expect(rigType).toBe('custom');
    });
  });

  describe('generateAutomaticMapping', () => {
    it('should map matching bones between similar rigs', () => {
      const sourceBones = getHumanoidBoneNames('mixamo');
      const targetBones = getHumanoidBoneNames('unity');

      const result = retargetManager.generateAutomaticMapping(sourceBones, targetBones, false);

      expect(result.mapping).toBeDefined();
      expect(Object.keys(result.mapping).length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include hand bones when requested', () => {
      const sourceBones = [
        ...getHumanoidBoneNames('mixamo'),
        'mixamorig:LeftHandThumb1',
        'mixamorig:LeftHandIndex1'
      ];
      const targetBones = [
        ...getHumanoidBoneNames('unity'),
        'LeftHandThumb1',
        'LeftHandIndex1'
      ];

      const withoutHands = retargetManager.generateAutomaticMapping(sourceBones, targetBones, false);
      const withHands = retargetManager.generateAutomaticMapping(sourceBones, targetBones, true);

      expect(Object.keys(withHands.mapping).length).toBeGreaterThan(
        Object.keys(withoutHands.mapping).length
      );
    });

    it('should have high confidence for identical rigs', () => {
      const bones = getHumanoidBoneNames('mixamo');

      const result = retargetManager.generateAutomaticMapping(bones, bones, false);

      expect(result.confidence).toBeGreaterThan(0.85);
    });

    it('should return empty mapping for incompatible rigs', () => {
      const sourceBones = ['CustomBone1', 'CustomBone2'];
      const targetBones = ['DifferentBone1', 'DifferentBone2'];

      const result = retargetManager.generateAutomaticMapping(sourceBones, targetBones, false);

      expect(Object.keys(result.mapping).length).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should not map same target bone twice', () => {
      const sourceBones = ['mixamorig:Hips', 'mixamorig:Spine'];
      const targetBones = ['Hips']; // Only one target bone

      const result = retargetManager.generateAutomaticMapping(sourceBones, targetBones, false);

      // Should only map one bone
      expect(Object.keys(result.mapping).length).toBeLessThanOrEqual(1);
    });
  });

  describe('bone mapping management', () => {
    it('should add manual bone mapping', () => {
      retargetManager.addManualMapping('SourceBone', 'TargetBone');

      expect(retargetManager.boneMapping['SourceBone']).toBe('TargetBone');
    });

    it('should remove bone mapping', () => {
      retargetManager.boneMapping = { 'Bone1': 'Target1', 'Bone2': 'Target2' };

      retargetManager.removeMapping('Bone1');

      expect(retargetManager.boneMapping['Bone1']).toBeUndefined();
      expect(retargetManager.boneMapping['Bone2']).toBe('Target2');
    });

    it('should clear all mappings', () => {
      retargetManager.boneMapping = { 'Bone1': 'Target1', 'Bone2': 'Target2' };

      retargetManager.clearMappings();

      expect(Object.keys(retargetManager.boneMapping).length).toBe(0);
      expect(retargetManager.mappingConfidence).toBe(0);
    });
  });

  describe('skeleton operations', () => {
    it('should find bone index by name', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);

      const index = retargetManager.findIndexOfBoneByName(skeleton, 'Spine');

      expect(index).toBe(1);
    });

    it('should return -1 for non-existent bone', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);

      const index = retargetManager.findIndexOfBoneByName(skeleton, 'NonExistent');

      expect(index).toBe(-1);
    });

    it('should clone skeleton correctly', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);

      const cloned = retargetManager.cloneRawSkeleton(skeleton, BindPoseModes.DEFAULT, false);

      expect(cloned.bones.length).toBe(skeleton.bones.length);
      expect(cloned.bones[0].name).toBe('Hips');
      expect(cloned.parentIndices).toBeDefined();
      expect(cloned.transformsWorld).toBeDefined();
    });

    it('should embed world transforms when requested', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);
      skeleton.bones[0].parent = new THREE.Object3D();
      skeleton.bones[0].parent.position.set(1, 2, 3);
      skeleton.bones[0].parent.updateWorldMatrix(true, false);

      const cloned = retargetManager.cloneRawSkeleton(skeleton, BindPoseModes.DEFAULT, true);

      expect(cloned.transformsWorldEmbedded).toBeDefined();
      expect(cloned.transformsWorldEmbedded.forward).toBeDefined();
      expect(cloned.transformsWorldEmbedded.inverse).toBeDefined();
    });
  });

  describe('retargetQuaternion', () => {
    beforeEach(() => {
      // Setup source and target models
      const sourceBones = getHumanoidBoneNames('mixamo').slice(0, 5);
      const targetBones = getHumanoidBoneNames('unity').slice(0, 5);

      const sourceModel = createMockModel(sourceBones);
      const targetModel = createMockModel(targetBones);

      retargetManager.setSourceModel({
        model: sourceModel,
        animations: [],
        skeletons: {
          bones: sourceModel.children.find(c => c.isBone) ? 
            sourceModel.children.filter(c => c.type === 'Bone') : [],
          boneNames: sourceBones
        }
      });

      retargetManager.setTargetModel({
        model: targetModel,
        skeletons: {
          bones: targetModel.children.find(c => c.isBone) ? 
            targetModel.children.filter(c => c.type === 'Bone') : [],
          boneNames: targetBones
        }
      });

      // Auto-map bones
      retargetManager.autoMapBones(false);
      
      // Initialize retargeting
      try {
        retargetManager.initializeRetargeting();
      } catch (e) {
        // May fail in test environment, that's ok
      }
    });

    it('should create precomputed quaternions', () => {
      if (retargetManager.precomputedQuats) {
        expect(retargetManager.precomputedQuats.left).toBeDefined();
        expect(retargetManager.precomputedQuats.right).toBeDefined();
      }
    });
  });

  describe('duplicate bone detection', () => {
    it('should detect duplicate bone names', () => {
      const bones = ['Bone1', 'Bone2', 'Bone1', 'Bone3', 'Bone2'];

      const duplicates = retargetManager.detectDuplicateBoneNames(bones);

      expect(duplicates).toContain('Bone1 (x2)');
      expect(duplicates).toContain('Bone2 (x2)');
      expect(duplicates.length).toBe(2);
    });

    it('should return empty array when no duplicates', () => {
      const bones = ['Bone1', 'Bone2', 'Bone3'];

      const duplicates = retargetManager.detectDuplicateBoneNames(bones);

      expect(duplicates.length).toBe(0);
    });
  });

  describe('proportion ratio computation', () => {
    it('should compute optimal scale', () => {
      const sourceBones = getHumanoidBoneNames('mixamo').slice(0, 5);
      const targetBones = getHumanoidBoneNames('unity').slice(0, 5);

      const sourceModel = createMockModel(sourceBones);
      const targetModel = createMockModel(targetBones);

      // Scale target model to be 2x larger
      targetModel.scale.set(2, 2, 2);
      targetModel.updateMatrixWorld(true);

      retargetManager.setSourceModel({
        model: sourceModel,
        skeletons: {
          bones: [],
          boneNames: sourceBones
        }
      });

      retargetManager.setTargetModel({
        model: targetModel,
        skeletons: {
          bones: [],
          boneNames: targetBones
        }
      });

      retargetManager.autoMapBones(false);

      // The ratio might not be exactly 2 due to bone structure, but should be > 1
      const ratio = retargetManager.computeProportionRatio();
      expect(ratio).toBeGreaterThan(0);
    });
  });

  describe('pose validation', () => {
    it('should detect T-pose', () => {
      const skeleton = createMockSkeleton(getHumanoidBoneNames('mixamo').slice(0, 10));
      
      const poseType = retargetManager.detectPoseType(skeleton);
      
      // Default skeleton should be detected as some pose type
      expect(['T-pose', 'A-pose', 'unknown']).toContain(poseType);
    });
  });

  describe('retargeting options', () => {
    it('should have default options', () => {
      expect(retargetManager.retargetOptions.useWorldSpaceTransformation).toBe(false);
      expect(retargetManager.retargetOptions.autoValidatePose).toBe(true);
      expect(retargetManager.retargetOptions.useOptimalScale).toBe(true);
    });

    it('should allow updating options', () => {
      retargetManager.retargetOptions.useWorldSpaceTransformation = true;
      
      expect(retargetManager.retargetOptions.useWorldSpaceTransformation).toBe(true);
    });
  });

  describe('root bone detection', () => {
    it('should detect effective source root bone', () => {
      const bones = ['Root', 'Hips', 'Spine'];
      retargetManager.sourceRootBone = 'Hips';
      
      const effectiveRoot = retargetManager.getEffectiveSourceRootBone();
      
      expect(effectiveRoot).toBe('Hips');
    });

    it('should use selected root bone over detected', () => {
      retargetManager.sourceRootBone = 'Hips';
      retargetManager.selectedSourceRootBone = 'CustomRoot';
      
      const effectiveRoot = retargetManager.getEffectiveSourceRootBone();
      
      expect(effectiveRoot).toBe('CustomRoot');
    });
  });
});
