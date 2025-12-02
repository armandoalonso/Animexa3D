/**
 * Smoke Test Setup
 * Node.js environment - minimal mocks for Three.js file loading
 */

import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock canvas for Three.js (Node.js environment)
if (typeof HTMLCanvasElement === 'undefined') {
  global.HTMLCanvasElement = class HTMLCanvasElement {
    getContext() {
      return {
        clearColor: vi.fn(),
        clearDepth: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        getParameter: vi.fn(() => 16),
        getExtension: vi.fn(() => ({})),
        createProgram: vi.fn(() => ({})),
        createShader: vi.fn(() => ({})),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => true),
        getShaderParameter: vi.fn(() => true),
        useProgram: vi.fn(),
        createBuffer: vi.fn(() => ({})),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        createTexture: vi.fn(() => ({})),
        bindTexture: vi.fn(),
        texImage2D: vi.fn(),
        texParameteri: vi.fn(),
        viewport: vi.fn(),
        clear: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
      };
    }
    
    toDataURL() {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
  };
  
  global.HTMLImageElement = class HTMLImageElement {
    constructor() {
      this.width = 0;
      this.height = 0;
      this.src = '';
    }
  };
  
  global.Image = global.HTMLImageElement;
}

// Mock document for Three.js
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return new global.HTMLCanvasElement();
      }
      if (tag === 'img') {
        return new global.HTMLImageElement();
      }
      return {
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    },
    createElementNS: () => ({
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
  };
}

// Mock window
if (typeof window === 'undefined') {
  global.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
  };
}

// Mock self for GLTF loader
if (typeof self === 'undefined') {
  global.self = global;
}

// Mock requestAnimationFrame
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

console.log('✅ Smoke test setup complete (Node.js environment)');
