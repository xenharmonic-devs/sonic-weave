import {describe, expect, it} from 'vitest';
import {parseSubgroup} from '../warts.js';

function prime(numerator: number) {
  return {radical: false, numerator, denominator: null};
}

describe('parseSubgroup', () => {
  it('rejects spanning through inf', () => {
    expect(() => parseSubgroup([prime(2), '', 'inf'])).toThrow(
      'Can only span subgroups to primes.',
    );
  });

  it('still allows spanning between primes', () => {
    const {subgroup} = parseSubgroup([prime(2), '', prime(5)]);
    expect(subgroup.map(monzo => monzo.toFraction().toFraction())).toEqual([
      '2',
      '3',
      '5',
    ]);
  });
});
