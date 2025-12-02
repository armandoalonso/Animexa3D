import { describe, it, expect } from 'vitest';
import { ModelPositioningService } from '../../src/renderer/modules/core/ModelPositioningService.js';

describe('ModelPositioningService', () => {
  describe('calculateModelPosition', () => {
    it('should calculate position to center model on grid', () => {
      const boundingBox = {
        min: { x: -1, y: 0, z: -1 },
        max: { x: 1, y: 2, z: 1 }
      };

      const position = ModelPositioningService.calculateModelPosition(boundingBox);

      expect(position.x).toBeCloseTo(0, 10); // Centered in X
      expect(position.y).toBeCloseTo(0, 10); // Bottom on grid
      expect(position.z).toBeCloseTo(0, 10); // Centered in Z
    });

    it('should position off-center model correctly', () => {
      const boundingBox = {
        min: { x: 2, y: 1, z: 3 },
        max: { x: 4, y: 3, z: 5 }
      };

      const position = ModelPositioningService.calculateModelPosition(boundingBox);

      expect(position.x).toBe(-3); // Center X is 3
      expect(position.y).toBe(-1); // Bottom Y is 1
      expect(position.z).toBe(-4); // Center Z is 4
    });

    it('should throw error for invalid bounding box', () => {
      expect(() => {
        ModelPositioningService.calculateModelPosition(null);
      }).toThrow('Invalid bounding box');

      expect(() => {
        ModelPositioningService.calculateModelPosition({});
      }).toThrow('Invalid bounding box');
    });
  });

  describe('calculateCenter', () => {
    it('should calculate center of bounding box', () => {
      const boundingBox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 2, y: 4, z: 6 }
      };

      const center = ModelPositioningService.calculateCenter(boundingBox);

      expect(center).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should handle negative coordinates', () => {
      const boundingBox = {
        min: { x: -2, y: -4, z: -6 },
        max: { x: 2, y: 4, z: 6 }
      };

      const center = ModelPositioningService.calculateCenter(boundingBox);

      expect(center).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('calculateSize', () => {
    it('should calculate size of bounding box', () => {
      const boundingBox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 2, y: 4, z: 6 }
      };

      const size = ModelPositioningService.calculateSize(boundingBox);

      expect(size).toEqual({ x: 2, y: 4, z: 6 });
    });

    it('should handle negative coordinates', () => {
      const boundingBox = {
        min: { x: -1, y: -2, z: -3 },
        max: { x: 1, y: 2, z: 3 }
      };

      const size = ModelPositioningService.calculateSize(boundingBox);

      expect(size).toEqual({ x: 2, y: 4, z: 6 });
    });
  });

  describe('calculateGridSize', () => {
    it('should calculate grid size with default multiplier', () => {
      const modelSize = { x: 5, y: 10, z: 3 };

      const gridSize = ModelPositioningService.calculateGridSize(modelSize);

      expect(gridSize).toBe(15); // max(5, 3) * 3 = 15
    });

    it('should use minimum size when model is small', () => {
      const modelSize = { x: 1, y: 1, z: 1 };

      const gridSize = ModelPositioningService.calculateGridSize(modelSize);

      expect(gridSize).toBe(10); // min size is 10
    });

    it('should use custom multiplier', () => {
      const modelSize = { x: 10, y: 5, z: 8 };

      const gridSize = ModelPositioningService.calculateGridSize(modelSize, 5);

      expect(gridSize).toBe(50); // max(10, 8) * 5 = 50
    });

    it('should use custom minimum size', () => {
      const modelSize = { x: 1, y: 1, z: 1 };

      const gridSize = ModelPositioningService.calculateGridSize(modelSize, 3, 20);

      expect(gridSize).toBe(20); // custom min size
    });

    it('should round up to nearest integer', () => {
      const modelSize = { x: 3.3, y: 2, z: 2 };

      const gridSize = ModelPositioningService.calculateGridSize(modelSize);

      expect(gridSize).toBe(10); // 3.3 * 3 = 9.9, rounded up to 10
    });

    it('should throw error for invalid model size', () => {
      expect(() => {
        ModelPositioningService.calculateGridSize({ x: 'invalid', z: 5 });
      }).toThrow('Invalid model size');
    });

    it('should throw error for invalid multiplier', () => {
      expect(() => {
        ModelPositioningService.calculateGridSize({ x: 5, y: 5, z: 5 }, -1);
      }).toThrow('Multiplier must be a positive number');
    });
  });

  describe('calculateGridDivisions', () => {
    it('should calculate grid divisions', () => {
      const divisions = ModelPositioningService.calculateGridDivisions(100);
      expect(divisions).toBe(100);
    });

    it('should use custom division size', () => {
      const divisions = ModelPositioningService.calculateGridDivisions(100, 2);
      expect(divisions).toBe(50);
    });

    it('should throw error for invalid grid size', () => {
      expect(() => {
        ModelPositioningService.calculateGridDivisions(-10);
      }).toThrow('Grid size must be a positive number');
    });
  });

  describe('isValidPosition', () => {
    it('should return true for valid position', () => {
      const position = { x: 1, y: 2, z: 3 };
      expect(ModelPositioningService.isValidPosition(position)).toBe(true);
    });

    it('should return false for null', () => {
      expect(ModelPositioningService.isValidPosition(null)).toBe(false);
    });

    it('should return false for missing properties', () => {
      expect(ModelPositioningService.isValidPosition({ x: 1, y: 2 })).toBe(false);
    });

    it('should return false for non-numeric values', () => {
      expect(ModelPositioningService.isValidPosition({ x: 'a', y: 2, z: 3 })).toBe(false);
    });

    it('should return false for infinite values', () => {
      expect(ModelPositioningService.isValidPosition({ x: Infinity, y: 2, z: 3 })).toBe(false);
    });
  });

  describe('getMaxDimension', () => {
    it('should return maximum dimension', () => {
      const modelSize = { x: 5, y: 10, z: 3 };
      expect(ModelPositioningService.getMaxDimension(modelSize)).toBe(10);
    });

    it('should handle equal dimensions', () => {
      const modelSize = { x: 5, y: 5, z: 5 };
      expect(ModelPositioningService.getMaxDimension(modelSize)).toBe(5);
    });

    it('should throw error for invalid model size', () => {
      expect(() => {
        ModelPositioningService.getMaxDimension({ x: 1, y: 2 });
      }).toThrow('Invalid model size');
    });
  });

  describe('calculatePositionOffset', () => {
    it('should calculate offset between positions', () => {
      const current = { x: 0, y: 0, z: 0 };
      const target = { x: 5, y: 10, z: -5 };

      const offset = ModelPositioningService.calculatePositionOffset(current, target);

      expect(offset).toEqual({ x: 5, y: 10, z: -5 });
    });

    it('should handle negative offsets', () => {
      const current = { x: 10, y: 5, z: 3 };
      const target = { x: 5, y: 2, z: 1 };

      const offset = ModelPositioningService.calculatePositionOffset(current, target);

      expect(offset).toEqual({ x: -5, y: -3, z: -2 });
    });

    it('should throw error for invalid positions', () => {
      expect(() => {
        ModelPositioningService.calculatePositionOffset(null, { x: 1, y: 2, z: 3 });
      }).toThrow('Invalid current position');
    });
  });

  describe('isModelWithinGridBounds', () => {
    it('should return true when model is within bounds', () => {
      const boundingBox = {
        min: { x: -5, y: 0, z: -5 },
        max: { x: 5, y: 2, z: 5 }
      };

      const result = ModelPositioningService.isModelWithinGridBounds(boundingBox, 20);

      expect(result.isWithinBounds).toBe(true);
      expect(result.exceedsX).toBe(false);
      expect(result.exceedsZ).toBe(false);
    });

    it('should return false when model exceeds bounds', () => {
      const boundingBox = {
        min: { x: -15, y: 0, z: -5 },
        max: { x: 15, y: 2, z: 5 }
      };

      const result = ModelPositioningService.isModelWithinGridBounds(boundingBox, 20);

      expect(result.isWithinBounds).toBe(false);
      expect(result.exceedsX).toBe(true);
    });

    it('should calculate required size', () => {
      const boundingBox = {
        min: { x: -15, y: 0, z: -10 },
        max: { x: 15, y: 2, z: 10 }
      };

      const result = ModelPositioningService.isModelWithinGridBounds(boundingBox, 20);

      expect(result.requiredSize).toBe(30); // max abs value is 15, * 2 = 30
    });
  });

  describe('calculatePivotOffset', () => {
    it('should calculate center pivot offset', () => {
      const boundingBox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 2, y: 4, z: 6 }
      };

      const offset = ModelPositioningService.calculatePivotOffset(boundingBox, 'center');

      expect(offset).toEqual({ x: -1, y: -2, z: -3 });
    });

    it('should calculate bottom pivot offset', () => {
      const boundingBox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 2, y: 4, z: 6 }
      };

      const offset = ModelPositioningService.calculatePivotOffset(boundingBox, 'bottom');

      expect(offset.x).toBe(-1);
      expect(offset.y).toBeCloseTo(0, 10);
      expect(offset.z).toBe(-3);
    });

    it('should calculate top pivot offset', () => {
      const boundingBox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 2, y: 4, z: 6 }
      };

      const offset = ModelPositioningService.calculatePivotOffset(boundingBox, 'top');

      expect(offset).toEqual({ x: -1, y: -4, z: -3 });
    });

    it('should throw error for invalid pivot position', () => {
      const boundingBox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 2, y: 4, z: 6 }
      };

      expect(() => {
        ModelPositioningService.calculatePivotOffset(boundingBox, 'invalid');
      }).toThrow('Invalid pivot position');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between positions', () => {
      const pos1 = { x: 0, y: 0, z: 0 };
      const pos2 = { x: 3, y: 4, z: 0 };

      const distance = ModelPositioningService.calculateDistance(pos1, pos2);

      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should calculate 3D distance', () => {
      const pos1 = { x: 0, y: 0, z: 0 };
      const pos2 = { x: 1, y: 1, z: 1 };

      const distance = ModelPositioningService.calculateDistance(pos1, pos2);

      expect(distance).toBeCloseTo(Math.sqrt(3), 5);
    });

    it('should throw error for invalid positions', () => {
      expect(() => {
        ModelPositioningService.calculateDistance(null, { x: 1, y: 2, z: 3 });
      }).toThrow('Both positions must be valid');
    });
  });

  describe('snapToGrid', () => {
    it('should snap position to grid', () => {
      const position = { x: 1.4, y: 2.6, z: 3.1 };

      const snapped = ModelPositioningService.snapToGrid(position);

      expect(snapped).toEqual({ x: 1, y: 3, z: 3 });
    });

    it('should use custom grid spacing', () => {
      const position = { x: 1.4, y: 2.6, z: 3.1 };

      const snapped = ModelPositioningService.snapToGrid(position, 0.5);

      expect(snapped).toEqual({ x: 1.5, y: 2.5, z: 3 });
    });

    it('should throw error for invalid position', () => {
      expect(() => {
        ModelPositioningService.snapToGrid(null);
      }).toThrow('Invalid position');
    });

    it('should throw error for invalid grid spacing', () => {
      expect(() => {
        ModelPositioningService.snapToGrid({ x: 1, y: 2, z: 3 }, -1);
      }).toThrow('Grid spacing must be a positive number');
    });
  });
});
