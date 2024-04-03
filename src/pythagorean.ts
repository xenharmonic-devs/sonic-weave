import {Fraction, mmod} from 'xen-dev-utils';
import {TimeMonzo} from './monzo';
import {ZERO} from './utils';

// Maximum deviation from a central interval measured in eighth sharps.
const MAX_OFFSET = 1000;

export type Degree = {
  negative: boolean;
  base: number;
  octaves: number;
};

export type Pythagorean = {
  type: 'Pythagorean';
  quality: string;
  imperfect: boolean;
  degree: Degree;
};

export type AbsolutePitch = {
  type: 'AbsolutePitch';
  nominal:
    | 'A'
    | 'B'
    | 'C'
    | 'D'
    | 'E'
    | 'F'
    | 'G'
    | 'α'
    | 'β'
    | 'γ'
    | 'δ'
    | 'ε'
    | 'ζ'
    | 'η'
    | 'φ'
    | 'χ'
    | 'ψ'
    | 'ω';
  accidentals: string[];
  octave: bigint;
};

// Exponents for perfect and imperfect intervals.
const PYTH_VECTORS: number[][] = [
  [0, 0],
  [2.5, -1.5],
  [-0.5, 0.5],
  [2, -1],
  [-1, 1],
  [1.5, -0.5],
  [-1.5, 1.5],
];

const MID_FOURTH = [-3.5, 2.5];
const MID_FIFTH = [4.5, -2.5];

// Exponents for "neutral" interordinal intervals related to Pythagoras by a semioctave.
// Splits the whole tone in half precisely in the middle.
// Implicitly define semiquartal intervals.
// Associated with eighth sharps.
const TONESPLITTER_VECTORS: number[][] = [
  [-1.5, 1],
  [-4.5, 3],
  [-7.5, 5],
  [0.5, 0],
  [-2.5, 2],
  [-5.5, 4],
  [2.5, -1],
];

const NOMINAL_VECTORS = new Map([
  ['F', [2, -1]],
  ['C', [0, 0]],
  ['G', [-1, 1]],
  ['D', [-3, 2]],
  ['A', [-4, 3]],
  ['E', [-6, 4]],
  ['B', [-7, 5]],

  // Tone-splitters
  ['beta', [2.5, -1]],
  ['β', [2.5, -1]],

  ['zeta', [0.5, 0]],
  ['ζ', [0.5, 0]],

  ['gamma', [-1.5, 1]],
  ['γ', [-1.5, 1]],

  ['eta', [-2.5, 2]],
  ['η', [-2.5, 2]],

  ['delta', [-4.5, 3]],
  ['δ', [-4.5, 3]],

  ['alpha', [-5.5, 4]],
  ['α', [-5.5, 4]],

  ['epsilon', [-7.5, 5]],
  ['ε', [-7.5, 5]],

  // Manual / semiquartal
  ['phi', [1, -0.5]],
  ['φ', [1, -0.5]],

  ['chi', [-2, 1.5]],
  ['χ', [-2, 1.5]],

  ['psi', [0, 0.5]],
  ['ψ', [0, 0.5]],

  ['omega', [-3, 2.5]],
  ['ω', [-3, 2.5]],
]);

const ACCIDENTAL_VECTORS = new Map([
  ['♮', [0, 0]],
  ['=', [0, 0]],

  ['♯', [-11, 7]],
  ['#', [-11, 7]],

  ['♭', [11, -7]],
  ['b', [11, -7]],

  ['𝄪', [-22, 14]],
  ['x', [-22, 14]],

  ['𝄫', [22, -14]],

  ['𝄲', [-5.5, 3.5]],
  ['‡', [-5.5, 3.5]],
  ['t', [-5.5, 3.5]],

  ['𝄳', [5.5, -3.5]],
  ['d', [5.5, -3.5]],

  // Soft-jaric accidentals
  ['r', [-9.5, 6]],
  ['p', [9.5, -6]],

  // Manual Diamond-MOS accidentals
  ['&', [4, -2.5]],
  ['@', [-4, 2.5]],

  // True semiquartal accidentals
  ['¤', [-7, 4.5]],
  ['£', [7, -4.5]],
]);

for (const accidental of '♯#♭b𝄲‡t𝄳d') {
  for (const semi of '½s') {
    const vector = [...ACCIDENTAL_VECTORS.get(accidental)!];
    vector[0] *= 0.5;
    vector[1] *= 0.5;
    ACCIDENTAL_VECTORS.set(semi + accidental, vector);
  }
  for (const demisemi of '¼q') {
    const vector = [...ACCIDENTAL_VECTORS.get(accidental)!];
    vector[0] *= 0.25;
    vector[1] *= 0.25;
    ACCIDENTAL_VECTORS.set(demisemi + accidental, vector);
  }
  for (const sesqui of '¾Q') {
    const vector = [...ACCIDENTAL_VECTORS.get(accidental)!];
    vector[0] *= 0.75;
    vector[1] *= 0.75;
    ACCIDENTAL_VECTORS.set(sesqui + accidental, vector);
  }
}
for (const accidental of '♯#♭b') {
  const vector = ACCIDENTAL_VECTORS.get(accidental)!;
  let v = [...vector];
  v[0] *= 0.125;
  v[1] *= 0.125;
  ACCIDENTAL_VECTORS.set('⅛' + accidental, v);

  v = [...vector];
  v[0] *= 0.375;
  v[1] *= 0.375;
  ACCIDENTAL_VECTORS.set('⅜' + accidental, v);

  v = [...vector];
  v[0] *= 0.625;
  v[1] *= 0.625;
  ACCIDENTAL_VECTORS.set('⅝' + accidental, v);

  v = [...vector];
  v[0] *= 0.875;
  v[1] *= 0.875;
  ACCIDENTAL_VECTORS.set('⅞' + accidental, v);
}

export function pythagoreanMonzo(node: Pythagorean): TimeMonzo {
  let vector: number[];
  if (Number.isInteger(node.degree.base)) {
    vector = [...PYTH_VECTORS[node.degree.base - 1]];
  } else {
    vector = [...TONESPLITTER_VECTORS[node.degree.base - 1.5]];
  }

  let quality = node.quality;

  // Non-perfect intervals need an extra half-augmented widening
  if (node.imperfect) {
    const last = quality[quality.length - 1];
    if (last === 'a' || last === 'Â') {
      vector[0] -= 5.5;
      vector[1] += 3.5;
    } else if (last === 'd') {
      vector[0] += 5.5;
      vector[1] -= 3.5;
    }
  } else {
    if (quality === 'n') {
      if (node.degree.base === 4) {
        vector = MID_FOURTH;
      } else {
        vector = MID_FIFTH;
      }
    }
  }

  vector[0] += node.degree.octaves;

  // Eighth-augmented
  if (quality.startsWith('⅛a') || quality.startsWith('⅛Â')) {
    quality = quality.slice(2);
    vector[0] -= 1.375;
    vector[1] += 0.875;
  }
  if (quality.startsWith('⅜a') || quality.startsWith('⅜Â')) {
    quality = quality.slice(2);
    vector[0] -= 4.125;
    vector[1] += 2.625;
  }
  if (quality.startsWith('⅝a') || quality.startsWith('⅝Â')) {
    quality = quality.slice(2);
    vector[0] -= 6.875;
    vector[1] += 4.375;
  }
  if (quality.startsWith('⅞a') || quality.startsWith('⅞Â')) {
    quality = quality.slice(2);
    vector[0] -= 9.625;
    vector[1] += 6.125;
  }
  if (quality.startsWith('⅛d')) {
    quality = quality.slice(2);
    vector[0] += 1.375;
    vector[1] -= 0.875;
  }
  if (quality.startsWith('⅜d')) {
    quality = quality.slice(2);
    vector[0] += 4.125;
    vector[1] -= 2.625;
  }
  if (quality.startsWith('⅝d')) {
    quality = quality.slice(2);
    vector[0] += 6.875;
    vector[1] -= 4.375;
  }
  if (quality.startsWith('⅞d')) {
    quality = quality.slice(2);
    vector[0] += 9.625;
    vector[1] -= 6.125;
  }

  // Quarter-augmented
  if (
    quality.startsWith('qa') ||
    quality.startsWith('¼a') ||
    quality.startsWith('qÂ') ||
    quality.startsWith('¼Â')
  ) {
    quality = quality.slice(2);
    vector[0] -= 2.75;
    vector[1] += 1.75;
  }
  if (quality.startsWith('qd') || quality.startsWith('¼d')) {
    quality = quality.slice(2);
    vector[0] += 2.75;
    vector[1] -= 1.75;
  }
  if (
    quality.startsWith('Qa') ||
    quality.startsWith('¾a') ||
    quality.startsWith('QÂ') ||
    quality.startsWith('¾Â')
  ) {
    quality = quality.slice(2);
    vector[0] -= 8.25;
    vector[1] += 5.25;
  }
  if (quality.startsWith('Qd') || quality.startsWith('¾d')) {
    quality = quality.slice(2);
    vector[0] += 8.25;
    vector[1] -= 5.25;
  }

  // Semi-augmented
  if (
    quality.startsWith('sa') ||
    quality.startsWith('½a') ||
    quality.startsWith('sÂ') ||
    quality.startsWith('½Â')
  ) {
    quality = quality.slice(2);
    vector[0] -= 5.5;
    vector[1] += 3.5;
  }
  if (quality.startsWith('sd') || quality.startsWith('½d')) {
    quality = quality.slice(2);
    vector[0] += 5.5;
    vector[1] -= 3.5;
  }

  // (Fully) augmented
  while (quality.startsWith('a') || quality.startsWith('Â')) {
    quality = quality.slice(1);
    vector[0] -= 11;
    vector[1] += 7;
  }
  while (quality.startsWith('d')) {
    quality = quality.slice(1);
    vector[0] += 11;
    vector[1] -= 7;
  }

  // Major = semi-augmented
  if (quality === 'M') {
    vector[0] -= 5.5;
    vector[1] += 3.5;
  }
  // Minor = semi-diminished
  if (quality === 'm') {
    vector[0] += 5.5;
    vector[1] -= 3.5;
  }
  // Semimajor = quarter-augmented
  if (quality === 'sM' || quality === '½M') {
    vector[0] -= 2.75;
    vector[1] += 1.75;
  }
  // Semiminor = quarter-diminished
  if (quality === 'sm' || quality === '½m') {
    vector[0] += 2.75;
    vector[1] -= 1.75;
  }
  // Quartermajor = eighth-augmented
  if (quality === 'qM' || quality === '¼M') {
    vector[0] -= 1.375;
    vector[1] += 0.875;
  }
  // Quarterminor = eighth-diminished
  if (quality === 'qm' || quality === '¼m') {
    vector[0] += 1.375;
    vector[1] -= 0.875;
  }
  // Sesquisemimajor = three-eighths-augmented
  if (quality === 'QM' || quality === '¾M') {
    vector[0] -= 4.125;
    vector[1] += 2.625;
  }
  // Sesquisemiminor = three-eighths-augmented
  if (quality === 'Qm' || quality === '¾m') {
    vector[0] += 4.125;
    vector[1] -= 2.625;
  }

  // (Perfect, neutral and "empty" intervals need no further modifications.)

  const result = new TimeMonzo(
    ZERO,
    vector.map(c => new Fraction(c))
  );
  if (node.degree.negative) {
    return result.inverse();
  }
  return result;
}

export function absoluteMonzo(node: AbsolutePitch) {
  if (!NOMINAL_VECTORS.has(node.nominal)) {
    throw new Error(`Unrecognized nominal '${node.nominal}'`);
  }
  const vector = [...NOMINAL_VECTORS.get(node.nominal)!];
  for (const accidental of node.accidentals) {
    if (!ACCIDENTAL_VECTORS.has(accidental)) {
      throw new Error(`Unrecognized accidental '${accidental}'`);
    }
    const modification = ACCIDENTAL_VECTORS.get(accidental)!;
    vector[0] += modification[0];
    vector[1] += modification[1];
  }
  vector[0] += Number(node.octave) - 4;
  // These will be dressed up as frequencies later.
  return new TimeMonzo(
    ZERO,
    vector.map(c => new Fraction(c))
  );
}

const IMPERFECT_QUALITY_SPECTRUM = [
  'd',
  '⅞d',
  'Qd',
  '⅝d',
  'sd',
  '⅜d',
  'qd',
  '⅛d',
  'm',
  'Qm',
  'sm',
  'qm',
  'n',
  'qM',
  'sM',
  'QM',
  'M',
  '⅛a',
  'qa',
  '⅜a',
  'sa',
  '⅝a',
  'Qa',
  '⅞a',
  'a',
];

const PERFECT_QUALITY_SPECTRUM = [
  'd',
  '⅞d',
  'Qd',
  '⅝d',
  'sd',
  '⅜d',
  'qd',
  '⅛d',
  'P',
  '⅛a',
  'qa',
  '⅜a',
  'sa',
  '⅝a',
  'Qa',
  '⅞a',
  'a',
];

export function monzoToNode(monzo: TimeMonzo): Pythagorean | undefined {
  let twos = monzo.primeExponents[0].valueOf();
  let threes = monzo.primeExponents[1].valueOf();
  let stepspan = twos * 7 + threes * 11;
  const negative = stepspan < 0;
  if (negative) {
    stepspan = -stepspan;
    twos = -twos;
    threes = -threes;
  }
  const base = mmod(stepspan, 7) + 1;
  const octaves = Math.floor(stepspan / 7);
  let offCenter: number;
  if (Number.isInteger(stepspan)) {
    offCenter = (threes - PYTH_VECTORS[base - 1][1]) / 0.875;
  } else if (mmod(stepspan, 1) === 0.5) {
    offCenter = (threes - TONESPLITTER_VECTORS[base - 1.5][1]) / 0.875;
  } else {
    return undefined;
  }
  // Enforce sanity limits
  if (Math.abs(offCenter) > MAX_OFFSET) {
    return undefined;
  }
  const imperfect = ![1, 4, 5].includes(base);
  let quality = '';
  if (imperfect) {
    while (offCenter < -12) {
      quality += 'd';
      offCenter += 8;
    }
    while (offCenter > 12) {
      quality += 'a';
      offCenter -= 8;
    }
    quality += IMPERFECT_QUALITY_SPECTRUM[offCenter + 12];
  } else {
    while (offCenter < -8) {
      quality += 'd';
      offCenter += 8;
    }
    while (offCenter > 8) {
      quality += 'a';
      offCenter -= 8;
    }
    quality += PERFECT_QUALITY_SPECTRUM[offCenter + 8];
  }
  return {
    type: 'Pythagorean',
    quality,
    imperfect,
    degree: {
      base,
      negative,
      octaves,
    },
  };
}

const PURE_NOMINALS: AbsolutePitch['nominal'][] = [
  'C',
  'D',
  'E',
  'F',
  'G',
  'A',
  'B',
];

const TONESPLITTER_NOMINALS: AbsolutePitch['nominal'][] = [
  'γ',
  'δ',
  'ε',
  'ζ',
  'η',
  'α',
  'β',
];

const ACCIDENTAL_SPECTRUM = [
  ['𝄫'],
  ['⅞♭', '♭'],
  ['¾♭', '♭'],
  ['⅝♭', '♭'],
  ['d', '♭'],
  ['⅜♭', '♭'],
  ['¼♭', '♭'],
  ['⅛♭', '♭'],
  ['♭'],
  ['⅞♭'],
  ['¾♭'],
  ['⅝♭'],
  ['d'],
  ['⅜♭'],
  ['¼♭'],
  ['⅛♭'],
  [],
  ['⅛♯'],
  ['¼♯'],
  ['⅜♯'],
  ['‡'],
  ['⅝♯'],
  ['¾♯'],
  ['⅞♯'],
  ['♯'],
  ['⅛♯', '♯'],
  ['¼♯', '♯'],
  ['⅜♯', '♯'],
  ['‡', '♯'],
  ['⅝♯', '♯'],
  ['¾♯', '♯'],
  ['⅞♯', '♯'],
  ['𝄪'],
];

export function absoluteToNode(monzo: TimeMonzo): AbsolutePitch | undefined {
  const twos = monzo.primeExponents[0].valueOf();
  const threes = monzo.primeExponents[1].valueOf();
  const stepspan = twos * 7 + threes * 11;
  const octave = BigInt(Math.floor(Math.abs(stepspan) / 7) + 4);

  const spanRemainder = mmod(stepspan, 1);

  let nominal: AbsolutePitch['nominal'];
  if (spanRemainder === 0) {
    nominal = PURE_NOMINALS[mmod(stepspan, 7)];
  } else if (spanRemainder === 0.5) {
    nominal = TONESPLITTER_NOMINALS[mmod(stepspan - 0.5, 7)];
  } else {
    return undefined;
  }

  let offCenter = (threes - NOMINAL_VECTORS.get(nominal)![1]) / 0.875;

  // Enforce sanity limits
  if (Math.abs(offCenter) > MAX_OFFSET) {
    return undefined;
  }

  const accidentals: string[] = [];
  while (offCenter < -16) {
    accidentals.push('𝄫');
    offCenter += 16;
  }
  while (offCenter > 16) {
    accidentals.push('𝄪');
    offCenter -= 16;
  }
  accidentals.push(...ACCIDENTAL_SPECTRUM[offCenter + 16]);

  if (!accidentals.length) {
    accidentals.push('♮');
  }

  return {
    type: 'AbsolutePitch',
    nominal,
    accidentals: accidentals,
    octave,
  };
}

const SEMIQUARTAL_NOMINALS: AbsolutePitch['nominal'][] = [
  'C',
  'D',
  'φ',
  'χ',
  'F',
  'G',
  'A',
  'ψ',
  'ω',
];

export function absoluteToSemiquartal(
  monzo: TimeMonzo
): AbsolutePitch | undefined {
  const twos = monzo.primeExponents[0].valueOf();
  const threes = monzo.primeExponents[1].valueOf();
  const stepspan = twos * 9 + threes * 14;
  const octave = BigInt(Math.floor(Math.abs(stepspan) / 9) + 4);

  const spanRemainder = mmod(stepspan, 1);

  let nominal: AbsolutePitch['nominal'];
  if (spanRemainder === 0) {
    nominal = SEMIQUARTAL_NOMINALS[mmod(stepspan, 9)];
  } else {
    return undefined;
  }

  let offCenter = (threes - NOMINAL_VECTORS.get(nominal)![1]) / 4.5;

  const accidentals: string[] = [];
  while (offCenter < 0) {
    accidentals.push('£');
    offCenter++;
  }
  while (offCenter > 0) {
    accidentals.push('¤');
    offCenter--;
  }

  if (!accidentals.length) {
    accidentals.push('♮');
  }

  return {
    type: 'AbsolutePitch',
    nominal,
    accidentals: accidentals,
    octave,
  };
}
