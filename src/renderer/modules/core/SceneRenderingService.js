import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * SceneRenderingService - Three.js wrapper for scene initialization and rendering
 * Handles Three.js specific operations like renderer, scene, lights, and render loop
 */
export class SceneRenderingService {
  /**
   * Initialize WebGL renderer with given canvas and options
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} options - Renderer options
   * @returns {THREE.WebGLRenderer} Initialized renderer
   */
  static initializeRenderer(canvas, options = {}) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Valid canvas element is required');
    }

    const defaultOptions = {
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true
    };

    const rendererOptions = { canvas, ...defaultOptions, ...options };
    const renderer = new THREE.WebGLRenderer(rendererOptions);

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    return renderer;
  }

  /**
   * Create and configure a Three.js scene
   * @param {Object} config - Scene configuration
   * @returns {THREE.Scene} Configured scene
   */
  static createScene(config = {}) {
    const scene = new THREE.Scene();

    // Set background color if provided
    if (config.backgroundColor !== undefined) {
      scene.background = new THREE.Color(config.backgroundColor);
    }

    return scene;
  }

  /**
   * Create and configure camera
   * @param {Object} config - Camera configuration
   * @param {number} aspectRatio - Viewport aspect ratio
   * @returns {THREE.PerspectiveCamera} Configured camera
   */
  static createCamera(config = {}, aspectRatio) {
    const {
      fov = 45,
      near = 0.1,
      far = 1000,
      position = { x: 0, y: 1.6, z: 3 }
    } = config;

    const camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
    camera.position.set(position.x, position.y, position.z);

    return camera;
  }

  /**
   * Setup lights in the scene
   * @param {THREE.Scene} scene - Scene to add lights to
   * @param {Object} config - Light configuration
   * @returns {Object} Object containing light references
   */
  static setupLights(scene, config = {}) {
    if (!scene || !(scene instanceof THREE.Scene)) {
      throw new Error('Valid Three.js scene is required');
    }

    const {
      ambientLightColor = 0xffffff,
      ambientLightIntensity = 0.4,
      directionalLightColor = 0xffffff,
      directionalLightIntensity = 0.8,
      directionalLightPosition = { x: 5, y: 10, z: 7.5 }
    } = config;

    // Create ambient light
    const ambientLight = new THREE.AmbientLight(ambientLightColor, ambientLightIntensity);
    scene.add(ambientLight);

    // Create directional light
    const directionalLight = new THREE.DirectionalLight(directionalLightColor, directionalLightIntensity);
    directionalLight.position.set(
      directionalLightPosition.x,
      directionalLightPosition.y,
      directionalLightPosition.z
    );
    scene.add(directionalLight);

    return {
      ambientLight,
      directionalLight
    };
  }

  /**
   * Create and configure orbit controls
   * @param {THREE.Camera} camera - Camera to control
   * @param {HTMLElement} domElement - DOM element for event listeners
   * @param {Object} config - Controls configuration
   * @returns {OrbitControls} Configured controls
   */
  static createControls(camera, domElement, config = {}) {
    if (!camera) {
      throw new Error('Camera is required');
    }

    if (!domElement) {
      throw new Error('DOM element is required');
    }

    const {
      enableDamping = true,
      dampingFactor = 0.05,
      target = { x: 0, y: 1, z: 0 }
    } = config;

    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = enableDamping;
    controls.dampingFactor = dampingFactor;
    controls.target.set(target.x, target.y, target.z);
    controls.update();

    return controls;
  }

  /**
   * Create grid helper
   * @param {Object} config - Grid configuration
   * @returns {THREE.GridHelper} Grid helper
   */
  static createGrid(config = {}) {
    const {
      size = 100,
      divisions = 100,
      color1 = 0x888888,
      color2 = 0x444444,
      visible = true
    } = config;

    const grid = new THREE.GridHelper(size, divisions, color1, color2);
    grid.visible = visible;

    return grid;
  }

  /**
   * Create axes helper (origin gizmo)
   * @param {number} size - Size of the axes
   * @param {Object} position - Position of the axes
   * @param {Object} rotation - Rotation of the axes
   * @returns {THREE.AxesHelper} Axes helper
   */
  static createAxesHelper(size = 0.5, position = null, rotation = null) {
    if (typeof size !== 'number' || size <= 0) {
      throw new Error('Size must be a positive number');
    }

    const axes = new THREE.AxesHelper(size);

    if (position) {
      axes.position.set(position.x, position.y, position.z);
    }

    if (rotation) {
      axes.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    return axes;
  }

  /**
   * Create animation mixer for a model
   * @param {THREE.Object3D} model - Model to create mixer for
   * @returns {THREE.AnimationMixer} Animation mixer
   */
  static createAnimationMixer(model) {
    if (!model || !(model instanceof THREE.Object3D)) {
      throw new Error('Valid Three.js Object3D is required');
    }

    return new THREE.AnimationMixer(model);
  }

  /**
   * Start render loop
   * @param {Object} renderConfig - Configuration object with renderer, scene, camera, getMixer, controls
   * @returns {Function} Function to stop the render loop
   */
  static startRenderLoop(renderConfig) {
    const { renderer, scene, camera, getMixer, controls, clock } = renderConfig;

    if (!renderer || !scene || !camera) {
      throw new Error('Renderer, scene, and camera are required');
    }

    let animationFrameId = null;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock ? clock.getDelta() : 0;

      // Get mixer dynamically to support runtime updates
      const mixer = getMixer ? getMixer() : null;
      if (mixer) {
        mixer.update(delta);
      }

      if (controls) {
        controls.update();
      }

      renderer.render(scene, camera);
    };

    animate();

    // Return function to stop the loop
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };
  }

  /**
   * Update renderer size on window resize
   * @param {THREE.WebGLRenderer} renderer - Renderer to update
   * @param {THREE.Camera} camera - Camera to update
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  static handleResize(renderer, camera, canvas) {
    if (!renderer || !camera || !canvas) {
      throw new Error('Renderer, camera, and canvas are required');
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  /**
   * Dispose of a model and its resources
   * @param {THREE.Object3D} model - Model to dispose
   */
  static disposeModel(model) {
    if (!model) {
      return;
    }

    model.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => {
            this.disposeMaterial(material);
          });
        } else {
          this.disposeMaterial(child.material);
        }
      }
    });
  }

  /**
   * Dispose of a material and its textures
   * @param {THREE.Material} material - Material to dispose
   */
  static disposeMaterial(material) {
    if (!material) {
      return;
    }

    // Dispose textures
    const textureProperties = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'aoMap',
      'emissiveMap',
      'bumpMap',
      'displacementMap',
      'alphaMap',
      'lightMap',
      'envMap'
    ];

    textureProperties.forEach(prop => {
      if (material[prop]) {
        material[prop].dispose();
      }
    });

    material.dispose();
  }

  /**
   * Update scene background color
   * @param {THREE.Scene} scene - Scene to update
   * @param {number} color - Hex color value
   */
  static updateBackgroundColor(scene, color) {
    if (!scene || !(scene instanceof THREE.Scene)) {
      throw new Error('Valid Three.js scene is required');
    }

    if (typeof color !== 'number' || color < 0 || color > 0xFFFFFF) {
      throw new Error('Color must be a valid hex value (0x000000 - 0xFFFFFF)');
    }

    scene.background = new THREE.Color(color);
  }

  /**
   * Update light intensity
   * @param {THREE.Light} light - Light to update
   * @param {number} intensity - New intensity value
   */
  static updateLightIntensity(light, intensity) {
    if (!light || !(light instanceof THREE.Light)) {
      throw new Error('Valid Three.js light is required');
    }

    if (typeof intensity !== 'number' || intensity < 0) {
      throw new Error('Intensity must be a non-negative number');
    }

    light.intensity = intensity;
  }

  /**
   * Update light position
   * @param {THREE.Light} light - Light to update
   * @param {Object} position - New position with x, y, z
   */
  static updateLightPosition(light, position) {
    if (!light || !(light instanceof THREE.Light)) {
      throw new Error('Valid Three.js light is required');
    }

    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
      throw new Error('Position must have numeric x, y, z properties');
    }

    light.position.set(position.x, position.y, position.z);
  }

  /**
   * Calculate bounding box for a model
   * @param {THREE.Object3D} model - Model to calculate bounds for
   * @returns {THREE.Box3} Bounding box
   */
  static calculateBoundingBox(model) {
    if (!model || !(model instanceof THREE.Object3D)) {
      throw new Error('Valid Three.js Object3D is required');
    }

    return new THREE.Box3().setFromObject(model);
  }

  /**
   * Get the center and size of a bounding box
   * @param {THREE.Box3} box - Bounding box
   * @returns {Object} Object with center and size Vector3 objects
   */
  static getBoundingBoxInfo(box) {
    if (!box || !(box instanceof THREE.Box3)) {
      throw new Error('Valid Three.js Box3 is required');
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    return { center, size };
  }
}
