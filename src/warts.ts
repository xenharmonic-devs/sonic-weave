import {BIG_INT_PRIMES, Fraction, PRIMES} from 'xen-dev-utils';
import {TimeMonzo, TimeReal, getNumberOfComponents} from './monzo';
import {
  BasisElement,
  BasisFraction,
  PatentTweak,
  SparseOffsetVal,
  ValBasisElement,
  WartBasisElement,
  WartsLiteral,
} from './expression';
import {NEGATIVE_ONE, ONE, ZERO} from './utils';
import {ValBasis} from './interval';

const TWO_MONZO = new TimeMonzo(ZERO, [ONE]);
const SECOND_MONZO = new TimeMonzo(ONE, []);
const HERTZ_MONZO = new TimeMonzo(NEGATIVE_ONE, []);
const REAL_CENT_MONZO = new TimeReal(0, 1.0005777895065548);
const INF_MONZO = new TimeReal(0, Infinity);

export const STEP_ELEMENT = Symbol();

function wartToBasisElement(
  wart: string,
  subgroup: TimeMonzo[],
  nonPrimes: TimeMonzo[]
) {
  if (!wart) {
    return subgroup[0];
  }
  const index = wart.charCodeAt(0) - 97;
  if (index < 15) {
    return TimeMonzo.fromFraction(PRIMES[index]);
  }
  if (index > 15) {
    return nonPrimes[index - 16];
  }
  return undefined;
}

function basisElementToWart(element: TimeMonzo, nonPrimes: TimeMonzo[]) {
  for (let i = 0; i < nonPrimes.length; ++i) {
    if (element.equals(nonPrimes[i])) {
      if (i > 9) {
        throw new Error('Out of non-prime letters.');
      }
      return String.fromCharCode(113 + i);
    }
  }
  const i = BIG_INT_PRIMES.indexOf(element.toBigInteger());
  if (i < 0 || i > 14) {
    throw new Error('Out of prime letters.');
  }
  return String.fromCharCode(97 + i);
}

export function parseSubgroup(basis: BasisElement[], targetSize?: number) {
  const subgroup: (TimeMonzo | TimeReal | typeof STEP_ELEMENT)[] = [];
  const nonPrimes: TimeMonzo[] = [];

  let low = 0;
  let span = false;

  function checkSpan() {
    if (span) {
      throw new Error('Can only span subgroups to primes.');
    }
    span = false;
  }

  for (const element of basis) {
    if (element === 's') {
      subgroup.push(SECOND_MONZO);
      checkSpan();
    } else if (element === 'Hz' || element === 'hz') {
      subgroup.push(HERTZ_MONZO);
      checkSpan();
    } else if (element === 'rc' || element === 'r¢') {
      subgroup.push(REAL_CENT_MONZO);
      checkSpan();
    } else if (element === 'inf') {
      subgroup.push(INF_MONZO);
    } else if (element === '1°' || element === 'deg') {
      subgroup.push(STEP_ELEMENT);
      checkSpan();
    } else if (element === '') {
      span = true;
    } else if (
      (element.denominator === null || element.denominator === 1) &&
      !element.radical
    ) {
      if (PRIMES.includes(element.numerator)) {
        const index = PRIMES.indexOf(element.numerator);
        if (span) {
          for (let i = low; i <= index; ++i) {
            const monzo = TimeMonzo.fromFraction(PRIMES[i]);
            subgroup.push(monzo);
          }
        } else {
          const monzo = TimeMonzo.fromFraction(element.numerator);
          subgroup.push(monzo);
        }
        low = index + 1;
        span = false;
      } else {
        const monzo = TimeMonzo.fromFraction(element.numerator);
        subgroup.push(monzo);
        nonPrimes.push(monzo);
        checkSpan();
      }
    } else {
      let monzo = TimeMonzo.fromFraction(
        new Fraction(element.numerator, element.denominator ?? undefined)
      );
      if (element.radical) {
        const sqrt = monzo.sqrt();
        if (sqrt instanceof TimeMonzo) {
          monzo = sqrt;
        } else {
          throw new Error('Not enough components for a radical subgroup.');
        }
      }
      subgroup.push(monzo);
      nonPrimes.push(monzo);
      checkSpan();
    }
  }
  if (span) {
    if (targetSize === undefined) {
      for (let i = low; i < getNumberOfComponents(); ++i) {
        const monzo = TimeMonzo.fromFraction(PRIMES[i]);
        subgroup.push(monzo);
      }
    } else {
      const numComponents = low - 1 + targetSize;
      while (subgroup.length < targetSize) {
        const monzo = TimeMonzo.fromFraction(PRIMES[low++], numComponents);
        subgroup.push(monzo);
      }
    }
  }

  return {
    subgroup,
    nonPrimes,
  };
}

export function parseValSubgroup(
  basis: ValBasisElement[],
  targetSize?: number
): {subgroup: TimeMonzo[]; nonPrimes: TimeMonzo[]} {
  return parseSubgroup(basis, targetSize) as {
    subgroup: TimeMonzo[];
    nonPrimes: TimeMonzo[];
  };
}

function patentVal(divisions: number, subgroup: TimeMonzo[]) {
  for (const element of subgroup) {
    if (element.timeExponent.n) {
      throw new Error(
        'Vals cannot be constructed from absolute basis elements.'
      );
    }
    if (element.residual.s !== 1) {
      throw new Error(
        'Vals cannot be constructed from non-positive basis elements.'
      );
    }
  }
  const scale = divisions / Math.log(subgroup[0].valueOf());
  const scaledLogs = subgroup.map(f => scale * Math.log(f.valueOf()));
  return scaledLogs.map(Math.round);
}

/**
 * Convert an array of components to a val in a subgroup of the given basis.
 * @param val Components of the val.
 * @param basis Basis of the val.
 */
export function valToTimeMonzo(val: (number | Fraction)[], basis: ValBasis) {
  // Build the cologarithmic vector adjusting dual basis weights as necessary.
  let result = new TimeMonzo(
    ZERO,
    Array(basis.value[0].numberOfComponents).fill(ZERO)
  );
  for (let i = 0; i < basis.value.length; ++i) {
    const missingWeight = ONE.sub(basis.value[i].dot(result));
    result = result.mul(
      basis.dual[i].pow(
        missingWeight.mul(val[i]).div(basis.value[i].dot(basis.dual[i]))
      )
    ) as TimeMonzo;
  }
  return result;
}

function shiftEquave(equave: TimeMonzo, subgroup: TimeMonzo[]) {
  for (let i = 0; i < subgroup.length; ++i) {
    if (subgroup[i].equals(equave)) {
      subgroup.unshift(subgroup.splice(i, 1)[0]);
      return;
    }
  }
  throw new Error('Equave outside subgroup.');
}

export function wartsToVal(node: WartsLiteral): [TimeMonzo, ValBasis] {
  const {subgroup, nonPrimes} = parseValSubgroup(node.basis);

  const equave = wartToBasisElement(node.equave, subgroup, nonPrimes);

  if (equave) {
    shiftEquave(equave, subgroup);
  }

  const scale = node.divisions / Math.log(subgroup[0].valueOf());
  const scaledLogs = subgroup.map(f => scale * Math.log(f.valueOf()));
  const val = scaledLogs.map(Math.round);
  const modification = Array(subgroup.length).fill(0);

  for (const wart of node.warts) {
    const wartMonzo = wartToBasisElement(wart, subgroup, nonPrimes);
    if (!wartMonzo) {
      continue;
    }
    for (let i = 0; i < subgroup.length; ++i) {
      if (subgroup[i].equals(wartMonzo)) {
        modification[i]++;
      }
    }
  }
  for (let i = 0; i < subgroup.length; ++i) {
    let delta = Math.ceil(modification[i] * 0.5);
    if (modification[i] % 2 === 0) {
      delta = -delta;
    }
    if (scaledLogs[i] - val[i] >= 0) {
      val[i] += delta;
    } else {
      val[i] -= delta;
    }
  }

  const basis = new ValBasis(subgroup);
  return [valToTimeMonzo(val, basis), basis];
}

export function sparseOffsetToVal(
  node: SparseOffsetVal
): [TimeMonzo, ValBasis] {
  const {subgroup} = parseValSubgroup(node.basis);
  let equave = TWO_MONZO;
  if (node.equave) {
    equave = TimeMonzo.fromFraction(
      new Fraction(node.equave.numerator, node.equave.denominator ?? 1)
    );
    if (node.equave.radical) {
      const splitEquave = equave.sqrt();
      if (splitEquave instanceof TimeReal) {
        throw new Error('Unable to split val equave.');
      }
      equave = splitEquave;
    }
    shiftEquave(equave, subgroup);
  }
  const val = patentVal(node.divisions, subgroup);
  for (const tweak of node.tweaks) {
    const tweakMonzo = TimeMonzo.fromFraction(
      new Fraction(tweak.element.numerator, tweak.element.denominator ?? 1)
    );
    let found = false;
    for (let i = 0; i < subgroup.length; ++i) {
      if (subgroup[i].equals(tweakMonzo)) {
        val[i] += tweak.tweak;
        found = true;
      }
    }
    if (!found) {
      throw new Error('Tweak outside subgroup.');
    }
  }
  const basis = new ValBasis(subgroup);
  return [valToTimeMonzo(val, basis), basis];
}

export function valToWarts(
  monzo: TimeMonzo,
  basis: WartBasisElement[]
): WartsLiteral {
  const {subgroup, nonPrimes} = parseValSubgroup(basis);
  const components = subgroup.map(m => m.dot(monzo).valueOf());
  const divisions = components[0].valueOf();
  if (!Number.isInteger(divisions)) {
    throw new Error('Fractional divisions cannot be formatted as warts.');
  }
  const warts: string[] = [];
  for (let i = 1; i < subgroup.length; ++i) {
    const log = subgroup[i].log(subgroup[0]).valueOf() * divisions;
    const patent = Math.round(log);
    const tweak = components[i] - patent;
    if (tweak) {
      const wart = basisElementToWart(subgroup[i], nonPrimes);
      let count = 2 * Math.abs(tweak);
      if (log >= patent) {
        if (tweak > 0) {
          count--;
        }
      } else if (tweak < 0) {
        count--;
      }
      for (let j = 0; j < count; ++j) {
        warts.push(wart);
      }
    }
  }
  return {
    type: 'WartsLiteral',
    equave: '',
    divisions: divisions,
    warts: warts,
    basis,
  };
}

export function valToSparseOffset(
  monzo: TimeMonzo,
  basis: WartBasisElement[]
): SparseOffsetVal {
  const {subgroup} = parseValSubgroup(basis);
  const components = subgroup.map(m => m.dot(monzo).valueOf());
  const divisions = components[0].valueOf();
  if (!Number.isInteger(divisions)) {
    throw new Error(
      'Fractional divisions cannot be formatted as Sparse Offset Vals.'
    );
  }
  const tweaks: PatentTweak[] = [];
  for (let i = 1; i < subgroup.length; ++i) {
    const log = subgroup[i].log(subgroup[0]).valueOf() * divisions;
    const patent = Math.round(log);
    const tweak = components[i] - patent;
    if (tweak) {
      let monzo = subgroup[i];
      let radical = false;
      if (!monzo.isFractional()) {
        radical = true;
        monzo = monzo.pow(2) as TimeMonzo;
      }
      const {s, n, d} = subgroup[i].toFraction();
      const element: BasisFraction = {
        radical,
        numerator: s * n,
        denominator: d === 1 ? null : d,
      };
      tweaks.push({
        element,
        tweak,
      });
    }
  }
  return {
    type: 'SparseOffsetVal',
    equave: '',
    divisions: divisions,
    tweaks: tweaks,
    basis,
  };
}
