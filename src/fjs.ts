import {
  BIG_INT_PRIMES,
  Fraction,
  PRIMES,
  PRIME_CENTS,
  circleDistance,
  toMonzo,
  valueToCents,
} from 'xen-dev-utils';
import {TimeMonzo} from './monzo';
import {AbsoluteFJS, FJS} from './expression';
import {absoluteToNode, monzoToNode} from './pythagorean';

const ZERO = new Fraction(0);

const RADIUS_OF_TOLERANCE = valueToCents(65 / 63);

const NFJS_RADIUS = 13.5 * PRIME_CENTS[0] - 8.5 * PRIME_CENTS[1];

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

function neutralMaster(primeCents: number) {
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

export function formalInflection(superscripts: bigint[], subscripts: bigint[]) {
  let result = TimeMonzo.fromFraction(1);
  for (const s of superscripts) {
    const monzo = toMonzo(s);
    for (let i = 0; i < monzo.length; ++i) {
      result = result.mul(getFormalComma(i).pow(monzo[i]));
    }
  }
  for (const s of subscripts) {
    const monzo = toMonzo(s);
    for (let i = 0; i < monzo.length; ++i) {
      result = result.div(getFormalComma(i).pow(monzo[i]));
    }
  }
  return result;
}

export function neutralInflection(
  superscripts: bigint[],
  subscripts: bigint[]
) {
  let result = TimeMonzo.fromFraction(1);
  for (const s of superscripts) {
    const monzo = toMonzo(s);
    for (let i = 0; i < monzo.length; ++i) {
      result = result.mul(getNeutralComma(i).pow(monzo[i]));
    }
  }
  for (const s of subscripts) {
    const monzo = toMonzo(s);
    for (let i = 0; i < monzo.length; ++i) {
      result = result.div(getNeutralComma(i).pow(monzo[i]));
    }
  }
  return result;
}

export function inflect(
  pythagorean: TimeMonzo,
  superscripts: bigint[],
  subscripts: bigint[]
) {
  if (
    pythagorean.primeExponents[0].d === 2 &&
    pythagorean.primeExponents[1].d === 2
  ) {
    return neutralInflection(superscripts, subscripts).mul(pythagorean);
  }
  return formalInflection(superscripts, subscripts).mul(pythagorean);
}

export function uninflect(monzo: TimeMonzo) {
  const superscripts: bigint[] = [];
  const subscripts: bigint[] = [];
  const pe = monzo.primeExponents;
  for (let i = 2; i < pe.length; ++i) {
    for (let j = 0; pe[i].compare(j) > 0; ++j) {
      superscripts.push(BIG_INT_PRIMES[i]);
    }
    for (let j = 0; pe[i].compare(-j) < 0; ++j) {
      subscripts.push(BIG_INT_PRIMES[i]);
    }
  }
  try {
    const rpe = toMonzo(monzo.residual);
    for (let i = 2; i < rpe.length; ++i) {
      for (let j = 0; j < rpe[i]; ++j) {
        superscripts.push(BIG_INT_PRIMES[i]);
      }
      for (let j = 0; j > rpe[i]; --j) {
        subscripts.push(BIG_INT_PRIMES[i]);
      }
    }
  } catch (e) {
    /* empty */
  }
  const pythagoreanMonzo = monzo.div(
    formalInflection(superscripts, subscripts)
  );
  return {
    pythagoreanMonzo,
    superscripts,
    subscripts,
  };
}

// TODO: Use node to uninflect smarter
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    downs: 0,
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
    downs: 0,
    pitch,
    superscripts,
    subscripts,
  };
}
