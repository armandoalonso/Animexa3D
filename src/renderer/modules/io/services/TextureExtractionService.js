/**
 * TextureExtractionService
 * Pure logic for extracting materials and textures from 3D models
 * No DOM dependencies, fully testable
 */
export class TextureExtractionService {
  /**
   * Extract all materials and their textures from a loaded model
   * @param {THREE.Object3D} model - The loaded 3D model
   * @returns {Array} Array of material data with texture information
   */
  extractMaterialsFromModel(model) {
    const materials = [];
    const materialMap = new Map();

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const childMaterials = Array.isArray(child.material) 
          ? child.material 
          : [child.material];

        childMaterials.forEach((material) => {
          // Avoid duplicates
          if (materialMap.has(material.uuid)) {
            const matData = materialMap.get(material.uuid);
            matData.meshes.push(child);
            return;
          }

          const materialData = {
            uuid: material.uuid,
            name: material.name || `Material ${materials.length + 1}`,
            material: material,
            textures: this.extractTexturesFromMaterial(material),
            meshes: [child] // Track which meshes use this material
          };

          materialMap.set(material.uuid, materialData);
          materials.push(materialData);
        });
      }
    });

    return materials;
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
          return 'Embedded';
        }
        if (texture.image.src.startsWith('blob:')) {
          return 'Blob Texture';
        }
        // Try to extract filename from URL
        const urlPath = texture.image.src.split('/').pop();
        const cleanPath = urlPath.split('?')[0]; // Remove query params
        return cleanPath || 'Texture';
      } else if (texture.image.currentSrc) {
        const urlPath = texture.image.currentSrc.split('/').pop();
        const cleanPath = urlPath.split('?')[0];
        return cleanPath || 'Texture';
      } else if (texture.image instanceof HTMLCanvasElement) {
        return 'Canvas/Embedded';
      }
    }
    
    // Check if texture was loaded from a file
    if (texture.userData && texture.userData.path) {
      return texture.userData.path.split('/').pop();
    }

    // Check texture name
    if (texture.name) {
      return texture.name;
    }

    return 'Embedded/Generated';
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
   * Check if a texture is embedded (data URL, canvas, or no external source)
   * @param {THREE.Texture} texture - The texture to check
   * @returns {boolean} True if texture is embedded
   */
  isEmbeddedTexture(texture) {
    if (!texture || !texture.image) {
      return false;
    }

    // Data URL is embedded
    if (texture.image.src && texture.image.src.startsWith('data:')) {
      return true;
    }
    
    // Canvas is embedded
    if (texture.image instanceof HTMLCanvasElement) {
      return true;
    }
    
    // Only embedded if has currentSrc but no src at all
    if (!texture.image.src && texture.image.currentSrc) {
      return true;
    }
    
    return false;
  }

  /**
   * Extract filename from path (cross-platform)
   * @param {string} path - File path
   * @returns {string} Filename
   */
  extractFilename(path) {
    return path.split(/[/\\]/).pop();
  }
}
