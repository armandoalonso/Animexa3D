import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderingService } from '../../src/renderer/modules/io/services/RenderingService.js';

describe('RenderingService', () => {
  let service;

  beforeEach(() => {
    service = new RenderingService();
  });

  describe('prepareOffscreenRender', () => {
    it('should store original settings and apply new ones', () => {
      const mockBackground = { clone: vi.fn().mockReturnValue('cloned-background') };
      const mockRenderer = {
        domElement: { width: 800, height: 600 },
        getClearAlpha: vi.fn().mockReturnValue(1),
        setClearAlpha: vi.fn(),
        setSize: vi.fn()
      };
      const mockCamera = {
        aspect: 800 / 600,
        updateProjectionMatrix: vi.fn()
      };
      const mockScene = {
        background: mockBackground
      };
      const mockToggleGrid = vi.fn();

      const originalSettings = service.prepareOffscreenRender(
        mockRenderer,
        mockCamera,
        mockScene,
        1920,
        1080,
        false,
        mockToggleGrid
      );

      expect(originalSettings.width).toBe(800);
      expect(originalSettings.height).toBe(600);
      expect(originalSettings.aspect).toBeCloseTo(800 / 600);
      expect(originalSettings.alpha).toBe(1);
      expect(originalSettings.backgroundColor).toBe('cloned-background');
      expect(mockToggleGrid).toHaveBeenCalledWith(false);
      expect(mockRenderer.setSize).toHaveBeenCalledWith(1920, 1080);
      expect(mockCamera.aspect).toBeCloseTo(1920 / 1080);
      expect(mockCamera.updateProjectionMatrix).toHaveBeenCalled();
    });

    it('should set transparent background when requested', () => {
      const mockRenderer = {
        domElement: { width: 800, height: 600 },
        getClearAlpha: vi.fn().mockReturnValue(1),
        setClearAlpha: vi.fn(),
        setSize: vi.fn()
      };
      const mockCamera = {
        aspect: 1,
        updateProjectionMatrix: vi.fn()
      };
      const mockScene = {
        background: { clone: vi.fn().mockReturnValue('bg') }
      };

      service.prepareOffscreenRender(
        mockRenderer,
        mockCamera,
        mockScene,
        1920,
        1080,
        true,
        null
      );

      expect(mockRenderer.setClearAlpha).toHaveBeenCalledWith(0);
      expect(mockScene.background).toBeNull();
    });

    it('should handle null background', () => {
      const mockRenderer = {
        domElement: { width: 800, height: 600 },
        getClearAlpha: vi.fn().mockReturnValue(1),
        setClearAlpha: vi.fn(),
        setSize: vi.fn()
      };
      const mockCamera = {
        aspect: 1,
        updateProjectionMatrix: vi.fn()
      };
      const mockScene = {
        background: null
      };

      const originalSettings = service.prepareOffscreenRender(
        mockRenderer,
        mockCamera,
        mockScene,
        1920,
        1080,
        false,
        null
      );

      expect(originalSettings.backgroundColor).toBeNull();
    });

    it('should throw error if renderer is missing', () => {
      expect(() => service.prepareOffscreenRender(null, {}, {}, 100, 100, false, null))
        .toThrow('Renderer, camera, and scene are required');
    });

    it('should throw error if dimensions are invalid', () => {
      const mockRenderer = { domElement: {}, getClearAlpha: vi.fn(), setSize: vi.fn() };
      const mockCamera = { updateProjectionMatrix: vi.fn() };
      const mockScene = {};

      expect(() => service.prepareOffscreenRender(mockRenderer, mockCamera, mockScene, 0, 100, false, null))
        .toThrow('Width and height must be positive');
      expect(() => service.prepareOffscreenRender(mockRenderer, mockCamera, mockScene, 100, -1, false, null))
        .toThrow('Width and height must be positive');
    });
  });

  describe('restoreRenderState', () => {
    it('should restore all original settings', () => {
      const mockBackground = 'original-background';
      const mockRenderer = {
        setClearAlpha: vi.fn(),
        setSize: vi.fn()
      };
      const mockCamera = {
        aspect: 0,
        updateProjectionMatrix: vi.fn()
      };
      const mockScene = {
        background: null
      };
      const mockToggleGrid = vi.fn();
      const originalSettings = {
        width: 800,
        height: 600,
        aspect: 800 / 600,
        alpha: 1,
        backgroundColor: mockBackground
      };

      service.restoreRenderState(
        mockRenderer,
        mockCamera,
        mockScene,
        originalSettings,
        true,
        mockToggleGrid
      );

      expect(mockRenderer.setSize).toHaveBeenCalledWith(800, 600);
      expect(mockCamera.aspect).toBeCloseTo(800 / 600);
      expect(mockCamera.updateProjectionMatrix).toHaveBeenCalled();
      expect(mockRenderer.setClearAlpha).toHaveBeenCalledWith(1);
      expect(mockScene.background).toBe(mockBackground);
      expect(mockToggleGrid).toHaveBeenCalledWith(true);
    });

    it('should not toggle grid if it was not visible', () => {
      const mockRenderer = {
        setClearAlpha: vi.fn(),
        setSize: vi.fn()
      };
      const mockCamera = {
        updateProjectionMatrix: vi.fn()
      };
      const mockScene = {};
      const mockToggleGrid = vi.fn();
      const originalSettings = {
        width: 800,
        height: 600,
        aspect: 1,
        alpha: 1,
        backgroundColor: null
      };

      service.restoreRenderState(
        mockRenderer,
        mockCamera,
        mockScene,
        originalSettings,
        false,
        mockToggleGrid
      );

      expect(mockToggleGrid).not.toHaveBeenCalled();
    });

    it('should throw error if parameters are missing', () => {
      expect(() => service.restoreRenderState(null, {}, {}, {}, false, null))
        .toThrow('All parameters are required for restoration');
    });
  });

  describe('captureFrame', () => {
    it('should render and capture frame as data URL', () => {
      const mockRenderer = {
        render: vi.fn(),
        domElement: {
          toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc123')
        }
      };
      const mockScene = {};
      const mockCamera = {};

      const dataURL = service.captureFrame(mockRenderer, mockScene, mockCamera);

      expect(mockRenderer.render).toHaveBeenCalledWith(mockScene, mockCamera);
      expect(mockRenderer.domElement.toDataURL).toHaveBeenCalledWith('image/png', 1.0);
      expect(dataURL).toBe('data:image/png;base64,abc123');
    });

    it('should support custom format and quality', () => {
      const mockRenderer = {
        render: vi.fn(),
        domElement: {
          toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,xyz789')
        }
      };

      service.captureFrame(mockRenderer, {}, {}, 'image/jpeg', 0.8);

      expect(mockRenderer.domElement.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    });

    it('should throw error if renderer is missing', () => {
      expect(() => service.captureFrame(null, {}, {}))
        .toThrow('Renderer, scene, and camera are required');
    });
  });

  describe('validateRenderingConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        renderer: {},
        camera: {},
        scene: {},
        width: 1920,
        height: 1080
      };

      const result = service.validateRenderingConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing renderer', () => {
      const config = {
        camera: {},
        scene: {},
        width: 100,
        height: 100
      };

      const result = service.validateRenderingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Renderer'))).toBe(true);
    });

    it('should detect invalid dimensions', () => {
      const config = {
        renderer: {},
        camera: {},
        scene: {},
        width: -100,
        height: 0
      };

      const result = service.validateRenderingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Width'))).toBe(true);
      expect(result.errors.some(e => e.includes('Height'))).toBe(true);
    });
  });

  describe('calculateAspectRatio', () => {
    it('should calculate correct aspect ratio', () => {
      expect(service.calculateAspectRatio(1920, 1080)).toBeCloseTo(16 / 9);
      expect(service.calculateAspectRatio(1280, 720)).toBeCloseTo(16 / 9);
      expect(service.calculateAspectRatio(800, 600)).toBeCloseTo(4 / 3);
    });

    it('should throw error for zero height', () => {
      expect(() => service.calculateAspectRatio(1920, 0))
        .toThrow('Height cannot be zero');
    });
  });
});
