/**
 * TextureUIController
 * 
 * Handles UI interactions for texture operations including:
 * - Displaying material cards with texture slots
 * - Drag and drop for texture loading
 * - Adding, changing, and removing textures
 * - Texture thumbnail display
 * 
 * This controller is a thin adapter layer between UI events and TextureManager.
 */

export class TextureUIController {
  constructor(dependencies) {
    const {
      textureManager,
      notificationService
    } = dependencies;

    this.textureManager = textureManager;
    this.notificationService = notificationService;
  }

  /**
   * Display materials and textures in the texture panel
   */
  displayTextures() {
    const container = document.getElementById('texture-list');
    const materials = this.textureManager.getMaterials();

    if (!materials || materials.length === 0) {
      container.innerHTML = '<div class="empty-state"><p class="has-text-grey">No materials found</p></div>';
      return;
    }

    container.innerHTML = '';

    // Add drop overlay for texture section
    const dropOverlay = document.createElement('div');
    dropOverlay.id = 'drop-overlay-textures';
    dropOverlay.className = 'drop-overlay-textures';
    dropOverlay.innerHTML = `
      <div class="drop-content-textures">
        <p class="title is-5">Drop Texture Here</p>
        <p class="subtitle is-6">PNG, JPG, TGA, etc.</p>
      </div>
    `;
    container.appendChild(dropOverlay);

    // Setup drag handlers for texture section
    this.setupTextureSectionDragDrop(container);

    materials.forEach((materialData, index) => {
      const materialCard = this.createMaterialCard(materialData, index);
      container.appendChild(materialCard);
    });
  }

  /**
   * Create a material card element
   */
  createMaterialCard(materialData, index) {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.setAttribute('data-material-uuid', materialData.uuid);

    // Material header
    const header = document.createElement('div');
    header.className = 'material-header';
    header.innerHTML = `
      <div class="material-name">${materialData.name}</div>
      <span class="material-toggle">▼</span>
    `;
    header.style.cursor = 'pointer';
    
    // Add click handler for collapse/expand
    header.addEventListener('click', () => {
      const isCollapsed = card.classList.toggle('collapsed');
      const toggle = header.querySelector('.material-toggle');
      toggle.textContent = isCollapsed ? '▶' : '▼';
    });
    
    card.appendChild(header);

    // Texture slots container
    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'texture-slots';

    // Common texture types to display (even if empty)
    const commonSlots = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
    
    // Display existing textures
    Object.entries(materialData.textures).forEach(([key, textureData]) => {
      const slot = this.createTextureSlot(materialData.uuid, key, textureData, false);
      slotsContainer.appendChild(slot);
    });

    // Display empty slots for common texture types that don't exist
    commonSlots.forEach(slotKey => {
      if (!materialData.textures[slotKey]) {
        const slotInfo = this.textureManager.getTextureSlotInfo(slotKey);
        const emptySlot = this.createTextureSlot(materialData.uuid, slotKey, {
          label: slotInfo.label,
          shortLabel: slotInfo.shortLabel,
          source: null
        }, true);
        slotsContainer.appendChild(emptySlot);
      }
    });

    card.appendChild(slotsContainer);

    return card;
  }

  /**
   * Create a texture slot element
   */
  createTextureSlot(materialUuid, textureKey, textureData, isEmpty) {
    const slot = document.createElement('div');
    slot.className = `texture-slot ${isEmpty ? 'empty-slot' : ''}`;
    slot.setAttribute('data-material-uuid', materialUuid);
    slot.setAttribute('data-texture-key', textureKey);

    // Enable drag and drop for texture images
    this.setupTextureSlotDragDrop(slot, materialUuid, textureKey);

    // Thumbnail
    const thumbnail = document.createElement('div');
    thumbnail.className = `texture-thumbnail ${isEmpty ? 'no-texture' : ''}`;
    
    if (!isEmpty && textureData.texture) {
      const thumbnailUrl = this.textureManager.getTextureThumbnail(textureData.texture);
      if (thumbnailUrl) {
        thumbnail.style.backgroundImage = `url(${thumbnailUrl})`;
        thumbnail.style.backgroundSize = 'cover';
        thumbnail.style.backgroundPosition = 'center';
      } else {
        thumbnail.textContent = '?';
      }
    } else {
      thumbnail.textContent = '—';
    }

    // Info
    const info = document.createElement('div');
    info.className = 'texture-info';
    
    const label = document.createElement('div');
    label.className = 'texture-label';
    label.textContent = textureData.shortLabel || textureData.label;
    
    const source = document.createElement('div');
    source.className = `texture-source ${isEmpty ? 'no-texture-text' : ''}`;
    source.textContent = isEmpty ? 'No texture' : (textureData.source || 'Unknown');
    source.title = source.textContent; // Tooltip for full name
    
    info.appendChild(label);
    info.appendChild(source);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'texture-actions';
    
    const button = document.createElement('button');
    button.className = `btn-change-texture ${isEmpty ? 'btn-add-texture' : ''}`;
    button.textContent = '+';
    button.title = isEmpty ? 'Add texture' : 'Change texture';
    button.setAttribute('data-material-uuid', materialUuid);
    button.setAttribute('data-texture-key', textureKey);
    
    button.addEventListener('click', () => {
      this.handleChangeTexture(materialUuid, textureKey);
    });
    
    actions.appendChild(button);

    // Add delete button if texture exists
    if (!isEmpty) {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn-delete-texture';
      deleteButton.textContent = '×';
      deleteButton.title = 'Delete texture';
      deleteButton.setAttribute('data-material-uuid', materialUuid);
      deleteButton.setAttribute('data-texture-key', textureKey);
      
      deleteButton.addEventListener('click', () => {
        this.handleDeleteTexture(materialUuid, textureKey);
      });
      
      actions.appendChild(deleteButton);
    }

    slot.appendChild(thumbnail);
    slot.appendChild(info);
    slot.appendChild(actions);

    return slot;
  }

  /**
   * Setup drag and drop handlers for the entire texture section
   */
  setupTextureSectionDragDrop(container) {
    const textureSection = container.closest('.sidebar-section-textures');
    const dropOverlay = container.querySelector('#drop-overlay-textures');
    
    if (!textureSection) return;

    textureSection.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Don't show if dragging over a specific slot
      if (!e.target.closest('.texture-slot')) {
        if (dropOverlay) {
          dropOverlay.classList.add('active');
        }
      }
    });

    textureSection.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    textureSection.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only remove overlay if actually leaving the texture section
      if (!textureSection.contains(e.relatedTarget)) {
        if (dropOverlay) {
          dropOverlay.classList.remove('active');
        }
      }
    });

    textureSection.addEventListener('drop', (e) => {
      // Only handle drops outside of texture slots
      if (!e.target.closest('.texture-slot')) {
        e.preventDefault();
        e.stopPropagation();
        if (dropOverlay) {
          dropOverlay.classList.remove('active');
        }
        this.notificationService.showNotification('Drop the texture directly onto a texture slot (Albedo, Normal, etc.)', 'info');
      }
    });
  }

  /**
   * Setup drag and drop handlers for a texture slot
   */
  setupTextureSlotDragDrop(slot, materialUuid, textureKey) {
    const container = document.getElementById('texture-list');
    const dropOverlay = container?.querySelector('#drop-overlay-textures');

    slot.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Hide section overlay when over specific slot
      if (dropOverlay) {
        dropOverlay.classList.remove('active');
      }
      
      slot.classList.add('texture-slot-drag-over');
    });

    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    slot.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only remove highlight if actually leaving the slot
      if (!slot.contains(e.relatedTarget)) {
        slot.classList.remove('texture-slot-drag-over');
      }
    });

    slot.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.remove('texture-slot-drag-over');
      
      // Hide section overlay
      if (dropOverlay) {
        dropOverlay.classList.remove('active');
      }

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];
      const extension = file.name.split('.').pop().toLowerCase();

      // Validate image file
      if (!['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tga', 'tiff', 'tif', 'webp'].includes(extension)) {
        this.notificationService.showNotification('Please drop an image file (PNG, JPG, TGA, etc.)', 'warning');
        return;
      }

      // Save file to temp and update texture
      await this.handleDroppedImage(file, materialUuid, textureKey);
    });
  }

  /**
   * Handle dropped image file on texture slot
   */
  async handleDroppedImage(file, materialUuid, textureKey) {
    try {
      this.notificationService.showNotification('Loading texture...', 'info', 2000);

      // Read the file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Array.from(new Uint8Array(arrayBuffer));

      // Save to temp directory
      const tempPath = await window.electronAPI.saveTextureToTemp(file.name, buffer);

      // Update the texture
      const success = await this.textureManager.updateTexture(materialUuid, textureKey, tempPath);

      if (success) {
        this.notificationService.showNotification(`Texture updated: ${file.name}`, 'success');
        
        // Refresh the texture display
        this.displayTextures();
      } else {
        this.notificationService.showNotification('Failed to update texture', 'error');
      }
    } catch (error) {
      console.error('Error handling dropped image:', error);
      this.notificationService.showNotification(`Failed to load texture: ${error.message}`, 'error');
    }
  }

  /**
   * Handle texture change button click
   */
  async handleChangeTexture(materialUuid, textureKey) {
    try {
      const imagePath = await window.electronAPI.openImageDialog();
      
      if (!imagePath) {
        return; // User cancelled
      }

      // Show loading notification
      this.notificationService.showNotification('Updating texture...', 'info', 2000);

      // Update the texture
      const success = await this.textureManager.updateTexture(materialUuid, textureKey, imagePath);

      if (success) {
        this.notificationService.showNotification('Texture updated successfully!', 'success');
        
        // Refresh the texture display
        this.displayTextures();
      } else {
        this.notificationService.showNotification('Failed to update texture', 'error');
      }
    } catch (error) {
      console.error('Error changing texture:', error);
      this.notificationService.showNotification(`Failed to change texture: ${error.message}`, 'error');
    }
  }

  /**
   * Handle texture delete button click
   */
  handleDeleteTexture(materialUuid, textureKey) {
    const materialData = this.textureManager.getMaterialByUuid(materialUuid);
    const textureData = materialData?.textures[textureKey];
    const slotInfo = this.textureManager.getTextureSlotInfo(textureKey);
    
    const textureName = textureData?.source || slotInfo.label;
    const materialName = materialData?.name || 'Unknown Material';
    
    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to remove the ${textureName} texture from ${materialName}?`);
    
    if (!confirmed) {
      return;
    }

    try {
      // Remove the texture
      const success = this.textureManager.removeTexture(materialUuid, textureKey);

      if (success) {
        this.notificationService.showNotification('Texture removed successfully!', 'success');
        
        // Refresh the texture display
        this.displayTextures();
      } else {
        this.notificationService.showNotification('Failed to remove texture', 'error');
      }
    } catch (error) {
      console.error('Error deleting texture:', error);
      this.notificationService.showNotification(`Failed to delete texture: ${error.message}`, 'error');
    }
  }

  /**
   * Clear texture display
   */
  clearTextureDisplay() {
    const container = document.getElementById('texture-list');
    container.innerHTML = '<div class="empty-state"><p class="has-text-grey">No model loaded</p></div>';
  }
}
