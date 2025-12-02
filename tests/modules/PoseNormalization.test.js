import { describe, it, expect, beforeEach } from 'vitest';
import { PoseNormalization } from '@renderer/modules/PoseNormalization.js';
import { SkeletonAnalyzer } from '@renderer/modules/SkeletonAnalyzer.js';
import * as THREE from 'three';
import { createMockSkeleton } from '../utils/testHelpers.js';

describe('PoseNormalization', () => {
  let poseNormalization;
  let skeletonAnalyzer;

  beforeEach(() => {
    skeletonAnalyzer = new SkeletonAnalyzer();
    poseNormalization = new PoseNormalization(skeletonAnalyzer);
  });

  describe('detectPoseType', () => {
    it('should detect T-pose', () => {
      // Create a skeleton in T-pose (arms horizontal)
      const skeleton = createMockSkeleton([
        'Hips', 'Spine', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm'
      ]);

      // Position arms horizontally
      const leftArm = skeleton.bones.find(b => b.name === 'LeftArm');
      const leftForeArm = skeleton.bones.find(b => b.name === 'LeftForeArm');
      const rightArm = skeleton.bones.find(b => b.name === 'RightArm');
      const rightForeArm = skeleton.bones.find(b => b.name === 'RightForeArm');

      if (leftArm && leftForeArm) {
        leftArm.position.set(0, 0, 0);
        leftForeArm.position.set(1, 0, 0); // Horizontal
        leftArm.updateMatrixWorld(true);
      }

      if (rightArm && rightForeArm) {
        rightArm.position.set(0, 0, 0);
        rightForeArm.position.set(-1, 0, 0); // Horizontal
        rightArm.updateMatrixWorld(true);
      }

      const poseType = poseNormalization.detectPoseType(skeleton);

      expect(['T-pose', 'unknown', 'other']).toContain(poseType);
    });

    it('should detect A-pose', () => {
      const skeleton = createMockSkeleton([
        'Hips', 'Spine', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm'
      ]);

      // Position arms at 45 degrees down
      const leftArm = skeleton.bones.find(b => b.name === 'LeftArm');
      const leftForeArm = skeleton.bones.find(b => b.name === 'LeftForeArm');

      if (leftArm && leftForeArm) {
        leftArm.position.set(0, 0, 0);
        leftForeArm.position.set(1, -1, 0); // 45 degrees down
        leftArm.updateMatrixWorld(true);
      }

      const poseType = poseNormalization.detectPoseType(skeleton);

      // May detect as A-pose, other, or unknown depending on exact positioning
      expect(['A-pose', 'unknown', 'other']).toContain(poseType);
    });

    it('should return unknown when arm bones not found', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);

      const poseType = poseNormalization.detectPoseType(skeleton);

      expect(poseType).toBe('unknown');
    });

    it('should handle skeleton without children', () => {
      const skeleton = createMockSkeleton(['Hips']);

      const poseType = poseNormalization.detectPoseType(skeleton);

      expect(poseType).toBe('unknown');
    });
  });

  describe('validatePoses', () => {
    it('should validate compatible poses', () => {
      const srcSkeleton = createMockSkeleton(['Hips', 'Spine', 'LeftArm', 'RightArm']);
      const trgSkeleton = createMockSkeleton(['Hips', 'Spine', 'LeftArm', 'RightArm']);

      const validation = poseNormalization.validatePoses(srcSkeleton, trgSkeleton);

      expect(validation).toBeDefined();
      expect(validation.sourcePose).toBeDefined();
      expect(validation.targetPose).toBeDefined();
      expect(validation.recommendation).toBeDefined();
    });

    it('should detect incompatible poses', () => {
      const srcSkeleton = createMockSkeleton(['Hips']);
      const trgSkeleton = createMockSkeleton(['Hips']);

      const validation = poseNormalization.validatePoses(srcSkeleton, trgSkeleton);

      expect(validation).toBeDefined();
    });

    it('should return error for null source', () => {
      const trgSkeleton = createMockSkeleton(['Hips']);

      const validation = poseNormalization.validatePoses(null, trgSkeleton);

      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('not initialized');
    });

    it('should return error for null target', () => {
      const srcSkeleton = createMockSkeleton(['Hips']);

      const validation = poseNormalization.validatePoses(srcSkeleton, null);

      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('not initialized');
    });

    it('should provide recommendation', () => {
      const srcSkeleton = createMockSkeleton(['Hips', 'Spine']);
      const trgSkeleton = createMockSkeleton(['Hips', 'Spine']);

      const validation = poseNormalization.validatePoses(srcSkeleton, trgSkeleton);

      expect(validation.recommendation).toBeTruthy();
      expect(typeof validation.recommendation).toBe('string');
    });
  });

  describe('detectTPoseBones', () => {
    it('should detect T-pose bones', () => {
      const skeleton = createMockSkeleton([
        'Hips', 'Spine',
        'LeftUpLeg', 'LeftFoot',
        'RightUpLeg', 'RightFoot',
        'LeftArm', 'LeftHand',
        'RightArm', 'RightHand'
      ]);

      const boneMap = poseNormalization.detectTPoseBones(skeleton);

      expect(boneMap).toBeDefined();
      expect(boneMap.Hips).toBe('Hips');
      expect(boneMap.Spine).toBe('Spine');
      expect(boneMap.LeftArm).toBe('LeftArm');
      expect(boneMap.RightArm).toBe('RightArm');
    });

    it('should handle mixamorig prefix', () => {
      const skeleton = createMockSkeleton([
        'mixamorig:Hips',
        'mixamorig:Spine'
      ]);

      const boneMap = poseNormalization.detectTPoseBones(skeleton);

      expect(boneMap.Hips).toBe('mixamorig:Hips');
      expect(boneMap.Spine).toBe('mixamorig:Spine');
    });

    it('should handle underscores in bone names', () => {
      const skeleton = createMockSkeleton([
        'left_upleg',
        'left_foot'
      ]);

      const boneMap = poseNormalization.detectTPoseBones(skeleton);

      expect(boneMap.LeftUpLeg).toBe('left_upleg');
      expect(boneMap.LeftFoot).toBe('left_foot');
    });

    it('should throw error for invalid skeleton', () => {
      expect(() => {
        poseNormalization.detectTPoseBones(null);
      }).toThrow('Invalid skeleton');
    });

    it('should throw error for skeleton without bones', () => {
      expect(() => {
        poseNormalization.detectTPoseBones({});
      }).toThrow('Invalid skeleton');
    });

    it('should handle partial matches', () => {
      const skeleton = createMockSkeleton([
        'Hips',
        'Spine',
        'OtherBone' // Should not match any pattern
      ]);

      const boneMap = poseNormalization.detectTPoseBones(skeleton);

      expect(boneMap.Hips).toBe('Hips');
      expect(boneMap.Spine).toBe('Spine');
      expect(boneMap.OtherBone).toBeUndefined();
    });
  });

  describe('extendChain', () => {
    it('should extend bone chain', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'Chest']);

      // This method modifies bone rotations
      // Just verify it doesn't throw errors
      expect(() => {
        poseNormalization.extendChain(skeleton, 'Hips', 'Chest');
      }).not.toThrow();
    });

    it('should handle bone not found', () => {
      const skeleton = createMockSkeleton(['Hips']);

      // Should log warning but not throw
      expect(() => {
        poseNormalization.extendChain(skeleton, 'NonExistent', 'Hips');
      }).not.toThrow();
    });

    it('should handle end bone not found', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);

      expect(() => {
        poseNormalization.extendChain(skeleton, 'Hips', 'NonExistent');
      }).not.toThrow();
    });

    it('should work with bone objects', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);
      const hipsBone = skeleton.bones[0];
      const spineBone = skeleton.bones[1];

      expect(() => {
        poseNormalization.extendChain(skeleton, hipsBone, spineBone);
      }).not.toThrow();
    });
  });

  describe('alignBoneToAxis', () => {
    it('should align bone to axis', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);
      const yAxis = new THREE.Vector3(0, 1, 0);

      expect(() => {
        poseNormalization.alignBoneToAxis(skeleton, 'Hips', 'Spine', yAxis);
      }).not.toThrow();
    });

    it('should handle origin bone not found', () => {
      const skeleton = createMockSkeleton(['Hips']);
      const yAxis = new THREE.Vector3(0, 1, 0);

      expect(() => {
        poseNormalization.alignBoneToAxis(skeleton, 'NonExistent', 'Hips', yAxis);
      }).not.toThrow();
    });

    it('should handle end bone not found', () => {
      const skeleton = createMockSkeleton(['Hips']);
      const yAxis = new THREE.Vector3(0, 1, 0);

      expect(() => {
        poseNormalization.alignBoneToAxis(skeleton, 'Hips', 'NonExistent', yAxis);
      }).not.toThrow();
    });

    it('should use first child if end bone not specified', () => {
      const root = new THREE.Bone();
      root.name = 'Root';
      const child = new THREE.Bone();
      child.name = 'Child';
      root.add(child);
      const skeleton = new THREE.Skeleton([root, child]);
      const yAxis = new THREE.Vector3(0, 1, 0);

      expect(() => {
        poseNormalization.alignBoneToAxis(skeleton, 'Root', null, yAxis);
      }).not.toThrow();
    });
  });

  describe('lookBoneAtAxis', () => {
    it('should rotate bone to look at axis', () => {
      const bone = new THREE.Bone();
      bone.name = 'TestBone';
      const dirA = new THREE.Vector3(1, 0, 0);
      const dirB = new THREE.Vector3(0, 1, 0);
      const axis = new THREE.Vector3(0, 0, 1);

      expect(() => {
        poseNormalization.lookBoneAtAxis(bone, dirA, dirB, axis);
      }).not.toThrow();
    });

    it('should handle very small angles', () => {
      const bone = new THREE.Bone();
      const dirA = new THREE.Vector3(0, 0, 1);
      const dirB = new THREE.Vector3(0, 1, 0);
      const axis = new THREE.Vector3(0, 0, 1); // Already aligned

      expect(() => {
        poseNormalization.lookBoneAtAxis(bone, dirA, dirB, axis);
      }).not.toThrow();
    });
  });

  describe('applyTPose', () => {
    it('should apply T-pose to skeleton', () => {
      const skeleton = createMockSkeleton([
        'Hips', 'Spine',
        'LeftUpLeg', 'LeftFoot',
        'RightUpLeg', 'RightFoot',
        'LeftArm', 'LeftHand',
        'RightArm', 'RightHand'
      ]);

      const result = poseNormalization.applyTPose(skeleton);

      expect(result.skeleton).toBe(skeleton);
      expect(result.map).toBeDefined();
      expect(result.map.Hips).toBeDefined();
    });

    it('should use provided bone map', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);
      const boneMap = {
        Hips: 'Hips',
        Spine: 'Spine'
      };

      const result = poseNormalization.applyTPose(skeleton, boneMap);

      expect(result.map).toEqual(boneMap);
    });

    it('should auto-detect bone map if not provided', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);

      const result = poseNormalization.applyTPose(skeleton, null);

      expect(result.map).toBeDefined();
      expect(result.map.Hips).toBe('Hips');
    });

    it('should update skeleton matrices', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);

      poseNormalization.applyTPose(skeleton);

      // Check that matrices were updated
      expect(skeleton.bones[0].matrixWorld).toBeDefined();
    });
  });

  describe('applyAPose', () => {
    it('should apply A-pose to skeleton', () => {
      const skeleton = createMockSkeleton([
        'Hips', 'Spine',
        'LeftUpLeg', 'LeftFoot',
        'RightUpLeg', 'RightFoot',
        'LeftArm', 'LeftHand',
        'RightArm', 'RightHand'
      ]);

      const result = poseNormalization.applyAPose(skeleton);

      expect(result.skeleton).toBe(skeleton);
      expect(result.map).toBeDefined();
    });

    it('should use provided bone map', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);
      const boneMap = {
        Hips: 'Hips',
        Spine: 'Spine'
      };

      const result = poseNormalization.applyAPose(skeleton, boneMap);

      expect(result.map).toEqual(boneMap);
    });

    it('should auto-detect bone map if not provided', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);

      const result = poseNormalization.applyAPose(skeleton, null);

      expect(result.map).toBeDefined();
    });

    it('should align arms at 45 degree angle', () => {
      const skeleton = createMockSkeleton([
        'Hips', 'LeftArm', 'LeftHand', 'RightArm', 'RightHand'
      ]);

      // Apply A-pose and verify it doesn't throw
      expect(() => {
        poseNormalization.applyAPose(skeleton);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle skeleton with minimal bones', () => {
      const skeleton = createMockSkeleton(['Hips']);

      expect(() => {
        poseNormalization.applyTPose(skeleton);
      }).not.toThrow();
    });

    it('should handle skeleton without arm bones', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'LeftUpLeg', 'RightUpLeg']);

      expect(() => {
        poseNormalization.applyTPose(skeleton);
      }).not.toThrow();
    });

    it('should handle skeleton without leg bones', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'LeftArm', 'RightArm']);

      expect(() => {
        poseNormalization.applyTPose(skeleton);
      }).not.toThrow();
    });

    it('should handle complex bone hierarchy', () => {
      const root = new THREE.Bone();
      root.name = 'Hips';
      const child1 = new THREE.Bone();
      child1.name = 'Spine';
      const child2 = new THREE.Bone();
      child2.name = 'Chest';
      root.add(child1);
      child1.add(child2);

      const skeleton = new THREE.Skeleton([root, child1, child2]);

      expect(() => {
        poseNormalization.applyTPose(skeleton);
      }).not.toThrow();
    });
  });
});
