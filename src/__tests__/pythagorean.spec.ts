import {describe, it, expect} from 'vitest';
import {
  pythagoreanMonzo,
  absoluteMonzo,
  Pythagorean,
  AbsolutePitch,
  monzoToNode,
  absoluteToNode,
  VulgarFraction,
  AugmentedQuality,
  SplitAccidental,
} from '../pythagorean';
import {TimeMonzo} from '../monzo';

describe('Pythagorean interval construction from parts', () => {
  it.each([
    // Basic
    ['d', 2, 19, -12],
    ['d', 6, 18, -11],
    ['d', 3, 16, -10],
    ['d', 7, 15, -9],
    ['d', 4, 13, -8],
    ['d', 1, 11, -7],
    ['d', 5, 10, -6],
    ['m', 2, 8, -5],
    ['m', 6, 7, -4],
    ['m', 3, 5, -3],
    ['m', 7, 4, -2],
    ['P', 4, 2, -1],
    ['P', 1, 0, 0],
    ['P', 5, -1, 1],
    ['M', 2, -3, 2],
    ['M', 6, -4, 3],
    ['M', 3, -6, 4],
    ['M', 7, -7, 5],
    ['a', 4, -9, 6],
    ['a', 1, -11, 7],
    ['a', 5, -12, 8],
    ['a', 2, -14, 9],
    ['a', 6, -15, 10],
    ['a', 3, -17, 11],
    ['a', 7, -18, 12],
    // Compound
    ['P', 8, 1, 0],
    // Negative
    ['M', -2, 3, -2],
    // Double augmented
    ['aa', 1, -22, 14],
    ['dd', 1, 22, -14],
    // Neutral
    ['sd', 2, 13.5, -8.5],
    ['sd', 6, 12.5, -7.5],
    ['sd', 3, 10.5, -6.5],
    ['sd', 7, 9.5, -5.5],
    ['sd', 4, 7.5, -4.5],
    ['sd', 1, 5.5, -3.5],
    ['sd', 5, 4.5, -2.5],
    ['n', 2, 2.5, -1.5],
    ['n', 6, 1.5, -0.5],
    ['n', 3, -0.5, 0.5],
    ['n', 7, -1.5, 1.5],
    ['sa', 4, -3.5, 2.5],
    ['sa', 1, -5.5, 3.5],
    ['sa', 5, -6.5, 4.5],
    ['sa', 2, -8.5, 5.5],
    ['sa', 6, -9.5, 6.5],
    ['sa', 3, -11.5, 7.5],
    ['sa', 7, -12.5, 8.5],
    // Mid
    ['n', 4, -3.5, 2.5],
    ['n', 5, 4.5, -2.5],
    // Semioctave - minor
    ['m', 5.5, 8.5, -5],
    ['m', 2.5, 6.5, -4],
    ['m', 6.5, 5.5, -3],
    ['m', 3.5, 3.5, -2],
    // Semioctave - perfect
    ['P', 7.5, 2.5, -1],
    ['P', 4.5, 0.5, 0],
    ['P', 1.5, -1.5, 1],
    // Semioctave - major
    ['M', 5.5, -2.5, 2],
    ['M', 2.5, -4.5, 3],
    ['M', 6.5, -5.5, 4],
    ['M', 3.5, -7.5, 5],
    // Semioctave - mid
    ['n', 1.5, 4, -2.5],
    ['n', 7.5, -3, 2.5],
    // Semioctave - augmented of perfect
    ['a', 7.5, -8.5, 6],
    // Chain of fifths on the semifourth
    ['sd', 5.5, 14, -8.5],
    ['sd', 2.5, 12, -7.5],
    ['sd', 6.5, 11, -6.5],
    ['sd', 3.5, 9, -5.5],
    ['sd', 7.5, 8, -4.5],
    ['sd', 4.5, 6, -3.5],
    ['sd', 1.5, 4, -2.5],
    ['n', 5.5, 3, -1.5],
    ['n', 2.5, 1, -0.5],
    ['n', 6.5, 0, 0.5],
    ['n', 3.5, -2, 1.5],
    ['sa', 7.5, -3, 2.5],
    ['sa', 4.5, -5, 3.5],
    ['sa', 1.5, -7, 4.5],
    ['sa', 5.5, -8, 5.5],
    ['sa', 2.5, -10, 6.5],
    ['sa', 6.5, -11, 7.5],
    ['sa', 3.5, -13, 8.5],
    // Quarter augmented
    ['qa', 1, -2.75, 1.75],
    ['Qa', 1, -8.25, 5.25],
    ['sm', 3, 2.25, -1.25],
    ['sM', 3, -3.25, 2.25],
    // Circumflex alternate spelling
    ['Â', 4, -9, 6],
  ])('constructs %s%s', (quality, degree, twos, threes) => {
    let fraction: VulgarFraction = '';
    const augmentations: AugmentedQuality[] = [];
    if (quality.length > 1) {
      if (quality[0] === 'a' || quality[0] === 'd') {
        augmentations.push(quality[0] as AugmentedQuality);
      } else {
        fraction = quality[0] as VulgarFraction;
      }
      quality = quality[1];
    }
    const base = ((Math.abs(degree) - 1) % 7) + 1;
    const octaves = Math.floor((Math.abs(degree) - 1) / 7);
    const imperfect = ![1, 4, 5, 1.5, 4.5, 7.5].includes(base);
    const node: Pythagorean = {
      type: 'Pythagorean',
      quality: {fraction, quality: quality as any},
      augmentations,
      degree: {negative: degree < 0, base, octaves, imperfect},
    };
    const monzo = pythagoreanMonzo(node);
    expect(
      monzo.primeExponents[0].equals(twos),
      `${monzo.primeExponents[0].valueOf()} != ${twos}`
    ).toBe(true);
    expect(
      monzo.primeExponents[1].equals(threes),
      `${monzo.primeExponents[1].valueOf()} != ${threes}`
    ).toBe(true);
    expect(monzo.residual.equals(1)).toBe(true);
  });
});

describe('Absolute Pythagorean interval construction from parts', () => {
  it.each([
    ['C', [], 4, 0, 0],
    ['F', [], 4, 2, -1],
    ['G', [], 4, -1, 1],
    ['B', [{fraction: '', accidental: 'b'}], 3, 3, -2],
    ['E', [{fraction: '', accidental: 'd'}], 4, -0.5, 0.5],
    ['C', [{fraction: 'q', accidental: '#'}], 4, -2.75, 1.75],
    ['C', [{fraction: '', accidental: '='}], 5, 1, 0],
  ])('constructs %s%s', (nominal, accidentals, octave, twos, threes) => {
    const node: AbsolutePitch = {
      type: 'AbsolutePitch',
      nominal: nominal as AbsolutePitch['nominal'],
      accidentals: accidentals as SplitAccidental[],
      octave: octave,
    };
    const monzo = absoluteMonzo(node);
    expect(
      monzo.primeExponents[0].equals(twos),
      `${monzo.primeExponents[0].valueOf()} != ${twos}`
    ).toBe(true);
    expect(
      monzo.primeExponents[1].equals(threes),
      `${monzo.primeExponents[1].valueOf()} != ${threes}`
    ).toBe(true);
    expect(monzo.residual.equals(1)).toBe(true);
  });
});

describe('Monzo -> node converter', () => {
  it('converts a perfect fifth', () => {
    const node = monzoToNode(TimeMonzo.fromFraction('3/2'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: {
        fraction: '',
        quality: 'P',
      },
      augmentations: [],
      degree: {base: 5, negative: false, octaves: 0, imperfect: false},
    });
  });

  it('converts a major third', () => {
    const node = monzoToNode(TimeMonzo.fromFraction('81/64'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: {
        fraction: '',
        quality: 'M',
      },
      augmentations: [],
      degree: {base: 3, negative: false, octaves: 0, imperfect: true},
    });
  });

  it('converts a doubly augmented octave', () => {
    const node = monzoToNode(TimeMonzo.fromFraction('4782969/2097152'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: {
        fraction: '',
        quality: 'a',
      },
      augmentations: ['a'],
      degree: {base: 1, negative: false, octaves: 1, imperfect: false},
    });
  });

  it('converts a doubly diminished seventh', () => {
    const node = monzoToNode(TimeMonzo.fromFraction('67108864/43046721'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: {
        fraction: '',
        quality: 'd',
      },
      augmentations: ['d'],
      degree: {base: 7, negative: false, octaves: 0, imperfect: true},
    });
  });

  it('converts a neutral third', () => {
    const node = monzoToNode(TimeMonzo.fromEqualTemperament('1/2', '3/2'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: {
        fraction: '',
        quality: 'n',
      },
      augmentations: [],
      degree: {base: 3, negative: false, octaves: 0, imperfect: true},
    });
  });

  it('converts a half-octave', () => {
    const node = monzoToNode(TimeMonzo.fromEqualTemperament('1/2'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: {
        fraction: '',
        quality: 'P',
      },
      augmentations: [],
      degree: {base: 4.5, negative: false, octaves: 0, imperfect: false},
    });
  });

  it('converts negative intervals', () => {
    const node = monzoToNode(TimeMonzo.fromFraction('129140163/134217728'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: {
        fraction: '',
        quality: 'd',
      },
      augmentations: ['d'],
      degree: {base: 3, negative: true, octaves: 0, imperfect: true},
    });
  });
});

describe('Absolute monzo -> node converter', () => {
  it('converts D4', () => {
    const node = absoluteToNode(TimeMonzo.fromFraction('9/8'));
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'D',
      accidentals: [{fraction: '', accidental: '♮'}],
      octave: 4,
    });
  });

  it('converts gam4', () => {
    const node = absoluteToNode(TimeMonzo.fromEqualTemperament('1/2'));
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'γ',
      accidentals: [{fraction: '', accidental: '♮'}],
      octave: 4,
    });
  });

  it('converts etad4', () => {
    const node = absoluteToNode(TimeMonzo.fromEqualTemperament('1/2', 3));
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'ε',
      accidentals: [{fraction: '', accidental: 'd'}],
      octave: 4,
    });
  });

  it('converts Ed4', () => {
    const node = absoluteToNode(TimeMonzo.fromEqualTemperament('1/2', '3/2'));
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'E',
      accidentals: [{fraction: '', accidental: 'd'}],
      octave: 4,
    });
  });

  it('converts C⅓#4', () => {
    const node = absoluteToNode(
      TimeMonzo.fromEqualTemperament('1/3', '2187/2048')
    );
    expect(node).toEqual({
      accidentals: [
        {
          accidental: '♯',
          fraction: '⅓',
        },
      ],
      nominal: 'C',
      octave: 4,
      type: 'AbsolutePitch',
    });
  });

  it('converts C3', () => {
    const node = absoluteToNode(TimeMonzo.fromFraction(0.5));
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'C',
      accidentals: [{fraction: '', accidental: '♮'}],
      octave: 3,
    });
  });
});
