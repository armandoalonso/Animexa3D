import 'bulma/css/bulma.min.css';
import * as THREE from 'three';
import { SceneManager } from './modules/SceneManager.js';
import { ModelLoader } from './modules/ModelLoader.js';
import { AnimationManager } from './modules/AnimationManager.js';
import { ExportManager } from './modules/ExportManager.js';
import { UIManager } from './modules/UIManager.js';
import { RetargetManager } from './modules/RetargetManager.js';
import { TextureManager } from './modules/TextureManager.js';
import { ProjectManager } from './modules/ProjectManager.js';
import { CameraPresetManager } from './modules/CameraPresetManager.js';

// Initialize managers
const sceneManager = new SceneManager();
const modelLoader = new ModelLoader(sceneManager);
const animationManager = new AnimationManager(sceneManager);
const exportManager = new ExportManager(sceneManager, animationManager);
const retargetManager = new RetargetManager(sceneManager, modelLoader, animationManager);
const textureManager = new TextureManager();
const projectManager = new ProjectManager(sceneManager, modelLoader, animationManager, textureManager);
const cameraPresetManager = new CameraPresetManager(sceneManager);
const uiManager = new UIManager(sceneManager, modelLoader, animationManager, exportManager, retargetManager, textureManager, projectManager, cameraPresetManager);

// Start the render loop
sceneManager.startRenderLoop();

// Handle window resize
window.addEventListener('resize', () => {
  sceneManager.handleResize();
});

// Drag and drop handling for models (canvas only)
const canvas = document.getElementById('webgl-canvas');
const viewportContainer = document.querySelector('.viewport-container');
const dropOverlayCanvas = document.getElementById('drop-overlay-canvas');

// Disable pointer events on canvas during drag to let events reach the container
document.addEventListener('dragenter', (e) => {
  canvas.classList.add('drag-enabled');
}, true);

document.addEventListener('dragleave', (e) => {
  // Only re-enable if we're leaving the document
  if (!document.contains(e.relatedTarget) || e.relatedTarget === null) {
    canvas.classList.remove('drag-enabled');
  }
}, true);

document.addEventListener('drop', (e) => {
  canvas.classList.remove('drag-enabled');
}, true);

viewportContainer.addEventListener('dragenter', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropOverlayCanvas.classList.add('active');
});

viewportContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

viewportContainer.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Only remove overlay if leaving the viewport container
  if (e.target === viewportContainer || !viewportContainer.contains(e.relatedTarget)) {
    dropOverlayCanvas.classList.remove('active');
  }
});

viewportContainer.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropOverlayCanvas.classList.remove('active');

  const files = e.dataTransfer.files;
  if (files.length === 0) return;

  const file = files[0];
  const extension = file.name.split('.').pop().toLowerCase();

  // Check if it's a project file
  if (extension === '3dproj') {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
      // Show loading overlay
      loadingOverlay.classList.add('active');
      
      // Save the dropped file to a temp location and load it as a project
      const arrayBuffer = await file.arrayBuffer();
      const tempPath = await window.electronAPI.saveDroppedProject(Array.from(new Uint8Array(arrayBuffer)), file.name);
      
      // Load the project using the project manager
      const result = await window.electronAPI.loadProject(tempPath);
      
      if (result.success) {
        const projectData = result.data;
        const extractedPath = result.extractedPath;

        // Load the model
        if (projectData.model && projectData.model.fileName) {
          const modelPath = `${extractedPath}/${projectData.model.fileName}`;
          const modelBuffer = await window.electronAPI.readFileAsBuffer(modelPath);
          const modelExtension = projectData.model.extension;
          
          const modelData = await modelLoader.loadFromBuffer(
            modelBuffer,
            modelExtension,
            projectData.model.fileName
          );

          // Load animations from saved project data (not from model)
          if (projectData.animations && projectData.animations.length > 0) {
            // Restore animations from saved project data (including added/renamed animations)
            const restoredAnimations = projectData.animations.map(savedClip => {
              const tracks = savedClip.tracks.map(savedTrack => {
                const times = new Float32Array(savedTrack.times);
                const values = new Float32Array(savedTrack.values);
                
                // Reconstruct the appropriate track type
                let TrackConstructor;
                switch (savedTrack.type) {
                  case 'VectorKeyframeTrack':
                    TrackConstructor = THREE.VectorKeyframeTrack;
                    break;
                  case 'QuaternionKeyframeTrack':
                    TrackConstructor = THREE.QuaternionKeyframeTrack;
                    break;
                  case 'NumberKeyframeTrack':
                    TrackConstructor = THREE.NumberKeyframeTrack;
                    break;
                  case 'ColorKeyframeTrack':
                    TrackConstructor = THREE.ColorKeyframeTrack;
                    break;
                  case 'BooleanKeyframeTrack':
                    TrackConstructor = THREE.BooleanKeyframeTrack;
                    break;
                  case 'StringKeyframeTrack':
                    TrackConstructor = THREE.StringKeyframeTrack;
                    break;
                  default:
                    TrackConstructor = THREE.KeyframeTrack;
                }
                
                return new TrackConstructor(savedTrack.name, times, values);
              });
              
              return new THREE.AnimationClip(savedClip.name, savedClip.duration, tracks);
            });
            
            animationManager.loadAnimations(restoredAnimations);
          } else if (modelData.animations && modelData.animations.length > 0) {
            // Fallback to model's original animations if no saved animations
            animationManager.loadAnimations(modelData.animations);
          } else {
            animationManager.loadAnimations([]);
          }

          // Load textures
          if (projectData.materials && projectData.materials.length > 0) {
            const materials = textureManager.extractMaterials(modelData.model);
            
            for (const savedMaterial of projectData.materials) {
              for (const savedTexture of savedMaterial.textures) {
                if (savedTexture.fileName) {
                  const material = materials.find(m => m.name === savedMaterial.name);
                  
                  if (material) {
                    try {
                      const texturePath = `${extractedPath}/textures/${savedTexture.fileName}`;
                      await textureManager.updateTexture(
                        material.uuid,
                        savedTexture.key,
                        texturePath
                      );
                    } catch (error) {
                      console.warn(`Failed to load texture ${savedTexture.fileName}:`, error);
                    }
                  }
                }
              }
            }
            
            await uiManager.displayTextures();
            
            // Wait for render cycle to complete
            await new Promise(resolve => requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setTimeout(resolve, 300);
              });
            }));
          }

          // Restore scene settings
          if (projectData.scene) {
            if (projectData.scene.backgroundColor) {
              sceneManager.setBackgroundColor(projectData.scene.backgroundColor);
              document.getElementById('bg-color').value = projectData.scene.backgroundColor;
            }
            
            if (typeof projectData.scene.gridVisible !== 'undefined') {
              sceneManager.toggleGrid(projectData.scene.gridVisible);
              document.getElementById('grid-toggle').checked = projectData.scene.gridVisible;
            }
            
            if (projectData.scene.camera) {
              const cam = projectData.scene.camera;
              sceneManager.camera.position.set(cam.position.x, cam.position.y, cam.position.z);
              sceneManager.controls.target.set(cam.target.x, cam.target.y, cam.target.z);
              sceneManager.controls.update();
            }
            
            if (projectData.scene.lighting) {
              const lighting = projectData.scene.lighting;
              
              sceneManager.updateAmbientLightIntensity(lighting.ambientIntensity);
              document.getElementById('amb-light-intensity').value = lighting.ambientIntensity;
              document.getElementById('amb-light-value').textContent = lighting.ambientIntensity;
              
              sceneManager.updateDirectionalLightIntensity(lighting.directionalIntensity);
              document.getElementById('dir-light-intensity').value = lighting.directionalIntensity;
              document.getElementById('dir-light-value').textContent = lighting.directionalIntensity;
              
              const pos = lighting.directionalPosition;
              sceneManager.updateLightPosition(pos.x, pos.y, pos.z);
              document.getElementById('light-x').value = pos.x;
              document.getElementById('light-y').value = pos.y;
              document.getElementById('light-z').value = pos.z;
              document.getElementById('light-x-value').textContent = pos.x;
              document.getElementById('light-y-value').textContent = pos.y;
              document.getElementById('light-z-value').textContent = pos.z;
            }
          }

          // Enable buttons
          document.getElementById('btn-retarget').disabled = false;
          document.getElementById('btn-add-animation').disabled = false;
          document.getElementById('btn-save-project').disabled = false;
          
          uiManager.showNotification('Project loaded successfully!', 'success');
        }
      } else {
        uiManager.showNotification(`Failed to load project: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error loading dropped project:', error);
      uiManager.showNotification(`Failed to load project: ${error.message}`, 'error');
    } finally {
      // Hide loading overlay after all UI updates are complete
      loadingOverlay.classList.remove('active');
    }
    return;
  }

  // Handle model files
  if (!['glb', 'gltf', 'fbx'].includes(extension)) {
    uiManager.showNotification('Invalid file format. Please use GLB, GLTF, FBX, or 3DPROJ files.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    const arrayBuffer = event.target.result;
    const modelData = await modelLoader.loadFromBuffer(arrayBuffer, extension, file.name);
    
    // Load animations
    if (modelData && modelData.animations && modelData.animations.length > 0) {
      animationManager.loadAnimations(modelData.animations);
    } else {
      animationManager.loadAnimations([]);
      uiManager.showNotification('Model has no animations', 'warning');
    }

    // Extract and display textures
    if (modelData && modelData.model) {
      const materials = textureManager.extractMaterials(modelData.model);
      if (materials.length > 0) {
        await textureManager.extractEmbeddedTextures(materials);
        uiManager.displayTextures();
      } else {
        uiManager.clearTextureDisplay();
      }
    }
    
    // Enable retarget button
    document.getElementById('btn-retarget').disabled = false;
    
    // Enable add animation button
    document.getElementById('btn-add-animation').disabled = false;
    
    // Enable save project button
    document.getElementById('btn-save-project').disabled = false;
  };
  reader.readAsArrayBuffer(file);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Space: Play/Pause
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    animationManager.togglePlayPause();
  }
  // L: Toggle loop
  else if (e.code === 'KeyL' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    document.getElementById('loop-toggle').click();
  }
  // O: Open model
  else if (e.code === 'KeyO' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById('btn-open-model').click();
  }
  // E: Export
  else if (e.code === 'KeyE' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    if (!document.getElementById('btn-export').disabled) {
      document.getElementById('btn-export').click();
    }
  }
  // G: Toggle grid
  else if (e.code === 'KeyG' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    document.getElementById('grid-toggle').click();
  }
  // Camera presets 1-6
  else if (e.code >= 'Digit1' && e.code <= 'Digit6' && !e.target.matches('input, textarea')) {
    const presets = ['perspective', 'front', 'back', 'left', 'right', 'top'];
    const index = parseInt(e.code.replace('Digit', '')) - 1;
    if (index < presets.length) {
      sceneManager.applyCameraPreset(presets[index]);
    }
  }
  // [ and ]: Previous/Next animation
  else if ((e.code === 'BracketLeft' || e.code === 'BracketRight') && !e.target.matches('input, textarea')) {
    e.preventDefault();
    const direction = e.code === 'BracketLeft' ? -1 : 1;
    animationManager.changeAnimation(direction);
  }
});

console.log('Animexa initialized');
