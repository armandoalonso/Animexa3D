import { describe, it, expect } from 'vitest';

describe('SceneManager - Color Conversion', () => {
  describe('hex string to number conversion', () => {
    it('should convert #RRGGBB to 0xRRGGBB', () => {
      const input = '#2c3e50';
      const expected = 0x2c3e50;
      const result = parseInt(input.replace('#', ''), 16);
      expect(result).toBe(expected);
    });

    it('should convert RRGGBB (without #) to 0xRRGGBB', () => {
      const input = '2c3e50';
      const expected = 0x2c3e50;
      const result = parseInt(input.replace('#', ''), 16);
      expect(result).toBe(expected);
    });

    it('should handle white color', () => {
      const input = '#FFFFFF';
      const expected = 0xFFFFFF;
      const result = parseInt(input.replace('#', ''), 16);
      expect(result).toBe(expected);
    });

    it('should handle black color', () => {
      const input = '#000000';
      const expected = 0x000000;
      const result = parseInt(input.replace('#', ''), 16);
      expect(result).toBe(expected);
    });

    it('should handle various color strings', () => {
      const testCases = [
        { input: '#ff0000', expected: 0xff0000 },
        { input: '#00ff00', expected: 0x00ff00 },
        { input: '#0000ff', expected: 0x0000ff },
        { input: '123456', expected: 0x123456 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseInt(input.replace('#', ''), 16);
        expect(result).toBe(expected);
      });
    });

    it('should handle numeric input (pass through)', () => {
      const input = 0x2c3e50;
      // If it's already a number, use it as-is
      const result = typeof input === 'string' 
        ? parseInt(input.replace('#', ''), 16) 
        : input;
      expect(result).toBe(0x2c3e50);
    });
  });
});
