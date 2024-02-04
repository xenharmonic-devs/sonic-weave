import {Fraction, PRIMES, primeLimit} from 'xen-dev-utils';
import {TimeMonzo, getNumberOfComponents} from './monzo';
import {PlusMinusVal, WartsLiteral} from './expression';

const ZERO = new Fraction(0);

function wartToBasis(wart: string, nonPrimes: Fraction[]) {
  if (!wart) {
    return new Fraction(PRIMES[0]);
  }
  const index = wart.charCodeAt(0) - 97;
  if (index < 15) {
    return new Fraction(PRIMES[index]);
  }
  if (index > 15) {
    return new Fraction(nonPrimes[index - 16]);
  }
  return undefined;
}

export function parseSubgroup(basisStrings: string[]) {
  const subgroup: Fraction[] = [];

  if (basisStrings.length === 1) {
    const index = PRIMES.indexOf(parseInt(basisStrings[0], 10));
    if (index < 0) {
      throw new Error('Invalid prime limit');
    }
    for (const prime of PRIMES.slice(0, index + 1)) {
      subgroup.push(new Fraction(prime));
    }
  } else if (basisStrings.length) {
    for (const basisString of basisStrings) {
      subgroup.push(new Fraction(basisString));
    }
  }

  const nonPrimes: Fraction[] = [];
  for (const basis of subgroup) {
    if (basis.d > 1 || !PRIMES.includes(basis.n)) {
      nonPrimes.push(basis);
    }
  }

  if (!subgroup.length) {
    for (let i = 0; i < getNumberOfComponents(); ++i) {
      subgroup.push(new Fraction(PRIMES[i]));
    }
  }

  return [subgroup, nonPrimes];
}

export function inferEquave(node: WartsLiteral) {
  const nonPrimes = parseSubgroup(node.basis)[1];

  return wartToBasis(node.equave, nonPrimes);
}

function patentVal(divisions: number, subgroup: Fraction[]) {
  const scale = divisions / Math.log(subgroup[0].valueOf());
  const scaledLogs = subgroup.map(f => scale * Math.log(f.valueOf()));
  return scaledLogs.map(Math.round);
}

function valToTimeMonzo(val: number[], subgroup: Fraction[]) {
  let numberOfComponents = 0;
  for (const basis of subgroup) {
    numberOfComponents = Math.max(primeLimit(basis, true), numberOfComponents);
  }

  let result = new TimeMonzo(
    ZERO,
    Array(numberOfComponents).fill(new Fraction(0))
  );
  for (let i = 0; i < subgroup.length; ++i) {
    const basis = TimeMonzo.fromFraction(
      subgroup[i],
      numberOfComponents
    ).geometricInverse();
    result = result.mul(basis.pow(val[i]));
  }
  return result;
}

function shiftEquave(equaveFraction: Fraction, subgroup: Fraction[]) {
  for (let i = 0; i < subgroup.length; ++i) {
    if (subgroup[i].equals(equaveFraction)) {
      subgroup.unshift(subgroup.splice(i, 1)[0]);
      return;
    }
  }
  throw new Error('Equave outside subgroup.');
}

export function wartsToVal(node: WartsLiteral) {
  const [subgroup, nonPrimes] = parseSubgroup(node.basis);

  const equaveFraction = wartToBasis(node.equave, nonPrimes);

  if (equaveFraction) {
    shiftEquave(equaveFraction, subgroup);
  }

  const scale = node.divisions / Math.log(subgroup[0].valueOf());
  const scaledLogs = subgroup.map(f => scale * Math.log(f.valueOf()));
  const val = scaledLogs.map(Math.round);
  const modification = Array(subgroup.length).fill(0);

  for (const wart of node.warts) {
    const wartFraction = wartToBasis(wart, nonPrimes);
    if (!wartFraction) {
      continue;
    }
    for (let i = 0; i < subgroup.length; ++i) {
      if (subgroup[i].equals(wartFraction)) {
        modification[i]++;
      }
    }
  }
  for (let i = 0; i < subgroup.length; ++i) {
    let delta = Math.ceil(modification[i] * 0.5);
    if (modification[i] % 2 === 0) {
      delta = -delta;
    }
    if (scaledLogs[i] - val[i] > 0) {
      val[i] += delta;
    } else {
      val[i] -= delta;
    }
  }

  return valToTimeMonzo(val, subgroup);
}

export function plusMinusToVal(node: PlusMinusVal) {
  const subgroup = parseSubgroup(node.basis)[0];
  if (node.equave) {
    const equaveFraction = new Fraction(node.equave);
    shiftEquave(equaveFraction, subgroup);
  }
  const val = patentVal(node.divisions, subgroup);
  for (const tweak of node.tweaks) {
    const tweakFraction = new Fraction(tweak.rational);
    let found = false;
    for (let i = 0; i < subgroup.length; ++i) {
      if (subgroup[i].equals(tweakFraction)) {
        val[i] += tweak.tweak;
        found = true;
      }
    }
    if (!found) {
      throw new Error('Tweak outside subgroup.');
    }
  }
  return valToTimeMonzo(val, subgroup);
}
