/**
 * ModelPositioningService - Pure logic for model positioning and grid calculations
 * Handles model positioning, centering, and grid sizing without Three.js dependencies
 */
export class ModelPositioningService {
  /**
   * Calculate the position to center a model horizontally and place it on the grid
   * @param {Object} boundingBox - Object with min and max properties (Vector3-like)
   * @returns {Object} Position object with x, y, z properties
   */
  static calculateModelPosition(boundingBox) {
    if (!boundingBox || !boundingBox.min || !boundingBox.max) {
      throw new Error('Invalid bounding box: must have min and max properties');
    }

    const { min, max } = boundingBox;

    // Calculate center
    const centerX = (min.x + max.x) / 2;
    const centerZ = (min.z + max.z) / 2;

    // Position model so:
    // - Bottom sits on grid (y = 0)
    // - Centered horizontally (x and z)
    return {
      x: -centerX,
      y: -min.y,
      z: -centerZ
    };
  }

  /**
   * Calculate the center point of a bounding box
   * @param {Object} boundingBox - Object with min and max properties
   * @returns {Object} Center point with x, y, z properties
   */
  static calculateCenter(boundingBox) {
    if (!boundingBox || !boundingBox.min || !boundingBox.max) {
      throw new Error('Invalid bounding box: must have min and max properties');
    }

    const { min, max } = boundingBox;

    return {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2
    };
  }

  /**
   * Calculate the size of a bounding box
   * @param {Object} boundingBox - Object with min and max properties
   * @returns {Object} Size object with x, y, z properties
   */
  static calculateSize(boundingBox) {
    if (!boundingBox || !boundingBox.min || !boundingBox.max) {
      throw new Error('Invalid bounding box: must have min and max properties');
    }

    const { min, max } = boundingBox;

    return {
      x: max.x - min.x,
      y: max.y - min.y,
      z: max.z - min.z
    };
  }

  /**
   * Calculate appropriate grid size based on model dimensions
   * @param {Object} modelSize - Size object with x, y, z properties
   * @param {number} multiplier - Multiplier for grid size (default 3)
   * @param {number} minSize - Minimum grid size (default 10)
   * @returns {number} Grid size (will be an integer)
   */
  static calculateGridSize(modelSize, multiplier = 3, minSize = 10) {
    if (!modelSize || typeof modelSize.x !== 'number' || typeof modelSize.z !== 'number') {
      throw new Error('Invalid model size: must have numeric x and z properties');
    }

    if (typeof multiplier !== 'number' || multiplier <= 0) {
      throw new Error('Multiplier must be a positive number');
    }

    if (typeof minSize !== 'number' || minSize <= 0) {
      throw new Error('Minimum size must be a positive number');
    }

    // Use the larger of x or z dimensions
    const maxDimension = Math.max(modelSize.x, modelSize.z);

    // Apply multiplier and ensure minimum size
    const calculatedSize = maxDimension * multiplier;
    const finalSize = Math.max(minSize, calculatedSize);

    // Round up to nearest integer
    return Math.ceil(finalSize);
  }

  /**
   * Calculate grid divisions based on grid size
   * @param {number} gridSize - Size of the grid
   * @param {number} divisionSize - Size of each division (default 1)
   * @returns {number} Number of divisions
   */
  static calculateGridDivisions(gridSize, divisionSize = 1) {
    if (typeof gridSize !== 'number' || gridSize <= 0) {
      throw new Error('Grid size must be a positive number');
    }

    if (typeof divisionSize !== 'number' || divisionSize <= 0) {
      throw new Error('Division size must be a positive number');
    }

    return Math.floor(gridSize / divisionSize);
  }

  /**
   * Validate a position object
   * @param {Object} position - Position object with x, y, z properties
   * @returns {boolean} True if position is valid
   */
  static isValidPosition(position) {
    if (!position || typeof position !== 'object') {
      return false;
    }

    const { x, y, z } = position;

    return (
      typeof x === 'number' && isFinite(x) &&
      typeof y === 'number' && isFinite(y) &&
      typeof z === 'number' && isFinite(z)
    );
  }

  /**
   * Calculate the maximum dimension of a model
   * @param {Object} modelSize - Size object with x, y, z properties
   * @returns {number} Maximum dimension
   */
  static getMaxDimension(modelSize) {
    if (!modelSize || 
        typeof modelSize.x !== 'number' || 
        typeof modelSize.y !== 'number' || 
        typeof modelSize.z !== 'number') {
      throw new Error('Invalid model size: must have numeric x, y, z properties');
    }

    return Math.max(modelSize.x, modelSize.y, modelSize.z);
  }

  /**
   * Calculate offset to place model on grid at a specific position
   * @param {Object} currentPosition - Current model position
   * @param {Object} targetPosition - Target position on grid
   * @returns {Object} Offset to apply with x, y, z properties
   */
  static calculatePositionOffset(currentPosition, targetPosition) {
    if (!this.isValidPosition(currentPosition)) {
      throw new Error('Invalid current position');
    }

    if (!this.isValidPosition(targetPosition)) {
      throw new Error('Invalid target position');
    }

    return {
      x: targetPosition.x - currentPosition.x,
      y: targetPosition.y - currentPosition.y,
      z: targetPosition.z - currentPosition.z
    };
  }

  /**
   * Check if model is within grid bounds
   * @param {Object} boundingBox - Model bounding box
   * @param {number} gridSize - Size of the grid
   * @returns {Object} Result with isWithinBounds boolean and details
   */
  static isModelWithinGridBounds(boundingBox, gridSize) {
    if (!boundingBox || !boundingBox.min || !boundingBox.max) {
      throw new Error('Invalid bounding box');
    }

    if (typeof gridSize !== 'number' || gridSize <= 0) {
      throw new Error('Grid size must be a positive number');
    }

    const halfGrid = gridSize / 2;
    const { min, max } = boundingBox;

    const withinX = min.x >= -halfGrid && max.x <= halfGrid;
    const withinZ = min.z >= -halfGrid && max.z <= halfGrid;

    return {
      isWithinBounds: withinX && withinZ,
      exceedsX: !withinX,
      exceedsZ: !withinZ,
      requiredSize: Math.max(
        Math.abs(min.x) * 2,
        Math.abs(max.x) * 2,
        Math.abs(min.z) * 2,
        Math.abs(max.z) * 2
      )
    };
  }

  /**
   * Calculate model pivot point offset
   * @param {Object} boundingBox - Model bounding box
   * @param {Object} pivotPosition - Desired pivot position ('center', 'bottom', 'top')
   * @returns {Object} Pivot offset with x, y, z properties
   */
  static calculatePivotOffset(boundingBox, pivotPosition = 'bottom') {
    if (!boundingBox || !boundingBox.min || !boundingBox.max) {
      throw new Error('Invalid bounding box');
    }

    const center = this.calculateCenter(boundingBox);
    const { min, max } = boundingBox;

    switch (pivotPosition) {
      case 'center':
        return { x: -center.x, y: -center.y, z: -center.z };
      
      case 'bottom':
        return { x: -center.x, y: -min.y, z: -center.z };
      
      case 'top':
        return { x: -center.x, y: -max.y, z: -center.z };
      
      default:
        throw new Error(`Invalid pivot position: ${pivotPosition}. Use 'center', 'bottom', or 'top'`);
    }
  }

  /**
   * Calculate distance between two positions
   * @param {Object} pos1 - First position
   * @param {Object} pos2 - Second position
   * @returns {number} Euclidean distance
   */
  static calculateDistance(pos1, pos2) {
    if (!this.isValidPosition(pos1) || !this.isValidPosition(pos2)) {
      throw new Error('Both positions must be valid');
    }

    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Snap position to grid
   * @param {Object} position - Position to snap
   * @param {number} gridSpacing - Grid spacing (default 1)
   * @returns {Object} Snapped position
   */
  static snapToGrid(position, gridSpacing = 1) {
    if (!this.isValidPosition(position)) {
      throw new Error('Invalid position');
    }

    if (typeof gridSpacing !== 'number' || gridSpacing <= 0) {
      throw new Error('Grid spacing must be a positive number');
    }

    return {
      x: Math.round(position.x / gridSpacing) * gridSpacing,
      y: Math.round(position.y / gridSpacing) * gridSpacing,
      z: Math.round(position.z / gridSpacing) * gridSpacing
    };
  }
}
