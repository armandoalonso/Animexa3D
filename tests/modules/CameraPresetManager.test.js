import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CameraPresetManager } from '../../src/renderer/modules/core/CameraPresetManager.js';

/**
 * Mock StorageService for testing
 */
class MockStorageService {
  constructor() {
    this.data = {};
  }

  save(key, value) {
    this.data[key] = JSON.parse(JSON.stringify(value)); // Deep clone
    return true;
  }

  load(key, defaultValue = null) {
    if (key in this.data) {
      return JSON.parse(JSON.stringify(this.data[key])); // Deep clone
    }
    return defaultValue;
  }

  remove(key) {
    delete this.data[key];
    return true;
  }

  clear() {
    this.data = {};
    return true;
  }

  has(key) {
    return key in this.data;
  }
}

/**
 * Mock SceneManager for testing
 */
class MockSceneManager {
  constructor() {
    this.camera = {
      position: { 
        x: 0, 
        y: 5, 
        z: 10,
        set: function(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        }
      }
    };
    this.controls = {
      target: { 
        x: 0, 
        y: 0, 
        z: 0,
        set: function(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        }
      },
      update: vi.fn()
    };
  }

  getCamera() {
    return this.camera;
  }
}

describe('CameraPresetManager', () => {
  let mockSceneManager;
  let mockStorage;
  let presetManager;

  beforeEach(() => {
    mockSceneManager = new MockSceneManager();
    mockStorage = new MockStorageService();
    presetManager = new CameraPresetManager(mockSceneManager, mockStorage);
  });

  describe('Constructor', () => {
    it('should initialize with empty presets when storage is empty', () => {
      expect(presetManager.getAllPresets()).toEqual({});
      expect(presetManager.getPresetNames()).toEqual([]);
    });

    it('should load existing presets from storage', () => {
      const existingPresets = {
        'Front View': {
          name: 'Front View',
          position: { x: 0, y: 0, z: 15 },
          target: { x: 0, y: 0, z: 0 }
        }
      };
      mockStorage.save('camera_presets', existingPresets);

      const manager = new CameraPresetManager(mockSceneManager, mockStorage);
      
      expect(manager.getPresetNames()).toEqual(['Front View']);
    });

    it('should create StorageService if none provided', () => {
      // This would use real localStorage in a browser environment
      const manager = new CameraPresetManager(mockSceneManager);
      expect(manager.storageService).toBeDefined();
    });
  });

  describe('getCurrentCameraState()', () => {
    it('should capture current camera position and target', () => {
      mockSceneManager.camera.position.x = 10;
      mockSceneManager.camera.position.y = 20;
      mockSceneManager.camera.position.z = 30;
      mockSceneManager.controls.target.x = 1;
      mockSceneManager.controls.target.y = 2;
      mockSceneManager.controls.target.z = 3;

      const state = presetManager.getCurrentCameraState();

      expect(state.position).toEqual({ x: 10, y: 20, z: 30 });
      expect(state.target).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should return a copy of the state (not references)', () => {
      const state = presetManager.getCurrentCameraState();
      
      state.position.x = 999;
      
      expect(mockSceneManager.camera.position.x).not.toBe(999);
    });
  });

  describe('saveCurrentView()', () => {
    it('should save a new preset', () => {
      mockSceneManager.camera.position.x = 5;
      mockSceneManager.camera.position.y = 10;
      mockSceneManager.camera.position.z = 15;
      mockSceneManager.controls.target.x = 0;
      mockSceneManager.controls.target.y = 0;
      mockSceneManager.controls.target.z = 0;

      const result = presetManager.saveCurrentView('My View');

      expect(result).toBe(true);
      expect(presetManager.hasPreset('My View')).toBe(true);
    });

    it('should trim whitespace from preset name', () => {
      const result = presetManager.saveCurrentView('  Padded Name  ');

      expect(result).toBe(true);
      expect(presetManager.hasPreset('Padded Name')).toBe(true);
      expect(presetManager.hasPreset('  Padded Name  ')).toBe(false);
    });

    it('should reject empty name', () => {
      const result = presetManager.saveCurrentView('');
      expect(result).toBe(false);
    });

    it('should reject whitespace-only name', () => {
      const result = presetManager.saveCurrentView('   ');
      expect(result).toBe(false);
    });

    it('should overwrite existing preset', () => {
      mockSceneManager.camera.position.x = 1;
      mockSceneManager.camera.position.y = 1;
      mockSceneManager.camera.position.z = 1;
      presetManager.saveCurrentView('View');

      mockSceneManager.camera.position.x = 2;
      mockSceneManager.camera.position.y = 2;
      mockSceneManager.camera.position.z = 2;
      const result = presetManager.saveCurrentView('View');

      expect(result).toBe(true);
      const preset = presetManager.getAllPresets()['View'];
      expect(preset.position.x).toBe(2);
    });

    it('should persist to storage', () => {
      presetManager.saveCurrentView('Test View');

      const stored = mockStorage.load('camera_presets');
      expect(stored['Test View']).toBeDefined();
    });

    it('should include timestamp', () => {
      const beforeSave = new Date().toISOString();
      presetManager.saveCurrentView('Timed View');
      const afterSave = new Date().toISOString();

      const preset = presetManager.getAllPresets()['Timed View'];
      
      expect(preset.createdAt).toBeDefined();
      expect(preset.createdAt >= beforeSave).toBe(true);
      expect(preset.createdAt <= afterSave).toBe(true);
    });
  });

  describe('loadPreset()', () => {
    beforeEach(() => {
      // Save a test preset - Update values using set() or direct property assignment
      mockSceneManager.camera.position.x = 10;
      mockSceneManager.camera.position.y = 20;
      mockSceneManager.camera.position.z = 30;
      mockSceneManager.controls.target.x = 5;
      mockSceneManager.controls.target.y = 10;
      mockSceneManager.controls.target.z = 15;
      presetManager.saveCurrentView('Test Preset');

      // Reset camera to different position - Update values, don't replace object
      mockSceneManager.camera.position.x = 0;
      mockSceneManager.camera.position.y = 0;
      mockSceneManager.camera.position.z = 0;
      mockSceneManager.controls.target.x = 0;
      mockSceneManager.controls.target.y = 0;
      mockSceneManager.controls.target.z = 0;
    });

    it('should load and apply a preset', () => {
      const result = presetManager.loadPreset('Test Preset');

      expect(result).toBe(true);
      expect(mockSceneManager.camera.position.x).toBe(10);
      expect(mockSceneManager.camera.position.y).toBe(20);
      expect(mockSceneManager.camera.position.z).toBe(30);
      expect(mockSceneManager.controls.target.x).toBe(5);
      expect(mockSceneManager.controls.target.y).toBe(10);
      expect(mockSceneManager.controls.target.z).toBe(15);
    });

    it('should update controls after loading', () => {
      presetManager.loadPreset('Test Preset');

      expect(mockSceneManager.controls.update).toHaveBeenCalled();
    });

    it('should return false for non-existent preset', () => {
      const result = presetManager.loadPreset('Non Existent');

      expect(result).toBe(false);
    });

    it('should not modify camera if preset does not exist', () => {
      mockSceneManager.camera.position.x = 99;
      mockSceneManager.camera.position.y = 99;
      mockSceneManager.camera.position.z = 99;
      
      presetManager.loadPreset('Non Existent');

      expect(mockSceneManager.camera.position.x).toBe(99);
    });
  });

  describe('deletePreset()', () => {
    beforeEach(() => {
      presetManager.saveCurrentView('Preset to Delete');
    });

    it('should delete an existing preset', () => {
      expect(presetManager.hasPreset('Preset to Delete')).toBe(true);

      const result = presetManager.deletePreset('Preset to Delete');

      expect(result).toBe(true);
      expect(presetManager.hasPreset('Preset to Delete')).toBe(false);
    });

    it('should persist deletion to storage', () => {
      presetManager.deletePreset('Preset to Delete');

      const stored = mockStorage.load('camera_presets');
      expect(stored['Preset to Delete']).toBeUndefined();
    });

    it('should return false for non-existent preset', () => {
      const result = presetManager.deletePreset('Non Existent');

      expect(result).toBe(false);
    });
  });

  describe('getPresetNames()', () => {
    it('should return empty array when no presets exist', () => {
      expect(presetManager.getPresetNames()).toEqual([]);
    });

    it('should return all preset names', () => {
      presetManager.saveCurrentView('View A');
      presetManager.saveCurrentView('View B');
      presetManager.saveCurrentView('View C');

      const names = presetManager.getPresetNames();

      expect(names).toHaveLength(3);
      expect(names).toContain('View A');
      expect(names).toContain('View B');
      expect(names).toContain('View C');
    });

    it('should return sorted names', () => {
      presetManager.saveCurrentView('Zebra');
      presetManager.saveCurrentView('Apple');
      presetManager.saveCurrentView('Mango');

      const names = presetManager.getPresetNames();

      expect(names).toEqual(['Apple', 'Mango', 'Zebra']);
    });
  });

  describe('getAllPresets()', () => {
    it('should return all preset objects', () => {
      presetManager.saveCurrentView('Preset 1');
      presetManager.saveCurrentView('Preset 2');

      const presets = presetManager.getAllPresets();

      expect(Object.keys(presets)).toHaveLength(2);
      expect(presets['Preset 1']).toBeDefined();
      expect(presets['Preset 2']).toBeDefined();
    });
  });

  describe('hasPreset()', () => {
    it('should return true for existing preset', () => {
      presetManager.saveCurrentView('Existing');

      expect(presetManager.hasPreset('Existing')).toBe(true);
    });

    it('should return false for non-existent preset', () => {
      expect(presetManager.hasPreset('Non Existent')).toBe(false);
    });
  });

  describe('clearAllPresets()', () => {
    beforeEach(() => {
      presetManager.saveCurrentView('Preset 1');
      presetManager.saveCurrentView('Preset 2');
      presetManager.saveCurrentView('Preset 3');
    });

    it('should clear all presets', () => {
      presetManager.clearAllPresets();

      expect(presetManager.getPresetNames()).toEqual([]);
      expect(presetManager.getAllPresets()).toEqual({});
    });

    it('should persist clearing to storage', () => {
      presetManager.clearAllPresets();

      const stored = mockStorage.load('camera_presets');
      expect(stored).toEqual({});
    });
  });

  describe('exportPresetsJSON()', () => {
    it('should export presets as JSON string', () => {
      presetManager.saveCurrentView('Export Test');

      const json = presetManager.exportPresetsJSON();

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed['Export Test']).toBeDefined();
    });

    it('should export formatted JSON', () => {
      presetManager.saveCurrentView('Formatted');

      const json = presetManager.exportPresetsJSON();

      // Should have indentation (formatted)
      expect(json.includes('\n')).toBe(true);
    });
  });

  describe('importPresetsJSON()', () => {
    it('should import presets from JSON string', () => {
      const jsonData = JSON.stringify({
        'Imported View': {
          name: 'Imported View',
          position: { x: 1, y: 2, z: 3 },
          target: { x: 0, y: 0, z: 0 }
        }
      });

      const result = presetManager.importPresetsJSON(jsonData);

      expect(result).toBe(true);
      expect(presetManager.hasPreset('Imported View')).toBe(true);
    });

    it('should replace existing presets by default', () => {
      presetManager.saveCurrentView('Old Preset');

      const jsonData = JSON.stringify({
        'New Preset': {
          name: 'New Preset',
          position: { x: 1, y: 1, z: 1 },
          target: { x: 0, y: 0, z: 0 }
        }
      });

      presetManager.importPresetsJSON(jsonData, false);

      expect(presetManager.hasPreset('Old Preset')).toBe(false);
      expect(presetManager.hasPreset('New Preset')).toBe(true);
    });

    it('should merge with existing presets when merge is true', () => {
      presetManager.saveCurrentView('Old Preset');

      const jsonData = JSON.stringify({
        'New Preset': {
          name: 'New Preset',
          position: { x: 1, y: 1, z: 1 },
          target: { x: 0, y: 0, z: 0 }
        }
      });

      presetManager.importPresetsJSON(jsonData, true);

      expect(presetManager.hasPreset('Old Preset')).toBe(true);
      expect(presetManager.hasPreset('New Preset')).toBe(true);
    });

    it('should persist imported presets to storage', () => {
      const jsonData = JSON.stringify({
        'Imported': {
          name: 'Imported',
          position: { x: 1, y: 1, z: 1 },
          target: { x: 0, y: 0, z: 0 }
        }
      });

      presetManager.importPresetsJSON(jsonData);

      const stored = mockStorage.load('camera_presets');
      expect(stored['Imported']).toBeDefined();
    });

    it('should return false for invalid JSON', () => {
      const result = presetManager.importPresetsJSON('not valid json {{{');

      expect(result).toBe(false);
    });

    it('should not modify existing presets on import error', () => {
      presetManager.saveCurrentView('Safe Preset');

      presetManager.importPresetsJSON('invalid json');

      expect(presetManager.hasPreset('Safe Preset')).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete preset lifecycle', () => {
      // Save multiple presets
      mockSceneManager.camera.position.x = 1;
      mockSceneManager.camera.position.y = 1;
      mockSceneManager.camera.position.z = 1;
      presetManager.saveCurrentView('View 1');

      mockSceneManager.camera.position.x = 2;
      mockSceneManager.camera.position.y = 2;
      mockSceneManager.camera.position.z = 2;
      presetManager.saveCurrentView('View 2');

      // Verify they exist
      expect(presetManager.getPresetNames()).toHaveLength(2);

      // Load one
      presetManager.loadPreset('View 1');
      expect(mockSceneManager.camera.position.x).toBe(1);

      // Delete one
      presetManager.deletePreset('View 2');
      expect(presetManager.getPresetNames()).toHaveLength(1);

      // Export and import
      const exported = presetManager.exportPresetsJSON();
      presetManager.clearAllPresets();
      presetManager.importPresetsJSON(exported);

      expect(presetManager.hasPreset('View 1')).toBe(true);
    });

    it('should maintain preset integrity across operations', () => {
      // Save a preset
      mockSceneManager.camera.position.x = 10;
      mockSceneManager.camera.position.y = 20;
      mockSceneManager.camera.position.z = 30;
      mockSceneManager.controls.target.x = 5;
      mockSceneManager.controls.target.y = 10;
      mockSceneManager.controls.target.z = 15;
      presetManager.saveCurrentView('Stable View');

      // Modify camera
      mockSceneManager.camera.position.x = 0;
      mockSceneManager.camera.position.y = 0;
      mockSceneManager.camera.position.z = 0;

      // Save another preset
      presetManager.saveCurrentView('Other View');

      // Load original preset
      presetManager.loadPreset('Stable View');

      // Verify original values unchanged
      expect(mockSceneManager.camera.position.x).toBe(10);
      expect(mockSceneManager.camera.position.y).toBe(20);
      expect(mockSceneManager.controls.target.x).toBe(5);
    });
  });
});
