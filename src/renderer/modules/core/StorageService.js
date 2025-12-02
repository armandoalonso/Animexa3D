/**
 * StorageService - Abstraction over localStorage for testability
 * Allows injection of mock storage in tests
 */
export class StorageService {
  constructor(storage = undefined) {
    // Allow injection of storage backend (for testing)
    // Falls back to browser localStorage if not provided
    // If storage is explicitly null, use null (for testing failure cases)
    if (storage === undefined) {
      this.storage = typeof localStorage !== 'undefined' ? localStorage : null;
    } else {
      this.storage = storage;
    }
  }

  /**
   * Save data to storage
   * @param {string} key - Storage key
   * @param {any} data - Data to store (will be JSON.stringify'd)
   * @returns {boolean} Success status
   */
  save(key, data) {
    if (!this.storage) {
      console.warn('StorageService: No storage backend available');
      return false;
    }

    try {
      const jsonString = JSON.stringify(data);
      this.storage.setItem(key, jsonString);
      return true;
    } catch (error) {
      console.error(`StorageService: Failed to save key "${key}":`, error);
      return false;
    }
  }

  /**
   * Load data from storage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key not found or parse fails
   * @returns {any} Parsed data or defaultValue
   */
  load(key, defaultValue = null) {
    if (!this.storage) {
      console.warn('StorageService: No storage backend available');
      return defaultValue;
    }

    try {
      const jsonString = this.storage.getItem(key);
      
      if (jsonString === null) {
        return defaultValue;
      }

      return JSON.parse(jsonString);
    } catch (error) {
      console.error(`StorageService: Failed to load key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Remove data from storage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  remove(key) {
    if (!this.storage) {
      console.warn('StorageService: No storage backend available');
      return false;
    }

    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`StorageService: Failed to remove key "${key}":`, error);
      return false;
    }
  }

  /**
   * Clear all data from storage
   * @returns {boolean} Success status
   */
  clear() {
    if (!this.storage) {
      console.warn('StorageService: No storage backend available');
      return false;
    }

    try {
      this.storage.clear();
      return true;
    } catch (error) {
      console.error('StorageService: Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Check if a key exists in storage
   * @param {string} key - Storage key
   * @returns {boolean} Whether key exists
   */
  has(key) {
    if (!this.storage) {
      return false;
    }

    return this.storage.getItem(key) !== null;
  }

  /**
   * Get all keys in storage
   * @returns {string[]} Array of all keys
   */
  getAllKeys() {
    if (!this.storage) {
      return [];
    }

    try {
      // Handle real localStorage with indexed access
      if (typeof this.storage.key === 'function') {
        const keys = [];
        for (let i = 0; i < this.storage.length; i++) {
          const key = this.storage.key(i);
          if (key) keys.push(key);
        }
        return keys;
      }
      // Fallback for mock storage or plain objects
      return Object.keys(this.storage.store || this.storage);
    } catch (error) {
      console.error('StorageService: Failed to get all keys:', error);
      return [];
    }
  }

  /**
   * Get the number of items in storage
   * @returns {number} Number of items
   */
  getLength() {
    if (!this.storage) {
      return 0;
    }

    try {
      return this.storage.length;
    } catch (error) {
      console.error('StorageService: Failed to get storage length:', error);
      return 0;
    }
  }
}
