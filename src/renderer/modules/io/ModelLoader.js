import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import { CoordinateSystemDetector } from '../core/CoordinateSystemDetector.js';

export class ModelLoader {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();
    this.currentModelData = null;
    this.coordinateDetector = new CoordinateSystemDetector();
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
      modelData.name = filename;
      modelData.bufferData = arrayBuffer; // Store original buffer for saving
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
          // Apply canonical space conversion immediately after loading
          const conversion = this.coordinateDetector.convertToCanonicalSpace(gltf.scene);
          
          const modelData = {
            model: gltf.scene,
            animations: gltf.animations || [],
            skeletons: this.extractSkeletons(gltf.scene),
            coordinateConversion: conversion
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
        
        // Apply canonical space conversion immediately after loading
        const conversion = this.coordinateDetector.convertToCanonicalSpace(object);
        
        const modelData = {
          model: object,
          animations: object.animations || [],
          skeletons: this.extractSkeletons(object),
          coordinateConversion: conversion
        };
        resolve(modelData);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  extractSkeletons(model) {
    const skeletons = [];
    const bonesSet = new Set();
    const bones = [];
    
    model.traverse((child) => {
      if (child.isSkinnedMesh && child.skeleton) {
        // Only add skeleton if not already added
        if (!skeletons.includes(child.skeleton)) {
          skeletons.push(child.skeleton);
        }
        
        // Add bones without duplicates
        child.skeleton.bones.forEach(bone => {
          if (!bonesSet.has(bone)) {
            bonesSet.add(bone);
            bones.push(bone);
          }
        });
      }
    });
    
    console.log('extractSkeletons:', {
      skeletonsFound: skeletons.length,
      bonesFound: bones.length,
      hasMesh: model.traverse ? 'yes' : 'no'
    });
    
    return {
      skeletons,
      bones,
      boneNames: bones.map(bone => bone.name)
    };
  }
  
  /**
   * Extract all bones from model hierarchy (for animation files without skinned meshes)
   * @param {THREE.Object3D} model - The model to extract bones from
   * @returns {Object} - Skeleton information with bones and bone names
   */
  extractAllBones(model) {
    const bones = [];
    const boneNames = [];
    
    model.traverse((child) => {
      // Check if this is a bone (has isBone property or type is 'Bone')
      if (child.isBone || child.type === 'Bone') {
        bones.push(child);
        boneNames.push(child.name);
      }
    });
    
    return {
      skeletons: [],
      bones,
      boneNames
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
  
  clearCurrentModel() {
    this.currentModelData = null;
    
    // Hide model info
    const modelInfo = document.getElementById('model-info');
    if (modelInfo) {
      modelInfo.style.display = 'none';
    }
  }
  
  /**
   * Load animation file to extract animations and bone structure
   * Used for adding animations from external files
   */
  async loadAnimationFile(arrayBuffer, extension, filename) {
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
      
      // Try to extract skeletons from skinned meshes first
      let skeletons = modelData.skeletons;
      
      console.log('loadAnimationFile initial extraction:', {
        filename,
        skeletonCount: skeletons.skeletons?.length || 0,
        boneCount: skeletons.boneNames?.length || 0,
        animationCount: modelData.animations?.length || 0
      });
      
      // If no bones found in skeletons (animation files often don't have skinned meshes),
      // extract all bones from the hierarchy
      if (!skeletons.boneNames || skeletons.boneNames.length === 0) {
        console.log('No bones found in skinned meshes, extracting from hierarchy...');
        skeletons = this.extractAllBones(modelData.model);
        console.log('Found bones in hierarchy:', skeletons.boneNames.length);
      } else {
        console.log('Using bones from skinned mesh:', skeletons.boneNames.length);
      }
      
      const result = {
        filename: filename,
        animations: modelData.animations || [],
        skeletons: skeletons,
        boneNames: skeletons.boneNames || [],
        model: modelData.model // Store the model for retargeting
      };
      
      console.log('loadAnimationFile result:', {
        filename: result.filename,
        animations: result.animations.length,
        bones: result.boneNames.length,
        hasModel: !!result.model
      });
      
      return result;
      
    } catch (error) {
      console.error('Error loading animation file:', error);
      throw error;
    }
  }
  
  /**
   * Verify if two bone structures are compatible
   * Returns { compatible: boolean, message: string, matchPercentage: number, missingBones: array, extraBones: array }
   */
  verifyBoneStructureCompatibility(sourceSkeletons, targetSkeletons) {
    if (!sourceSkeletons || !targetSkeletons) {
      return {
        compatible: false,
        message: 'One or both models have no skeleton data',
        matchPercentage: 0,
        missingBones: [],
        extraBones: []
      };
    }
    
    const sourceBones = new Set(sourceSkeletons.boneNames || []);
    const targetBones = new Set(targetSkeletons.boneNames || []);
    
    if (sourceBones.size === 0 || targetBones.size === 0) {
      return {
        compatible: false,
        message: 'One or both models have no bones',
        matchPercentage: 0,
        missingBones: [],
        extraBones: []
      };
    }
    
    // Find matching, missing, and extra bones
    const matchingBones = [];
    const missingBones = [];
    const extraBones = [];
    
    for (const bone of sourceBones) {
      if (targetBones.has(bone)) {
        matchingBones.push(bone);
      } else {
        missingBones.push(bone);
      }
    }
    
    for (const bone of targetBones) {
      if (!sourceBones.has(bone)) {
        extraBones.push(bone);
      }
    }
    
    const matchPercentage = (matchingBones.length / sourceBones.size) * 100;
    
    // Consider compatible if at least 80% of bones match
    const compatible = matchPercentage >= 80;
    
    let message;
    if (matchPercentage === 100) {
      message = 'Perfect match! All bones are compatible.';
    } else if (compatible) {
      message = `Good match! ${matchPercentage.toFixed(1)}% of bones are compatible.`;
    } else {
      message = `Poor match. Only ${matchPercentage.toFixed(1)}% of bones are compatible. Animation may not work correctly.`;
    }
    
    return {
      compatible,
      message,
      matchPercentage: Math.round(matchPercentage),
      matchingBones,
      missingBones,
      extraBones,
      sourceBoneCount: sourceBones.size,
      targetBoneCount: targetBones.size
    };
  }
}

