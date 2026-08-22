import { describe, expect, it } from 'vitest';
import { getDecimalPrecision, roundValueToStep } from '@/slider/utils/roundValueToStep';

describe('roundValueToStep', () => {
  describe('getDecimalPrecision', () => {
    it('returns 0 for integers', () => {
      expect(getDecimalPrecision(1)).toBe(0);
      expect(getDecimalPrecision(100)).toBe(0);
    });

    it('returns the correct precision for decimals', () => {
      expect(getDecimalPrecision(0.1)).toBe(1);
      expect(getDecimalPrecision(0.01)).toBe(2);
      expect(getDecimalPrecision(1.234)).toBe(3);
    });
  });

  describe('roundValueToStep', () => {
    it('rounds up to the nearest step', () => {
      expect(roundValueToStep(4, 5, 0)).toBe(5);
    });

    it('rounds down to the nearest step', () => {
      expect(roundValueToStep(6, 5, 0)).toBe(5);
    });

    it('preserves exact step values', () => {
      expect(roundValueToStep(5, 5, 0)).toBe(5);
      expect(roundValueToStep(10, 5, 0)).toBe(10);
    });

    it('clamps to min', () => {
      expect(roundValueToStep(-1, 5, 0)).toBe(0);
    });

    it('handles decimal steps', () => {
      expect(roundValueToStep(2.34, 0.1, 0)).toBe(2.3);
      expect(roundValueToStep(2.36, 0.1, 0)).toBe(2.4);
    });
  });
});