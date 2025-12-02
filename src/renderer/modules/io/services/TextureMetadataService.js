/**
 * TextureMetadataService
 * Pure logic for texture slot metadata and validation
 * No dependencies, fully testable
 */
export class TextureMetadataService {
  constructor() {
    this.textureSlots = {
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

    this.validTextureExtensions = new Set([
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tga', 'tiff', 'tif'
    ]);
  }

  /**
   * Get texture slot information
   * @param {string} key - Texture slot key
   * @returns {Object} Slot information with label and shortLabel
   */
  getTextureSlotInfo(key) {
    return this.textureSlots[key] || { label: key, shortLabel: key };
  }

  /**
   * Get all available texture slots
   * @returns {Object} All texture slot definitions
   */
  getAllTextureSlots() {
    return { ...this.textureSlots };
  }

  /**
   * Get array of all texture slot keys
   * @returns {Array<string>} Array of slot keys
   */
  getTextureSlotKeys() {
    return Object.keys(this.textureSlots);
  }

  /**
   * Check if a texture slot key is valid
   * @param {string} key - Texture slot key to validate
   * @returns {boolean} True if the slot key exists
   */
  isValidTextureSlot(key) {
    return key in this.textureSlots;
  }

  /**
   * Check if a file extension is a valid texture type
   * @param {string} extension - File extension (with or without dot)
   * @returns {boolean} True if extension is valid for textures
   */
  isValidTextureType(extension) {
    const ext = extension.toLowerCase().replace(/^\./, '');
    return this.validTextureExtensions.has(ext);
  }

  /**
   * Get texture slots with specific metadata
   * @returns {Array} Array of texture slot objects with key, label, and shortLabel
   */
  getTextureSlotList() {
    return Object.entries(this.textureSlots).map(([key, info]) => ({
      key,
      ...info
    }));
  }

  /**
   * Check if a texture slot should use linear color space
   * @param {string} key - Texture slot key
   * @returns {boolean} True if the slot should use linear color space
   */
  shouldUseLinearColorSpace(key) {
    const linearSlots = ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];
    return linearSlots.includes(key);
  }

  /**
   * Get recommended file format for a texture slot
   * @param {string} key - Texture slot key
   * @returns {string} Recommended format (png, jpg, etc.)
   */
  getRecommendedFormat(key) {
    const formatMap = {
      map: 'jpg', // Albedo can use compression
      normalMap: 'png', // Normal maps need precision
      roughnessMap: 'jpg',
      metalnessMap: 'jpg',
      aoMap: 'jpg',
      emissiveMap: 'jpg',
      specularMap: 'jpg',
      alphaMap: 'png', // Alpha needs transparency
      bumpMap: 'jpg',
      displacementMap: 'png',
      lightMap: 'jpg',
      envMap: 'jpg'
    };
    return formatMap[key] || 'png';
  }
}
