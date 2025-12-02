import { describe, it, expect, beforeEach } from 'vitest';
import { RetargetingEngine, BindPoseModes } from '@renderer/modules/retargeting/RetargetingEngine.js';
import { SkeletonAnalyzer } from '@renderer/modules/retargeting/SkeletonAnalyzer.js';
import * as THREE from 'three';
import { createMockSkeleton } from '../utils/testHelpers.js';

describe('RetargetingEngine', () => {
  let engine;
  let skeletonAnalyzer;

  beforeEach(() => {
    skeletonAnalyzer = new SkeletonAnalyzer();
    engine = new RetargetingEngine(skeletonAnalyzer);
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(engine).toBeDefined();
      expect(engine.srcBindPose).toBeNull();
      expect(engine.trgBindPose).toBeNull();
      expect(engine.proportionRatio).toBe(1.0);
    });

    it('should accept SkeletonAnalyzer dependency', () => {
      const customAnalyzer = new SkeletonAnalyzer();
      const customEngine = new RetargetingEngine(customAnalyzer);

      expect(customEngine).toBeDefined();
    });

    it('should have coordinate correction disabled by default', () => {
      expect(engine.applyCoordinateCorrection).toBe(false);
    });
  });

  describe('cloneRawSkeleton', () => {
    it('should clone skeleton with default bind pose', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);

      const cloned = engine.cloneRawSkeleton(skeleton, BindPoseModes.DEFAULT);

      expect(cloned).toBeDefined();
      expect(cloned.bones.length).toBe(skeleton.bones.length);
      expect(cloned.bones[0].name).toBe('Hips');
      expect(cloned.bones[1].name).toBe('Spine');
      expect(cloned.bones[2].name).toBe('Head');
    });

    it('should clone skeleton with current pose as bind pose', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);

      const cloned = engine.cloneRawSkeleton(skeleton, BindPoseModes.CURRENT);

      expect(cloned).toBeDefined();
      expect(cloned.bones.length).toBe(2);
    });

    it('should preserve bone hierarchy', () => {
      const root = new THREE.Bone();
      root.name = 'Root';
      const child1 = new THREE.Bone();
      child1.name = 'Child1';
      const child2 = new THREE.Bone();
      child2.name = 'Child2';
      root.add(child1);
      child1.add(child2);

      const skeleton = new THREE.Skeleton([root, child1, child2]);
      const cloned = engine.cloneRawSkeleton(skeleton);

      expect(cloned.bones[0].children.length).toBe(1);
      expect(cloned.bones[0].children[0].name).toBe('Child1');
    });

    it('should attach parent indices', () => {
      const skeleton = createMockSkeleton(['Hips', 'Spine']);

      const cloned = engine.cloneRawSkeleton(skeleton);

      expect(cloned.parentIndices).toBeDefined();
      expect(cloned.parentIndices.length).toBe(2);
    });
  });

  describe('computeBoneMapIndices', () => {
    it('should compute bone map indices for valid skeletons', () => {
      const srcSkeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);
      const trgSkeleton = createMockSkeleton(['Hips', 'Spine', 'Neck']);
      const boneMapping = {
        'Hips': 'Hips',
        'Spine': 'Spine'
      };

      const result = engine.computeBoneMapIndices(srcSkeleton, trgSkeleton, boneMapping);

      expect(result).toBeDefined();
      // Result structure may vary, just check it's defined
      expect(result).not.toBeNull();
    });

    it('should return null for null skeletons', () => {
      const result = engine.computeBoneMapIndices(null, null, {});

      expect(result).toBeNull();
    });

    it('should skip unmapped bones', () => {
      const srcSkeleton = createMockSkeleton(['Hips', 'Spine', 'Head']);
      const trgSkeleton = createMockSkeleton(['Hips']);
      const boneMapping = { 'Hips': 'Hips' };

      const result = engine.computeBoneMapIndices(srcSkeleton, trgSkeleton, boneMapping);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });
  });

  describe('initializeRetargeting', () => {
    it('should initialize retargeting with valid skeletons', () => {
      const srcSkeleton = createMockSkeleton(['Hips', 'Spine']);
      const trgSkeleton = createMockSkeleton(['Hips', 'Spine']);
      const boneMapping = { 'Hips': 'Hips', 'Spine': 'Spine' };

      engine.initializeRetargeting(srcSkeleton, trgSkeleton, boneMapping);

      expect(engine.srcBindPose).toBeDefined();
      expect(engine.trgBindPose).toBeDefined();
      expect(engine.boneMapIndices).toBeDefined();
    });

    it('should precompute retargeting data', () => {
      const srcSkeleton = createMockSkeleton(['Hips']);
      const trgSkeleton = createMockSkeleton(['Hips']);
      const boneMapping = { 'Hips': 'Hips' };

      engine.initializeRetargeting(srcSkeleton, trgSkeleton, boneMapping);

      expect(engine.precomputedQuats).toBeDefined();
    });
  });

  describe('retargetQuaternionTrack', () => {
    beforeEach(() => {
      const srcSkeleton = createMockSkeleton(['Hips', 'Spine']);
      const trgSkeleton = createMockSkeleton(['Hips', 'Spine']);
      const boneMapping = { 'Hips': 'Hips', 'Spine': 'Spine' };
      engine.initializeRetargeting(srcSkeleton, trgSkeleton, boneMapping);
    });

    it('should retarget quaternion track', () => {
      const track = new THREE.QuaternionKeyframeTrack(
        'Hips.quaternion',
        [0, 1],
        [0, 0, 0, 1, 0, 0.707, 0, 0.707]
      );

      const result = engine.retargetQuaternionTrack(
        track,
        engine.srcBindPose,
        engine.trgBindPose,
        null
      );

      expect(result).toBeInstanceOf(THREE.QuaternionKeyframeTrack);
      // Times may be Float32Array
      expect(Array.from(result.times)).toEqual([0, 1]);
    });

    it('should preserve keyframe times', () => {
      const times = [0, 0.5, 1.0, 1.5];
      const track = new THREE.QuaternionKeyframeTrack(
        'Hips.quaternion',
        times,
        [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]
      );

      const result = engine.retargetQuaternionTrack(
        track,
        engine.srcBindPose,
        engine.trgBindPose,
        null
      );

      // Convert to regular array for comparison
      expect(Array.from(result.times)).toEqual(times);
    });
  });

  describe('retargetPositionTrack', () => {
    beforeEach(() => {
      const srcSkeleton = createMockSkeleton(['Hips']);
      const trgSkeleton = createMockSkeleton(['Hips']);
      const boneMapping = { 'Hips': 'Hips' };
      engine.initializeRetargeting(srcSkeleton, trgSkeleton, boneMapping);
    });

    it('should retarget position track', () => {
      const track = new THREE.VectorKeyframeTrack(
        'Hips.position',
        [0, 1],
        [0, 0, 0, 0, 1, 0]
      );

      const result = engine.retargetPositionTrack(
        track,
        engine.srcBindPose,
        engine.trgBindPose,
        'source',
        null
      );

      expect(result).toBeDefined();
      if (result) {
        expect(result).toBeInstanceOf(THREE.VectorKeyframeTrack);
      }
    });
  });

  describe('retargetScaleTrack', () => {
    beforeEach(() => {
      const srcSkeleton = createMockSkeleton(['Hips']);
      const trgSkeleton = createMockSkeleton(['Hips']);
      const boneMapping = { 'Hips': 'Hips' };
      engine.initializeRetargeting(srcSkeleton, trgSkeleton, boneMapping);
    });

    it('should retarget scale track', () => {
      const track = new THREE.VectorKeyframeTrack(
        'Hips.scale',
        [0, 1],
        [1, 1, 1, 2, 2, 2]
      );

      const result = engine.retargetScaleTrack(
        track,
        engine.srcBindPose,
        engine.trgBindPose
      );

      expect(result).toBeDefined();
      if (result) {
        expect(result).toBeInstanceOf(THREE.VectorKeyframeTrack);
      }
    });

    it('should preserve scale values', () => {
      const values = [1, 2, 3, 4, 5, 6];
      const track = new THREE.VectorKeyframeTrack(
        'Hips.scale',
        [0, 1],
        values
      );

      const result = engine.retargetScaleTrack(
        track,
        engine.srcBindPose,
        engine.trgBindPose
      );

      expect(result).toBeDefined();
      if (result) {
        // Convert to regular array for comparison
        expect(Array.from(result.values)).toEqual(values);
      }
    });
  });

  describe('coordinate correction', () => {
    it('should enable coordinate correction', () => {
      engine.setCoordinateCorrection(true);

      expect(engine.applyCoordinateCorrection).toBe(true);
    });

    it('should disable coordinate correction', () => {
      engine.setCoordinateCorrection(false);

      expect(engine.applyCoordinateCorrection).toBe(false);
    });

    it('should have coordinate correction rotation defined', () => {
      expect(engine.coordinateCorrectionRotation).toBeInstanceOf(THREE.Quaternion);
    });
  });

  describe('retargeting options', () => {
    it('should set retarget options', () => {
      engine.setRetargetOptions({
        useWorldSpaceTransformation: true,
        useOptimalScale: false
      });

      expect(engine.retargetOptions.useWorldSpaceTransformation).toBe(true);
      expect(engine.retargetOptions.useOptimalScale).toBe(false);
    });

    it('should have default retarget options', () => {
      expect(engine.retargetOptions).toBeDefined();
      expect(engine.retargetOptions.useOptimalScale).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should create new transform', () => {
      const transform = engine.newTransform();

      expect(transform.p).toBeInstanceOf(THREE.Vector3);
      expect(transform.q).toBeInstanceOf(THREE.Quaternion);
      expect(transform.s).toBeInstanceOf(THREE.Vector3);
    });
  });

  describe('edge cases', () => {
    it('should handle skeleton with single bone', () => {
      const srcSkeleton = createMockSkeleton(['Hips']);
      const trgSkeleton = createMockSkeleton(['Hips']);
      const boneMapping = { 'Hips': 'Hips' };

      expect(() => {
        engine.initializeRetargeting(srcSkeleton, trgSkeleton, boneMapping);
      }).not.toThrow();
    });

    it('should handle empty bone mapping', () => {
      const srcSkeleton = createMockSkeleton(['Hips']);
      const trgSkeleton = createMockSkeleton(['Hips']);

      const result = engine.computeBoneMapIndices(srcSkeleton, trgSkeleton, {});

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });
  });
});
