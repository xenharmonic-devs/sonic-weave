import {
  Fraction,
  PRIMES,
  PRIME_CENTS,
  circleDistance,
  toMonzo,
  valueToCents,
} from 'xen-dev-utils';
import {TimeMonzo} from './monzo';
import {AbsoluteFJS, FJS, FJSInflection} from './expression';
import {absoluteToNode, monzoToNode} from './pythagorean';
import {getHEWM53, getHelmholtzEllis, getLumisComma} from './extra-commas';

const ZERO = new Fraction(0);

const RADIUS_OF_TOLERANCE = valueToCents(65 / 63);

const NFJS_RADIUS = 13.5 * PRIME_CENTS[0] - 8.5 * PRIME_CENTS[1];

// Tweaked manually to be as large as possible without disrupting original NFJS commas.
const BRIDGING_RADIUS = 92.1;

const FIFTH = PRIME_CENTS[1] - PRIME_CENTS[0];

function masterAlgorithm(primeCents: number) {
  let pythagoras = 0;
  let k = 0;
  if (circleDistance(primeCents, pythagoras) < RADIUS_OF_TOLERANCE) {
    return k;
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    pythagoras += FIFTH;
    k++;
    if (circleDistance(primeCents, pythagoras) < RADIUS_OF_TOLERANCE) {
      return k;
    }
    if (circleDistance(primeCents, -pythagoras) < RADIUS_OF_TOLERANCE) {
      return -k;
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

// Bridging comma master algorithm by frostburn
function neutralMaster(primeCents: number) {
  let pythagoras = 0.5 * FIFTH;
  let k = 0.5;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (circleDistance(primeCents, pythagoras) < BRIDGING_RADIUS) {
      return k;
    }
    if (circleDistance(primeCents, -pythagoras) < BRIDGING_RADIUS) {
      return -k;
    }
    pythagoras += FIFTH;
    k++;
  }
}

function* commaGenerator(master: typeof masterAlgorithm): Generator<TimeMonzo> {
  let i = 2;
  while (i < PRIME_CENTS.length) {
    const threes = -master(PRIME_CENTS[i]);
    let twos = threes;
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
    yield timeMonzo.mul(TimeMonzo.fromFraction(PRIMES[i]));
    i++;
  }
}

const formalCommas = [TimeMonzo.fromFraction(1), TimeMonzo.fromFraction(1)];

const neutralCommas = [TimeMonzo.fromFraction(1), TimeMonzo.fromFraction(1)];

const commaIterator = commaGenerator(masterAlgorithm);

const neutralIterator = commaGenerator(neutralMaster);

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

export function getInflection(
  superscripts: FJSInflection[],
  subscripts: FJSInflection[]
) {
  let result = TimeMonzo.fromFraction(1);
  for (const [s, flavor] of superscripts) {
    if (flavor === 'l') {
      result = result.mul(getLumisComma(s));
      continue;
    }
    const monzo = toMonzo(s);
    for (let i = 0; i < monzo.length; ++i) {
      if (flavor === '') {
        result = result.mul(getFormalComma(i).pow(monzo[i]));
      } else if (flavor === 'n') {
        result = result.mul(getNeutralComma(i).pow(monzo[i]));
      } else if (flavor === 'h') {
        result = result.mul(getHelmholtzEllis(i).pow(monzo[i]));
      } else {
        result = result.mul(getHEWM53(i).pow(monzo[i]));
      }
    }
  }
  for (const [s, flavor] of subscripts) {
    if (flavor === 'l') {
      result = result.div(getLumisComma(s));
      continue;
    }
    const monzo = toMonzo(s);
    for (let i = 0; i < monzo.length; ++i) {
      if (flavor === '') {
        result = result.div(getFormalComma(i).pow(monzo[i]));
      } else if (flavor === 'n') {
        result = result.div(getNeutralComma(i).pow(monzo[i]));
      } else if (flavor === 'h') {
        result = result.div(getHelmholtzEllis(i).pow(monzo[i]));
      } else {
        result = result.div(getHEWM53(i).pow(monzo[i]));
      }
    }
  }
  return result;
}

export function inflect(
  pythagorean: TimeMonzo,
  superscripts: FJSInflection[],
  subscripts: FJSInflection[]
) {
  return getInflection(superscripts, subscripts).mul(pythagorean);
}

export function uninflect(monzo: TimeMonzo) {
  const superscripts: FJSInflection[] = [];
  const subscripts: FJSInflection[] = [];
  const pe = monzo.primeExponents;
  for (let i = 2; i < pe.length; ++i) {
    for (let j = 0; pe[i].compare(j) > 0; ++j) {
      superscripts.push([PRIMES[i], '']);
    }
    for (let j = 0; pe[i].compare(-j) < 0; ++j) {
      subscripts.push([PRIMES[i], '']);
    }
  }
  try {
    const rpe = toMonzo(monzo.residual);
    for (let i = 2; i < rpe.length; ++i) {
      for (let j = 0; j < rpe[i]; ++j) {
        superscripts.push([PRIMES[i], '']);
      }
      for (let j = 0; j > rpe[i]; --j) {
        subscripts.push([PRIMES[i], '']);
      }
    }
  } catch (e) {
    /* empty */
  }
  const pythagoreanMonzo = monzo.div(getInflection(superscripts, subscripts));
  return {
    pythagoreanMonzo,
    superscripts,
    subscripts,
  };
}

export function asFJS(monzo: TimeMonzo): FJS | undefined {
  if (monzo.cents) {
    return undefined;
  }
  const pe = monzo.primeExponents;
  for (let i = 2; i < pe.length; ++i) {
    if (pe[i].d > 1) {
      return undefined;
    }
  }
  const {pythagoreanMonzo, superscripts, subscripts} = uninflect(monzo);
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

export function asAbsoluteFJS(monzo: TimeMonzo): AbsoluteFJS | undefined {
  if (monzo.cents) {
    return undefined;
  }
  const pe = monzo.primeExponents;
  for (let i = 2; i < pe.length; ++i) {
    if (pe[i].d > 1) {
      return undefined;
    }
  }
  const {pythagoreanMonzo, superscripts, subscripts} = uninflect(monzo);
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
