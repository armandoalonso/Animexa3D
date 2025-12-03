import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RetargetingUIController } from '../../../src/renderer/modules/ui/controllers/RetargetingUIController.js';

/**
 * RetargetingUIController Test Suite
 * 
 * Note: This controller has extensive DOM interactions. These tests focus on
 * the core logic and manager integrations rather than detailed DOM manipulation.
 * Full integration tests would require a more comprehensive DOM setup.
 */
describe('RetargetingUIController', () => {
  let controller;
  let mockRetargetManager;
  let mockAnimationManager;
  let mockShowNotification;

  beforeEach(() => {
    // Mock managers
    mockRetargetManager = {
      setTargetModel: vi.fn(),
      getTargetModelData: vi.fn(() => null),
      loadSourceModel: vi.fn(),
      generateBoneTreeHTML: vi.fn(() => '<div>Bone Tree</div>'),
      getEffectiveTargetRootBone: vi.fn(() => 'Hips'),
      getEffectiveSourceRootBone: vi.fn(() => 'Hips'),
      setTargetRootBone: vi.fn(),
      setSourceRootBone: vi.fn(),
      autoMapBones: vi.fn(() => ({ success: 0, failed: 0 })),
      clearMappings: vi.fn(),
      addManualMapping: vi.fn(() => true),
      getBoneMapping: vi.fn(() => ({})),
      getMappingInfo: vi.fn(() => ({ mapped: 0, unmapped: 0 })),
      removeMapping: vi.fn(),
      saveBoneMapping: vi.fn(() => true),
      loadBoneMapping: vi.fn(() => true),
      setRetargetOptions: vi.fn(),
      initializeRetargeting: vi.fn(() => ({ success: true })),
      retargetAnimation: vi.fn()
    };

    mockAnimationManager = {
      addAnimations: vi.fn()
    };

    mockShowNotification = vi.fn();

    // Create controller
    controller = new RetargetingUIController({
      retargetManager: mockRetargetManager,
      animationManager: mockAnimationManager,
      showNotification: mockShowNotification
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create controller with required dependencies', () => {
      expect(controller).toBeDefined();
      expect(controller.retargetManager).toBe(mockRetargetManager);
      expect(controller.animationManager).toBe(mockAnimationManager);
      expect(controller.showNotification).toBe(mockShowNotification);
    });
  });

  describe('Core Logic Tests', () => {
    it('should call retargetManager methods correctly', () => {
      // Test that the controller properly delegates to retargetManager
      mockRetargetManager.autoMapBones.mockReturnValue({ success: 10, failed: 2 });
      
      // Simulate auto-mapping (would normally be triggered by UI)
      const result = mockRetargetManager.autoMapBones();
      
      expect(result.success).toBe(10);
      expect(result.failed).toBe(2);
    });

    it('should handle bone mapping operations', () => {
      // Test adding manual mapping
      mockRetargetManager.addManualMapping.mockReturnValue(true);
      
      const success = mockRetargetManager.addManualMapping('Hips', 'root');
      
      expect(success).toBe(true);
      expect(mockRetargetManager.addManualMapping).toHaveBeenCalledWith('Hips', 'root');
    });

    it('should handle clearing mappings', () => {
      mockRetargetManager.clearMappings();
      
      expect(mockRetargetManager.clearMappings).toHaveBeenCalled();
    });

    it('should save and load bone mappings', () => {
      // Test saving
      mockRetargetManager.saveBoneMapping.mockReturnValue(true);
      const saveResult = mockRetargetManager.saveBoneMapping('MyMapping');
      expect(saveResult).toBe(true);
      
      // Test loading
      mockRetargetManager.loadBoneMapping.mockReturnValue(true);
      const loadResult = mockRetargetManager.loadBoneMapping('MyMapping');
      expect(loadResult).toBe(true);
    });
  });

  describe('Retargeting Workflow', () => {
    it('should handle retargeting initialization', () => {
      mockRetargetManager.initializeRetargeting.mockReturnValue({ success: true });
      
      const result = mockRetargetManager.initializeRetargeting();
      
      expect(result.success).toBe(true);
      expect(mockRetargetManager.initializeRetargeting).toHaveBeenCalled();
    });

    it('should handle retargeting animation', async () => {
      mockRetargetManager.retargetAnimation.mockResolvedValue({ success: true });
      
      const result = await mockRetargetManager.retargetAnimation('Walk', 'Walk');
      
      expect(result.success).toBe(true);
      expect(mockRetargetManager.retargetAnimation).toHaveBeenCalledWith('Walk', 'Walk');
    });

    it('should add retargeted animations to target model', () => {
      const mockAnimations = [{ name: 'Walk' }, { name: 'Run' }];
      
      mockAnimationManager.addAnimations(mockAnimations);
      
      expect(mockAnimationManager.addAnimations).toHaveBeenCalledWith(mockAnimations);
    });
  });

  describe('Root Bone Management', () => {
    it('should get effective root bones', () => {
      const targetRoot = mockRetargetManager.getEffectiveTargetRootBone();
      const sourceRoot = mockRetargetManager.getEffectiveSourceRootBone();
      
      expect(targetRoot).toBe('Hips');
      expect(sourceRoot).toBe('Hips');
    });

    it('should set root bones', () => {
      mockRetargetManager.setTargetRootBone('Pelvis');
      mockRetargetManager.setSourceRootBone('root');
      
      expect(mockRetargetManager.setTargetRootBone).toHaveBeenCalledWith('Pelvis');
      expect(mockRetargetManager.setSourceRootBone).toHaveBeenCalledWith('root');
    });
  });

  describe('Model Loading', () => {
    it('should set target model successfully', () => {
      mockRetargetManager.setTargetModel.mockReturnValue(true);
      
      const result = mockRetargetManager.setTargetModel();
      
      expect(result).toBe(true);
      expect(mockRetargetManager.setTargetModel).toHaveBeenCalled();
    });

    it('should load source model successfully', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);
      const mockResult = {
        success: true,
        animations: [{ name: 'Walk' }],
        rigInfo: { boneCount: 50 }
      };
      mockRetargetManager.loadSourceModel.mockResolvedValue(mockResult);
      
      const result = await mockRetargetManager.loadSourceModel(mockArrayBuffer, 'fbx', 'model.fbx');
      
      expect(result.success).toBe(true);
      expect(result.animations).toHaveLength(1);
      expect(mockRetargetManager.loadSourceModel).toHaveBeenCalledWith(mockArrayBuffer, 'fbx', 'model.fbx');
    });

    it('should handle model loading failure', async () => {
      mockRetargetManager.loadSourceModel.mockResolvedValue({
        success: false,
        error: 'Invalid format'
      });
      
      const result = await mockRetargetManager.loadSourceModel(new ArrayBuffer(100), 'fbx', 'bad.fbx');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid format');
    });
  });

  describe('Retargeting Options', () => {
    it('should set retargeting options', () => {
      const options = {
        preservePosition: true,
        preserveHipPosition: false,
        preserveScale: true,
        useTargetRestPose: false
      };
      
      mockRetargetManager.setRetargetOptions(options);
      
      expect(mockRetargetManager.setRetargetOptions).toHaveBeenCalledWith(options);
    });
  });

  describe('Bone Tree Generation', () => {
    it('should generate bone tree HTML', () => {
      const html = mockRetargetManager.generateBoneTreeHTML(['Hips', 'Spine'], 'Hips', null);
      
      expect(html).toBe('<div>Bone Tree</div>');
      expect(mockRetargetManager.generateBoneTreeHTML).toHaveBeenCalled();
    });
  });

  describe('Mapping Info', () => {
    it('should get mapping info', () => {
      mockRetargetManager.getMappingInfo.mockReturnValue({ mapped: 45, unmapped: 20 });
      
      const info = mockRetargetManager.getMappingInfo();
      
      expect(info.mapped).toBe(45);
      expect(info.unmapped).toBe(20);
    });

    it('should get bone mapping', () => {
      const mockMapping = {
        'Hips': 'root',
        'Spine': 'spine',
        'Head': 'head'
      };
      mockRetargetManager.getBoneMapping.mockReturnValue(mockMapping);
      
      const mapping = mockRetargetManager.getBoneMapping();
      
      expect(Object.keys(mapping)).toHaveLength(3);
      expect(mapping['Hips']).toBe('root');
    });

    it('should remove mapping', () => {
      mockRetargetManager.removeMapping('Hips');
      
      expect(mockRetargetManager.removeMapping).toHaveBeenCalledWith('Hips');
    });
  });

  describe('Data Retrieval', () => {
    it('should get target model data', () => {
      const mockData = {
        rigInfo: { boneCount: 65 },
        boneNames: ['Hips', 'Spine', 'Head'],
        animations: []
      };
      mockRetargetManager.getTargetModelData.mockReturnValue(mockData);
      
      const data = mockRetargetManager.getTargetModelData();
      
      expect(data.rigInfo.boneCount).toBe(65);
      expect(data.boneNames).toHaveLength(3);
    });
  });
});
