import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SceneControlsUIController } from '../../../src/renderer/modules/ui/controllers/SceneControlsUIController.js';

describe('SceneControlsUIController', () => {
  let controller;
  let mockSceneManager;
  let mockCameraPresetManager;
  let mockNotificationService;
  let elements;

  beforeEach(() => {
    // Create mock DOM elements
    elements = {
      'bg-color': createMockElement('input'),
      'camera-preset': createMockElement('select'),
      'grid-toggle': createMockElement('input', 'checkbox'),
      'light-x': createMockElement('input', 'number', 0),
      'light-y': createMockElement('input', 'number', 5),
      'light-z': createMockElement('input', 'number', 10),
      'light-x-value': createMockElement('span'),
      'light-y-value': createMockElement('span'),
      'light-z-value': createMockElement('span'),
      'dir-light-intensity': createMockElement('input', 'range', 1),
      'dir-light-value': createMockElement('span'),
      'amb-light-intensity': createMockElement('input', 'range', 0.5),
      'amb-light-value': createMockElement('span'),
      'btn-save-camera-view': createMockElement('button'),
      'custom-camera-preset': createMockElement('select'),
      'btn-delete-camera-preset': createMockElement('button'),
      'save-camera-preset-modal': createMockElement('div'),
      'camera-preset-name': createMockElement('input'),
      'btn-confirm-save-camera-preset': createMockElement('button')
    };

    // Mock document.getElementById
    global.document.getElementById = vi.fn((id) => elements[id] || null);

    // Mock managers
    mockSceneManager = {
      setBackgroundColor: vi.fn(),
      applyCameraPreset: vi.fn(),
      toggleGrid: vi.fn(),
      updateLightPosition: vi.fn(),
      updateDirectionalLightIntensity: vi.fn(),
      updateAmbientLightIntensity: vi.fn(),
      getCurrentCameraState: vi.fn(() => ({ position: [0, 0, 5], target: [0, 0, 0] })),
      applyCameraState: vi.fn()
    };

    mockCameraPresetManager = {
      savePreset: vi.fn(),
      loadPreset: vi.fn(() => ({ position: [0, 0, 5], target: [0, 0, 0] })),
      deletePreset: vi.fn(),
      getAllPresets: vi.fn(() => ({})),
      getPresetNames: vi.fn(() => [])
    };

    mockNotificationService = {
      showNotification: vi.fn()
    };

    // Mock global confirm
    global.confirm = vi.fn(() => true);

    // Create controller
    controller = new SceneControlsUIController({
      sceneManager: mockSceneManager,
      cameraPresetManager: mockCameraPresetManager,
      notificationService: mockNotificationService
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper function to create mock elements
  function createMockElement(tag, type = 'text', value = '') {
    const listeners = {};
    return {
      tagName: tag.toUpperCase(),
      type: type,
      value: value,
      checked: false,
      textContent: '',
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn()
      },
      addEventListener: vi.fn((event, handler) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      }),
      removeEventListener: vi.fn(),
      trigger: (event, data = {}) => {
        if (listeners[event]) {
          listeners[event].forEach(handler => handler({ ...data, target: this, preventDefault: vi.fn() }));
        }
      },
      focus: vi.fn(),
      cloneNode: vi.fn(function() { return { ...this }; }),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => [])
    };
  }

  describe('Constructor', () => {
    it('should create controller with required dependencies', () => {
      expect(controller).toBeDefined();
      expect(controller.sceneManager).toBe(mockSceneManager);
      expect(controller.cameraPresetManager).toBe(mockCameraPresetManager);
      expect(controller.notificationService).toBe(mockNotificationService);
    });
  });

  describe('initEventListeners', () => {
    it('should initialize all event listeners', () => {
      controller.initEventListeners();

      expect(elements['bg-color'].addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(elements['camera-preset'].addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(elements['grid-toggle'].addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(elements['light-x'].addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(elements['light-y'].addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(elements['light-z'].addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(elements['dir-light-intensity'].addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(elements['amb-light-intensity'].addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(elements['btn-save-camera-view'].addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(elements['custom-camera-preset'].addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(elements['btn-delete-camera-preset'].addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('handleBackgroundColor', () => {
    it('should update scene background color', () => {
      const event = { target: { value: '#ff0000' } };
      controller.handleBackgroundColor(event);

      expect(mockSceneManager.setBackgroundColor).toHaveBeenCalledWith('#ff0000');
    });
  });

  describe('handleCameraPreset', () => {
    it('should apply camera preset', () => {
      const event = { target: { value: 'front' } };
      controller.handleCameraPreset(event);

      expect(mockSceneManager.applyCameraPreset).toHaveBeenCalledWith('front');
    });
  });

  describe('handleGridToggle', () => {
    it('should toggle grid on', () => {
      const event = { target: { checked: true } };
      controller.handleGridToggle(event);

      expect(mockSceneManager.toggleGrid).toHaveBeenCalledWith(true);
    });

    it('should toggle grid off', () => {
      const event = { target: { checked: false } };
      controller.handleGridToggle(event);

      expect(mockSceneManager.toggleGrid).toHaveBeenCalledWith(false);
    });
  });

  describe('handleLightPosition', () => {
    it('should update light position and display values', () => {
      elements['light-x'].value = '10';
      elements['light-y'].value = '15';
      elements['light-z'].value = '20';

      controller.handleLightPosition();

      expect(elements['light-x-value'].textContent).toBe(10);
      expect(elements['light-y-value'].textContent).toBe(15);
      expect(elements['light-z-value'].textContent).toBe(20);
      expect(mockSceneManager.updateLightPosition).toHaveBeenCalledWith(10, 15, 20);
    });

    it('should handle decimal values', () => {
      elements['light-x'].value = '5.5';
      elements['light-y'].value = '10.25';
      elements['light-z'].value = '15.75';

      controller.handleLightPosition();

      expect(mockSceneManager.updateLightPosition).toHaveBeenCalledWith(5.5, 10.25, 15.75);
    });
  });

  describe('handleDirectionalLightIntensity', () => {
    it('should update directional light intensity', () => {
      const event = { target: { value: '2.5' } };
      controller.handleDirectionalLightIntensity(event);

      expect(elements['dir-light-value'].textContent).toBe(2.5);
      expect(mockSceneManager.updateDirectionalLightIntensity).toHaveBeenCalledWith(2.5);
    });
  });

  describe('handleAmbientLightIntensity', () => {
    it('should update ambient light intensity', () => {
      const event = { target: { value: '0.8' } };
      controller.handleAmbientLightIntensity(event);

      expect(elements['amb-light-value'].textContent).toBe(0.8);
      expect(mockSceneManager.updateAmbientLightIntensity).toHaveBeenCalledWith(0.8);
    });
  });

  describe('Camera Preset Management', () => {
    describe('handleSaveCameraView', () => {
      it('should open save camera preset modal', () => {
        controller.handleSaveCameraView();

        expect(elements['save-camera-preset-modal'].classList.add).toHaveBeenCalledWith('is-active');
        expect(elements['camera-preset-name'].value).toBe('');
      });
    });

    describe('handleConfirmSaveCameraPreset', () => {
      it('should save camera preset with valid name', () => {
        elements['camera-preset-name'].value = 'My View';

        controller.handleConfirmSaveCameraPreset();

        expect(mockSceneManager.getCurrentCameraState).toHaveBeenCalled();
        expect(mockCameraPresetManager.savePreset).toHaveBeenCalledWith(
          'My View',
          expect.objectContaining({ position: expect.any(Array) })
        );
        expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
          'Camera preset "My View" saved',
          'success'
        );
        expect(elements['save-camera-preset-modal'].classList.remove).toHaveBeenCalledWith('is-active');
      });

      it('should show warning if name is empty', () => {
        elements['camera-preset-name'].value = '';

        controller.handleConfirmSaveCameraPreset();

        expect(mockCameraPresetManager.savePreset).not.toHaveBeenCalled();
        expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
          'Please enter a preset name',
          'warning'
        );
      });

      it('should show error if camera state unavailable', () => {
        elements['camera-preset-name'].value = 'My View';
        mockSceneManager.getCurrentCameraState.mockReturnValue(null);

        controller.handleConfirmSaveCameraPreset();

        expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
          'Unable to capture camera state',
          'error'
        );
      });

      it('should trim whitespace from name', () => {
        elements['camera-preset-name'].value = '  My View  ';

        controller.handleConfirmSaveCameraPreset();

        expect(mockCameraPresetManager.savePreset).toHaveBeenCalledWith(
          'My View',
          expect.any(Object)
        );
      });
    });

    describe('handleLoadCustomPreset', () => {
      it('should load custom camera preset', () => {
        const event = { target: { value: 'My View' } };

        controller.handleLoadCustomPreset(event);

        expect(mockCameraPresetManager.loadPreset).toHaveBeenCalledWith('My View');
        expect(mockSceneManager.applyCameraState).toHaveBeenCalledWith(
          expect.objectContaining({ position: expect.any(Array) })
        );
        expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
          'Loaded preset "My View"',
          'success'
        );
        expect(elements['btn-delete-camera-preset'].disabled).toBe(false);
      });

      it('should not load if no preset selected', () => {
        const event = { target: { value: '' } };

        controller.handleLoadCustomPreset(event);

        expect(mockCameraPresetManager.loadPreset).not.toHaveBeenCalled();
      });

      it('should show error if preset not found', () => {
        const event = { target: { value: 'My View' } };
        mockCameraPresetManager.loadPreset.mockReturnValue(null);

        controller.handleLoadCustomPreset(event);

        expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
          'Preset "My View" not found',
          'error'
        );
      });
    });

    describe('handleDeleteCameraPreset', () => {
      it('should delete selected camera preset after confirmation', () => {
        elements['custom-camera-preset'].value = 'My View';
        mockCameraPresetManager.getAllPresets.mockReturnValue({});

        controller.handleDeleteCameraPreset();

        expect(global.confirm).toHaveBeenCalledWith('Delete camera preset "My View"?');
        expect(mockCameraPresetManager.deletePreset).toHaveBeenCalledWith('My View');
        expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
          'Deleted preset "My View"',
          'success'
        );
        expect(elements['btn-delete-camera-preset'].disabled).toBe(true);
      });

      it('should not delete if no preset selected', () => {
        elements['custom-camera-preset'].value = '';

        controller.handleDeleteCameraPreset();

        expect(mockCameraPresetManager.deletePreset).not.toHaveBeenCalled();
        expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
          'No preset selected',
          'warning'
        );
      });

      it('should not delete if user cancels confirmation', () => {
        elements['custom-camera-preset'].value = 'My View';
        global.confirm = vi.fn(() => false);

        controller.handleDeleteCameraPreset();

        expect(mockCameraPresetManager.deletePreset).not.toHaveBeenCalled();
      });
    });

    describe('refreshCustomCameraPresets', () => {
      it('should populate dropdown with saved presets', () => {
        mockCameraPresetManager.getAllPresets.mockReturnValue({
          'View 1': {},
          'View 2': {},
          'View 3': {}
        });
        elements['custom-camera-preset'].appendChild = vi.fn();

        controller.refreshCustomCameraPresets();

        expect(elements['custom-camera-preset'].innerHTML).toContain('Load Custom Preset...');
        expect(elements['custom-camera-preset'].appendChild).toHaveBeenCalledTimes(3);
      });

      it('should reset selection and disable delete button', () => {
        mockCameraPresetManager.getAllPresets.mockReturnValue({ 'View 1': {} });
        elements['custom-camera-preset'].appendChild = vi.fn();
        elements['custom-camera-preset'].value = '';

        controller.refreshCustomCameraPresets();

        expect(elements['btn-delete-camera-preset'].disabled).toBe(true);
      });

      it('should handle empty preset list', () => {
        mockCameraPresetManager.getAllPresets.mockReturnValue({});
        elements['custom-camera-preset'].appendChild = vi.fn();

        controller.refreshCustomCameraPresets();

        expect(elements['custom-camera-preset'].innerHTML).toContain('Load Custom Preset...');
        expect(elements['custom-camera-preset'].appendChild).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing DOM elements gracefully during init', () => {
      // Create mock elements that return null for addEventListener
      const safeGetElement = vi.fn((id) => {
        const element = {
          addEventListener: vi.fn()
        };
        return element;
      });
      global.document.getElementById = safeGetElement;
      
      const newController = new SceneControlsUIController({
        sceneManager: mockSceneManager,
        cameraPresetManager: mockCameraPresetManager,
        notificationService: mockNotificationService
      });

      expect(() => newController.initEventListeners()).not.toThrow();
    });

    it('should handle invalid light position values', () => {
      elements['light-x'].value = 'invalid';
      elements['light-y'].value = 'NaN';
      elements['light-z'].value = '';

      controller.handleLightPosition();

      expect(mockSceneManager.updateLightPosition).toHaveBeenCalledWith(NaN, NaN, NaN);
    });

    it('should handle zero light intensity values', () => {
      const event = { target: { value: '0' } };
      controller.handleDirectionalLightIntensity(event);

      expect(mockSceneManager.updateDirectionalLightIntensity).toHaveBeenCalledWith(0);
    });

    it('should handle negative light position values', () => {
      elements['light-x'].value = '-10';
      elements['light-y'].value = '-5';
      elements['light-z'].value = '-15';

      controller.handleLightPosition();

      expect(mockSceneManager.updateLightPosition).toHaveBeenCalledWith(-10, -5, -15);
    });
  });
});
