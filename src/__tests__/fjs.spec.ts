import {describe, it, expect} from 'vitest';
import {
  getFloraComma,
  getFormalComma,
  getNeutralComma,
  getSemiquartalComma,
  getToneSplitterComma,
  inflect,
} from '../fjs';
import {PRIMES} from 'xen-dev-utils';
import {
  AbsolutePitch,
  Accidental,
  AugmentedQuality,
  Pythagorean,
  VulgarFraction,
  absoluteMonzo,
  pythagoreanMonzo,
} from '../pythagorean';
import {FJSInflection} from '../expression';

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
    [37, '37/36'],
    [41, '82/81'],
    [43, '129/128'],
    [47, '47/48'],
    [53, '53/54'],
    [59, '236/243'],
    [61, '244/243'],
    [67, '16281/16384'],
    [71, '71/72'],
    [73, '73/72'],
    [79, '79/81'],
    [83, '249/256'],
    [89, '712/729'],
    [97, '97/96'],
  ])('Has a comma for prime %s', (prime, comma) => {
    const fraction = getFormalComma(PRIMES.indexOf(prime)).toFraction();
    expect(fraction.equals(comma), `${fraction.toFraction()} != ${comma}`).toBe(
      true
    );
  });
});

describe('FloraC comma calculator', () => {
  it.each([
    [5, '80/81'],
    [7, '63/64'],
    [11, '33/32'],
    [13, '1053/1024'],
    [17, '4131/4096'],
    [19, '513/512'],
    [23, '736/729'],
    [29, '261/256'],
    [31, '31/32'],
    [37, '37/36'],
    [41, '82/81'],
    [43, '129/128'],
    [47, '47/48'],
    [53, '53/54'],
    [59, '236/243'],
    [61, '244/243'],
    [67, '16281/16384'],
    [71, '71/72'],
    [73, '73/72'],
    [79, '79/81'],
    [83, '249/256'],
    [89, '712/729'],
    [97, '97/96'],
  ])('Has a comma for prime %s', (prime, comma) => {
    const fraction = getFloraComma(PRIMES.indexOf(prime)).toFraction();
    expect(fraction.equals(comma), `${fraction.toFraction()} != ${comma}`).toBe(
      true
    );
  });

  it('mostly agrees with classic FJS', () => {
    for (let i = 2; i < 100; ++i) {
      if (i === 10 || i === 36 || i === 70) {
        continue;
      }
      expect(
        getFormalComma(i).equals(getFloraComma(i)),
        `Disagreement for prime #${i} = ${PRIMES[i]}`
      ).toBe(true);
    }
  });
});

describe('Neutral comma calculator', () => {
  // M-yac's commas
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
  // Frostburn's commas
  it.each([
    [5, '25/24'],
    [7, '49/54'],
    [17, '7803/8192'],
    [19, '361/384'],
    [23, '529/486'],
    [41, '1681/1536'],
  ])('Has a bridging comma for prime %s', (prime, square) => {
    const comma = getNeutralComma(PRIMES.indexOf(prime));
    expect(
      comma.pow(2).toFraction().equals(square),
      `${comma.pow(2).toFraction().toFraction()} != ${square}`
    ).toBe(true);
  });
});

describe('Semiquartal comma calculator', () => {
  it.each([
    [5, '25/27'], // Large limma
    [7, '49/48'], // Slendro diesis
    [11, '121/108'],
    [13, '169/192'],
    [17, '70227/65536'],
    [19, '1083/1024'],
    [23, '14283/16384'],
    [29, '841/768'],
    [31, '233523/262144'],
    [37, '4107/4096'], // Sematology comma
  ])('Has a semiquartal comma for prime %s', (prime, square) => {
    const comma = getSemiquartalComma(PRIMES.indexOf(prime))
      .pow(2)
      .toFraction();
    expect(comma.equals(square), `${comma.toFraction()} != ${square}`).toBe(
      true
    );
  });
});

describe('Tone-splitter comma calculator', () => {
  it.each([
    [5, '2025/2048'], // Diaschisma
    [7, '441/512'],
    [11, '121/128'], // Axirabian limma
    [13, '169/162'],
    [17, '289/288'], // Semitonisma
    [19, '29241/32768'],
    [23, '529/512'],
    [29, '7569/8192'],
    [31, '8649/8192'],
    [37, '1369/1458'],
  ])('Has a tone-splitter comma for prime %s', (prime, square) => {
    const comma = getToneSplitterComma(PRIMES.indexOf(prime))
      .pow(2)
      .toFraction();
    expect(comma.equals(square), `${comma.toFraction()} != ${square}`).toBe(
      true
    );
  });
});

describe('FJS interval inflector', () => {
  it.each([
    ['P', 8, [], [], '2/1'],
    ['P', 5, [], [], '3/2'],
    ['M', 3, [[5, '' as const]], [], '5/4'],
    ['m', 7, [[7, '']], [], '7/4'],
    ['P', 4, [[11, '']], [], '11/8'],
    ['m', 6, [[13, '']], [], '13/8'],
    ['d', 5, [[7, '']], [[5, '']], '7/5'],
    // Automatic factoring
    ['a', 1, [[25, '']], [], '25/24'],
    [
      'a',
      1,
      [
        [5, ''],
        [5, ''],
      ],
      [],
      '25/24',
    ],
    // Resistant to the first two primes
    ['M', 2, [[10, '']], [[9, '']], '10/9'],
    // Neutral extension
    ['n', 2, [], [[11, 'n']], '12/11'],
    ['n', 2, [[11, 'n']], [[5, '']], '11/10'],
    ['n', 3, [[11, 'n']], [], '11/9'],
    ['sa', 4, [[11, 'n']], [], '11/8'],
    ['n', 2, [[13, 'n']], [], '13/12'],
    ['sd', 4, [[7, '']], [[11, 'n']], '14/11'],
    ['sa', 2, [[5, '']], [[13, 'n']], '15/13'],
    // Neutral resistance with automatic factoring
    [
      'n',
      7,
      [
        [13, 'n'],
        [319, 'n'],
      ],
      [[6, '']],
      '4147/2304',
    ],
  ])(
    'Inflects %s%s%s%s',
    (quality, degree, superscripts: unknown, subscripts: unknown, fraction) => {
      let vulgar: VulgarFraction = '';
      const augmentations: AugmentedQuality[] = [];
      if (quality.length > 1) {
        if (quality[0] === 'a' || quality[0] === 'd') {
          augmentations.push(quality[0] as AugmentedQuality);
        } else {
          vulgar = quality[0] as VulgarFraction;
        }
        quality = quality[1];
      }
      const base = ((Math.abs(degree) - 1) % 7) + 1;
      const octaves = Math.floor((Math.abs(degree) - 1) / 7);
      const imperfect = ![1, 4, 5].includes(degree);
      const node: Pythagorean = {
        type: 'Pythagorean',
        quality: {fraction: vulgar, quality: quality as any},
        augmentations,
        degree: {base, octaves, negative: false},
        imperfect,
      };
      const monzo = pythagoreanMonzo(node);
      const interval = inflect(
        monzo,
        superscripts as FJSInflection[],
        subscripts as FJSInflection[]
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
    ['E', [], 4, [[5, '']], [], '5/4'],
    ['E', ['d'], 4, [[11, 'n']], [], '11/9'],
  ])(
    'Inflects %s%s%s%s%s',
    (nominal, accidentals, octave, superscripts, subscripts, fraction) => {
      const node: AbsolutePitch = {
        type: 'AbsolutePitch',
        nominal: nominal as AbsolutePitch['nominal'],
        accidentals: accidentals.map(a => ({
          fraction: '',
          accidental: a as Accidental,
        })),
        octave: octave,
      };
      const monzo = absoluteMonzo(node);
      const interval = inflect(
        monzo,
        superscripts as unknown as FJSInflection[],
        subscripts
      );
      expect(interval.toFraction().equals(fraction)).toBe(true);
    }
  );
});
