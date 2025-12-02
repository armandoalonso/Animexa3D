import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationCollectionService } from '../../src/renderer/modules/animation/AnimationCollectionService.js';
import * as THREE from 'three';

describe('AnimationCollectionService', () => {
  let service;
  let mockClip1;
  let mockClip2;
  let mockClip3;

  beforeEach(() => {
    service = new AnimationCollectionService();

    // Create mock animation clips
    mockClip1 = new THREE.AnimationClip('Walk', 2.0, [
      new THREE.VectorKeyframeTrack('.bones[0].position', [0, 1, 2], [0, 0, 0, 1, 0, 0, 2, 0, 0])
    ]);

    mockClip2 = new THREE.AnimationClip('Run', 1.5, [
      new THREE.VectorKeyframeTrack('.bones[0].position', [0, 0.75, 1.5], [0, 0, 0, 1, 0, 0, 2, 0, 0])
    ]);

    mockClip3 = new THREE.AnimationClip('Jump', 3.0, [
      new THREE.VectorKeyframeTrack('.bones[0].position', [0, 1.5, 3], [0, 0, 0, 0, 2, 0, 0, 0, 0])
    ]);
  });

  describe('Initialization', () => {
    it('should initialize with empty animations array', () => {
      expect(service.getAnimations()).toEqual([]);
      expect(service.getAnimationCount()).toBe(0);
      expect(service.hasAnimations()).toBe(false);
    });
  });

  describe('Loading Animations', () => {
    it('should load animations successfully', () => {
      const animations = [mockClip1, mockClip2];
      const result = service.loadAnimations(animations);

      expect(result).toHaveLength(2);
      expect(service.getAnimationCount()).toBe(2);
      expect(service.hasAnimations()).toBe(true);
    });

    it('should replace existing animations when loading', () => {
      service.loadAnimations([mockClip1]);
      expect(service.getAnimationCount()).toBe(1);

      service.loadAnimations([mockClip2, mockClip3]);
      expect(service.getAnimationCount()).toBe(2);
      expect(service.getAnimation(0).name).toBe('Run');
    });

    it('should trim animations with empty space at start', () => {
      // Create clip with empty space at start
      const clipWithEmptySpace = new THREE.AnimationClip('EmptyStart', 5.0, [
        new THREE.VectorKeyframeTrack('.bones[0].position', [2, 3, 4, 5], [0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0])
      ]);

      const result = service.loadAnimations([clipWithEmptySpace]);

      expect(result[0].duration).toBeLessThan(5.0);
      expect(result[0].tracks[0].times[0]).toBe(0);
    });

    it('should not trim animations starting at or near zero', () => {
      const result = service.loadAnimations([mockClip1]);

      expect(result[0].duration).toBe(mockClip1.duration);
      expect(result[0].name).toBe(mockClip1.name);
    });

    it('should handle empty array', () => {
      const result = service.loadAnimations([]);

      expect(result).toEqual([]);
      expect(service.getAnimationCount()).toBe(0);
    });
  });

  describe('Adding Animations', () => {
    beforeEach(() => {
      service.loadAnimations([mockClip1]);
    });

    it('should add animations to existing collection', () => {
      const count = service.addAnimations([mockClip2, mockClip3]);

      expect(count).toBe(3);
      expect(service.getAnimationCount()).toBe(3);
      expect(service.getAnimation(0).name).toBe('Walk');
      expect(service.getAnimation(1).name).toBe('Run');
      expect(service.getAnimation(2).name).toBe('Jump');
    });

    it('should return current count when adding empty array', () => {
      const count = service.addAnimations([]);

      expect(count).toBe(1);
      expect(service.getAnimationCount()).toBe(1);
    });

    it('should return current count when adding null', () => {
      const count = service.addAnimations(null);

      expect(count).toBe(1);
      expect(service.getAnimationCount()).toBe(1);
    });

    it('should trim added animations', () => {
      const clipWithEmptySpace = new THREE.AnimationClip('EmptyStart', 5.0, [
        new THREE.VectorKeyframeTrack('.bones[0].position', [1, 2, 3], [0, 0, 0, 1, 0, 0, 2, 0, 0])
      ]);

      service.addAnimations([clipWithEmptySpace]);

      const addedClip = service.getAnimation(1);
      expect(addedClip.duration).toBeLessThan(5.0);
    });
  });

  describe('Removing Animations', () => {
    beforeEach(() => {
      service.loadAnimations([mockClip1, mockClip2, mockClip3]);
    });

    it('should remove animation by index', () => {
      const removed = service.removeAnimation(1);

      expect(removed).not.toBe(null);
      expect(removed.name).toBe('Run');
      expect(service.getAnimationCount()).toBe(2);
      expect(service.getAnimation(1).name).toBe('Jump');
    });

    it('should return null for invalid index', () => {
      expect(service.removeAnimation(-1)).toBe(null);
      expect(service.removeAnimation(10)).toBe(null);
      expect(service.getAnimationCount()).toBe(3);
    });

    it('should remove first animation', () => {
      const removed = service.removeAnimation(0);

      expect(removed.name).toBe('Walk');
      expect(service.getAnimationCount()).toBe(2);
      expect(service.getAnimation(0).name).toBe('Run');
    });

    it('should remove last animation', () => {
      const removed = service.removeAnimation(2);

      expect(removed.name).toBe('Jump');
      expect(service.getAnimationCount()).toBe(2);
    });
  });

  describe('Renaming Animations', () => {
    beforeEach(() => {
      service.loadAnimations([mockClip1, mockClip2]);
    });

    it('should rename animation successfully', () => {
      const result = service.renameAnimation(0, 'SlowWalk');

      expect(result).toBe(true);
      expect(service.getAnimation(0).name).toBe('SlowWalk');
    });

    it('should trim whitespace from new name', () => {
      service.renameAnimation(0, '  SlowWalk  ');

      expect(service.getAnimation(0).name).toBe('SlowWalk');
    });

    it('should reject empty name', () => {
      const result = service.renameAnimation(0, '');

      expect(result).toBe(false);
      expect(service.getAnimation(0).name).toBe('Walk');
    });

    it('should reject whitespace-only name', () => {
      const result = service.renameAnimation(0, '   ');

      expect(result).toBe(false);
      expect(service.getAnimation(0).name).toBe('Walk');
    });

    it('should reject invalid index', () => {
      expect(service.renameAnimation(-1, 'NewName')).toBe(false);
      expect(service.renameAnimation(10, 'NewName')).toBe(false);
    });

    it('should accept names with spaces', () => {
      const result = service.renameAnimation(0, 'Slow Walk');

      expect(result).toBe(true);
      expect(service.getAnimation(0).name).toBe('Slow Walk');
    });
  });

  describe('Getting Animations', () => {
    beforeEach(() => {
      service.loadAnimations([mockClip1, mockClip2, mockClip3]);
    });

    it('should get all animations', () => {
      const animations = service.getAnimations();

      expect(animations).toHaveLength(3);
      expect(animations[0].name).toBe('Walk');
      expect(animations[1].name).toBe('Run');
      expect(animations[2].name).toBe('Jump');
    });

    it('should get animation by index', () => {
      expect(service.getAnimation(0).name).toBe('Walk');
      expect(service.getAnimation(1).name).toBe('Run');
      expect(service.getAnimation(2).name).toBe('Jump');
    });

    it('should return null for invalid index', () => {
      expect(service.getAnimation(-1)).toBe(null);
      expect(service.getAnimation(10)).toBe(null);
    });

    it('should get animation count', () => {
      expect(service.getAnimationCount()).toBe(3);
    });

    it('should check if has animations', () => {
      expect(service.hasAnimations()).toBe(true);

      service.clear();
      expect(service.hasAnimations()).toBe(false);
    });
  });

  describe('Finding Animations', () => {
    beforeEach(() => {
      service.loadAnimations([mockClip1, mockClip2, mockClip3]);
    });

    it('should find animation by name', () => {
      expect(service.findAnimationByName('Walk')).toBe(0);
      expect(service.findAnimationByName('Run')).toBe(1);
      expect(service.findAnimationByName('Jump')).toBe(2);
    });

    it('should return -1 for non-existent name', () => {
      expect(service.findAnimationByName('Fly')).toBe(-1);
    });

    it('should be case-sensitive', () => {
      expect(service.findAnimationByName('walk')).toBe(-1);
    });

    it('should get animation names', () => {
      const names = service.getAnimationNames();

      expect(names).toEqual(['Walk', 'Run', 'Jump']);
    });

    it('should handle unnamed animations', () => {
      const unnamedClip = new THREE.AnimationClip('', 1.0, []);
      service.addAnimations([unnamedClip]);

      const names = service.getAnimationNames();
      expect(names[3]).toBe('Unnamed');
    });
  });

  describe('Clearing Animations', () => {
    it('should clear all animations', () => {
      service.loadAnimations([mockClip1, mockClip2]);
      expect(service.getAnimationCount()).toBe(2);

      service.clear();

      expect(service.getAnimationCount()).toBe(0);
      expect(service.hasAnimations()).toBe(false);
      expect(service.getAnimations()).toEqual([]);
    });
  });

  describe('Trimming Animation Clips', () => {
    it('should trim clip with empty space', () => {
      const clip = new THREE.AnimationClip('Test', 5.0, [
        new THREE.VectorKeyframeTrack('.bones[0].position', [1, 2, 3], [0, 0, 0, 1, 0, 0, 2, 0, 0])
      ]);

      const trimmed = service.trimAnimationClip(clip);

      expect(trimmed.duration).toBeLessThan(clip.duration);
      expect(trimmed.tracks[0].times[0]).toBe(0);
    });

    it('should not trim clip starting at zero', () => {
      const clip = new THREE.AnimationClip('Test', 3.0, [
        new THREE.VectorKeyframeTrack('.bones[0].position', [0, 1, 2], [0, 0, 0, 1, 0, 0, 2, 0, 0])
      ]);

      const trimmed = service.trimAnimationClip(clip);

      expect(trimmed.duration).toBe(clip.duration);
      expect(trimmed).toBe(clip);
    });

    it('should not trim clip starting near zero', () => {
      const clip = new THREE.AnimationClip('Test', 3.0, [
        new THREE.VectorKeyframeTrack('.bones[0].position', [0.005, 1, 2], [0, 0, 0, 1, 0, 0, 2, 0, 0])
      ]);

      const trimmed = service.trimAnimationClip(clip);

      expect(trimmed).toBe(clip);
    });

    it('should handle clip with no tracks', () => {
      const clip = new THREE.AnimationClip('Empty', 1.0, []);

      const trimmed = service.trimAnimationClip(clip);

      expect(trimmed).toBe(clip);
    });

    it('should handle track with no times', () => {
      const trackWithoutTimes = {
        name: '.test',
        times: [],
        values: [],
        constructor: THREE.VectorKeyframeTrack
      };

      const clip = new THREE.AnimationClip('Test', 1.0, [trackWithoutTimes]);

      const trimmed = service.trimAnimationClip(clip);

      expect(trimmed).toBe(clip);
    });
  });

  describe('Validation', () => {
    it('should validate valid clip', () => {
      expect(service.isValidClip(mockClip1)).toBe(true);
    });

    it('should reject non-AnimationClip', () => {
      expect(service.isValidClip({})).toBe(false);
      expect(service.isValidClip(null)).toBe(false);
      expect(service.isValidClip(undefined)).toBe(false);
    });

    it('should reject clip without tracks property', () => {
      // Create a mock object that looks like AnimationClip but has no tracks
      const invalidClip = {
        name: 'Invalid',
        duration: 1.0,
        tracks: null
      };
      expect(service.isValidClip(invalidClip)).toBe(false);
    });

    it('should reject clip with empty tracks', () => {
      const invalidClip = new THREE.AnimationClip('Invalid', 1.0, []);
      expect(service.isValidClip(invalidClip)).toBe(false);
    });
  });

  describe('Animation Statistics', () => {
    beforeEach(() => {
      service.loadAnimations([mockClip1, mockClip2]);
    });

    it('should get animation statistics', () => {
      const stats = service.getAnimationStats(0);

      expect(stats).not.toBe(null);
      expect(stats.name).toBe('Walk');
      expect(stats.duration).toBe(2.0);
      expect(stats.trackCount).toBe(1);
      expect(stats.hasPositionTracks).toBe(true);
    });

    it('should return null for invalid index', () => {
      expect(service.getAnimationStats(-1)).toBe(null);
      expect(service.getAnimationStats(10)).toBe(null);
    });

    it('should detect track types', () => {
      const clipWithMultipleTracks = new THREE.AnimationClip('Multi', 1.0, [
        new THREE.VectorKeyframeTrack('.bones[0].position', [0, 1], [0, 0, 0, 1, 0, 0]),
        new THREE.QuaternionKeyframeTrack('.bones[0].quaternion', [0, 1], [0, 0, 0, 1, 0, 0, 0, 1])
      ]);

      service.addAnimations([clipWithMultipleTracks]);
      const stats = service.getAnimationStats(2);

      expect(stats.trackTypes).toContain('VectorKeyframeTrack');
      expect(stats.trackTypes).toContain('QuaternionKeyframeTrack');
    });

    it('should detect earliest and latest keyframes', () => {
      const stats = service.getAnimationStats(0);

      expect(stats.earliestKeyframe).toBe(0);
      expect(stats.latestKeyframe).toBe(2);
    });
  });

  describe('Duplicating Animations', () => {
    beforeEach(() => {
      service.loadAnimations([mockClip1, mockClip2]);
    });

    it('should duplicate animation', () => {
      const duplicate = service.duplicateAnimation(0);

      expect(duplicate).not.toBe(null);
      expect(duplicate.name).toBe('Walk_copy');
      expect(service.getAnimationCount()).toBe(3);
      expect(service.getAnimation(2)).toBe(duplicate);
    });

    it('should duplicate with custom name', () => {
      const duplicate = service.duplicateAnimation(0, 'FastWalk');

      expect(duplicate.name).toBe('FastWalk');
      expect(service.getAnimationCount()).toBe(3);
    });

    it('should return null for invalid index', () => {
      expect(service.duplicateAnimation(-1)).toBe(null);
      expect(service.duplicateAnimation(10)).toBe(null);
      expect(service.getAnimationCount()).toBe(2);
    });

    it('should create independent copy', () => {
      const duplicate = service.duplicateAnimation(0);
      
      // Modify original
      service.getAnimation(0).name = 'Modified';
      
      // Duplicate should be unchanged
      expect(duplicate.name).toBe('Walk_copy');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple load/clear cycles', () => {
      service.loadAnimations([mockClip1]);
      service.clear();
      service.loadAnimations([mockClip2]);
      service.clear();
      service.loadAnimations([mockClip3]);

      expect(service.getAnimationCount()).toBe(1);
      expect(service.getAnimation(0).name).toBe('Jump');
    });

    it('should handle adding and removing many animations', () => {
      const manyClips = Array.from({ length: 100 }, (_, i) => 
        new THREE.AnimationClip(`Anim${i}`, 1.0, [
          new THREE.VectorKeyframeTrack('.test', [0, 1], [0, 0, 0, 1, 0, 0])
        ])
      );

      service.loadAnimations(manyClips);
      expect(service.getAnimationCount()).toBe(100);

      for (let i = 99; i >= 0; i--) {
        service.removeAnimation(i);
      }

      expect(service.getAnimationCount()).toBe(0);
    });
  });
});
