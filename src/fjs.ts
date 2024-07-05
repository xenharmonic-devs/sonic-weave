import {
  Fraction,
  PRIMES,
  PRIME_CENTS,
  circleDistance,
  toMonzo,
  valueToCents,
} from 'xen-dev-utils';
import {TimeMonzo, TimeReal} from './monzo';
import {AbsoluteFJS, FJS, FJSFlavor, FJSInflection} from './expression';
import {absoluteToNode, monzoToNode} from './pythagorean';
import {
  HEJI_SWAPS,
  HEWM53_SWAPS,
  getHEWM53,
  getHelmholtzEllis,
  getLumisComma,
  getSyntonicRastmic,
} from './extra-commas';
import {ZERO} from './utils';

// Maximum exponent of a higher prime when converting to FJS.
const MAX_EXPONENT = Object.freeze(new Fraction(100));

// Classic radius of tolerance.
const RADIUS_OF_TOLERANCE = valueToCents(65 / 63);

// Using a half-sharp + epsilon as the radius of tolerace closes the gap between minor and major.
// https://en.xen.wiki/w/User:FloraC/Critique_on_Functional_Just_System
const SEMIAPOTOME = 0.5 * valueToCents(2187 / 2048) + 1e-6;

const NFJS_RADIUS = 13.5 * PRIME_CENTS[0] - 8.5 * PRIME_CENTS[1];

// Tweaked manually to be as large as possible without disrupting original NFJS commas.
const NEUTRAL_BRIDGING_RADIUS = 92.1;

// Tweaked manually to align with harmonic segments preferring the large limma.
const SEMIQUARTAL_BRIDGING_RADIUS = 137.2;

// XXX: Not much thought was given to this choice.
const TONE_SPLITTER_BRIDGING_RADIUS = SEMIAPOTOME;

const FIFTH = PRIME_CENTS[1] - PRIME_CENTS[0];

const FOURTH = 2 * PRIME_CENTS[0] - PRIME_CENTS[1];

const OCTAVE = PRIME_CENTS[0];

function masterAlgorithm(
  primeCents: number,
  radius = RADIUS_OF_TOLERANCE
): [number, number] {
  let pythagoras = 0;
  let k = 0;
  if (circleDistance(primeCents, pythagoras) < radius) {
    return [k, -k];
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    pythagoras += FIFTH;
    k++;
    if (circleDistance(primeCents, pythagoras) < radius) {
      return [k, -k];
    }
    if (circleDistance(primeCents, -pythagoras) < radius) {
      return [-k, k];
    }
  }
}

// The original NFJS master algorithm by M-yac
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function myacNeutralMaster(primeCents: number) {
  let pythagoras = 0;
  if (circleDistance(primeCents, pythagoras) < NFJS_RADIUS) {
    return 0;
  }
  for (let k = 1; k <= 6; ++k) {
    pythagoras += FIFTH;
    if (circleDistance(primeCents, pythagoras) < NFJS_RADIUS) {
      return k;
    }
    if (circleDistance(primeCents, -pythagoras) < NFJS_RADIUS) {
      return -k;
    }
  }
  pythagoras = 0.5 * FIFTH;
  for (let k = 1; k <= 6; ++k) {
    if (circleDistance(primeCents, pythagoras) < NFJS_RADIUS) {
      return k - 0.5;
    }
    if (circleDistance(primeCents, -pythagoras) < NFJS_RADIUS) {
      return 0.5 - k;
    }
    pythagoras += FIFTH;
  }
  throw new Error('Unable to locate NFJS region');
}

// Neutral bridging comma master algorithm by frostburn
function neutralMaster(primeCents: number): [number, number] {
  let pythagoras = 0.5 * FIFTH;
  // XXX: Abuse the fact that negative powers of two are exact in floating point.
  let k = 0.5;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (circleDistance(primeCents, pythagoras) < NEUTRAL_BRIDGING_RADIUS) {
      return [k, -k];
    }
    if (circleDistance(primeCents, -pythagoras) < NEUTRAL_BRIDGING_RADIUS) {
      return [-k, k];
    }
    pythagoras += FIFTH;
    k++;
  }
}

// Semiquartal bridging comma master algorithm by frostburn
function semiquartalMaster(primeCents: number): [number, number] {
  let pythagoras = 0.5 * FOURTH;
  // XXX: Abuse the fact that negative powers of two are exact in floating point.
  let k = 0.5;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (circleDistance(primeCents, pythagoras) < SEMIQUARTAL_BRIDGING_RADIUS) {
      return [-k - 0.5, k];
    }
    if (circleDistance(primeCents, -pythagoras) < SEMIQUARTAL_BRIDGING_RADIUS) {
      return [k + 0.5, -k];
    }
    pythagoras += FOURTH;
    k++;
  }
}

// Tone-splitter bridging comma master algorithm by frostburn
function toneSplitterMaster(primeCents: number): [number, number] {
  let pythagoras = 0.5 * OCTAVE;
  // XXX: Abuse the fact that negative powers of two are exact in floating point.
  let k = 0.5;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (circleDistance(primeCents, pythagoras) < SEMIQUARTAL_BRIDGING_RADIUS) {
      return [k, 0.5 - k];
    }
    if (circleDistance(primeCents, -pythagoras) < SEMIQUARTAL_BRIDGING_RADIUS) {
      return [-k, k - 0.5];
    }
    pythagoras += FIFTH;
    k++;
  }
}

function* commaGenerator(master: typeof masterAlgorithm): Generator<TimeMonzo> {
  let i = 2;
  while (i < PRIME_CENTS.length) {
    let [twos, threes] = master(PRIME_CENTS[i]);
    let commaCents =
      PRIME_CENTS[i] + twos * PRIME_CENTS[0] + threes * PRIME_CENTS[1];
    while (commaCents > 600) {
      commaCents -= PRIME_CENTS[0];
      twos--;
    }
    while (commaCents < -600) {
      commaCents += PRIME_CENTS[0];
      twos++;
    }
    const timeMonzo = new TimeMonzo(ZERO, [
      new Fraction(twos),
      new Fraction(threes),
    ]);
    yield timeMonzo.mul(TimeMonzo.fromFraction(PRIMES[i])) as TimeMonzo;
    i++;
  }
}

const formalCommas = [TimeMonzo.fromFraction(1), TimeMonzo.fromFraction(1)];

const floraCommas = [TimeMonzo.fromFraction(1), TimeMonzo.fromFraction(1)];

const neutralCommas = [TimeMonzo.fromFraction(1), TimeMonzo.fromFraction(1)];

const semiquartalCommas = [
  TimeMonzo.fromFraction(1),
  TimeMonzo.fromFraction(1),
];

const toneSplitterCommas = [
  TimeMonzo.fromFraction(1),
  TimeMonzo.fromFraction(1),
];

const commaIterator = commaGenerator(masterAlgorithm);

const floraIterator = commaGenerator(primeCents =>
  masterAlgorithm(primeCents, SEMIAPOTOME)
);

const neutralIterator = commaGenerator(neutralMaster);

const semiquartalIterator = commaGenerator(semiquartalMaster);

const toneSplitterIterator = commaGenerator(toneSplitterMaster);

export function getFormalComma(index: number) {
  while (index >= formalCommas.length) {
    const iterand = commaIterator.next();
    if (iterand.done) {
      throw new Error('Out of primes');
    }
    formalCommas.push(iterand.value);
  }
  return formalCommas[index];
}

export function getFloraComma(index: number) {
  while (index >= floraCommas.length) {
    const iterand = floraIterator.next();
    if (iterand.done) {
      throw new Error('Out of primes');
    }
    floraCommas.push(iterand.value);
  }
  return floraCommas[index];
}

export function getNeutralComma(index: number) {
  while (index >= neutralCommas.length) {
    const iterand = neutralIterator.next();
    if (iterand.done) {
      throw new Error('Out of primes');
    }
    neutralCommas.push(iterand.value);
  }
  return neutralCommas[index];
}

export function getSemiquartalComma(index: number) {
  while (index >= semiquartalCommas.length) {
    const iterand = semiquartalIterator.next();
    if (iterand.done) {
      throw new Error('Out of primes');
    }
    semiquartalCommas.push(iterand.value);
  }
  return semiquartalCommas[index];
}

export function getToneSplitterComma(index: number) {
  while (index >= toneSplitterCommas.length) {
    const iterand = toneSplitterIterator.next();
    if (iterand.done) {
      throw new Error('Out of primes');
    }
    toneSplitterCommas.push(iterand.value);
  }
  return toneSplitterCommas[index];
}

export function getInflection(
  superscripts: FJSInflection[],
  subscripts: FJSInflection[]
) {
  let result: TimeMonzo | TimeReal = TimeMonzo.fromFraction(1);
  for (const [s, flavor] of superscripts) {
    if (flavor === 'l') {
      result = result.mul(getLumisComma(s));
      continue;
    } else if (flavor === 's') {
      result = result.mul(getSyntonicRastmic(s));
      continue;
    }
    const monzo = toMonzo(s);
    for (let i = 0; i < monzo.length; ++i) {
      if (flavor === 'c') {
        result = result.mul(getFormalComma(i).pow(monzo[i]));
      } else if (flavor === 'n') {
        result = result.mul(getNeutralComma(i).pow(monzo[i]));
      } else if (flavor === 'q') {
        result = result.mul(getSemiquartalComma(i).pow(monzo[i]));
      } else if (flavor === 't') {
        result = result.mul(getToneSplitterComma(i).pow(monzo[i]));
      } else if (flavor === '' || flavor === 'f') {
        result = result.mul(getFloraComma(i).pow(monzo[i]));
      } else if (flavor === 'h') {
        result = result.mul(getHelmholtzEllis(i).pow(monzo[i]));
      } else if (flavor === 'm') {
        result = result.mul(getHEWM53(i).pow(monzo[i]));
      } else {
        flavor satisfies never;
      }
    }
  }
  for (const [s, flavor] of subscripts) {
    if (flavor === 'l') {
      result = result.div(getLumisComma(s));
      continue;
    } else if (flavor === 's') {
      result = result.div(getSyntonicRastmic(s));
      continue;
    }
    const monzo = toMonzo(s);
    for (let i = 0; i < monzo.length; ++i) {
      if (flavor === 'c') {
        result = result.div(getFormalComma(i).pow(monzo[i]));
      } else if (flavor === '' || flavor === 'f') {
        result = result.div(getFloraComma(i).pow(monzo[i]));
      } else if (flavor === 'n') {
        result = result.div(getNeutralComma(i).pow(monzo[i]));
      } else if (flavor === 'q') {
        result = result.div(getSemiquartalComma(i).pow(monzo[i]));
      } else if (flavor === 't') {
        result = result.div(getToneSplitterComma(i).pow(monzo[i]));
      } else if (flavor === 'h') {
        result = result.div(getHelmholtzEllis(i).pow(monzo[i]));
      } else if (flavor === 'm') {
        result = result.div(getHEWM53(i).pow(monzo[i]));
      } else {
        flavor satisfies never;
      }
    }
  }
  if (result instanceof TimeReal) {
    throw new Error('FJS inflection failed.');
  }
  return result;
}

export function inflect(
  pythagorean: TimeMonzo | TimeReal,
  superscripts: FJSInflection[],
  subscripts: FJSInflection[]
) {
  return getInflection(superscripts, subscripts).mul(pythagorean);
}

export function uninflect(monzo: TimeMonzo, flavor: FJSFlavor) {
  if (flavor === 'l' || flavor === 's') {
    throw new Error('Uninflection not implement in non-prime basis.');
  }
  let swaps: boolean[] = [];
  if (flavor === 'h') {
    swaps = HEJI_SWAPS;
  } else if (flavor === 'm') {
    swaps = HEWM53_SWAPS;
  }
  const superscripts: FJSInflection[] = [];
  const subscripts: FJSInflection[] = [];
  const pe = monzo.primeExponents;
  for (let i = 2; i < pe.length; ++i) {
    if (pe[i].abs().compare(MAX_EXPONENT) > 0) {
      return undefined;
    }
    let sup = superscripts;
    let sub = subscripts;
    if (swaps[i]) {
      [sup, sub] = [sub, sup];
    }
    for (let j = 0; pe[i].compare(j) > 0; ++j) {
      sup.push([PRIMES[i], flavor]);
    }
    for (let j = 0; pe[i].compare(-j) < 0; ++j) {
      sub.push([PRIMES[i], flavor]);
    }
  }
  try {
    const rpe = toMonzo(monzo.residual);
    for (let i = 2; i < rpe.length; ++i) {
      let sup = superscripts;
      let sub = subscripts;
      if (swaps[i]) {
        [sup, sub] = [sub, sup];
      }
      for (let j = 0; j < rpe[i]; ++j) {
        sup.push([PRIMES[i], flavor]);
      }
      for (let j = 0; j > rpe[i]; --j) {
        sub.push([PRIMES[i], flavor]);
      }
    }
  } catch (e) {
    /* empty */
  }
  const pythagoreanMonzo = monzo.div(getInflection(superscripts, subscripts));
  if (pythagoreanMonzo instanceof TimeReal) {
    throw new Error('FJS uninflection failed.');
  }
  return {
    pythagoreanMonzo,
    superscripts,
    subscripts,
  };
}

export function asFJS(monzo: TimeMonzo, flavor: FJSFlavor): FJS | undefined {
  if (monzo.residual.s !== 1) {
    return undefined;
  }
  if (!monzo.isScalar()) {
    return undefined;
  }
  const pe = monzo.primeExponents;
  for (let i = 2; i < pe.length; ++i) {
    if (pe[i].d > 1) {
      return undefined;
    }
  }
  const breakdown = uninflect(monzo, flavor);
  if (!breakdown) {
    return undefined;
  }
  const {pythagoreanMonzo, superscripts, subscripts} = breakdown;
  const pythagorean = monzoToNode(pythagoreanMonzo);
  if (!pythagorean) {
    return undefined;
  }
  return {
    type: 'FJS',
    ups: 0,
    lifts: 0,
    pythagorean,
    superscripts,
    subscripts,
  };
}

export function asAbsoluteFJS(
  monzo: TimeMonzo,
  flavor: FJSFlavor
): AbsoluteFJS | undefined {
  if (monzo.residual.s !== 1) {
    return undefined;
  }
  const pe = monzo.primeExponents;
  for (let i = 2; i < pe.length; ++i) {
    if (pe[i].d > 1) {
      return undefined;
    }
  }
  const breakdown = uninflect(monzo, flavor);
  if (!breakdown) {
    return undefined;
  }
  const {pythagoreanMonzo, superscripts, subscripts} = breakdown;
  const pitch = absoluteToNode(pythagoreanMonzo);
  if (!pitch) {
    return undefined;
  }
  return {
    type: 'AbsoluteFJS',
    ups: 0,
    lifts: 0,
    pitch,
    superscripts,
    subscripts,
  };
}
