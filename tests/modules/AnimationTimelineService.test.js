import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationTimelineService } from '../../src/renderer/modules/animation/AnimationTimelineService.js';

describe('AnimationTimelineService', () => {
  let service;

  beforeEach(() => {
    service = new AnimationTimelineService();
  });

  describe('Time Formatting', () => {
    it('should format time correctly at 24fps', () => {
      expect(service.formatTime(0)).toBe('00:00:00');
      expect(service.formatTime(65.5)).toBe('01:05:12');
      expect(service.formatTime(125.75)).toBe('02:05:18');
    });

    it('should format time correctly at 30fps', () => {
      expect(service.formatTime(0, 30)).toBe('00:00:00');
      expect(service.formatTime(65.5, 30)).toBe('01:05:15');
    });

    it('should format time correctly at 60fps', () => {
      expect(service.formatTime(1.5, 60)).toBe('00:01:30');
    });

    it('should handle zero time', () => {
      expect(service.formatTime(0)).toBe('00:00:00');
    });

    it('should handle large time values', () => {
      expect(service.formatTime(3599)).toBe('59:59:00'); // Just under 1 hour
    });

    it('should pad single digits correctly', () => {
      expect(service.formatTime(5.5)).toBe('00:05:12');
    });

    it('should handle fractional seconds', () => {
      expect(service.formatTime(1.041666666)).toBe('00:01:00'); // ~1 frame at 24fps (rounds down)
      expect(service.formatTime(1.083333333)).toBe('00:01:01'); // 2 frames at 24fps (floor behavior)
    });
  });

  describe('Timeline Position Calculation', () => {
    it('should calculate position correctly', () => {
      expect(service.calculateTimelinePosition(0, 10)).toBe(0);
      expect(service.calculateTimelinePosition(5, 10)).toBe(0.5);
      expect(service.calculateTimelinePosition(10, 10)).toBe(1);
    });

    it('should handle zero duration', () => {
      expect(service.calculateTimelinePosition(5, 0)).toBe(0);
    });

    it('should clamp position to 0-1 range', () => {
      expect(service.calculateTimelinePosition(-5, 10)).toBe(0);
      expect(service.calculateTimelinePosition(15, 10)).toBe(1);
    });

    it('should handle very small durations', () => {
      expect(service.calculateTimelinePosition(0.5, 1)).toBe(0.5);
    });

    it('should calculate fractional positions', () => {
      expect(service.calculateTimelinePosition(3.33, 10)).toBeCloseTo(0.333, 2);
      expect(service.calculateTimelinePosition(6.66, 10)).toBeCloseTo(0.666, 2);
    });
  });

  describe('Time From Position Calculation', () => {
    it('should calculate time from position correctly', () => {
      expect(service.calculateTimeFromPosition(0, 10)).toBe(0);
      expect(service.calculateTimeFromPosition(0.5, 10)).toBe(5);
      expect(service.calculateTimeFromPosition(1, 10)).toBe(10);
    });

    it('should clamp time to valid range', () => {
      expect(service.calculateTimeFromPosition(-0.5, 10)).toBe(0);
      expect(service.calculateTimeFromPosition(1.5, 10)).toBe(10);
    });

    it('should handle zero duration', () => {
      expect(service.calculateTimeFromPosition(0.5, 0)).toBe(0);
    });

    it('should calculate fractional times', () => {
      expect(service.calculateTimeFromPosition(0.333, 10)).toBeCloseTo(3.33, 2);
    });
  });

  describe('Time String Parsing', () => {
    it('should parse time string correctly at 24fps', () => {
      expect(service.parseTimeString('00:00:00')).toBe(0);
      expect(service.parseTimeString('00:01:00')).toBe(1);
      expect(service.parseTimeString('01:05:12')).toBeCloseTo(65.5, 1);
    });

    it('should parse time string correctly at 30fps', () => {
      expect(service.parseTimeString('00:01:15', 30)).toBeCloseTo(1.5, 1);
    });

    it('should handle invalid format', () => {
      expect(service.parseTimeString('invalid')).toBe(0);
      expect(service.parseTimeString('12:34')).toBe(0);
      expect(service.parseTimeString('')).toBe(0);
    });

    it('should handle large values', () => {
      expect(service.parseTimeString('59:59:23')).toBeCloseTo(3599.958, 1);
    });
  });

  describe('Scrubbing', () => {
    it('should calculate scrub time correctly', () => {
      expect(service.calculateScrubTime(5, 2, 10)).toBe(7);
      expect(service.calculateScrubTime(5, -2, 10)).toBe(3);
    });

    it('should clamp scrub time to duration', () => {
      expect(service.calculateScrubTime(8, 5, 10)).toBe(10);
      expect(service.calculateScrubTime(2, -5, 10)).toBe(0);
    });

    it('should handle zero delta', () => {
      expect(service.calculateScrubTime(5, 0, 10)).toBe(5);
    });

    it('should handle fractional deltas', () => {
      expect(service.calculateScrubTime(5, 0.5, 10)).toBe(5.5);
      expect(service.calculateScrubTime(5, -0.25, 10)).toBe(4.75);
    });
  });

  describe('FPS Calculations', () => {
    it('should calculate FPS correctly', () => {
      expect(service.calculateFPS(10, 240)).toBe(24);
      expect(service.calculateFPS(10, 300)).toBe(30);
      expect(service.calculateFPS(1, 60)).toBe(60);
    });

    it('should handle zero duration', () => {
      expect(service.calculateFPS(0, 100)).toBe(0);
    });

    it('should calculate frame count correctly', () => {
      expect(service.calculateFrameCount(10, 24)).toBe(240);
      expect(service.calculateFrameCount(10, 30)).toBe(300);
    });

    it('should round up frame count', () => {
      expect(service.calculateFrameCount(10.5, 24)).toBe(252);
      expect(service.calculateFrameCount(10.1, 30)).toBe(303);
    });

    it('should handle zero duration for frame count', () => {
      expect(service.calculateFrameCount(0, 24)).toBe(0);
    });
  });

  describe('Frame Time Calculations', () => {
    it('should calculate frame time correctly', () => {
      expect(service.calculateFrameTime(0, 24)).toBe(0);
      expect(service.calculateFrameTime(24, 24)).toBe(1);
      expect(service.calculateFrameTime(12, 24)).toBe(0.5);
    });

    it('should handle zero fps', () => {
      expect(service.calculateFrameTime(10, 0)).toBe(0);
    });

    it('should calculate fractional frame times', () => {
      expect(service.calculateFrameTime(1, 24)).toBeCloseTo(0.04167, 4);
    });

    it('should calculate frame index from time', () => {
      expect(service.calculateFrameIndex(0, 24)).toBe(0);
      expect(service.calculateFrameIndex(1, 24)).toBe(24);
      expect(service.calculateFrameIndex(0.5, 24)).toBe(12);
    });

    it('should floor frame index', () => {
      expect(service.calculateFrameIndex(1.9, 24)).toBe(45);
      expect(service.calculateFrameIndex(0.99, 24)).toBe(23);
    });
  });

  describe('Validation', () => {
    it('should validate position correctly', () => {
      expect(service.isValidPosition(0)).toBe(true);
      expect(service.isValidPosition(0.5)).toBe(true);
      expect(service.isValidPosition(1)).toBe(true);
      expect(service.isValidPosition(-0.1)).toBe(false);
      expect(service.isValidPosition(1.1)).toBe(false);
    });

    it('should reject non-numeric positions', () => {
      expect(service.isValidPosition('0.5')).toBe(false);
      expect(service.isValidPosition(null)).toBe(false);
      expect(service.isValidPosition(undefined)).toBe(false);
    });

    it('should validate time correctly', () => {
      expect(service.isValidTime(0, 10)).toBe(true);
      expect(service.isValidTime(5, 10)).toBe(true);
      expect(service.isValidTime(10, 10)).toBe(true);
      expect(service.isValidTime(-1, 10)).toBe(false);
      expect(service.isValidTime(11, 10)).toBe(false);
    });

    it('should reject non-numeric times', () => {
      expect(service.isValidTime('5', 10)).toBe(false);
      expect(service.isValidTime(null, 10)).toBe(false);
      expect(service.isValidTime(undefined, 10)).toBe(false);
    });
  });

  describe('Speed Multiplier', () => {
    it('should calculate speed multiplier correctly', () => {
      expect(service.calculateSpeedMultiplier(10, 10)).toBe(1);
      expect(service.calculateSpeedMultiplier(10, 5)).toBe(2);
      expect(service.calculateSpeedMultiplier(10, 20)).toBe(0.5);
    });

    it('should handle zero target duration', () => {
      expect(service.calculateSpeedMultiplier(10, 0)).toBe(1);
    });

    it('should calculate fractional multipliers', () => {
      expect(service.calculateSpeedMultiplier(5, 2)).toBe(2.5);
      expect(service.calculateSpeedMultiplier(3, 4)).toBe(0.75);
    });
  });

  describe('Round-trip Conversions', () => {
    it('should convert position to time and back', () => {
      const duration = 10;
      const originalPosition = 0.75;
      
      const time = service.calculateTimeFromPosition(originalPosition, duration);
      const position = service.calculateTimelinePosition(time, duration);
      
      expect(position).toBeCloseTo(originalPosition, 5);
    });

    it('should convert time string to seconds and back', () => {
      const originalTime = 65.5;
      
      const timeString = service.formatTime(originalTime);
      const parsedTime = service.parseTimeString(timeString);
      
      expect(parsedTime).toBeCloseTo(originalTime, 1);
    });

    it('should convert frame to time and back', () => {
      const fps = 24;
      const originalFrame = 120;
      
      const time = service.calculateFrameTime(originalFrame, fps);
      const frame = service.calculateFrameIndex(time, fps);
      
      expect(frame).toBe(originalFrame);
    });
  });
});
