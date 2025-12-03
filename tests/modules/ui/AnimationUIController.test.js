import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnimationUIController } from '../../../src/renderer/modules/ui/controllers/AnimationUIController.js';

describe('AnimationUIController', () => {
  let controller;
  let mockModelLoader;
  let mockAnimationManager;
  let mockNotificationService;
  let mockDocument;

  beforeEach(() => {
    // Mock dependencies
    mockModelLoader = {
      loadAnimationFile: vi.fn(),
      getCurrentModelData: vi.fn(),
      verifyBoneStructureCompatibility: vi.fn()
    };

    mockAnimationManager = {
      addAnimations: vi.fn()
    };

    mockNotificationService = {
      showNotification: vi.fn()
    };

    // Create controller
    controller = new AnimationUIController({
      modelLoader: mockModelLoader,
      animationManager: mockAnimationManager,
      notificationService: mockNotificationService
    });

    // Setup DOM mocks
    setupDOMMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupDOMMocks() {
    // Create mock DOM elements
    mockDocument = {
      elements: {
        'btn-load-animation-file': { addEventListener: vi.fn() },
        'btn-add-selected-animations': { 
          addEventListener: vi.fn(),
          disabled: false 
        },
        'anim-file-name': { textContent: '' },
        'anim-file-count': { textContent: '' },
        'anim-file-bones': { textContent: '' },
        'animation-file-info': { style: { display: 'none' } },
        'bone-verification-result': { innerHTML: '' },
        'animation-selection-container': { style: { display: 'none' } },
        'animation-selection-list': { 
          innerHTML: '', 
          appendChild: vi.fn(),
          querySelectorAll: vi.fn(() => [])
        },
        'add-animation-modal': { 
          classList: { add: vi.fn(), remove: vi.fn() }
        }
      }
    };

  global.document = {
    getElementById: vi.fn((id) => mockDocument.elements[id] || null),
    querySelectorAll: vi.fn(() => []),
    querySelector: vi.fn((selector) => {
      // Mock rename inputs for animation selection
      if (selector.includes('.animation-rename-input')) {
        return { value: '' };
      }
      return null;
    }),
    createElement: vi.fn((tag) => ({
      className: '',
      innerHTML: '',
      style: {},
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      getAttribute: vi.fn(),
      setAttribute: vi.fn(),
      querySelectorAll: vi.fn(() => [])
    }))
  };    global.window = {
      electronAPI: {
        openModelDialog: vi.fn()
      }
    };
  }

  describe('Constructor', () => {
    it('should initialize with dependencies', () => {
      expect(controller.modelLoader).toBe(mockModelLoader);
      expect(controller.animationManager).toBe(mockAnimationManager);
      expect(controller.notificationService).toBe(mockNotificationService);
    });

    it('should initialize loadedAnimationData as null', () => {
      expect(controller.loadedAnimationData).toBeNull();
    });
  });

  describe('initEventListeners', () => {
    it('should add click event listeners to buttons', () => {
      controller.initEventListeners();

      expect(mockDocument.elements['btn-load-animation-file'].addEventListener)
        .toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockDocument.elements['btn-add-selected-animations'].addEventListener)
        .toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('handleLoadAnimationFile', () => {
    it('should load animation file successfully', async () => {
      const mockFileData = {
        data: new ArrayBuffer(100),
        extension: '.fbx',
        name: 'test-animation.fbx'
      };

      const mockAnimationData = {
        animations: [{ name: 'Walk' }, { name: 'Run' }],
        boneNames: ['Hips', 'Spine', 'Head'],
        skeletons: [{ bones: [{}] }]
      };

      const mockVerification = {
        matchPercentage: 95,
        message: 'Compatible',
        sourceBoneCount: 3,
        targetBoneCount: 3,
        missingBones: [],
        extraBones: []
      };

      window.electronAPI.openModelDialog.mockResolvedValue(mockFileData);
      mockModelLoader.loadAnimationFile.mockResolvedValue(mockAnimationData);
      mockModelLoader.getCurrentModelData.mockReturnValue({ skeletons: [{}] });
      mockModelLoader.verifyBoneStructureCompatibility.mockReturnValue(mockVerification);

      await controller.handleLoadAnimationFile();

      expect(mockModelLoader.loadAnimationFile).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        'fbx',
        'test-animation.fbx'
      );
      expect(controller.loadedAnimationData).toBeTruthy();
      expect(controller.loadedAnimationData.fileName).toBe('test-animation.fbx');
      expect(mockDocument.elements['anim-file-name'].textContent).toBe('test-animation.fbx');
      expect(mockDocument.elements['anim-file-count'].textContent).toBe(2);
      expect(mockDocument.elements['anim-file-bones'].textContent).toBe(3);
    });

    it('should handle file dialog cancellation', async () => {
      window.electronAPI.openModelDialog.mockResolvedValue(null);

      await controller.handleLoadAnimationFile();

      expect(mockModelLoader.loadAnimationFile).not.toHaveBeenCalled();
    });

    it('should show error notification on failure', async () => {
      const error = new Error('Failed to load');
      window.electronAPI.openModelDialog.mockRejectedValue(error);

      await controller.handleLoadAnimationFile();

      expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
        'Failed to load animation file: Failed to load',
        'error'
      );
    });

    it('should disable add button if match percentage < 90%', async () => {
      const mockFileData = {
        data: new ArrayBuffer(100),
        extension: '.fbx',
        name: 'test.fbx'
      };

      const mockAnimationData = {
        animations: [{ name: 'Walk' }],
        boneNames: ['Hips'],
        skeletons: [{}]
      };

      const mockVerification = {
        matchPercentage: 75,
        message: 'Low compatibility',
        sourceBoneCount: 10,
        targetBoneCount: 5,
        missingBones: ['Bone1', 'Bone2'],
        extraBones: []
      };

      window.electronAPI.openModelDialog.mockResolvedValue(mockFileData);
      mockModelLoader.loadAnimationFile.mockResolvedValue(mockAnimationData);
      mockModelLoader.getCurrentModelData.mockReturnValue({ skeletons: [{}] });
      mockModelLoader.verifyBoneStructureCompatibility.mockReturnValue(mockVerification);

      await controller.handleLoadAnimationFile();

      expect(mockDocument.elements['btn-add-selected-animations'].disabled).toBe(true);
      expect(mockDocument.elements['animation-selection-container'].style.display).toBe('none');
    });

    it('should enable add button if match percentage >= 90%', async () => {
      const mockFileData = {
        data: new ArrayBuffer(100),
        extension: '.fbx',
        name: 'test.fbx'
      };

      const mockAnimationData = {
        animations: [{ name: 'Walk' }],
        boneNames: ['Hips'],
        skeletons: [{}]
      };

      const mockVerification = {
        matchPercentage: 95,
        message: 'Compatible',
        sourceBoneCount: 10,
        targetBoneCount: 10,
        missingBones: [],
        extraBones: []
      };

      window.electronAPI.openModelDialog.mockResolvedValue(mockFileData);
      mockModelLoader.loadAnimationFile.mockResolvedValue(mockAnimationData);
      mockModelLoader.getCurrentModelData.mockReturnValue({ skeletons: [{}] });
      mockModelLoader.verifyBoneStructureCompatibility.mockReturnValue(mockVerification);

      await controller.handleLoadAnimationFile();

      expect(mockDocument.elements['btn-add-selected-animations'].disabled).toBe(false);
    });
  });

  describe('displayBoneVerification', () => {
    it('should display success for match >= 90%', () => {
      const verification = {
        matchPercentage: 95,
        message: 'Compatible',
        sourceBoneCount: 10,
        targetBoneCount: 10,
        missingBones: [],
        extraBones: []
      };

      controller.displayBoneVerification(verification);

      const html = mockDocument.elements['bone-verification-result'].innerHTML;
      expect(html).toContain('✓');
      expect(html).toContain('95%');
      expect(html).toContain('is-success');
    });

    it('should display warning for match between 70-90%', () => {
      const verification = {
        matchPercentage: 80,
        message: 'Moderate compatibility',
        sourceBoneCount: 10,
        targetBoneCount: 8,
        missingBones: ['Bone1'],
        extraBones: []
      };

      controller.displayBoneVerification(verification);

      const html = mockDocument.elements['bone-verification-result'].innerHTML;
      expect(html).toContain('⚠');
      expect(html).toContain('80%');
    });

    it('should display error for match < 70%', () => {
      const verification = {
        matchPercentage: 50,
        message: 'Incompatible',
        sourceBoneCount: 10,
        targetBoneCount: 5,
        missingBones: ['Bone1', 'Bone2'],
        extraBones: ['Bone3']
      };

      controller.displayBoneVerification(verification);

      const html = mockDocument.elements['bone-verification-result'].innerHTML;
      expect(html).toContain('✗');
      expect(html).toContain('50%');
      expect(html).toContain('is-danger');
    });

    it('should show retarget guidance for match < 90%', () => {
      const verification = {
        matchPercentage: 85,
        message: 'Low compatibility',
        sourceBoneCount: 10,
        targetBoneCount: 9,
        missingBones: [],
        extraBones: []
      };

      controller.displayBoneVerification(verification);

      const html = mockDocument.elements['bone-verification-result'].innerHTML;
      expect(html).toContain('Retarget Animation');
      expect(html).toContain('below 90%');
    });

    it('should display missing bones list', () => {
      const verification = {
        matchPercentage: 70,
        message: 'Some bones missing',
        sourceBoneCount: 5,
        targetBoneCount: 3,
        missingBones: ['Bone1', 'Bone2', 'Bone3'],
        extraBones: []
      };

      controller.displayBoneVerification(verification);

      const html = mockDocument.elements['bone-verification-result'].innerHTML;
      expect(html).toContain('Missing Bones (3)');
      expect(html).toContain('Bone1');
      expect(html).toContain('Bone2');
    });

    it('should display extra bones list', () => {
      const verification = {
        matchPercentage: 100,
        message: 'Compatible with extra bones',
        sourceBoneCount: 3,
        targetBoneCount: 5,
        missingBones: [],
        extraBones: ['ExtraBone1', 'ExtraBone2']
      };

      controller.displayBoneVerification(verification);

      const html = mockDocument.elements['bone-verification-result'].innerHTML;
      expect(html).toContain('Extra Bones in Animation (2)');
      expect(html).toContain('ExtraBone1');
    });
  });

  describe('displayAnimationSelection', () => {
    it('should display animation checkboxes', () => {
      const animations = [
        { name: 'Walk', duration: 2.0 },
        { name: 'Run', duration: 1.5 }
      ];

      const container = mockDocument.elements['animation-selection-list'];
      controller.displayAnimationSelection(animations);

      // Check that appendChild was called for each animation
      expect(container.appendChild).toHaveBeenCalledTimes(2);
      
      // Check that container.querySelectorAll was called (for event listeners)
      expect(container.querySelectorAll).toHaveBeenCalledWith('.animation-checkbox');
    });

    it('should show message for empty animation list', () => {
      controller.displayAnimationSelection([]);

      const html = mockDocument.elements['animation-selection-list'].innerHTML;
      expect(html).toContain('No animations found');
    });

    it('should show message for null animations', () => {
      controller.displayAnimationSelection(null);

      const html = mockDocument.elements['animation-selection-list'].innerHTML;
      expect(html).toContain('No animations found');
      expect(mockDocument.elements['animation-selection-container'].style.display).toBe('none');
    });
  });

  describe('handleAddSelectedAnimations', () => {
    beforeEach(() => {
      controller.loadedAnimationData = {
        animations: [
          { name: 'Walk', duration: 2.0 },
          { name: 'Run', duration: 1.5 }
        ],
        fileName: 'test.fbx'
      };
    });

    it('should add selected animations', async () => {
      const mockCheckedCheckbox = { 
        checked: true, 
        value: '0',
        getAttribute: vi.fn((attr) => attr === 'data-index' ? '0' : null)
      };

      // :checked selector returns only checked checkboxes
      document.querySelectorAll.mockReturnValue([mockCheckedCheckbox]);
      mockAnimationManager.addAnimations.mockReturnValue(1);

      await controller.handleAddSelectedAnimations();

      expect(mockAnimationManager.addAnimations).toHaveBeenCalledWith(
        [controller.loadedAnimationData.animations[0]]
      );
      expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
        'Successfully added 1 animation(s)! Total animations: 1',
        'success'
      );
    });

    it('should show error if no animations selected', async () => {
      const mockCheckboxes = [
        { 
          checked: false, 
          value: '0',
          getAttribute: vi.fn((attr) => attr === 'data-index' ? '0' : null)
        },
        { 
          checked: false, 
          value: '1',
          getAttribute: vi.fn((attr) => attr === 'data-index' ? '1' : null)
        }
      ];

      document.querySelectorAll.mockReturnValue([]);  // :checked selector returns empty

      await controller.handleAddSelectedAnimations();

      expect(mockAnimationManager.addAnimations).not.toHaveBeenCalled();
      expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
        'Please select at least one animation',
        'warning'
      );
    });

    it('should show error if no animation data loaded', async () => {
      controller.loadedAnimationData = null;

      await controller.handleAddSelectedAnimations();

      expect(mockAnimationManager.addAnimations).not.toHaveBeenCalled();
      expect(mockNotificationService.showNotification).toHaveBeenCalledWith(
        'No animation data loaded',
        'error'
      );
    });

    it('should add animations successfully when selected', async () => {
      const mockCheckboxes = [
        { 
          checked: true, 
          value: '0',
          getAttribute: vi.fn((attr) => attr === 'data-index' ? '0' : null)
        }
      ];

      document.querySelectorAll.mockReturnValue(mockCheckboxes);
      mockAnimationManager.addAnimations.mockReturnValue(1);

      await controller.handleAddSelectedAnimations();

      expect(mockAnimationManager.addAnimations).toHaveBeenCalledWith(
        [controller.loadedAnimationData.animations[0]]
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle animation data with no fileName', async () => {
      controller.loadedAnimationData = {
        animations: [{ name: 'Walk' }]
        // fileName is missing
      };

      const mockCheckboxes = [{ 
        checked: true, 
        value: '0',
        getAttribute: vi.fn((attr) => attr === 'data-index' ? '0' : null)
      }];
      document.querySelectorAll.mockReturnValue(mockCheckboxes);
      mockAnimationManager.addAnimations.mockResolvedValue(undefined);

      await controller.handleAddSelectedAnimations();

      // Should still work, just without filename in message
      expect(mockAnimationManager.addAnimations).toHaveBeenCalled();
    });

    it('should handle verification with both missing and extra bones', () => {
      const verification = {
        matchPercentage: 75,
        message: 'Mixed compatibility',
        sourceBoneCount: 10,
        targetBoneCount: 10,
        missingBones: ['Missing1', 'Missing2'],
        extraBones: ['Extra1', 'Extra2']
      };

      controller.displayBoneVerification(verification);

      const html = mockDocument.elements['bone-verification-result'].innerHTML;
      expect(html).toContain('Missing Bones (2)');
      expect(html).toContain('Extra Bones in Animation (2)');
    });
  });
});
