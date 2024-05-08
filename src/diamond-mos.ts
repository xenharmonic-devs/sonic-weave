/* eslint-disable @typescript-eslint/no-unused-vars */
import {mmod} from 'xen-dev-utils';
import {TimeMonzo, TimeReal} from './monzo';
import {
  ACCIDENTAL_VECTORS,
  Accidental,
  AugmentedQuality,
  IntervalQuality,
  VULGAR_FRACTIONS,
  VulgarFraction,
} from './pythagorean';
import {ZERO, hasOwn} from './utils';

export type MosDegree = {
  center: TimeMonzo;
  imperfect: boolean;
  mid?: TimeMonzo;
};

/**
 * Configuration for a scale notated in Diamond mos.
 * May define a non-MOS scale as a result of accidental or intentional misconfiguration.
 */
export type MosConfig = {
  /**
   * Current value of middle J.
   */
  J4: TimeMonzo;
  /**
   * Interval of equivalence. The distance between J4 and J5.
   */
  equave: TimeMonzo;
  /**
   * Period of repetition.
   */
  period: TimeMonzo;
  /**
   * Current value of the '&' accidental.
   */
  am: TimeMonzo;
  /**
   * Current value of the 'e' accidental.
   */
  semiam: TimeMonzo;
  /**
   * Relative scale from J onwards. Echelon depends on J. Use equave to reach higher octave numbers.
   */
  scale: Map<MosNominal, TimeMonzo>;
  /**
   * Intervals for relative notation. Use period to reach larger intervals.
   */
  degrees: MosDegree[];
};

export type MosStep = {
  type: 'MosStep';
  quality: IntervalQuality;
  augmentations?: AugmentedQuality[];
  degree: 0;
};

export type MosAccidental = '&' | 'e' | 'a' | '@';

export type SplitMosAccidental = {
  fraction: VulgarFraction;
  accidental: Accidental | MosAccidental;
};

export type MosNominal =
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';

/**
 * Absolute Diamond-mos pitch.
 */
export type AbsoluteMosPitch = {
  type: 'AbsolutePitch';
  nominal: MosNominal;
  accidentals: SplitMosAccidental[];
  octave: number;
};

export function mosMonzo(node: MosStep, config: MosConfig): TimeMonzo {
  const baseDegree = mmod(Math.abs(node.degree), config.degrees.length);
  const mosDegree = config.degrees[baseDegree];
  const quality = node.quality.quality;
  let inflection = new TimeMonzo(ZERO, []);
  if (
    quality === 'a' ||
    quality === 'Â' ||
    quality === 'aug' ||
    quality === 'Aug'
  ) {
    inflection = config.am;
  } else if (quality === 'd' || quality === 'dim') {
    inflection = config.am.inverse();
  } else if (quality === 'M') {
    inflection = config.semiam;
  } else if (quality === 'm') {
    inflection = config.semiam.inverse();
  }
  if (node.quality.fraction !== '') {
    const fraction = VULGAR_FRACTIONS.get(node.quality.fraction)!;
    const fractionalInflection = inflection.pow(fraction);
    if (fractionalInflection instanceof TimeReal) {
      throw new Error('Failed to fractionally inflect mosstep.');
    }
    inflection = fractionalInflection;
  }

  for (const augmentation of node.augmentations ?? []) {
    if (augmentation === 'd' || augmentation === 'dim') {
      inflection = inflection.div(config.am) as TimeMonzo;
    } else {
      inflection = inflection.mul(config.am) as TimeMonzo;
    }
  }

  // Non-perfect intervals need an extra half-augmented widening
  if (mosDegree.imperfect) {
    if (
      quality === 'a' ||
      quality === 'Â' ||
      quality === 'aug' ||
      quality === 'Aug'
    ) {
      inflection = inflection.mul(config.semiam) as TimeMonzo;
    } else if (quality === 'd' || quality === 'dim') {
      inflection = inflection.div(config.semiam) as TimeMonzo;
    }
  } else if (quality === 'n') {
    if (!mosDegree.mid) {
      throw new Error('Missing mid mosstep quality.');
    }
    return mosDegree.mid;
  }
  return mosDegree.center.mul(inflection) as TimeMonzo;
}

function mosInflection(
  accidental: MosAccidental | Accidental,
  config: MosConfig
) {
  switch (accidental) {
    case '&':
      return config.am;
    case 'e':
      return config.semiam;
    case '@':
      return config.am.inverse();
    case 'a':
      return config.semiam.inverse();
  }
  if (!ACCIDENTAL_VECTORS.has(accidental)) {
    throw new Error(`Accidental ${accidental} is unassigned.`);
  }
  const vector = ACCIDENTAL_VECTORS.get(accidental)!;
  return new TimeMonzo(ZERO, vector);
}

export function absoluteMosMonzo(
  node: AbsoluteMosPitch,
  config: MosConfig
): TimeMonzo {
  if (!config.scale.has(node.nominal)) {
    throw new Error(`Nominal ${node.nominal} is unassigned.`);
  }
  let result = config.scale.get(node.nominal)!.clone();
  for (const accidental of node.accidentals) {
    const inflection = mosInflection(accidental.accidental, config);

    const fraction = VULGAR_FRACTIONS.get(accidental.fraction)!;
    const fractionalInflection = inflection.pow(fraction);
    if (fractionalInflection instanceof TimeReal) {
      throw new Error('Failed to fracture mos accidental.');
    }
    result = result.mul(fractionalInflection) as TimeMonzo;
  }
  return result;
}
