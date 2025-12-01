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
    this.grid = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
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
    this.scene.add(model);
    
    // Center the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    
    // Optionally adjust camera to fit model
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5; // Add some padding
    
    this.camera.position.set(0, maxDim * 0.5, cameraZ);
    this.controls.target.set(0, size.y * 0.5, 0);
    this.controls.update();
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
  
  getCanvas() {
    return this.canvas;
  }
}
