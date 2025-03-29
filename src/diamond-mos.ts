/* eslint-disable @typescript-eslint/no-unused-vars */
import {mmod} from 'xen-dev-utils';
import {reviveMonzo, TimeMonzo, TimeReal} from './monzo';
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
  center: TimeMonzo | TimeReal;
  /**
   * Flag to indicate if the degree has minor and major variants.
   */
  imperfect: boolean;
  /**
   * The lopsided neutral variant of a bright or dark generator.
   */
  mid?: TimeMonzo | TimeReal;
};

/**
 * Configuration for a scale notated in Diamond mos.
 * May define a non-MOS scale as a result of accidental or intentional misconfiguration.
 */
export type MosConfig = {
  /**
   * Interval of equivalence. The distance between J4 and J5.
   */
  equave: TimeMonzo | TimeReal;
  /**
   * Period of repetition.
   */
  period: TimeMonzo | TimeReal;
  /**
   * Current value of the '&' accidental.
   */
  am: TimeMonzo | TimeReal;
  /**
   * Current value of the 'e' accidental.
   */
  semiam: TimeMonzo | TimeReal;
  /**
   * Relative scale from J onwards. Echelon depends on J. Use equave to reach higher octave numbers.
   */
  scale: Map<string, TimeMonzo | TimeReal>;
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
  large: TimeMonzo | TimeReal;
  /**
   * Value of the small step.
   */
  small: TimeMonzo | TimeReal;
};

function mosDegreeToJSON(mosDegree: MosDegree) {
  return {
    type: 'MosDegree',
    center: mosDegree.center.toJSON(),
    imperfect: mosDegree.imperfect,
    mid: mosDegree.mid ? mosDegree.mid.toJSON() : null,
  };
}

function reviveMosDegree(data: ReturnType<typeof mosDegreeToJSON>): MosDegree {
  return {
    center: reviveMonzo(data.center),
    imperfect: data.imperfect,
    mid: data.mid ? reviveMonzo(data.mid) : undefined,
  };
}

/**
 * Serialize a {@link MosConfig} to a JSON compatible object.
 * @param config MOS configuration to serialize.
 * @returns The serialized object.
 */
export function mosConfigToJSON(config?: MosConfig) {
  if (!config) {
    return null;
  }
  const scale: Record<
    string,
    ReturnType<TimeMonzo['toJSON']> | ReturnType<TimeReal['toJSON']>
  > = {};
  for (const [key, monzo] of config.scale) {
    scale[key] = monzo.toJSON();
  }

  return {
    type: 'MosConfig',
    equave: config.equave.toJSON(),
    period: config.period.toJSON(),
    am: config.am.toJSON(),
    semiam: config.semiam.toJSON(),
    scale,
    degrees: config.degrees.map(mosDegreeToJSON),
    pattern: config.pattern,
    large: config.large.toJSON(),
    small: config.small.toJSON(),
  };
}

/**
 * Revive a serialized object produced by {@link mosConfigToJSON}.
 * @param data Serialized JSON object.
 * @returns Deserialized {@link MosConfig}.
 */
export function reviveMosConfig(
  data: ReturnType<typeof mosConfigToJSON>
): MosConfig | undefined {
  if (!data) {
    return undefined;
  }
  const scale = new Map<string, TimeReal | TimeMonzo>();
  for (const [key, value] of Object.entries(data.scale)) {
    scale.set(key, reviveMonzo(value));
  }
  return {
    equave: reviveMonzo(data.equave),
    period: reviveMonzo(data.period),
    am: reviveMonzo(data.am),
    semiam: reviveMonzo(data.semiam),
    scale,
    degrees: data.degrees.map(reviveMosDegree),
    pattern: data.pattern,
    large: reviveMonzo(data.large),
    small: reviveMonzo(data.small),
  };
}

/**
 * Generic 0-indexed mosstep.
 */
export type MosStep = {
  type: 'MosStep';
  quality: IntervalQuality;
  augmentations?: AugmentedQuality[];
  degree: number;
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
 * Absolute Diamond-mos pitch.
 */
export type AbsoluteMosPitch = {
  type: 'AbsolutePitch';
  nominal: string;
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
  entries.sort((a, b) =>
    a[0].length < b[0].length
      ? -1
      : a[0].length > b[0].length
        ? 1
        : a[0].localeCompare(b[0])
  );
  const monzos = entries.map(entry => entry[1]);
  monzos.push(monzos.shift()!.mul(config.equave));
  return monzos;
}

/**
 * Convert a generic 0-indexed TAMNAMS mosstep to a relative time monzo.
 * @param node MosStep like P0ms.
 * @param config Result of a MOS declaration.
 * @returns A relative time monzo.
 */
export function mosMonzo(
  node: MosStep,
  config: MosConfig
): TimeMonzo | TimeReal {
  const baseDegree = mmod(Math.abs(node.degree), config.degrees.length);
  const periods = (node.degree - baseDegree) / config.degrees.length;
  const mosDegree = config.degrees[baseDegree];
  const quality = node.quality.quality;
  let inflection: TimeMonzo | TimeReal = new TimeMonzo(ZERO, []);
  if (
    quality === 'a' ||
    quality === 'Â' ||
    quality === 'aug' ||
    quality === 'Aug'
  ) {
    inflection = config.am;
  } else if (quality === 'd' || quality === 'dim') {
    inflection = config.am.inverse();
  } else if (quality === 'M' || quality === 'maj' || quality === 'Maj') {
    inflection = config.semiam;
  } else if (quality === 'm' || quality === 'min') {
    inflection = config.semiam.inverse();
  }
  if (node.quality.fraction !== '') {
    const fraction = VULGAR_FRACTIONS.get(node.quality.fraction)!;
    const fractionalInflection = inflection.pow(fraction);
    inflection = fractionalInflection;
  }

  for (const augmentation of node.augmentations ?? []) {
    if (augmentation === 'd' || augmentation === 'dim') {
      inflection = inflection.div(config.am);
    } else {
      inflection = inflection.mul(config.am);
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
      inflection = inflection.mul(config.semiam);
    } else if (quality === 'd' || quality === 'dim') {
      inflection = inflection.div(config.semiam);
    }
    if (quality === 'P') {
      throw new Error(
        `The mosstep ${baseDegree} does not have a perfect variant.`
      );
    }
  } else if (quality === 'n' || quality === 'neu') {
    if (!mosDegree.mid) {
      throw new Error('Missing mid mosstep quality.');
    }
    return mosDegree.mid;
  } else if (
    quality === 'M' ||
    quality === 'maj' ||
    quality === 'Maj' ||
    quality === 'm' ||
    quality === 'min'
  ) {
    throw new Error(
      `The mosstep ${baseDegree} does not have minor or major variants.`
    );
  }
  return mosDegree.center.mul(inflection).mul(config.period.pow(periods));
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
): TimeMonzo | TimeReal {
  if (!config.scale.has(node.nominal)) {
    throw new Error(`Nominal ${node.nominal} is unassigned.`);
  }
  let result = config.scale.get(node.nominal)!.clone();
  for (const accidental of node.accidentals) {
    const inflection = mosInflection(accidental.accidental, config);

    const fraction = VULGAR_FRACTIONS.get(accidental.fraction)!;
    const fractionalInflection = inflection.pow(fraction);
    result = result.mul(fractionalInflection);
  }
  return result.mul(config.equave.pow(node.octave - 4));
}
