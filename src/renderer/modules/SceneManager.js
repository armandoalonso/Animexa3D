import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.mixer = null;
    
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 3);
    
    // Setup controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 1, 0);
    this.controls.update();
    
    // Set background color
    this.scene.background = new THREE.Color(0x2c3e50);
    
    // Setup lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);
    
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 10, 7.5);
    this.scene.add(this.directionalLight);
    
    // Setup grid
    this.grid = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
    this.scene.add(this.grid);
    this.gridVisible = true;
    
    // Store current model
    this.currentModel = null;
    
    // Camera presets
    this.cameraPresets = {
      perspective: { position: new THREE.Vector3(0, 1.6, 3), target: new THREE.Vector3(0, 1, 0) },
      front: { position: new THREE.Vector3(0, 1.6, 3), target: new THREE.Vector3(0, 1.6, 0) },
      back: { position: new THREE.Vector3(0, 1.6, -3), target: new THREE.Vector3(0, 1.6, 0) },
      left: { position: new THREE.Vector3(-3, 1.6, 0), target: new THREE.Vector3(0, 1.6, 0) },
      right: { position: new THREE.Vector3(3, 1.6, 0), target: new THREE.Vector3(0, 1.6, 0) },
      top: { position: new THREE.Vector3(0, 5, 0), target: new THREE.Vector3(0, 0, 0) },
      bottom: { position: new THREE.Vector3(0, -5, 0), target: new THREE.Vector3(0, 0, 0) }
    };
  }
  
  startRenderLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      
      const delta = this.clock.getDelta();
      
      if (this.mixer) {
        this.mixer.update(delta);
      }
      
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }
  
  handleResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  setBackgroundColor(color) {
    this.scene.background = new THREE.Color(color);
  }
  
  updateLightPosition(x, y, z) {
    this.directionalLight.position.set(x, y, z);
  }
  
  updateDirectionalLightIntensity(value) {
    this.directionalLight.intensity = value;
  }
  
  updateAmbientLightIntensity(value) {
    this.ambientLight.intensity = value;
  }
  
  toggleGrid(visible) {
    this.grid.visible = visible;
    this.gridVisible = visible;
  }
  
  applyCameraPreset(presetName) {
    const preset = this.cameraPresets[presetName];
    if (!preset) return;
    
    this.camera.position.copy(preset.position);
    this.controls.target.copy(preset.target);
    this.controls.update();
  }
  
  clearModel() {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      
      // Dispose of geometries and materials
      this.currentModel.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      
      this.currentModel = null;
    }
    
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
  }
  
  addModel(model) {
    this.clearModel();
    this.currentModel = model;
    
    // Get bounding box before adding to scene
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    console.log('Model bounding box:', { size, center, maxDim });
    
    // Scale model to a standard size for consistent viewing
    // Target size: humanoid characters should be around 1.8 units tall
    const targetSize = 1.8;
    
    // Always normalize models to target size for consistency
    if (maxDim > 0.1) { // Avoid division by zero
      const scale = targetSize / maxDim;
      model.scale.set(scale, scale, scale);
      console.log(`Model scaled by ${scale.toFixed(4)}x (was ${maxDim.toFixed(2)} units, now ~${targetSize} units)`);
      
      // Recalculate after scaling
      box.setFromObject(model);
      size.copy(box.getSize(new THREE.Vector3()));
      center.copy(box.getCenter(new THREE.Vector3()));
    }
    
    this.scene.add(model);
    
    // Position model so its bottom sits on the grid (y=0)
    // First center horizontally (X and Z)
    model.position.x = -center.x;
    model.position.z = -center.z;
    // Then position bottom at grid level
    model.position.y = -box.min.y;
    
    // Adjust grid size based on model (use post-scaled dimensions)
    const gridSize = Math.max(10, Math.ceil(Math.max(size.x, size.z) * 3));
    this.scene.remove(this.grid);
    this.grid = new THREE.GridHelper(gridSize, gridSize, 0x888888, 0x444444);
    if (this.gridVisible) {
      this.scene.add(this.grid);
    }
    
    // Frame model in camera view
    this.frameModel();
  }
  
  /**
   * Adjust camera to frame the current model in view
   */
  frameModel() {
    if (!this.currentModel) return;
    
    const box = new THREE.Box3().setFromObject(this.currentModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Calculate distance needed to fit model in view
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    
    // Calculate required distance to fit the model
    const cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    
    // Add substantial padding (2.5x) for comfortable viewing
    const distance = cameraDistance * 2.5;
    
    // Position camera at an angle (45 degrees around, elevated)
    const angle = Math.PI / 4; // 45 degrees
    const cameraX = Math.sin(angle) * distance;
    const cameraZ = Math.cos(angle) * distance;
    const cameraY = size.y * 0.5 + distance * 0.3; // Elevated view
    
    this.camera.position.set(cameraX, cameraY, cameraZ);
    
    // Look at center of model
    this.controls.target.copy(center);
    this.controls.update();
    
    console.log('Camera framed model:', { 
      modelSize: size, 
      maxDim,
      distance: distance.toFixed(2),
      cameraPos: this.camera.position, 
      target: this.controls.target 
    });
  }
  
  createMixer(model) {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    this.mixer = new THREE.AnimationMixer(model);
    return this.mixer;
  }
  
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
  
  clearScene() {
    // Remove current model from scene
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      
      // Dispose of geometries and materials
      this.currentModel.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => {
                if (material.map) material.map.dispose();
                if (material.normalMap) material.normalMap.dispose();
                if (material.roughnessMap) material.roughnessMap.dispose();
                if (material.metalnessMap) material.metalnessMap.dispose();
                material.dispose();
              });
            } else {
              if (child.material.map) child.material.map.dispose();
              if (child.material.normalMap) child.material.normalMap.dispose();
              if (child.material.roughnessMap) child.material.roughnessMap.dispose();
              if (child.material.metalnessMap) child.material.metalnessMap.dispose();
              child.material.dispose();
            }
          }
        }
      });
      
      this.currentModel = null;
    }
    
    // Clear mixer
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    
    // Reset clock
    this.clock = new THREE.Clock();
  }
  
  /**
   * Rotate the current model around a specific axis
   * @param {string} axis - 'x', 'y', or 'z'
   * @param {number} degrees - rotation amount in degrees
   */
  rotateModel(axis, degrees) {
    if (!this.currentModel) {
      console.warn('No model loaded to rotate');
      return;
    }
    
    const radians = degrees * (Math.PI / 180);
    
    switch(axis.toLowerCase()) {
      case 'x':
        this.currentModel.rotateX(radians);
        break;
      case 'y':
        this.currentModel.rotateY(radians);
        break;
      case 'z':
        this.currentModel.rotateZ(radians);
        break;
      default:
        console.warn('Invalid axis:', axis);
        return;
    }
    
    console.log(`Rotated model ${degrees}° around ${axis.toUpperCase()} axis`);
    console.log('Current rotation:', {
      x: this.currentModel.rotation.x * (180 / Math.PI),
      y: this.currentModel.rotation.y * (180 / Math.PI),
      z: this.currentModel.rotation.z * (180 / Math.PI)
    });
  }
  
  /**
   * Reset model rotation to zero
   */
  resetModelRotation() {
    if (!this.currentModel) {
      console.warn('No model loaded to reset rotation');
      return;
    }
    
    this.currentModel.rotation.set(0, 0, 0);
    console.log('Model rotation reset to zero');
  }
}
