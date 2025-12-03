import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileOperationsUIController } from '@renderer/modules/ui/controllers/FileOperationsUIController.js';

describe('FileOperationsUIController', () => {
  let controller;
  let mockDependencies;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="empty-state" class="hidden"></div>
      <div id="animation-list"></div>
      <div id="model-info"></div>
      <button id="btn-retarget"></button>
      <button id="btn-add-animation"></button>
      <button id="btn-save-project"></button>
      <button id="btn-export-model"></button>
      <button id="btn-export"></button>
      <button id="btn-capture"></button>
    `;

    // Mock dependencies
    mockDependencies = {
      modelLoader: {
        getCurrentModelData: vi.fn(),
        clearCurrentModel: vi.fn(),
      },
      projectManager: {
        saveProject: vi.fn(),
        loadProject: vi.fn(),
      },
      animationManager: {
        loadAnimations: vi.fn(),
      },
      textureManager: {
        clearTextures: vi.fn(),
      },
      sceneManager: {
        clearScene: vi.fn(),
        setBackgroundColor: vi.fn(),
      },
      notificationService: {
        showNotification: vi.fn(),
      },
      displayTextures: vi.fn(),
      clearTextureDisplay: vi.fn(),
    };

    controller = new FileOperationsUIController(mockDependencies);
  });

  describe('handleNewProject', () => {
    it('should clear scene, model, animations, and textures', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      global.confirm = vi.fn(() => true);

      // Act
      controller.handleNewProject();

      // Assert
      expect(mockDependencies.sceneManager.clearScene).toHaveBeenCalled();
      expect(mockDependencies.animationManager.loadAnimations).toHaveBeenCalledWith([]);
      expect(mockDependencies.modelLoader.clearCurrentModel).toHaveBeenCalled();
      expect(mockDependencies.textureManager.clearTextures).toHaveBeenCalled();
      expect(mockDependencies.clearTextureDisplay).toHaveBeenCalled();
    });

    it('should reset background color to default', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      global.confirm = vi.fn(() => true);

      // Act
      controller.handleNewProject();

      // Assert - clearScene should be called, which internally resets background
      expect(mockDependencies.sceneManager.clearScene).toHaveBeenCalled();
    });

    it('should show empty state overlay', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      global.confirm = vi.fn(() => true);
      const emptyState = document.getElementById('empty-state');
      emptyState.classList.add('hidden');

      // Act
      controller.handleNewProject();

      // Assert
      expect(emptyState.classList.contains('hidden')).toBe(false);
    });

    it('should disable project buttons', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      global.confirm = vi.fn(() => true);
      const buttons = [
        document.getElementById('btn-retarget'),
        document.getElementById('btn-add-animation'),
        document.getElementById('btn-save-project'),
        document.getElementById('btn-export'),
        document.getElementById('btn-capture'),
      ];
      buttons.forEach(btn => btn.disabled = false);

      // Act
      controller.handleNewProject();

      // Assert
      buttons.forEach(btn => {
        expect(btn.disabled).toBe(true);
      });
    });

    it('should reset animation list to empty state', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      global.confirm = vi.fn(() => true);
      const animationList = document.getElementById('animation-list');
      animationList.innerHTML = '<div>Some animations</div>';

      // Act
      controller.handleNewProject();

      // Assert
      expect(animationList.innerHTML).toContain('No model loaded');
    });

    it('should hide model info', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      global.confirm = vi.fn(() => true);
      const modelInfo = document.getElementById('model-info');
      modelInfo.style.display = 'block';

      // Act
      controller.handleNewProject();

      // Assert
      expect(modelInfo.style.display).toBe('none');
    });

    it('should show success notification', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      global.confirm = vi.fn(() => true);

      // Act
      controller.handleNewProject();

      // Assert
      expect(mockDependencies.notificationService.showNotification).toHaveBeenCalledWith(
        'New project started',
        'success'
      );
    });

    it('should skip confirmation if no content loaded', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      global.confirm = vi.fn(() => true);

      // Act
      controller.handleNewProject();

      // Assert
      expect(global.confirm).not.toHaveBeenCalled();
      expect(mockDependencies.sceneManager.clearScene).toHaveBeenCalled();
    });

    it('should show confirmation if content is loaded', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue({ model: {} });
      global.confirm = vi.fn(() => true);

      // Act
      controller.handleNewProject();

      // Assert
      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to start a new project? All unsaved changes will be lost.'
      );
      expect(mockDependencies.sceneManager.clearScene).toHaveBeenCalled();
    });

    it('should cancel new project if user declines confirmation', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue({ model: {} });
      global.confirm = vi.fn(() => false);

      // Act
      controller.handleNewProject();

      // Assert
      expect(mockDependencies.sceneManager.clearScene).not.toHaveBeenCalled();
      expect(mockDependencies.notificationService.showNotification).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      mockDependencies.sceneManager.clearScene.mockImplementation(() => {
        throw new Error('Clear scene failed');
      });
      global.confirm = vi.fn(() => true);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      controller.handleNewProject();

      // Assert
      expect(consoleError).toHaveBeenCalledWith('Error creating new project:', expect.any(Error));
      expect(mockDependencies.notificationService.showNotification).toHaveBeenCalledWith(
        'Failed to create new project: Clear scene failed',
        'error'
      );

      consoleError.mockRestore();
    });

    it('should handle missing empty-state element gracefully', () => {
      // Arrange
      mockDependencies.modelLoader.getCurrentModelData.mockReturnValue(null);
      document.getElementById('empty-state').remove();
      global.confirm = vi.fn(() => true);

      // Act & Assert - should not throw
      expect(() => controller.handleNewProject()).not.toThrow();
      expect(mockDependencies.sceneManager.clearScene).toHaveBeenCalled();
    });
  });

  describe('disableProjectButtons', () => {
    it('should disable all project-related buttons', () => {
      // Arrange
      const buttons = [
        document.getElementById('btn-retarget'),
        document.getElementById('btn-add-animation'),
        document.getElementById('btn-save-project'),
        document.getElementById('btn-export'),
        document.getElementById('btn-capture'),
      ];
      buttons.forEach(btn => btn.disabled = false);

      // Act
      controller.disableProjectButtons();

      // Assert
      buttons.forEach(btn => {
        expect(btn.disabled).toBe(true);
      });
    });
  });

  describe('enableProjectButtons', () => {
    it('should enable all project-related buttons', () => {
      // Arrange
      const buttons = [
        document.getElementById('btn-retarget'),
        document.getElementById('btn-add-animation'),
        document.getElementById('btn-save-project'),
        document.getElementById('btn-export-model'),
      ];
      buttons.forEach(btn => btn.disabled = true);

      // Act
      controller.enableProjectButtons();

      // Assert
      buttons.forEach(btn => {
        expect(btn.disabled).toBe(false);
      });
    });
  });
});
