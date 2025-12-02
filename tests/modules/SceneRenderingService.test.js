import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SceneRenderingService } from '../../src/renderer/modules/core/SceneRenderingService.js';
import * as THREE from 'three';

describe('SceneRenderingService', () => {
  describe('initializeRenderer', () => {
    it('should throw error for invalid canvas', () => {
      expect(() => {
        SceneRenderingService.initializeRenderer(null);
      }).toThrow('Valid canvas element is required');
    });

    it.skip('should create renderer with default options (requires WebGL)', () => {
      // This test requires a browser environment with WebGL support
      // Skipped in headless test environment
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;

      const renderer = SceneRenderingService.initializeRenderer(canvas);

      expect(renderer).toBeInstanceOf(THREE.WebGLRenderer);
    });
  });

  describe('createScene', () => {
    it('should create a basic scene', () => {
      const scene = SceneRenderingService.createScene();

      expect(scene).toBeInstanceOf(THREE.Scene);
    });

    it('should set background color from config', () => {
      const scene = SceneRenderingService.createScene({ backgroundColor: 0x123456 });

      expect(scene.background).toBeInstanceOf(THREE.Color);
      expect(scene.background.getHex()).toBe(0x123456);
    });
  });

  describe('createCamera', () => {
    it('should create camera with default config', () => {
      const camera = SceneRenderingService.createCamera({}, 16/9);

      expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(camera.fov).toBe(45);
      expect(camera.near).toBe(0.1);
      expect(camera.far).toBe(1000);
    });

    it('should use custom config', () => {
      const config = {
        fov: 60,
        near: 0.5,
        far: 500,
        position: { x: 1, y: 2, z: 3 }
      };

      const camera = SceneRenderingService.createCamera(config, 16/9);

      expect(camera.fov).toBe(60);
      expect(camera.near).toBe(0.5);
      expect(camera.far).toBe(500);
      expect(camera.position.x).toBe(1);
      expect(camera.position.y).toBe(2);
      expect(camera.position.z).toBe(3);
    });
  });

  describe('setupLights', () => {
    it('should add lights to scene', () => {
      const scene = new THREE.Scene();

      const lights = SceneRenderingService.setupLights(scene);

      expect(lights.ambientLight).toBeInstanceOf(THREE.AmbientLight);
      expect(lights.directionalLight).toBeInstanceOf(THREE.DirectionalLight);
      expect(scene.children).toContain(lights.ambientLight);
      expect(scene.children).toContain(lights.directionalLight);
    });

    it('should use custom light config', () => {
      const scene = new THREE.Scene();
      const config = {
        ambientLightColor: 0xff0000,
        ambientLightIntensity: 0.8,
        directionalLightColor: 0x00ff00,
        directionalLightIntensity: 0.5,
        directionalLightPosition: { x: 1, y: 2, z: 3 }
      };

      const lights = SceneRenderingService.setupLights(scene, config);

      expect(lights.ambientLight.color.getHex()).toBe(0xff0000);
      expect(lights.ambientLight.intensity).toBe(0.8);
      expect(lights.directionalLight.color.getHex()).toBe(0x00ff00);
      expect(lights.directionalLight.intensity).toBe(0.5);
      expect(lights.directionalLight.position.x).toBe(1);
      expect(lights.directionalLight.position.y).toBe(2);
      expect(lights.directionalLight.position.z).toBe(3);
    });

    it('should throw error for invalid scene', () => {
      expect(() => {
        SceneRenderingService.setupLights(null);
      }).toThrow('Valid Three.js scene is required');
    });
  });

  describe('createGrid', () => {
    it('should create grid with default config', () => {
      const grid = SceneRenderingService.createGrid();

      expect(grid).toBeInstanceOf(THREE.GridHelper);
      expect(grid.visible).toBe(true);
    });

    it('should use custom config', () => {
      const config = {
        size: 50,
        divisions: 25,
        color1: 0xff0000,
        color2: 0x00ff00,
        visible: false
      };

      const grid = SceneRenderingService.createGrid(config);

      expect(grid.visible).toBe(false);
    });
  });

  describe('createAxesHelper', () => {
    it('should create axes helper', () => {
      const axes = SceneRenderingService.createAxesHelper();

      expect(axes).toBeInstanceOf(THREE.AxesHelper);
    });

    it('should throw error for invalid size', () => {
      expect(() => {
        SceneRenderingService.createAxesHelper(-1);
      }).toThrow('Size must be a positive number');
    });

    it('should set position and rotation', () => {
      const position = { x: 1, y: 2, z: 3 };
      const rotation = { x: 0.1, y: 0.2, z: 0.3 };

      const axes = SceneRenderingService.createAxesHelper(0.5, position, rotation);

      expect(axes.position.x).toBe(1);
      expect(axes.position.y).toBe(2);
      expect(axes.position.z).toBe(3);
      expect(axes.rotation.x).toBe(0.1);
      expect(axes.rotation.y).toBe(0.2);
      expect(axes.rotation.z).toBe(0.3);
    });
  });

  describe('createAnimationMixer', () => {
    it('should create animation mixer', () => {
      const model = new THREE.Object3D();

      const mixer = SceneRenderingService.createAnimationMixer(model);

      expect(mixer).toBeInstanceOf(THREE.AnimationMixer);
    });

    it('should throw error for invalid model', () => {
      expect(() => {
        SceneRenderingService.createAnimationMixer(null);
      }).toThrow('Valid Three.js Object3D is required');
    });
  });

  describe('updateBackgroundColor', () => {
    it('should update scene background color', () => {
      const scene = new THREE.Scene();

      SceneRenderingService.updateBackgroundColor(scene, 0x123456);

      expect(scene.background).toBeInstanceOf(THREE.Color);
      expect(scene.background.getHex()).toBe(0x123456);
    });

    it('should throw error for invalid scene', () => {
      expect(() => {
        SceneRenderingService.updateBackgroundColor(null, 0x123456);
      }).toThrow('Valid Three.js scene is required');
    });

    it('should throw error for invalid color', () => {
      const scene = new THREE.Scene();

      expect(() => {
        SceneRenderingService.updateBackgroundColor(scene, -1);
      }).toThrow('Color must be a valid hex value');

      expect(() => {
        SceneRenderingService.updateBackgroundColor(scene, 0xFFFFFF + 1);
      }).toThrow('Color must be a valid hex value');
    });
  });

  describe('updateLightIntensity', () => {
    it('should update light intensity', () => {
      const light = new THREE.AmbientLight();

      SceneRenderingService.updateLightIntensity(light, 0.7);

      expect(light.intensity).toBe(0.7);
    });

    it('should throw error for invalid light', () => {
      expect(() => {
        SceneRenderingService.updateLightIntensity(null, 0.5);
      }).toThrow('Valid Three.js light is required');
    });

    it('should throw error for invalid intensity', () => {
      const light = new THREE.AmbientLight();

      expect(() => {
        SceneRenderingService.updateLightIntensity(light, -1);
      }).toThrow('Intensity must be a non-negative number');
    });
  });

  describe('updateLightPosition', () => {
    it('should update light position', () => {
      const light = new THREE.DirectionalLight();
      const position = { x: 1, y: 2, z: 3 };

      SceneRenderingService.updateLightPosition(light, position);

      expect(light.position.x).toBe(1);
      expect(light.position.y).toBe(2);
      expect(light.position.z).toBe(3);
    });

    it('should throw error for invalid light', () => {
      expect(() => {
        SceneRenderingService.updateLightPosition(null, { x: 1, y: 2, z: 3 });
      }).toThrow('Valid Three.js light is required');
    });

    it('should throw error for invalid position', () => {
      const light = new THREE.DirectionalLight();

      expect(() => {
        SceneRenderingService.updateLightPosition(light, { x: 'invalid', y: 2, z: 3 });
      }).toThrow('Position must have numeric x, y, z properties');
    });
  });

  describe('calculateBoundingBox', () => {
    it('should calculate bounding box for model', () => {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      const box = SceneRenderingService.calculateBoundingBox(mesh);

      expect(box).toBeInstanceOf(THREE.Box3);
      
      // Cleanup
      geometry.dispose();
      material.dispose();
    });

    it('should throw error for invalid model', () => {
      expect(() => {
        SceneRenderingService.calculateBoundingBox(null);
      }).toThrow('Valid Three.js Object3D is required');
    });
  });

  describe('getBoundingBoxInfo', () => {
    it('should get center and size from bounding box', () => {
      const box = new THREE.Box3(
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, 1, 1)
      );

      const info = SceneRenderingService.getBoundingBoxInfo(box);

      expect(info.center).toBeInstanceOf(THREE.Vector3);
      expect(info.size).toBeInstanceOf(THREE.Vector3);
      expect(info.center.x).toBe(0);
      expect(info.center.y).toBe(0);
      expect(info.center.z).toBe(0);
      expect(info.size.x).toBe(2);
      expect(info.size.y).toBe(2);
      expect(info.size.z).toBe(2);
    });

    it('should throw error for invalid box', () => {
      expect(() => {
        SceneRenderingService.getBoundingBoxInfo(null);
      }).toThrow('Valid Three.js Box3 is required');
    });
  });

  describe('disposeModel', () => {
    it('should handle null model gracefully', () => {
      expect(() => {
        SceneRenderingService.disposeModel(null);
      }).not.toThrow();
    });

    it('should dispose of model resources', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      const geometryDisposeSpy = vi.spyOn(geometry, 'dispose');
      const materialDisposeSpy = vi.spyOn(material, 'dispose');

      SceneRenderingService.disposeModel(mesh);

      expect(geometryDisposeSpy).toHaveBeenCalled();
      expect(materialDisposeSpy).toHaveBeenCalled();
    });
  });

  describe('disposeMaterial', () => {
    it('should handle null material gracefully', () => {
      expect(() => {
        SceneRenderingService.disposeMaterial(null);
      }).not.toThrow();
    });

    it('should dispose of material and textures', () => {
      const material = new THREE.MeshStandardMaterial();
      const texture = new THREE.Texture();
      material.map = texture;

      const materialDisposeSpy = vi.spyOn(material, 'dispose');
      const textureDisposeSpy = vi.spyOn(texture, 'dispose');

      SceneRenderingService.disposeMaterial(material);

      expect(materialDisposeSpy).toHaveBeenCalled();
      expect(textureDisposeSpy).toHaveBeenCalled();
    });
  });

  describe('handleResize', () => {
    it('should throw error for missing parameters', () => {
      expect(() => {
        SceneRenderingService.handleResize(null, null, null);
      }).toThrow('Renderer, camera, and canvas are required');
    });
  });

  describe('startRenderLoop', () => {
    it('should throw error for missing required parameters', () => {
      expect(() => {
        SceneRenderingService.startRenderLoop({});
      }).toThrow('Renderer, scene, and camera are required');
    });

    it.skip('should return stop function (requires WebGL)', () => {
      // This test requires a browser environment with WebGL support
      // Skipped in headless test environment
      const canvas = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({ canvas });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      const clock = new THREE.Clock();

      const stop = SceneRenderingService.startRenderLoop({
        renderer,
        scene,
        camera,
        clock
      });

      expect(typeof stop).toBe('function');
      
      // Stop the loop
      stop();
      
      // Cleanup
      renderer.dispose();
    });
  });
});
