import * as THREE from 'three';

/**
 * CoordinateSystemDetector
 * 
 * Automatically detects coordinate system, handedness, up-axis, forward-axis, 
 * and unit scale from loaded 3D models, then converts them to a canonical 
 * right-handed Y-up space with normalized unit scale (1 unit = 1 meter).
 * 
 * Based on principles from animation retargeting frameworks that canonicalize
 * skeletons and motions before retargeting.
 */
export class CoordinateSystemDetector {
  constructor() {
    // Canonical space: Right-handed, Y-up, Z-forward, 1 unit = 1 meter
    this.CANONICAL_HANDEDNESS = 'right';
    this.CANONICAL_UP_AXIS = 'Y';
    this.CANONICAL_FORWARD_AXIS = 'Z';
    this.CANONICAL_UNIT_SCALE = 1.0; // 1 unit = 1 meter
  }

  /**
   * Detect the coordinate system of a model
   * @param {THREE.Object3D} model - The model to analyze
   * @returns {Object} Detection result with handedness, up-axis, forward-axis, and scale
   */
  detectCoordinateSystem(model) {
    const detection = {
      handedness: 'right', // Three.js default is right-handed
      upAxis: null,
      forwardAxis: null,
      estimatedScale: 1.0,
      confidence: {
        upAxis: 0,
        forwardAxis: 0,
        scale: 0
      }
    };

    // Calculate bounding box to determine orientation and scale
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    console.log('📊 Coordinate System Detection:');
    console.log('  Bounding box size:', size);
    console.log('  Center:', center);

    // Detect up-axis by analyzing model proportions
    detection.upAxis = this.detectUpAxis(model, size, detection);
    
    // Detect forward-axis
    detection.forwardAxis = this.detectForwardAxis(model, size, detection.upAxis, detection);
    
    // Detect scale (estimate meters per unit)
    detection.estimatedScale = this.detectScale(model, size, detection);
    
    // Three.js is always right-handed, but we check for consistency
    detection.handedness = 'right';

    console.log('  Detected up-axis:', detection.upAxis, `(confidence: ${detection.confidence.upAxis}%)`);
    console.log('  Detected forward-axis:', detection.forwardAxis, `(confidence: ${detection.confidence.forwardAxis}%)`);
    console.log('  Detected scale:', detection.estimatedScale, 'meters/unit', `(confidence: ${detection.confidence.scale}%)`);
    console.log('  Handedness:', detection.handedness);

    return detection;
  }

  /**
   * Detect the up-axis by analyzing model structure
   */
  detectUpAxis(model, size, detection) {
    // Heuristic: The up-axis is typically the tallest dimension for humanoid/character models
    // This works for most character rigs and props
    
    let upAxis = 'Y';
    let confidence = 50;

    // Check which dimension is largest (likely the up-axis for characters)
    const maxDim = Math.max(size.x, size.y, size.z);
    
    if (size.y === maxDim) {
      upAxis = 'Y';
      confidence = 85;
    } else if (size.z === maxDim) {
      upAxis = 'Z';
      confidence = 75;
    } else if (size.x === maxDim) {
      upAxis = 'X';
      confidence = 60;
    }

    // Additional heuristic: Check skeleton bones if available
    const skeleton = this.findSkeleton(model);
    if (skeleton) {
      const boneUpAxis = this.analyzeBoneOrientation(skeleton);
      if (boneUpAxis) {
        upAxis = boneUpAxis;
        confidence = Math.min(95, confidence + 20);
      }
    }

    // Check for common naming patterns in root node
    const rootName = model.name.toLowerCase();
    if (rootName.includes('y_up') || rootName.includes('yup')) {
      upAxis = 'Y';
      confidence = 95;
    } else if (rootName.includes('z_up') || rootName.includes('zup')) {
      upAxis = 'Z';
      confidence = 95;
    }

    detection.confidence.upAxis = confidence;
    return upAxis;
  }

  /**
   * Detect the forward-axis
   */
  detectForwardAxis(model, size, upAxis, detection) {
    let forwardAxis = 'Z';
    let confidence = 50;

    // In a right-handed Y-up system, forward is typically -Z
    // In a right-handed Z-up system, forward is typically Y
    
    if (upAxis === 'Y') {
      forwardAxis = 'Z';
      confidence = 70;
    } else if (upAxis === 'Z') {
      forwardAxis = 'Y';
      confidence = 70;
    } else if (upAxis === 'X') {
      // Less common, but forward is usually Z
      forwardAxis = 'Z';
      confidence = 60;
    }

    // Check root node naming
    const rootName = model.name.toLowerCase();
    if (rootName.includes('z_forward') || rootName.includes('zforward')) {
      forwardAxis = 'Z';
      confidence = 95;
    } else if (rootName.includes('y_forward') || rootName.includes('yforward')) {
      forwardAxis = 'Y';
      confidence = 95;
    }

    detection.confidence.forwardAxis = confidence;
    return forwardAxis;
  }

  /**
   * Detect the scale (estimate meters per unit)
   */
  detectScale(model, size, detection) {
    // Heuristic: For humanoid characters, average height is ~1.7 meters
    // For objects, we look at overall scale
    
    let estimatedScale = 1.0;
    let confidence = 40;

    const maxDim = Math.max(size.x, size.y, size.z);

    // Detect if this looks like a humanoid (tall and narrow)
    const aspectRatio = size.y / Math.max(size.x, size.z);
    const isHumanoid = aspectRatio > 2.0 && aspectRatio < 6.0;

    if (isHumanoid) {
      // Assume this is a character, typical height 1.6-1.8 meters
      const assumedHeightMeters = 1.7;
      estimatedScale = assumedHeightMeters / size.y;
      confidence = 70;
      console.log(`  Detected humanoid character (aspect ratio: ${aspectRatio.toFixed(2)})`);
    } else {
      // Generic object - check if scale is way off
      if (maxDim < 0.1) {
        // Very small model, likely in millimeters or centimeters
        estimatedScale = 100.0; // Assume centimeters
        confidence = 60;
      } else if (maxDim > 100) {
        // Very large model, likely in centimeters or millimeters
        estimatedScale = 0.01; // Assume centimeters
        confidence = 60;
      } else if (maxDim > 10) {
        // Large model, possibly in centimeters
        estimatedScale = 0.01; // Assume centimeters
        confidence = 50;
      } else {
        // Reasonable scale, assume meters
        estimatedScale = 1.0;
        confidence = 40;
      }
    }

    detection.confidence.scale = confidence;
    return estimatedScale;
  }

  /**
   * Find skeleton in the model
   */
  findSkeleton(model) {
    let skeleton = null;
    
    model.traverse((child) => {
      if (child.isSkinnedMesh && child.skeleton && !skeleton) {
        skeleton = child.skeleton;
      }
    });

    return skeleton;
  }

  /**
   * Analyze bone orientation to determine up-axis
   */
  analyzeBoneOrientation(skeleton) {
    if (!skeleton.bones || skeleton.bones.length === 0) return null;

    // Find root bone (no parent or parent not in skeleton)
    let rootBone = null;
    const boneSet = new Set(skeleton.bones);
    
    for (const bone of skeleton.bones) {
      if (!bone.parent || !boneSet.has(bone.parent)) {
        rootBone = bone;
        break;
      }
    }

    if (!rootBone || rootBone.children.length === 0) return null;

    // Analyze the direction from root to first child
    // This often points "up" the character
    const firstChild = rootBone.children.find(child => boneSet.has(child));
    if (!firstChild) return null;

    const direction = new THREE.Vector3();
    firstChild.getWorldPosition(direction);
    
    const rootPos = new THREE.Vector3();
    rootBone.getWorldPosition(rootPos);
    
    direction.sub(rootPos).normalize();

    // Determine which axis has the largest component
    const absX = Math.abs(direction.x);
    const absY = Math.abs(direction.y);
    const absZ = Math.abs(direction.z);

    if (absY > absX && absY > absZ) return 'Y';
    if (absZ > absX && absZ > absY) return 'Z';
    if (absX > absY && absX > absZ) return 'X';

    return null;
  }

  /**
   * Convert a model to canonical space (right-handed, Y-up, Z-forward, 1 unit = 1 meter)
   * @param {THREE.Object3D} model - The model to convert
   * @returns {Object} Conversion result with applied transformations
   */
  convertToCanonicalSpace(model) {
    console.log('🔄 Converting to canonical space (Right-handed, Y-up, Z-forward, 1 unit = 1 meter)...');

    const detection = this.detectCoordinateSystem(model);
    const conversions = {
      rotationApplied: false,
      scaleApplied: false,
      rotation: { axis: null, angle: 0 },
      scaleFactor: 1.0,
      originalSystem: { ...detection }
    };

    // Apply coordinate system conversion
    if (detection.upAxis !== this.CANONICAL_UP_AXIS) {
      this.applyAxisConversion(model, detection.upAxis, this.CANONICAL_UP_AXIS);
      conversions.rotationApplied = true;
      conversions.rotation = {
        from: `${detection.upAxis}-up`,
        to: `${this.CANONICAL_UP_AXIS}-up`
      };
      console.log(`  ✓ Converted from ${detection.upAxis}-up to ${this.CANONICAL_UP_AXIS}-up`);
    }

    // Apply scale normalization (1 unit = 1 meter)
    if (Math.abs(detection.estimatedScale - this.CANONICAL_UNIT_SCALE) > 0.01) {
      const scaleFactor = detection.estimatedScale / this.CANONICAL_UNIT_SCALE;
      model.scale.multiplyScalar(scaleFactor);
      conversions.scaleApplied = true;
      conversions.scaleFactor = scaleFactor;
      console.log(`  ✓ Applied scale factor: ${scaleFactor.toFixed(4)}x (normalized to 1 unit = 1 meter)`);
    }

    // Update matrices after transformation
    model.updateMatrixWorld(true);

    console.log('✅ Canonical space conversion complete');
    return conversions;
  }

  /**
   * Apply axis conversion (e.g., Z-up to Y-up)
   */
  applyAxisConversion(model, fromAxis, toAxis) {
    // Conversion matrices for common axis changes
    
    if (fromAxis === 'Z' && toAxis === 'Y') {
      // Z-up to Y-up: Rotate -90° around X-axis
      model.rotateX(-Math.PI / 2);
    } else if (fromAxis === 'X' && toAxis === 'Y') {
      // X-up to Y-up: Rotate 90° around Z-axis
      model.rotateZ(Math.PI / 2);
    } else if (fromAxis === 'Y' && toAxis === 'Z') {
      // Y-up to Z-up: Rotate 90° around X-axis
      model.rotateX(Math.PI / 2);
    } else if (fromAxis === 'Y' && toAxis === 'X') {
      // Y-up to X-up: Rotate -90° around Z-axis
      model.rotateZ(-Math.PI / 2);
    }
    
    // Note: Three.js is right-handed, so we don't need handedness conversion
  }

  /**
   * Get a summary of the canonical space specification
   */
  getCanonicalSpaceInfo() {
    return {
      handedness: this.CANONICAL_HANDEDNESS,
      upAxis: this.CANONICAL_UP_AXIS,
      forwardAxis: this.CANONICAL_FORWARD_AXIS,
      unitScale: this.CANONICAL_UNIT_SCALE,
      description: 'Right-handed coordinate system, Y-up, Z-forward, 1 unit = 1 meter'
    };
  }
}
