import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationPlaybackService } from '../../src/renderer/modules/animation/AnimationPlaybackService.js';
import * as THREE from 'three';

describe('AnimationPlaybackService', () => {
  let service;
  let mockAction;
  let mockClip;

  beforeEach(() => {
    service = new AnimationPlaybackService();
    
    // Create mock animation clip
    mockClip = {
      name: 'TestAnimation',
      duration: 5.0,
      tracks: []
    };

    // Create mock animation action
    mockAction = {
      time: 0,
      paused: false,
      getClip: vi.fn(() => mockClip),
      isRunning: vi.fn(() => true),
      reset: vi.fn().mockReturnThis(),
      play: vi.fn().mockReturnThis(),
      stop: vi.fn(),
      setLoop: vi.fn()
    };
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(service.getCurrentAnimationIndex()).toBe(-1);
      expect(service.getIsPlaying()).toBe(false);
      expect(service.getLoopEnabled()).toBe(false);
      expect(service.getCurrentAction()).toBe(null);
    });
  });

  describe('Playback State Management', () => {
    it('should initialize playback correctly', () => {
      service.initializePlayback(2, mockAction);
      
      expect(service.getCurrentAnimationIndex()).toBe(2);
      expect(service.getCurrentAction()).toBe(mockAction);
      expect(service.getIsPlaying()).toBe(true);
    });

    it('should pause animation', () => {
      service.setCurrentAction(mockAction);
      service.pause();
      
      expect(mockAction.paused).toBe(true);
      expect(service.getIsPlaying()).toBe(false);
    });

    it('should not error when pausing without action', () => {
      expect(() => service.pause()).not.toThrow();
      expect(service.getIsPlaying()).toBe(false);
    });

    it('should resume animation that is running', () => {
      mockAction.isRunning.mockReturnValue(true);
      service.setCurrentAction(mockAction);
      service.resume();
      
      expect(mockAction.paused).toBe(false);
      expect(service.getIsPlaying()).toBe(true);
    });

    it('should restart animation that is not running', () => {
      mockAction.isRunning.mockReturnValue(false);
      service.setCurrentAction(mockAction);
      service.resume();
      
      expect(mockAction.reset).toHaveBeenCalled();
      expect(mockAction.play).toHaveBeenCalled();
      expect(service.getIsPlaying()).toBe(true);
    });

    it('should stop animation', () => {
      service.setCurrentAction(mockAction);
      service.stop();
      
      expect(mockAction.stop).toHaveBeenCalled();
      expect(service.getIsPlaying()).toBe(false);
    });

    it('should not error when stopping without action', () => {
      expect(() => service.stop()).not.toThrow();
    });
  });

  describe('Loop Mode', () => {
    it('should enable loop mode', () => {
      service.setCurrentAction(mockAction);
      service.setLoop(true);
      
      expect(service.getLoopEnabled()).toBe(true);
      expect(mockAction.setLoop).toHaveBeenCalledWith(THREE.LoopRepeat);
    });

    it('should disable loop mode', () => {
      service.setCurrentAction(mockAction);
      service.setLoop(false);
      
      expect(service.getLoopEnabled()).toBe(false);
      expect(mockAction.setLoop).toHaveBeenCalledWith(THREE.LoopOnce);
    });

    it('should toggle loop mode', () => {
      service.setCurrentAction(mockAction);
      
      expect(service.getLoopEnabled()).toBe(false);
      service.toggleLoop();
      expect(service.getLoopEnabled()).toBe(true);
      service.toggleLoop();
      expect(service.getLoopEnabled()).toBe(false);
    });

    it('should return new loop state when toggling', () => {
      service.setCurrentAction(mockAction);
      
      const result1 = service.toggleLoop();
      expect(result1).toBe(true);
      
      const result2 = service.toggleLoop();
      expect(result2).toBe(false);
    });

    it('should not error when setting loop without action', () => {
      expect(() => service.setLoop(true)).not.toThrow();
      expect(service.getLoopEnabled()).toBe(true);
    });
  });

  describe('Time and Duration', () => {
    it('should get current time from action', () => {
      mockAction.time = 2.5;
      service.setCurrentAction(mockAction);
      
      expect(service.getCurrentTime()).toBe(2.5);
    });

    it('should return 0 for current time without action', () => {
      expect(service.getCurrentTime()).toBe(0);
    });

    it('should get duration from action', () => {
      service.setCurrentAction(mockAction);
      
      expect(service.getDuration()).toBe(5.0);
      expect(mockAction.getClip).toHaveBeenCalled();
    });

    it('should return 0 for duration without action', () => {
      expect(service.getDuration()).toBe(0);
    });

    it('should calculate progress correctly', () => {
      mockAction.time = 2.5;
      service.setCurrentAction(mockAction);
      
      expect(service.getProgress()).toBe(0.5);
    });

    it('should return 0 progress without action', () => {
      expect(service.getProgress()).toBe(0);
    });

    it('should return 0 progress with zero duration', () => {
      mockClip.duration = 0;
      service.setCurrentAction(mockAction);
      
      expect(service.getProgress()).toBe(0);
    });

    it('should handle progress at start', () => {
      mockAction.time = 0;
      service.setCurrentAction(mockAction);
      
      expect(service.getProgress()).toBe(0);
    });

    it('should handle progress at end', () => {
      mockAction.time = 5.0;
      service.setCurrentAction(mockAction);
      
      expect(service.getProgress()).toBe(1.0);
    });
  });

  describe('State Queries', () => {
    it('should detect finished animation', () => {
      mockAction.isRunning.mockReturnValue(false);
      mockAction.paused = false;
      service.setCurrentAction(mockAction);
      
      expect(service.isFinished()).toBe(true);
    });

    it('should detect paused animation as not finished', () => {
      mockAction.isRunning.mockReturnValue(false);
      mockAction.paused = true;
      service.setCurrentAction(mockAction);
      
      expect(service.isFinished()).toBe(false);
    });

    it('should detect running animation as not finished', () => {
      mockAction.isRunning.mockReturnValue(true);
      service.setCurrentAction(mockAction);
      
      expect(service.isFinished()).toBe(false);
    });

    it('should consider no action as finished', () => {
      expect(service.isFinished()).toBe(true);
    });

    it('should detect active animation', () => {
      service.setCurrentAction(mockAction);
      expect(service.hasActiveAnimation()).toBe(true);
    });

    it('should detect no active animation', () => {
      expect(service.hasActiveAnimation()).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      service.initializePlayback(5, mockAction);
      service.setLoop(true);
      
      service.reset();
      
      expect(service.getCurrentAnimationIndex()).toBe(-1);
      expect(service.getCurrentAction()).toBe(null);
      expect(service.getIsPlaying()).toBe(false);
      // Note: loop state is preserved intentionally
      expect(service.getLoopEnabled()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple pause calls', () => {
      service.setCurrentAction(mockAction);
      service.pause();
      service.pause();
      
      expect(mockAction.paused).toBe(true);
      expect(service.getIsPlaying()).toBe(false);
    });

    it('should handle multiple stop calls', () => {
      service.setCurrentAction(mockAction);
      service.stop();
      service.stop();
      
      expect(mockAction.stop).toHaveBeenCalledTimes(2);
    });

    it('should handle setting null action', () => {
      service.setCurrentAction(mockAction);
      service.setCurrentAction(null);
      
      expect(service.getCurrentAction()).toBe(null);
      expect(service.getCurrentTime()).toBe(0);
      expect(service.getDuration()).toBe(0);
    });
  });
});
