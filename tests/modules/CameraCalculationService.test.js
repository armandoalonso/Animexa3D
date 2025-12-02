import { describe, it, expect } from 'vitest';
import { CameraCalculationService } from '../../src/renderer/modules/core/CameraCalculationService.js';

describe('CameraCalculationService', () => {
  describe('calculateFramingDistance', () => {
    it('should calculate distance to frame model', () => {
      const modelSize = { x: 2, y: 3, z: 2 };
      const cameraFov = 45;

      const distance = CameraCalculationService.calculateFramingDistance(modelSize, cameraFov);

      expect(distance).toBeGreaterThan(0);
      // With max dimension 3, FOV 45°, and padding 2.5:
      // distance = (3 / (2 * tan(45°/2))) * 2.5
      expect(distance).toBeCloseTo(9.05, 1);
    });

    it('should use custom padding factor', () => {
      const modelSize = { x: 2, y: 4, z: 2 };
      const cameraFov = 45;
      const paddingFactor = 5;

      const distance = CameraCalculationService.calculateFramingDistance(modelSize, cameraFov, paddingFactor);

      expect(distance).toBeGreaterThan(0);
      const defaultDistance = CameraCalculationService.calculateFramingDistance(modelSize, cameraFov, 1);
      expect(distance).toBeCloseTo(defaultDistance * 5, 1);
    });

    it('should handle different FOV values', () => {
      const modelSize = { x: 2, y: 2, z: 2 };
      const distance60 = CameraCalculationService.calculateFramingDistance(modelSize, 60);
      const distance30 = CameraCalculationService.calculateFramingDistance(modelSize, 30);

      // Narrower FOV needs more distance
      expect(distance30).toBeGreaterThan(distance60);
    });

    it('should throw error for invalid model size', () => {
      expect(() => {
        CameraCalculationService.calculateFramingDistance({ x: 'invalid', y: 2, z: 2 }, 45);
      }).toThrow('Invalid model size');
    });

    it('should throw error for invalid FOV', () => {
      expect(() => {
        CameraCalculationService.calculateFramingDistance({ x: 2, y: 2, z: 2 }, 180);
      }).toThrow('Camera FOV must be between 0 and 180 degrees');

      expect(() => {
        CameraCalculationService.calculateFramingDistance({ x: 2, y: 2, z: 2 }, 0);
      }).toThrow('Camera FOV must be between 0 and 180 degrees');
    });

    it('should throw error for invalid padding factor', () => {
      expect(() => {
        CameraCalculationService.calculateFramingDistance({ x: 2, y: 2, z: 2 }, 45, -1);
      }).toThrow('Padding factor must be a positive number');
    });
  });

  describe('calculateCameraPosition', () => {
    it('should calculate camera position with default angles', () => {
      const distance = 10;

      const position = CameraCalculationService.calculateCameraPosition(distance);

      expect(position).toHaveProperty('x');
      expect(position).toHaveProperty('y');
      expect(position).toHaveProperty('z');
      
      // At 45° (PI/4), x and z should be equal
      expect(position.x).toBeCloseTo(position.z, 5);
      
      // Distance from origin should be approximately 'distance' (horizontal plane)
      const horizontalDistance = Math.sqrt(position.x ** 2 + position.z ** 2);
      expect(horizontalDistance).toBeCloseTo(distance, 1);
    });

    it('should calculate position with custom horizontal angle', () => {
      const distance = 10;
      const angle = Math.PI / 2; // 90 degrees

      const position = CameraCalculationService.calculateCameraPosition(distance, angle);

      expect(position.x).toBeCloseTo(distance, 5);
      expect(position.z).toBeCloseTo(0, 5);
    });

    it('should calculate Y position with model size', () => {
      const distance = 10;
      const angleH = Math.PI / 4;
      const angleV = 0.3;
      const modelSize = { y: 4 };

      const position = CameraCalculationService.calculateCameraPosition(distance, angleH, angleV, modelSize);

      // Y = modelSize.y * 0.5 + distance * angleV
      const expectedY = 4 * 0.5 + 10 * 0.3;
      expect(position.y).toBeCloseTo(expectedY, 5);
    });

    it('should throw error for invalid distance', () => {
      expect(() => {
        CameraCalculationService.calculateCameraPosition(-1);
      }).toThrow('Distance must be a positive number');
    });

    it('should throw error for invalid angles', () => {
      expect(() => {
        CameraCalculationService.calculateCameraPosition(10, 'invalid');
      }).toThrow('Horizontal angle must be a number');

      expect(() => {
        CameraCalculationService.calculateCameraPosition(10, Math.PI / 4, -1);
      }).toThrow('Vertical angle multiplier must be a non-negative number');
    });
  });

  describe('getCameraPresets', () => {
    it('should return all camera presets', () => {
      const presets = CameraCalculationService.getCameraPresets();

      expect(presets).toHaveProperty('perspective');
      expect(presets).toHaveProperty('front');
      expect(presets).toHaveProperty('back');
      expect(presets).toHaveProperty('left');
      expect(presets).toHaveProperty('right');
      expect(presets).toHaveProperty('top');
      expect(presets).toHaveProperty('bottom');
    });

    it('should use custom distance', () => {
      const distance = 10;
      const presets = CameraCalculationService.getCameraPresets(distance);

      expect(presets.front.position.z).toBe(distance);
      expect(presets.back.position.z).toBe(-distance);
      expect(presets.left.position.x).toBe(-distance);
      expect(presets.right.position.x).toBe(distance);
    });

    it('should use custom height', () => {
      const height = 5;
      const presets = CameraCalculationService.getCameraPresets(3, height);

      expect(presets.perspective.position.y).toBe(height);
      expect(presets.front.position.y).toBe(height);
    });

    it('should throw error for invalid distance', () => {
      expect(() => {
        CameraCalculationService.getCameraPresets(-1);
      }).toThrow('Distance must be a positive number');
    });

    it('should throw error for invalid height', () => {
      expect(() => {
        CameraCalculationService.getCameraPresets(3, 'invalid');
      }).toThrow('Height must be a number');
    });

    it('should have valid position and target for each preset', () => {
      const presets = CameraCalculationService.getCameraPresets();

      Object.values(presets).forEach(preset => {
        expect(preset).toHaveProperty('position');
        expect(preset).toHaveProperty('target');
        expect(preset.position).toHaveProperty('x');
        expect(preset.position).toHaveProperty('y');
        expect(preset.position).toHaveProperty('z');
        expect(preset.target).toHaveProperty('x');
        expect(preset.target).toHaveProperty('y');
        expect(preset.target).toHaveProperty('z');
      });
    });
  });

  describe('calculateCameraTarget', () => {
    it('should return model center as target', () => {
      const modelCenter = { x: 1, y: 2, z: 3 };

      const target = CameraCalculationService.calculateCameraTarget(modelCenter);

      expect(target).toEqual(modelCenter);
    });

    it('should throw error for invalid model center', () => {
      expect(() => {
        CameraCalculationService.calculateCameraTarget(null);
      }).toThrow('Invalid model center');

      expect(() => {
        CameraCalculationService.calculateCameraTarget({ x: 1, y: 2 });
      }).toThrow('Invalid model center');
    });
  });

  describe('calculateAspectRatio', () => {
    it('should calculate aspect ratio', () => {
      const aspect = CameraCalculationService.calculateAspectRatio(1920, 1080);

      expect(aspect).toBeCloseTo(16 / 9, 5);
    });

    it('should handle square aspect', () => {
      const aspect = CameraCalculationService.calculateAspectRatio(1000, 1000);

      expect(aspect).toBe(1);
    });

    it('should throw error for invalid dimensions', () => {
      expect(() => {
        CameraCalculationService.calculateAspectRatio(-1, 1080);
      }).toThrow('Width must be a positive number');

      expect(() => {
        CameraCalculationService.calculateAspectRatio(1920, 0);
      }).toThrow('Height must be a positive number');
    });
  });

  describe('degreesToRadians', () => {
    it('should convert degrees to radians', () => {
      expect(CameraCalculationService.degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
      expect(CameraCalculationService.degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10);
      expect(CameraCalculationService.degreesToRadians(0)).toBe(0);
    });

    it('should throw error for non-number', () => {
      expect(() => {
        CameraCalculationService.degreesToRadians('invalid');
      }).toThrow('Degrees must be a number');
    });
  });

  describe('radiansToDegrees', () => {
    it('should convert radians to degrees', () => {
      expect(CameraCalculationService.radiansToDegrees(Math.PI)).toBeCloseTo(180, 10);
      expect(CameraCalculationService.radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 10);
      expect(CameraCalculationService.radiansToDegrees(0)).toBe(0);
    });

    it('should throw error for non-number', () => {
      expect(() => {
        CameraCalculationService.radiansToDegrees('invalid');
      }).toThrow('Radians must be a number');
    });
  });

  describe('calculateVisibleHeight', () => {
    it('should calculate visible height at distance', () => {
      const distance = 10;
      const fov = 45;

      const height = CameraCalculationService.calculateVisibleHeight(distance, fov);

      expect(height).toBeGreaterThan(0);
      // For 45° FOV and distance 10, visible height ≈ 8.28
      expect(height).toBeCloseTo(8.28, 1);
    });

    it('should calculate larger height for wider FOV', () => {
      const distance = 10;
      const height60 = CameraCalculationService.calculateVisibleHeight(distance, 60);
      const height30 = CameraCalculationService.calculateVisibleHeight(distance, 30);

      expect(height60).toBeGreaterThan(height30);
    });

    it('should throw error for invalid distance', () => {
      expect(() => {
        CameraCalculationService.calculateVisibleHeight(-1, 45);
      }).toThrow('Distance must be a positive number');
    });

    it('should throw error for invalid FOV', () => {
      expect(() => {
        CameraCalculationService.calculateVisibleHeight(10, 180);
      }).toThrow('Camera FOV must be between 0 and 180 degrees');
    });
  });

  describe('calculateVisibleWidth', () => {
    it('should calculate visible width at distance', () => {
      const distance = 10;
      const fov = 45;
      const aspectRatio = 16 / 9;

      const width = CameraCalculationService.calculateVisibleWidth(distance, fov, aspectRatio);

      const height = CameraCalculationService.calculateVisibleHeight(distance, fov);
      expect(width).toBeCloseTo(height * aspectRatio, 5);
    });

    it('should throw error for invalid aspect ratio', () => {
      expect(() => {
        CameraCalculationService.calculateVisibleWidth(10, 45, -1);
      }).toThrow('Aspect ratio must be a positive number');
    });
  });

  describe('isValidPreset', () => {
    it('should return true for valid preset', () => {
      const preset = {
        position: { x: 0, y: 1, z: 3 },
        target: { x: 0, y: 0, z: 0 }
      };

      expect(CameraCalculationService.isValidPreset(preset)).toBe(true);
    });

    it('should return false for null', () => {
      expect(CameraCalculationService.isValidPreset(null)).toBe(false);
    });

    it('should return false for missing position', () => {
      const preset = {
        target: { x: 0, y: 0, z: 0 }
      };

      expect(CameraCalculationService.isValidPreset(preset)).toBe(false);
    });

    it('should return false for missing target', () => {
      const preset = {
        position: { x: 0, y: 1, z: 3 }
      };

      expect(CameraCalculationService.isValidPreset(preset)).toBe(false);
    });

    it('should return false for invalid position values', () => {
      const preset = {
        position: { x: 'invalid', y: 1, z: 3 },
        target: { x: 0, y: 0, z: 0 }
      };

      expect(CameraCalculationService.isValidPreset(preset)).toBe(false);
    });

    it('should return false for infinite values', () => {
      const preset = {
        position: { x: Infinity, y: 1, z: 3 },
        target: { x: 0, y: 0, z: 0 }
      };

      expect(CameraCalculationService.isValidPreset(preset)).toBe(false);
    });
  });

  describe('calculateIsometricPosition', () => {
    it('should calculate isometric camera position', () => {
      const distance = 10;

      const position = CameraCalculationService.calculateIsometricPosition(distance);

      expect(position).toHaveProperty('x');
      expect(position).toHaveProperty('y');
      expect(position).toHaveProperty('z');
      
      // All coordinates should be non-zero for isometric view
      expect(Math.abs(position.x)).toBeGreaterThan(0);
      expect(Math.abs(position.y)).toBeGreaterThan(0);
      expect(Math.abs(position.z)).toBeGreaterThan(0);
    });

    it('should throw error for invalid distance', () => {
      expect(() => {
        CameraCalculationService.calculateIsometricPosition(-1);
      }).toThrow('Distance must be a positive number');
    });

    it('should scale with distance', () => {
      const pos1 = CameraCalculationService.calculateIsometricPosition(5);
      const pos2 = CameraCalculationService.calculateIsometricPosition(10);

      // pos2 should be approximately 2x pos1
      expect(pos2.x).toBeCloseTo(pos1.x * 2, 1);
      expect(pos2.y).toBeCloseTo(pos1.y * 2, 1);
      expect(pos2.z).toBeCloseTo(pos1.z * 2, 1);
    });
  });

  describe('calculateCameraTransition', () => {
    it('should calculate transition parameters', () => {
      const startPos = { x: 0, y: 0, z: 0 };
      const endPos = { x: 10, y: 5, z: -5 };
      const duration = 2; // seconds

      const transition = CameraCalculationService.calculateCameraTransition(startPos, endPos, duration);

      expect(transition.totalFrames).toBe(120); // 60 fps * 2 sec
      expect(transition.duration).toBe(2);
      expect(transition.fps).toBe(60);
      expect(transition.stepSize.x).toBeCloseTo(10 / 120, 5);
      expect(transition.stepSize.y).toBeCloseTo(5 / 120, 5);
      expect(transition.stepSize.z).toBeCloseTo(-5 / 120, 5);
    });

    it('should use custom FPS', () => {
      const startPos = { x: 0, y: 0, z: 0 };
      const endPos = { x: 10, y: 5, z: -5 };
      const duration = 1;
      const fps = 30;

      const transition = CameraCalculationService.calculateCameraTransition(startPos, endPos, duration, fps);

      expect(transition.totalFrames).toBe(30);
      expect(transition.fps).toBe(30);
    });

    it('should throw error for missing positions', () => {
      expect(() => {
        CameraCalculationService.calculateCameraTransition(null, { x: 1, y: 2, z: 3 }, 1);
      }).toThrow('Start and end positions are required');
    });

    it('should throw error for invalid duration', () => {
      const startPos = { x: 0, y: 0, z: 0 };
      const endPos = { x: 1, y: 1, z: 1 };

      expect(() => {
        CameraCalculationService.calculateCameraTransition(startPos, endPos, -1);
      }).toThrow('Duration must be a positive number');
    });

    it('should throw error for invalid FPS', () => {
      const startPos = { x: 0, y: 0, z: 0 };
      const endPos = { x: 1, y: 1, z: 1 };

      expect(() => {
        CameraCalculationService.calculateCameraTransition(startPos, endPos, 1, 0);
      }).toThrow('FPS must be a positive number');
    });
  });
});
