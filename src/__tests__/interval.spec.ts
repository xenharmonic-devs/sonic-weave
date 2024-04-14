import {describe, it, expect} from 'vitest';
import {TimeMonzo} from '../monzo';
import {intervalValueAs} from '../interval';
import {FractionLiteral, NedjiLiteral} from '../expression';

describe('Idempontent formatting', () => {
  it('has stable ratios (common factor)', () => {
    const sixOverFour = TimeMonzo.fromFraction('6/4', 2);
    const node = intervalValueAs(sixOverFour, {
      type: 'FractionLiteral',
      numerator: 6n,
      denominator: 4n,
    }) as FractionLiteral;
    expect(node.numerator).toBe(6n);
    expect(node.denominator).toBe(4n);
  });

  it('has stable ratios (denominator)', () => {
    const fourOverThree = TimeMonzo.fromFraction('4/3', 2);
    const node = intervalValueAs(fourOverThree, {
      type: 'FractionLiteral',
      numerator: 1n,
      denominator: 6n,
    }) as FractionLiteral;
    expect(node.numerator).toBe(8n);
    expect(node.denominator).toBe(6n);
    const iterated = intervalValueAs(fourOverThree, node) as FractionLiteral;
    expect(iterated.numerator).toBe(8n);
    expect(iterated.denominator).toBe(6n);
  });

  it('has stable equal temperament', () => {
    const majorThird = TimeMonzo.fromEqualTemperament('4/12');
    const node = intervalValueAs(majorThird, {
      type: 'NedjiLiteral',
      numerator: 4,
      denominator: 12,
      equaveNumerator: null,
      equaveDenominator: null,
    }) as NedjiLiteral;
    expect(node.numerator).toBe(4);
    expect(node.denominator).toBe(12);
  });
});
