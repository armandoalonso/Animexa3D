import { describe, it, expect, beforeEach } from 'vitest';
import { FrameExportService } from '../../src/renderer/modules/io/services/FrameExportService.js';

describe('FrameExportService', () => {
  let service;

  beforeEach(() => {
    service = new FrameExportService();
  });

  describe('calculateExportFrames', () => {
    it('should calculate correct frame count for whole seconds', () => {
      expect(service.calculateExportFrames(10, 30)).toBe(300);
      expect(service.calculateExportFrames(1, 60)).toBe(60);
    });

    it('should round up for partial frames', () => {
      expect(service.calculateExportFrames(10.5, 30)).toBe(315);
      expect(service.calculateExportFrames(1.1, 30)).toBe(33);
    });

    it('should handle zero duration', () => {
      expect(service.calculateExportFrames(0, 30)).toBe(0);
    });

    it('should throw error for negative duration', () => {
      expect(() => service.calculateExportFrames(-1, 30)).toThrow('Invalid duration or fps');
    });

    it('should throw error for zero or negative fps', () => {
      expect(() => service.calculateExportFrames(10, 0)).toThrow('Invalid duration or fps');
      expect(() => service.calculateExportFrames(10, -1)).toThrow('Invalid duration or fps');
    });
  });

  describe('calculateFrameTime', () => {
    it('should calculate correct time for frame index', () => {
      expect(service.calculateFrameTime(0, 30)).toBe(0);
      expect(service.calculateFrameTime(30, 30)).toBe(1);
      expect(service.calculateFrameTime(60, 30)).toBe(2);
    });

    it('should handle fractional results', () => {
      expect(service.calculateFrameTime(15, 30)).toBeCloseTo(0.5);
      expect(service.calculateFrameTime(10, 30)).toBeCloseTo(0.333, 2);
    });

    it('should throw error for negative frame index', () => {
      expect(() => service.calculateFrameTime(-1, 30)).toThrow('Invalid frame index or fps');
    });

    it('should throw error for zero or negative fps', () => {
      expect(() => service.calculateFrameTime(0, 0)).toThrow('Invalid frame index or fps');
      expect(() => service.calculateFrameTime(0, -1)).toThrow('Invalid frame index or fps');
    });
  });

  describe('generateFrameFilename', () => {
    it('should generate filename with default padding', () => {
      expect(service.generateFrameFilename(0)).toBe('frame_000.png');
      expect(service.generateFrameFilename(5)).toBe('frame_005.png');
      expect(service.generateFrameFilename(123)).toBe('frame_123.png');
    });

    it('should handle large frame numbers', () => {
      expect(service.generateFrameFilename(9999)).toBe('frame_9999.png');
    });

    it('should support custom format', () => {
      expect(service.generateFrameFilename(5, 'jpg')).toBe('frame_005.jpg');
      expect(service.generateFrameFilename(5, 'webp')).toBe('frame_005.webp');
    });

    it('should support custom padding length', () => {
      expect(service.generateFrameFilename(5, 'png', 5)).toBe('frame_00005.png');
      expect(service.generateFrameFilename(5, 'png', 2)).toBe('frame_05.png');
    });

    it('should throw error for negative frame index', () => {
      expect(() => service.generateFrameFilename(-1)).toThrow('Frame index must be non-negative');
    });
  });

  describe('calculateTimeStep', () => {
    it('should calculate correct time step', () => {
      expect(service.calculateTimeStep(30)).toBeCloseTo(0.0333, 3);
      expect(service.calculateTimeStep(60)).toBeCloseTo(0.0167, 3);
      expect(service.calculateTimeStep(24)).toBeCloseTo(0.0417, 3);
    });

    it('should throw error for zero or negative fps', () => {
      expect(() => service.calculateTimeStep(0)).toThrow('FPS must be positive');
      expect(() => service.calculateTimeStep(-1)).toThrow('FPS must be positive');
    });
  });

  describe('calculateProgress', () => {
    it('should calculate correct progress percentage', () => {
      expect(service.calculateProgress(0, 100)).toBe(0);
      expect(service.calculateProgress(50, 100)).toBe(50);
      expect(service.calculateProgress(100, 100)).toBe(100);
    });

    it('should handle fractional progress', () => {
      expect(service.calculateProgress(1, 3)).toBeCloseTo(33.333, 2);
    });

    it('should handle zero total frames', () => {
      expect(service.calculateProgress(5, 0)).toBe(0);
    });
  });

  describe('estimateRemainingTime', () => {
    it('should estimate remaining time correctly', () => {
      // 10 seconds elapsed for 10 frames = 1 sec per frame
      // 90 frames remaining = 90 seconds
      expect(service.estimateRemainingTime(10000, 10, 100)).toBe(90);
    });

    it('should round up remaining time', () => {
      // 1 second elapsed for 10 frames = 0.1 sec per frame
      // 5 frames remaining = 0.5 seconds -> rounds to 1
      expect(service.estimateRemainingTime(1000, 10, 15)).toBe(1);
    });

    it('should return 0 when no frames processed', () => {
      expect(service.estimateRemainingTime(1000, 0, 100)).toBe(0);
    });

    it('should return 0 when all frames processed', () => {
      expect(service.estimateRemainingTime(10000, 100, 100)).toBe(0);
    });
  });
});
