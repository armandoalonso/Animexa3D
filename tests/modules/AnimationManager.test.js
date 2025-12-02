import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationManager } from '@renderer/modules/AnimationManager.js';
import * as THREE from 'three';
import { createMockAnimationClip, createMockSkeleton } from '../utils/testHelpers.js';

describe('AnimationManager', () => {
  let sceneManager;
  let animationManager;

  beforeEach(() => {
    // Mock SceneManager
    sceneManager = {
      getMixer: vi.fn(() => new THREE.AnimationMixer(new THREE.Object3D())),
      getModel: vi.fn(() => new THREE.Object3D())
    };

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="animation-list"></div>
      <div id="time-slider"></div>
      <div id="current-time">00:00:00</div>
      <div id="total-time">00:00:00</div>
      <button id="btn-play"></button>
      <button id="btn-pause"></button>
      <button id="btn-stop"></button>
      <button id="btn-export"></button>
      <button id="btn-capture"></button>
    `;

    animationManager = new AnimationManager(sceneManager);
  });

  describe('loadAnimations', () => {
    it('should load animations successfully', () => {
      const clips = [
        createMockAnimationClip('Walk', 2.0, ['Hips', 'Spine']),
        createMockAnimationClip('Run', 1.5, ['Hips', 'Spine'])
      ];

      animationManager.loadAnimations(clips);

      expect(animationManager.animations).toHaveLength(2);
      expect(animationManager.animations[0].name).toBe('Walk');
      expect(animationManager.animations[1].name).toBe('Run');
    });

    it('should handle empty animation array', () => {
      animationManager.loadAnimations([]);

      expect(animationManager.animations).toHaveLength(0);
      expect(animationManager.currentAnimationIndex).toBe(-1);
    });

    it('should trim empty space from animation start', () => {
      const clip = new THREE.AnimationClip('Test', 3.0, [
        new THREE.QuaternionKeyframeTrack(
          'Bone.quaternion',
          [1.0, 2.0, 3.0], // Starts at 1.0 second
          [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]
        )
      ]);

      animationManager.loadAnimations([clip]);

      expect(animationManager.animations[0].duration).toBeCloseTo(2.0, 2);
      expect(animationManager.animations[0].tracks[0].times[0]).toBeCloseTo(0, 3);
    });
  });

  describe('playAnimation', () => {
    it('should play animation by index', () => {
      const clips = [
        createMockAnimationClip('Walk', 2.0, ['Hips']),
        createMockAnimationClip('Run', 1.5, ['Hips'])
      ];

      animationManager.loadAnimations(clips);
      animationManager.playAnimation(0);

      expect(animationManager.currentAnimationIndex).toBe(0);
      expect(animationManager.isPlaying).toBe(true);
      expect(animationManager.currentAction).toBeTruthy();
    });

    it('should stop previous animation when playing new one', () => {
      const clips = [
        createMockAnimationClip('Walk', 2.0, ['Hips']),
        createMockAnimationClip('Run', 1.5, ['Hips'])
      ];

      animationManager.loadAnimations(clips);
      animationManager.playAnimation(0);
      const firstAction = animationManager.currentAction;
      const stopSpy = vi.spyOn(firstAction, 'stop');

      animationManager.playAnimation(1);

      expect(stopSpy).toHaveBeenCalled();
      expect(animationManager.currentAnimationIndex).toBe(1);
    });

    it('should handle invalid animation index', () => {
      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);

      animationManager.playAnimation(999);

      expect(animationManager.currentAction).toBeFalsy();
    });
  });

  describe('animation controls', () => {
    beforeEach(() => {
      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);
      animationManager.playAnimation(0);
    });

    it('should pause animation', () => {
      animationManager.pauseAnimation();

      expect(animationManager.isPlaying).toBe(false);
      expect(animationManager.currentAction.paused).toBe(true);
    });

    it('should resume animation', () => {
      animationManager.pauseAnimation();
      animationManager.resumeAnimation();

      expect(animationManager.isPlaying).toBe(true);
      expect(animationManager.currentAction.paused).toBe(false);
    });

    it('should stop animation', () => {
      const stopSpy = vi.spyOn(animationManager.currentAction, 'stop');
      
      animationManager.stopAnimation();

      expect(stopSpy).toHaveBeenCalled();
      expect(animationManager.isPlaying).toBe(false);
    });

    it('should toggle play/pause', () => {
      expect(animationManager.isPlaying).toBe(true);
      
      animationManager.togglePlayPause();
      expect(animationManager.isPlaying).toBe(false);
      
      animationManager.togglePlayPause();
      expect(animationManager.isPlaying).toBe(true);
    });
  });

  describe('loop control', () => {
    it('should enable loop', () => {
      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);
      animationManager.playAnimation(0);

      animationManager.setLoop(true);

      expect(animationManager.loopEnabled).toBe(true);
    });

    it('should disable loop', () => {
      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);
      animationManager.playAnimation(0);
      animationManager.setLoop(true);

      animationManager.setLoop(false);

      expect(animationManager.loopEnabled).toBe(false);
    });

    it('should toggle loop', () => {
      expect(animationManager.loopEnabled).toBe(false);
      
      animationManager.toggleLoop();
      expect(animationManager.loopEnabled).toBe(true);
      
      animationManager.toggleLoop();
      expect(animationManager.loopEnabled).toBe(false);
    });
  });

  describe('animation management', () => {
    it('should add animations', () => {
      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);

      const newClips = [createMockAnimationClip('Run', 1.5, ['Hips'])];
      const count = animationManager.addAnimations(newClips);

      expect(count).toBe(2);
      expect(animationManager.animations).toHaveLength(2);
    });

    it('should remove animation by index', () => {
      const clips = [
        createMockAnimationClip('Walk', 2.0, ['Hips']),
        createMockAnimationClip('Run', 1.5, ['Hips'])
      ];
      animationManager.loadAnimations(clips);

      const count = animationManager.removeAnimation(0);

      expect(count).toBe(1);
      expect(animationManager.animations[0].name).toBe('Run');
    });

    it('should rename animation', () => {
      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);

      const result = animationManager.renameAnimation(0, 'NewWalk');

      expect(result).toBe(true);
      expect(animationManager.animations[0].name).toBe('NewWalk');
    });

    it('should reject empty name when renaming', () => {
      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);

      const result = animationManager.renameAnimation(0, '   ');

      expect(result).toBe(false);
      expect(animationManager.animations[0].name).toBe('Walk');
    });
  });

  describe('timeline', () => {
    it('should format time correctly', () => {
      const formatted = animationManager.formatTime(125.5);
      
      expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should scrub timeline', () => {
      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);
      animationManager.playAnimation(0);

      animationManager.scrubTimeline(0.5); // 50% through

      expect(animationManager.currentAction.time).toBeCloseTo(1.0, 1);
    });
  });

  describe('utility methods', () => {
    it('should get current animation', () => {
      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);
      animationManager.playAnimation(0);

      const current = animationManager.getCurrentAnimation();

      expect(current).toBeTruthy();
      expect(current.name).toBe('Walk');
    });

    it('should return null when no animation is playing', () => {
      const current = animationManager.getCurrentAnimation();

      expect(current).toBeNull();
    });

    it('should check if has animations', () => {
      expect(animationManager.hasAnimations()).toBe(false);

      const clips = [createMockAnimationClip('Walk', 2.0, ['Hips'])];
      animationManager.loadAnimations(clips);

      expect(animationManager.hasAnimations()).toBe(true);
    });

    it('should change animation with direction', () => {
      const clips = [
        createMockAnimationClip('Walk', 2.0, ['Hips']),
        createMockAnimationClip('Run', 1.5, ['Hips']),
        createMockAnimationClip('Jump', 1.0, ['Hips'])
      ];
      animationManager.loadAnimations(clips);
      animationManager.playAnimation(0);

      animationManager.changeAnimation(1); // Next
      expect(animationManager.currentAnimationIndex).toBe(1);

      animationManager.changeAnimation(-1); // Previous
      expect(animationManager.currentAnimationIndex).toBe(0);

      animationManager.changeAnimation(-1); // Wrap to end
      expect(animationManager.currentAnimationIndex).toBe(2);
    });
  });
});
