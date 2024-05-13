import {describe, it, expect} from 'vitest';
import {toSonicWeaveInterchange} from '../cli';

describe('Interchange format', () => {
  it('uses plain monzos up to 23-limit', () => {
    const result = toSonicWeaveInterchange('23/16 "test"');
    expect(result).toContain('[-4 0 0 0 0 0 0 0 1> "test"');
  });

  it('has representation for infinity', () => {
    const result = toSonicWeaveInterchange('Infinity');
    expect(result).toContain('Infinity');
  });

  it('has representation for NaN', () => {
    const result = toSonicWeaveInterchange('NaN');
    expect(result).toContain('NaN');
  });

  it('has representation for Infinity Hz', () => {
    const result = toSonicWeaveInterchange('Infinity * 1 Hz');
    expect(result).toContain('Infinity * 1Hz');
  });

  it('has representation for NaN Hz (normalizes)', () => {
    const result = toSonicWeaveInterchange('NaN * 1 Hz');
    expect(result).toContain('NaN');
  });
});
