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
import {ZERO} from './utils';

/**
 * Base degree for a mosstep in a 0-indexed array.
 */
export type MosDegree = {
  /**
   * The perfect or neutral central interval.
   */
  center: TimeMonzo;
  /**
   * Flag to indicate if the degree has minor and major variants.
   */
  imperfect: boolean;
  /**
   * The lopsided neutral variant of a bright or dark generator.
   */
  mid?: TimeMonzo;
};

/**
 * Configuration for a scale notated in Diamond mos.
 * May define a non-MOS scale as a result of accidental or intentional misconfiguration.
 */
export type MosConfig = {
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
  /**
   * Pattern for reconstructing the MOS declaration.
   */
  pattern: string;
  /**
   * Value of the large step.
   */
  large: TimeMonzo;
  /**
   * Value of the small step.
   */
  small: TimeMonzo;
};

/**
 * Generic 0-indexed mosstep.
 */
export type MosStep = {
  type: 'MosStep';
  quality: IntervalQuality;
  augmentations?: AugmentedQuality[];
  degree: 0;
};

/**
 * Accidental in Diamond-mos notation.
 *
 * & = Raises a note by a moschroma +(L-s)
 * e = Raises a note by half a moschroma +(L-s)/2
 * a = Lowers a note by half a moschroma -(L-s)/2
 * @ = Lowers a note by a moschroma -(L-s)
 */
export type MosAccidental = '&' | 'e' | 'a' | '@';

/**
 * Potentially fractional Diamond-mos accidental.
 */
export type SplitMosAccidental = {
  fraction: VulgarFraction;
  accidental: Accidental | MosAccidental;
};

/**
 * Diamond-mos nominals from J to Z.
 *
 * The number of valid nominals corresponds to the size of the MOS scale and repeats every equave.
 */
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

/**
 * Obtain relative values for one equave-run of the given config of a MOS declaration with implicit unison.
 * @param config Result of a MOS declaration.
 * @returns An array of relative time monzos.
 */
export function scaleMonzos(config: MosConfig) {
  const entries = Array.from(config.scale);
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const monzos = entries.map(entry => entry[1]);
  monzos.push(monzos.shift()!.mul(config.equave) as TimeMonzo);
  return monzos;
}

/**
 * Convert a generic 0-indexed TAMNAMS mosstep to a relative time monzo.
 * @param node MosStep like P0ms.
 * @param config Result of a MOS declaration.
 * @returns A relative time monzo.
 */
export function mosMonzo(node: MosStep, config: MosConfig): TimeMonzo {
  const baseDegree = mmod(Math.abs(node.degree), config.degrees.length);
  const periods = (node.degree - baseDegree) / config.degrees.length;
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
    if (quality === 'P') {
      throw new Error(
        `The mosstep ${baseDegree} does not have a perfect variant.`
      );
    }
  } else if (quality === 'n') {
    if (!mosDegree.mid) {
      throw new Error('Missing mid mosstep quality.');
    }
    return mosDegree.mid;
  } else if (quality === 'M' || quality === 'm') {
    throw new Error(
      `The mosstep ${baseDegree} does not have minor or major variants.`
    );
  }
  return mosDegree.center
    .mul(inflection)
    .mul(config.period.pow(periods)) as TimeMonzo;
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

/**
 * Convert a Diamond-mos note to a time monzo relative to J4 = C4.
 * @param node Absolute note like J@5.
 * @param config Result of a MOS declaration.
 * @returns A time monzo relative to J4.
 */
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
  return result.mul(config.equave.pow(node.octave - 4)) as TimeMonzo;
}
