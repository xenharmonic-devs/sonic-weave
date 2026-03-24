import {describe, expect, it} from 'vitest';
import {
  getHEWM53,
  getHelmholtzEllis,
  getLumisComma,
  getSyntonicRastmic,
} from '../extra-commas';

describe('extra commas lookup tables', () => {
  it('falls back to unison for negative Helmholtz-Ellis indices', () => {
    expect(getHelmholtzEllis(-1).toFraction().toFraction()).toBe('1');
  });

  it('falls back to unison for negative HEWM53 indices', () => {
    expect(getHEWM53(-1).toFraction().toFraction()).toBe('1');
  });

  it('falls back to unison for out-of-range indices', () => {
    expect(getHelmholtzEllis(10_000).toFraction().toFraction()).toBe('1');
    expect(getHEWM53(10_000).toFraction().toFraction()).toBe('1');
  });

  it('rejects invalid syntonic-rastmic IDs', () => {
    expect(getSyntonicRastmic(-12).toFraction().toFraction()).toBe('1');
    expect(getSyntonicRastmic(1.2).toFraction().toFraction()).toBe('1');
  });

  it('rejects invalid lumis comma IDs', () => {
    expect(getLumisComma(-12).toFraction().toFraction()).toBe('1');
    expect(getLumisComma(1.2).toFraction().toFraction()).toBe('1');
  });
});
