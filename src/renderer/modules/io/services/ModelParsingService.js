import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { LoadingManager } from 'three';

/**
 * Pure service for parsing 3D model files
 * No UI dependencies, fully testable
 */
export class ModelParsingService {
  constructor() {
    // Create a loading manager that handles missing textures gracefully
    this.loadingManager = new LoadingManager();
    
    // Handle texture loading errors silently since we can't load external textures from ArrayBuffer
    this.loadingManager.onError = (url) => {
      console.warn(`Unable to load external resource: ${url}`);
    };
    
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.fbxLoader = new FBXLoader(this.loadingManager);
  }

  /**
   * Parse GLTF/GLB file from array buffer or string
   * @param {ArrayBuffer|string} data - The file buffer (for GLB) or JSON string (for GLTF)
   * @returns {Promise<Object>} - Parsed model data with scene and animations
   */
  parseGLTF(data) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.parse(
        data,
        '', // Base path for external resources (not used for embedded data)
        (gltf) => {
          const modelData = {
            model: gltf.scene,
            animations: gltf.animations || []
          };
          resolve(modelData);
        },
        (error) => {
          console.error('GLTF parsing error:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Parse FBX file from array buffer
   * @param {ArrayBuffer} arrayBuffer - The file buffer
   * @returns {Promise<Object>} - Parsed model data with object and animations
   */
  parseFBX(arrayBuffer) {
    return new Promise((resolve, reject) => {
      try {
        const object = this.fbxLoader.parse(arrayBuffer, '');
        
        const modelData = {
          model: object,
          animations: object.animations || []
        };
        resolve(modelData);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Validate file extension and return normalized extension
   * @param {string} extension - File extension
   * @returns {string} - Normalized extension
   * @throws {Error} - If extension is not supported
   */
  validateExtension(extension) {
    const normalized = extension.toLowerCase();
    const supported = ['glb', 'gltf', 'fbx'];
    
    if (!supported.includes(normalized)) {
      throw new Error(`Unsupported file format: ${extension}. Supported formats: ${supported.join(', ')}`);
    }
    
    return normalized;
  }

  /**
   * Extract skeletons from skinned meshes in the model
   * @param {THREE.Object3D} model - The model to extract skeletons from
   * @returns {Object} - Skeleton information with skeletons, bones, and bone names
   */
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

  /**
   * Extract skeleton information with fallback to hierarchy bones
   * @param {THREE.Object3D} model - The model to extract skeletons from
   * @returns {Object} - Skeleton information with skeletons, bones, and bone names
   */
  extractSkeletonsWithFallback(model) {
    // Try to extract skeletons from skinned meshes first
    let skeletons = this.extractSkeletons(model);
    
    // If no bones found in skeletons (animation files often don't have skinned meshes),
    // extract all bones from the hierarchy
    if (!skeletons.boneNames || skeletons.boneNames.length === 0) {
      skeletons = this.extractAllBones(model);
    }
    
    return skeletons;
  }

  /**
   * Determine if the model has skeletal data
   * @param {Object} skeletons - Skeleton data
   * @returns {boolean} - True if model has bones
   */
  hasSkeletalData(skeletons) {
    if (!skeletons) {
      return false;
    }
    return !!(skeletons.boneNames && skeletons.boneNames.length > 0);
  }
}
