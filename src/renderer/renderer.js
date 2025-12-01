import 'bulma/css/bulma.min.css';
import * as THREE from 'three';
import { SceneManager } from './modules/SceneManager.js';
import { ModelLoader } from './modules/ModelLoader.js';
import { AnimationManager } from './modules/AnimationManager.js';
import { ExportManager } from './modules/ExportManager.js';
import { UIManager } from './modules/UIManager.js';

// Initialize managers
const sceneManager = new SceneManager();
const modelLoader = new ModelLoader(sceneManager);
const animationManager = new AnimationManager(sceneManager);
const exportManager = new ExportManager(sceneManager, animationManager);
const uiManager = new UIManager(sceneManager, modelLoader, animationManager, exportManager);

// Start the render loop
sceneManager.startRenderLoop();

// Handle window resize
window.addEventListener('resize', () => {
  sceneManager.handleResize();
});

// Drag and drop handling
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('drop-overlay').classList.add('active');
});

document.addEventListener('dragleave', (e) => {
  if (e.target === document.body || e.target === document.documentElement) {
    document.getElementById('drop-overlay').classList.remove('active');
  }
});

document.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('drop-overlay').classList.remove('active');

  const files = e.dataTransfer.files;
  if (files.length === 0) return;

  const file = files[0];
  const extension = file.name.split('.').pop().toLowerCase();

  if (!['glb', 'gltf', 'fbx'].includes(extension)) {
    uiManager.showNotification('Invalid file format. Please use GLB, GLTF, or FBX files.', 'error');
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

console.log('3D Animation Viewer initialized');
