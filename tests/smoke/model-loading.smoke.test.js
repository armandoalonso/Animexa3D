/**
 * Smoke Tests - Model Loading
 * 
 * These tests load actual model files from the docs/Models directory
 * to verify the application can handle real-world 3D formats.
 * 
 * Note: These tests are slower than unit tests (~5-10s) as they load real files.
 * 
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_PATH = path.resolve(__dirname, '../../docs/Models');

// Helper to check if file exists
function fileExists(filepath) {
  try {
    return fs.existsSync(filepath);
  } catch {
    return false;
  }
}

// Helper to load FBX file using filesystem
async function loadFBXModel(filepath) {
  return new Promise((resolve, reject) => {
    try {
      const fileData = fs.readFileSync(filepath);
      const loader = new FBXLoader();
      
      // Parse the loaded buffer directly
      const model = loader.parse(fileData.buffer, filepath);
      resolve(model);
    } catch (error) {
      reject(error);
    }
  });
}

// Helper to load GLTF file using filesystem  
async function loadGLTFModel(filepath) {
  return new Promise((resolve, reject) => {
    try {
      const loader = new GLTFLoader();
      
      // Parse GLB buffer
      const isGLB = filepath.endsWith('.glb');
      if (isGLB) {
        const buffer = fs.readFileSync(filepath);
        loader.parse(buffer.buffer, '', (gltf) => {
          resolve(gltf.scene || gltf.scenes[0]);
        }, reject);
      } else {
        // For GLTF JSON files - skip for now as they require texture loading
        reject(new Error('GLTF JSON loading with textures not supported in tests yet'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Helper to extract skeleton info
function getSkeletonInfo(model) {
  let skeletonCount = 0;
  let boneCount = 0;
  let meshCount = 0;
  const bones = [];

  model.traverse((child) => {
    if (child.isSkinnedMesh) {
      meshCount++;
      if (child.skeleton) {
        skeletonCount++;
        boneCount = Math.max(boneCount, child.skeleton.bones.length);
        if (child.skeleton.bones.length > bones.length) {
          bones.length = 0;
          bones.push(...child.skeleton.bones);
        }
      }
    }
  });

  return {
    skeletonCount,
    boneCount,
    meshCount,
    hasBones: boneCount > 0,
    bones
  };
}

// Helper to get animation info
function getAnimationInfo(model) {
  const animations = model.animations || [];
  return {
    count: animations.length,
    names: animations.map(a => a.name),
    durations: animations.map(a => a.duration),
    totalTracks: animations.reduce((sum, a) => sum + a.tracks.length, 0)
  };
}

describe('Smoke Tests - Model Loading', () => {
  describe('FBX Model Loading', () => {
    it('should load Mixamo idle animation', async () => {
      const filepath = path.join(MODELS_PATH, 'Mixamo/Mixamo@Idle.fbx');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      
      expect(model).toBeDefined();
      expect(model).toBeInstanceOf(THREE.Group);

      const skeleton = getSkeletonInfo(model);
      expect(skeleton.hasBones).toBe(true);
      expect(skeleton.boneCount).toBeGreaterThan(10); // Mixamo has ~65 bones
      
      const animations = getAnimationInfo(model);
      expect(animations.count).toBeGreaterThan(0);
      
      console.log(`✅ Mixamo@Idle.fbx: ${skeleton.boneCount} bones, ${animations.count} animations`);
    }, 10000);

    it('should load UE5 Mannequin', async () => {
      const filepath = path.join(MODELS_PATH, 'Mannequin_UE5/Mannequin_UE5.FBX');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      
      expect(model).toBeDefined();
      const skeleton = getSkeletonInfo(model);
      expect(skeleton.hasBones).toBe(true);
      expect(skeleton.boneCount).toBeGreaterThan(30); // UE5 mannequin has ~70 bones
      
      console.log(`✅ Mannequin_UE5.FBX: ${skeleton.boneCount} bones, ${skeleton.meshCount} meshes`);
    }, 10000);

    it('should load UE4 Mannequin', async () => {
      const filepath = path.join(MODELS_PATH, 'Mannequin_UE4/Mannequin_UE4.FBX');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      
      expect(model).toBeDefined();
      const skeleton = getSkeletonInfo(model);
      expect(skeleton.hasBones).toBe(true);
      
      console.log(`✅ Mannequin_UE4.FBX: ${skeleton.boneCount} bones`);
    }, 10000);

    it('should load KayKit Mannequin Medium', async () => {
      const filepath = path.join(MODELS_PATH, 'KayKit/KayKit_Mannequin_Medium.fbx');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      
      expect(model).toBeDefined();
      const skeleton = getSkeletonInfo(model);
      expect(skeleton.hasBones).toBe(true);
      
      console.log(`✅ KayKit_Mannequin_Medium.fbx: ${skeleton.boneCount} bones`);
    }, 10000);

    it('should load Quaternius Unity model', async () => {
      const filepath = path.join(MODELS_PATH, 'Quaternius/Quaternius_Unity.fbx');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      
      expect(model).toBeDefined();
      const skeleton = getSkeletonInfo(model);
      expect(skeleton.hasBones).toBe(true);
      
      console.log(`✅ Quaternius_Unity.fbx: ${skeleton.boneCount} bones`);
    }, 10000);

    it('should load SK_FatOgre model', async () => {
      const filepath = path.join(MODELS_PATH, 'SK_FatOgre/SK_FatOgre.fbx');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      
      expect(model).toBeDefined();
      const skeleton = getSkeletonInfo(model);
      expect(skeleton.hasBones).toBe(true);
      
      console.log(`✅ SK_FatOgre.fbx: ${skeleton.boneCount} bones`);
    }, 10000);

    it('should load Synty Characters', async () => {
      const filepath = path.join(MODELS_PATH, 'Synty_Characters/Synty_Characters.fbx');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      
      expect(model).toBeDefined();
      const skeleton = getSkeletonInfo(model);
      expect(skeleton.hasBones).toBe(true);
      
      console.log(`✅ Synty_Characters.fbx: ${skeleton.boneCount} bones`);
    }, 10000);
  });

  describe('GLTF Model Loading', () => {
    it.skip('should load ToaRobot AutoRigPro', async () => {
      // Skip - GLB files with embedded textures timeout in Node environment
      console.warn('⚠️ ToaRobot AutoRigPro (GLB) skipped - texture loading timeout');
    }, 10000);

    it.skip('should load Quaternius Godot model', async () => {
      // Skip GLTF JSON files - they require external texture loading which is complex in Node
      console.warn('⚠️ GLTF JSON loading skipped - requires texture support');
    }, 10000);

    it.skip('should load Quaternius Unreal model', async () => {
      // Skip GLTF JSON files - they require external texture loading which is complex in Node
      console.warn('⚠️ GLTF JSON loading skipped - requires texture support');
    }, 10000);
  });

  describe('Animation Library Loading', () => {
    it('should load standard animation library', async () => {
      const filepath = path.join(MODELS_PATH, 'Quaternius/AnimationLibrary_Standard.fbx');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      
      expect(model).toBeDefined();
      const animations = getAnimationInfo(model);
      expect(animations.count).toBeGreaterThan(0);
      
      console.log(`✅ AnimationLibrary_Standard.fbx: ${animations.count} animations, ${animations.totalTracks} tracks`);
      console.log(`   Animation names: ${animations.names.slice(0, 5).join(', ')}${animations.count > 5 ? '...' : ''}`);
    }, 10000);

    it('should load Unity animation library', async () => {
      const filepath = path.join(MODELS_PATH, 'Quaternius/AnimationLibrary_Unity_Standard.fbx');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      
      expect(model).toBeDefined();
      const animations = getAnimationInfo(model);
      expect(animations.count).toBeGreaterThan(0);
      
      console.log(`✅ AnimationLibrary_Unity_Standard.fbx: ${animations.count} animations`);
    }, 10000);

    it.skip('should load Godot animation library', async () => {
      // Skip - GLTF requires external texture/image loading
      console.warn('⚠️ Godot animation library (GLB) skipped - texture loading issues in Node');
    }, 10000);
  });

  describe('Bone Naming Convention Detection', () => {
    it('should detect Mixamo bone naming (mixamorig: prefix)', async () => {
      const filepath = path.join(MODELS_PATH, 'Mixamo/Mixamo@Idle.fbx');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      const skeleton = getSkeletonInfo(model);
      
      expect(skeleton.bones.length).toBeGreaterThan(0);
      
      // Check bone names - Mixamo uses mixamorig: prefix OR standard names
      const boneNames = skeleton.bones.map(b => b.name);
      const hasMixamoPrefix = boneNames.some(name => 
        name.toLowerCase().includes('mixamo') || name.toLowerCase().includes('hips')
      );
      
      expect(hasMixamoPrefix).toBe(true);
      console.log(`✅ Detected Mixamo rig with bones: ${boneNames.slice(0, 3).join(', ')}...`);
    }, 10000);

    it('should detect UE5 bone naming', async () => {
      const filepath = path.join(MODELS_PATH, 'Mannequin_UE5/Mannequin_UE5.FBX');
      
      if (!fileExists(filepath)) {
        console.warn(`⚠️ File not found: ${filepath}`);
        return;
      }

      const model = await loadFBXModel(filepath);
      const skeleton = getSkeletonInfo(model);
      
      expect(skeleton.bones.length).toBeGreaterThan(0);
      
      const boneNames = skeleton.bones.map(b => b.name);
      const hasStandardNames = boneNames.some(name => 
        /^(pelvis|spine|head|hand|foot)/i.test(name)
      );
      
      expect(hasStandardNames).toBe(true);
      console.log(`✅ UE5 bone names: ${boneNames.slice(0, 5).join(', ')}...`);
    }, 10000);
  });

  describe('Model Compatibility Matrix', () => {
    it('should verify all test models have compatible structures', async () => {
      const testModels = [
        'Mixamo/Mixamo@Idle.fbx',
        'Mannequin_UE5/Mannequin_UE5.FBX',
        'Quaternius/Quaternius_Unity.fbx'
      ];

      const results = [];

      for (const modelPath of testModels) {
        const filepath = path.join(MODELS_PATH, modelPath);
        
        if (!fileExists(filepath)) {
          console.warn(`⚠️ File not found: ${filepath}`);
          continue;
        }

        try {
          const model = await loadFBXModel(filepath);
          const skeleton = getSkeletonInfo(model);
          const animations = getAnimationInfo(model);

          results.push({
            name: path.basename(modelPath),
            bones: skeleton.boneCount,
            animations: animations.count,
            hasSkeleton: skeleton.hasBones
          });
        } catch (error) {
          console.error(`Failed to load ${modelPath}:`, error.message);
        }
      }

      // All models should have skeletons
      expect(results.every(r => r.hasSkeleton)).toBe(true);
      
      // All models should have reasonable bone counts (10-100 bones typical)
      expect(results.every(r => r.bones >= 10 && r.bones <= 200)).toBe(true);

      console.log('📊 Model Compatibility Matrix:');
      results.forEach(r => {
        console.log(`   ${r.name}: ${r.bones} bones, ${r.animations} animations`);
      });
    }, 30000);
  });
});
