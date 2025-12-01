import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';

export class ModelLoader {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();
    this.currentModelData = null;
  }
  
  async loadFromBuffer(arrayBuffer, extension, filename) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    
    loadingOverlay.style.display = 'flex';
    emptyState.classList.add('hidden');
    
    try {
      let modelData;
      
      if (extension === 'glb' || extension === 'gltf') {
        modelData = await this.loadGLTF(arrayBuffer);
      } else if (extension === 'fbx') {
        modelData = await this.loadFBX(arrayBuffer);
      } else {
        throw new Error(`Unsupported file format: ${extension}`);
      }
      
      modelData.filename = filename;
      this.currentModelData = modelData;
      
      // Add model to scene
      this.sceneManager.addModel(modelData.model);
      
      // Create animation mixer if animations exist
      if (modelData.animations && modelData.animations.length > 0) {
        this.sceneManager.createMixer(modelData.model);
      }
      
      // Collect model info
      const polyCount = this.countPolygons(modelData.model);
      const boneCount = this.countBones(modelData.model);
      
      // Update UI
      this.updateModelInfo(filename, polyCount, modelData.animations.length, boneCount);
      
      // Show success notification
      window.uiManager.showNotification(
        `Model loaded successfully: ${filename}`,
        'success'
      );
      
      // Return model data for use by animation manager
      return modelData;
      
    } catch (error) {
      console.error('Error loading model:', error);
      window.uiManager.showNotification(
        `Failed to load model: ${error.message}`,
        'error'
      );
      emptyState.classList.remove('hidden');
      throw error;
    } finally {
      loadingOverlay.style.display = 'none';
    }
  }
  
  loadGLTF(arrayBuffer) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.parse(
        arrayBuffer,
        '',
        (gltf) => {
          const modelData = {
            model: gltf.scene,
            animations: gltf.animations || [],
            skeletons: this.extractSkeletons(gltf.scene)
          };
          resolve(modelData);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }
  
  loadFBX(arrayBuffer) {
    return new Promise((resolve, reject) => {
      try {
        const object = this.fbxLoader.parse(arrayBuffer, '');
        const modelData = {
          model: object,
          animations: object.animations || [],
          skeletons: this.extractSkeletons(object)
        };
        resolve(modelData);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  extractSkeletons(model) {
    const skeletons = [];
    const bones = [];
    
    model.traverse((child) => {
      if (child.isSkinnedMesh && child.skeleton) {
        skeletons.push(child.skeleton);
        bones.push(...child.skeleton.bones);
      }
    });
    
    return {
      skeletons,
      bones,
      boneNames: bones.map(bone => bone.name)
    };
  }
  
  countPolygons(model) {
    let count = 0;
    model.traverse((child) => {
      if (child.geometry) {
        if (child.geometry.index) {
          count += child.geometry.index.count / 3;
        } else if (child.geometry.attributes.position) {
          count += child.geometry.attributes.position.count / 3;
        }
      }
    });
    return Math.floor(count);
  }
  
  countBones(model) {
    let count = 0;
    model.traverse((child) => {
      if (child.isSkinnedMesh && child.skeleton) {
        count += child.skeleton.bones.length;
      }
    });
    return count;
  }
  
  updateModelInfo(filename, polygons, animations, bones) {
    document.getElementById('info-name').textContent = filename;
    document.getElementById('info-polygons').textContent = polygons.toLocaleString();
    document.getElementById('info-animations').textContent = animations;
    document.getElementById('info-bones').textContent = bones > 0 ? bones : 'N/A';
    document.getElementById('model-info').style.display = 'block';
  }
  
  getCurrentModelData() {
    return this.currentModelData;
  }
}
