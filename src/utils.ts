/** Utilities and constants used internally. */

import {Fraction, PRIMES} from 'xen-dev-utils';

export const NUM_INTERCHANGE_COMPONENTS = 9;

export function F(n: number, d?: number) {
  return Object.freeze(new Fraction(n, d));
}

export const ZERO = F(0);
export const ONE = F(1);
export const NEGATIVE_ONE = F(-1);
export const HALF = F(1, 2);

export const FRACTION_PRIMES: Fraction[] = [];
for (const prime of PRIMES) {
  FRACTION_PRIMES.push(F(prime));
}

export const TWO = FRACTION_PRIMES[0];
export const THREE = FRACTION_PRIMES[1];
export const FIVE = FRACTION_PRIMES[2];
export const SEVEN = FRACTION_PRIMES[3];
export const ELEVEN = FRACTION_PRIMES[4];

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
 * Obtain the ten's exponent associated with the given prefix.
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
      throw new Error(`Unrecognized prefix ${prefix}.`);
  }
}

/**
 * One of the binary prefixes listed here: https://en.wikipedia.org/wiki/Binary_prefix
 * Goes from kibi = 1024 to quebi = 1024^10.
 */
export type BinaryPrefix =
  | 'Ki'
  | 'Mi'
  | 'Gi'
  | 'Ti'
  | 'Pi'
  | 'Ei'
  | 'Zi'
  | 'Yi'
  | 'Ri'
  | 'Qi';

/**
 * Obtain the exponent of 1024 associated with the given prefix.
 * @param prefix Prefix to find exponent for.
 * @returns The exponent of 1024 associated with the prefix.
 */
export function binaryExponent(prefix: BinaryPrefix): number {
  switch (prefix) {
    case 'Ki':
      return 1;
    case 'Mi':
      return 2;
    case 'Gi':
      return 3;
    case 'Ti':
      return 4;
    case 'Pi':
      return 5;
    case 'Ei':
      return 6;
    case 'Zi':
      return 7;
    case 'Yi':
      return 8;
    case 'Ri':
      return 9;
    case 'Qi':
      return 10;
    default:
      throw new Error(`Unrecognized prefix ${prefix}.`);
  }
}

/**
 * Break a steps offset into lifts, ups and steps in that order of preference.
 * @param total Total steps offset.
 * @param up Value of the 'up' inflection in steps.
 * @param lift Value of the 'lift' inflection in steps.
 * @returns The prefix and postfix for recreating the steps offset according to the given context.
 */
export function countUpsAndLifts(total: number, up: number, lift: number) {
  let lifts: number;
  let ups: number;

  if (!Number.isInteger(total)) {
    throw new Error('Unable to notate fractional steps.');
  }

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

  const steps = total;
  let postfix = '';
  if (steps) {
    postfix += ` ${steps > 0 ? '+' : '-'} ${Math.abs(steps)}\\`;
  }
  return {
    ups,
    lifts,
    steps,
    prefix,
    postfix,
  };
}

const ABSURD_INT = BigInt('1' + '0'.repeat(1000));
// Absurdity bound for prime 2.
export const ABSURD_EXPONENT = 3322n;

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

/**
 * Polyfill for `Set.union()`.
 * @param a First set.
 * @param b Second set.
 * @returns New set that contains elements of both sets (without duplicates).
 */
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

/**
 * Wrapper around `Set.union()` because TypeScript or something.
 * @param a First set.
 * @param b Second set.
 * @returns New set that contains elements of both sets (without duplicates).
 */
function setUnionNative<T>(a: Set<T>, b: Set<T>): Set<T> {
  return (a as any).union(b);
}

export const setUnion =
  'union' in Set.prototype ? setUnionNative : setUnionPolyfill;

/**
 * Returns `true` if the specified object has the indicated property as its own property. If the property is inherited, or does not exist, the function returns `false`.
 * @param object The JavaScript object instance to test.
 * @param property The `String` name or `Symbol` of the property to test.
 * @returns `true` if the specified object has directly defined the specified property. Otherwise `false`
 */
export function hasOwn(object: Object, property: PropertyKey) {
  if ('hasOwn' in Object) {
    return (Object as any).hasOwn(object, property);
  }
  return Object.prototype.hasOwnProperty.call(object, property);
}
