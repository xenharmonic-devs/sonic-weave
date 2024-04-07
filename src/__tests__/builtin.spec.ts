import {describe, it, expect} from 'vitest';
import {hasConstantStructure} from '../builtin';
import {TimeMonzo} from '../monzo';

describe('Constant structure checker', () => {
  it('accepts the empty scale', () => {
    expect(hasConstantStructure([])).toBe(true);
  });

  it('Accepts the trivial scale', () => {
    expect(hasConstantStructure([TimeMonzo.fromFraction(2)])).toBe(true);
  });

  it('Rejects a scale with a repeated step (early)', () => {
    expect(
      hasConstantStructure([
        TimeMonzo.fromFraction(1),
        TimeMonzo.fromFraction(2),
      ])
    ).toBe(false);
  });

  it('Rejects a scale with a repeated step (late)', () => {
    expect(
      hasConstantStructure([
        TimeMonzo.fromFraction(2),
        TimeMonzo.fromFraction(2),
      ])
    ).toBe(false);
  });
});
