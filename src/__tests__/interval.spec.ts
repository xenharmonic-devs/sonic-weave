import {describe, it, expect} from 'vitest';
import {TimeMonzo} from '../monzo';
import {timeMonzoAs} from '../interval';
import {FractionLiteral, NedjiLiteral} from '../expression';

describe('Idempontent formatting', () => {
  it('has stable ratios (common factor)', () => {
    const sixOverFour = TimeMonzo.fromFraction('6/4', 2);
    const node = timeMonzoAs(sixOverFour, {
      type: 'FractionLiteral',
      numerator: 6n,
      denominator: 4n,
    }) as FractionLiteral;
    expect(node.numerator).toBe(6n);
    expect(node.denominator).toBe(4n);
  });

  it('has stable ratios (denominator)', () => {
    const fourOverThree = TimeMonzo.fromFraction('4/3', 2);
    const node = timeMonzoAs(fourOverThree, {
      type: 'FractionLiteral',
      numerator: 1n,
      denominator: 6n,
    }) as FractionLiteral;
    expect(node.numerator).toBe(8n);
    expect(node.denominator).toBe(6n);
    const iterated = timeMonzoAs(fourOverThree, node) as FractionLiteral;
    expect(iterated.numerator).toBe(8n);
    expect(iterated.denominator).toBe(6n);
  });

  it('has stable equal temperament', () => {
    const majorThird = TimeMonzo.fromEqualTemperament('4/12');
    const node = timeMonzoAs(majorThird, {
      type: 'NedoLiteral',
      numerator: 4n,
      denominator: 12n,
    }) as NedjiLiteral;
    expect(node.numerator).toBe(4n);
    expect(node.denominator).toBe(12n);
  });
});
