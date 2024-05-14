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
    expect(result).toContain('[1 1>@0.inf');
  });

  it('has representation for negative infinity Hz', () => {
    const result = toSonicWeaveInterchange('-inf * 1 Hz');
    expect(result).toContain('[1. 1 1>@Hz.-1.inf');
  });

  it('has representation for nan Hz (normalizes)', () => {
    const result = toSonicWeaveInterchange('nan * 1 Hz');
    expect(result).toContain('[1 1>@0.inf');
  });
});
