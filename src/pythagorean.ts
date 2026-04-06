import {Fraction, mmod} from 'xen-dev-utils';
import {TimeMonzo} from './monzo.js';
import {
  ELEVEN,
  F,
  FIVE,
  HALF,
  NEGATIVE_ONE,
  ONE,
  SEVEN,
  THREE,
  TWO,
  ZERO,
} from './utils.js';

// Pythagorean + syntonic arrows

// Maximum deviation from a central interval measured in sharps.
const MAX_OFFSET = Object.freeze(new Fraction(100));

/**
 * Degree of a relative Pythagorean interval.
 */
export type Degree = {
  /**
   * A boolean flag indicating if the degree represents an inverted ratio.
   */
  negative: boolean;
  /**
   * Interval class: 1-indexed semiordinal from 1 to 7.5.
   */
  base: number;
  /**
   * Number of octaves added to the base interval class.
   */
  octaves: number;
  /**
   * Flag to indicate if the degree has minor and major variants.
   */
  imperfect: boolean;
};

/**
 * Fractional modifier for interval qualities and accidentals.
 */
export type VulgarFraction =
  | ''
  | '¼'
  | 'q'
  | '½'
  | 's'
  | '¾'
  | 'Q'
  | '⅐'
  | '⅑'
  | '⅒'
  | '⅓'
  | '⅔'
  | '⅕'
  | '⅖'
  | '⅗'
  | '⅘'
  | '⅙'
  | '⅚'
  | '⅛'
  | '⅜'
  | '⅝'
  | '⅞';

/**
 * Augmented interval quality or extra apotomes added or subtracted from the relative interval.
 */
export type AugmentedQuality = 'd' | 'dim' | 'a' | 'Â' | 'aug' | 'Aug';

/**
 * Interval quality, possibly fractional.
 */
export type IntervalQuality = {
  /**
   * Optional fractional modifier applied to the quality inflection.
   */
  fraction: VulgarFraction;
  /**
   * Base quality name or augmentation/diminution marker.
   */
  quality:
    | 'm'
    | 'min'
    | 'n'
    | 'neu'
    | 'P'
    | 'M'
    | 'maj'
    | 'Maj'
    | AugmentedQuality;
};

/**
 * Relative Pythagorean interval.
 */
export type Pythagorean = {
  /**
   * AST discriminator for relative Pythagorean intervals.
   */
  type: 'Pythagorean';
  /**
   * Primary interval quality.
   */
  quality: IntervalQuality;
  /**
   * Additional repeated augmentations or diminutions applied beyond `quality`.
   */
  augmentations?: AugmentedQuality[];
  /**
   * Relative degree information including inversion and octave displacement.
   */
  degree: Degree;
};

/**
 * Absolute pitch nominal: Traditional Pythagorean or semioctave.
 */
export type Nominal =
  | 'A' // Diatonic
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'alp' // Semioctave
  | 'α'
  | 'bet'
  | 'β'
  | 'gam'
  | 'γ'
  | 'del'
  | 'δ'
  | 'eps'
  | 'ε'
  | 'zet'
  | 'ζ'
  | 'eta'
  | 'η'
  | 'phi' // Semiquartal
  | 'φ'
  | 'chi'
  | 'χ'
  | 'psi'
  | 'ψ'
  | 'ome'
  | 'ω'
  | 'H' // Latin reserve
  | 'I'
  | 'the' // Greek reserve
  | 'θ'
  | 'iot'
  | 'ι'
  | 'kap'
  | 'κ'
  | 'lam'
  | 'λ'
  | 'muu' // 'mu' is too short
  | 'μ'
  | 'nuu'
  | 'ν'
  | 'xii'
  | 'ξ'
  | 'omi'
  | 'ο'
  | 'pii'
  | 'π'
  | 'rho'
  | 'ρ'
  | 'fsi' // Final sigma
  | 'ς'
  | 'sig'
  | 'σ'
  | 'tau'
  | 'τ'
  | 'ups'
  | 'υ';

/**
 * Musical accidental representing some powers of primes 2 and 3, possibly fractional.
 */
export type Accidental =
  | '𝄪'
  | '𝄫'
  | '𝄲'
  | '𝄳'
  | 'x'
  | '♯'
  | '#'
  | '‡'
  | 't'
  | '♮'
  | '_'
  | 'd'
  | '♭'
  | 'b'
  | '𝄬'
  | '𝄭'
  | '𝄮'
  | '𝄯'
  | '𝄰'
  | '𝄱';

/**
 * Musical accidental representing some (possibly split) powers of primes 2 and 3, possibly fractional.
 */
export type SplitAccidental = {
  /**
   * Fractional multiplier applied to the accidental's pythagorean inflection.
   */
  fraction: VulgarFraction;
  /**
   * Base accidental symbol being applied.
   */
  accidental: Accidental;
};

/**
 * Absolute Pythagorean pitch.
 */
export type AbsolutePitch = {
  /**
   * AST discriminator for absolute pitch literals.
   */
  type: 'AbsolutePitch';
  /**
   * Pitch nominal, such as `C` or `α`.
   */
  nominal: Nominal;
  /**
   * Accidentals attached to the nominal.
   */
  accidentals: SplitAccidental[];
  /**
   * Register number, e.g. 4. The sounding frequency depends on the active evaluation context; by convention the default reference is A4 = 440 Hz.
   */
  octave: number;
};

type PythInflection = [Fraction, Fraction];
type PtolInflection = [Fraction, Fraction, Fraction];

const q = F(1, 4);
const Q = F(3, 4);
const NEGATIVE_HALF = F(-1, 2);
const SESQUI = F(3, 2);
const NEGATIVE_SESQUI = F(-3, 2);
const NEGATIVE_TWO = Object.freeze(TWO.neg());
const NEGATIVE_THREE = Object.freeze(THREE.neg());
const NEGATIVE_SEVEN = Object.freeze(SEVEN.neg());
const FOUR = F(4, 1);
const NEGATIVE_ELEVEN = Object.freeze(ELEVEN.neg());
const FOURTEEN = F(14, 1);
const SEMIFIVE = F(5, 2);
const NEGATIVE_SEMIFIVE = F(-5, 2);
const SEMISEVEN = F(7, 2);
const SEMININE = F(9, 2);
const SEMIELEVEN = F(11, 2);

// Exponents for perfect and imperfect intervals.
const PYTH_VECTORS: PythInflection[] = [
  [ZERO, ZERO],
  [SEMIFIVE, NEGATIVE_SESQUI],
  [NEGATIVE_HALF, HALF],
  [TWO, NEGATIVE_ONE],
  [NEGATIVE_ONE, ONE],
  [SESQUI, NEGATIVE_HALF],
  [NEGATIVE_SESQUI, SESQUI],
];

const MID_FOURTH: PythInflection = [F(-7, 2), SEMIFIVE];
const MID_FIFTH: PythInflection = [SEMININE, NEGATIVE_SEMIFIVE];
const MID_SESQUITH: PythInflection = [FOUR, NEGATIVE_SEMIFIVE];
const MID_SESQUITH_COMPLEMENT: PythInflection = [NEGATIVE_THREE, SEMIFIVE];

// Exponents for interordinal intervals related to Pythagoras by a semioctave.
// Also splits the whole-tone in half precisely in the middle.
// Also splits the perfect fourth.
const SEMIOCTAVE_VECTORS: PythInflection[] = [
  [NEGATIVE_SESQUI, ONE],
  [ONE, NEGATIVE_HALF],
  [NEGATIVE_TWO, SESQUI],
  [HALF, ZERO],
  [THREE, NEGATIVE_SESQUI],
  [ZERO, HALF],
  [SEMIFIVE, NEGATIVE_ONE],
];

const NOMINAL_VECTORS = new Map<Nominal, PythInflection>([
  ['F', [TWO, NEGATIVE_ONE]],
  ['C', [ZERO, ZERO]],
  ['G', [NEGATIVE_ONE, ONE]],
  ['D', [F(-3, 1), TWO]],
  ['A', [F(-4, 1), THREE]],
  ['E', [F(-6, 1), FOUR]],
  ['B', [F(-7, 1), FIVE]],

  // Latin +- semioctave = Greek

  // F + 1\2
  ['zet', [SEMIFIVE, NEGATIVE_ONE]],
  ['ζ', [SEMIFIVE, NEGATIVE_ONE]],

  // C + 1\2
  ['gam', [HALF, ZERO]],
  ['γ', [HALF, ZERO]],

  // G - 1\2
  ['eta', [NEGATIVE_SESQUI, ONE]],
  ['η', [NEGATIVE_SESQUI, ONE]],

  // D + 1\2
  ['del', [F(-5, 2), TWO]],
  ['δ', [F(-5, 2), TWO]],

  // A - 1\2
  ['alp', [F(-9, 2), THREE]],
  ['α', [F(-9, 2), THREE]],

  // E + 1\2
  ['eps', [F(-11, 2), FOUR]],
  ['ε', [F(-11, 2), FOUR]],

  // B - 1\2
  ['bet', [F(-15, 2), FIVE]],
  ['β', [F(-15, 2), FIVE]],

  // Manual / semiquartal
  ['phi', [ONE, NEGATIVE_HALF]],
  ['φ', [ONE, NEGATIVE_HALF]],

  ['chi', [NEGATIVE_TWO, SESQUI]],
  ['χ', [NEGATIVE_TWO, SESQUI]],

  ['psi', [ZERO, HALF]],
  ['ψ', [ZERO, HALF]],

  ['ome', [NEGATIVE_THREE, SEMIFIVE]],
  ['ω', [NEGATIVE_THREE, SEMIFIVE]],
]);

/** @hidden */
export const ACCIDENTAL_VECTORS = new Map<Accidental, PtolInflection>([
  ['♮', [ZERO, ZERO, ZERO]],
  ['_', [ZERO, ZERO, ZERO]],

  ['♯', [NEGATIVE_ELEVEN, SEVEN, ZERO]],
  ['#', [NEGATIVE_ELEVEN, SEVEN, ZERO]],

  ['♭', [ELEVEN, F(-7, 1), ZERO]],
  ['b', [ELEVEN, F(-7, 1), ZERO]],

  ['𝄪', [F(-22, 1), FOURTEEN, ZERO]],
  ['x', [F(-22, 1), FOURTEEN, ZERO]],

  ['𝄫', [F(22, 1), F(-14, 1), ZERO]],

  ['𝄲', [F(-11, 2), SEMISEVEN, ZERO]],
  ['‡', [F(-11, 2), SEMISEVEN, ZERO]],
  ['t', [F(-11, 2), SEMISEVEN, ZERO]],

  ['𝄳', [SEMIELEVEN, F(-7, 2), ZERO]],
  ['d', [SEMIELEVEN, F(-7, 2), ZERO]],

  ['𝄬', [SEVEN, NEGATIVE_THREE, NEGATIVE_ONE]],
  ['𝄭', [F(15, 1), NEGATIVE_ELEVEN, ONE]],
  ['𝄮', [F(-4, 1), FOUR, NEGATIVE_ONE]],
  ['𝄯', [FOUR, F(-4, 1), ONE]],
  ['𝄰', [F(-15, 1), ELEVEN, NEGATIVE_ONE]],
  ['𝄱', [NEGATIVE_SEVEN, THREE, ONE]],
]);

/** @hidden */
export const VULGAR_FRACTIONS = new Map<VulgarFraction, Fraction>([
  ['', ONE],
  ['s', HALF],
  ['½', HALF],
  ['¼', q],
  ['q', q],
  ['¾', Q],
  ['Q', Q],
  ['⅐', F(1, 7)],
  ['⅑', F(1, 9)],
  ['⅒', F(1, 10)],
  ['⅓', F(1, 3)],
  ['⅔', F(2, 3)],
  ['⅕', F(1, 5)],
  ['⅖', F(2, 5)],
  ['⅗', F(3, 5)],
  ['⅘', F(4, 5)],
  ['⅙', F(1, 6)],
  ['⅚', F(5, 6)],
  ['⅛', F(1, 8)],
  ['⅜', F(3, 8)],
  ['⅝', F(5, 8)],
  ['⅞', F(7, 8)],
]);

// Apotomes
const AUGMENTED: PythInflection = [NEGATIVE_ELEVEN, SEVEN];
const DIMINISHED: PythInflection = [ELEVEN, NEGATIVE_SEVEN];

// Major and minor inflect from a neutral central interval
const MAJOR: PythInflection = [
  Object.freeze(NEGATIVE_ELEVEN.div(2)),
  Object.freeze(SEVEN.div(2)),
];
const MINOR: PythInflection = [
  Object.freeze(ELEVEN.div(2)),
  Object.freeze(NEGATIVE_SEVEN.div(2)),
];

/**
 * Convert a relative Pythagorean interval node to its monzo representation.
 * @param node Relative interval node to convert.
 * @returns A relative {@link TimeMonzo} matching the requested interval quality and degree.
 */
export function pythagoreanMonzo(node: Pythagorean): TimeMonzo {
  const base = node.degree.base;
  let vector: PythInflection;
  if (Number.isInteger(base)) {
    vector = [...PYTH_VECTORS[base - 1]];
  } else {
    vector = [...SEMIOCTAVE_VECTORS[base - 1.5]];
  }

  const quality = node.quality.quality;

  // Non-perfect intervals need an extra half-augmented widening
  if (node.degree.imperfect) {
    if (
      quality === 'a' ||
      quality === 'Â' ||
      quality === 'aug' ||
      quality === 'Aug'
    ) {
      vector[0] = vector[0].sub(SEMIELEVEN);
      vector[1] = vector[1].add(SEMISEVEN);
    } else if (quality === 'd' || quality === 'dim') {
      vector[0] = vector[0].add(SEMIELEVEN);
      vector[1] = vector[1].sub(SEMISEVEN);
    }
  } else {
    if (quality === 'n' || quality === 'neu') {
      if (base === 4) {
        vector = [...MID_FOURTH];
      } else if (base === 5) {
        vector = [...MID_FIFTH];
      } else if (base === 1.5) {
        vector = [...MID_SESQUITH];
      } else if (base === 7.5) {
        vector = [...MID_SESQUITH_COMPLEMENT];
      }
    }
  }

  vector[0] = vector[0].add(node.degree.octaves);

  let inflection: [Fraction, Fraction] = [ZERO, ZERO];
  if (
    quality === 'a' ||
    quality === 'Â' ||
    quality === 'aug' ||
    quality === 'Aug'
  ) {
    inflection = [...AUGMENTED];
  } else if (quality === 'd' || quality === 'dim') {
    inflection = [...DIMINISHED];
  } else if (quality === 'M' || quality === 'maj' || quality === 'Maj') {
    inflection = [...MAJOR];
  } else if (quality === 'm' || quality === 'min') {
    inflection = [...MINOR];
  }

  if (node.quality.fraction !== '') {
    const fraction = VULGAR_FRACTIONS.get(node.quality.fraction)!;
    inflection = [inflection[0].mul(fraction), inflection[1].mul(fraction)];
  }

  for (const augmentation of node.augmentations ?? []) {
    if (augmentation === 'd' || augmentation === 'dim') {
      inflection[0] = inflection[0].add(DIMINISHED[0]);
      inflection[1] = inflection[1].add(DIMINISHED[1]);
    } else {
      inflection[0] = inflection[0].add(AUGMENTED[0]);
      inflection[1] = inflection[1].add(AUGMENTED[1]);
    }
  }

  const result = new TimeMonzo(ZERO, [
    inflection[0].add(vector[0]),
    inflection[1].add(vector[1]),
  ]);

  if (node.degree.negative) {
    return result.inverse();
  }
  return result;
}

/**
 * Convert an absolute Pythagorean pitch node to its monzo representation.
 * @param node Absolute pitch node to convert.
 * @returns A {@link TimeMonzo} rooted at octave 4, suitable for later interpretation as an absolute pitch.
 * @throws An error if the nominal or any accidental is unassigned.
 */
export function absoluteMonzo(node: AbsolutePitch) {
  if (!NOMINAL_VECTORS.has(node.nominal)) {
    throw new Error(`Nominal ${node.nominal} is unassigned.`);
  }
  const vector = [...NOMINAL_VECTORS.get(node.nominal)!];
  for (const accidental of node.accidentals) {
    const fraction = VULGAR_FRACTIONS.get(accidental.fraction)!;
    if (!ACCIDENTAL_VECTORS.has(accidental.accidental)) {
      throw new Error(`Accidental ${accidental.accidental} is unassigned.`);
    }
    const modification = ACCIDENTAL_VECTORS.get(accidental.accidental)!;
    vector[0] = vector[0].add(modification[0].mul(fraction));
    vector[1] = vector[1].add(modification[1].mul(fraction));
    vector[2] = (vector[2] ?? ZERO).add(modification[2].mul(fraction));
  }
  vector[0] = vector[0].add(node.octave - 4);
  // These will be dressed up as frequencies later.
  return new TimeMonzo(ZERO, vector);
}

const IMPERFECT_BY_OFFSET = new Map<string, IntervalQuality>([
  ['3/2', {fraction: '', quality: 'a'}],
  ['1/2', {fraction: '', quality: 'M'}],
  ['0', {fraction: '', quality: 'n'}],
  ['-1/2', {fraction: '', quality: 'm'}],
  ['-3/2', {fraction: '', quality: 'd'}],
]);

const PERFECT_BY_OFFSET = new Map<string, IntervalQuality>([
  ['1', {fraction: '', quality: 'a'}],
  ['0', {fraction: '', quality: 'P'}],
  ['-1', {fraction: '', quality: 'd'}],
]);

for (const [vulgar, fraction] of VULGAR_FRACTIONS.entries()) {
  // Prefer fancy unicode.
  if (vulgar === 'q' || vulgar === 'Q' || vulgar === 's') {
    continue;
  }

  IMPERFECT_BY_OFFSET.set(fraction.add(HALF).toFraction(), {
    fraction: vulgar,
    quality: 'a',
  });
  IMPERFECT_BY_OFFSET.set(fraction.div(TWO).toFraction(), {
    fraction: vulgar,
    quality: 'M',
  });
  IMPERFECT_BY_OFFSET.set(fraction.div(NEGATIVE_TWO).toFraction(), {
    fraction: vulgar,
    quality: 'm',
  });
  IMPERFECT_BY_OFFSET.set(NEGATIVE_HALF.sub(fraction).toFraction(), {
    fraction: vulgar,
    quality: 'd',
  });

  PERFECT_BY_OFFSET.set(fraction.toFraction(), {
    fraction: vulgar,
    quality: 'a',
  });
  PERFECT_BY_OFFSET.set(fraction.neg().toFraction(), {
    fraction: vulgar,
    quality: 'd',
  });
}

/**
 * Attempt to represent a monzo as a relative Pythagorean interval node.
 * @param monzo Relative monzo to convert.
 * @returns A {@link Pythagorean} node if the monzo is representable in this notation, otherwise `undefined`.
 */
export function monzoToNode(monzo: TimeMonzo): Pythagorean | undefined {
  let twos = monzo.primeExponents[0];
  let threes = monzo.primeExponents[1];
  let stepspan = twos.mul(SEVEN).add(threes.mul(ELEVEN)).valueOf();
  const negative = stepspan < 0;
  if (negative) {
    stepspan = -stepspan;
    twos = twos.neg();
    threes = threes.neg();
  }
  const base = mmod(stepspan, 7) + 1;
  const octaves = Math.floor(stepspan / 7);
  let offCenter: Fraction;
  if (Number.isInteger(stepspan)) {
    offCenter = threes.sub(PYTH_VECTORS[base - 1][1]).div(SEVEN);
  } else if (mmod(stepspan, 1) === 0.5) {
    offCenter = threes.sub(SEMIOCTAVE_VECTORS[base - 1.5][1]).div(SEVEN);
  } else {
    return undefined;
  }

  // Enforce sanity limits.
  if (offCenter.abs().compare(MAX_OFFSET) > 0) {
    return undefined;
  }
  const imperfect = ![1, 4, 5, 1.5, 4.5, 7.5].includes(base);
  let quality: IntervalQuality | undefined;
  const augmentations: AugmentedQuality[] = [];
  if (imperfect) {
    while (offCenter.compare(NEGATIVE_SESQUI) < 0) {
      augmentations.push('d');
      offCenter = offCenter.add(ONE);
    }
    while (offCenter.compare(SESQUI) > 0) {
      augmentations.push('a');
      offCenter = offCenter.sub(ONE);
    }
    quality = IMPERFECT_BY_OFFSET.get(offCenter.toFraction());
  } else {
    while (offCenter.compare(NEGATIVE_ONE) < 0) {
      augmentations.push('d');
      offCenter = offCenter.add(ONE);
    }
    while (offCenter.compare(ONE) > 0) {
      augmentations.push('a');
      offCenter = offCenter.sub(ONE);
    }
    quality = PERFECT_BY_OFFSET.get(offCenter.toFraction());
  }
  if (!quality) {
    return undefined;
  }
  return {
    type: 'Pythagorean',
    quality,
    augmentations,
    degree: {
      base,
      negative,
      octaves,
      imperfect,
    },
  };
}

const PURE_NOMINALS: Nominal[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const SEMIOCTAVE_NOMINALS: Nominal[] = ['η', 'α', 'β', 'γ', 'δ', 'ε', 'ζ'];

const ACCIDENTAL_BY_OFFSET = new Map<string, SplitAccidental>();
const BASE_OFFSETS: [Fraction, Accidental][] = [];
for (const accidental of ['♯', '♭', '‡', 'd'] as Accidental[]) {
  const [_, threes] = ACCIDENTAL_VECTORS.get(accidental)!;
  const offset = new Fraction(threes).div(SEVEN);
  ACCIDENTAL_BY_OFFSET.set(offset.toFraction(), {fraction: '', accidental});
  BASE_OFFSETS.push([offset, accidental]);
}

for (const [offset, accidental] of BASE_OFFSETS) {
  for (const [vulgar, fraction] of VULGAR_FRACTIONS.entries()) {
    // Prefer fancy unicode.
    if (vulgar === 'q' || vulgar === 'Q' || vulgar === 's') {
      continue;
    }
    const key = offset.mul(fraction).toFraction();
    if (!ACCIDENTAL_BY_OFFSET.has(key)) {
      ACCIDENTAL_BY_OFFSET.set(key, {fraction: vulgar, accidental});
    }
  }
}

/**
 * Attempt to represent a monzo as an absolute Pythagorean pitch node.
 * @param monzo Absolute pitch monzo to convert.
 * @returns An {@link AbsolutePitch} node if the monzo is representable in this notation, otherwise `undefined`.
 */
export function absoluteToNode(monzo: TimeMonzo): AbsolutePitch | undefined {
  const twos = monzo.primeExponents[0];
  const threes = monzo.primeExponents[1];
  const stepspan = twos.mul(SEVEN).add(threes.mul(ELEVEN)).valueOf();
  const octave = Math.floor(stepspan / 7) + 4;

  // Abuse the fact that halves are exact in floating point.
  const spanRemainder = mmod(stepspan, 1);

  let nominal: Nominal;
  if (spanRemainder === 0) {
    nominal = PURE_NOMINALS[mmod(stepspan, 7)];
  } else if (spanRemainder === 0.5) {
    nominal = SEMIOCTAVE_NOMINALS[mmod(stepspan - 0.5, 7)];
  } else {
    return undefined;
  }

  let offCenter = threes.sub(NOMINAL_VECTORS.get(nominal)![1]).div(SEVEN);

  // Enforce sanity limits.
  if (offCenter.abs().compare(MAX_OFFSET) > 0) {
    return undefined;
  }

  const accidentals: SplitAccidental[] = [];
  while (offCenter.compare(NEGATIVE_TWO) <= 0) {
    accidentals.push({fraction: '', accidental: '𝄫'});
    offCenter = offCenter.add(TWO);
  }
  while (offCenter.compare(TWO) >= 0) {
    accidentals.push({fraction: '', accidental: '𝄪'});
    offCenter = offCenter.sub(TWO);
  }
  if (offCenter.compare(NEGATIVE_ONE) < 0) {
    accidentals.unshift({fraction: '', accidental: '♭'});
    offCenter = offCenter.add(ONE);
  } else if (offCenter.compare(ONE) > 0) {
    accidentals.unshift({fraction: '', accidental: '♯'});
    offCenter = offCenter.sub(ONE);
  }

  if (offCenter.n) {
    const key = offCenter.toFraction();
    if (!ACCIDENTAL_BY_OFFSET.has(key)) {
      // All that work for nothing...
      return undefined;
    }
    accidentals.unshift(ACCIDENTAL_BY_OFFSET.get(key)!);
  } else if (!accidentals.length) {
    accidentals.unshift({fraction: '', accidental: '♮'});
  }

  return {
    type: 'AbsolutePitch',
    nominal,
    accidentals,
    octave,
  };
}
