import * as THREE from 'three';
import { SceneStateService } from './SceneStateService.js';
import { ModelPositioningService } from './ModelPositioningService.js';
import { CameraCalculationService } from './CameraCalculationService.js';
import { SceneRenderingService } from './SceneRenderingService.js';

/**
 * SceneManager - Thin orchestrator for 3D scene management
 * Uses service classes for all business logic
 */
export class SceneManager {
  constructor() {
    // Get canvas element
    this.canvas = document.getElementById('webgl-canvas');
    
    // Get default settings from service
    const defaults = SceneStateService.getDefaultSettings();
    
    // Initialize Three.js components using services
    this.renderer = SceneRenderingService.initializeRenderer(this.canvas);
    
    this.scene = SceneRenderingService.createScene({
      backgroundColor: defaults.backgroundColor
    });
    
    const aspectRatio = CameraCalculationService.calculateAspectRatio(
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
    
    this.camera = SceneRenderingService.createCamera({
      fov: defaults.cameraFov,
      near: defaults.cameraNear,
      far: defaults.cameraFar,
      position: defaults.cameraPosition
    }, aspectRatio);
    
    this.controls = SceneRenderingService.createControls(
      this.camera,
      this.renderer.domElement,
      {
        enableDamping: defaults.controlsDamping,
        dampingFactor: defaults.controlsDampingFactor,
        target: defaults.cameraTarget
      }
    );
    
    // Setup lighting using service
    const lights = SceneRenderingService.setupLights(this.scene, {
      ambientLightColor: defaults.ambientLightColor,
      ambientLightIntensity: defaults.ambientLightIntensity,
      directionalLightColor: defaults.directionalLightColor,
      directionalLightIntensity: defaults.directionalLightIntensity,
      directionalLightPosition: defaults.directionalLightPosition
    });
    
    this.ambientLight = lights.ambientLight;
    this.directionalLight = lights.directionalLight;
    
    // Setup grid
    this.grid = SceneRenderingService.createGrid({
      size: defaults.gridSize,
      divisions: defaults.gridDivisions,
      color1: defaults.gridColor1,
      color2: defaults.gridColor2,
      visible: defaults.gridVisible
    });
    this.scene.add(this.grid);
    this.gridVisible = defaults.gridVisible;
    
    // Animation and model state
    this.clock = new THREE.Clock();
    this.mixer = null;
    this.currentModel = null;
    this.originGizmo = null;
    
    // Store camera presets from service
    this.cameraPresets = CameraCalculationService.getCameraPresets();
  }
  
  /**
   * Start the render loop using service
   */
  startRenderLoop() {
    this.stopRenderLoop = SceneRenderingService.startRenderLoop({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      getMixer: () => this.mixer, // Pass getter function to access current mixer
      controls: this.controls,
      clock: this.clock
    });
  }
  
  /**
   * Handle window resize using service
   */
  handleResize() {
    SceneRenderingService.handleResize(this.renderer, this.camera, this.canvas);
  }
  
  /**
   * Set background color using service
   */
  setBackgroundColor(color) {
    // Convert string hex (#RRGGBB) to numeric hex (0xRRGGBB) if needed
    let numericColor = color;
    if (typeof color === 'string') {
      // Remove # if present and convert to number
      numericColor = parseInt(color.replace('#', ''), 16);
    }
    SceneRenderingService.updateBackgroundColor(this.scene, numericColor);
  }
  
  /**
   * Update light position using service
   */
  updateLightPosition(x, y, z) {
    SceneRenderingService.updateLightPosition(this.directionalLight, { x, y, z });
  }
  
  /**
   * Update directional light intensity using service
   */
  updateDirectionalLightIntensity(value) {
    SceneRenderingService.updateLightIntensity(this.directionalLight, value);
  }
  
  /**
   * Update ambient light intensity using service
   */
  updateAmbientLightIntensity(value) {
    SceneRenderingService.updateLightIntensity(this.ambientLight, value);
  }
  
  /**
   * Toggle grid visibility
   */
  toggleGrid(visible) {
    this.grid.visible = visible;
    this.gridVisible = visible;
  }
  
  /**
   * Apply camera preset
   */
  applyCameraPreset(presetName) {
    const preset = this.cameraPresets[presetName];
    if (!preset) return;
    
    // Convert service format to Three.js objects
    this.camera.position.set(preset.position.x, preset.position.y, preset.position.z);
    this.controls.target.set(preset.target.x, preset.target.y, preset.target.z);
    this.controls.update();
  }

  /**
   * Apply camera state (position and target)
   * @param {Object} state - Camera state with position and target
   */
  applyCameraState(state) {
    if (!state || !state.position || !state.target) {
      console.error('Invalid camera state:', state);
      return;
    }

    this.camera.position.set(state.position.x, state.position.y, state.position.z);
    this.controls.target.set(state.target.x, state.target.y, state.target.z);
    this.controls.update();
  }

  /**
   * Get current camera state
   * @returns {Object} Current camera position and target
   */
  getCurrentCameraState() {
    return {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      target: {
        x: this.controls.target.x,
        y: this.controls.target.y,
        z: this.controls.target.z
      }
    };
  }
  
  /**
   * Clear model from scene using service
   */
  clearModel() {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      SceneRenderingService.disposeModel(this.currentModel);
      this.currentModel = null;
    }
    
    // Remove origin gizmo
    if (this.originGizmo) {
      this.scene.remove(this.originGizmo);
      this.originGizmo.dispose();
      this.originGizmo = null;
    }
    
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
  }
  
  /**
   * Add model to scene using positioning service
   */
  addModel(model, options = {}) {
    this.clearModel();
    this.currentModel = model;
    
    // Store rotation and position if preserve options are set
    const savedRotation = options.preserveRotation ? model.rotation.clone() : null;
    const savedPosition = options.preservePosition ? model.position.clone() : null;
    
    // Add to scene first
    this.scene.add(model);
    
    // Restore rotation if it was preserved
    if (savedRotation) {
      model.rotation.copy(savedRotation);
      console.log('Restored rotation:', model.rotation);
    }
    
    // Update world matrix after adding to scene
    model.updateMatrixWorld(true);
    
    // Get bounding box using service
    const box = SceneRenderingService.calculateBoundingBox(model);
    const { center, size } = SceneRenderingService.getBoundingBoxInfo(box);
    
    console.log('Model in canonical space:', { 
      size: { x: size.x, y: size.y, z: size.z },
      center: { x: center.x, y: center.y, z: center.z }
    });
    
    if (savedRotation) {
      console.log('Preserving rotation during addModel:', savedRotation);
    }
    if (savedPosition) {
      console.log('Preserving position during addModel:', savedPosition);
    }
    
    // Only recalculate position if not preserving it
    if (!savedPosition) {
      // Calculate position using service
      const position = ModelPositioningService.calculateModelPosition({
        min: { x: box.min.x, y: box.min.y, z: box.min.z },
        max: { x: box.max.x, y: box.max.y, z: box.max.z }
      });
      
      model.position.set(position.x, position.y, position.z);
      console.log('Model positioned:', model.position);
    } else {
      // Restore saved position
      model.position.copy(savedPosition);
      console.log('Restored position:', model.position);
    }
    
    // Calculate grid size using service
    const gridSize = ModelPositioningService.calculateGridSize(
      { x: size.x, y: size.y, z: size.z },
      3, // multiplier
      10  // min size
    );
    
    // Update grid
    this.scene.remove(this.grid);
    this.grid = SceneRenderingService.createGrid({
      size: gridSize,
      divisions: gridSize,
      visible: this.gridVisible
    });
    this.scene.add(this.grid);
    
    // Add origin gizmo
    this.updateOriginGizmo();
    
    // Frame model in camera view
    this.frameModel();
  }
  
  /**
   * Update or create origin gizmo to show model's pivot point
   */
  updateOriginGizmo() {
    if (!this.currentModel) return;
    
    // Remove existing gizmo
    if (this.originGizmo) {
      this.scene.remove(this.originGizmo);
      this.originGizmo.dispose();
    }
    
    // Create axes helper at model's position using service
    this.originGizmo = SceneRenderingService.createAxesHelper(
      0.5,
      {
        x: this.currentModel.position.x,
        y: this.currentModel.position.y,
        z: this.currentModel.position.z
      },
      {
        x: this.currentModel.rotation.x,
        y: this.currentModel.rotation.y,
        z: this.currentModel.rotation.z
      }
    );
    
    this.scene.add(this.originGizmo);
    console.log('Origin gizmo added at:', this.currentModel.position);
  }
  
  /**
   * Adjust camera to frame the current model in view using services
   */
  frameModel() {
    if (!this.currentModel) return;
    
    // Get bounding box using service
    const box = SceneRenderingService.calculateBoundingBox(this.currentModel);
    const { center, size } = SceneRenderingService.getBoundingBoxInfo(box);
    
    // Calculate distance using camera service
    const distance = CameraCalculationService.calculateFramingDistance(
      { x: size.x, y: size.y, z: size.z },
      this.camera.fov,
      2.5 // padding factor
    );
    
    // Calculate camera position using service
    const cameraPosition = CameraCalculationService.calculateCameraPosition(
      distance,
      Math.PI / 4, // 45 degrees horizontal
      0.3,         // vertical angle multiplier
      { y: size.y }
    );
    
    this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    
    // Calculate camera target using service
    const target = CameraCalculationService.calculateCameraTarget({
      x: center.x,
      y: center.y,
      z: center.z
    });
    
    this.controls.target.set(target.x, target.y, target.z);
    this.controls.update();
    
    console.log('Camera framed model:', { 
      modelSize: { x: size.x, y: size.y, z: size.z },
      maxDim: ModelPositioningService.getMaxDimension({ x: size.x, y: size.y, z: size.z }),
      distance: distance.toFixed(2),
      cameraPos: this.camera.position, 
      target: this.controls.target 
    });
  }
  
  /**
   * Create animation mixer using service
   */
  createMixer(model) {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    this.mixer = SceneRenderingService.createAnimationMixer(model);
    return this.mixer;
  }
  
  /**
   * Getters for scene components
   */
  getScene() {
    return this.scene;
  }
  
  getCamera() {
    return this.camera;
  }
  
  getRenderer() {
    return this.renderer;
  }
  
  getMixer() {
    return this.mixer;
  }
  
  getModel() {
    return this.currentModel;
  }
  
  getCanvas() {
    return this.canvas;
  }
  
  /**
   * Clear all objects from the scene
   */
  clearScene() {
    // Remove current model from scene
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      SceneRenderingService.disposeModel(this.currentModel);
      this.currentModel = null;
    }
    
    // Clear mixer
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    
    // Reset clock
    this.clock = new THREE.Clock();
    
    // Reset background color to default
    const defaults = SceneStateService.getDefaultSettings();
    this.setBackgroundColor(defaults.backgroundColor);
  }
  
  /**
   * Capture current scene state
   * @returns {Object} Current scene state
   */
  captureState() {
    return SceneStateService.captureSceneState({
      scene: this.scene,
      camera: this.camera,
      ambientLight: this.ambientLight,
      directionalLight: this.directionalLight,
      grid: this.grid,
      controls: this.controls
    });
  }
}
