/** Utilities and constants used internally. */

import {Fraction} from 'xen-dev-utils/fraction';
import {PRIMES} from 'xen-dev-utils/primes';

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
