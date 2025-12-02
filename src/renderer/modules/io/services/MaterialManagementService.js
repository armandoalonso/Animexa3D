/**
 * MaterialManagementService
 * Pure logic for managing materials collection
 * No DOM or I/O dependencies, fully testable
 */
export class MaterialManagementService {
  constructor() {
    this.materials = [];
  }

  /**
   * Get all materials
   * @returns {Array} Array of material data
   */
  getMaterials() {
    return this.materials;
  }

  /**
   * Set the materials collection
   * @param {Array} materials - Array of material data
   */
  setMaterials(materials) {
    this.materials = materials;
  }

  /**
   * Add a single material to the collection
   * @param {Object} materialData - Material data object
   */
  addMaterial(materialData) {
    this.materials.push(materialData);
  }

  /**
   * Get a specific material by UUID
   * @param {string} uuid - Material UUID
   * @returns {Object|undefined} Material data or undefined if not found
   */
  getMaterialByUuid(uuid) {
    return this.materials.find(m => m.uuid === uuid);
  }

  /**
   * Track which meshes use a specific material
   * @param {string} materialUuid - UUID of the material
   * @param {Array} meshes - Array of mesh objects
   */
  trackMaterialUsage(materialUuid, meshes) {
    const materialData = this.getMaterialByUuid(materialUuid);
    if (materialData) {
      materialData.meshes = meshes;
    }
  }

  /**
   * Update texture data for a material
   * @param {string} materialUuid - UUID of the material
   * @param {string} textureKey - Texture slot key
   * @param {Object} textureData - New texture data
   * @returns {boolean} True if update was successful
   */
  updateMaterialTexture(materialUuid, textureKey, textureData) {
    const materialData = this.getMaterialByUuid(materialUuid);
    if (!materialData) {
      return false;
    }

    materialData.textures[textureKey] = textureData;
    return true;
  }

  /**
   * Remove a texture from a material's texture collection
   * @param {string} materialUuid - UUID of the material
   * @param {string} textureKey - Texture slot key to remove
   * @returns {boolean} True if removal was successful
   */
  removeMaterialTexture(materialUuid, textureKey) {
    const materialData = this.getMaterialByUuid(materialUuid);
    if (!materialData || !materialData.textures[textureKey]) {
      return false;
    }

    delete materialData.textures[textureKey];
    return true;
  }

  /**
   * Clear all materials
   */
  clearMaterials() {
    this.materials = [];
  }

  /**
   * Get count of materials
   * @returns {number} Number of materials
   */
  getMaterialCount() {
    return this.materials.length;
  }

  /**
   * Check if a material exists by UUID
   * @param {string} uuid - Material UUID
   * @returns {boolean} True if material exists
   */
  hasMaterial(uuid) {
    return this.materials.some(m => m.uuid === uuid);
  }

  /**
   * Get all materials that have a specific texture slot populated
   * @param {string} textureKey - Texture slot key
   * @returns {Array} Array of materials with that texture
   */
  getMaterialsWithTexture(textureKey) {
    return this.materials.filter(m => 
      m.textures && m.textures[textureKey]
    );
  }

  /**
   * Get materials by name (partial match)
   * @param {string} nameQuery - Name to search for
   * @returns {Array} Array of matching materials
   */
  getMaterialsByName(nameQuery) {
    const lowerQuery = nameQuery.toLowerCase();
    return this.materials.filter(m => 
      m.name && m.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get statistics about materials
   * @returns {Object} Statistics object
   */
  getStatistics() {
    let totalTextures = 0;
    let materialsWithTextures = 0;
    const textureSlotUsage = {};

    this.materials.forEach(material => {
      const textureCount = Object.keys(material.textures || {}).length;
      if (textureCount > 0) {
        materialsWithTextures++;
        totalTextures += textureCount;
      }

      Object.keys(material.textures || {}).forEach(key => {
        textureSlotUsage[key] = (textureSlotUsage[key] || 0) + 1;
      });
    });

    return {
      totalMaterials: this.materials.length,
      materialsWithTextures,
      totalTextures,
      textureSlotUsage
    };
  }

  /**
   * Validate material data structure
   * @param {Object} materialData - Material data to validate
   * @returns {boolean} True if valid
   */
  isValidMaterialData(materialData) {
    if (!materialData || typeof materialData !== 'object') {
      return false;
    }
    
    return (
      typeof materialData.uuid === 'string' &&
      typeof materialData.name === 'string' &&
      materialData.material &&
      materialData.textures &&
      Array.isArray(materialData.meshes)
    );
  }
}
