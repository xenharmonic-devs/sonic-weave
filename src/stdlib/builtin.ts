import {
  Fraction,
  kCombinations as xduKCombinations,
  isPrime as xduIsPrime,
  primes as xduPrimes,
  approximateRadical,
  PRIME_CENTS,
  dot,
  valueToCents,
  LOG_PRIMES,
  norm,
  centsToNats,
  BIG_INT_PRIMES,
  fareySequence as xduFareySequence,
  fareyInterior as xduFareyInterior,
} from 'xen-dev-utils';
import {Color, Interval, Val} from '../interval';
import {
  TimeMonzo,
  getNumberOfComponents,
  setNumberOfComponents,
} from '../monzo';
import {type ExpressionVisitor} from '../parser';
import {MosOptions, mos} from 'moment-of-symmetry';
import {expressionToString} from '../ast';
import {
  FJSFlavor,
  NedjiLiteral,
  RadicalLiteral,
  formatAbsoluteFJS,
} from '../expression';
import {TWO, ZERO, countUpsAndLifts} from '../utils';
import {stepString, stepSignature as wordsStepSignature} from '../words';
import {hasConstantStructure} from '../tools';
import {
  SonicWeaveFunction,
  SonicWeavePrimitive,
  SonicWeaveValue,
  builtinNode,
  fromInteger,
  requireParameters,
  sonicTruth,
  upcastBool,
} from './runtime';

// === Library ===

// == Constants
const E = new Interval(TimeMonzo.fromValue(Math.E), 'linear');
const LN10 = new Interval(TimeMonzo.fromValue(Math.LN10), 'linear');
const LN2 = new Interval(TimeMonzo.fromValue(Math.LN2), 'linear');
const LOG10E = new Interval(TimeMonzo.fromValue(Math.LOG10E), 'linear');
const LOG2E = new Interval(TimeMonzo.fromValue(Math.LOG2E), 'linear');
const PI = new Interval(TimeMonzo.fromValue(Math.PI), 'linear');
const SQRT1_2 = new Interval(TimeMonzo.fromEqualTemperament('-1/2'), 'linear');
const SQRT2 = new Interval(TimeMonzo.fromEqualTemperament('1/2'), 'linear');
const TAU = new Interval(TimeMonzo.fromValue(2 * Math.PI), 'linear');
const NAN = new Interval(TimeMonzo.fromValue(NaN), 'linear');
const INFINITY = new Interval(TimeMonzo.fromValue(Infinity), 'linear');

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
  function wrapper(x: Interval) {
    requireParameters({x});
    return new Interval(
      TimeMonzo.fromValue(fn(x.valueOf())),
      LOGS.includes(name) ? 'linear' : x.domain,
      undefined,
      x
    );
  }
  Object.defineProperty(wrapper, 'name', {value: name, enumerable: false});
  wrapper.__doc__ = `Calculate ${String(name)} x.`;
  wrapper.__node__ = builtinNode(wrapper);
  MATH_WRAPPERS[name as string] = wrapper;
}

function atan2(y: Interval, x: Interval) {
  requireParameters({y, x});
  return new Interval(
    TimeMonzo.fromValue(Math.atan2(y.valueOf(), x.valueOf())),
    'linear'
  );
}
atan2.__doc__ =
  'Calculate atan2(y, x) which is the angle between (1, 0) and (x, y), chosen to lie in (−π; π], positive anticlockwise.';
atan2.__node__ = builtinNode(atan2);

// Equivalent to atan2 but with swapped arguments.
// Rationale is that atanXY(x, y) = log(x + i * y), x and y now coordinates.
function atanXY(x: Interval, y: Interval) {
  return atan2(y, x);
}
atanXY.__doc__ =
  'Calculate atanXY(x, y) = atan2(y, x) which is the angle between (1, 0) and (x, y), chosen to lie in (−π; π], positive anticlockwise.';
atanXY.__node__ = builtinNode(atanXY);

// == First-party wrappers ==
function numComponents(value?: Interval) {
  if (value === undefined) {
    return fromInteger(getNumberOfComponents());
  }
  setNumberOfComponents(value.toInteger());
  return;
}
numComponents.__doc__ =
  'Get/set the number of prime exponents to support in monzos. Also sets the length of vals.';
numComponents.__node__ = builtinNode(numComponents);

function stepSignature(word: string) {
  const result: Record<string, Interval> = {};
  for (const [letter, count] of Object.entries(wordsStepSignature(word))) {
    result[letter] = fromInteger(count);
  }
  return result;
}
stepSignature.__doc__ = 'Calculate the step signature of an entire scale word.';
stepSignature.__node__ = builtinNode(stepSignature);

// == Third-party wrappers ==
function kCombinations(set: any[], k: Interval) {
  requireParameters({set, k});
  if (!Array.isArray(set)) {
    throw new Error('Set must be an array.');
  }
  return xduKCombinations(set, k.toInteger());
}
kCombinations.__doc__ = 'Obtain all k-sized combinations in a set';
kCombinations.__node__ = builtinNode(kCombinations);

function isPrime(n: Interval) {
  requireParameters({n});
  return xduIsPrime(n.valueOf());
}
isPrime.__doc__ = 'Return `true` if `n` is a prime number, `false` otherwise.';
isPrime.__node__ = builtinNode(isPrime);

function primes(start: Interval, end?: Interval) {
  requireParameters({start});
  return xduPrimes(start.valueOf(), end ? end.valueOf() : undefined).map(p =>
    fromInteger(p)
  );
}
primes.__doc__ =
  'Obtain an array of prime numbers such that start <= p <= end. Or p <= start if end is omitted.';
primes.__node__ = builtinNode(primes);

function mosSubset(
  numberOfLargeSteps: Interval,
  numberOfSmallSteps: Interval,
  sizeOfLargeStep?: Interval,
  sizeOfSmallStep?: Interval,
  up?: Interval,
  down?: Interval
) {
  requireParameters({numberOfLargeSteps, numberOfSmallSteps});
  const options: MosOptions = {};
  if (sizeOfLargeStep !== undefined) {
    options.sizeOfLargeStep = sizeOfLargeStep.toInteger();
  }
  if (sizeOfSmallStep !== undefined) {
    options.sizeOfSmallStep = sizeOfSmallStep.toInteger();
  }
  if (up !== undefined) {
    options.up = up.toInteger();
  }
  if (down !== undefined) {
    options.down = down.toInteger();
  }
  const result = mos(
    numberOfLargeSteps.toInteger(),
    numberOfSmallSteps.toInteger(),
    options
  );
  return result.map(s => fromInteger(s));
}
mosSubset.__doc__ =
  'Calculate a subset of equally tempered degrees with maximum variety two per scale degree.';
mosSubset.__node__ = builtinNode(mosSubset);

function fareySequence(maxDenominator: Interval) {
  requireParameters({maxDenominator});
  const result: Interval[] = [];
  for (const fraction of xduFareySequence(maxDenominator.toInteger())) {
    const value = TimeMonzo.fromFraction(fraction);
    result.push(new Interval(value, 'linear', value.asFractionLiteral()));
  }
  return result;
}
fareySequence.__doc__ =
  "Generate the n'th Farey sequence i.e. all fractions between 0 and 1 inclusive with denominater below or at the given limit.";
fareySequence.__node__ = builtinNode(fareySequence);

function fareyInterior(maxDenominator: Interval) {
  requireParameters({maxDenominator});
  const result: Interval[] = [];
  for (const fraction of xduFareyInterior(maxDenominator.toInteger())) {
    const value = TimeMonzo.fromFraction(fraction);
    result.push(new Interval(value, 'linear', value.asFractionLiteral()));
  }
  return result;
}
fareyInterior.__doc__ =
  "Generate the interior of the n'th Farey sequence i.e. all fractions between 0 and 1 exclusive with denominater below or at the given limit.";
fareyInterior.__node__ = builtinNode(fareyInterior);

// == Domain conversion ==

export function simplify(interval: Interval | Val | boolean) {
  requireParameters({interval});
  if (
    !(
      typeof interval === 'boolean' ||
      interval instanceof Interval ||
      interval instanceof Val
    )
  ) {
    throw new Error('An interval, val or boolean is required.');
  }
  if (interval instanceof Val) {
    return new Val(interval.value.clone(), interval.equave.clone());
  }
  if (typeof interval === 'boolean') {
    return upcastBool(interval);
  }
  return new Interval(
    interval.value.clone(),
    interval.domain,
    undefined,
    interval
  );
}
simplify.__doc__ = 'Get rid of interval formatting.';
simplify.__node__ = builtinNode(simplify);

export function bleach(interval: Interval | boolean) {
  requireParameters({interval});
  if (typeof interval === 'boolean') {
    return upcastBool(interval);
  }
  return new Interval(interval.value.clone(), interval.domain, interval.node);
}
bleach.__doc__ = 'Get rid of interval coloring and label.';
bleach.__node__ = builtinNode(bleach);

export function linear(interval: Interval | boolean) {
  requireParameters({interval});
  if (typeof interval === 'boolean') {
    return upcastBool(interval);
  }
  return new Interval(interval.value.clone(), 'linear', undefined, interval);
}
linear.__doc__ = 'Convert interval to linear representation.';
linear.__node__ = builtinNode(linear);

export function logarithmic(interval: Interval | boolean) {
  requireParameters({interval});
  if (typeof interval === 'boolean') {
    interval = upcastBool(interval);
  }
  return new Interval(
    interval.value.clone(),
    'logarithmic',
    undefined,
    interval
  );
}
logarithmic.__doc__ = 'Convert interval to logarithmic representation.';
logarithmic.__node__ = builtinNode(logarithmic);

export function cologarithmic(interval: Interval | boolean) {
  requireParameters({interval});
  if (typeof interval === 'boolean') {
    interval = upcastBool(interval);
  }
  return new Val(interval.value.clone(), interval.value.clone());
}
cologarithmic.__doc__ = 'Convert interval to cologarithmic representation.';
cologarithmic.__node__ = builtinNode(cologarithmic);

export function absolute(
  this: ExpressionVisitor,
  interval: Interval | boolean
) {
  requireParameters({interval});
  if (typeof interval === 'boolean') {
    interval = upcastBool(interval);
  }
  if (interval.isAbsolute()) {
    const te = interval.value.timeExponent;
    return new Interval(
      interval.value.pow(te.inverse().neg()),
      interval.domain,
      undefined,
      interval
    );
  }
  if (this.rootContext.unisonFrequency === undefined) {
    throw new Error(
      'Reference frequency must be set for relative -> absolute conversion. Try 1/1 = 440 Hz'
    );
  }
  return new Interval(
    interval.value.mul(this.rootContext.unisonFrequency),
    interval.domain,
    undefined,
    interval
  );
}
absolute.__doc__ = 'Convert interval to absolute representation.';
absolute.__node__ = builtinNode(absolute);

export function relative(
  this: ExpressionVisitor,
  interval: Interval | boolean
) {
  requireParameters({interval});
  if (typeof interval === 'boolean') {
    return upcastBool(interval);
  }
  if (interval.isRelative()) {
    return new Interval(
      interval.value.clone(),
      interval.domain,
      undefined,
      interval
    );
  }
  if (this.rootContext.unisonFrequency === undefined) {
    throw new Error(
      'Reference frequency must be set for absolute -> relative conversion. Try 1/1 = 440 Hz'
    );
  }
  const absolut = absolute.bind(this)(interval);
  return new Interval(
    absolut.value.div(this.rootContext.unisonFrequency),
    interval.domain,
    undefined,
    interval
  );
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
function int(this: ExpressionVisitor, interval: Interval) {
  interval = relative.bind(this)(interval);
  return Interval.fromInteger(interval.toInteger());
}
int.__doc__ =
  'Convert value to an integer. Throws an error if conversion is impossible.';
int.__node__ = builtinNode(int);

// Coercion: Minimally lossy in terms of size
function decimal(
  this: ExpressionVisitor,
  interval: Interval,
  fractionDigits?: Interval
) {
  const converted = relative.bind(this)(interval);
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
  interval: Interval,
  tolerance?: Interval,
  preferredNumerator?: Interval,
  preferredDenominator?: Interval
) {
  const numerator = preferredNumerator
    ? preferredNumerator.value.toBigInteger()
    : 0n;
  const denominator = preferredDenominator
    ? preferredDenominator.value.toBigInteger()
    : 0n;
  const converted = relative.bind(this)(interval);
  let value: TimeMonzo;
  if (tolerance === undefined) {
    if (!converted.value.isFractional()) {
      throw new Error('Input is irrational and no tolerance given.');
    }
    value = converted.value.clone();
  } else {
    const frac = new Fraction(converted.value.valueOf()).simplifyRelative(
      tolerance.totalCents()
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
  return new Interval(value, 'linear', node, interval);
}
fraction.__doc__ =
  'Convert interval to a fraction. Throws an error if conversion is impossible and no tolerance (in cents) for approximation is given.';
fraction.__node__ = builtinNode(fraction);

// Coercion: Only when maxIndex and maxHeight are given. Throw otherwise.
function radical(
  this: ExpressionVisitor,
  interval: Interval,
  maxIndex?: Interval,
  maxHeight?: Interval
) {
  const converted = relative.bind(this)(interval);
  const maxIdx = maxIndex ? maxIndex.toInteger() : undefined;
  if (converted.value.isEqualTemperament()) {
    const node = converted.value.asRadicalLiteral();
    if (maxIdx === undefined) {
      if (node) {
        return new Interval(converted.value.clone(), 'linear', node, interval);
      }
      throw new Error('Failed to convert to a radical.');
    } else if (node && node.exponent.d <= maxIdx) {
      return new Interval(converted.value.clone(), 'linear', node, interval);
    }
  } else if (maxIdx === undefined) {
    throw new Error('Input is irrational and no maximum index given.');
  }
  const maxH = maxHeight ? maxHeight.toInteger() : 50000;
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
    return new Interval(value, 'linear', node, interval);
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
      rational.asFractionLiteral(),
      interval
    );
  }
}
radical.__doc__ =
  'Convert interval to a radical expression. Throws an error if conversion is impossible and no maximum index (2 means square root, 3 means cube root, etc.) for approximation is given.';
radical.__node__ = builtinNode(radical);

// Coercion: None.
export function nedji(
  this: ExpressionVisitor,
  interval: Interval,
  preferredNumerator?: Interval,
  preferredDenominator?: Interval,
  preferredEquaveNumerator?: Interval,
  preferredEquaveDenominator?: Interval
) {
  const numerator = preferredNumerator ? preferredNumerator.toInteger() : 0;
  const denominator = preferredDenominator
    ? preferredDenominator.toInteger()
    : 0;
  const eNum = preferredEquaveNumerator
    ? preferredEquaveNumerator.toInteger()
    : 0;
  const eDenom = preferredEquaveDenominator
    ? preferredEquaveDenominator.toInteger()
    : 0;

  const rad = radical.bind(this)(interval);
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
  return new Interval(rad.value, 'logarithmic', node, interval);
}
nedji.__doc__ =
  'Convert interval to N steps of equally divided just intonation.';
nedji.__node__ = builtinNode(nedji);

// Coercion: Minimally lossy in terms of size
export function cents(
  this: ExpressionVisitor,
  interval: Interval | boolean,
  fractionDigits?: Interval
) {
  const converted = relative.bind(this)(interval);
  if (fractionDigits !== undefined) {
    const denominator = 10 ** fractionDigits.toInteger();
    const numerator = Math.round(converted.totalCents() * denominator);
    converted.value = new TimeMonzo(ZERO, [
      new Fraction(numerator, denominator * 1200),
    ]);
  }
  converted.node = converted.value.asCentsLiteral();
  // XXX: Detect and follow grammar abuse.
  if (converted.node.fractional.endsWith('rc')) {
    converted.value = TimeMonzo.fromCents(converted.totalCents());
  }
  converted.domain = 'logarithmic';
  return converted;
}
cents.__doc__ = 'Convert interval to cents.';
cents.__node__ = builtinNode(cents);

function validateFlavor(flavor: string) {
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
}

// Coercion: None.
function absoluteFJS(this: ExpressionVisitor, interval: Interval, flavor = '') {
  validateFlavor(flavor);
  const C4 = this.rootContext.C4;
  let monzo: TimeMonzo;
  if (C4.timeExponent.n === 0) {
    monzo = relative.bind(this)(interval).value;
  } else {
    monzo = absolute.bind(this)(interval).value;
  }
  const result = new Interval(monzo, 'logarithmic', {
    type: 'AspiringAbsoluteFJS',
    flavor: flavor as FJSFlavor,
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
function FJS(this: ExpressionVisitor, interval: Interval, flavor = '') {
  validateFlavor(flavor);
  const monzo = relative.bind(this)(interval).value;
  const result = new Interval(monzo, 'logarithmic', {
    type: 'AspiringFJS',
    flavor: flavor as FJSFlavor,
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
  interval: Interval,
  flavor = ''
) {
  if (
    !interval.node ||
    (interval.node.type !== 'AbsoluteFJS' &&
      interval.node.type !== 'AspiringAbsoluteFJS')
  ) {
    interval = absoluteFJS.bind(this)(interval, flavor);
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
    if (accidental.accidental === '♮' || accidental.accidental === '=') {
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
function toMonzo(this: ExpressionVisitor, interval: Interval) {
  const monzo = relative.bind(this)(interval).value;
  let ups = 0;
  let lifts = 0;
  if (monzo.cents) {
    const context = this.rootContext;
    let steps = 0;
    let residue = 0;
    if (context.up.isRealCents() && context.lift.isRealCents()) {
      ({ups, lifts, steps, residue} = countUpsAndLifts(
        monzo.cents,
        context.up.cents,
        context.lift.cents
      ));
      if (steps || residue) {
        throw new Error('Cannot convert real value to monzo.');
      }
    } else {
      throw new Error('Cannot convert real value to monzo.');
    }
  }
  const clone = monzo.clone();
  clone.cents = 0;
  const node = clone.asMonzoLiteral();
  if (!node) {
    throw new Error('Monzo conversion failed.');
  }

  node.ups = ups;
  node.lifts = lifts;

  return new Interval(monzo, 'logarithmic', node, interval);
}
Object.defineProperty(toMonzo, 'name', {value: 'monzo', enumerable: false});
toMonzo.__doc__ = 'Convert interval to a prime count vector a.k.a. monzo.';
toMonzo.__node__ = builtinNode(toMonzo);

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

function isAbsolute(interval: Interval) {
  requireParameters({interval});
  return interval.isAbsolute();
}
isAbsolute.__doc__ =
  'Return `true` if the interval belongs to the absolute echelon.';
isAbsolute.__node__ = builtinNode(isAbsolute);

function isRelative(interval: Interval) {
  requireParameters({interval});
  return interval.isRelative();
}
isRelative.__doc__ =
  'Return `true` if the interval belongs to the relative echelon.';
isRelative.__node__ = builtinNode(isRelative);

function isLinear(interval: Interval) {
  requireParameters({interval});
  return interval.domain === 'linear';
}
isLinear.__doc__ =
  'Return `true` if the interval belongs to the linear domain.';
isLinear.__node__ = builtinNode(isLinear);

function isLogarithmic(interval: Interval) {
  requireParameters({interval});
  return interval.domain === 'logarithmic';
}
isLogarithmic.__doc__ =
  'Return `true` if the interval belongs to the logarithmic domain.';
isLogarithmic.__node__ = builtinNode(isLogarithmic);

// == Value detection ==

function isInt(interval: Interval) {
  requireParameters({interval});
  return interval.value.isIntegral();
}
isInt.__doc__ = 'Return `true` if the interval is an integer.';
isInt.__node__ = builtinNode(isInt);

function isRational(interval: Interval) {
  requireParameters({interval});
  return interval.value.isFractional();
}
isRational.__doc__ = 'Return `true` if the interval is a rational number.';
isRational.__node__ = builtinNode(isRational);

function isRadical(interval: Interval) {
  requireParameters({interval});
  return !interval.value.isNonAlgebraic();
}
isRadical.__doc__ = 'Return `true` if the interval is an nth root.';
isRadical.__node__ = builtinNode(isRadical);

// == Other ==

export function compare(
  this: ExpressionVisitor,
  a: SonicWeavePrimitive,
  b: SonicWeavePrimitive
) {
  requireParameters({a, b});
  if (typeof a === 'string') {
    if (typeof b !== 'string') {
      throw new Error('Only strings can be compared with other strings.');
    }
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  }
  if (typeof a === 'boolean') {
    a = upcastBool(a);
  }
  if (typeof b === 'boolean') {
    b = upcastBool(b);
  }
  if (!(a instanceof Interval && b instanceof Interval)) {
    throw new Error('Only strings or intervals can be compared.');
  }
  if (a.isRelative() && b.isRelative()) {
    return a.compare(b);
  }
  if (a.isAbsolute() && b.isAbsolute()) {
    const ab = absolute.bind(this);
    return ab(a).compare(ab(b));
  }
  const r = relative.bind(this);
  return r(a).compare(r(b));
}

export function track(this: ExpressionVisitor, interval: Interval) {
  requireParameters({interval});
  const result = interval.shallowClone();
  result.trackingIds.add(this.rootContext.nextTrackingId());
  return result;
}
track.__doc__ = 'Attach a tracking ID to the interval.';
track.__node__ = builtinNode(track);

function trackingIds(interval: Interval) {
  requireParameters({interval});
  return Array.from(interval.trackingIds).map(id => fromInteger(id));
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
  'Returns a new array with all sub-array elements concatenated into it recursively up to the specified depth (default `Infinity`).';
flatten.__node__ = builtinNode(flatten);

function clear(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  scale.length = 0;
}
clear.__doc__ = 'Remove the contents of the current/given scale.';
clear.__node__ = builtinNode(clear);

function tail(this: ExpressionVisitor, interval: Interval, index: Interval) {
  requireParameters({interval, index});
  return new Interval(
    interval.value.tail(index.toInteger()),
    interval.domain,
    undefined,
    interval
  );
}
tail.__doc__ =
  'Return the higher prime tail of an interval starting from the given index. Prime 2 has index 0.';
tail.__node__ = builtinNode(tail);

function colorOf(interval: Interval) {
  requireParameters({interval});
  return interval.color;
}
colorOf.__doc__ = 'Return the color of the interval.';
colorOf.__node__ = builtinNode(colorOf);

function labelOf(interval: Interval) {
  requireParameters({interval});
  return interval.label;
}
labelOf.__doc__ = 'Return the label of the interval.';
labelOf.__node__ = builtinNode(labelOf);

function equaveOf(val: Val) {
  requireParameters({val});
  return new Interval(val.equave.clone(), 'linear');
}
equaveOf.__doc__ = 'Return the equave of the val.';
equaveOf.__node__ = builtinNode(equaveOf);

function withEquave(val: Val, equave: Interval) {
  requireParameters({val, equave});
  return new Val(val.value.clone(), equave.value.clone());
}
withEquave.__doc__ = 'Change the equave of the val.';
withEquave.__node__ = builtinNode(withEquave);

function cosJIP(
  this: ExpressionVisitor,
  val: Val,
  weighting: 'none' | 'tenney' = 'tenney'
) {
  requireParameters({val});
  const pe = val.value.primeExponents.map(e => e.valueOf());
  let value = 0;
  if (weighting.toLowerCase() === 'tenney') {
    let n2 = 0;
    for (let i = 0; i < pe.length; ++i) {
      const e = pe[i] / LOG_PRIMES[i];
      value += e;
      n2 += e * e;
    }
    value /= Math.sqrt(n2 * pe.length);
  } else {
    const peNorm = norm(pe);
    const jipNorm = norm(LOG_PRIMES.slice(0, pe.length));
    value = dot(LOG_PRIMES, pe) / peNorm / jipNorm;
  }
  return new Interval(TimeMonzo.fromValue(value), 'linear');
}
cosJIP.__doc__ =
  'Cosine of the angle between the val and the just intonation point. Weighting is either "none" or "tenney".';
cosJIP.__node__ = builtinNode(cosJIP);

function JIP(this: ExpressionVisitor, interval: Interval) {
  requireParameters({interval});
  const monzo = relative.bind(this)(interval).value;
  const pe = monzo.primeExponents.map(e => e.valueOf());
  const value = TimeMonzo.fromCents(
    dot(PRIME_CENTS, pe) +
      valueToCents(Math.abs(monzo.residual.valueOf())) +
      monzo.cents
  );
  if (monzo.residual.s < 0) {
    value.residual.s = -1;
  }
  return new Interval(value, 'logarithmic', undefined, interval);
}
JIP.__doc__ = 'The Just Intonation Point. Converts intervals to real cents.';
JIP.__node__ = builtinNode(JIP);

function PrimeMapping(
  this: ExpressionVisitor,
  ...newPrimes: (Interval | undefined)[]
) {
  const rel = relative.bind(this);
  const np = newPrimes.map((p, i) =>
    p ? rel(p).value : TimeMonzo.fromBigInt(BIG_INT_PRIMES[i])
  );

  function mapper(this: ExpressionVisitor, interval: Interval) {
    const monzo = relative.bind(this)(interval).value;
    monzo.numberOfComponents = np.length;
    let mapped = new TimeMonzo(ZERO, [], monzo.residual, monzo.cents);
    while (mapped.primeExponents.length < np.length) {
      mapped.primeExponents.push(ZERO);
    }
    for (let i = 0; i < np.length; ++i) {
      mapped = mapped.mul(np[i].pow(monzo.primeExponents[i]));
    }
    return new Interval(
      mapped,
      'logarithmic',
      mapped.asCentsLiteral(),
      interval
    );
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

export function tenneyHeight(this: ExpressionVisitor, interval: Interval) {
  const monzo = relative.bind(this)(interval).value;
  const height =
    centsToNats(Math.abs(monzo.cents)) +
    Math.log(monzo.residual.n * monzo.residual.d) +
    monzo.primeExponents.reduce(
      (total, pe, i) => total + Math.abs(pe.valueOf()) * LOG_PRIMES[i],
      0
    );
  return new Interval(TimeMonzo.fromValue(height), 'linear');
}
tenneyHeight.__doc__ =
  'Calculate the Tenney height of the interval. Natural logarithm of numerator times denominator.';
tenneyHeight.__node__ = builtinNode(tenneyHeight);

function gcd(this: ExpressionVisitor, ...intervals: Interval[]) {
  if (!intervals.length) {
    intervals = this.getCurrentScale();
  }
  if (!intervals.length) {
    return fromInteger(0);
  }
  return intervals.reduce(
    (a, b) => new Interval(a.value.gcd(b.value), 'linear')
  );
}
gcd.__doc__ =
  'Obtain the largest (linear) multiplicative factor shared by all intervals or the current scale.';
gcd.__node__ = builtinNode(gcd);

function lcm(this: ExpressionVisitor, ...intervals: Interval[]) {
  if (!intervals.length) {
    intervals = this.getCurrentScale();
  }
  return intervals.reduce(
    (a, b) => new Interval(a.value.lcm(b.value), 'linear')
  );
}
lcm.__doc__ =
  'Obtain the smallest (linear) interval that shares all intervals or the current scale as multiplicative factors.';
lcm.__node__ = builtinNode(lcm);

function hasConstantStructure_(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  const rel = relative.bind(this);
  const monzos = scale.map(i => rel(i).value);
  return hasConstantStructure(monzos);
}
Object.defineProperty(hasConstantStructure_, 'name', {
  value: 'hasConstantStructure',
  enumerable: false,
});
hasConstantStructure_.__doc__ =
  'Returns `true` if the current/given scale has constant structure (i.e. every scale degree is unambiguous).';
hasConstantStructure_.__node__ = builtinNode(hasConstantStructure_);

function stepString_(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  const rel = relative.bind(this);
  const monzos = scale.map(i => rel(i).value);
  return stepString(monzos);
}
Object.defineProperty(stepString_, 'name', {
  value: 'stepString',
  enumerable: false,
});
stepString_.__doc__ =
  'Obtain the step string associated with the scale e.g. "LLsLLLs" for Ionian.';
stepString_.__node__ = builtinNode(stepString_);

function slice(
  array: string | Interval[],
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

function random() {
  const value = TimeMonzo.fromValue(Math.random());
  return new Interval(value, 'linear');
}
random.__doc__ = 'Obtain a random value between (linear) 0 and 1.';
random.__node__ = builtinNode(random);

function randomCents() {
  const value = TimeMonzo.fromCents(Math.random());
  return new Interval(value, 'logarithmic');
}
randomCents.__doc__ =
  'Obtain random cents between (logarithmic) 0.0c and 1.0c.';
randomCents.__node__ = builtinNode(randomCents);

function floor(this: ExpressionVisitor, interval: Interval) {
  interval = relative.bind(this)(interval);
  const n = Math.floor(interval.value.valueOf());
  return Interval.fromInteger(n, interval);
}
floor.__doc__ = 'Round value down to the nearest integer.';
floor.__node__ = builtinNode(floor);

function round(this: ExpressionVisitor, interval: Interval) {
  interval = relative.bind(this)(interval);
  const n = Math.round(interval.value.valueOf());
  return Interval.fromInteger(n, interval);
}
round.__doc__ = 'Round value to the nearest integer.';
round.__node__ = builtinNode(round);

function trunc(this: ExpressionVisitor, interval: Interval) {
  interval = relative.bind(this)(interval);
  const n = Math.trunc(interval.value.valueOf());
  return Interval.fromInteger(n, interval);
}
trunc.__doc__ = 'Truncate value towards zero to the nearest integer.';
trunc.__node__ = builtinNode(trunc);

function ceil(this: ExpressionVisitor, interval: Interval) {
  interval = relative.bind(this)(interval);
  const n = Math.ceil(interval.value.valueOf());
  return Interval.fromInteger(n, interval);
}
ceil.__doc__ = 'Round value up to the nearest integer.';
ceil.__node__ = builtinNode(ceil);

function abs(interval: Interval) {
  requireParameters({interval});
  return interval.abs();
}
abs.__doc__ = 'Calculate the absolute value of the interval.';
abs.__node__ = builtinNode(abs);

export function minimum(this: ExpressionVisitor, ...args: Interval[]) {
  const c = compare.bind(this);
  return args.slice(1).reduce((a, b) => (c(a, b) <= 0 ? a : b), args[0]);
}
minimum.__doc__ = 'Obtain the argument with the minimum value.';
minimum.__node__ = builtinNode(minimum);

export function maximum(this: ExpressionVisitor, ...args: Interval[]) {
  const c = compare.bind(this);
  return args.slice(1).reduce((a, b) => (c(a, b) >= 0 ? a : b), args[0]);
}
maximum.__doc__ = 'Obtain the argument with the maximum value.';
maximum.__node__ = builtinNode(maximum);

export function sort(
  this: ExpressionVisitor,
  scale?: SonicWeaveValue,
  compareFn?: Function
) {
  scale ??= this.getCurrentScale();
  if (!Array.isArray(scale)) {
    throw new Error('Only arrays can be sorted.');
  }
  if (compareFn === undefined) {
    scale.sort(compare.bind(this));
  } else {
    scale.sort((a, b) =>
      (compareFn.bind(this)(a, b) as Interval).value.valueOf()
    );
  }
}
sort.__doc__ = 'Sort the current/given scale in ascending order.';
sort.__node__ = builtinNode(sort);

export function sorted(
  this: ExpressionVisitor,
  scale?: Interval[],
  compareFn?: Function
) {
  scale ??= this.getCurrentScale();
  scale = [...scale];
  sort.bind(this)(scale, compareFn);
  return scale;
}
sorted.__doc__ =
  'Obtain a sorted copy of the current/given scale in ascending order.';
sorted.__node__ = builtinNode(sorted);

function uniquesOf(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  const seen = new Set<number>();
  const result: Interval[] = [];
  for (const interval of scale) {
    const value = interval.valueOf();
    if (seen.has(value)) {
      continue;
    }
    result.push(interval);
    seen.add(value);
  }
  return result;
}
uniquesOf.__doc__ =
  'Obtain a copy of the current/given scale with only unique intervals kept.';
uniquesOf.__node__ = builtinNode(uniquesOf);

function keepUnique(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  const uniques = uniquesOf.bind(this)(scale);
  scale.length = 0;
  scale.push(...uniques);
}
keepUnique.__doc__ = 'Only keep unique intervals in the current/given scale.';
keepUnique.__node__ = builtinNode(keepUnique);

function reverse(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  scale.reverse();
}
reverse.__doc__ = 'Reverse the order of the current/given scale.';
reverse.__node__ = builtinNode(reverse);

function reversed(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  scale = [...scale];
  reverse.bind(this)(scale);
  return scale;
}
reversed.__doc__ =
  'Obtain a copy of the current/given scale in reversed order.';
reversed.__node__ = builtinNode(reversed);

function pop(this: ExpressionVisitor, scale?: Interval[], index?: Interval) {
  scale ??= this.getCurrentScale();
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
pop.__node__ = builtinNode(pop);

function popAll(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  const result = [...scale];
  scale.length = 0;
  return result;
}
popAll.__doc__ = 'Remove and return all intervals in the current/given scale.';
popAll.__node__ = builtinNode(popAll);

function push(
  this: ExpressionVisitor,
  interval: Interval,
  scale?: Interval[],
  index?: Interval
) {
  requireParameters({interval});
  scale ??= this.getCurrentScale();
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
push.__node__ = builtinNode(push);

function shift(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  if (!scale.length) {
    throw new Error('Shift from an empty scale');
  }
  return scale.shift()!;
}
shift.__doc__ =
  'Remove and return the first interval in the current/given scale.';
shift.__node__ = builtinNode(shift);

function unshift(
  this: ExpressionVisitor,
  interval: Interval,
  scale?: Interval[]
) {
  requireParameters({interval});
  scale ??= this.getCurrentScale();
  scale.unshift(interval);
}
unshift.__doc__ =
  'Prepend an interval at the beginning of the current/given scale.';
unshift.__node__ = builtinNode(unshift);

function insert(
  this: ExpressionVisitor,
  interval: Interval,
  scale?: Interval[]
) {
  requireParameters({interval});
  scale ??= this.getCurrentScale();
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
insert.__node__ = builtinNode(insert);

function dislodge(
  this: ExpressionVisitor,
  element: Interval,
  scale?: Interval[]
) {
  requireParameters({element});
  scale ??= this.getCurrentScale();
  if (element instanceof Interval) {
    for (let i = 0; i < scale.length; ++i) {
      if (element.strictEquals(scale[i])) {
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
dislodge.__node__ = builtinNode(dislodge);

function extend(
  this: ExpressionVisitor,
  first: Interval[],
  ...rest: Interval[][]
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

function length(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  return fromInteger(scale.length);
}
length.__doc__ = 'Return the number of intervals in the scale.';
length.__node__ = builtinNode(length);

function map(
  this: ExpressionVisitor,
  mapper: (value: any, index: Interval, array: any[]) => unknown,
  scale?: any[]
) {
  requireParameters({mapper});
  mapper = mapper.bind(this);
  scale ??= this.getCurrentScale();
  return scale.map((value, index, arr) =>
    mapper(value, fromInteger(index), arr)
  );
}
map.__doc__ = 'Map a riff over the given/current scale producing a new scale.';
map.__node__ = builtinNode(map);

function remap(
  this: ExpressionVisitor,
  mapper: (value: any, index: Interval, array: any[]) => unknown,
  scale?: any[]
) {
  requireParameters({mapper});
  scale ??= this.getCurrentScale();
  const mapped = map.bind(this)(mapper, scale);
  scale.length = 0;
  scale.push(...mapped);
}
remap.__doc__ =
  'Map a riff over the given/current scale replacing the contents.';
remap.__node__ = builtinNode(remap);

function filter(
  this: ExpressionVisitor,
  tester: (value: any, index: Interval, array: any[]) => SonicWeaveValue,
  scale?: any[]
) {
  requireParameters({tester});
  tester = tester.bind(this);
  scale ??= this.getCurrentScale();
  return scale.filter((value, index, arr) =>
    sonicTruth(tester(value, fromInteger(index), arr))
  );
}
filter.__doc__ =
  'Obtain a copy of the given/current scale containing values that evaluate to `true` according to the `tester` riff.';
filter.__node__ = builtinNode(filter);

function distill(
  this: ExpressionVisitor,
  tester: (value: any, index: Interval, array: any[]) => SonicWeaveValue,
  scale?: any[]
) {
  requireParameters({tester});
  scale ??= this.getCurrentScale();
  const filtered = filter.bind(this)(tester, scale);
  scale.length = 0;
  scale.push(...filtered);
}
distill.__doc__ =
  'Remove intervals from the given/current scale that evaluate to `false` according to the `tester` riff.';
distill.__node__ = builtinNode(distill);

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
  scale ??= this.getCurrentScale();
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
arrayReduce.__node__ = builtinNode(arrayReduce);

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
  scale ??= this.getCurrentScale();
  return [].concat(...Array(c).fill(scale));
}
arrayRepeat.__doc__ = 'Repeat the given/current array or string `count` times.';
arrayRepeat.__node__ = builtinNode(arrayRepeat);

function repr_(
  this: ExpressionVisitor,
  value: SonicWeaveValue | null,
  depth = 2
): string {
  if (value === null) {
    return '';
  }
  if (value === undefined) {
    return 'niente';
  }
  if (value instanceof Interval) {
    return value.toString(this.rootContext);
  }
  if (Array.isArray(value)) {
    if (depth < 0) {
      return '[Array]';
    }
    const s = repr_.bind(this);
    return '[' + value.map(e => s(e, depth - 1)).join(', ') + ']';
  }
  if (typeof value === 'function') {
    return value.__node__.text;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value instanceof Color || value instanceof Val) {
    return value.toString();
  }
  if (typeof value === 'object') {
    const s = repr_.bind(this);
    return (
      '{' +
      Object.entries(value)
        .map(([k, v]) => `${s(k)}: ${s(v)}`)
        .join(', ') +
      '}'
    );
  }
  return `${value}`;
}

export function entries(record: SonicWeaveValue) {
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

export function repr(this: ExpressionVisitor, value: SonicWeaveValue) {
  return repr_.bind(this)(value);
}
repr.__doc__ =
  'Obtain a string representation of the value (with color and label).';
repr.__node__ = builtinNode(repr);

export function str(this: ExpressionVisitor, value: SonicWeaveValue) {
  if (value instanceof Interval) {
    return value.str(this.rootContext);
  }
  return repr_.bind(this)(value);
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
  if (x?.node?.type === 'CentsLiteral') {
    return x.totalCents().toFixed(fractionDigits);
  }
  return x.value.valueOf().toFixed(fractionDigits);
}

function rgb(red: Interval, green: Interval, blue: Interval) {
  requireParameters({red, green, blue});
  return new Color(`rgb(${cc(red)}, ${cc(green)}, ${cc(blue)})`);
}
rgb.__doc__ =
  'RGB color (Red range 0-255, Green range 0-255, Blue range 0-255).';
rgb.__node__ = builtinNode(rgb);

function rgba(red: Interval, green: Interval, blue: Interval, alpha: Interval) {
  requireParameters({red, green, blue, alpha});
  return new Color(
    `rgba(${cc(red)}, ${cc(green)}, ${cc(blue)}, ${cc(alpha, 5)})`
  );
}
rgba.__doc__ =
  'RGBA color (Red range 0-255, Green range 0-255, Blue range 0-255, Alpha range 0-1).';
rgba.__node__ = builtinNode(rgba);

function hsl(hue: Interval, saturation: Interval, lightness: Interval) {
  requireParameters({hue, saturation, lightness});
  return new Color(`hsl(${cc(hue)}, ${cc(saturation)}%, ${cc(lightness)}%)`);
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
    `hsla(${cc(hue)}, ${cc(saturation)}%, ${cc(lightness)}%, ${cc(alpha, 5)})`
  );
}
hsla.__doc__ =
  'HSLA color (Hue range 0-360, Saturation range 0-100, Lightness range 0-100, Alpha range 0-1).';
hsla.__node__ = builtinNode(hsla);

export function centsColor(interval: Interval) {
  requireParameters({interval});
  const octaves = interval.totalCents() / 1200;
  const h = octaves * 360;
  const s = Math.tanh(1 - octaves * 0.5) * 50 + 50;
  const l = Math.tanh(octaves * 0.2) * 50 + 50;
  return new Color(`hsl(${h.toFixed(3)}, ${s.toFixed(3)}%, ${l.toFixed(3)}%)`);
}
centsColor.__doc__ =
  'Color based on the size of the interval. Hue wraps around every 1200 cents.';
centsColor.__node__ = builtinNode(centsColor);

// Prime colors for over/under.
const PRIME_RGB = [
  // 2
  [
    [0, 0, 0],
    [0, 0, 0],
  ],
  // 3
  [
    [60, 60, 60],
    [-60, -60, -60],
  ],
  // 5
  [
    [255, 255, 0],
    [0, 255, 0],
  ],
  // 7
  [
    [0, 0, 255],
    [255, 0, 0],
  ],
  // 11
  [
    [180, 190, 250],
    [250, 180, 190],
  ],
  // 13
  [
    [255, -100, 255],
    [-100, 255, 255],
  ],
];

function tanh255(x: number) {
  return (127.5 * Math.tanh(x / 300 - 0.75) + 127.5).toFixed(3);
}

export function factorColor(interval: Interval) {
  requireParameters({interval});
  let r = 0;
  let g = 0;
  let b = 0;
  const monzo = interval.value.primeExponents.map(f => f.valueOf());
  for (let i = 0; i < Math.min(monzo.length, PRIME_RGB.length); ++i) {
    const prgb = monzo[i] > 0 ? PRIME_RGB[i][0] : PRIME_RGB[i][1];
    const m = Math.abs(monzo[i]);
    r += prgb[0] * m;
    g += prgb[1] * m;
    b += prgb[2] * m;
  }
  return new Color(`rgb(${tanh255(r)}, ${tanh255(g)}, ${tanh255(b)})`);
}
factorColor.__doc__ = 'Color an interval based on its prime factors.';
factorColor.__node__ = builtinNode(factorColor);

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
  NaN: NAN,
  Infinity: INFINITY,
  // First-party wrappers
  numComponents,
  stepSignature,
  // Third-party wrappers
  mosSubset,
  isPrime,
  primes,
  fareySequence,
  fareyInterior,
  // Domain conversion
  simplify,
  bleach,
  linear,
  logarithmic,
  cologarithmic,
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
  // Other
  track,
  trackingIds,
  flatten,
  clear,
  tail,
  colorOf,
  labelOf,
  equaveOf,
  withEquave,
  cosJIP,
  JIP,
  PrimeMapping,
  tenneyHeight,
  gcd,
  lcm,
  hasConstantStructure: hasConstantStructure_,
  stepString: stepString_,
  str,
  repr,
  slice,
  zip,
  zipLongest,
  abs,
  minimum,
  maximum,
  random,
  randomCents,
  sort,
  sorted,
  keepUnique,
  uniquesOf,
  reverse,
  reversed,
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
  kCombinations,
  entries,
  // CSS color generation
  rgb,
  rgba,
  hsl,
  hsla,
  centsColor,
  factorColor,
};
