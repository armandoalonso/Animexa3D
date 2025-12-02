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
    try {
      // Save the dropped file to a temp location
      const arrayBuffer = await file.arrayBuffer();
      const tempPath = await window.electronAPI.saveDroppedProject(Array.from(new Uint8Array(arrayBuffer)), file.name);
      
      // Use unified project loading from ProjectManager
      await projectManager.loadProject(tempPath);
      
    } catch (error) {
      console.error('Error loading project:', error);
      window.uiManager.showNotification('Failed to load project: ' + error.message, 'error');
    }
    
    return;
  }
  
  // Handle model files (FBX, GLB, GLTF)
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
