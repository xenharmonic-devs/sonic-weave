import {describe, it, expect} from 'vitest';
import {getFormalComma, getNeutralComma, inflect} from '../fjs';
import {PRIMES} from 'xen-dev-utils';
import {
  AbsolutePitch,
  Pythagorean,
  absoluteMonzo,
  pythagoreanMonzo,
} from '../pythagorean';

describe('Formal comma calculator', () => {
  it.each([
    [5, '80/81'],
    [7, '63/64'],
    [11, '33/32'],
    [13, '1053/1024'],
    [17, '4131/4096'],
    [19, '513/512'],
    [23, '736/729'],
    [29, '261/256'],
    [31, '248/243'],
  ])('Has a comma for prime %s', (prime, comma) => {
    const fraction = getFormalComma(PRIMES.indexOf(prime)).toFraction();
    expect(fraction.equals(comma), `${fraction.toFraction()} != ${comma}`).toBe(
      true
    );
  });
});

describe('Neutral comma calculator', () => {
  it.each([
    [11, '242/243'],
    [13, '507/512'],
    [29, '841/864'],
    [31, '2101707/2097152'],
    [37, '175232/177147'],
    [47, '536787/524288'],
    [59, '3481/3456'],
    [79, '6241/6144'],
    [83, '135596187/134217728'],
  ])('Has a neutral comma for prime %s', (prime, square) => {
    const comma = getNeutralComma(PRIMES.indexOf(prime));
    expect(comma.pow(2).toFraction().equals(square)).toBe(true);
  });
});

describe('FJS interval inflector', () => {
  it.each([
    ['P', 8, [], [], '2/1'],
    ['P', 5, [], [], '3/2'],
    ['M', 3, [5], [], '5/4'],
    ['m', 7, [7], [], '7/4'],
    ['P', 4, [11], [], '11/8'],
    ['m', 6, [13], [], '13/8'],
    ['d', 5, [7], [5], '7/5'],
    // Automatic factoring
    ['A', 1, [25], [], '25/24'],
    ['A', 1, [5, 5], [], '25/24'],
    // Resistant to the first two primes
    ['M', 2, [10], [9], '10/9'],
    // Neutral extension
    ['n', 2, [], [11], '12/11'],
    ['n', 2, [11], [5], '11/10'],
    ['n', 3, [11], [], '11/9'],
    ['sA', 4, [11], [], '11/8'],
    ['n', 2, [13], [], '13/12'],
    ['sd', 4, [7], [11], '14/11'],
    ['sA', 2, [5], [13], '15/13'],
    // Neutral resistance with automatic factoring
    ['n', 7, [13, 319], [6], '4147/2304'],
  ])(
    'Inflects %s%s%s%s',
    (quality, degree, superscripts, subscripts, fraction) => {
      const base = ((Math.abs(degree) - 1) % 7) + 1;
      const octaves = Math.floor((Math.abs(degree) - 1) / 7);
      const imperfect = ![1, 4, 5].includes(degree);
      const node: Pythagorean = {
        type: 'Pythagorean',
        quality,
        degree: {base, octaves, negative: false},
        imperfect,
      };
      const monzo = pythagoreanMonzo(node);
      const interval = inflect(
        monzo,
        superscripts.map(BigInt),
        subscripts.map(BigInt)
      );
      expect(interval.toFraction().equals(fraction)).toBe(true);
    }
  );
});

describe('Absolute FJS pitch inflector', () => {
  it.each([
    ['C', [], 4, [], [], '1/1'],
    ['C', [], 5, [], [], '2/1'],
    ['F', [], 4, [], [], '4/3'],
    ['E', [], 4, [5], [], '5/4'],
    ['E', ['d'], 4, [11], [], '11/9'],
  ])(
    'Inflects %s%s%s%s%s',
    (nominal, accidentals, octave, superscripts, subscripts, fraction) => {
      const node: AbsolutePitch = {
        type: 'AbsolutePitch',
        nominal: nominal as AbsolutePitch['nominal'],
        accidentals,
        octave: BigInt(octave),
      };
      const monzo = absoluteMonzo(node);
      const interval = inflect(
        monzo,
        superscripts.map(BigInt),
        subscripts.map(BigInt)
      );
      expect(interval.toFraction().equals(fraction)).toBe(true);
    }
  );
});
