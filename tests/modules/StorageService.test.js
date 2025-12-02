import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../../src/renderer/modules/core/StorageService.js';

/**
 * Mock storage implementation for testing
 */
class MockStorage {
  constructor() {
    this.store = {};
    this.length = 0;
  }

  setItem(key, value) {
    if (!(key in this.store)) {
      this.length++;
    }
    this.store[key] = String(value);
  }

  getItem(key) {
    return this.store[key] || null;
  }

  removeItem(key) {
    if (key in this.store) {
      delete this.store[key];
      this.length--;
    }
  }

  clear() {
    this.store = {};
    this.length = 0;
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

describe('StorageService', () => {
  let mockStorage;
  let storageService;

  beforeEach(() => {
    mockStorage = new MockStorage();
    storageService = new StorageService(mockStorage);
  });

  describe('save()', () => {
    it('should save simple data', () => {
      const result = storageService.save('test-key', { foo: 'bar' });
      
      expect(result).toBe(true);
      expect(mockStorage.getItem('test-key')).toBe('{"foo":"bar"}');
    });

    it('should save arrays', () => {
      const data = [1, 2, 3, 4, 5];
      const result = storageService.save('array-key', data);
      
      expect(result).toBe(true);
      expect(mockStorage.getItem('array-key')).toBe('[1,2,3,4,5]');
    });

    it('should save nested objects', () => {
      const data = {
        user: {
          name: 'Test',
          settings: {
            theme: 'dark',
            notifications: true
          }
        }
      };
      const result = storageService.save('nested-key', data);
      
      expect(result).toBe(true);
      const stored = JSON.parse(mockStorage.getItem('nested-key'));
      expect(stored.user.settings.theme).toBe('dark');
    });

    it('should overwrite existing keys', () => {
      storageService.save('key', 'value1');
      storageService.save('key', 'value2');
      
      expect(mockStorage.getItem('key')).toBe('"value2"');
    });

    it('should handle save errors gracefully', () => {
      const brokenStorage = {
        setItem: () => {
          throw new Error('Storage full');
        }
      };
      const service = new StorageService(brokenStorage);
      
      const result = service.save('key', 'value');
      expect(result).toBe(false);
    });
  });

  describe('load()', () => {
    it('should load saved data', () => {
      mockStorage.setItem('test-key', '{"foo":"bar"}');
      
      const result = storageService.load('test-key');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return default value for non-existent key', () => {
      const result = storageService.load('non-existent', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should return null as default when no default provided', () => {
      const result = storageService.load('non-existent');
      expect(result).toBe(null);
    });

    it('should load arrays', () => {
      mockStorage.setItem('array-key', '[1,2,3]');
      
      const result = storageService.load('array-key');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should load nested objects', () => {
      const data = { user: { settings: { theme: 'dark' } } };
      mockStorage.setItem('nested-key', JSON.stringify(data));
      
      const result = storageService.load('nested-key');
      expect(result.user.settings.theme).toBe('dark');
    });

    it('should return default value on parse error', () => {
      mockStorage.setItem('broken-key', 'not valid json {{{');
      
      const result = storageService.load('broken-key', { fallback: true });
      expect(result).toEqual({ fallback: true });
    });
  });

  describe('remove()', () => {
    it('should remove existing key', () => {
      mockStorage.setItem('test-key', 'value');
      
      const result = storageService.remove('test-key');
      
      expect(result).toBe(true);
      expect(mockStorage.getItem('test-key')).toBe(null);
    });

    it('should handle removing non-existent key', () => {
      const result = storageService.remove('non-existent');
      expect(result).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should clear all data', () => {
      mockStorage.setItem('key1', 'value1');
      mockStorage.setItem('key2', 'value2');
      mockStorage.setItem('key3', 'value3');
      
      const result = storageService.clear();
      
      expect(result).toBe(true);
      expect(mockStorage.length).toBe(0);
      expect(mockStorage.getItem('key1')).toBe(null);
      expect(mockStorage.getItem('key2')).toBe(null);
    });
  });

  describe('has()', () => {
    it('should return true for existing key', () => {
      mockStorage.setItem('test-key', 'value');
      
      expect(storageService.has('test-key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(storageService.has('non-existent')).toBe(false);
    });

    it('should return false when storage is not available', () => {
      const noStorageService = new StorageService(null);
      expect(noStorageService.has('key')).toBe(false);
    });
  });

  describe('getAllKeys()', () => {
    it('should return all keys', () => {
      mockStorage.setItem('key1', 'value1');
      mockStorage.setItem('key2', 'value2');
      mockStorage.setItem('key3', 'value3');
      
      const keys = storageService.getAllKeys();
      
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array when storage is not available', () => {
      const noStorageService = new StorageService(null);
      const keys = noStorageService.getAllKeys();
      
      expect(keys).toEqual([]);
    });
  });

  describe('getLength()', () => {
    it('should return correct length', () => {
      expect(storageService.getLength()).toBe(0);
      
      mockStorage.setItem('key1', 'value1');
      expect(storageService.getLength()).toBe(1);
      
      mockStorage.setItem('key2', 'value2');
      expect(storageService.getLength()).toBe(2);
      
      mockStorage.removeItem('key1');
      expect(storageService.getLength()).toBe(1);
    });

    it('should return 0 when storage is not available', () => {
      const noStorageService = new StorageService(null);
      expect(noStorageService.getLength()).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete save-load-remove cycle', () => {
      const testData = { test: 'data', nested: { value: 123 } };
      
      // Save
      const saveResult = storageService.save('cycle-key', testData);
      expect(saveResult).toBe(true);
      
      // Load
      const loadedData = storageService.load('cycle-key');
      expect(loadedData).toEqual(testData);
      
      // Verify existence
      expect(storageService.has('cycle-key')).toBe(true);
      
      // Remove
      const removeResult = storageService.remove('cycle-key');
      expect(removeResult).toBe(true);
      
      // Verify removal
      expect(storageService.has('cycle-key')).toBe(false);
      expect(storageService.load('cycle-key')).toBe(null);
    });

    it('should handle multiple simultaneous operations', () => {
      const data1 = { id: 1 };
      const data2 = { id: 2 };
      const data3 = { id: 3 };
      
      storageService.save('item1', data1);
      storageService.save('item2', data2);
      storageService.save('item3', data3);
      
      expect(storageService.getLength()).toBe(3);
      expect(storageService.load('item2')).toEqual(data2);
      
      storageService.remove('item2');
      
      expect(storageService.getLength()).toBe(2);
      expect(storageService.has('item2')).toBe(false);
      expect(storageService.has('item1')).toBe(true);
      expect(storageService.has('item3')).toBe(true);
    });
  });
});
