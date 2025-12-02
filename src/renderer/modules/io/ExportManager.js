import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { FrameExportService } from './services/FrameExportService.js';
import { ExportConfigService } from './services/ExportConfigService.js';
import { ModelExportService } from './services/ModelExportService.js';
import { RenderingService } from './services/RenderingService.js';
import { ExportUIAdapter } from './adapters/ExportUIAdapter.js';

export class ExportManager {
  constructor(sceneManager, animationManager, uiManager = null) {
    this.sceneManager = sceneManager;
    this.animationManager = animationManager;
    this.isExporting = false;
    this.cancelExport = false;
    this.exportFolder = null;
    this.gltfExporter = new GLTFExporter();
    
    // Initialize services
    this.frameExportService = new FrameExportService();
    this.configService = new ExportConfigService();
    this.modelExportService = new ModelExportService();
    this.renderingService = new RenderingService();
    this.uiAdapter = new ExportUIAdapter(uiManager);
  }
  
  // Deprecated: Use configService.getTimestamp() instead
  // Kept for backward compatibility
  getTimestamp() {
    return this.configService.getTimestamp();
  }
  
  async captureCurrentFrame(config) {
    // Validate configuration
    const validation = this.configService.validateExportConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const { resolution, folder, transparentBackground } = config;
    const { width, height } = this.configService.parseResolution(resolution);
    
    // Get rendering dependencies
    const renderer = this.sceneManager.getRenderer();
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();
    const toggleGrid = (visible) => this.sceneManager.toggleGrid(visible);
    
    // Prepare offscreen rendering
    const originalSettings = this.renderingService.prepareOffscreenRender(
      renderer,
      camera,
      scene,
      width,
      height,
      transparentBackground,
      toggleGrid
    );
    
    try {
      // Capture frame
      const dataURL = this.renderingService.captureFrame(renderer, scene, camera);
      
      // Create snapshots subfolder with timestamp filename
      const timestamp = this.configService.getTimestamp();
      const subfolder = 'snapshots';
      const filename = `${timestamp}.png`;
      
      // Save frame via IPC
      const result = await window.electronAPI.saveFrame(folder, filename, dataURL, subfolder);
      
      if (!result.success) {
        throw new Error(`Failed to save frame: ${result.error}`);
      }
      
      return result;
      
    } finally {
      // Restore original renderer settings
      const gridWasVisible = this.sceneManager.gridVisible;
      this.renderingService.restoreRenderState(
        renderer,
        camera,
        scene,
        originalSettings,
        gridWasVisible,
        toggleGrid
      );
    }
  }
  
  async startExport(config) {
    if (this.isExporting) return;
    
    this.isExporting = true;
    this.cancelExport = false;
    
    // Validate configuration
    const validation = this.configService.validateExportConfig(config);
    if (!validation.valid) {
      this.uiAdapter.showExportError(validation.errors.join(', '));
      this.isExporting = false;
      return;
    }

    const { resolution, fps, folder, transparentBackground } = config;
    const { width, height } = this.configService.parseResolution(resolution);
    
    // Get current animation
    const currentAction = this.animationManager.getCurrentAction();
    if (!currentAction) {
      this.uiAdapter.showNoAnimationError();
      this.isExporting = false;
      return;
    }
    
    const clip = currentAction.getClip();
    const duration = clip.duration;
    
    // Calculate export parameters
    const frameCount = this.frameExportService.calculateExportFrames(duration, fps);
    const timeStep = this.frameExportService.calculateTimeStep(fps);
    
    // Show progress modal
    this.uiAdapter.showProgressModal();
    
    // Create subfolder with timestamp for this export batch
    const timestamp = this.configService.getTimestamp();
    const subfolder = timestamp;
    
    // Get rendering dependencies
    const renderer = this.sceneManager.getRenderer();
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();
    const mixer = this.sceneManager.getMixer();
    const toggleGrid = (visible) => this.sceneManager.toggleGrid(visible);
    
    // Prepare offscreen rendering
    const originalSettings = this.renderingService.prepareOffscreenRender(
      renderer,
      camera,
      scene,
      width,
      height,
      transparentBackground,
      toggleGrid
    );
    
    try {
      const startTime = Date.now();
      
      for (let i = 0; i <= frameCount; i++) {
        if (this.cancelExport) {
          this.uiAdapter.showExportCancelled();
          break;
        }
        
        // Calculate time for this frame
        const time = this.frameExportService.calculateFrameTime(i, fps);
        
        // Update animation to this time
        if (mixer) {
          currentAction.paused = false;
          currentAction.time = time;
          mixer.update(0);
        }
        
        // Capture frame
        const dataURL = this.renderingService.captureFrame(renderer, scene, camera);
        
        // Generate filename
        const filename = this.frameExportService.generateFrameFilename(i, 'png');
        
        // Save frame via IPC with subfolder
        const result = await window.electronAPI.saveFrame(folder, filename, dataURL, subfolder);
        
        if (!result.success) {
          throw new Error(`Failed to save frame ${i}: ${result.error}`);
        }
        
        // Update progress UI
        const progress = this.frameExportService.calculateProgress(i + 1, frameCount + 1);
        this.uiAdapter.updateProgressUI(progress, i + 1, frameCount + 1);
        
        // Calculate and update ETA
        const elapsed = Date.now() - startTime;
        const etaSeconds = this.frameExportService.estimateRemainingTime(elapsed, i + 1, frameCount + 1);
        this.uiAdapter.updateETAUI(etaSeconds);
        
        // Yield control to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      if (!this.cancelExport) {
        this.uiAdapter.showExportComplete(frameCount + 1, folder);
        
        // Show system notification
        await this.uiAdapter.showSystemNotification(
          'Export Complete',
          `${frameCount + 1} frames exported successfully`
        );
      }
      
    } catch (error) {
      console.error('Export error:', error);
      this.uiAdapter.showExportError(error.message);
    } finally {
      // Restore original renderer settings
      const gridWasVisible = this.sceneManager.gridVisible;
      this.renderingService.restoreRenderState(
        renderer,
        camera,
        scene,
        originalSettings,
        gridWasVisible,
        toggleGrid
      );
      
      // Hide progress modal
      this.uiAdapter.hideProgressModal();
      
      this.isExporting = false;
    }
  }
  
  cancelCurrentExport() {
    this.cancelExport = true;
  }
  
  setExportFolder(folder) {
    this.exportFolder = folder;
  }
  
  getExportFolder() {
    return this.exportFolder;
  }
  
  /**
   * Export the current model with modified textures and animations
   * @param {Object} config - Export configuration
   * @param {string} config.format - 'glb' or 'gltf'
   * @param {string} config.folder - Output folder path
   * @param {string} config.filename - Output filename (without extension)
   * @param {boolean} config.embedTextures - Whether to embed textures
   */
  async exportModel(config) {
    const { format, folder, filename, embedTextures } = config;
    
    // Validate configuration
    const validation = this.configService.validateModelExportOptions(config);
    if (!validation.valid) {
      this.uiAdapter.showModelExportError(validation.errors.join(', '));
      throw new Error(`Invalid export options: ${validation.errors.join(', ')}`);
    }
    
    try {
      // Get the current model from the scene
      const model = this.sceneManager.getModel();
      
      // Get all animations (including retargeted ones)
      const animations = this.animationManager.getAllAnimations();
      
      // Validate export requirements
      const requirementsValidation = this.modelExportService.validateExportRequirements(model, animations);
      if (!requirementsValidation.valid) {
        throw new Error(requirementsValidation.errors.join(', '));
      }
      
      // Log export metadata
      const metadata = this.modelExportService.getExportMetadata(model, animations, format, embedTextures);
      console.log('Exporting model:', metadata);
      
      // Prepare model for export (stores original transform)
      const originalTransform = this.modelExportService.prepareModelForExport(model);
      
      console.log('Export transform:', {
        scale: 'reset to 1,1,1',
        position: 'reset to 0,0,0',
        rotation: 'kept for baking - ' + JSON.stringify({
          x: model.rotation.x * (180/Math.PI),
          y: model.rotation.y * (180/Math.PI),
          z: model.rotation.z * (180/Math.PI)
        })
      });
      
      // Create export options
      const exportOptions = this.modelExportService.createExportOptions(
        format,
        animations,
        embedTextures,
        4096 // maxTextureSize
      );
      
      // Show progress notification
      this.uiAdapter.showModelExportProgress();
      
      // Export using GLTFExporter
      return new Promise((resolve, reject) => {
        this.gltfExporter.parse(
          model,
          async (result) => {
            // Restore original transform immediately after export
            this.modelExportService.restoreModelTransform(model, originalTransform);
            console.log('Restored model transform after export');
            
            try {
              // Convert result to buffer
              const buffer = this.modelExportService.convertToBuffer(result, format);
              
              // Generate full filename
              const fullFilename = this.modelExportService.generateExportFilename(filename, format);
              
              // Save via IPC
              const saveResult = await window.electronAPI.saveModelExport(
                folder,
                fullFilename,
                buffer,
                format
              );
              
              if (saveResult.success) {
                this.uiAdapter.showModelExportSuccess(fullFilename);
                resolve(saveResult);
              } else {
                throw new Error(saveResult.error || 'Failed to save exported model');
              }
            } catch (error) {
              reject(error);
            }
          },
          (error) => {
            // Restore original transform on error too
            this.modelExportService.restoreModelTransform(model, originalTransform);
            console.error('Export error, restored model transform');
            reject(error);
          },
          exportOptions
        );
      });
      
    } catch (error) {
      console.error('Export model error:', error);
      this.uiAdapter.showModelExportError(error.message);
      throw error;
    }
  }
}
