import {
  Fraction,
  kCombinations as xduKCombinations,
  mmod,
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
import {Color, Interval, Val} from './interval';
import {TimeMonzo, getNumberOfComponents, setNumberOfComponents} from './monzo';
import {ExpressionVisitor} from './parser';
import {MosOptions, mos} from 'moment-of-symmetry';
import type {ArrowFunction, FunctionDeclaration, Identifier} from './ast.d.ts';
import {
  FJSFlavor,
  NedjiLiteral,
  RadicalLiteral,
  formatAbsoluteFJS,
} from './expression';
import {TWO, countUpsAndLifts} from './utils';

// Runtime

export interface SonicWeaveFunction extends Function {
  __doc__: string | undefined;
  __node__: FunctionDeclaration | ArrowFunction;
}

export type SonicWeaveValue =
  | SonicWeaveFunction
  | Interval
  | Interval[]
  | Val
  | Color
  | string
  | undefined;

const ZERO = new Fraction(0);
const ZERO_MONZO = new TimeMonzo(ZERO, [], ZERO);
const ONE_MONZO = new TimeMonzo(ZERO, []);

const INT_CACHE = [...Array(100).keys()].map(i => Interval.fromInteger(i));

function fromInteger(n: number) {
  if (n >= 0 && n < INT_CACHE.length) {
    return INT_CACHE[n].shallowClone();
  }
  return Interval.fromInteger(n);
}

export function sonicTruth(test: SonicWeaveValue) {
  if (test instanceof Interval) {
    return Boolean(test.value.residual.n);
  } else if (Array.isArray(test)) {
    return Boolean(test.length);
  }
  return Boolean(test);
}

export function sonicBool(b: boolean) {
  return b
    ? new Interval(ONE_MONZO, 'linear', {type: 'TrueLiteral'})
    : new Interval(ZERO_MONZO, 'linear', {type: 'FalseLiteral'});
}

export function linearOne() {
  return new Interval(ONE_MONZO, 'linear', {type: 'IntegerLiteral', value: 1n});
}

export function builtinNode(builtin: Function): FunctionDeclaration {
  const identifiers: Identifier[] = builtin
    .toString()
    .split('(', 2)[1]
    .split(')', 2)[0]
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length)
    .map(p => ({type: 'Identifier', id: p}));
  return {
    type: 'FunctionDeclaration',
    name: {type: 'Identifier', id: builtin.name},
    parameters: {type: 'Parameters', identifiers},
    body: [],
    text: `riff ${builtin.name} { [native riff] }`,
  };
}

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
  const wrapper = (x: Interval) =>
    new Interval(
      TimeMonzo.fromValue(fn(x.valueOf())),
      LOGS.includes(name) ? 'linear' : x.domain,
      undefined,
      x
    );
  Object.defineProperty(wrapper, 'name', {value: name, enumerable: false});
  wrapper.__doc__ = `Calculate ${String(name)} x.`;
  wrapper.__node__ = builtinNode(wrapper);
  MATH_WRAPPERS[name as string] = wrapper;
}

function atan2(x: Interval, y: Interval) {
  return new Interval(
    TimeMonzo.fromValue(Math.atan2(x.valueOf(), y.valueOf())),
    'linear'
  );
}
atan2.__doc__ = 'Calculate atan2(x, y).';
atan2.__node__ = builtinNode(atan2);

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

// == Third-party wrappers ==
function kCombinations(set: any[], k: Interval) {
  return xduKCombinations(set, k.toInteger());
}
kCombinations.__doc__ = 'Obtain all k-sized combinations in a set';
kCombinations.__node__ = builtinNode(kCombinations);

function isPrime(n: Interval) {
  return sonicBool(xduIsPrime(n.valueOf()));
}
isPrime.__doc__ = 'Return `true` if `n` is a prime number, `false` otherwise.';
isPrime.__node__ = builtinNode(isPrime);

function primes(start: Interval, end?: Interval) {
  return xduPrimes(start.valueOf(), end ? end.valueOf() : undefined).map(p =>
    fromInteger(p)
  );
}
primes.__doc__ =
  'Obtain an array of prime numbers such that start <= p <= end.';
primes.__node__ = builtinNode(primes);

function mosSubset(
  numberOfLargeSteps: Interval,
  numberOfSmallSteps: Interval,
  sizeOfLargeStep?: Interval,
  sizeOfSmallStep?: Interval,
  up?: Interval,
  down?: Interval
) {
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

export function simplify(interval: Interval | Val) {
  if (interval instanceof Val) {
    return new Val(interval.value.clone(), interval.equave.clone());
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

export function bleach(interval: Interval) {
  return new Interval(interval.value.clone(), interval.domain, interval.node);
}
bleach.__doc__ = 'Get rid of interval coloring and label.';
bleach.__node__ = builtinNode(bleach);

export function linear(interval: Interval) {
  return new Interval(interval.value.clone(), 'linear', undefined, interval);
}
linear.__doc__ = 'Convert interval to linear representation.';
linear.__node__ = builtinNode(linear);

export function logarithmic(interval: Interval) {
  return new Interval(
    interval.value.clone(),
    'logarithmic',
    undefined,
    interval
  );
}
logarithmic.__doc__ = 'Convert interval to logarithmic representation.';
logarithmic.__node__ = builtinNode(logarithmic);

export function cologarithmic(interval: Interval) {
  return new Val(interval.value.clone(), interval.value.clone());
}
cologarithmic.__doc__ = 'Convert interval to cologarithmic representation.';
cologarithmic.__node__ = builtinNode(cologarithmic);

export function absolute(this: ExpressionVisitor, interval: Interval) {
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

export function relative(this: ExpressionVisitor, interval: Interval) {
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
  if (value instanceof Interval) {
    const b = sonicBool(sonicTruth(relative.bind(this)(value)));
    b.color = value.color;
    b.label = value.label;
    return b;
  }
  return sonicBool(sonicTruth(value));
}
bool.__doc__ = 'Convert value to a boolean.';
bool.__node__ = builtinNode(bool);

// Coercion: None.
function int(this: ExpressionVisitor, value: Interval) {
  value = relative.bind(this)(value);
  return Interval.fromInteger(value.toInteger());
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
  let value: TimeMonzo | undefined;
  if (tolerance === undefined) {
    if (!converted.value.isFractional()) {
      throw new Error('Input is irrational and no tolerance given.');
    }
    value = converted.value.clone();
  } else {
    const epsilon = tolerance.valueOf();
    const frac = new Fraction(converted.value.valueOf()).simplify(epsilon);
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
  'Convert interval to a fraction. Throws an error if conversion is impossible and no tolerance for approximation is given.';
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
  interval: Interval,
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
    if (accidental === '♮' || accidental === '=') {
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
  return sonicBool(value instanceof Interval);
}
isInterval.__doc__ = 'Return `true` if the value is an interval.';
isInterval.__node__ = builtinNode(isInterval);

function isColor(value: SonicWeaveValue) {
  return sonicBool(value instanceof Color);
}
isColor.__doc__ = 'Return `true` if the value is a color.';
isColor.__node__ = builtinNode(isColor);

function isString(value: SonicWeaveValue) {
  return sonicBool(typeof value === 'string');
}
isString.__doc__ = 'Return `true` if the value is a string.';
isString.__node__ = builtinNode(isString);

function isFunction(value: SonicWeaveValue) {
  return sonicBool(typeof value === 'function');
}
isFunction.__doc__ =
  'Return `true` if the value is a riff or an arrow function.';
isFunction.__node__ = builtinNode(isFunction);

function isArray(value: SonicWeaveValue) {
  return sonicBool(Array.isArray(value));
}
isArray.__doc__ = 'Return `true` if the value is an array.';
isArray.__node__ = builtinNode(isArray);

function isAbsolute(interval: Interval) {
  return sonicBool(interval.isAbsolute());
}
isAbsolute.__doc__ =
  'Return `true` if the interval belongs to the absolute echelon.';
isAbsolute.__node__ = builtinNode(isAbsolute);

function isRelative(interval: Interval) {
  return sonicBool(interval.isRelative());
}
isRelative.__doc__ =
  'Return `true` if the interval belongs to the relative echelon.';
isRelative.__node__ = builtinNode(isRelative);

function isLinear(interval: Interval) {
  return sonicBool(interval.domain === 'linear');
}
isLinear.__doc__ =
  'Return `true` if the interval belongs to the linear domain.';
isLinear.__node__ = builtinNode(isLinear);

function isLogarithmic(interval: Interval) {
  return sonicBool(interval.domain === 'logarithmic');
}
isLogarithmic.__doc__ =
  'Return `true` if the interval belongs to the logarithmic domain.';
isLogarithmic.__node__ = builtinNode(isLogarithmic);

// == Value detection ==

function isInt(interval: Interval) {
  return sonicBool(interval.value.isIntegral());
}
isInt.__doc__ = 'Return `true` if the interval is an integer.';
isInt.__node__ = builtinNode(isInt);

function isRational(interval: Interval) {
  return sonicBool(interval.value.isFractional());
}
isRational.__doc__ = 'Return `true` if the interval is a rational number.';
isRational.__node__ = builtinNode(isRational);

function isRadical(interval: Interval) {
  return sonicBool(!interval.value.isNonAlgebraic());
}
isRadical.__doc__ = 'Return `true` if the interval is an nth root.';
isRadical.__node__ = builtinNode(isRadical);

// == Other ==

export function compare(this: ExpressionVisitor, a: Interval, b: Interval) {
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
  const result = interval.shallowClone();
  result.trackingIds.add(this.rootContext.nextTrackingId());
  return result;
}
track.__doc__ = 'Attach a tracking ID to the interval.';
track.__node__ = builtinNode(track);

function trackingIds(interval: Interval) {
  return Array.from(interval.trackingIds).map(id => fromInteger(id));
}
trackingIds.__doc__ =
  'Obtain an array of the tracking IDs attached to the interval.';
trackingIds.__node__ = builtinNode(trackingIds);

function flatten(array: SonicWeaveValue, depth?: Interval) {
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
  return interval.color;
}
colorOf.__doc__ = 'Return the color of the interval.';
colorOf.__node__ = builtinNode(colorOf);

function labelOf(interval: Interval) {
  return interval.label;
}
labelOf.__doc__ = 'Return the label of the interval.';
labelOf.__node__ = builtinNode(labelOf);

function equaveOf(val: Val) {
  return new Interval(val.equave.clone(), 'linear');
}
equaveOf.__doc__ = 'Return the equave of the val.';
equaveOf.__node__ = builtinNode(equaveOf);

function withEquave(val: Val, equave: Interval) {
  return new Val(val.value.clone(), equave.value.clone());
}
withEquave.__doc__ = 'Change the equave of the val.';
withEquave.__node__ = builtinNode(withEquave);

function cosJIP(
  this: ExpressionVisitor,
  val: Val,
  weighting: 'none' | 'tenney' = 'tenney'
) {
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

export type Subtender = {
  monzo: TimeMonzo;
  subtensions: Set<number>;
};

export function subtensions(monzos: TimeMonzo[]): Subtender[] {
  if (monzos.length < 1) {
    return [];
  }
  const numComponents = Math.max(...monzos.map(m => m.numberOfComponents));
  monzos = monzos.map(m => m.clone());
  const equave = monzos.pop()!;
  monzos.unshift(equave.pow(0));
  for (const monzo of monzos) {
    monzo.numberOfComponents = numComponents;
  }
  const result: Subtender[] = [];
  // Against 1/1
  for (let i = 1; i < monzos.length; ++i) {
    result.push({monzo: monzos[i], subtensions: new Set([i])});
  }
  // Against each other
  for (let i = 1; i < monzos.length; ++i) {
    for (let j = 1; j < monzos.length; ++j) {
      let width = monzos[mmod(i + j, monzos.length)].div(monzos[i]);
      if (i + j >= monzos.length) {
        width = width.mul(equave);
      }
      let unique = true;
      for (const subtender of result) {
        if (width.strictEquals(subtender.monzo)) {
          subtender.subtensions.add(j);
          unique = false;
        }
      }
      if (unique) {
        result.push({monzo: width, subtensions: new Set([j])});
      }
    }
  }
  return result;
}

export function hasConstantStructure(monzos: TimeMonzo[]) {
  if (monzos.length < 1) {
    return false;
  }
  const numComponents = Math.max(...monzos.map(m => m.numberOfComponents));
  monzos = monzos.map(m => m.clone());
  const equave = monzos.pop()!;
  monzos.unshift(equave.pow(0));
  for (const monzo of monzos) {
    monzo.numberOfComponents = numComponents;
  }
  const subtensions: [TimeMonzo, number][] = [];
  // Against 1/1
  for (let i = 1; i < monzos.length; ++i) {
    subtensions.push([monzos[i], i]);
  }
  // Against each other
  for (let i = 1; i < monzos.length; ++i) {
    for (let j = 1; j < monzos.length; ++j) {
      let width = monzos[mmod(i + j, monzos.length)].div(monzos[i]);
      if (i + j >= monzos.length) {
        width = width.mul(equave);
      }
      let unique = true;
      for (const [existing, subtension] of subtensions) {
        if (width.strictEquals(existing)) {
          if (subtension !== j) {
            return false;
          }
          unique = false;
        }
      }
      if (unique) {
        subtensions.push([width, j]);
      }
    }
  }
  return true;
}

function hasConstantStructure_(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  const rel = relative.bind(this);
  const monzos = scale.map(i => rel(i).value);
  return sonicBool(hasConstantStructure(monzos));
}
Object.defineProperty(hasConstantStructure_, 'name', {
  value: 'hasConstantStructure',
  enumerable: false,
});
hasConstantStructure_.__doc__ =
  'Returns `true` if the current/given scale has constant structure (i.e. every scale degree is unambiguous).';
hasConstantStructure_.__node__ = builtinNode(hasConstantStructure);

function slice(
  array: string | Interval[],
  indexStart: Interval,
  indexEnd?: Interval
) {
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

function floor(this: ExpressionVisitor, value: Interval) {
  value = relative.bind(this)(value);
  const n = Math.floor(value.value.valueOf());
  return Interval.fromInteger(n, value);
}
floor.__doc__ = 'Round value down to the nearest integer.';
floor.__node__ = builtinNode(floor);

function round(this: ExpressionVisitor, value: Interval) {
  value = relative.bind(this)(value);
  const n = Math.round(value.value.valueOf());
  return Interval.fromInteger(n, value);
}
round.__doc__ = 'Round value to the nearest integer.';
round.__node__ = builtinNode(round);

function trunc(this: ExpressionVisitor, value: Interval) {
  value = relative.bind(this)(value);
  const n = Math.trunc(value.value.valueOf());
  return Interval.fromInteger(n, value);
}
trunc.__doc__ = 'Truncate value towards zero to the nearest integer.';
trunc.__node__ = builtinNode(trunc);

function ceil(this: ExpressionVisitor, value: Interval) {
  value = relative.bind(this)(value);
  const n = Math.ceil(value.value.valueOf());
  return Interval.fromInteger(n, value);
}
ceil.__doc__ = 'Round value up to the nearest integer.';
ceil.__node__ = builtinNode(ceil);

function abs(value: Interval) {
  return value.abs();
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

function sort(
  this: ExpressionVisitor,
  scale?: Interval[],
  compareFn?: Function
) {
  scale ??= this.getCurrentScale();
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

function sorted(
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
  array?: any[]
) {
  mapper = mapper.bind(this);
  array ??= this.getCurrentScale();
  return array.map((value, index, arr) =>
    mapper(value, fromInteger(index), arr)
  );
}
map.__doc__ = 'Map a riff over the given/current scale producing a new scale.';
map.__node__ = builtinNode(map);

function remap(
  this: ExpressionVisitor,
  mapper: (value: any, index: Interval, array: any[]) => unknown,
  array?: any[]
) {
  array ??= this.getCurrentScale();
  const mapped = map.bind(this)(mapper, array);
  array.length = 0;
  array.push(...mapped);
}
remap.__doc__ =
  'Map a riff over the given/current scale replacing the contents.';
remap.__node__ = builtinNode(remap);

function filter(
  this: ExpressionVisitor,
  tester: (value: any, index: Interval, array: any[]) => SonicWeaveValue,
  array?: any[]
) {
  tester = tester.bind(this);
  array ??= this.getCurrentScale();
  return array.filter((value, index, arr) =>
    sonicTruth(tester(value, fromInteger(index), arr))
  );
}
filter.__doc__ =
  'Obtain a copy of the given/current scale containing values that evaluate to `true` according to the `tester` riff.';
filter.__node__ = builtinNode(filter);

function distill(
  this: ExpressionVisitor,
  tester: (value: any, index: Interval, array: any[]) => SonicWeaveValue,
  array?: any[]
) {
  array ??= this.getCurrentScale();
  const filtered = filter.bind(this)(tester, array);
  array.length = 0;
  array.push(...filtered);
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
  array?: any[],
  initialValue?: any
) {
  if (!(typeof reducer === 'function')) {
    throw new Error('The first argument of arrayReduce must be a function.');
  }
  reducer = reducer.bind(this);
  array ??= this.getCurrentScale();
  if (arguments.length >= 3) {
    return array.reduce(
      (value, currentValue, currentIndex, arr) =>
        reducer(value, currentValue, fromInteger(currentIndex), arr),
      initialValue
    );
  } else {
    return array.reduce((value, currentValue, currentIndex, arr) =>
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
  array?: any[] | string
) {
  const c = count.toInteger();
  if (typeof array === 'string') {
    return array.repeat(c);
  }
  if (c === 0) {
    return [];
  }
  array ??= this.getCurrentScale();
  return [].concat(...Array(c).fill(array));
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
  return `${value}`;
}

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
  console.log(...args.map(a => s(a)));
}
print.__doc__ = 'Print the arguments to the console.';
print.__node__ = builtinNode(print);

function dir(arg: any) {
  console.dir(arg, {depth: null});
}
dir.__doc__ = 'Obtain the javascript representation of the value.';
dir.__node__ = builtinNode(dir);

function doc(riff: SonicWeaveFunction) {
  return riff.__doc__;
}
doc.__doc__ = 'Obtain the docstring of the given riff.';
doc.__node__ = builtinNode(doc);

function help(riff: SonicWeaveFunction) {
  console.log(`Help on ${riff.name}`);
  console.log(riff.__doc__);
  const params = riff.__node__.parameters;
  if (params.identifiers.length || params.rest) {
    console.log('Parameters:');
    const names = params.identifiers.map(p =>
      p.type === 'Identifier' ? p.id : '[...]'
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
  return new Color(`rgb(${cc(red)}, ${cc(green)}, ${cc(blue)})`);
}
rgb.__doc__ =
  'RGB color (Red range 0-255, Green range 0-255, Blue range 0-255).';
rgb.__node__ = builtinNode(rgb);

function rgba(red: Interval, green: Interval, blue: Interval, alpha: Interval) {
  return new Color(
    `rgba(${cc(red)}, ${cc(green)}, ${cc(blue)}, ${cc(alpha, 5)})`
  );
}
rgba.__doc__ =
  'RGBA color (Red range 0-255, Green range 0-255, Blue range 0-255, Alpha range 0-1).';
rgba.__node__ = builtinNode(rgba);

function hsl(hue: Interval, saturation: Interval, lightness: Interval) {
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
  return new Color(
    `hsla(${cc(hue)}, ${cc(saturation)}%, ${cc(lightness)}%, ${cc(alpha, 5)})`
  );
}
hsla.__doc__ =
  'HSLA color (Hue range 0-360, Saturation range 0-100, Lightness range 0-100, Alpha range 0-1).';
hsla.__node__ = builtinNode(hsla);

export function centsColor(interval: Interval) {
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
  // CSS color generation
  rgb,
  rgba,
  hsl,
  hsla,
  centsColor,
  factorColor,
};

export const PRELUDE_VOLATILES = `
riff ablin interval {
  "Convert interval to absolute linear representation.";
  return absolute(linear(interval));
}

riff ablog interval {
  "Convert interval to absolute logarithmic representation.";
  return absolute(logarithmic(interval));
}

riff relin interval {
  "Convert interval to relative linear representation.";
  return relative(linear(interval));
}

riff relog interval {
  "Convert interval to relative logarithmic representation.";
  return relative(logarithmic(interval));
}

riff NFJS interval {
  "Convert interval to (relative) FJS using neutral comma flavors."
  return FJS(interval, 'n');
}

riff absoluteNFJS interval {
  "Convert interval to absolute FJS using neutral comma flavors."
  return absoluteFJS(interval, 'n');
}

riff HEJI interval {
  "Convert interval to (relative) FJS using HEJI comma flavors."
  return FJS(interval, 'h');
}

riff absoluteHEJI interval {
  "Convert interval to absolute FJS using HEJI comma flavors."
  return absoluteFJS(interval, 'h');
}
`;

export const PRELUDE_SOURCE = `
// == Functions ==
riff sanitize interval {
  "Get rid of interval formatting, color and label.";
  return bleach(simplify(interval));
}

riff sqrt x {
  "Calculate the square root of the input.";
  return x ~/^ 2;
}
riff cbrt x {
  "Calculate the cube root of the input.";
  return x ~/^ 3;
}
riff exp x {
  "Calculate e raised to the power of x.";
  return E ~^ x;
}
riff log x y {
  "Calculate the logarithm of x base y. Base defaults to E.";
  y ??= E;
  return x ~/_ y;
}
riff log10 x {
  "Calculate the logarithm of x base 10.";
  return x ~/_ 10;
}
riff log2 x {
  "Calculate the logarithm of x base 2.";
  return x ~/_ 2;
}
riff acosh x {
  "Calculate the inverse hyperbolic cosine of x.";
  return log(x ~+ sqrt(x ~^ 2 ~- 1));
}
riff asinh x {
  "Calculate the inverse hyperbolic sine of x.";
  return log(x ~+ sqrt(x ~^ 2 ~+ 1));
}
riff atanh x {
  "Calculate the inverse hyperbolic tangent of x.";
  return log((1 +~ x) ~% (1 -~ x)) ~% 2;
}
riff cosh x {
  "Calculate the hyperbolic cosine of x.";
  return (exp(x) ~+ exp(-~x)) ~% 2;
}
riff sinh x {
  "Calculate the hyperbolic sine of x.";
  return (exp(x) ~- exp(-~x)) ~% 2;
}
riff tanh x {
  "Calculate the hyperbolic tangent of x.";
  return (exp(x) ~- exp(-~x)) ~% (exp(x) ~+ exp(-~x));
}
riff pow x y {
  "Calculate x to the power of y.";
  return x ~^ y;
}
riff numerator x {
  "Calculate the numerator of x in reduced form.";
  return lcm(1, x);
}
riff denominator x {
  "Calculate the denominator of x in reduced form.";
  return %gcd(1, x);
}
riff sign x {
  "Calculate the sign of x.";
  if (x > 0) return 1;
  if (x < 0) return -1;
  if (x === 0) return 0;
  return NaN;
}
riff oddLimitOf x equave {
  "Calculate the odd limit of x. Here 'odd' means not divisible by the equave (default \`2\`).";
  equave ??= 2;
  const noEquaves = x ~% equave^(x dot %logarithmic(equave));
  return numerator(noEquaves) max denominator(noEquaves);
}
riff hypot ...args {
  "Calculate the square root of the sum of squares of the arguments.";
  return sum(map(a => a ~^ 2, args)) ~/^ 2;
}

riff bpm beats {
  "Calculate the frequency corresponding to the given number of beats per minute.";
  return beats % 60s;
}

riff avg ...terms {
  "Calculate the arithmetic mean of the terms.";
  return arrayReduce(a b => a ~+ b, terms) ~% length(terms);
}

riff havg ...terms {
  "Calculate the harmonic mean of the terms.";
  return arrayReduce(a b => a ~/+ b, terms) ~* length(terms);
}

riff geoavg ...factors {
  "Calculate the geometric mean of the factors.";
  return arrayReduce(a b => a ~* b, factors) ~/^ length(factors);
}

riff circleDifference a b equave {
  "Calculate the geometric difference of two intervals on a circle.";
  equave ??= 2;
  const half = equave ~/^ 2;
  return logarithmic((a ~% b ~* half) ~rd equave ~% half);
}

riff circleDistance a b equave {
  "Calculate the geometric distance of two intervals on a circle.";
  return abs(circleDifference(a, b, equave));
}

riff mtof index {
  "Convert MIDI note number to absolute frequency.";
  return 440 Hz * 2^((index - 69) % 12);
}
riff ftom freq {
  "Convert absolute frequency to MIDI note number / MTS value (fractional semitones with A440 = 69).";
  return (freq % 440 Hz) /_ 2 * 12 + 69;
}

riff void {
  "Get rid of expression results. \`void(i++)\` increments the value but doesn't push anything onto the scale.";
  return;
}

riff sum terms {
  "Calculate the (linear) sum of the terms or the current scale.";
  terms ??= $$;
  return arrayReduce(total element => total +~ element, terms);
}

riff add ...terms {
  "Calculate the (linear) sum of the arguments.";
  return sum(terms);
}

riff prod factors {
  "Calculate the (linear) product of the factors or the current scale i.e. the logarithmic sum.";
  factors ??= $$;
  return arrayReduce(total element => total *~ element, factors);
}

riff mul ...factors {
  "Calculate the (linear) product of the arguments i.e. the logarithmic sum.";
  return prod(factors);
}

riff stackLinear array {
  "Cumulatively sum the numbers of the current/given array.";
  $ = array ?? $$;
  let i = 0;
  while (++i < length($))
    $[i] ~+= $[i-1];
  return;
}

riff cumsum array {
  "Calculate the cumulative sums of the terms in the array.";
  array;
  stackLinear();
}

riff stack array {
  "Cumulatively stack the current/given intervals on top of each other.";
  $ = array ?? $$;
  let i = 0;
  while (++i < length($))
    $[i] ~*= $[i-1];
  return;
}

riff cumprod array {
  "Calculate the cumulative products of the factors in the array i.e. logarithmic cumulative sums.";
  array;
  stack();
}

riff stacked array {
  "Obtain a copy of the current/given intervals cumulatively stacked on top of each other.";
  array;
  stack();
}

riff diff array {
  "Calculate the (linear) differences between the terms.";
  array;
  let i = length($) - 1;
  while (i--)
    $[i + 1] ~-= $[i];
}

riff unstack array {
  "Unstack the current/given scale into steps.";
  $ = array ?? $$;
  let i = length($) - 1;
  while (i--)
    $[i + 1] ~%= $[i];
  return;
}

riff geodiff array {
  "Calculate the geometric differences between the factors.";
  array;
  unstack();
}

riff unstacked array {
  "Calculate the relative steps in the current/given scale.";
  array;
  unstack();
}

riff unperiostack array {
  "Convert the current/given periodic sequence of steps into inflections of the last interval as the guide generator.";
  $ = array ?? $$;
  const first = $[0] ~% $[-1];
  let i = length($) - 1;
  while (i--)
    $[i + 1] ~%= $[i];
  $[0] = first;
  return;
}

riff periodiff array {
  "Calculate the geometric differences of the periodic interval pattern.";
  array;
  unperiostack();
}

riff periostack guideGenerator array {
  "Stack the current/given inflections along with the guide generator into a periodic sequence of steps.";
  if (not isInterval(guideGenerator))
    throw "Guide generator must be an interval.";
  $ = array ?? $$;
  $[0] ~*= guideGenerator;
  let i = 0;
  while (++i < length($))
    $[i] ~*= $[i-1];
  return;
}

riff antiperiodiff constantOfIntegration array {
  "Calculate the cumulative geometric sums of a periodic difference pattern. Undoes what periodiff does.";
  array;
  periostack(constantOfIntegration);
}

riff label labels scale {
  "Apply labels (or colors) from the first array to the current/given scale. Can also apply a single color to the whole scale.";
  scale ??= $$;
  if (isArray(labels)) {
    let i = -1;
    while (++i < length(labels) min length(scale))
      scale[i] = scale[i] labels[i];
  } else {
    remap(i => i labels, scale);
  }
}

riff labeled labels scale {
  "Apply labels (or colors) from the first array to a copy of the current/given scale. Can also apply a single color to the whole scale.";
  scale ??= $$;
  if (isArray(labels)) {
    for (const [i l] of zip(scale, labels)) {
      i l;
    }
    scale[length(labels)..];
  } else {
    scale;
    i => i labels;
  }
}

riff enumerate array {
  "Produce an array of [index, element] pairs from the given current/given array.";
  array ??= $$;
  let i = 0;
  return [[i++, element] for element of array];
}

riff tune a b numIter weighting {
  "Find a combination of two vals that is closer to just intonation.";
  numIter ??= 1;
  while (numIter--) {
    const x = 2 * a - b;
    const y = a + b;
    const z = 2 * b - a;

    [a b] = sorted([a, b, x, y, z], u v => cosJIP(v, weighting) - cosJIP(u, weighting));
  }
  return a;
}

riff tune3 a b c numIter weighting {
  "Find a combination of three vals that is closer to just intonation.";
  numIter ??= 1;
  while (numIter--) {
    const combos = [
      a,
      b,
      c,
      a + b,
      a + c,
      b + c,
      2 * a - b,
      2 * a - c,
      2 * b - a,
      2 * b - c,
      2 * c - a,
      2 * c - b,
      a + b + c,
      a + b - c,
      a + c - b,
      b + c - a,
    ];

    [a b c] = sorted(combos, u v => cosJIP(v, weighting) - cosJIP(u, weighting));
  }
  return a;
}

riff colorsOf scale {
  "Obtain an array of colors of the current/given scale.";
  return map(colorOf, scale ?? $$);
}

riff labelsOf scale {
  "Obtain an array of labels of the current/given scale.";
  return map(labelOf, scale ?? $$);
}

riff edColors divisions offset equave {
  "Color every interval in the scale with hue repeating every step of an equal division (default \`12\` \`divisions\`) of \`equave\` (default \`2\`). \`offset\` rotates the hue wheel.";
  divisions ??= 12;
  offset ??= 0;
  equave ??= 2;
  const base = (equave ~/^ divisions) ~/^ 360;
  riff edColor interval {
    "Color an interval wih hue repeating every step of an equal divisions.";
    return interval hsl((offset ~+ interval ~/_ base) ~mod 360, 100, 50);
  }
  return edColor;
}

// == Scale generation ==
riff ed divisions equave {
  "Generate an equal temperament with the given number of divisions of the given equave/octave.";
  [1..divisions];
  if (equave === niente) step => step \\ divisions;
  else step => step \\ divisions < equave >;
}

riff subharmonics start end {
  "Generate a subharmonic segment including the given start and end points.";
  /end::start;
}

riff mos numberOfLargeSteps numberOfSmallSteps sizeOfLargeStep sizeOfSmallStep up down equave {
  "Generate a Moment-Of-Symmetry scale with the given number number of large and small steps. \\
  Size of the large step defaults to 2. Size of the small step defaults to 1. \\
  \`up\` defines the brightness of the mode i.e. the number of major intervals from the root. \\
  Alternatively \`down\` defines the darkness of the mode i.e. the number of minor intervals from the root. \\
  The default \`equave\` is the octave \`2/1\`.";
  mosSubset(numberOfLargeSteps, numberOfSmallSteps, sizeOfLargeStep, sizeOfSmallStep, up, down);
  const divisions = $[-1];
  if (equave === niente) step => step \\ divisions;
  else step => step \\ divisions < equave >;
}

riff rank2 generator up down period numPeriods {
  "Generate a finite segment of a Rank-2 scale generated by stacking the given generator against the given period (or the octave \`2/1\` by default). \`up\` and \`down\` must be multiples of \`numPeriods\`.";
  down ??= 0;
  period ??= 2;
  numPeriods ??= 1;
  if (up ~mod numPeriods)
    throw "Up must be a multiple of the number of periods.";
  if (down ~mod numPeriods)
    throw "Down must be a multiple of the number of periods.";
  up ~%= numPeriods
  down ~%= numPeriods
  [generator ~^ i ~rd period for i of [-down..-1]];
  [generator ~^ i ~rd period for i of [1..up]];
  period;
  sort();
  repeat(numPeriods);
}

riff cps factors count equave withUnity {
  "Generate a combination product set from the given factors and combination size.";
  equave ??= 2;
  for (const combination of kCombinations(factors, count))
    prod(combination);
  sort();
  if (not withUnity) ground();
  equave;
  reduce();
  sort();
}

riff wellTemperament commaFractions comma down generator period {
  "Generate a well-temperament by cumulatively modifying the pure fifth \`3/2\` (or a given generator) by fractions of the syntonic/given comma.";
  comma ??= 81/80;
  down ??= 0;
  generator ??= 3/2;
  period ??= 2;

  const up = length(commaFractions) - down;

  let accumulator = 1;
  let i = 0;
  while (i < up) {
    accumulator *~= generator ~* comma ~^ commaFractions[down + i++];
    accumulator;
  }

  accumulator = 1;
  i = 0;
  while (i < down) {
    accumulator %~= generator ~* comma ~^ commaFractions[down - 1 - i++];
    accumulator;
  }
  period;
  reduce();
  sort();
}

riff parallelotope basis ups downs equave {
  "Span a parallelotope by extending a basis combinatorically.";
  basis = basis[..];
  ups = ups[..] if ups else [];
  downs = downs[..] if downs else [];
  equave ??= 2;
  while (length(ups) < length(basis)) push(1, ups);
  while (length(downs) < length(basis)) push(0, downs);

  equave ~^ 0;

  while (basis) {
    const generator = pop(basis);
    const up = pop(ups);
    const down = pop(downs);

    popAll($$) tns~ [generator ~^ i for i of [-down..up]];
  }

  i => i ~rdc equave;

  sort();
}

riff eulerGenus guide root equave {
  "Span a lattice from all divisors of the guide-tone rotated to the root-tone.";
  root ??= 1;
  equave ??= 2;
  if (guide ~mod root) {
    throw "Root must divide the guide tone.";
  }

  let remainder = guide ~* 0;
  while (++remainder < equave) {
    let n = remainder;
    while (n <= guide) {
      if (not (guide ~mod n)) n;
      n ~+= equave;
    }
  }
  i => i ~% root ~rdc equave;
  sort();
  pop() colorOf(equave) labelOf(equave);
}

riff octaplex b0 b1 b2 b3 equave withUnity {
  "Generate a 4-dimensional octaplex a.k.a. 20-cell from the given basis intervals.";
  equave ??= 2;
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      b0 ~^ s1 ~* b1 ~^ s2;
      b0 ~^ s1 ~* b2 ~^ s2;
      b0 ~^ s1 ~* b3 ~^ s2;
      b1 ~^ s1 ~* b3 ~^ s2;
      b2 ~^ s1 ~* b3 ~^ s2;
      b1 ~^ s1 ~* b2 ~^ s2;
    }
  }
  sort();
  if (not withUnity) ground();
  equave;
  reduce();
  sort();
}

riff gs generators size period numPeriods {
  "Stack a periodic array of generators up to the given size which must be a multiple of the number of periods.";
  period ??= 2;
  numPeriods ??= 1;
  size = round(size % numPeriods);
  let i = 0;
  while (--size > 0) {
    generators[i++ mod length(generators)];
  }
  simplify;
  stack();
  period;
  reduce();
  sort();
  repeat(numPeriods);
}

riff csgs generators ordinal period numPeriods maxSize {
  "Generate a constant structure generator sequence. Zero ordinal corresponds to the (trivial) stack of all generators while positive ordinals denote scales with constant structure ordered by increasing size.";
  ordinal ??= 1;
  period ??= 2;
  numPeriods ??= 1;
  maxSize ??= 100;
  cumprod(map(simplify, generators));
  let accumulator = $[-1];
  period;
  reduce();
  sort();
  let i = 0;
  while (ordinal) {
    accumulator *~= generators[i++ mod length(generators)];
    push(accumulator ~rd period, $$);
    if (length($$) > maxSize) {
      throw "No constant structure found before reaching maximum size.";
    }
    sort($$);
    if (hasConstantStructure($$)) {
      void(ordinal--);
    }
  }
  repeat(numPeriods);
}

riff vao denominator maxNumerator divisions tolerance equave {
  "Generate a vertically aligned object i.e. a subset of the harmonic series that sounds like the given equal temperament (default \`12\`) within the given tolerance (default \`5c\`). Harmonics equated by the \`equave\` (default \`2/1\`) are only included once. The returned segment begins at unison.";
  divisions ??= 12;
  tolerance ??= 5.0;
  equave ??= 2;
  const step = equave /^ divisions;
  const witnesses = [];
  for (const numerator of [denominator .. maxNumerator]) {
    const candidate = numerator % denominator;
    if (abs(logarithmic((candidate ~by step) %~ candidate)) < tolerance) {
      const witness = candidate ~rd equave;
      if (witness not of witnesses) {
        candidate;
        push(witness, witnesses);
      }
    }
  }
}

riff concordanceShell denominator maxNumerator divisions tolerance equave {
  "Generate a concordance shell i.e. a vertically aligned object reduced to an equal temperament (default \`12\`). Intervals are labeled by their harmonics. \`tolerance\` defaults to \`5c\`. \`equave\` defaults to \`2/1\`.";
  divisions ??= 12;
  equave ??= 2;
  let step = 1 \\ divisions <equave>;
  if (equave === 2) {
    step = 1 \\ divisions;
  }
  const result = [];
  for (const harmonic of vao(denominator, maxNumerator, divisions, tolerance, equave)) {
    const candidate = (harmonic by~ step) ~rdc equave;
    const label = str(simplify(harmonic ~* denominator))
    if (candidate of result) {
      const existing = dislodge(candidate, result);
      push(existing concat(labelOf(existing), ' & ', label), result);
    } else {
      push(candidate label, result);
    }
  }
  equave = divisions * step;
  if (equave not of result) {
    equave;
  }
  result;
  sort();
}

riff oddLimit limit equave {
  "Generate all fractions with odd limit <= \`limit\` reduced to between 1 (exclusive) and \`equave\` (inclusive).";
  equave ??= 2;
  let remainder = 0;
  while (++remainder < equave) {
    [remainder, remainder ~+ equave .. limit];
  }
  const odds = popAll();
  [n % d for n of odds for d of odds if gcd(n, d) === 1];
  i => i rdc equave;
  sort();
}

// == Scale modification ==
riff reduce scale {
  "Reduce the current/given scale by its equave.";
  $ = scale ?? $$;
  i => i ~rdc $[-1];
  return;
}

riff reduced scale {
  "Obtain a copy of the current/given scale reduced by its equave.";
  scale ?? $$;
  reduce();
}

riff revpose scale {
  "Change the sounding direction. Converts a descending scale to an ascending one."
  $ = scale ?? $$;
  const equave = pop();
  i => i ~% equave;
  reverse();
  %equave;
  return;
}

riff revposed scale {
  "Obtain a copy of the current/given scale that sounds in the opposite direction."
  scale ?? $$;
  revpose();
}

riff retrovert scale {
  "Retrovert the current/given scale (negative harmony i.e reflect and transpose).";
  $ = scale ?? $$;
  const equave = pop();
  i => equave %~ i;
  reverse();
  equave;
  return;
}

riff retroverted scale {
  "Obtain an retroverted copy of the current/given scale (negative harmony i.e. reflect and transpose).";
  scale ?? $$;
  retrovert();
}

riff reflect scale {
  "Reflect the current/given scale about unison.";
  $ = scale ?? $$;
  i => %~i;
  return;
}

riff reflected scale {
  "Obtain a copy of the current/given scale reflected about unison.";
  map(i => %~i, scale ?? $$);
}

riff u scale {
  "Obtain a undertonal reflection of the current/given overtonal scale.";
  return reflected(scale)
};

riff o scale {
  "Obtain a copy of the current/given scale in the default overtonal interpretation.";
  scale;
}

riff rotate onto scale {
  "Rotate the current/given scale onto the given degree.";
  onto ??= 1;
  $ = scale ?? $$;
  onto = onto mod length($);
  if (not onto) return;
  const equave = $[-1];
  while (--onto) equave *~ shift();
  const root = shift();
  i => i ~% root;
  equave colorOf(root) labelOf(root);
  return;
}

riff rotated onto scale {
  "Obtain a copy of the current/given scale rotated onto the given degree.";
  scale ?? $$;
  rotate(onto);
}

riff repeated times scale {
  "Stack the current/given scale on top of itself.";
  scale ??= $$;
  times ??= 2;
  if (not times) {
    return [];
  }
  const equave = scale[-1];
  let i = -1;
  while (++i < times) {
    scale;
    interval => interval ~* equave ~^ i;
  }
}

riff repeat times scale {
  "Stack the current scale on top of itself. Clears the scale if the number of repeats is zero.";
  $ = scale ?? $$;
  const segment = $[..];
  clear();
  repeated(times, segment);
  return;
}

riff flatRepeat times scale {
  "Repeat the current/given intervals as-is without accumulating equaves. Clears the scale if the number of repeats is zero.";
  $ = scale ?? $$;
  const segment = $[..];
  clear();
  arrayRepeat(times, segment);
  return;
}

riff ground scale {
  "Use the first interval in the current/given scale as the implicit unison.";
  $ = scale ?? $$;
  const root = shift();
  i => i ~% root;
  return;
}

riff grounded scale {
  "Obtain a copy of the current/given scale that uses the first interval as the implicit unison.";
  scale ?? $$;
  ground();
}

riff elevate scale {
  "Remove denominators and make the root explicit in the current/given scale.";
  $ = scale ?? $$;
  unshift(sanitize($[-1]~^0));
  const root = sanitize(%~gcd());
  i => i ~* root;
  return;
}

riff elevated scale {
  "Obtain a copy of the current/given scale with denominators removed and the root made explicit.";
  scale ?? $$;
  elevate();
}

riff subsetOf degrees scale {
  "Obtain a copy of the current/given scale with only the given degrees kept. Omitting the zero degree rotates the scale.";
  scale = (scale ?? $$)[..];
  const equave = pop(scale);
  unshift(equave ~^ 0, scale);
  filter(_ i => i of degrees, scale);
  ground();
  equave;
}

riff subset degrees scale {
  "Only keep the given degrees of the current/given scale. Omitting the zero degree rotates the scale.";
  $ = scale ?? $$;
  const result = subsetOf(degrees);
  clear();
  result;
  return;
}

riff toHarmonics fundamental scale {
  "Quantize the current/given scale to harmonics of the given fundamental.";
  $ = scale ?? $$;
  i => i to~ %~fundamental colorOf(i) labelOf(i);
  return;
}

riff harmonicsOf fundamental scale {
  "Obtain a copy of the current/given scale quantized to harmonics of the given fundamental.";
  scale ?? $$;
  toHarmonics();
}

riff toSubharmonics overtone scale {
  "Quantize the current/given scale to subharmonics of the given overtone.";
  $ = scale ?? $$;
  i => %~(%~i to~ %~overtone) colorOf(i) labelOf(i);
  return;
}

riff subharmonicsOf overtone scale {
  "Obtain a copy of the current/given scale quantized to subharmonics of the given overtone.";
  scale ?? $$;
  toSubharmonics();
}

riff equalize divisions scale {
  "Quantize the current/given scale to given equal divisions of its equave.";
  $ = scale ?? $$;
  let step = 1 \\ divisions;
  if ($[-1] != 2)
    step = step <$[-1]>;
  i => i by~ step colorOf(i) labelOf(i);
  return;
}

riff equalized divisions scale {
  "Obtain a copy of the current/given scale quantized to given equal divisions of its equave.";
  scale ?? $$;
  equalize();
}

// Assumes a sorted scale
riff keepUnique scale {
  "Only keep unique intervals in the current/given scale.";
  scale ??= $$;
  let last = niente;
  let i = length(scale);
  while (i--) {
    const current = shift(scale);
    if (last != current) {
      current;
      last = current;
    }
  }
  i => push(i, scale);
  return;
}

riff uniquesOf scale {
  "Obtain a copy of the current/given scale with only unique intervals kept.";
  scale ?? $$;
  keepUnique();
}

riff mergeOffset offsets overflow scale {
  "Merge the given offset or polyoffset of the current/given scale onto itself. \`overflow\` is one of 'keep', 'drop' or 'wrap' and controls what to do with offset intervals outside of current bounds.";
  overflow ??= 'drop';
  if (not isArray(offsets)) offsets = [offsets];
  $ = scale ?? $$;
  const equave = pop();

  unshift(equave ~^ 0);
  const copies = $ tns~ offsets;
  void(shift());

  if (overflow === 'drop') {
    remap(copy => filter(i => i > 1 and i < equave, copy), copies);
  } else if (overflow === 'wrap') {
    remap(copy => map(i => i ~rdc equave, copy), copies);
  } else {
    equave;
  }

  copies;
  sort();
  if (overflow !== 'keep') {
    equave;
  }
  keepUnique();
  return;
}

riff withOffset offsets overflow scale {
  "Obtain a copy of the current/given scale with the given offset or polyoffset merged into it. \`overflow\` is one of 'keep', 'drop' or 'wrap' and controls what to do with offset intervals outside of current bounds.";
  scale ?? $$;
  mergeOffset(offsets, overflow);
}

riff stretch amount scale {
  "Stretch the current/given scale by the given amount. A value of \`1\` corresponds to no change.";
  $ = scale ?? $$;
  i => i ~^ amount;
  return;
}

riff stretched amount scale {
  "Obtain a copy of the current/given scale streched by the given amount. A value of \`1\` corresponds to no change.";
  map(i => i ~^ amount, scale ?? $$);
}

riff randomVariance amount varyEquave scale {
  "Add random variance to the current/given scale.";
  $ = scale ?? $$;
  let equave;
  if (not varyEquave) equave = pop();
  i => i ~* (amount ~^ (2 * random() - 1));
  if (not varyEquave) equave;
  return;
}

riff randomVaried amount varyEquave scale {
  "Obtain a copy of the current/given scale with random variance added.";
  scale ?? $$;
  randomVariance(amount, varyEquave);
}

riff coalesced tolerance action scale {
  "Obtain a copy of the current/given scale where groups of intervals separated by \`tolerance\` (default 3.5 cents) are coalesced into one. \`action\` is one of 'simplest', 'lowest', 'highest', 'avg', 'havg' or 'geoavg' defaulting to 'simplest'.";
  tolerance ??= 3.5;
  scale ??= $$;
  let last;
  let group = [];
  for (const [i interval] of enumerate(scale)) {
    if (group and (abs(logarithmic(last %~ interval)) > tolerance or i === length(scale)-1)) {
      if (action === 'lowest') {
        group[0];
      } else if (action === 'highest') {
        group[-1];
      } else if (action === 'avg') {
        avg(...group);
      } else if (action === 'havg') {
        havg(...group);
      } else if (action === 'geoavg') {
        geoavg(...group);
      } else {
        sort(group, a b => tenneyHeight(a) - tenneyHeight(b));
        group[0];
      }
      group = [];
    }
    last = interval;
    push(interval, group);
  }
  scale[-1];
}

riff coalesce tolerance action scale {
  "Coalesce intervals in the current/given scale separated by \`tolerance\` (default 3.5 cents) into one. \`action\` is one of 'simplest', 'lowest', 'highest', 'avg', 'havg' or 'geoavg' defaulting to 'simplest'.";
  $ = scale ?? $$;
  scale = $[..];
  clear();
  coalesced(tolerance, action, scale);
  return;
}

riff replaced interval replacement scale {
  "Obtain a copy of the current/given scale with occurences of \`interval\` replaced by \`replacement\`.";
  scale ??= $$;
  for (const existing of scale) {
    if (existing === interval) {
      replacement;
    } else {
      existing;
    }
  }
}

riff replace interval replacement scale {
  "Replace occurences of \`interval\` in the current/given scale by \`replacement\`.";
  $ = scale ?? $$;
  scale = $[..];
  clear();
  replaced(interval, replacement, scale);
  return;
}

riff replaceStep step replacement scale {
  "Replace relative occurences of \`step\` in the current/given scale by \`replacement\`.";
  $ = scale ?? $$;
  unstack();
  replace(step, replacement);
  stack();
  return;
}

riff stepReplaced step replacement scale {
  "Obtain a copy of the current/given scale with relative occurences of \`step\` replaced by \`replacement\`.";
  return cumprod(replaced(step, replacement, geodiff(scale)));
}
`;
