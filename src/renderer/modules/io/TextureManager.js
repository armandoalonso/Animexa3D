import * as THREE from 'three';
import { TextureExtractionService } from './services/TextureExtractionService.js';
import { TextureMetadataService } from './services/TextureMetadataService.js';
import { MaterialManagementService } from './services/MaterialManagementService.js';
import { TextureLoaderService } from './services/TextureLoaderService.js';

/**
 * TextureManager
 * Thin orchestrator that delegates to specialized services
 * Handles coordination between services and UI updates
 */
export class TextureManager {
  constructor() {
    // Initialize services
    this.extractionService = new TextureExtractionService();
    this.metadataService = new TextureMetadataService();
    this.managementService = new MaterialManagementService();
    this.loaderService = new TextureLoaderService(null, this.metadataService);
    
    // Set up file reader dependency for loader service
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.loaderService.setFileReader(window.electronAPI);
    }
    
    // Legacy compatibility
    this.textureCache = new Map();
    this.tempTexturePath = null;
  }

  /**
   * Extract all materials and their textures from a loaded model
   * @param {THREE.Object3D} model - The loaded 3D model
   * @returns {Array} Array of material data with texture information
   */
  extractMaterials(model) {
    const materials = this.extractionService.extractMaterialsFromModel(model);
    this.managementService.setMaterials(materials);
    return materials;
  }

  /**
   * Extract texture information from a material
   * @param {THREE.Material} material - The material to extract textures from
   * @returns {Object} Object containing texture slot information
   */
  extractTexturesFromMaterial(material) {
    return this.extractionService.extractTexturesFromMaterial(material);
  }

  /**
   * Get the source path or type of a texture
   * @param {THREE.Texture} texture - The texture to get source from
   * @returns {string} The texture source path or description
   */
  getTextureSource(texture) {
    return this.extractionService.getTextureSource(texture);
  }

  /**
   * Update a texture map for a material
   * @param {string} materialUuid - UUID of the material to update
   * @param {string} textureKey - Key of the texture slot (e.g., 'map', 'normalMap')
   * @param {string} imagePath - Path to the new texture image
   * @returns {Promise<boolean>} Success status
   */
  async updateTexture(materialUuid, textureKey, imagePath) {
    const materialData = this.managementService.getMaterialByUuid(materialUuid);
    if (!materialData) {
      console.error('Material not found:', materialUuid);
      return false;
    }

    try {
      // Load the new texture using the loader service
      const oldTexture = materialData.material[textureKey];
      const newTexture = await this.loaderService.loadTextureFromFile(imagePath, oldTexture);
      
      // Set appropriate color space
      this.loaderService.setColorSpace(newTexture, textureKey);

      // Dispose old texture if it exists
      if (oldTexture) {
        this.loaderService.disposeTexture(oldTexture);
      }

      // Update material
      materialData.material[textureKey] = newTexture;
      materialData.material.needsUpdate = true;

      // Update texture data in management service
      const slot = this.metadataService.getTextureSlotInfo(textureKey);
      const textureData = {
        texture: newTexture,
        label: slot.label,
        shortLabel: slot.shortLabel,
        source: this.extractionService.extractFilename(imagePath),
        extractedPath: imagePath,
        image: newTexture.image,
        uuid: newTexture.uuid
      };
      
      this.managementService.updateMaterialTexture(materialUuid, textureKey, textureData);

      // Force update on all meshes using this material
      materialData.meshes.forEach(mesh => {
        mesh.material = materialData.material;
      });

      return true;
    } catch (error) {
      console.error('Failed to update texture:', error);
      return false;
    }
  }

  /**
   * Get texture slot information
   * @param {string} key - Texture slot key
   * @returns {Object} Slot information
   */
  getTextureSlotInfo(key) {
    return this.metadataService.getTextureSlotInfo(key);
  }

  /**
   * Get MIME type from file extension
   * @param {string} path - File path
   * @returns {string} MIME type
   */
  getMimeType(path) {
    return this.extractionService.getMimeType(path);
  }

  /**
   * Extract embedded textures to temporary directory
   * @param {Array} materials - Array of material data
   * @returns {Promise<void>}
   */
  async extractEmbeddedTextures(materials) {
    const promises = [];

    for (const materialData of materials) {
      for (const [key, textureData] of Object.entries(materialData.textures)) {
        const texture = textureData.texture;
        
        // Check if texture is embedded using extraction service
        const isEmbedded = this.extractionService.isEmbeddedTexture(texture);
        
        if (isEmbedded) {
          // Extract data URL using loader service
          const dataUrl = await this.loaderService.extractEmbeddedTextureData(texture);
          
          if (dataUrl) {
            const promise = this.extractEmbeddedTexture(
              materialData.uuid,
              key,
              dataUrl,
              materialData.name
            ).then(path => {
              if (path) {
                textureData.source = this.extractionService.extractFilename(path);
                textureData.extractedPath = path;
                textureData.isEmbedded = true;
                console.log(`Extracted embedded texture: ${materialData.name} - ${key}`);
              }
            });
            promises.push(promise);
          }
        } else if (texture.image && texture.image.src) {
          // External texture file
          textureData.isEmbedded = false;
          console.log(`External texture found: ${materialData.name} - ${key}: ${texture.image.src}`);
        }
      }
    }

    await Promise.all(promises);
    console.log(`Extracted ${promises.length} embedded textures`);
  }

  /**
   * Extract a single embedded texture to temp directory
   * @param {string} materialUuid - Material UUID
   * @param {string} textureKey - Texture slot key
   * @param {string} dataUrl - Data URL of the embedded texture
   * @param {string} materialName - Name of the material
   * @returns {Promise<string>} Path to extracted file
   */
  async extractEmbeddedTexture(materialUuid, textureKey, dataUrl, materialName) {
    try {
      // Convert data URL to buffer using loader service
      const bufferArray = this.loaderService.dataUrlToBuffer(dataUrl);

      // Determine file extension from data URL
      const extension = this.loaderService.getExtensionFromDataUrl(dataUrl);

      // Create a safe filename
      const filename = this.loaderService.createSafeFilename(materialName, textureKey, extension);

      // Save to temp directory via electron
      const path = await window.electronAPI.saveTextureToTemp(filename, Array.from(bufferArray));
      
      console.log(`Saved embedded texture to: ${path}`);
      return path;
    } catch (error) {
      console.error('Failed to extract embedded texture:', error);
      return null;
    }
  }

  /**
   * Clear all materials and textures
   */
  clear() {
    // Dispose all textures
    const materials = this.managementService.getMaterials();
    materials.forEach(materialData => {
      Object.values(materialData.textures).forEach(textureData => {
        if (textureData.texture) {
          this.loaderService.disposeTexture(textureData.texture);
        }
      });
    });

    this.managementService.clearMaterials();
    this.textureCache.clear();
  }

  /**
   * Get all materials
   * @returns {Array} Array of material data
   */
  getMaterials() {
    return this.managementService.getMaterials();
  }
  
  clearTextures() {
    // Clear texture cache
    this.textureCache.forEach((texture) => {
      if (texture && texture.dispose) {
        this.loaderService.disposeTexture(texture);
      }
    });
    this.textureCache.clear();
    
    // Clear materials
    this.managementService.clearMaterials();
    
    // Reset temp texture path
    this.tempTexturePath = null;
  }

  /**
   * Get a specific material by UUID
   * @param {string} uuid - Material UUID
   * @returns {Object} Material data
   */
  getMaterialByUuid(uuid) {
    return this.managementService.getMaterialByUuid(uuid);
  }

  /**
   * Remove a texture from a material
   * @param {string} materialUuid - UUID of the material to update
   * @param {string} textureKey - Key of the texture slot (e.g., 'map', 'normalMap')
   * @returns {boolean} Success status
   */
  removeTexture(materialUuid, textureKey) {
    const materialData = this.managementService.getMaterialByUuid(materialUuid);
    if (!materialData) {
      console.error('Material not found:', materialUuid);
      return false;
    }

    try {
      // Get the texture to dispose
      const oldTexture = materialData.material[textureKey];
      
      if (oldTexture) {
        // Dispose the texture using loader service
        this.loaderService.disposeTexture(oldTexture);
      }

      // Remove texture from material
      materialData.material[textureKey] = null;
      materialData.material.needsUpdate = true;

      // Remove texture data from management service
      this.managementService.removeMaterialTexture(materialUuid, textureKey);

      // Force update on all meshes using this material
      materialData.meshes.forEach(mesh => {
        mesh.material = materialData.material;
      });

      return true;
    } catch (error) {
      console.error('Failed to remove texture:', error);
      return false;
    }
  }

  /**
   * Get thumbnail data URL for a texture
   * @param {THREE.Texture} texture - The texture to create thumbnail from
   * @param {number} size - Thumbnail size (default 64)
   * @returns {string} Data URL of thumbnail
   */
  getTextureThumbnail(texture, size = 64) {
    if (!texture) {
      return null;
    }

    try {
      // For TGA textures or textures without proper image property, render from WebGL
      if (!texture.image || !texture.image.width || !texture.image.height ||
          !(texture.image instanceof HTMLImageElement || texture.image instanceof HTMLCanvasElement)) {
        
        // Create a canvas for WebGL rendering
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        // Create a simple scene to render the texture
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        
        const renderer = new THREE.WebGLRenderer({ 
          canvas: canvas,
          alpha: false,
          preserveDrawingBuffer: true 
        });
        renderer.setSize(size, size);
        renderer.render(scene, camera);
        
        const dataUrl = canvas.toDataURL('image/png');
        
        // Cleanup
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        
        return dataUrl;
      }

      // Standard image-based thumbnail - use 2D canvas
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      // Fill background
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, size, size);

      const img = texture.image;
      const aspectRatio = img.width / img.height;
      
      let drawWidth = size;
      let drawHeight = size;
      let offsetX = 0;
      let offsetY = 0;

      if (aspectRatio > 1) {
        drawHeight = size / aspectRatio;
        offsetY = (size - drawHeight) / 2;
      } else {
        drawWidth = size * aspectRatio;
        offsetX = (size - drawWidth) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to create thumbnail:', error);
      return null;
    }
  }
}
