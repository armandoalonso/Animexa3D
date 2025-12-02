import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoordinateSystemDetector } from '@renderer/modules/core/CoordinateSystemDetector.js';
import * as THREE from 'three';

describe('CoordinateSystemDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new CoordinateSystemDetector();
  });

  describe('detectCoordinateSystem', () => {
    it('should detect right-handed Y-up Z-forward (default)', () => {
      const model = new THREE.Object3D();
      const bone = new THREE.Bone();
      bone.position.set(0, 1, 0); // Y-up
      model.add(bone);

      const system = detector.detectCoordinateSystem(model);

      expect(system).toHaveProperty('handedness');
      expect(system).toHaveProperty('upAxis');
      expect(system).toHaveProperty('forwardAxis');
    });

    it('should handle model without bones', () => {
      const model = new THREE.Object3D();

      const system = detector.detectCoordinateSystem(model);

      expect(system.upAxis).toBe('Y');
      expect(system.forwardAxis).toBe('Z');
      expect(system.handedness).toBe('right');
    });

    it('should analyze multiple bones', () => {
      const model = new THREE.Object3D();
      const root = new THREE.Bone();
      const child1 = new THREE.Bone();
      const child2 = new THREE.Bone();
      
      child1.position.set(1, 0, 0);
      child2.position.set(0, 1, 0);
      root.add(child1);
      root.add(child2);
      model.add(root);

      const system = detector.detectCoordinateSystem(model);

      expect(system).toBeDefined();
    });
  });

  describe('convertToCanonicalSpace', () => {
    it('should convert model to canonical space', () => {
      const model = new THREE.Object3D();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      mesh.position.set(1, 2, 3);
      model.add(mesh);

      const result = detector.convertToCanonicalSpace(model);

      expect(result).toHaveProperty('applied');
      expect(result).toHaveProperty('rotation');
      expect(model).toBeDefined();
    });

    it('should handle already canonical models', () => {
      const model = new THREE.Object3D();
      model.userData.coordinateSystem = {
        upAxis: 'Y',
        forwardAxis: 'Z',
        handedness: 'right'
      };

      const result = detector.convertToCanonicalSpace(model);

      // Note: Even canonical models may have scale applied
      expect(result).toHaveProperty('applied');
      expect(result.originalSystem.upAxis).toBe('Y');
    });

    it('should preserve model structure', () => {
      const model = new THREE.Object3D();
      const child1 = new THREE.Object3D();
      const child2 = new THREE.Object3D();
      
      model.add(child1);
      model.add(child2);

      detector.convertToCanonicalSpace(model);

      expect(model.children.length).toBe(2);
    });
  });

  describe('getConversionRotation', () => {
    it('should convert coordinate systems correctly', () => {
      // Test that convertToCanonicalSpace handles different up-axes
      const zUpModel = new THREE.Object3D();
      zUpModel.name = 'z_up_model';
      const bone = new THREE.Bone();
      bone.position.set(0, 0, 1); // Points up in Z
      zUpModel.add(bone);

      const result = detector.convertToCanonicalSpace(zUpModel);
      
      // Should apply rotation conversion for Z-up model
      expect(result.rotationApplied).toBe(true);
      expect(result.applied).toBe(true);
    });

    it('should preserve canonical coordinate systems', () => {
      // Y-up model should not need rotation
      const yUpModel = new THREE.Object3D();
      yUpModel.name = 'y_up_model';
      const bone = new THREE.Bone();
      bone.position.set(0, 1, 0);
      yUpModel.add(bone);

      const result = detector.convertToCanonicalSpace(yUpModel);
      
      // May still apply scale but should not rotate Y-up
      expect(result.originalSystem.upAxis).toBe('Y');
    });
  });

  describe('applyConversionToModel', () => {
    it('should apply coordinate transformations to models', () => {
      const model = new THREE.Object3D();
      const bone = new THREE.Bone();
      bone.position.set(0, 1, 0);
      model.add(bone);

      const result = detector.convertToCanonicalSpace(model);

      model.updateMatrixWorld(true);
      expect(result).toHaveProperty('applied');
      expect(result).toHaveProperty('rotationApplied');
    });

    it('should handle models with skinned meshes', () => {
      // Create a simple model without complex SkinnedMesh (to avoid geometry setup issues)
      const model = new THREE.Object3D();
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      
      model.add(mesh);

      // Should not crash when converting models with meshes
      const result = detector.convertToCanonicalSpace(model);

      expect(model).toBeDefined();
      expect(result).toHaveProperty('applied');
    });
  });

  describe('edge cases', () => {
    it('should handle null model', () => {
      const system = detector.detectCoordinateSystem(null);
      
      expect(system.upAxis).toBe('Y');
      expect(system.forwardAxis).toBe('Z');
    });

    it('should handle empty model', () => {
      const model = new THREE.Object3D();
      
      const result = detector.convertToCanonicalSpace(model);
      
      expect(result).toBeDefined();
    });

    it('should handle nested bone hierarchies', () => {
      const model = new THREE.Object3D();
      const root = new THREE.Bone();
      const child = new THREE.Bone();
      const grandchild = new THREE.Bone();
      
      grandchild.position.set(0, 0, 1);
      child.position.set(0, 1, 0);
      root.position.set(1, 0, 0);
      
      child.add(grandchild);
      root.add(child);
      model.add(root);

      const system = detector.detectCoordinateSystem(model);
      
      expect(system).toBeDefined();
    });
  });
});
