import {describe, it, expect} from 'vitest';
import {
  pythagoreanMonzo,
  absoluteMonzo,
  Pythagorean,
  AbsolutePitch,
  monzoToNode,
  absoluteToNode,
} from '../pythagorean';
import {TimeMonzo} from '../monzo';
import {Fraction} from 'xen-dev-utils';

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
    ['A', 4, -9, 6],
    ['A', 1, -11, 7],
    ['A', 5, -12, 8],
    ['A', 2, -14, 9],
    ['A', 6, -15, 10],
    ['A', 3, -17, 11],
    ['A', 7, -18, 12],
    // Compound
    ['P', 8, 1, 0],
    // Negative
    ['M', -2, 3, -2],
    // Double augmented
    ['AA', 1, -22, 14],
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
    ['sA', 4, -3.5, 2.5],
    ['sA', 1, -5.5, 3.5],
    ['sA', 5, -6.5, 4.5],
    ['sA', 2, -8.5, 5.5],
    ['sA', 6, -9.5, 6.5],
    ['sA', 3, -11.5, 7.5],
    ['sA', 7, -12.5, 8.5],
    // Tonesplitters
    ['sd', 2.5, 6.5, -4],
    ['n', 6.5, 5.5, -3],
    ['n', 3.5, 3.5, -2],
    ['n', 7.5, 2.5, -1],
    ['n', 4.5, 0.5, 0],
    ['n', 1.5, -1.5, 1],
    ['n', 5.5, -2.5, 2],
    ['n', 2.5, -4.5, 3],
    ['sA', 6.5, -5.5, 4],
    // Semiquartal
    ['d', 2.5, 12, -7.5],
    ['m', 6.5, 11, -6.5],
    ['m', 3.5, 9, -5.5],
    ['m', 7.5, 8, -4.5],
    ['m', 4.5, 6, -3.5],
    ['m', 1.5, 4, -2.5],
    ['m', 5.5, 3, -1.5],
    ['m', 2.5, 1, -0.5],
    ['M', 6.5, 0, 0.5],
    ['M', 3.5, -2, 1.5],
    ['M', 7.5, -3, 2.5],
    ['M', 4.5, -5, 3.5],
    ['M', 1.5, -7, 4.5],
    ['M', 5.5, -8, 5.5],
    ['M', 2.5, -10, 6.5],
    ['A', 6.5, -11, 7.5],
    // Quarter augmented
    ['qA', 1, -2.75, 1.75],
    ['QA', 1, -8.25, 5.25],
    ['sm', 3, 2.25, -1.25],
    ['sM', 3, -3.25, 2.25],
  ])('constructs %s%s', (quality, degree, twos, threes) => {
    const base = ((Math.abs(degree) - 1) % 7) + 1;
    const octaves = Math.floor((Math.abs(degree) - 1) / 7);
    const imperfect = ![1, 4, 5].includes(base);
    const node: Pythagorean = {
      type: 'Pythagorean',
      quality,
      imperfect,
      degree: {negative: degree < 0, base, octaves},
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
    expect(monzo.cents).toBeCloseTo(0);
  });
});

describe('Absolute Pythagorean interval construction from parts', () => {
  it.each([
    ['C', [], 4, 0, 0],
    ['F', [], 4, 2, -1],
    ['G', [], 4, -1, 1],
    ['B', ['b'], 3, 3, -2],
    ['E', ['d'], 4, -0.5, 0.5],
    ['C', ['q#'], 4, -2.75, 1.75],
    ['C', ['='], 5, 1, 0],
  ])('constructs %s%s', (nominal, accidentals, octave, twos, threes) => {
    const node: AbsolutePitch = {
      type: 'AbsolutePitch',
      nominal: nominal as AbsolutePitch['nominal'],
      accidentals,
      octave: BigInt(octave),
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
    expect(monzo.cents).toBeCloseTo(0);
  });
});

describe('Monzo -> node converter', () => {
  it('converts a perfect fifth', () => {
    const node = monzoToNode(TimeMonzo.fromFraction('3/2'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: 'P',
      imperfect: false,
      degree: {base: 5, negative: false, octaves: 0},
    });
  });

  it('converts a major third', () => {
    const node = monzoToNode(TimeMonzo.fromFraction('81/64'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: 'M',
      imperfect: true,
      degree: {base: 3, negative: false, octaves: 0},
    });
  });

  it('converts a doubly augmented octave', () => {
    const node = monzoToNode(TimeMonzo.fromFraction('4782969/2097152'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: 'AA',
      imperfect: false,
      degree: {base: 1, negative: false, octaves: 1},
    });
  });

  it('converts a doubly diminished seventh', () => {
    const node = monzoToNode(TimeMonzo.fromFraction('67108864/43046721'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: 'dd',
      imperfect: true,
      degree: {base: 7, negative: false, octaves: 0},
    });
  });

  it('converts a neutral third', () => {
    const node = monzoToNode(TimeMonzo.fromEqualTemperament('1/2', '3/2'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: 'n',
      imperfect: true,
      degree: {base: 3, negative: false, octaves: 0},
    });
  });

  it('converts a half-octave', () => {
    const node = monzoToNode(TimeMonzo.fromEqualTemperament('1/2'));
    expect(node).toEqual({
      type: 'Pythagorean',
      quality: 'n',
      imperfect: true,
      degree: {base: 4.5, negative: false, octaves: 0},
    });
  });
});

describe('Absolute monzo -> node converter', () => {
  it('converts D4', () => {
    const node = absoluteToNode(TimeMonzo.fromFraction('9/8'));
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'D',
      accidentals: ['♮'],
      octave: 4n,
    });
  });

  it('converts zeta4', () => {
    const node = absoluteToNode(TimeMonzo.fromEqualTemperament('1/2'));
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'ζ',
      accidentals: ['♮'],
      octave: 4n,
    });
  });

  it('converts alphad4', () => {
    const node = absoluteToNode(TimeMonzo.fromEqualTemperament('1/2', 3));
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'α',
      accidentals: ['d'],
      octave: 4n,
    });
  });

  it('converts Ed4', () => {
    const node = absoluteToNode(TimeMonzo.fromEqualTemperament('1/2', '3/2'));
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'E',
      accidentals: ['d'],
      octave: 4n,
    });
  });

  it('converts Ca4', () => {
    const node = absoluteToNode(
      new TimeMonzo(new Fraction(0), [
        new Fraction('7/2'),
        new Fraction('-9/4'),
      ])
    );
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'C',
      accidentals: ['a'],
      octave: 4n,
    });
  });

  it('converts ψe4', () => {
    const node = absoluteToNode(
      new TimeMonzo(new Fraction(0), [
        new Fraction('-7/2'),
        new Fraction('11/4'),
      ])
    );
    expect(node).toEqual({
      type: 'AbsolutePitch',
      nominal: 'ψ',
      accidentals: ['e'],
      octave: 4n,
    });
  });
});
