import {
  Fraction,
  PRIME_CENTS,
  mmod,
  toMonzo,
  valueToCents,
} from 'xen-dev-utils';
import {TimeMonzo} from './monzo';

const ZERO = new Fraction(0);

const RADIUS_OF_TOLERANCE = valueToCents(65 / 63);

const NFJS_RADIUS = 13.5 * PRIME_CENTS[0] - 8.5 * PRIME_CENTS[1];

const FIFTH = PRIME_CENTS[1] - PRIME_CENTS[0];

function distance(a: number, b: number) {
  return Math.abs(mmod(a - b + 600, 1200) - 600);
}

function masterAlgorithm(primeCents: number) {
  let pythagoras = 0;
  let k = 0;
  if (distance(primeCents, pythagoras) < RADIUS_OF_TOLERANCE) {
    return k;
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    pythagoras += FIFTH;
    k++;
    if (distance(primeCents, pythagoras) < RADIUS_OF_TOLERANCE) {
      return k;
    }
    if (distance(primeCents, -pythagoras) < RADIUS_OF_TOLERANCE) {
      return -k;
    }
  }
}

function neutralMaster(primeCents: number) {
  let pythagoras = 0;
  if (distance(primeCents, pythagoras) < NFJS_RADIUS) {
    return 0;
  }
  for (let k = 1; k <= 6; ++k) {
    pythagoras += FIFTH;
    if (distance(primeCents, pythagoras) < NFJS_RADIUS) {
      return k;
    }
    if (distance(primeCents, -pythagoras) < NFJS_RADIUS) {
      return -k;
    }
  }
  pythagoras = 0.5 * FIFTH;
  for (let k = 1; k <= 6; ++k) {
    if (distance(primeCents, pythagoras) < NFJS_RADIUS) {
      return k - 0.5;
    }
    if (distance(primeCents, -pythagoras) < NFJS_RADIUS) {
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
    const monzo = Array(i + 1).fill(0);
    monzo[0] = twos;
    monzo[1] = threes;
    monzo[i] = 1;
    yield new TimeMonzo(
      ZERO,
      monzo.map(c => new Fraction(c))
    );
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
