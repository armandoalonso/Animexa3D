import * as THREE from 'three';

export class TextureManager {
  constructor() {
    this.materials = [];
    this.textureCache = new Map();
    this.tempTexturePath = null;
  }

  /**
   * Extract all materials and their textures from a loaded model
   * @param {THREE.Object3D} model - The loaded 3D model
   * @returns {Array} Array of material data with texture information
   */
  extractMaterials(model) {
    this.materials = [];
    const materialMap = new Map();

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) 
          ? child.material 
          : [child.material];

        materials.forEach((material) => {
          // Avoid duplicates
          if (materialMap.has(material.uuid)) {
            return;
          }

          const materialData = {
            uuid: material.uuid,
            name: material.name || `Material ${this.materials.length + 1}`,
            material: material,
            textures: this.extractTexturesFromMaterial(material),
            meshes: [] // Track which meshes use this material
          };

          materialMap.set(material.uuid, materialData);
          this.materials.push(materialData);
        });

        // Track which meshes use which materials
        materials.forEach((material) => {
          const matData = materialMap.get(material.uuid);
          if (matData) {
            matData.meshes.push(child);
          }
        });
      }
    });

    return this.materials;
  }

  /**
   * Extract texture information from a material
   * @param {THREE.Material} material - The material to extract textures from
   * @returns {Object} Object containing texture slot information
   */
  extractTexturesFromMaterial(material) {
    const textures = {};

    // Common texture maps
    const textureSlots = [
      { key: 'map', label: 'Albedo/Diffuse', shortLabel: 'Albedo' },
      { key: 'normalMap', label: 'Normal Map', shortLabel: 'Normal' },
      { key: 'roughnessMap', label: 'Roughness Map', shortLabel: 'Roughness' },
      { key: 'metalnessMap', label: 'Metalness Map', shortLabel: 'Metalness' },
      { key: 'aoMap', label: 'Ambient Occlusion', shortLabel: 'AO' },
      { key: 'emissiveMap', label: 'Emissive Map', shortLabel: 'Emissive' },
      { key: 'specularMap', label: 'Specular Map', shortLabel: 'Specular' },
      { key: 'alphaMap', label: 'Alpha Map', shortLabel: 'Alpha' },
      { key: 'bumpMap', label: 'Bump Map', shortLabel: 'Bump' },
      { key: 'displacementMap', label: 'Displacement Map', shortLabel: 'Displacement' },
      { key: 'lightMap', label: 'Light Map', shortLabel: 'Light' },
      { key: 'envMap', label: 'Environment Map', shortLabel: 'Environment' }
    ];

    textureSlots.forEach(slot => {
      if (material[slot.key]) {
        const texture = material[slot.key];
        textures[slot.key] = {
          texture: texture,
          label: slot.label,
          shortLabel: slot.shortLabel,
          source: this.getTextureSource(texture),
          image: texture.image,
          uuid: texture.uuid
        };
      }
    });

    return textures;
  }

  /**
   * Get the source path or type of a texture
   * @param {THREE.Texture} texture - The texture to get source from
   * @returns {string} The texture source path or description
   */
  getTextureSource(texture) {
    if (texture.image) {
      if (texture.image.src) {
        // Extract filename from data URL or path
        if (texture.image.src.startsWith('data:')) {
          return 'Embedded Texture';
        }
        return texture.image.src.split('/').pop() || 'Texture';
      } else if (texture.image.currentSrc) {
        return texture.image.currentSrc.split('/').pop() || 'Texture';
      }
    }
    
    // Check if texture was loaded from a file
    if (texture.userData && texture.userData.path) {
      return texture.userData.path.split('/').pop();
    }

    return 'Embedded/Generated';
  }

  /**
   * Update a texture map for a material
   * @param {string} materialUuid - UUID of the material to update
   * @param {string} textureKey - Key of the texture slot (e.g., 'map', 'normalMap')
   * @param {string} imagePath - Path to the new texture image
   * @returns {Promise<boolean>} Success status
   */
  async updateTexture(materialUuid, textureKey, imagePath) {
    const materialData = this.materials.find(m => m.uuid === materialUuid);
    if (!materialData) {
      console.error('Material not found:', materialUuid);
      return false;
    }

    try {
      // Read the image file as buffer
      const imageData = await window.electronAPI.readImageFile(imagePath);
      const uint8Array = new Uint8Array(imageData);
      const blob = new Blob([uint8Array], { type: this.getMimeType(imagePath) });
      const url = URL.createObjectURL(blob);

      // Create image element and load the texture
      const img = new Image();
      
      const newTexture = await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Create texture from loaded image
            const texture = new THREE.Texture(img);
            
            // Copy settings from old texture if it exists
            const oldTexture = materialData.material[textureKey];
            if (oldTexture) {
              texture.wrapS = oldTexture.wrapS;
              texture.wrapT = oldTexture.wrapT;
              texture.repeat.copy(oldTexture.repeat);
              texture.offset.copy(oldTexture.offset);
              texture.rotation = oldTexture.rotation;
              texture.center.copy(oldTexture.center);
              
              // Dispose old texture
              oldTexture.dispose();
            } else {
              // Default settings for new texture
              texture.wrapS = THREE.RepeatWrapping;
              texture.wrapT = THREE.RepeatWrapping;
            }

            // Special settings for normal maps
            if (textureKey === 'normalMap') {
              texture.colorSpace = THREE.LinearSRGBColorSpace;
            } else {
              texture.colorSpace = THREE.SRGBColorSpace;
            }

            // Store path in userData
            texture.userData.path = imagePath;
            
            // Mark texture as needing update
            texture.needsUpdate = true;
            
            resolve(texture);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          reject(new Error(`Failed to load image: ${error}`));
        };
        
        img.src = url;
      });

      // Update material
      materialData.material[textureKey] = newTexture;
      materialData.material.needsUpdate = true;

      // Update texture data in our records
      if (!materialData.textures[textureKey]) {
        const slot = this.getTextureSlotInfo(textureKey);
        materialData.textures[textureKey] = {
          texture: newTexture,
          label: slot.label,
          shortLabel: slot.shortLabel,
          source: imagePath.split(/[/\\]/).pop(),
          image: newTexture.image,
          uuid: newTexture.uuid
        };
      } else {
        materialData.textures[textureKey].texture = newTexture;
        materialData.textures[textureKey].source = imagePath.split(/[/\\]/).pop();
        materialData.textures[textureKey].image = newTexture.image;
        materialData.textures[textureKey].uuid = newTexture.uuid;
      }

      // Force update on all meshes using this material
      materialData.meshes.forEach(mesh => {
        mesh.material = materialData.material;
      });

      // Clean up blob URL after a delay to ensure texture is loaded
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

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
    const slots = {
      map: { label: 'Albedo/Diffuse', shortLabel: 'Albedo' },
      normalMap: { label: 'Normal Map', shortLabel: 'Normal' },
      roughnessMap: { label: 'Roughness Map', shortLabel: 'Roughness' },
      metalnessMap: { label: 'Metalness Map', shortLabel: 'Metalness' },
      aoMap: { label: 'Ambient Occlusion', shortLabel: 'AO' },
      emissiveMap: { label: 'Emissive Map', shortLabel: 'Emissive' },
      specularMap: { label: 'Specular Map', shortLabel: 'Specular' },
      alphaMap: { label: 'Alpha Map', shortLabel: 'Alpha' },
      bumpMap: { label: 'Bump Map', shortLabel: 'Bump' },
      displacementMap: { label: 'Displacement Map', shortLabel: 'Displacement' },
      lightMap: { label: 'Light Map', shortLabel: 'Light' },
      envMap: { label: 'Environment Map', shortLabel: 'Environment' }
    };
    return slots[key] || { label: key, shortLabel: key };
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
   * Extract embedded textures to temporary directory
   * @param {Array} materials - Array of material data
   * @returns {Promise<void>}
   */
  async extractEmbeddedTextures(materials) {
    const promises = [];

    for (const materialData of materials) {
      for (const [key, textureData] of Object.entries(materialData.textures)) {
        const texture = textureData.texture;
        
        // Check if texture is embedded (data URL)
        if (texture.image && texture.image.src && texture.image.src.startsWith('data:')) {
          const promise = this.extractEmbeddedTexture(
            materialData.uuid,
            key,
            texture.image.src,
            materialData.name
          ).then(path => {
            if (path) {
              textureData.source = path.split(/[/\\]/).pop();
              textureData.extractedPath = path;
            }
          });
          promises.push(promise);
        }
      }
    }

    await Promise.all(promises);
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
      // Convert data URL to buffer
      const base64Data = dataUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      // Determine file extension from data URL
      const mimeMatch = dataUrl.match(/data:image\/(\w+);/);
      const extension = mimeMatch ? mimeMatch[1] : 'png';

      // Create a safe filename
      const safeMaterialName = materialName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeMaterialName}_${textureKey}.${extension}`;

      // Save to temp directory via electron
      const path = await window.electronAPI.saveTextureToTemp(filename, buffer);
      
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
    this.materials.forEach(materialData => {
      Object.values(materialData.textures).forEach(textureData => {
        if (textureData.texture) {
          textureData.texture.dispose();
        }
      });
    });

    this.materials = [];
    this.textureCache.clear();
  }

  /**
   * Get all materials
   * @returns {Array} Array of material data
   */
  getMaterials() {
    return this.materials;
  }

  /**
   * Get a specific material by UUID
   * @param {string} uuid - Material UUID
   * @returns {Object} Material data
   */
  getMaterialByUuid(uuid) {
    return this.materials.find(m => m.uuid === uuid);
  }

  /**
   * Get thumbnail data URL for a texture
   * @param {THREE.Texture} texture - The texture to create thumbnail from
   * @param {number} size - Thumbnail size (default 64)
   * @returns {string} Data URL of thumbnail
   */
  getTextureThumbnail(texture, size = 64) {
    if (!texture || !texture.image) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Draw the texture image to canvas
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

      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to create thumbnail:', error);
      return null;
    }
  }
}
