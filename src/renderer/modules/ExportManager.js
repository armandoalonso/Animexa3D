export class ExportManager {
  constructor(sceneManager, animationManager) {
    this.sceneManager = sceneManager;
    this.animationManager = animationManager;
    this.isExporting = false;
    this.cancelExport = false;
    this.exportFolder = null;
  }
  
  async startExport(config) {
    if (this.isExporting) return;
    
    this.isExporting = true;
    this.cancelExport = false;
    
    const { resolution, fps, folder, transparentBackground } = config;
    const [width, height] = resolution.split('x').map(Number);
    
    // Get current animation
    const currentAction = this.animationManager.getCurrentAction();
    if (!currentAction) {
      window.uiManager.showNotification('No animation selected', 'error');
      this.isExporting = false;
      return;
    }
    
    const clip = currentAction.getClip();
    const duration = clip.duration;
    const frameCount = Math.ceil(duration * fps);
    const timeStep = 1 / fps;
    
    // Show progress modal
    const progressModal = document.getElementById('progress-modal');
    progressModal.classList.add('is-active');
    
    // Prepare offscreen rendering
    const originalSettings = this.prepareOffscreenRender(width, height, transparentBackground);
    
    try {
      const startTime = Date.now();
      
      for (let i = 0; i <= frameCount; i++) {
        if (this.cancelExport) {
          window.uiManager.showNotification('Export cancelled', 'warning');
          break;
        }
        
        // Calculate time for this frame
        const time = i * timeStep;
        
        // Update animation to this time
        const mixer = this.sceneManager.getMixer();
        if (mixer) {
          // Stop current action and set time directly
          currentAction.paused = false;
          currentAction.time = time;
          // Update mixer with zero delta to apply the time change
          mixer.update(0);
        }
        
        // Render the scene
        const renderer = this.sceneManager.getRenderer();
        const scene = this.sceneManager.getScene();
        const camera = this.sceneManager.getCamera();
        renderer.render(scene, camera);
        
        // Capture frame
        const dataURL = renderer.domElement.toDataURL('image/png');
        
        // Generate filename with zero-padding
        const filename = `frame_${String(i).padStart(3, '0')}.png`;
        
        // Save frame via IPC
        const result = await window.electronAPI.saveFrame(folder, filename, dataURL);
        
        if (!result.success) {
          throw new Error(`Failed to save frame ${i}: ${result.error}`);
        }
        
        // Update progress
        const progress = ((i + 1) / (frameCount + 1)) * 100;
        document.getElementById('progress-bar').value = progress;
        document.getElementById('progress-text').textContent = 
          `Exporting frame ${i + 1} of ${frameCount + 1}...`;
        
        // Calculate ETA
        const elapsed = Date.now() - startTime;
        const avgTimePerFrame = elapsed / (i + 1);
        const remaining = (frameCount + 1 - i - 1) * avgTimePerFrame;
        const etaSeconds = Math.ceil(remaining / 1000);
        document.getElementById('progress-eta').textContent = 
          `Estimated time remaining: ${etaSeconds}s`;
        
        // Yield control to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      if (!this.cancelExport) {
        window.uiManager.showNotification(
          `Export complete! ${frameCount + 1} frames saved to ${folder}`,
          'success'
        );
        
        // Show system notification
        await window.electronAPI.showNotification(
          'Export Complete',
          `${frameCount + 1} frames exported successfully`
        );
      }
      
    } catch (error) {
      console.error('Export error:', error);
      window.uiManager.showNotification(
        `Export failed: ${error.message}`,
        'error'
      );
    } finally {
      // Restore original renderer settings
      this.restoreRenderer(originalSettings);
      
      // Hide progress modal
      progressModal.classList.remove('is-active');
      
      this.isExporting = false;
    }
  }
  
  prepareOffscreenRender(width, height, transparentBackground = false) {
    const renderer = this.sceneManager.getRenderer();
    const camera = this.sceneManager.getCamera();
    const scene = this.sceneManager.getScene();
    
    // Store original settings
    const originalSettings = {
      width: renderer.domElement.width,
      height: renderer.domElement.height,
      aspect: camera.aspect,
      alpha: renderer.getClearAlpha(),
      backgroundColor: scene.background ? scene.background.clone() : null
    };
    
    // Hide grid
    this.sceneManager.toggleGrid(false);
    
    // Set transparent background if requested
    if (transparentBackground) {
      renderer.setClearAlpha(0);
      scene.background = null;
    }
    
    // Set export resolution
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    return originalSettings;
  }
  
  restoreRenderer(originalSettings) {
    const renderer = this.sceneManager.getRenderer();
    const camera = this.sceneManager.getCamera();
    const scene = this.sceneManager.getScene();
    
    // Restore original settings
    renderer.setSize(originalSettings.width, originalSettings.height);
    camera.aspect = originalSettings.aspect;
    camera.updateProjectionMatrix();
    
    // Restore background
    renderer.setClearAlpha(originalSettings.alpha);
    scene.background = originalSettings.backgroundColor;
    
    // Show grid if it was visible
    if (this.sceneManager.gridVisible) {
      this.sceneManager.toggleGrid(true);
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
}
