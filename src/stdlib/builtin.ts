import {
  Fraction,
  kCombinations as xduKCombinations,
  isPrime as xduIsPrime,
  primes as xduPrimes,
  approximateRadical,
  LOG_PRIMES,
  norm,
  BIG_INT_PRIMES,
  fareySequence as xduFareySequence,
  fareyInterior as xduFareyInterior,
  hasMarginConstantStructure,
  primeLimit,
  dotPrecise,
  PRIMES,
  primeFactorize,
  nthPrime as xduNthPrime,
  primeRange as xduPrimeRange,
  inv as xduInv,
  fractionalInv,
  det as xduDet,
  fractionalDet,
  mmod,
  FractionalMonzo,
} from 'xen-dev-utils';
import {Color, Interval, Val, ValBasis} from '../interval';
import {
  TimeMonzo,
  TimeReal,
  getNumberOfComponents,
  setNumberOfComponents,
} from '../monzo';
import {type ExpressionVisitor} from '../parser';
import {MosOptions, mos, nthNominal} from 'moment-of-symmetry';
import {Expression, expressionToString} from '../ast';
import {
  BasisElement,
  FJSFlavor,
  MonzoLiteral,
  NedjiLiteral,
  RadicalLiteral,
  VectorComponent,
  formatAbsoluteFJS,
  fractionToVectorComponent,
  integerToVectorComponent,
} from '../expression';
import {TWO, ZERO} from '../utils';
import {stepString, stepSignature as wordsStepSignature} from '../words';
import {hasConstantStructure} from '../tools';
import {
  SonicWeaveFunction,
  SonicWeavePrimitive,
  SonicWeaveValue,
  binaryBroadcast,
  builtinNode,
  fromInteger,
  isArrayOrRecord,
  requireParameters,
  sonicTruth,
  unaryBroadcast,
  upcastBool,
} from './runtime';
import {
  simplify as pubSimplify,
  bleach as pubBleach,
  linear as pubLinear,
  logarithmic as pubLogarithmic,
  absolute as pubAbsolute,
  relative as pubRelative,
  tenneyHeight as pubTenney,
  wilsonHeight as pubWilson,
  track as pubTrack,
  sortInPlace as pubSortInPlace,
  repr as pubRepr,
  str as pubStr,
  centsColor as pubCentsColor,
  factorColor as pubFactorColor,
  compare,
} from './public';
import {scaleMonzos} from '../diamond-mos';
import {valToSparseOffset, valToWarts} from '../warts';
const {version: VERSION} = require('../../package.json');

// === Library ===

const PARENT_SCALE: Record<string, Expression> = {
  // Only one of these ends up being used.
  scale: {
    type: 'Identifier',
    id: '$$',
  },
  array: {
    type: 'Identifier',
    id: '$$',
  },
};

// == Constants
const E = new Interval(TimeReal.fromValue(Math.E), 'linear');
const LN10 = new Interval(TimeReal.fromValue(Math.LN10), 'linear');
const LN2 = new Interval(TimeReal.fromValue(Math.LN2), 'linear');
const LOG10E = new Interval(TimeReal.fromValue(Math.LOG10E), 'linear');
const LOG2E = new Interval(TimeReal.fromValue(Math.LOG2E), 'linear');
const PI = new Interval(TimeReal.fromValue(Math.PI), 'linear');
const SQRT1_2 = new Interval(TimeMonzo.fromEqualTemperament('-1/2'), 'linear');
const SQRT2 = new Interval(TimeMonzo.fromEqualTemperament('1/2'), 'linear');
const TAU = new Interval(TimeReal.fromValue(2 * Math.PI), 'linear');

// == Real-valued Math wrappers ==
const MATH_WRAPPERS: Record<string, SonicWeaveFunction> = {};
const MATH_KEYS: (keyof Math)[] = [
  'acos',
  'asin',
  'atan',
  'clz32',
  'cos',
  'expm1',
  'fround',
  'imul',
  'log1p',
  'sin',
  'tan',
];
// There's no way to produce logarithmic quantities using logdivision.
// The log-associated functions get the same treatment as their stdlib counterparts.
const LOGS: (keyof Math)[] = ['acos', 'asin', 'atan', 'clz32', 'log1p'];

for (const name of MATH_KEYS) {
  const fn = Math[name] as (x: number) => number;
  // eslint-disable-next-line no-inner-declarations
  function wrapper(
    this: ExpressionVisitor,
    x: SonicWeaveValue
  ): SonicWeaveValue {
    requireParameters({x});
    if (typeof x === 'boolean' || x instanceof Interval) {
      x = upcastBool(x);
      return new Interval(
        TimeReal.fromValue(fn(x.valueOf())),
        LOGS.includes(name) ? 'linear' : x.domain,
        0,
        undefined,
        x
      );
    }
    const w = wrapper.bind(this);
    return unaryBroadcast.bind(this)(x, w);
  }
  Object.defineProperty(wrapper, 'name', {value: name, enumerable: false});
  wrapper.__doc__ = `Calculate ${String(name)} x.`;
  wrapper.__node__ = builtinNode(wrapper);
  MATH_WRAPPERS[name as string] = wrapper;
}

function atan2(
  this: ExpressionVisitor,
  y: SonicWeaveValue,
  x: SonicWeaveValue
): SonicWeaveValue {
  if (isArrayOrRecord(y) || isArrayOrRecord(x)) {
    return binaryBroadcast.bind(this)(y, x, atan2.bind(this));
  }
  y = upcastBool(y);
  x = upcastBool(x);
  return new Interval(
    TimeReal.fromValue(Math.atan2(y.valueOf(), x.valueOf())),
    'linear'
  );
}
atan2.__doc__ =
  'Calculate atan2(y, x) which is the angle between (1, 0) and (x, y), chosen to lie in (−π; π], positive anticlockwise.';
atan2.__node__ = builtinNode(atan2);

// Equivalent to atan2 but with swapped arguments.
// Rationale is that atanXY(x, y) = log(x + i * y), x and y now coordinates.
function atanXY(
  this: ExpressionVisitor,
  x: SonicWeaveValue,
  y: SonicWeaveValue
) {
  return atan2.bind(this)(y, x);
}
atanXY.__doc__ =
  'Calculate atanXY(x, y) = atan2(y, x) which is the angle between (1, 0) and (x, y), chosen to lie in (−π; π], positive anticlockwise.';
atanXY.__node__ = builtinNode(atanXY);

// == First-party wrappers ==
function numComponents(value?: SonicWeaveValue) {
  if (value === undefined) {
    return fromInteger(getNumberOfComponents());
  }
  setNumberOfComponents(upcastBool(value).toInteger());
  return;
}
numComponents.__doc__ =
  'Get/set the number of prime exponents to support in monzos. Also sets the length of vals.';
numComponents.__node__ = builtinNode(numComponents);

function stepSignature(word: string) {
  if (typeof word !== 'string') {
    throw new Error('A string is required.');
  }
  const result: Record<string, Interval> = {};
  for (const [letter, count] of Object.entries(wordsStepSignature(word))) {
    result[letter] = fromInteger(count);
  }
  return result;
}
stepSignature.__doc__ = 'Calculate the step signature of an entire scale word.';
stepSignature.__node__ = builtinNode(stepSignature);

function divisors(this: ExpressionVisitor, interval: SonicWeaveValue) {
  const result = upcastBool(interval).value.divisors();
  this.spendGas(result.length);
  return result.map(fromInteger);
}
divisors.__doc__ = 'Obtain an array of divisors of a natural number.';
divisors.__node__ = builtinNode(divisors);

function lll(
  this: ExpressionVisitor,
  basis: SonicWeaveValue,
  weighting: 'none' | 'tenney' = 'tenney'
) {
  if (!(basis instanceof ValBasis)) {
    throw new Error('A basis is required.');
  }
  return basis.lll(weighting);
}
lll.__doc__ = 'Perform Lensta-Lenstra-Lovász basis reduction.';
lll.__node__ = builtinNode(lll);

// == Third-party wrappers ==
function kCombinations(set: any[], k: SonicWeaveValue) {
  requireParameters({set});
  k = upcastBool(k);
  if (!Array.isArray(set)) {
    throw new Error('Set must be an array.');
  }
  return xduKCombinations(set, k.toInteger());
}
kCombinations.__doc__ = 'Obtain all k-sized combinations in a set';
kCombinations.__node__ = builtinNode(kCombinations);

function isPrime(this: ExpressionVisitor, n: SonicWeaveValue): SonicWeaveValue {
  requireParameters({n});
  if (typeof n === 'boolean' || n instanceof Interval) {
    return xduIsPrime(upcastBool(n).valueOf());
  }
  return unaryBroadcast.bind(this)(n, isPrime.bind(this));
}
isPrime.__doc__ = 'Return `true` if `n` is a prime number, `false` otherwise.';
isPrime.__node__ = builtinNode(isPrime);

function nthPrime(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    const n = upcastBool(interval).toInteger();
    if (n < 0) {
      throw new Error('A non-negative integer is required.');
    }
    this.spendGas(n / 3);
    return fromInteger(xduNthPrime(n));
  }
  return unaryBroadcast.bind(this)(interval, nthPrime.bind(this));
}
nthPrime.__doc__ = 'Obtain the nth odd prime or prime 2 if n = 0.';
nthPrime.__node__ = builtinNode(nthPrime);

function primes(
  this: ExpressionVisitor,
  start: SonicWeaveValue,
  end?: Interval
) {
  const s = upcastBool(start).valueOf();
  if (end) {
    const e = upcastBool(end).valueOf();
    // It only generates ~ N / log(N) primes, but it costs more computationally.
    this.spendGas(Math.max(0, e - s));
    return xduPrimes(s, e).map(p => fromInteger(p));
  }
  this.spendGas(Math.max(0, s));
  return xduPrimes(s).map(p => fromInteger(p));
}
primes.__doc__ =
  'Obtain an array of prime numbers such that start <= p <= end. Or p <= start if end is omitted.';
primes.__node__ = builtinNode(primes);

function primeRange(
  this: ExpressionVisitor,
  start: SonicWeaveValue,
  end?: Interval
) {
  const s = upcastBool(start).toInteger();
  if (end) {
    const e = upcastBool(end).toInteger();
    this.spendGas(Math.max(0, (e - s) / 3));
    return xduPrimeRange(s, e).map(p => fromInteger(p));
  }
  this.spendGas(Math.max(0, s / 3));
  return xduPrimeRange(s).map(p => fromInteger(p));
}
primeRange.__doc__ =
  'Obtain a range of primes starting at the given ordinal. Prime 2 has ordinal 0. (End - start) elements are returned.';
primeRange.__node__ = builtinNode(primeRange);

function mosSubset(
  this: ExpressionVisitor,
  numberOfLargeSteps: SonicWeaveValue,
  numberOfSmallSteps: SonicWeaveValue,
  sizeOfLargeStep?: Interval,
  sizeOfSmallStep?: Interval,
  up?: Interval,
  down?: Interval
) {
  const numL = upcastBool(numberOfLargeSteps).toInteger();
  const numS = upcastBool(numberOfSmallSteps).toInteger();
  this.spendGas(Math.abs(numL) + Math.abs(numS));
  const options: MosOptions = {};
  if (sizeOfLargeStep !== undefined) {
    options.sizeOfLargeStep = upcastBool(sizeOfLargeStep).toInteger();
  }
  if (sizeOfSmallStep !== undefined) {
    options.sizeOfSmallStep = upcastBool(sizeOfSmallStep).toInteger();
  }
  if (up !== undefined) {
    options.up = upcastBool(up).toInteger();
  }
  if (down !== undefined) {
    options.down = upcastBool(down).toInteger();
  }
  return mos(numL, numS, options).map(s => fromInteger(s));
}
mosSubset.__doc__ =
  'Calculate a subset of equally tempered degrees with maximum variety two per scale degree.';
mosSubset.__node__ = builtinNode(mosSubset);

function fareySequence(
  this: ExpressionVisitor,
  maxDenominator: SonicWeaveValue
) {
  const md = upcastBool(maxDenominator).toInteger();
  this.spendGas(md * md);
  const result: Interval[] = [];
  for (const fraction of xduFareySequence(md)) {
    const value = TimeMonzo.fromFraction(fraction);
    result.push(new Interval(value, 'linear', 0, value.asFractionLiteral()));
  }
  return result;
}
fareySequence.__doc__ =
  "Generate the n'th Farey sequence i.e. all fractions between 0 and 1 inclusive with denominator below or at the given limit.";
fareySequence.__node__ = builtinNode(fareySequence);

function fareyInterior(
  this: ExpressionVisitor,
  maxDenominator: SonicWeaveValue
) {
  const md = upcastBool(maxDenominator).toInteger();
  this.spendGas(md * md);
  const result: Interval[] = [];
  for (const fraction of xduFareyInterior(md)) {
    const value = TimeMonzo.fromFraction(fraction);
    result.push(new Interval(value, 'linear', 0, value.asFractionLiteral()));
  }
  return result;
}
fareyInterior.__doc__ =
  "Generate the interior of the n'th Farey sequence i.e. all fractions between 0 and 1 exclusive with denominator below or at the given limit.";
fareyInterior.__node__ = builtinNode(fareyInterior);

// == Domain conversion ==

function simplify(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (isArrayOrRecord(interval)) {
    return unaryBroadcast.bind(this)(interval, simplify.bind(this));
  }
  return pubSimplify(interval as any);
}
simplify.__doc__ =
  'Get rid of interval formatting. Simplifies a ratio to lowest terms.';
simplify.__node__ = builtinNode(simplify);

function bleach(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    return pubBleach(interval);
  }
  return unaryBroadcast.bind(this)(interval, bleach.bind(this));
}
bleach.__doc__ = 'Get rid of interval coloring and label.';
bleach.__node__ = builtinNode(bleach);

function linear(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    return pubLinear(interval);
  }
  return unaryBroadcast.bind(this)(interval, linear.bind(this));
}
linear.__doc__ =
  'Convert interval to linear representation. Formatting information of logarithmic quantities is lost.';
linear.__node__ = builtinNode(linear);

function logarithmic(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    return pubLogarithmic(interval);
  }
  return unaryBroadcast.bind(this)(interval, logarithmic.bind(this));
}
logarithmic.__doc__ =
  'Convert interval to logarithmic representation. Formatting information of linear quantities is lost.';
logarithmic.__node__ = builtinNode(logarithmic);

function absolute(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    return pubAbsolute.bind(this)(interval);
  }
  return unaryBroadcast.bind(this)(interval, absolute.bind(this));
}
absolute.__doc__ =
  'Convert interval to absolute representation. Normalized to a frequency.';
absolute.__node__ = builtinNode(absolute);

function relative(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    return pubRelative.bind(this)(interval);
  }
  return unaryBroadcast.bind(this)(interval, relative.bind(this));
}
relative.__doc__ = 'Convert interval to relative representation.';
relative.__node__ = builtinNode(relative);

// == Type conversion ==

// Coercion: Very lossy
function bool(this: ExpressionVisitor, value: SonicWeaveValue) {
  requireParameters({value});
  return sonicTruth(value);
}
bool.__doc__ = 'Convert value to a boolean.';
bool.__node__ = builtinNode(bool);

// Coercion: None.
function int(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'string') {
    // XXX: JS semantics make '12.3' pass through here.
    return fromInteger(parseInt(interval, 10));
  } else if (typeof interval === 'boolean' || interval instanceof Interval) {
    interval = pubRelative.bind(this)(upcastBool(interval));
    return Interval.fromInteger(interval.toInteger());
  }
  return unaryBroadcast.bind(this)(interval, int.bind(this));
}
int.__doc__ =
  'Convert value to an integer. Throws an error if conversion is impossible.';
int.__node__ = builtinNode(int);

// Coercion: Minimally lossy in terms of size
function decimal(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  fractionDigits?: Interval
): SonicWeaveValue {
  if (isArrayOrRecord(interval)) {
    const d = decimal.bind(this);
    return unaryBroadcast.bind(this)(interval, i => d(i, fractionDigits));
  }
  if (typeof interval === 'string') {
    interval = Interval.fromFraction(interval);
  }
  const converted = pubRelative.bind(this)(upcastBool(interval));
  if (fractionDigits !== undefined) {
    const denominator = 10 ** fractionDigits.toInteger();
    const numerator = Math.round(converted.value.valueOf() * denominator);
    converted.value = TimeMonzo.fromFraction(
      new Fraction(numerator, denominator)
    );
  }
  converted.node = converted.value.asDecimalLiteral();
  converted.domain = 'linear';
  return converted;
}
decimal.__doc__ = 'Convert interval to a decimal number.';
decimal.__node__ = builtinNode(decimal);

// Coercion: Only when epsilon given. Throw otherwise.
function fraction(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  tolerance?: Interval,
  preferredNumerator?: Interval,
  preferredDenominator?: Interval
): SonicWeaveValue {
  if (isArrayOrRecord(interval)) {
    const f = fraction.bind(this);
    return unaryBroadcast.bind(this)(interval, i =>
      f(i, tolerance, preferredNumerator, preferredDenominator)
    );
  }
  if (typeof interval === 'string') {
    interval = Interval.fromFraction(interval);
  }
  const numerator = preferredNumerator
    ? upcastBool(preferredNumerator).value.toBigInteger()
    : 0n;
  const denominator = preferredDenominator
    ? upcastBool(preferredDenominator).value.toBigInteger()
    : 0n;
  const converted = pubRelative.bind(this)(upcastBool(interval));
  let value: TimeMonzo;
  if (tolerance === undefined) {
    if (converted.value instanceof TimeReal) {
      throw new Error('Input is irrational and no tolerance given.');
    }
    value = converted.value.clone();
  } else {
    const frac = new Fraction(converted.value.valueOf()).simplifyRelative(
      upcastBool(tolerance).totalCents()
    );
    value = TimeMonzo.fromFraction(frac);
  }
  const node = value.asFractionLiteral();
  if (!node) {
    throw new Error('Failed to convert to fraction.');
  }
  if (numerator && node.numerator && numerator % node.numerator === 0n) {
    const factor = numerator / node.numerator;
    node.numerator = numerator;
    node.denominator *= factor;
  } else if (denominator && denominator % node.denominator === 0n) {
    const factor = denominator / node.denominator;
    node.numerator *= factor;
    node.denominator = denominator;
  }
  return new Interval(value, 'linear', 0, node, converted);
}
fraction.__doc__ =
  'Convert interval to a fraction. Throws an error if conversion is impossible and no tolerance (in cents) for approximation is given.';
fraction.__node__ = builtinNode(fraction);

// Coercion: Only when maxIndex and maxHeight are given. Throw otherwise.
function radical(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  maxIndex?: Interval,
  maxHeight?: Interval
): SonicWeaveValue {
  if (isArrayOrRecord(interval)) {
    const r = radical.bind(this);
    return unaryBroadcast.bind(this)(interval, i => r(i, maxIndex, maxHeight));
  }
  if (typeof interval === 'string') {
    // XXX: Technically missing radical literal parsing.
    interval = Interval.fromFraction(interval);
  }
  const converted = pubRelative.bind(this)(upcastBool(interval));
  const maxIdx = maxIndex ? upcastBool(maxIndex).toInteger() : undefined;
  if (converted.value.isEqualTemperament()) {
    const node = converted.value.asRadicalLiteral();
    if (maxIdx === undefined) {
      if (node) {
        return new Interval(
          converted.value.clone(),
          'linear',
          0,
          node,
          converted
        );
      }
      throw new Error('Failed to convert to a radical.');
    } else if (node && node.exponent.d <= maxIdx) {
      return new Interval(
        converted.value.clone(),
        'linear',
        0,
        node,
        converted
      );
    }
  } else if (maxIdx === undefined) {
    throw new Error(
      'Input is not equally tempered and no maximum index given.'
    );
  }
  const maxH = maxHeight ? upcastBool(maxHeight).toInteger() : 50000;
  const {index, radicand} = approximateRadical(
    converted.value.valueOf(),
    maxIdx,
    maxH
  );
  const value = TimeMonzo.fromFraction(radicand).pow(
    new Fraction(index).inverse()
  );
  const node = value.asRadicalLiteral();
  if (node) {
    return new Interval(value, 'linear', 0, node, converted);
  } else {
    const frac = approximateRadical(
      converted.value.valueOf(),
      1,
      maxH
    ).radicand;
    const rational = TimeMonzo.fromFraction(frac);
    return new Interval(
      rational,
      'linear',
      0,
      rational.asFractionLiteral(),
      converted
    );
  }
}
radical.__doc__ =
  'Convert interval to a radical expression. Throws an error if conversion is impossible and no maximum index (2 means square root, 3 means cube root, etc.) for approximation is given.';
radical.__node__ = builtinNode(radical);

// Coercion: None.
/**
 * Convert interval to N-steps-of-Equally-Divided-interval-of-Just-Intonation.
 * @param this {@link ExpressionVisitor} instance providing the context for unison frequency.
 * @param interval Interval to convert.
 * @param preferredNumerator Preferred number of steps.
 * @param preferredDenominator Preferred number of steps per equave.
 * @param preferredEquaveNumerator Prefferred numerator of the equave.
 * @param preferredEquaveDenominator Prefferred denominator of the equave.
 * @returns The interval converted to relative NEDJI in the logarithmic domain.
 */
function nedji(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  preferredNumerator?: Interval,
  preferredDenominator?: Interval,
  preferredEquaveNumerator?: Interval,
  preferredEquaveDenominator?: Interval
): SonicWeaveValue {
  if (isArrayOrRecord(interval)) {
    const n = nedji.bind(this);
    return unaryBroadcast.bind(this)(interval, i =>
      n(
        i,
        preferredEquaveNumerator,
        preferredDenominator,
        preferredEquaveNumerator,
        preferredEquaveDenominator
      )
    );
  }
  if (typeof interval === 'string') {
    let [fraction, equave] = interval.replace('ed', '<').split('<');
    if (equave.endsWith('>')) {
      equave = equave.slice(0, -1);
    }
    const monzo = TimeMonzo.fromEqualTemperament(
      fraction.replace('\\', '/'),
      equave
    );
    interval = new Interval(monzo, 'logarithmic');
  }
  const numerator = preferredNumerator
    ? upcastBool(preferredNumerator).toInteger()
    : 0;
  const denominator = preferredDenominator
    ? upcastBool(preferredDenominator).toInteger()
    : 0;
  const eNum = preferredEquaveNumerator
    ? upcastBool(preferredEquaveNumerator).toInteger()
    : 0;
  const eDenom = preferredEquaveDenominator
    ? upcastBool(preferredEquaveDenominator).toInteger()
    : 0;

  const rad = radical.bind(this)(interval) as Interval;
  if (rad.node?.type !== 'RadicalLiteral') {
    throw new Error('NEDJI conversion failed.');
  }
  const rn: RadicalLiteral = rad.node!;
  const node: NedjiLiteral = {
    type: 'NedjiLiteral',
    numerator: rn.exponent.n * rn.exponent.s,
    denominator: rn.exponent.d,
    equaveNumerator: rn.argument.n * rn.exponent.s,
    equaveDenominator: rn.argument.d,
  };
  if (numerator && node.numerator && numerator % node.numerator === 0) {
    const factor = numerator / node.numerator;
    node.numerator = numerator;
    node.denominator *= factor;
  } else if (denominator && denominator % node.denominator === 0) {
    const factor = denominator / node.denominator;
    node.numerator *= factor;
    node.denominator = denominator;
  }
  if (eNum && node.equaveNumerator && eNum % node.equaveNumerator === 0) {
    const factor = eNum / node.equaveNumerator;
    node.equaveNumerator = eNum;
    node.equaveDenominator! *= factor;
  } else if (eDenom && eDenom % node.equaveDenominator! === 0) {
    const factor = eDenom / node.equaveDenominator!;
    node.equaveNumerator! *= factor;
    node.equaveDenominator = eDenom;
  }
  if (!eNum && !eDenom && rn.argument.equals(TWO)) {
    node.equaveNumerator = null;
    node.equaveDenominator = null;
  }
  return new Interval(rad.value, 'logarithmic', 0, node, rad);
}
nedji.__doc__ =
  'Convert interval to N-steps-of-Equally-Divided-interval-of-Just-Intonation.';
nedji.__node__ = builtinNode(nedji);

// Coercion: Minimally lossy in terms of size
/**
 * Convert interval to cents i.e. centisemitones of 12-tone equal temperament.
 * @param this {@link ExpressionVisitor} instance providing the context for unison frequency.
 * @param interval Interval to convert.
 * @param fractionDigits Number of decimal digits in the cents representation. May produce non-algebraic (real) results if not given.
 * @returns The interval converted to relative cents in the logarithmic domain.
 */
function cents(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  fractionDigits?: Interval
): SonicWeaveValue {
  if (isArrayOrRecord(interval)) {
    const c = cents.bind(this);
    return unaryBroadcast.bind(this)(interval, i => c(i, fractionDigits));
  }
  if (typeof interval === 'string') {
    const monzo = TimeMonzo.fromFractionalCents(interval);
    interval = new Interval(monzo, 'logarithmic');
  }
  const converted = pubRelative.bind(this)(upcastBool(interval));
  if (fractionDigits !== undefined) {
    const denominator = 10 ** fractionDigits.toInteger();
    const numerator = Math.round(converted.totalCents() * denominator);
    converted.value = new TimeMonzo(ZERO, [
      new Fraction(numerator, denominator * 1200),
    ]);
  }
  const node = converted.value.asCentsLiteral();
  if (node) {
    converted.node = node;
    converted.domain = 'logarithmic';
    return converted;
  }
  // Convert to real cents
  const value = TimeReal.fromCents(converted.totalCents());
  return new Interval(value, 'logarithmic', 0, value.asCentsLiteral());
}
cents.__doc__ =
  'Convert interval to cents. `fractionDigits` represents the number of decimal digits in the cents representation. May produce non-algebraic (real) results if number of digits is not given. String arguments are interpreted as denoting cent quantities, not linear fractions.';
cents.__node__ = builtinNode(cents);

function validateFlavor(flavor: string): FJSFlavor {
  if (flavor === 'l' || flavor === 's') {
    throw new Error(`Conversion not implemented for FJS flavor '${flavor}'.`);
  }
  if (
    flavor !== '' &&
    flavor !== 'c' &&
    flavor !== 'f' &&
    flavor !== 'h' &&
    flavor !== 'm' &&
    flavor !== 'n' &&
    flavor !== 'q' &&
    flavor !== 't'
  ) {
    throw new Error(`Unrecognized FJS flavor '${flavor}`);
  }
  return flavor;
}

// Coercion: None.
function absoluteFJS(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  flavor = ''
): SonicWeaveValue {
  if (!this.rootContext) {
    throw new Error('Root context required for absolute FJS.');
  }
  if (isArrayOrRecord(interval)) {
    const a = absoluteFJS.bind(this);
    return unaryBroadcast.bind(this)(interval, i => a(i, flavor));
  }
  if (typeof interval === 'string') {
    throw new Error('String parsing of absolute FJS not implemented yet.');
  }
  interval = upcastBool(interval);
  const C4 = this.rootContext.C4;
  let monzo: TimeMonzo | TimeReal;
  if (C4.timeExponent.n === 0) {
    monzo = pubRelative.bind(this)(interval).value;
  } else {
    monzo = pubAbsolute.bind(this)(interval).value;
  }
  const result = new Interval(monzo, 'logarithmic', interval.steps, {
    type: 'AspiringAbsoluteFJS',
    flavor: validateFlavor(flavor),
  });
  const node = result.realizeNode(this.rootContext);
  if (node) {
    result.node = node;
    this.rootContext.fragiles.push(result);
    return result;
  }
  throw new Error(
    `Conversion failed. Try absoluteFJS(fraction(x, 1e-4), '${flavor}') to approximate.`
  );
}
absoluteFJS.__doc__ = 'Convert interval to absolute FJS.';
absoluteFJS.__node__ = builtinNode(absoluteFJS);

// Coercion: None.
function FJS(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  flavor = ''
): SonicWeaveValue {
  if (!this.rootContext) {
    throw new Error('Root context required for FJS.');
  }
  if (isArrayOrRecord(interval)) {
    const f = FJS.bind(this);
    return unaryBroadcast.bind(this)(interval, i => f(i, flavor));
  }
  if (typeof interval === 'string') {
    throw new Error('String parsing of FJS not implemented yet.');
  }
  interval = upcastBool(interval);
  const monzo = pubRelative.bind(this)(interval).value;
  const result = new Interval(monzo, 'logarithmic', interval.steps, {
    type: 'AspiringFJS',
    flavor: validateFlavor(flavor),
  });
  const node = result.realizeNode(this.rootContext);
  if (node) {
    result.node = node;
    return result;
  }
  throw new Error(
    `Conversion failed. Try FJS(fraction(x, 1e-4), '${flavor}') to approximate.`
  );
}
FJS.__doc__ = 'Convert interval to (relative) FJS.';
FJS.__node__ = builtinNode(FJS);

// Coercion: None.
function labelAbsoluteFJS(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  flavor = ''
): SonicWeaveValue {
  if (!this.rootContext) {
    throw new Error('Root context required for FJS.');
  }
  if (isArrayOrRecord(interval)) {
    const l = labelAbsoluteFJS.bind(this);
    return unaryBroadcast.bind(this)(interval, i => l(i, flavor));
  }
  interval = upcastBool(interval);
  if (
    !interval.node ||
    (interval.node.type !== 'AbsoluteFJS' &&
      interval.node.type !== 'AspiringAbsoluteFJS')
  ) {
    interval = absoluteFJS.bind(this)(interval, flavor) as Interval;
  } else {
    interval = interval.shallowClone();
  }
  if (interval.node && interval.node.type === 'AspiringAbsoluteFJS') {
    interval.node = interval.realizeNode(this.rootContext);
  }
  if (!interval.node || interval.node.type !== 'AbsoluteFJS') {
    interval.label = '?';
    interval.color = new Color('gray');
    return interval;
  }
  interval.label = formatAbsoluteFJS(interval.node, false);
  interval.color = new Color('white');
  for (const accidental of interval.node.pitch.accidentals) {
    if (accidental.accidental === '♮' || accidental.accidental === '_') {
      continue;
    }
    interval.color = new Color('black');
    break;
  }
  return interval;
}
labelAbsoluteFJS.__doc__ =
  'Convert interval to absolute FJS and label without octaves. Color black if there are accidentals, white otherwise.';
labelAbsoluteFJS.__node__ = builtinNode(labelAbsoluteFJS);

// Coercion: None.
function toMonzo(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  if (isArrayOrRecord(interval)) {
    const m = toMonzo.bind(this);
    return unaryBroadcast.bind(this)(interval, m);
  }
  if (typeof interval === 'string') {
    throw new Error('String parsing of monzos not implemented yet.');
  }
  interval = upcastBool(interval);
  if (interval.node?.type === 'MonzoLiteral') {
    return interval.shallowClone();
  }
  return new Interval(
    interval.value,
    'logarithmic',
    interval.steps,
    interval.asMonzoLiteral(),
    interval
  );
}
Object.defineProperty(toMonzo, 'name', {value: 'monzo', enumerable: false});
toMonzo.__doc__ = 'Convert interval to a prime count vector a.k.a. monzo.';
toMonzo.__node__ = builtinNode(toMonzo);

// Coercion: None.
function primeMonzo(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    interval = upcastBool(interval);
    if (interval.steps) {
      throw new Error('Edosteps cannot be converted to prime monzos.');
    }
    const monzo = interval.value;
    if (monzo instanceof TimeReal) {
      throw new Error(
        'Irrational intervals cannot be converted to prime monzos.'
      );
    }
    if (!monzo.isScalar()) {
      throw new Error('A relative interval is required.');
    }
    if (monzo.residual.s !== 1) {
      throw new Error('A positive interval is required.');
    }
    const components: VectorComponent[] = [];
    const basis: BasisElement[] = [];
    const pe = monzo.primeExponents;
    const denominator = null;
    for (let i = 0; i < pe.length; ++i) {
      if (pe[i].n) {
        components.push(fractionToVectorComponent(pe[i]));
        basis.push({numerator: PRIMES[i], denominator, radical: false});
      }
    }
    const factors = primeFactorize(monzo.residual);
    const primes = Array.from(factors.keys()).sort((a, b) => a - b);
    for (const numerator of primes) {
      components.push(integerToVectorComponent(factors.get(numerator)!));
      basis.push({numerator, denominator, radical: false});
    }
    const node: MonzoLiteral = {
      type: 'MonzoLiteral',
      components,
      basis,
      ups: 0,
      lifts: 0,
    };
    return new Interval(monzo, 'logarithmic', 0, node, interval);
  }
  return unaryBroadcast.bind(this)(interval, primeMonzo.bind(this));
}
primeMonzo.__doc__ =
  'Convert interval to a prime count vector a.k.a. monzo with all primes listed in the subgroup part.';
primeMonzo.__node__ = builtinNode(primeMonzo);

// == Type detection ==
function isInterval(value: SonicWeaveValue) {
  requireParameters({value});
  return value instanceof Interval;
}
isInterval.__doc__ = 'Return `true` if the value is an interval.';
isInterval.__node__ = builtinNode(isInterval);

function isColor(value: SonicWeaveValue) {
  requireParameters({value});
  return value instanceof Color;
}
isColor.__doc__ = 'Return `true` if the value is a color.';
isColor.__node__ = builtinNode(isColor);

function isString(value: SonicWeaveValue) {
  requireParameters({value});
  return typeof value === 'string';
}
isString.__doc__ = 'Return `true` if the value is a string.';
isString.__node__ = builtinNode(isString);

function isBoolean(value: SonicWeaveValue) {
  requireParameters({value});
  return typeof value === 'boolean';
}
isBoolean.__doc__ = 'Return `true` if the value is a boolean.';
isBoolean.__node__ = builtinNode(isBoolean);

function isFunction(value: SonicWeaveValue) {
  requireParameters({value});
  return typeof value === 'function';
}
isFunction.__doc__ =
  'Return `true` if the value is a riff or an arrow function.';
isFunction.__node__ = builtinNode(isFunction);

function isArray(value: SonicWeaveValue) {
  requireParameters({value});
  return Array.isArray(value);
}
isArray.__doc__ = 'Return `true` if the value is an array.';
isArray.__node__ = builtinNode(isArray);

function isAbsolute(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (isArrayOrRecord(interval)) {
    return unaryBroadcast.bind(this)(interval, isAbsolute.bind(this));
  }
  if (interval instanceof Interval) {
    return interval.isAbsolute();
  }
  return false;
}
isAbsolute.__doc__ =
  'Return `true` if the interval belongs to the absolute echelon.';
isAbsolute.__node__ = builtinNode(isAbsolute);

function isRelative(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (isArrayOrRecord(interval)) {
    return unaryBroadcast.bind(this)(interval, isRelative.bind(this));
  }
  if (typeof interval === 'boolean') {
    return true;
  }
  if (interval instanceof Interval) {
    return interval.isRelative();
  }
  return false;
}
isRelative.__doc__ =
  'Return `true` if the interval belongs to the relative echelon.';
isRelative.__node__ = builtinNode(isRelative);

function isLinear(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (isArrayOrRecord(interval)) {
    return unaryBroadcast.bind(this)(interval, isLinear.bind(this));
  }
  if (typeof interval === 'boolean') {
    return true;
  }
  if (interval instanceof Interval) {
    return interval.domain === 'linear';
  }
  return false;
}
isLinear.__doc__ =
  'Return `true` if the interval belongs to the linear domain.';
isLinear.__node__ = builtinNode(isLinear);

function isLogarithmic(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (isArrayOrRecord(interval)) {
    return unaryBroadcast.bind(this)(interval, isLogarithmic.bind(this));
  }
  if (interval instanceof Interval) {
    return interval.domain === 'logarithmic';
  }
  return false;
}
isLogarithmic.__doc__ =
  'Return `true` if the interval belongs to the logarithmic domain.';
isLogarithmic.__node__ = builtinNode(isLogarithmic);

// == Value detection ==

function isInt(interval: SonicWeaveValue) {
  requireParameters({interval});
  // Note that this is value detection. See isBoolean and isInterval.
  if (typeof interval === 'boolean') {
    return true;
  }
  if (interval instanceof Interval) {
    return interval.value.isIntegral();
  }
  return false;
}
isInt.__doc__ = 'Return `true` if the interval is an integer.';
isInt.__node__ = builtinNode(isInt);

function isRational(interval: SonicWeaveValue) {
  requireParameters({interval});
  if (interval instanceof Interval) {
    return interval.value.isFractional();
  }
  return false;
}
isRational.__doc__ = 'Return `true` if the interval is a rational number.';
isRational.__node__ = builtinNode(isRational);

function isRadical(interval: SonicWeaveValue) {
  requireParameters({interval});
  if (interval instanceof Interval) {
    return interval.value instanceof TimeMonzo;
  }
  return false;
}
isRadical.__doc__ = 'Return `true` if the interval is an nth root.';
isRadical.__node__ = builtinNode(isRadical);

// == String methods ==

function charCodeAt(str: string, index: SonicWeaveValue) {
  if (typeof str !== 'string') {
    throw new Error('A string is required.');
  }
  if (index === undefined) {
    if (str) {
      return fromInteger(str.charCodeAt(0));
    }
    throw new Error('A non-empty string is required.');
  }
  let idx = upcastBool(index).toInteger();
  if (idx < 0) {
    idx += str.length;
  }
  if (idx < 0 || idx >= str.length) {
    throw new Error('Index out of range.');
  }
  return fromInteger(str.charCodeAt(idx));
}
charCodeAt.__doc__ =
  'Obtain an integer between 0 and 65535 representing the UTF-16 code unit at the given index.';
charCodeAt.__node__ = builtinNode(charCodeAt);

function codePointAt(str: string, index: SonicWeaveValue) {
  if (typeof str !== 'string') {
    throw new Error('A string is required.');
  }
  if (index === undefined) {
    if (str) {
      return fromInteger(str.codePointAt(0)!);
    }
    throw new Error('A non-empty string is required.');
  }
  let idx = upcastBool(index).toInteger();
  if (idx < 0) {
    idx += str.length;
  }
  if (idx < 0 || idx >= str.length) {
    throw new Error('Index out of range.');
  }
  return fromInteger(str.codePointAt(idx)!);
}
codePointAt.__doc__ =
  'Obtain a non-negative integer that is the Unicode code point value of the character starting at the given index. Note that the index is still based on UTF-16 code units, not Unicode code points.';
codePointAt.__node__ = builtinNode(codePointAt);

function fromCharCode(...indices: SonicWeaveValue[]) {
  return String.fromCharCode(...indices.map(i => upcastBool(i).toInteger()));
}
fromCharCode.__doc__ =
  'Obtain a string created from the specified sequence of UTF-16 code units.';
fromCharCode.__node__ = builtinNode(fromCharCode);

function fromCodePoint(...indices: SonicWeaveValue[]) {
  return String.fromCodePoint(...indices.map(i => upcastBool(i).toInteger()));
}
fromCodePoint.__doc__ =
  'Obtain a string created from the specified sequence of code points.';
fromCodePoint.__node__ = builtinNode(fromCodePoint);

// == Other ==

function track(this: ExpressionVisitor, interval: SonicWeaveValue) {
  return pubTrack.bind(this)(upcastBool(interval));
}
track.__doc__ = 'Attach a tracking ID to the interval.';
track.__node__ = builtinNode(track);

function trackingIds(interval: SonicWeaveValue) {
  requireParameters({interval});
  if (interval instanceof Interval) {
    return Array.from(interval.trackingIds).map(id => fromInteger(id));
  }
  return [];
}
trackingIds.__doc__ =
  'Obtain an array of the tracking IDs attached to the interval.';
trackingIds.__node__ = builtinNode(trackingIds);

function flatten(array: SonicWeaveValue, depth?: Interval) {
  requireParameters({array});
  if (Array.isArray(array)) {
    let d = Infinity;
    if (depth !== undefined) {
      d = depth.toInteger();
    }
    return array.flat(d);
  }
  return [array];
}
flatten.__doc__ =
  'Returns a new array with all sub-array elements concatenated into it recursively up to the specified depth (default `inf`).';
flatten.__node__ = builtinNode(flatten);

function clear(this: ExpressionVisitor, scale?: Interval[]) {
  // Remember that built-ins don't have full scope construction so this is the parent scale.
  scale ??= this.currentScale;
  scale.length = 0;
}
clear.__doc__ = 'Remove the contents of the current/given scale.';
clear.__node__ = builtinNode(clear, PARENT_SCALE);

function tail(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  index: Interval
): SonicWeaveValue {
  requireParameters({interval, index});
  if (interval instanceof Interval || typeof interval === 'boolean') {
    interval = upcastBool(interval);
    return new Interval(
      interval.value.tail(index.toInteger()),
      interval.domain,
      interval.steps,
      undefined,
      interval
    );
  }
  const t = tail.bind(this);
  return unaryBroadcast.bind(this)(interval, i => t(i, index));
}
tail.__doc__ =
  'Return the higher prime tail of an interval starting from the given index. Prime 2 has index 0.';
tail.__node__ = builtinNode(tail);

function colorOf(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (isArrayOrRecord(interval)) {
    const c = colorOf.bind(this);
    return unaryBroadcast.bind(this)(interval, c);
  }
  if (interval instanceof Interval) {
    return interval.color;
  }
  return undefined;
}
colorOf.__doc__ = 'Return the color of the interval.';
colorOf.__node__ = builtinNode(colorOf);

function labelOf(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (isArrayOrRecord(interval)) {
    const l = labelOf.bind(this);
    return unaryBroadcast.bind(this)(interval, l);
  }
  if (interval instanceof Interval) {
    return interval.label;
  }
  return '';
}
labelOf.__doc__ = 'Return the label of the interval.';
labelOf.__node__ = builtinNode(labelOf);

function complexityOf(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  countZeros = false
): SonicWeaveValue {
  if (isArrayOrRecord(interval)) {
    const c = complexityOf.bind(this);
    return unaryBroadcast.bind(this)(interval, i => c(i, countZeros));
  }
  let pe: Fraction[];
  if (interval instanceof Val) {
    if (countZeros) {
      return fromInteger(interval.value.numberOfComponents);
    }
    if (!interval.value.residual.isUnity()) {
      throw new Error('Non-standard val encountered.');
    }
    pe = interval.value.primeExponents;
  } else {
    const monzo = upcastBool(interval).value;
    if (monzo instanceof TimeReal) {
      return new Interval(new TimeReal(0, Infinity), 'linear');
    }
    if (!monzo.residual.isUnity()) {
      const result = primeLimit(monzo.residual, true);
      if (Number.isInteger(result)) {
        return fromInteger(result);
      }
      return new Interval(new TimeReal(0, result), 'linear');
    }
    if (countZeros) {
      return fromInteger(monzo.numberOfComponents);
    }
    pe = monzo.primeExponents;
  }
  for (let i = pe.length - 1; i >= 0; --i) {
    if (pe[i].n) {
      return fromInteger(i + 1);
    }
  }
  return fromInteger(0);
}
complexityOf.__doc__ =
  'Compute the prime limit ordinal of an interval or val. 1/1 has a complexity of 0, 2/1 has complexity 1, 3/1 has complexity 2, 5/1 has complexity 3, etc.. If `countZeros` is true, measure the complexity of the internal representation instead.';
complexityOf.__node__ = builtinNode(complexityOf);

function basisOf(
  this: ExpressionVisitor,
  val: SonicWeaveValue
): SonicWeaveValue {
  if (isArrayOrRecord(val)) {
    const e = basisOf.bind(this);
    return unaryBroadcast.bind(this)(val, e);
  }
  if (val instanceof Val) {
    return val.basis;
  }
  throw new Error('A val is required.');
}
basisOf.__doc__ = 'Return the basis of the val.';
basisOf.__node__ = builtinNode(basisOf);

function withBasis(
  this: ExpressionVisitor,
  val: SonicWeaveValue,
  basis: ValBasis
): SonicWeaveValue {
  requireParameters({val, basis});
  if (isArrayOrRecord(val)) {
    const w = withBasis.bind(this);
    return unaryBroadcast.bind(this)(val, v => w(v, basis));
  }
  if (val instanceof Val) {
    return new Val(val.value.clone(), basis);
  }
  throw new Error('A val is required.');
}
withBasis.__doc__ = 'Change the basis of the val.';
withBasis.__node__ = builtinNode(withBasis);

function cosJIP(
  this: ExpressionVisitor,
  val: SonicWeaveValue,
  weighting: 'none' | 'tenney' | 'wilson' = 'tenney'
): SonicWeaveValue {
  requireParameters({val});
  if (isArrayOrRecord(val)) {
    const c = cosJIP.bind(this);
    return unaryBroadcast.bind(this)(val, v => c(v, weighting));
  }
  if (!(val instanceof Val)) {
    throw new Error(
      'Only vals may be measured against the just intonation point.'
    );
  }
  const pe = val.value.primeExponents.map(e => e.valueOf());
  let value = 0;
  weighting = weighting.toLowerCase() as typeof weighting;
  if (weighting === 'tenney') {
    let n2 = 0;
    for (let i = 0; i < pe.length; ++i) {
      const e = pe[i] / LOG_PRIMES[i];
      value += e;
      n2 += e * e;
    }
    value /= Math.sqrt(n2 * pe.length);
  } else if (weighting === 'wilson') {
    pe.map((e, i) => e / PRIMES[i]);
    const jip = LOG_PRIMES.slice(0, pe.length).map((e, i) => e / PRIMES[i]);
    value = dotPrecise(jip, pe) / norm(pe) / norm(jip);
  } else {
    const peNorm = norm(pe);
    const jipNorm = norm(LOG_PRIMES.slice(0, pe.length));
    value = dotPrecise(LOG_PRIMES, pe) / peNorm / jipNorm;
  }
  return new Interval(TimeReal.fromValue(value), 'linear');
}
cosJIP.__doc__ =
  'Cosine of the angle between the val and the just intonation point. Weighting is either "none", "tenney" or "wilson".';
cosJIP.__node__ = builtinNode(cosJIP);

function JIP(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  if (isArrayOrRecord(interval)) {
    return unaryBroadcast.bind(this)(interval, JIP.bind(this));
  }
  interval = upcastBool(interval);
  const monzo = pubRelative.bind(this)(interval).value;
  if (monzo instanceof TimeReal) {
    return new Interval(monzo, 'logarithmic', 0, undefined, interval);
  }
  const value = TimeReal.fromCents(monzo.totalCents(true));
  if (monzo.residual.s < 0) {
    value.value = -value.value;
  }
  return new Interval(value, 'logarithmic', 0, undefined, interval);
}
JIP.__doc__ = 'The Just Intonation Point. Converts intervals to real cents.';
JIP.__node__ = builtinNode(JIP);

function real(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (interval === true) {
    return new Interval(TimeReal.fromValue(1), 'linear');
  } else if (interval === false) {
    return new Interval(TimeReal.fromValue(0), 'linear');
  } else if (interval instanceof Interval) {
    interval = pubRelative.bind(this)(interval);
    return new Interval(TimeReal.fromValue(interval.valueOf()), 'linear');
  }
  return unaryBroadcast.bind(this)(interval, real.bind(this));
}
real.__doc__ = 'Convert interval to a linear real value.';
real.__node__ = builtinNode(real);

function warts(this: ExpressionVisitor, val: SonicWeaveValue): SonicWeaveValue {
  requireParameters({val});
  if (val instanceof Val) {
    if (val.node?.type === 'WartsLiteral') {
      return val;
    }
    const basis = val.basis.toWartBasis();
    const node = valToWarts(val.value, basis);
    return new Val(val.value, val.basis, node);
  }
  return unaryBroadcast.bind(this)(val, warts.bind(this));
}
warts.__doc__ = 'Format a val using warts shorthand notation.';
warts.__node__ = builtinNode(warts);

function SOV(this: ExpressionVisitor, val: SonicWeaveValue): SonicWeaveValue {
  requireParameters({val});
  if (val instanceof Val) {
    if (val.node?.type === 'SparseOffsetVal') {
      return val;
    }
    const basis = val.basis.toWartBasis();
    const node = valToSparseOffset(val.value, basis);
    return new Val(val.value, val.basis, node);
  }
  return unaryBroadcast.bind(this)(val, SOV.bind(this));
}
SOV.__doc__ = 'Format a val using Sparse Offset Val notation.';
SOV.__node__ = builtinNode(SOV);

function PrimeMapping(
  this: ExpressionVisitor,
  ...newPrimes: (Interval | undefined)[]
) {
  const rel = pubRelative.bind(this);
  const np = newPrimes.map((p, i) =>
    p ? rel(p).value : TimeMonzo.fromBigInt(BIG_INT_PRIMES[i])
  );

  function mapper(
    this: ExpressionVisitor,
    interval: SonicWeaveValue
  ): SonicWeaveValue {
    if (isArrayOrRecord(interval)) {
      const m = mapper.bind(this);
      return unaryBroadcast.bind(this)(interval, m);
    }
    interval = upcastBool(interval);
    const monzo = pubRelative.bind(this)(interval).value;
    if (monzo instanceof TimeReal) {
      return new Interval(
        monzo,
        'logarithmic',
        0,
        monzo.asCentsLiteral(),
        interval
      );
    }
    monzo.numberOfComponents = np.length;
    let mapped: TimeMonzo | TimeReal = new TimeMonzo(ZERO, [], monzo.residual);
    while (mapped.primeExponents.length < np.length) {
      mapped.primeExponents.push(ZERO);
    }
    for (let i = 0; i < np.length; ++i) {
      mapped = mapped.mul(np[i].pow(monzo.primeExponents[i]));
    }
    let node = mapped.asCentsLiteral();
    if (!node) {
      mapped = TimeReal.fromCents(mapped.totalCents());
      node = mapped.asCentsLiteral();
    }
    return new Interval(mapped, 'logarithmic', 0, node, interval);
  }
  const r = repr.bind(this);
  Object.defineProperty(mapper, 'name', {
    value: `PrimeMapping${newPrimes.map(r).join(', ')}`,
    enumerable: false,
  });
  mapper.__doc__ = 'Prime re-mapper.';
  mapper.__node__ = builtinNode(mapper);
  return mapper;
}
PrimeMapping.__doc__ =
  'Construct a prime mapping for tempering intervals to specified cents. Remaining primes are left untempered.';
PrimeMapping.__node__ = builtinNode(PrimeMapping);

function tenneyHeight(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    return pubTenney.bind(this)(interval);
  }
  return unaryBroadcast.bind(this)(interval, tenneyHeight.bind(this));
}
tenneyHeight.__doc__ =
  'Calculate the Tenney height of the interval. Natural logarithm of numerator times denominator.';
tenneyHeight.__node__ = builtinNode(tenneyHeight);

function wilsonHeight(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    return pubWilson.bind(this)(interval);
  }
  return unaryBroadcast.bind(this)(interval, wilsonHeight.bind(this));
}
wilsonHeight.__doc__ =
  'Calculate the Wilson height of the interval. Sum of prime absolute factors with repetition..';
wilsonHeight.__node__ = builtinNode(wilsonHeight);

function _repspell(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  commas: TimeMonzo[]
): SonicWeaveValue {
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    const tenney = pubTenney.bind(this);
    let result = upcastBool(interval);
    let height = tenney(result);
    let improved = true;
    while (improved) {
      improved = false;
      for (const comma of commas) {
        const candidate = new Interval(result.value.mul(comma), result.domain);
        const candidateHeight = tenney(candidate);
        if (candidateHeight.compare(height) < 0) {
          improved = true;
          result = candidate;
          height = candidateHeight;
        }
      }
    }
    return result;
  }
  const r = _repspell.bind(this);
  return unaryBroadcast.bind(this)(interval, i => r(i, commas));
}

function respell(this: ExpressionVisitor, commaBasis: SonicWeaveValue) {
  if (commaBasis instanceof Interval) {
    commaBasis = [commaBasis];
  }
  if (Array.isArray(commaBasis)) {
    commaBasis = basis.bind(this)(...commaBasis);
  }
  if (!(commaBasis instanceof ValBasis)) {
    throw new Error('A basis is required.');
  }
  commaBasis = commaBasis.lll('tenney');
  const r = _repspell.bind(this);
  const commas = [...commaBasis.value];
  for (const comma of commaBasis.value) {
    commas.push(comma.inverse());
  }
  const mapper = (i: SonicWeaveValue) => r(i, commas);
  mapper.__doc__ = 'Respeller';
  mapper.__node__ = builtinNode(mapper);
  return mapper;
}
respell.__doc__ =
  'Respell i.e. simplify fractions in the the current scale treating intervals separated by the given commas as the same. (Creates a respelling function.)';
respell.__node__ = builtinNode(respell);

function gcd(
  this: ExpressionVisitor,
  x: SonicWeaveValue,
  y: SonicWeaveValue
): SonicWeaveValue {
  if (x === undefined && y === undefined) {
    let result: TimeMonzo | TimeReal = new TimeMonzo(ZERO, [], ZERO);
    for (const interval of this.currentScale) {
      result = result.gcd(interval.value);
    }
    return new Interval(result, 'linear');
  }
  if (isArrayOrRecord(x) || isArrayOrRecord(y)) {
    return binaryBroadcast.bind(this)(x, y, gcd.bind(this));
  }
  return new Interval(upcastBool(x).value.gcd(upcastBool(y).value), 'linear');
}
gcd.__doc__ =
  'Obtain the largest (linear) multiplicative factor shared the two arguments or by all intervals or the current scale if no arguments are given.';
gcd.__node__ = builtinNode(gcd);

function lcm(
  this: ExpressionVisitor,
  x: SonicWeaveValue,
  y: SonicWeaveValue
): SonicWeaveValue {
  if (x === undefined && y === undefined) {
    const intervals = this.currentScale;
    if (!intervals.length) {
      // Conventional empty LCM as there's no identity element.
      return fromInteger(0);
    }
    let result = intervals[0].value.clone();
    for (const interval of intervals.slice(1)) {
      result = result.lcm(interval.value);
    }
    return new Interval(result, 'linear');
  }
  if (isArrayOrRecord(x) || isArrayOrRecord(y)) {
    return binaryBroadcast.bind(this)(x, y, lcm.bind(this));
  }
  return new Interval(upcastBool(x).value.lcm(upcastBool(y).value), 'linear');
}
lcm.__doc__ =
  'Obtain the smallest (linear) interval that shares both arguments as multiplicative factors. Applies to the current scale if not arguments are given.';
lcm.__node__ = builtinNode(lcm);

function builtinCompare(
  this: ExpressionVisitor,
  x: SonicWeaveValue,
  y: SonicWeaveValue
): SonicWeaveValue {
  if (isArrayOrRecord(x) || isArrayOrRecord(y)) {
    return binaryBroadcast.bind(this)(x, y, builtinCompare.bind(this));
  }
  const c = compare.bind(this)(upcastBool(x), upcastBool(y));
  if (c < 0) {
    return fromInteger(-1);
  } else if (c > 0) {
    return fromInteger(1);
  }
  return fromInteger(0);
}
Object.defineProperty(builtinCompare, 'name', {
  value: 'compare',
  enumerable: false,
});
builtinCompare.__doc__ =
  'Compare two values. Result is -1 if x < y, +1 if x > y and 0 if the arguments are equal.';
builtinCompare.__node__ = builtinNode(builtinCompare);

function toPrimeArray(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  requireParameters({interval});
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    const monzo = upcastBool(interval).value;
    if (monzo instanceof TimeReal) {
      throw new Error('Unable to convert irrational value to vector.');
    }
    if (!monzo.residual.isUnity()) {
      throw new Error('Interval too complex to convert to vector.');
    }
    const pe = [...monzo.primeExponents];
    while (pe.length && !pe[pe.length - 1].n) {
      pe.pop();
    }
    return pe.map(e => Interval.fromFraction(e));
  } else if (interval instanceof Val) {
    return interval.value.primeExponents.map(pe => Interval.fromFraction(pe));
  }
  return unaryBroadcast.bind(this)(interval, toPrimeArray.bind(this));
}
toPrimeArray.__doc__ = 'Convert interval to an array of its prime counts.';
toPrimeArray.__node__ = builtinNode(toPrimeArray);

function monzoFromPrimeArray(
  this: ExpressionVisitor,
  primeExponents: Interval[]
) {
  if (!Array.isArray(primeExponents)) {
    throw new Error('An array is required.');
  }
  const value = new TimeMonzo(
    ZERO,
    primeExponents.map(i => upcastBool(i).toFraction())
  );
  return new Interval(value, 'logarithmic', 0, value.asMonzoLiteral());
}
monzoFromPrimeArray.__doc__ = 'Convert an array of prime counts to a monzo.';
monzoFromPrimeArray.__node__ = builtinNode(monzoFromPrimeArray);

function valFromPrimeArray(
  this: ExpressionVisitor,
  primeExponents: Interval[],
  basis?: ValBasis
) {
  if (!Array.isArray(primeExponents)) {
    throw new Error('An array is required.');
  }
  const value = new TimeMonzo(
    ZERO,
    primeExponents.map(i => upcastBool(i).toFraction())
  );
  if (basis === undefined) {
    basis = new ValBasis(primeExponents.length);
  }
  return new Val(value, basis);
}
valFromPrimeArray.__doc__ =
  'Convert an array of prime mapping entries to a val.';
valFromPrimeArray.__node__ = builtinNode(valFromPrimeArray);

function basis(this: ExpressionVisitor, ...intervals: SonicWeaveValue[]) {
  const subgroup: TimeMonzo[] = [];
  for (let interval of intervals) {
    interval = upcastBool(interval);
    if (interval.value instanceof TimeReal) {
      throw new Error('Can only create basis from radicals.');
    }
    subgroup.push(interval.value);
  }
  return new ValBasis(subgroup);
}
basis.__doc__ = 'Construct a subgroup basis from intervals.';
basis.__node__ = builtinNode(basis);

function basisToArray(this: ExpressionVisitor, basis: ValBasis) {
  return basis.value.map(monzo => new Interval(monzo, 'linear'));
}
basisToArray.__doc__ =
  'Convert a subgroup basis to an array of basis elements.';
basisToArray.__node__ = builtinNode(basisToArray);

function transpose(matrix: SonicWeaveValue[][]) {
  if (!Array.isArray(matrix)) {
    return matrix;
  }
  if (!Array.isArray(matrix[0])) {
    return [...matrix];
  }
  const width = matrix.reduce((w, row) => Math.max(w, row.length), 0);
  const result: SonicWeaveValue[][] = [];
  for (let i = 0; i < width; ++i) {
    const row: SonicWeaveValue[] = [];
    for (let j = 0; j < matrix.length; ++j) {
      row.push(matrix[j][i] ?? fromInteger(0));
    }
    result.push(row);
  }
  return result;
}
transpose.__doc__ = 'Transpose a matrix. For modal transposition see rotate().';
transpose.__node__ = builtinNode(transpose);

function collectMatrix(matrix: SonicWeaveValue[][]) {
  if (!Array.isArray(matrix) || !Array.isArray(matrix[0])) {
    throw new Error('Argument must be a matrix.');
  }
  let isFractional = true;
  const fracMat: FractionalMonzo[] = [];
  const mat: number[][] = [];
  for (const row of matrix) {
    const fr: FractionalMonzo = [];
    const r: number[] = [];
    for (const component of row) {
      const interval = upcastBool(component);
      if (!interval.isRelative()) {
        throw new Error(
          'Matrix methods are only implemented in the relative echelon.'
        );
      }
      try {
        fr.push(interval.toFraction());
      } catch {
        isFractional = false;
      }
      r.push(interval.valueOf());
    }
    fracMat.push(fr);
    mat.push(r);
  }
  return {
    isFractional,
    fracMat,
    mat,
  };
}

function inv(matrix: SonicWeaveValue[][]) {
  const {isFractional, fracMat, mat} = collectMatrix(matrix);
  if (isFractional) {
    try {
      const inverse = fractionalInv(fracMat);
      return inverse.map(row => row.map(f => Interval.fromFraction(f)));
    } catch {
      /** Fall through */
    }
  }
  const inverse = xduInv(mat);
  return inverse.map(row => row.map(c => Interval.fromValue(c)));
}
inv.__doc__ =
  'Compute the inverse of a matrix. Domain is ignored, all values coerced to linear.';
inv.__node__ = builtinNode(inv);

function det(matrix: SonicWeaveValue[][]) {
  const {isFractional, fracMat, mat} = collectMatrix(matrix);
  if (isFractional) {
    try {
      const determinant = fractionalDet(fracMat);
      return Interval.fromFraction(determinant);
    } catch {
      /** Fall through */
    }
  }
  const determinant = xduDet(mat);
  return Interval.fromValue(determinant);
}
det.__doc__ =
  'Compute the determinant of a matrix. Domain is ignored, all values coerced to linear.';
det.__node__ = builtinNode(det);

function hasConstantStructure_(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.currentScale;
  this.spendGas(scale.length * scale.length);
  const rel = pubRelative.bind(this);
  const monzos = scale.map(i => rel(i).value);
  for (const monzo of monzos) {
    if (monzo instanceof TimeReal) {
      // XXX: Margin CS is not realiable with zero margin, but whatever.
      return hasMarginConstantStructure(
        monzos.map(m => m.totalCents()),
        0
      );
    }
  }
  return hasConstantStructure(monzos as TimeMonzo[]);
}
Object.defineProperty(hasConstantStructure_, 'name', {
  value: 'hasConstantStructure',
  enumerable: false,
});
hasConstantStructure_.__doc__ =
  'Returns `true` if the current/given scale has constant structure (i.e. every scale degree is unambiguous).';
hasConstantStructure_.__node__ = builtinNode(
  hasConstantStructure_,
  PARENT_SCALE
);

function stepString_(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.currentScale;
  const rel = pubRelative.bind(this);
  const monzos = scale.map(i => rel(i).value);
  return stepString(monzos);
}
Object.defineProperty(stepString_, 'name', {
  value: 'stepString',
  enumerable: false,
});
stepString_.__doc__ =
  'Obtain the step string associated with the scale e.g. "LLsLLLs" for Ionian.';
stepString_.__node__ = builtinNode(stepString_, PARENT_SCALE);

function slice(
  array: string | SonicWeavePrimitive[],
  indexStart: Interval,
  indexEnd?: Interval
) {
  requireParameters({array, indexStart});
  return array.slice(
    indexStart.toInteger(),
    indexEnd === undefined ? undefined : indexEnd?.toInteger()
  );
}
slice.__doc__ =
  'Obtain a slice of a string or scale between the given indices.';
slice.__node__ = builtinNode(slice);

function zip(...args: any[][]) {
  const minLength = Math.min(...args.map(a => a.length));
  const result: any[][] = [];
  for (let i = 0; i < minLength; ++i) {
    result.push(args.map(a => a[i]));
  }
  return result;
}
zip.__doc__ =
  'Combine elements of each array into tuples until one of them is exhausted.';
zip.__node__ = builtinNode(zip);

function zipLongest(...args: any[][]) {
  const maxLength = Math.max(...args.map(a => a.length));
  const result: any[][] = [];
  for (let i = 0; i < maxLength; ++i) {
    result.push(args.map(a => a[i]));
  }
  return result;
}
zipLongest.__doc__ =
  'Combine elements of each array into tuples until all of them are exhausted. Pads missing values with `niente`.';
zipLongest.__node__ = builtinNode(zipLongest);

function random(...shape: Interval[]): Interval | Interval[] {
  if (shape.length === 0) {
    const value = TimeReal.fromValue(Math.random());
    return new Interval(value, 'linear');
  }
  const result: Interval[] = [];
  const dimension = shape.shift()!.toInteger();
  for (let i = 0; i < dimension; ++i) {
    result.push(random(...shape) as Interval);
  }
  return result;
}
random.__doc__ = 'Obtain a random value between (linear) 0 and 1.';
random.__node__ = builtinNode(random);

function randomCents(...shape: Interval[]): Interval | Interval[] {
  if (shape.length === 0) {
    const value = TimeReal.fromCents(Math.random());
    return new Interval(value, 'logarithmic');
  }
  const result: Interval[] = [];
  const dimension = shape.shift()!.toInteger();
  for (let i = 0; i < dimension; ++i) {
    result.push(randomCents(...shape) as Interval);
  }
  return result;
}
randomCents.__doc__ =
  'Obtain random cents between (logarithmic) 0.0c and 1.0c.';
randomCents.__node__ = builtinNode(randomCents);

function floor(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    interval = pubRelative.bind(this)(upcastBool(interval));
    const n = Math.floor(interval.value.valueOf());
    return Interval.fromInteger(n, interval);
  }
  return unaryBroadcast.bind(this)(interval, floor.bind(this));
}
floor.__doc__ = 'Round value down to the nearest integer.';
floor.__node__ = builtinNode(floor);

function round(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    interval = pubRelative.bind(this)(upcastBool(interval));
    const n = Math.round(interval.value.valueOf());
    return Interval.fromInteger(n, interval);
  }
  return unaryBroadcast.bind(this)(interval, round.bind(this));
}
round.__doc__ = 'Round value to the nearest integer.';
round.__node__ = builtinNode(round);

function trunc(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    interval = pubRelative.bind(this)(upcastBool(interval));
    const n = Math.trunc(interval.value.valueOf());
    return Interval.fromInteger(n, interval);
  }
  return unaryBroadcast.bind(this)(interval, trunc.bind(this));
}
trunc.__doc__ = 'Truncate value towards zero to the nearest integer.';
trunc.__node__ = builtinNode(trunc);

function ceil(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): SonicWeaveValue {
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    interval = pubRelative.bind(this)(upcastBool(interval));
    const n = Math.ceil(interval.value.valueOf());
    return Interval.fromInteger(n, interval);
  }
  return unaryBroadcast.bind(this)(interval, ceil.bind(this));
}
ceil.__doc__ = 'Round value up to the nearest integer.';
ceil.__node__ = builtinNode(ceil);

/**
 * Obtain the argument with the minimum value.'
 * @param this {@link ExpressionVisitor} instance providing context for comparing across echelons.
 * @param args Arguments to find the smallest of.
 * @returns Smallest argument.
 */
function minimum(
  this: ExpressionVisitor,
  ...args: SonicWeavePrimitive[]
): SonicWeavePrimitive {
  const c = compare.bind(this);
  return args.slice(1).reduce((a, b) => (c(a, b) <= 0 ? a : b), args[0]);
}
minimum.__doc__ = 'Obtain the argument with the minimum value.';
minimum.__node__ = builtinNode(minimum);

/**
 * Obtain the argument with the maximum value.'
 * @param this {@link ExpressionVisitor} instance providing context for comparing across echelons.
 * @param args Arguments to find the largest of.
 * @returns Largest argument.
 */
function maximum(
  this: ExpressionVisitor,
  ...args: SonicWeavePrimitive[]
): SonicWeavePrimitive {
  const c = compare.bind(this);
  return args.slice(1).reduce((a, b) => (c(a, b) >= 0 ? a : b), args[0]);
}
maximum.__doc__ = 'Obtain the argument with the maximum value.';
maximum.__node__ = builtinNode(maximum);

function sortInPlace(
  this: ExpressionVisitor,
  scale?: SonicWeaveValue,
  compareFn?: SonicWeaveFunction
) {
  // XXX: The implementation works for strings, we just cheat the types here.
  pubSortInPlace.bind(this)(scale as Interval[], compareFn);
}
sortInPlace.__doc__ = 'Sort the current/given scale in ascending order.';
sortInPlace.__node__ = builtinNode(sortInPlace, PARENT_SCALE);

/**
 * Obtain a sorted copy of the popped/given scale in ascending order.
 * @param this {@link ExpressionVisitor} instance providing the current scale and context for comparing across echelons.
 * @param scale Musical scale to sort (defaults to context scale).
 * @param compareFn SonicWeave riff for comparing elements.
 */
function sort(
  this: ExpressionVisitor,
  scale?: SonicWeavePrimitive[],
  compareFn?: SonicWeaveFunction
) {
  // Remember that built-ins don't have full scope construction so this is the parent scale.
  scale ??= this.popScale(false);
  if (!Array.isArray(scale)) {
    throw new Error('Only arrays can be sorted.');
  }
  scale = [...scale];
  sortInPlace.bind(this)(scale, compareFn);
  return scale;
}
sort.__doc__ =
  'Obtain a sorted copy of the popped/given scale in ascending order.';
sort.__node__ = builtinNode(sort);

function keepUnique(this: ExpressionVisitor, scale?: SonicWeaveValue) {
  scale ??= this.popScale(false);
  if (!Array.isArray(scale)) {
    throw new Error('An array is required.');
  }
  if (!scale.length) {
    return [];
  }
  const seen = new Set();
  const equave = scale.pop()!;
  if (equave instanceof Interval) {
    seen.add(equave.valueOf());
  } else {
    scale.push(equave);
  }
  const result: SonicWeavePrimitive[] = [];
  for (const interval of scale) {
    const value = interval ? interval.valueOf() : interval;
    if (seen.has(value)) {
      continue;
    }
    result.push(interval);
    seen.add(value);
  }
  if (equave instanceof Interval) {
    result.push(equave);
  }
  return result;
}
keepUnique.__doc__ =
  'Obtain a copy of the popped/given scale with only unique intervals kept.';
keepUnique.__node__ = builtinNode(keepUnique);

function automos(this: ExpressionVisitor) {
  const scale = this.currentScale;
  if (!this.rootContext?.mosConfig || scale.length) {
    return;
  }
  this.spendGas(this.rootContext.mosConfig.scale.size);
  const J4 = this.rootContext.C4;
  const monzos = scaleMonzos(this.rootContext.mosConfig).map(m => J4.mul(m));
  const result = monzos.map(
    (m, i) =>
      new Interval(m, 'logarithmic', 0, {
        type: 'AbsoluteFJS',
        pitch: {
          type: 'AbsolutePitch',
          nominal: nthNominal(mmod(i + 1, monzos.length)),
          accidentals: [{accidental: '♮', fraction: ''}],
          octave: i === monzos.length - 1 ? 5 : 4,
        },
        ups: 0,
        lifts: 0,
        superscripts: [],
        subscripts: [],
      })
  );
  this.rootContext.fragiles.push(...result);
  return result;
}
automos.__doc__ =
  'If the current scale is empty, generate absolute Diamond-mos notation based on the current config.';
automos.__node__ = builtinNode(automos);

function reverseInPlace(
  this: ExpressionVisitor,
  scale?: SonicWeavePrimitive[]
) {
  scale ??= this.currentScale;
  scale.reverse();
}
reverseInPlace.__doc__ = 'Reverse the order of the current/given scale.';
reverseInPlace.__node__ = builtinNode(reverseInPlace, PARENT_SCALE);

function reverse(this: ExpressionVisitor, scale?: SonicWeavePrimitive[]) {
  scale ??= this.popScale(false);
  scale = [...scale];
  reverseInPlace.bind(this)(scale);
  return scale;
}
reverse.__doc__ = 'Obtain a copy of the popped/given scale in reversed order.';
reverse.__node__ = builtinNode(reverse);

function pop(
  this: ExpressionVisitor,
  scale?: SonicWeavePrimitive[],
  index?: Interval
) {
  scale ??= this.currentScale;
  if (!scale.length) {
    throw new Error('Pop from an empty scale.');
  }
  if (index) {
    let i = index.toInteger();
    if (i < 0) {
      i += scale.length;
    }
    if (i < 0 || i >= scale.length) {
      throw new Error('Pop index out of range.');
    }
    return scale.splice(i, 1)[0];
  }
  return scale.pop()!;
}
pop.__doc__ =
  'Remove and return the last interval in the current/given scale. Optionally an index to pop may be given.';
pop.__node__ = builtinNode(pop, PARENT_SCALE);

function popAll(this: ExpressionVisitor, scale?: SonicWeavePrimitive[]) {
  scale ??= this.currentScale;
  const result = [...scale];
  scale.length = 0;
  return result;
}
popAll.__doc__ = 'Remove and return all intervals in the current/given scale.';
popAll.__node__ = builtinNode(popAll, PARENT_SCALE);

function push(
  this: ExpressionVisitor,
  interval: SonicWeavePrimitive,
  scale?: SonicWeavePrimitive[],
  index?: Interval
) {
  requireParameters({interval});
  scale ??= this.currentScale;
  if (index) {
    let i = index.toInteger();
    if (i < 0) {
      i += scale.length;
    }
    if (i < 0) {
      scale.unshift(interval);
      return;
    }
    if (i >= scale.length) {
      scale.push(interval);
      return;
    }
    scale.splice(i, 0, interval);
    return;
  }
  scale.push(interval);
}
push.__doc__ =
  'Append an interval onto the current/given scale. Optionally an index to push after may be given.';
push.__node__ = builtinNode(push, PARENT_SCALE);

function shift(this: ExpressionVisitor, scale?: SonicWeavePrimitive[]) {
  scale ??= this.currentScale;
  if (!scale.length) {
    throw new Error('Shift from an empty scale');
  }
  return scale.shift()!;
}
shift.__doc__ =
  'Remove and return the first interval in the current/given scale.';
shift.__node__ = builtinNode(shift, PARENT_SCALE);

function unshift(
  this: ExpressionVisitor,
  interval: SonicWeavePrimitive,
  scale?: SonicWeavePrimitive[]
) {
  requireParameters({interval});
  scale ??= this.currentScale;
  scale.unshift(interval);
}
unshift.__doc__ =
  'Prepend an interval at the beginning of the current/given scale.';
unshift.__node__ = builtinNode(unshift, PARENT_SCALE);

function insert(
  this: ExpressionVisitor,
  interval: SonicWeavePrimitive,
  scale?: SonicWeavePrimitive[]
) {
  requireParameters({interval});
  scale ??= this.currentScale;
  const cmp = compare.bind(this);
  for (let i = 0; i < scale.length; ++i) {
    if (cmp(interval, scale[i]) < 0) {
      scale.splice(i, 0, interval);
      return;
    }
  }
  scale.push(interval);
}
insert.__doc__ =
  'Insert an interval into the current/given scale keeping it sorted.';
insert.__node__ = builtinNode(insert, PARENT_SCALE);

function dislodge(
  this: ExpressionVisitor,
  element: SonicWeavePrimitive,
  scale?: SonicWeavePrimitive[]
) {
  requireParameters({element});
  scale ??= this.currentScale;
  if (element instanceof Interval) {
    for (let i = 0; i < scale.length; ++i) {
      const existing = scale[i];
      if (existing instanceof Interval && element.strictEquals(existing)) {
        return scale.splice(i, 1)[0];
      }
    }
    throw new Error('Failed to locate interval to dislodge.');
  }
  for (let i = 0; i < scale.length; ++i) {
    if (element === scale[i]) {
      return scale.splice(i, 1)[0];
    }
  }
  throw new Error('Failed to locate element to dislodge.');
}
dislodge.__doc__ =
  'Remove and return the first element equal to the given one from the current/given scale.';
dislodge.__node__ = builtinNode(dislodge, PARENT_SCALE);

function extend(
  this: ExpressionVisitor,
  first: SonicWeavePrimitive[],
  ...rest: SonicWeavePrimitive[][]
) {
  requireParameters({first});
  for (const r of rest) {
    first.push(...r);
  }
}
extend.__doc__ = 'Extend the first array with the contents of the rest.';
extend.__node__ = builtinNode(extend);

function concat(
  this: ExpressionVisitor,
  first: SonicWeaveValue[] | string,
  ...rest: SonicWeaveValue[]
) {
  requireParameters({first});
  if (typeof first === 'string') {
    return first.concat(
      ...rest.map(r => (typeof r === 'string' ? r : repr.bind(this)(r)))
    );
  }
  return first.concat(...rest);
}
concat.__doc__ = 'Combine two or more arrays/strings.';
concat.__node__ = builtinNode(concat);

function length(this: ExpressionVisitor, scale?: SonicWeavePrimitive[]) {
  scale ??= this.currentScale;
  return fromInteger(scale.length);
}
length.__doc__ = 'Return the number of intervals in the scale.';
length.__node__ = builtinNode(length, PARENT_SCALE);

function map(
  this: ExpressionVisitor,
  mapper: (value: any, index: Interval, array: any[]) => unknown,
  scale?: any[]
) {
  requireParameters({mapper});
  mapper = mapper.bind(this);
  scale ??= this.currentScale;
  return scale.map((value, index, arr) =>
    mapper(value, fromInteger(index), arr)
  );
}
map.__doc__ = 'Map a riff over the given/current scale producing a new scale.';
map.__node__ = builtinNode(map, PARENT_SCALE);

function remap(
  this: ExpressionVisitor,
  mapper: (value: any, index: Interval, array: any[]) => unknown,
  scale?: any[]
) {
  requireParameters({mapper});
  scale ??= this.currentScale;
  const mapped = map.bind(this)(mapper, scale);
  scale.length = 0;
  scale.push(...mapped);
}
remap.__doc__ =
  'Map a riff over the given/current scale replacing the contents.';
remap.__node__ = builtinNode(remap, PARENT_SCALE);

function filter(
  this: ExpressionVisitor,
  tester: (value: any, index: Interval, array: any[]) => SonicWeaveValue,
  scale?: any[]
) {
  requireParameters({tester});
  tester = tester.bind(this);
  scale ??= this.currentScale;
  return scale.filter((value, index, arr) =>
    sonicTruth(tester(value, fromInteger(index), arr))
  );
}
filter.__doc__ =
  'Obtain a copy of the given/current scale containing values that evaluate to `true` according to the `tester` riff.';
filter.__node__ = builtinNode(filter, PARENT_SCALE);

function distill(
  this: ExpressionVisitor,
  tester: (value: any, index: Interval, array: any[]) => SonicWeaveValue,
  scale?: any[]
) {
  requireParameters({tester});
  scale ??= this.currentScale;
  const filtered = filter.bind(this)(tester, scale);
  scale.length = 0;
  scale.push(...filtered);
}
distill.__doc__ =
  'Remove intervals from the given/current scale that evaluate to `false` according to the `tester` riff.';
distill.__node__ = builtinNode(distill, PARENT_SCALE);

function arrayReduce(
  this: ExpressionVisitor,
  reducer: (
    previousValue: any,
    currentValue: any,
    currentIndex: Interval,
    array: any[]
  ) => any,
  scale?: any[],
  initialValue?: any
) {
  requireParameters({reducer});
  if (!(typeof reducer === 'function')) {
    throw new Error('The first argument of arrayReduce must be a function.');
  }
  reducer = reducer.bind(this);
  scale ??= this.currentScale;
  if (arguments.length >= 3) {
    return scale.reduce(
      (value, currentValue, currentIndex, arr) =>
        reducer(value, currentValue, fromInteger(currentIndex), arr),
      initialValue
    );
  } else {
    return scale.reduce((value, currentValue, currentIndex, arr) =>
      reducer(value, currentValue, fromInteger(currentIndex), arr)
    );
  }
}
arrayReduce.__doc__ =
  'Reduce the given/current scale to a single value by the `reducer` riff which takes an accumulator, the current value, the current index and the array as arguments.';
arrayReduce.__node__ = builtinNode(arrayReduce, PARENT_SCALE);

function arrayRepeat(
  this: ExpressionVisitor,
  count: Interval,
  scale?: any[] | string
) {
  requireParameters({count});
  const c = count.toInteger();
  if (typeof scale === 'string') {
    return scale.repeat(c);
  }
  if (c === 0) {
    return [];
  }
  scale ??= this.currentScale;
  // XXX: Should these be independent copies?
  return [].concat(...Array(c).fill(scale));
}
arrayRepeat.__doc__ = 'Repeat the given/current array or string `count` times.';
arrayRepeat.__node__ = builtinNode(arrayRepeat, PARENT_SCALE);

function some(
  this: ExpressionVisitor,
  array?: any[],
  test?: (value: any, index: Interval, array: any[]) => unknown
) {
  if (!array) {
    array = this.currentScale;
  }
  this.spendGas(array.length);
  if (!test) {
    return array.some(sonicTruth);
  }
  return array.some((v, i, arr) => test(v, fromInteger(i), arr));
}
some.__doc__ =
  "Test whether at least one element in the array passes the test implemented by the provided function. It returns true if, in the array, it finds an element for which the provided function returns true; otherwise it returns false. It doesn't modify the array. If no array is provided it defaults to the current scale. If no test is provided it defaults to truthiness.";
some.__node__ = builtinNode(some, PARENT_SCALE);

function every(
  this: ExpressionVisitor,
  array?: any[],
  test?: (value: any, index: Interval, array: any[]) => unknown
) {
  if (!array) {
    array = this.currentScale;
  }
  this.spendGas(array.length);
  if (!test) {
    return array.every(sonicTruth);
  }
  return array.every((v, i, arr) => test(v, fromInteger(i), arr));
}
every.__doc__ =
  "Tests whether all elements in the array pass the test implemented by the provided function. It returns a Boolean value. It doesn't modify the array. If no array is provided it defaults to the current scale. If no test is provided it defaults to truthiness.";
every.__node__ = builtinNode(every, PARENT_SCALE);

/**
 * Obtain an array of `[key, value]` pairs of the record.
 * @param record SonicWeave record.
 * @returns Entries in the record.
 */
function entries(record: SonicWeaveValue) {
  if (typeof record !== 'object') {
    throw new Error('A record expected.');
  }
  if (
    Array.isArray(record) ||
    record instanceof Color ||
    record instanceof Interval ||
    record instanceof Val
  ) {
    throw new Error('A record expected.');
  }
  return Object.entries(record);
}
entries.__doc__ = 'Obtain an array of `[key, value]` pairs of the record.';
entries.__node__ = builtinNode(entries);

function templateArg(this: ExpressionVisitor, index: Interval) {
  if (!this.rootContext) {
    throw new Error('Root context required to access template arguments.');
  }
  return this.rootContext.templateArguments[upcastBool(index).toInteger()];
}
templateArg.__doc__ =
  'Access the nth template argument when using the `sw` tag inside JavaScript.';
templateArg.__node__ = builtinNode(templateArg);

function repr(this: ExpressionVisitor, value: SonicWeaveValue) {
  return pubRepr.bind(this)(value);
}
repr.__doc__ =
  'Obtain a string representation of the value (with color and label).';
repr.__node__ = builtinNode(repr);

function str(this: ExpressionVisitor, value: SonicWeaveValue) {
  return pubStr.bind(this)(value);
}
str.__doc__ =
  'Obtain a string representation of the value (w/o color or label).';
str.__node__ = builtinNode(str);

function print(this: ExpressionVisitor, ...args: any[]) {
  const s = repr.bind(this);
  console.log(...args.map(a => (typeof a === 'string' ? a : s(a))));
}
print.__doc__ = 'Print the arguments to the console.';
print.__node__ = builtinNode(print);

function warn(this: ExpressionVisitor, ...args: any[]) {
  const s = repr.bind(this);
  console.log(...args.map(a => (typeof a === 'string' ? a : s(a))));
}
warn.__doc__ = 'Print the arguments to the console with "warning" emphasis.';
warn.__node__ = builtinNode(warn);

function dir(arg: any) {
  console.dir(arg, {depth: null});
}
dir.__doc__ = 'Obtain the javascript representation of the value.';
dir.__node__ = builtinNode(dir);

function doc(riff: SonicWeaveFunction) {
  requireParameters({riff});
  return riff.__doc__;
}
doc.__doc__ = 'Obtain the docstring of the given riff.';
doc.__node__ = builtinNode(doc);

function help(riff: SonicWeaveFunction) {
  requireParameters({riff});
  console.log(`Help on ${riff.name}`);
  console.log(riff.__doc__);
  const params = riff.__node__.parameters;
  if (params.parameters.length || params.rest) {
    console.log('Parameters:');
    const names = params.parameters.map(p =>
      p.type === 'Parameter'
        ? p.id
        : '[...]' +
          (p.defaultValue ? ' = ' + expressionToString(p.defaultValue) : '')
    );
    if (params.rest) {
      names.push('...' + params.rest.id);
    }
    console.log(names.join(', '));
  } else {
    console.log('(No parameters)');
  }
}
help.__doc__ = 'Print information about the given riff to the console.';
help.__node__ = builtinNode(help);

// CSS color generation
function cc(x: Interval, fractionDigits = 3) {
  return x.value.valueOf().toFixed(fractionDigits);
}

function rgb(red: Interval, green: Interval, blue: Interval) {
  requireParameters({red, green, blue});
  return new Color(`rgb(${cc(red)} ${cc(green)} ${cc(blue)})`);
}
rgb.__doc__ =
  'RGB color (Red range 0-255, Green range 0-255, Blue range 0-255).';
rgb.__node__ = builtinNode(rgb);

function rgba(red: Interval, green: Interval, blue: Interval, alpha: Interval) {
  requireParameters({red, green, blue, alpha});
  return new Color(
    `rgba(${cc(red)} ${cc(green)} ${cc(blue)} / ${cc(alpha, 5)})`
  );
}
rgba.__doc__ =
  'RGBA color (Red range 0-255, Green range 0-255, Blue range 0-255, Alpha range 0-1).';
rgba.__node__ = builtinNode(rgba);

function hsl(hue: Interval, saturation: Interval, lightness: Interval) {
  requireParameters({hue, saturation, lightness});
  return new Color(`hsl(${cc(hue)}deg ${cc(saturation)}% ${cc(lightness)}%)`);
}
hsl.__doc__ =
  'HSL color (Hue range 0-360, Saturation range 0-100, Lightness range 0-100).';
hsl.__node__ = builtinNode(hsl);

function hsla(
  hue: Interval,
  saturation: Interval,
  lightness: Interval,
  alpha: Interval
) {
  requireParameters({hue, saturation, lightness, alpha});
  return new Color(
    `hsla(${cc(hue)}deg ${cc(saturation)}% ${cc(lightness)}% / ${cc(alpha, 5)})`
  );
}
hsla.__doc__ =
  'HSLA color (Hue range 0-360, Saturation range 0-100, Lightness range 0-100, Alpha range 0-1).';
hsla.__node__ = builtinNode(hsla);

function centsColor(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): Color | Color[] {
  if (Array.isArray(interval)) {
    this.spendGas(interval.length);
    return interval.map(centsColor as any);
  }
  return pubCentsColor.bind(this)(upcastBool(interval));
}
centsColor.__doc__ =
  'Color based on the size of the interval. Hue wraps around every 1200 cents.';
centsColor.__node__ = builtinNode(centsColor);

export function factorColor(
  this: ExpressionVisitor,
  interval: SonicWeaveValue
): Color | Color[] {
  if (Array.isArray(interval)) {
    this.spendGas(interval.length);
    return interval.map(factorColor as any);
  }
  return pubFactorColor.bind(this)(upcastBool(interval));
}
factorColor.__doc__ = 'Color an interval based on its prime factors.';
factorColor.__node__ = builtinNode(factorColor);

/**
 * Ambient builtin constants and functions that are always present in SonicWeave DSL.
 */
export const BUILTIN_CONTEXT: Record<string, Interval | SonicWeaveFunction> = {
  ...MATH_WRAPPERS,
  atan2,
  atanXY,
  // Constants
  E,
  LN10,
  LN2,
  LOG10E,
  LOG2E,
  PI,
  SQRT1_2,
  SQRT2,
  TAU,
  VERSION,
  // First-party wrappers
  numComponents,
  stepSignature,
  divisors,
  lll,
  // Third-party wrappers
  mosSubset,
  isPrime,
  nthPrime,
  primes,
  primeRange,
  fareySequence,
  fareyInterior,
  // Domain conversion
  simplify,
  bleach,
  linear,
  logarithmic,
  absolute,
  relative,
  // Type conversion
  bool,
  int,
  decimal,
  fraction,
  radical,
  nedji,
  cents,
  absoluteFJS,
  FJS,
  labelAbsoluteFJS,
  monzo: toMonzo,
  primeMonzo,
  // Type detection
  isInterval,
  isColor,
  isString,
  isBoolean,
  isFunction,
  isArray,
  isAbsolute,
  isRelative,
  isLinear,
  isLogarithmic,
  // Value detection
  isInt,
  isRational,
  isRadical,
  // Integer conversion
  floor,
  round,
  trunc,
  ceil,
  // String methods
  charCodeAt,
  codePointAt,
  fromCharCode,
  fromCodePoint,
  // Other
  track,
  trackingIds,
  flatten,
  clear,
  tail,
  colorOf,
  labelOf,
  complexityOf,
  basisOf,
  withBasis,
  cosJIP,
  JIP,
  real,
  warts,
  SOV,
  PrimeMapping,
  tenneyHeight,
  wilsonHeight,
  respell,
  gcd,
  lcm,
  compare: builtinCompare,
  toPrimeArray,
  monzoFromPrimeArray,
  valFromPrimeArray,
  basis,
  basisToArray,
  transpose,
  inv,
  det,
  hasConstantStructure: hasConstantStructure_,
  stepString: stepString_,
  str,
  repr,
  slice,
  zip,
  zipLongest,
  minimum,
  maximum,
  random,
  randomCents,
  sort,
  sortInPlace,
  keepUnique,
  automos,
  reverse,
  reverseInPlace,
  pop,
  popAll,
  push,
  shift,
  unshift,
  insert,
  dislodge,
  extend,
  concat,
  length,
  print,
  warn,
  dir,
  doc,
  help,
  map,
  remap,
  filter,
  distill,
  arrayReduce,
  arrayRepeat,
  some,
  every,
  kCombinations,
  entries,
  templateArg,
  // CSS color generation
  rgb,
  rgba,
  hsl,
  hsla,
  centsColor,
  factorColor,
};
