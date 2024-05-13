import {describe, it, expect} from 'vitest';
import {toSonicWeaveInterchange} from '../cli';

describe('Interchange format', () => {
  it('uses plain monzos up to 23-limit', () => {
    const result = toSonicWeaveInterchange('23/16 "test"');
    expect(result).toContain('[-4 0 0 0 0 0 0 0 1> "test"');
  });

  it('has representation for infinity', () => {
    const result = toSonicWeaveInterchange('inf');
    expect(result).toContain('inf');
  });

  it('has representation for nan', () => {
    const result = toSonicWeaveInterchange('nan');
    expect(result).toContain('nan');
  });

  it('has representation for infinity Hz', () => {
    const result = toSonicWeaveInterchange('inf * 1 Hz');
    expect(result).toContain('inf * 1Hz');
  });

  it('has representation for nan Hz (normalizes)', () => {
    const result = toSonicWeaveInterchange('nan * 1 Hz');
    expect(result).toContain('nan');
  });
});
