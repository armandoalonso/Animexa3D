/**
 * AnimationUIController
 * 
 * Handles UI interactions for animation operations including:
 * - Loading animation files
 * - Displaying animation selection
 * - Verifying bone structure compatibility
 * - Adding selected animations to the project
 * 
 * This controller is a thin adapter layer between UI events and
 * the underlying managers (AnimationManager, ModelLoader, etc.).
 */

export class AnimationUIController {
  constructor(dependencies) {
    const {
      modelLoader,
      animationManager,
      notificationService
    } = dependencies;

    this.modelLoader = modelLoader;
    this.animationManager = animationManager;
    this.notificationService = notificationService;
    
    // Store loaded animation data for processing
    this.loadedAnimationData = null;
  }

  /**
   * Initialize event listeners for animation operations
   */
  initEventListeners() {
    document.getElementById('btn-load-animation-file').addEventListener('click', () => this.handleLoadAnimationFile());
    document.getElementById('btn-add-selected-animations').addEventListener('click', () => this.handleAddSelectedAnimations());
  }

  /**
   * Handle loading an animation file
   */
  async handleLoadAnimationFile() {
    try {
      const fileData = await window.electronAPI.openModelDialog();
      
      if (!fileData) return;
      
      const arrayBuffer = new Uint8Array(fileData.data).buffer;
      const animationData = await this.modelLoader.loadAnimationFile(
        arrayBuffer,
        fileData.extension.replace('.', ''),
        fileData.name
      );
      
      // Store loaded animation data with filename
      this.loadedAnimationData = animationData;
      this.loadedAnimationData.fileName = fileData.name;
      
      // Update file info
      document.getElementById('anim-file-name').textContent = fileData.name;
      document.getElementById('anim-file-count').textContent = animationData.animations.length;
      document.getElementById('anim-file-bones').textContent = animationData.boneNames.length;
      document.getElementById('animation-file-info').style.display = 'block';
      
      // Verify bone structure compatibility
      const currentModel = this.modelLoader.getCurrentModelData();
      const verification = this.modelLoader.verifyBoneStructureCompatibility(
        currentModel.skeletons,
        animationData.skeletons
      );
      
      // Display verification result
      this.displayBoneVerification(verification);
      
      // Only show animation selection if confidence is >= 90%
      if (verification.matchPercentage >= 90) {
        this.displayAnimationSelection(animationData.animations);
        document.getElementById('btn-add-selected-animations').disabled = false;
      } else {
        document.getElementById('animation-selection-container').style.display = 'none';
        document.getElementById('btn-add-selected-animations').disabled = true;
      }
      
    } catch (error) {
      console.error('Error loading animation file:', error);
      this.notificationService.showNotification(`Failed to load animation file: ${error.message}`, 'error');
    }
  }

  /**
   * Display bone verification results
   */
  displayBoneVerification(verification) {
    const container = document.getElementById('bone-verification-result');
    
    let statusClass = '';
    let statusIcon = '';
    
    if (verification.matchPercentage >= 90) {
      statusClass = 'has-text-success';
      statusIcon = '✓';
    } else if (verification.matchPercentage >= 70) {
      statusClass = 'has-text-warning';
      statusIcon = '⚠';
    } else {
      statusClass = 'has-text-danger';
      statusIcon = '✗';
    }
    
    let html = `
      <div class="notification is-light ${statusClass.replace('has-text-', 'is-')}">
        <p class="${statusClass}"><strong>${statusIcon} ${verification.message}</strong></p>
        <p>Match Percentage: <strong>${verification.matchPercentage}%</strong></p>
        <p>Model Bones: ${verification.sourceBoneCount} | Animation File Bones: ${verification.targetBoneCount}</p>
      </div>
    `;
    
    // Show guidance if match is too low
    if (verification.matchPercentage < 90) {
      html += `
        <div class="notification is-warning is-light">
          <p><strong>⚠ Bone structure confidence is below 90%</strong></p>
          <p class="help">This animation file has a different bone structure than your model. Please use the <strong>Retarget Animation</strong> menu from the main toolbar to properly retarget this animation.</p>
        </div>
      `;
    }
    
    if (verification.missingBones.length > 0) {
      html += `
        <details style="margin-top: 0.5rem;">
          <summary class="has-text-danger"><strong>Missing Bones (${verification.missingBones.length})</strong></summary>
          <div style="max-height: 150px; overflow-y: auto; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; margin-top: 0.5rem;">
            ${verification.missingBones.map(bone => `<p style="font-size: 0.9rem;">• ${bone}</p>`).join('')}
          </div>
        </details>
      `;
    }
    
    if (verification.extraBones.length > 0) {
      html += `
        <details style="margin-top: 0.5rem;">
          <summary class="has-text-info"><strong>Extra Bones in Animation (${verification.extraBones.length})</strong></summary>
          <div style="max-height: 150px; overflow-y: auto; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; margin-top: 0.5rem;">
            ${verification.extraBones.map(bone => `<p style="font-size: 0.9rem;">• ${bone}</p>`).join('')}
          </div>
        </details>
      `;
    }
    
    container.innerHTML = html;
  }

  /**
   * Display animation selection interface
   */
  displayAnimationSelection(animations) {
    const container = document.getElementById('animation-selection-list');
    
    if (!animations || animations.length === 0) {
      container.innerHTML = '<p class="has-text-grey">No animations found in file</p>';
      document.getElementById('animation-selection-container').style.display = 'none';
      return;
    }
    
    container.innerHTML = '';
    
    // Extract filename without extension from the loaded file
    const fileName = this.loadedAnimationData?.fileName || this.loadedAnimationData?.filename || '';
    const fileNameWithoutExt = fileName ? (fileName.substring(0, fileName.lastIndexOf('.')) || fileName) : '';
    
    animations.forEach((clip, index) => {
      const item = document.createElement('div');
      item.className = 'animation-item-selectable';
      item.innerHTML = `
        <div class="field">
          <label class="checkbox">
            <input type="checkbox" class="animation-checkbox" data-index="${index}" checked>
            <strong>${clip.name || `Animation ${index + 1}`}</strong> 
            <span class="has-text-grey">(${clip.duration.toFixed(2)}s)</span>
          </label>
        </div>
        <div class="field">
          <label class="label is-small">Rename (optional)</label>
          <div class="field has-addons">
            <div class="control is-expanded">
              <input type="text" class="input is-small animation-rename-input" data-index="${index}" 
                     placeholder="Leave empty to keep original name" value="">
            </div>
            <div class="control">
              <button class="button is-small use-filename-btn" data-index="${index}" 
                      title="Use file name">
                <span class="icon is-small">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
    
    // Add event listeners to checkboxes
    const checkboxes = container.querySelectorAll('.animation-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        this.updateAddAnimationButton();
      });
    });
    
    // Add event listeners to use-filename buttons
    const filenameButtons = container.querySelectorAll('.use-filename-btn');
    filenameButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = btn.getAttribute('data-index');
        const input = container.querySelector(`.animation-rename-input[data-index="${index}"]`);
        if (input && fileNameWithoutExt) {
          input.value = fileNameWithoutExt;
        }
      });
    });
    
    document.getElementById('animation-selection-container').style.display = 'block';
    this.updateAddAnimationButton();
  }

  /**
   * Update the add animation button state based on selection
   */
  updateAddAnimationButton() {
    const checkboxes = document.querySelectorAll('.animation-checkbox:checked');
    document.getElementById('btn-add-selected-animations').disabled = checkboxes.length === 0;
  }

  /**
   * Handle adding selected animations to the project
   */
  async handleAddSelectedAnimations() {
    if (!this.loadedAnimationData) {
      this.notificationService.showNotification('No animation data loaded', 'error');
      return;
    }
    
    // Get selected animation indices
    const selectedIndices = [];
    const checkboxes = document.querySelectorAll('.animation-checkbox:checked');
    
    checkboxes.forEach(cb => {
      const index = parseInt(cb.getAttribute('data-index'));
      selectedIndices.push(index);
    });
    
    if (selectedIndices.length === 0) {
      this.notificationService.showNotification('Please select at least one animation', 'warning');
      return;
    }
    
    // Get selected animations
    let selectedAnimations = selectedIndices.map(index => 
      this.loadedAnimationData.animations[index]
    );
    
    // Apply renames
    const renameInputs = document.querySelectorAll('.animation-rename-input');
    selectedAnimations = selectedAnimations.map((anim, idx) => {
      const originalIndex = selectedIndices[idx];
      const renameInput = document.querySelector(`.animation-rename-input[data-index="${originalIndex}"]`);
      const newName = renameInput ? renameInput.value.trim() : '';
      
      if (newName) {
        // Clone the animation and rename it
        const clonedAnim = anim.clone();
        clonedAnim.name = newName;
        return clonedAnim;
      }
      return anim;
    });
    
    // Directly add animations (no retargeting - bones must match >= 90%)
    const totalAnimations = this.animationManager.addAnimations(selectedAnimations);
    
    this.notificationService.showNotification(
      `Successfully added ${selectedAnimations.length} animation(s)! Total animations: ${totalAnimations}`,
      'success'
    );
    
    // Close modal
    document.getElementById('add-animation-modal').classList.remove('is-active');
  }
}
