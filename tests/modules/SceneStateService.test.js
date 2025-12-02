import { describe, it, expect } from 'vitest';
import { SceneStateService } from '../../src/renderer/modules/core/SceneStateService.js';

describe('SceneStateService', () => {
  describe('getDefaultSettings', () => {
    it('should return default scene settings', () => {
      const defaults = SceneStateService.getDefaultSettings();

      expect(defaults).toHaveProperty('backgroundColor', 0x2c3e50);
      expect(defaults).toHaveProperty('gridVisible', true);
      expect(defaults).toHaveProperty('gridSize', 100);
      expect(defaults).toHaveProperty('ambientLightIntensity', 0.4);
      expect(defaults).toHaveProperty('directionalLightIntensity', 0.8);
      expect(defaults).toHaveProperty('cameraFov', 45);
    });

    it('should return immutable defaults', () => {
      const defaults1 = SceneStateService.getDefaultSettings();
      const defaults2 = SceneStateService.getDefaultSettings();

      expect(defaults1).toEqual(defaults2);
      expect(defaults1).not.toBe(defaults2);
    });
  });

  describe('captureSceneState', () => {
    it('should capture basic scene state', () => {
      const mockScene = {
        background: { getHex: () => 0x123456 }
      };

      const mockCamera = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.1, y: 0.2, z: 0.3 },
        fov: 45
      };

      const state = SceneStateService.captureSceneState({
        scene: mockScene,
        camera: mockCamera
      });

      expect(state.backgroundColor).toBe(0x123456);
      expect(state.cameraPosition).toEqual({ x: 1, y: 2, z: 3 });
      expect(state.cameraRotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
      expect(state.cameraFov).toBe(45);
      expect(state.timestamp).toBeDefined();
    });

    it('should capture ambient light settings', () => {
      const mockScene = { background: { getHex: () => 0x000000 } };
      const mockCamera = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, fov: 45 };
      const mockAmbientLight = {
        color: { getHex: () => 0xffffff },
        intensity: 0.5
      };

      const state = SceneStateService.captureSceneState({
        scene: mockScene,
        camera: mockCamera,
        ambientLight: mockAmbientLight
      });

      expect(state.ambientLightColor).toBe(0xffffff);
      expect(state.ambientLightIntensity).toBe(0.5);
    });

    it('should capture directional light settings', () => {
      const mockScene = { background: { getHex: () => 0x000000 } };
      const mockCamera = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, fov: 45 };
      const mockDirectionalLight = {
        color: { getHex: () => 0xffff00 },
        intensity: 0.8,
        position: { x: 5, y: 10, z: 7.5 }
      };

      const state = SceneStateService.captureSceneState({
        scene: mockScene,
        camera: mockCamera,
        directionalLight: mockDirectionalLight
      });

      expect(state.directionalLightColor).toBe(0xffff00);
      expect(state.directionalLightIntensity).toBe(0.8);
      expect(state.directionalLightPosition).toEqual({ x: 5, y: 10, z: 7.5 });
    });

    it('should capture controls settings', () => {
      const mockScene = { background: { getHex: () => 0x000000 } };
      const mockCamera = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, fov: 45 };
      const mockControls = {
        target: { x: 0, y: 1, z: 0 },
        enableDamping: true,
        dampingFactor: 0.05
      };

      const state = SceneStateService.captureSceneState({
        scene: mockScene,
        camera: mockCamera,
        controls: mockControls
      });

      expect(state.controlsTarget).toEqual({ x: 0, y: 1, z: 0 });
      expect(state.controlsDamping).toBe(true);
      expect(state.controlsDampingFactor).toBe(0.05);
    });

    it('should capture grid settings', () => {
      const mockScene = { background: { getHex: () => 0x000000 } };
      const mockCamera = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, fov: 45 };
      const mockGrid = {
        visible: true,
        geometry: {
          parameters: { size: 100, divisions: 50 }
        }
      };

      const state = SceneStateService.captureSceneState({
        scene: mockScene,
        camera: mockCamera,
        grid: mockGrid
      });

      expect(state.gridVisible).toBe(true);
      expect(state.gridSize).toBe(100);
      expect(state.gridDivisions).toBe(50);
    });

    it('should throw error if scene is missing', () => {
      expect(() => {
        SceneStateService.captureSceneState({ camera: {} });
      }).toThrow('Scene and camera are required');
    });

    it('should throw error if camera is missing', () => {
      expect(() => {
        SceneStateService.captureSceneState({ scene: {} });
      }).toThrow('Scene and camera are required');
    });
  });

  describe('validateSceneConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        backgroundColor: 0x123456,
        ambientLightIntensity: 0.5,
        gridSize: 50,
        cameraFov: 60
      };

      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object config', () => {
      const result = SceneStateService.validateSceneConfig(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    it('should reject invalid color values', () => {
      const config = { backgroundColor: -1 };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('backgroundColor'))).toBe(true);
    });

    it('should reject color values above 0xFFFFFF', () => {
      const config = { backgroundColor: 0xFFFFFF + 1 };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('backgroundColor'))).toBe(true);
    });

    it('should reject invalid intensity values', () => {
      const config = { ambientLightIntensity: -0.5 };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('ambientLightIntensity'))).toBe(true);
    });

    it('should reject intensity values above 10', () => {
      const config = { directionalLightIntensity: 11 };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('directionalLightIntensity'))).toBe(true);
    });

    it('should reject invalid grid size', () => {
      const config = { gridSize: -10 };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('gridSize'))).toBe(true);
    });

    it('should reject invalid grid divisions', () => {
      const config = { gridDivisions: 1001 };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('gridDivisions'))).toBe(true);
    });

    it('should reject invalid camera FOV', () => {
      const config = { cameraFov: 180 };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('cameraFov'))).toBe(true);
    });

    it('should reject invalid near/far relationship', () => {
      const config = { cameraNear: 10, cameraFar: 5 };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('cameraNear must be less than cameraFar'))).toBe(true);
    });

    it('should reject invalid position objects', () => {
      const config = { cameraPosition: { x: 1, y: 'invalid', z: 3 } };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('cameraPosition'))).toBe(true);
    });

    it('should reject infinite position values', () => {
      const config = { cameraPosition: { x: Infinity, y: 0, z: 0 } };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('finite'))).toBe(true);
    });

    it('should reject non-boolean flags', () => {
      const config = { gridVisible: 'yes' };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('gridVisible'))).toBe(true);
    });

    it('should reject invalid damping factor', () => {
      const config = { controlsDampingFactor: 1.5 };
      const result = SceneStateService.validateSceneConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('controlsDampingFactor'))).toBe(true);
    });
  });

  describe('mergeWithDefaults', () => {
    it('should merge partial config with defaults', () => {
      const partial = { backgroundColor: 0x111111 };
      const merged = SceneStateService.mergeWithDefaults(partial);

      expect(merged.backgroundColor).toBe(0x111111);
      expect(merged.gridSize).toBe(100); // From defaults
      expect(merged.ambientLightIntensity).toBe(0.4); // From defaults
    });

    it('should return defaults when no config provided', () => {
      const merged = SceneStateService.mergeWithDefaults();
      const defaults = SceneStateService.getDefaultSettings();

      expect(merged).toEqual(defaults);
    });
  });

  describe('createStateDiff', () => {
    it('should detect changed values', () => {
      const oldState = { backgroundColor: 0x111111, gridSize: 100 };
      const newState = { backgroundColor: 0x222222, gridSize: 100 };

      const diff = SceneStateService.createStateDiff(oldState, newState);

      expect(diff.backgroundColor).toBe(0x222222);
      expect(diff.gridSize).toBeUndefined();
    });

    it('should detect changed nested objects', () => {
      const oldState = { cameraPosition: { x: 0, y: 0, z: 0 } };
      const newState = { cameraPosition: { x: 1, y: 0, z: 0 } };

      const diff = SceneStateService.createStateDiff(oldState, newState);

      expect(diff.cameraPosition).toEqual({ x: 1, y: 0, z: 0 });
    });

    it('should return empty object when no changes', () => {
      const state = { backgroundColor: 0x111111, gridSize: 100 };
      const diff = SceneStateService.createStateDiff(state, state);

      expect(Object.keys(diff)).toHaveLength(0);
    });
  });

  describe('isCompleteState', () => {
    it('should return true for complete state', () => {
      const state = { cameraPosition: { x: 0, y: 0, z: 0 }, cameraFov: 45 };
      expect(SceneStateService.isCompleteState(state)).toBe(true);
    });

    it('should return false for incomplete state', () => {
      const state = { cameraPosition: { x: 0, y: 0, z: 0 } };
      expect(SceneStateService.isCompleteState(state)).toBe(false);
    });

    it('should return false for null state', () => {
      expect(SceneStateService.isCompleteState(null)).toBe(false);
    });
  });

  describe('sanitizeState', () => {
    it('should replace infinite numeric values with defaults', () => {
      const state = { backgroundColor: Infinity, ambientLightIntensity: NaN };
      const sanitized = SceneStateService.sanitizeState(state);

      expect(isFinite(sanitized.backgroundColor)).toBe(true);
      expect(isFinite(sanitized.ambientLightIntensity)).toBe(true);
    });

    it('should sanitize position objects', () => {
      const state = {
        cameraPosition: { x: Infinity, y: 0, z: -Infinity }
      };
      const sanitized = SceneStateService.sanitizeState(state);

      expect(sanitized.cameraPosition.x).toBe(0);
      expect(sanitized.cameraPosition.y).toBe(0);
      expect(sanitized.cameraPosition.z).toBe(0);
    });

    it('should preserve valid values', () => {
      const state = {
        backgroundColor: 0x123456,
        ambientLightIntensity: 0.5,
        cameraPosition: { x: 1, y: 2, z: 3 }
      };
      const sanitized = SceneStateService.sanitizeState(state);

      expect(sanitized).toEqual(state);
    });
  });
});
