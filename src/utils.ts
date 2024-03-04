import {Fraction, PRIMES} from 'xen-dev-utils';

export const ZERO = new Fraction(0);
export const ONE = new Fraction(1);
export const NEGATIVE_ONE = new Fraction(-1);
export const TWO = new Fraction(2);

function protectFraction(fraction: Fraction) {
  Object.defineProperty(fraction, 's', {writable: false});
  Object.defineProperty(fraction, 'n', {writable: false});
  Object.defineProperty(fraction, 'd', {writable: false});
}
protectFraction(ZERO);
protectFraction(ONE);
protectFraction(NEGATIVE_ONE);
protectFraction(TWO);

export const FRACTION_PRIMES: Fraction[] = [];
for (const prime of PRIMES) {
  const p = new Fraction(prime);
  protectFraction(p);
  FRACTION_PRIMES.push(p);
}

/**
 * Greatest common divisor of two integers.
 * @param a The first integer.
 * @param b The second integer.
 * @returns The largest integer that divides a and b.
 */
export function bigGcd(a: bigint, b: bigint): bigint {
  if (!a) return b;
  if (!b) return a;
  while (true) {
    a %= b;
    if (!a) return b;
    b %= a;
    if (!b) return a;
  }
}

/**
 * Calculate the absolute value of a BigInt.
 * @param x An integer.
 * @returns The size of the input value.
 */
export function bigAbs(x: bigint) {
  return x < 0n ? -x : x;
}

/**
 * Least common multiple of two integers.
 * @param a The first integer.
 * @param b The second integer.
 * @returns The smallest integer that both a and b divide.
 */
export function bigLcm(a: bigint, b: bigint): bigint {
  return (bigAbs(a) / bigGcd(a, b)) * bigAbs(b);
}

/**
 * One of the metric prefixes listed here: https://en.wikipedia.org/wiki/Metric_prefix
 * Goes from quecto = 10^-30 to Quetta = 10^30.
 */
export type MetricPrefix =
  | 'Q'
  | 'R'
  | 'Y'
  | 'Z'
  | 'E'
  | 'P'
  | 'T'
  | 'G'
  | 'M'
  | 'k'
  | 'h'
  | 'da'
  | ''
  | 'd'
  | 'c'
  | 'm'
  | 'µ'
  | 'n'
  | 'p'
  | 'f'
  | 'a'
  | 'z'
  | 'y'
  | 'r'
  | 'q';

/**
 * Optain the ten's exponent associated with the given prefix.
 * @param prefix Prefix to find exponent for.
 * @returns The ten's exponent associated with the prefix.
 */
export function metricExponent(prefix: MetricPrefix): number {
  switch (prefix) {
    case 'Q':
      return 30;
    case 'R':
      return 27;
    case 'Y':
      return 24;
    case 'Z':
      return 21;
    case 'E':
      return 18;
    case 'P':
      return 15;
    case 'T':
      return 12;
    case 'G':
      return 9;
    case 'M':
      return 6;
    case 'k':
      return 3;
    case 'h':
      return 2;
    case 'da':
      return 1;
    case '':
      return 0;
    case 'd':
      return -1;
    case 'c':
      return -2;
    case 'm':
      return -3;
    case '\u00B5':
      return -6;
    case 'n':
      return -9;
    case 'p':
      return -12;
    case 'f':
      return -15;
    case 'a':
      return -18;
    case 'z':
      return -21;
    case 'y':
      return -24;
    case 'r':
      return -27;
    case 'q':
      return -30;
    default:
      throw new Error(`Unrecognized prefix ${prefix}`);
  }
}

/**
 * Break a cents offset into lifts, ups, steps and real cents in that order of preference.
 * @param total Total cents offset.
 * @param up Value of the 'up' inflection in cents.
 * @param lift Value of the 'lift' inflection in cents.
 * @returns The prefix and postfix for recreating the cents offset according to the given context.
 */
export function countUpsAndLifts(total: number, up: number, lift: number) {
  let lifts: number;
  let ups: number;
  if (up <= 0 || lift <= 0) {
    lifts = 0;
    ups = 0;
  } else if (lift > up) {
    lifts = Math.round(total / lift);
    total -= lifts * lift;
    ups = Math.round(total / up);
    total -= ups * up;
  } else {
    ups = Math.round(total / up);
    total -= ups * up;
    lifts = Math.round(total / lift);
    total -= lifts * lift;
  }
  let prefix: string;
  if (lifts >= 0) {
    prefix = '/'.repeat(lifts);
  } else {
    prefix = '\\'.repeat(-lifts);
  }
  if (ups >= 0) {
    prefix += '^'.repeat(ups);
  } else {
    prefix += 'v'.repeat(-ups);
  }

  const steps = Math.round(total);
  total -= steps;
  let postfix = '';
  if (steps) {
    postfix += ` ${steps > 0 ? '+' : '-'} ${Math.abs(steps)}\\`;
  }
  if (total) {
    postfix += ` ${total > 0 ? '+' : '-'} ${Math.abs(total)}!c`;
  }
  return {
    prefix,
    postfix,
  };
}

const ABSURD_INT = BigInt('1' + '0'.repeat(1000));

/**
 * Validate that a BigInt isn't absurdly big.
 * @param n Integer to validate.
 * @throws 'Integer overflow.' if the integer has over 1000 digits.
 */
export function validateBigInt(n: bigint) {
  if (n > ABSURD_INT || -n > ABSURD_INT) {
    throw new Error('Integer overflow.');
  }
}

function setUnionPolyfill<T>(a: Set<T>, b: Set<T>) {
  const result = new Set<T>();
  for (const value of a) {
    result.add(value);
  }
  for (const value of b) {
    result.add(value);
  }
  return result;
}

function setUnionNative<T>(a: Set<T>, b: Set<T>): Set<T> {
  return (a as any).union(b);
}

export const setUnion =
  'union' in Set.prototype ? setUnionNative : setUnionPolyfill;
