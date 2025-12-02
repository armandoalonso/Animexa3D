import * as THREE from 'three';
import { StorageService } from './StorageService.js';

/**
 * CameraPresetManager - Handles saving, loading, and managing camera view presets
 * Persists presets across sessions using StorageService (injectable for testing)
 */
export class CameraPresetManager {
  constructor(sceneManager, storageService = null) {
    this.sceneManager = sceneManager;
    this.storageService = storageService || new StorageService();
    this.STORAGE_KEY = 'camera_presets';
    this.presets = this.loadPresetsFromStorage();
  }

  /**
   * Get current camera position and target
   */
  getCurrentCameraState() {
    const camera = this.sceneManager.getCamera();
    const controls = this.sceneManager.controls;

    return {
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      target: {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z
      }
    };
  }

  /**
   * Save current camera view as a new preset
   * @param {string} name - Name for the preset
   * @returns {boolean} Success status
   */
  saveCurrentView(name) {
    if (!name || name.trim() === '') {
      return false;
    }

    const trimmedName = name.trim();

    // Check if preset with this name already exists
    // Note: Overwrite confirmation should be handled by the UI layer
    const alreadyExists = this.presets[trimmedName];

    // Get current camera state
    const state = this.getCurrentCameraState();

    // Save preset
    this.presets[trimmedName] = {
      name: trimmedName,
      position: state.position,
      target: state.target,
      createdAt: new Date().toISOString(),
      overwritten: alreadyExists
    };

    // Persist to localStorage
    this.savePresetsToStorage();

    return true;
  }

  /**
   * Load a preset and apply it to the camera
   * @param {string} name - Name of the preset to load
   * @returns {boolean} Success status
   */
  loadPreset(name) {
    const preset = this.presets[name];

    if (!preset) {
      return false;
    }

    // Apply camera position and target
    const camera = this.sceneManager.getCamera();
    const controls = this.sceneManager.controls;

    camera.position.set(
      preset.position.x,
      preset.position.y,
      preset.position.z
    );

    controls.target.set(
      preset.target.x,
      preset.target.y,
      preset.target.z
    );

    controls.update();

    return true;
  }

  /**
   * Delete a preset
   * @param {string} name - Name of the preset to delete
   * @returns {boolean} Success status
   */
  deletePreset(name) {
    if (!this.presets[name]) {
      return false;
    }

    delete this.presets[name];
    this.savePresetsToStorage();

    return true;
  }

  /**
   * Get all preset names
   * @returns {string[]} Array of preset names
   */
  getPresetNames() {
    return Object.keys(this.presets).sort();
  }

  /**
   * Get all presets
   * @returns {Object} All presets
   */
  getAllPresets() {
    return this.presets;
  }

  /**
   * Check if a preset exists
   * @param {string} name - Name to check
   * @returns {boolean} Whether preset exists
   */
  hasPreset(name) {
    return !!this.presets[name];
  }

  /**
   * Save presets to storage
   */
  savePresetsToStorage() {
    return this.storageService.save(this.STORAGE_KEY, this.presets);
  }

  /**
   * Load presets from storage
   * @returns {Object} Loaded presets or empty object
   */
  loadPresetsFromStorage() {
    return this.storageService.load(this.STORAGE_KEY, {});
  }

  /**
   * Clear all presets
   */
  clearAllPresets() {
    this.presets = {};
    this.savePresetsToStorage();
  }

  /**
   * Export presets as JSON string
   * @returns {string} JSON representation of presets
   */
  exportPresetsJSON() {
    return JSON.stringify(this.presets, null, 2);
  }

  /**
   * Import presets from JSON string
   * @param {string} jsonString - JSON string to import
   * @param {boolean} merge - Whether to merge with existing presets or replace
   * @returns {boolean} Success status
   */
  importPresetsJSON(jsonString, merge = false) {
    try {
      const imported = JSON.parse(jsonString);

      if (merge) {
        this.presets = { ...this.presets, ...imported };
      } else {
        this.presets = imported;
      }

      this.savePresetsToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import camera presets:', error);
      return false;
    }
  }
}
