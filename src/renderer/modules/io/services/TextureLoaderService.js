import * as THREE from 'three';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';

/**
 * TextureLoaderService
 * Handles I/O operations for loading textures
 * Dependencies are injected for testability
 */
export class TextureLoaderService {
  constructor(fileReader = null, textureMetadataService = null) {
    this.tgaLoader = new TGALoader();
    this.fileReader = fileReader; // Injected dependency for file operations
    this.textureMetadataService = textureMetadataService;
  }

  /**
   * Set the file reader dependency
   * @param {Object} fileReader - Object with readImageFile method
   */
  setFileReader(fileReader) {
    this.fileReader = fileReader;
  }

  /**
   * Load a texture from a file path
   * @param {string} imagePath - Path to the image file
   * @param {THREE.Texture} existingTexture - Optional existing texture to copy settings from
   * @returns {Promise<THREE.Texture>} The loaded texture
   */
  async loadTextureFromFile(imagePath, existingTexture = null) {
    if (!this.fileReader) {
      throw new Error('File reader not configured');
    }

    const fileExtension = imagePath.split('.').pop().toLowerCase();
    
    if (fileExtension === 'tga') {
      return this.loadTGATexture(imagePath, existingTexture);
    } else {
      return this.loadStandardTexture(imagePath, existingTexture);
    }
  }

  /**
   * Load a TGA texture
   * @param {string} imagePath - Path to the TGA file
   * @param {THREE.Texture} existingTexture - Optional existing texture to copy settings from
   * @returns {Promise<THREE.Texture>} The loaded texture
   */
  async loadTGATexture(imagePath, existingTexture = null) {
    const imageData = await this.fileReader.readImageFile(imagePath);
    const uint8Array = new Uint8Array(imageData);
    const blob = new Blob([uint8Array], { type: 'image/x-tga' });
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      this.tgaLoader.load(
        url,
        (texture) => {
          try {
            this.applyTextureSettings(texture, existingTexture);
            texture.userData.path = imagePath;
            texture.needsUpdate = true;
            URL.revokeObjectURL(url);
            resolve(texture);
          } catch (error) {
            URL.revokeObjectURL(url);
            reject(error);
          }
        },
        undefined,
        (error) => {
          URL.revokeObjectURL(url);
          reject(new Error(`Failed to load TGA: ${error}`));
        }
      );
    });
  }

  /**
   * Load a standard image texture (PNG, JPG, etc.)
   * @param {string} imagePath - Path to the image file
   * @param {THREE.Texture} existingTexture - Optional existing texture to copy settings from
   * @returns {Promise<THREE.Texture>} The loaded texture
   */
  async loadStandardTexture(imagePath, existingTexture = null) {
    const imageData = await this.fileReader.readImageFile(imagePath);
    const uint8Array = new Uint8Array(imageData);
    const mimeType = this.getMimeType(imagePath);
    const blob = new Blob([uint8Array], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          const texture = this.createTextureFromImage(img);
          this.applyTextureSettings(texture, existingTexture);
          texture.userData.path = imagePath;
          texture.needsUpdate = true;
          URL.revokeObjectURL(url);
          resolve(texture);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load image: ${error}`));
      };
      
      img.src = url;
    });
  }

  /**
   * Create a THREE.Texture from an image element
   * @param {HTMLImageElement} image - The image element
   * @returns {THREE.Texture} The created texture
   */
  createTextureFromImage(image) {
    return new THREE.Texture(image);
  }

  /**
   * Apply texture settings from an existing texture to a new one
   * @param {THREE.Texture} newTexture - The new texture
   * @param {THREE.Texture} existingTexture - The existing texture to copy from
   */
  applyTextureSettings(newTexture, existingTexture = null) {
    if (existingTexture) {
      newTexture.wrapS = existingTexture.wrapS;
      newTexture.wrapT = existingTexture.wrapT;
      newTexture.repeat.copy(existingTexture.repeat);
      newTexture.offset.copy(existingTexture.offset);
      newTexture.rotation = existingTexture.rotation;
      newTexture.center.copy(existingTexture.center);
    } else {
      // Default settings
      newTexture.wrapS = THREE.RepeatWrapping;
      newTexture.wrapT = THREE.RepeatWrapping;
    }
  }

  /**
   * Set color space for texture based on its type
   * @param {THREE.Texture} texture - The texture to configure
   * @param {string} textureKey - The texture slot key (map, normalMap, etc.)
   */
  setColorSpace(texture, textureKey) {
    if (this.textureMetadataService && 
        this.textureMetadataService.shouldUseLinearColorSpace(textureKey)) {
      texture.colorSpace = THREE.LinearSRGBColorSpace;
    } else {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
  }

  /**
   * Get MIME type from file extension
   * @param {string} path - File path
   * @returns {string} MIME type
   */
  getMimeType(path) {
    const ext = path.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'tga': 'image/tga',
      'tiff': 'image/tiff',
      'tif': 'image/tiff'
    };
    return mimeTypes[ext] || 'image/png';
  }

  /**
   * Extract embedded texture to data URL
   * @param {THREE.Texture} texture - The texture with embedded image
   * @param {number} maxSize - Maximum size for the canvas (default 2048)
   * @returns {Promise<string|null>} Data URL or null if extraction fails
   */
  async extractEmbeddedTextureData(texture, maxSize = 2048) {
    if (!texture || !texture.image) {
      return null;
    }

    try {
      let dataUrl = null;
      
      // Get data URL from different sources
      if (texture.image.src && texture.image.src.startsWith('data:')) {
        dataUrl = texture.image.src;
      } else if (texture.image instanceof HTMLCanvasElement) {
        dataUrl = texture.image.toDataURL('image/png');
      } else if (texture.image.currentSrc || texture.image.src) {
        // Try to convert to data URL
        const canvas = document.createElement('canvas');
        const width = Math.min(texture.image.width || 512, maxSize);
        const height = Math.min(texture.image.height || 512, maxSize);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(texture.image, 0, 0, width, height);
        dataUrl = canvas.toDataURL('image/png');
      }
      
      return dataUrl;
    } catch (error) {
      console.warn('Could not extract texture data:', error);
      return null;
    }
  }

  /**
   * Convert data URL to buffer array
   * @param {string} dataUrl - The data URL
   * @returns {Uint8Array} Buffer array
   */
  dataUrlToBuffer(dataUrl) {
    const base64Data = dataUrl.split(',')[1];
    return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  }

  /**
   * Determine file extension from data URL
   * @param {string} dataUrl - The data URL
   * @returns {string} File extension
   */
  getExtensionFromDataUrl(dataUrl) {
    const mimeMatch = dataUrl.match(/data:image\/(\w+);/);
    let extension = mimeMatch ? mimeMatch[1] : 'png';
    
    // Handle special cases
    if (extension === 'jpeg') extension = 'jpg';
    
    return extension;
  }

  /**
   * Create a safe filename from material name and texture key
   * @param {string} materialName - Name of the material
   * @param {string} textureKey - Texture slot key
   * @param {string} extension - File extension
   * @returns {string} Safe filename
   */
  createSafeFilename(materialName, textureKey, extension) {
    const safeMaterialName = materialName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${safeMaterialName}_${textureKey}.${extension}`;
  }

  /**
   * Dispose of a texture properly
   * @param {THREE.Texture} texture - The texture to dispose
   */
  disposeTexture(texture) {
    if (texture && texture.dispose) {
      texture.dispose();
    }
  }
}
