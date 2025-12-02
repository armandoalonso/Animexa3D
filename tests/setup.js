import { vi } from 'vitest';
import * as THREE from 'three';

// Mock electron APIs
global.window = global.window || {};
global.window.electronAPI = {
  openModelDialog: vi.fn(),
  chooseExportFolder: vi.fn(),
  saveFrame: vi.fn(),
  saveProjectDialog: vi.fn(),
  openProjectDialog: vi.fn(),
  saveProject: vi.fn(),
  loadProject: vi.fn(),
  saveBoneMapping: vi.fn(),
  loadBoneMapping: vi.fn(),
  listBoneMappings: vi.fn(),
  openImageDialog: vi.fn(),
  readImageFile: vi.fn(),
  saveTextureToTemp: vi.fn(),
  saveModelExport: vi.fn(),
  showNotification: vi.fn()
};

// Mock UIManager
global.window.uiManager = {
  showNotification: vi.fn(),
  displayTextures: vi.fn(),
  clearTextureDisplay: vi.fn()
};

// Make THREE available globally for tests
global.THREE = THREE;

// Mock canvas and WebGL context
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearColor: vi.fn(),
  clearDepth: vi.fn(),
  clearStencil: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  getParameter: vi.fn(),
  getExtension: vi.fn(),
  viewport: vi.fn(),
  clear: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  useProgram: vi.fn()
}));
