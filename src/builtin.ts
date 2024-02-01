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
} from 'xen-dev-utils';
import {Color, Interval} from './interval';
import {TimeMonzo, getNumberOfComponents, setNumberOfComponents} from './monzo';
import {type ExpressionVisitor} from './parser';
import {MosOptions, mos} from 'moment-of-symmetry';
import {asAbsoluteFJS, asFJS} from './fjs';
import type {ArrowFunction, FunctionDeclaration, Identifier} from './ast.d.ts';

// Runtime

export interface SonicWeaveFunction extends Function {
  __doc__: string | undefined;
  __node__: FunctionDeclaration | ArrowFunction;
}

export type SonicWeaveValue =
  | SonicWeaveFunction
  | Interval
  | Interval[]
  | Color
  | string
  | undefined;

const ZERO = new Fraction(0);
const ZERO_MONZO = new TimeMonzo(ZERO, [], ZERO);
const ONE_MONZO = new TimeMonzo(ZERO, []);

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

function builtinNode(builtin: Function): FunctionDeclaration {
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
const PI = new Interval(TimeMonzo.fromValue(Math.PI), 'linear');
const TAU = new Interval(TimeMonzo.fromValue(2 * Math.PI), 'linear');

// == First-party wrappers ==
function numComponents(value?: Interval) {
  if (value === undefined) {
    return Interval.fromInteger(getNumberOfComponents());
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
    Interval.fromInteger(p)
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
  return result.map(s => Interval.fromInteger(s));
}
mosSubset.__doc__ =
  'Calculate a subset of equally tempered degrees with maximum variety two per scale degree.';
mosSubset.__node__ = builtinNode(mosSubset);

// == Domain conversion ==

function simplify(interval: Interval) {
  return new Interval(
    interval.value.clone(),
    interval.domain,
    undefined,
    interval
  );
}
simplify.__doc__ = 'Get rid of interval formatting.';
simplify.__node__ = builtinNode(simplify);

function bleach(interval: Interval) {
  return new Interval(interval.value.clone(), interval.domain, interval.node);
}
bleach.__doc__ = 'Get rid of interval coloring and label.';
bleach.__node__ = builtinNode(bleach);

function linear(interval: Interval) {
  return new Interval(interval.value.clone(), 'linear', undefined, interval);
}
linear.__doc__ = 'Convert interval to linear representation.';
linear.__node__ = builtinNode(linear);

function logarithmic(interval: Interval) {
  return new Interval(
    interval.value.clone(),
    'logarithmic',
    undefined,
    interval
  );
}
logarithmic.__doc__ = 'Convert interval to logarithmic representation.';
logarithmic.__node__ = builtinNode(logarithmic);

function cologarithmic(interval: Interval) {
  return new Interval(
    interval.value.clone(),
    'cologarithmic',
    undefined,
    interval
  );
}
cologarithmic.__doc__ = 'Convert interval to cologarithmic representation.';
cologarithmic.__node__ = builtinNode(cologarithmic);

export function ablin(this: ExpressionVisitor, interval: Interval) {
  if (interval.isAbsolute()) {
    const te = interval.value.timeExponent;
    return new Interval(
      interval.value.pow(te.inverse().neg()),
      'linear',
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
    'linear',
    undefined,
    interval
  );
}
ablin.__doc__ = 'Convert interval to absolute linear representation.';
ablin.__node__ = builtinNode(ablin);

export function relin(this: ExpressionVisitor, interval: Interval) {
  if (interval.isRelative()) {
    return new Interval(interval.value.clone(), 'linear', undefined, interval);
  }
  if (this.rootContext.unisonFrequency === undefined) {
    throw new Error(
      'Reference frequency must be set for absolute -> relative conversion. Try 1/1 = 440 Hz'
    );
  }
  const absoluteLinear = ablin.bind(this)(interval);
  return new Interval(
    absoluteLinear.value.div(this.rootContext.unisonFrequency),
    'linear',
    undefined,
    interval
  );
}
relin.__doc__ = 'Convert interval to relative linear representation.';
relin.__node__ = builtinNode(relin);

export function ablog(this: ExpressionVisitor, interval: Interval) {
  const converted = ablin.bind(this)(interval);
  converted.domain = 'logarithmic';
  return converted;
}
ablog.__doc__ = 'Convert interval to absolute logarithmic representation.';
ablog.__node__ = builtinNode(ablog);

export function relog(this: ExpressionVisitor, interval: Interval) {
  const converted = relin.bind(this)(interval);
  converted.domain = 'logarithmic';
  return converted;
}
relog.__doc__ = 'Convert interval to relative logarithmic representation.';
relog.__node__ = builtinNode(relog);

// == Type conversion ==

function bool(this: ExpressionVisitor, value: SonicWeaveValue) {
  if (value instanceof Interval) {
    const b = sonicBool(sonicTruth(relin.bind(this)(value)));
    b.color = value.color;
    b.label = value.label;
    return b;
  }
  return sonicBool(sonicTruth(value));
}
bool.__doc__ = 'Convert value to a boolean.';
bool.__node__ = builtinNode(bool);

function decimal(
  this: ExpressionVisitor,
  interval: Interval,
  fractionDigits?: Interval
) {
  const converted = relin.bind(this)(interval);
  if (fractionDigits !== undefined) {
    const denominator = 10 ** fractionDigits.toInteger();
    const numerator = Math.round(converted.value.valueOf() * denominator);
    converted.value = TimeMonzo.fromFraction(
      new Fraction(numerator, denominator)
    );
  }
  converted.node = converted.value.asDecimalLiteral();
  return converted;
}
decimal.__doc__ = 'Convert interval to a decimal number.';
decimal.__node__ = builtinNode(decimal);

function fraction(
  this: ExpressionVisitor,
  interval: Interval,
  epsilon?: Interval
) {
  const converted = relin.bind(this)(interval);
  let eps = 1e-4;
  if (epsilon === undefined) {
    if (converted.value.isFractional()) {
      return new Interval(
        converted.value,
        'linear',
        converted.value.asFractionLiteral(),
        interval
      );
    }
  } else {
    eps = epsilon.value.valueOf();
  }
  const frac = new Fraction(converted.value.valueOf()).simplify(eps);
  const value = TimeMonzo.fromFraction(frac);
  return new Interval(value, 'linear', value.asFractionLiteral(), interval);
}
fraction.__doc__ = 'Convert interval to a fraction.';
fraction.__node__ = builtinNode(fraction);

function radical(
  this: ExpressionVisitor,
  interval: Interval,
  maxIndex?: Interval,
  maxHeight?: Interval
) {
  const converted = relin.bind(this)(interval);
  if (converted.value.isEqualTemperament()) {
    return new Interval(
      converted.value,
      'linear',
      converted.value.asRadicalLiteral(),
      interval
    );
  }
  const {index, radicand} = approximateRadical(
    converted.value.valueOf(),
    maxIndex === undefined ? undefined : maxIndex.toInteger(),
    maxHeight === undefined ? undefined : maxHeight.toInteger()
  );
  const value = TimeMonzo.fromFraction(radicand).pow(
    new Fraction(index).inverse()
  );
  const node = value.asRadicalLiteral();
  if (node !== undefined) {
    return new Interval(value, 'linear', node, interval);
  } else {
    const frac = approximateRadical(
      converted.value.valueOf(),
      1,
      maxHeight === undefined ? undefined : maxHeight.toInteger()
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
radical.__doc__ = 'Convert interval to a radical expression.';
radical.__node__ = builtinNode(radical);

export function cents(
  this: ExpressionVisitor,
  interval: Interval,
  fractionDigits?: Interval
) {
  const converted = relog.bind(this)(interval);
  if (fractionDigits !== undefined) {
    const denominator = 10 ** fractionDigits.toInteger();
    const numerator = Math.round(converted.totalCents() * denominator);
    converted.value = new TimeMonzo(ZERO, [
      new Fraction(numerator, denominator * 1200),
    ]);
  }
  converted.node = converted.value.asCentsLiteral();
  return converted;
}
cents.__doc__ = 'Convert interval to cents.';
cents.__node__ = builtinNode(cents);

function absoluteFJS(this: ExpressionVisitor, interval: Interval) {
  const C4 = this.rootContext.C4;
  let monzo: TimeMonzo;
  if (C4.timeExponent.n === 0) {
    monzo = relog.bind(this)(interval).value;
  } else {
    monzo = ablog.bind(this)(interval).value;
  }
  let relativeToC4 = monzo.div(C4);
  const node = asAbsoluteFJS(relativeToC4);
  if (node) {
    return new Interval(
      monzo,
      'logarithmic',
      {type: 'AspiringAbsoluteFJS'},
      interval
    );
  }
  relativeToC4 = relativeToC4.approximateSimple();
  return new Interval(
    C4.mul(relativeToC4),
    'logarithmic',
    {type: 'AspiringAbsoluteFJS'},
    interval
  );
}
absoluteFJS.__doc__ = 'Convert interval to absolute FJS.';
absoluteFJS.__node__ = builtinNode(absoluteFJS);

function FJS(this: ExpressionVisitor, interval: Interval) {
  const monzo = relog.bind(this)(interval).value;
  const node = asFJS(monzo);
  if (node) {
    return new Interval(monzo, 'logarithmic', node, interval);
  }
  const approximation = monzo.approximateSimple();
  return new Interval(
    approximation,
    'logarithmic',
    asFJS(approximation),
    interval
  );
}
FJS.__doc__ = 'Convert interval to (relative) FJS.';
FJS.__node__ = builtinNode(FJS);

function toMonzo(this: ExpressionVisitor, interval: Interval) {
  const monzo = relog.bind(this)(interval).value;
  monzo.cents = Math.round(monzo.cents);
  monzo.residual = new Fraction(1);
  const node = monzo.asMonzoLiteral();
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
// == Other ==

export function compare(this: ExpressionVisitor, a: Interval, b: Interval) {
  if (a.isRelative() && b.isRelative()) {
    return a.compare(b);
  }
  if (a.isAbsolute() && b.isAbsolute()) {
    const ab = ablin.bind(this);
    return ab(a).compare(ab(b));
  }
  const r = relin.bind(this);
  return r(a).compare(r(b));
}

function cosJIP(
  this: ExpressionVisitor,
  interval: Interval,
  weighting: 'none' | 'tenney' = 'tenney'
) {
  const monzo = relog.bind(this)(interval).value;
  const pe = monzo.primeExponents.map(e => e.valueOf());
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
  return new Interval(
    TimeMonzo.fromValue(value),
    'linear',
    undefined,
    interval
  );
}
cosJIP.__doc__ =
  'Cosine of the angle between the val and the just intonation point. Weighting is either "none" or "tenney".';
cosJIP.__node__ = builtinNode(cosJIP);

function JIP(this: ExpressionVisitor, interval: Interval) {
  const monzo = relog.bind(this)(interval).value;
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
  ...primeCents: (Interval | undefined)[]
) {
  const rl = relog.bind(this);
  const pc = primeCents.map((p, i) =>
    p ? rl(p).totalCents() : PRIME_CENTS[i]
  );

  function mapper(this: ExpressionVisitor, interval: Interval) {
    const monzo = relog.bind(this)(interval).value;
    monzo.numberOfComponents = pc.length;
    const pe = monzo.primeExponents.map(e => e.valueOf());
    const value = TimeMonzo.fromCents(
      dot(pc, pe) +
        valueToCents(Math.abs(monzo.residual.valueOf())) +
        monzo.cents
    );
    if (monzo.residual.s < 0) {
      value.residual.s = -1;
    }
    return new Interval(value, 'logarithmic', undefined, interval);
  }
  Object.defineProperty(mapper, 'name', {
    value: `PrimeMapping${pc.map(p => p.toString() + 'c').join(', ')}`,
    enumerable: false,
  });
  mapper.__doc__ = 'Prime mapper. Temperes intervals to real cents.';
  mapper.__node__ = builtinNode(mapper);
  return mapper;
}
PrimeMapping.__doc__ =
  'Construct a prime mapping for tempering intervals to real cents. Remaining primes are converted to real cents without tempering.';
PrimeMapping.__node__ = builtinNode(PrimeMapping);

export function tenneyHeight(this: ExpressionVisitor, interval: Interval) {
  const monzo = relog.bind(this)(interval).value;
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

function hasConstantStructure(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  if (scale.length < 1) {
    return sonicBool(false);
  }
  const rl = relin.bind(this);
  const monzos = scale.map(i => rl(i).value);
  const equave = monzos.pop()!;
  monzos.unshift(equave.pow(0));
  const subtensions: [TimeMonzo, number][] = [];
  for (let i = 0; i < monzos.length; ++i) {
    for (let j = 0; j < monzos.length; ++j) {
      let width = monzos[mmod(i + j, monzos.length)].div(monzos[i]);
      if (i + j >= monzos.length) {
        width = width.mul(equave);
      }
      let unique = true;
      for (const [existing, subtension] of subtensions) {
        if (width.strictEquals(existing)) {
          if (subtension !== j) {
            return sonicBool(false);
          }
          unique = false;
        }
      }
      if (unique) {
        subtensions.push([width, j]);
      }
    }
  }
  return sonicBool(true);
}
hasConstantStructure.__doc__ =
  'Returns `true` if the current/given scale has constant structure (i.e. every scale degree is unambiguous).';
hasConstantStructure.__node__ = builtinNode(hasConstantStructure);

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
  value = relin.bind(this)(value);
  const n = Math.floor(value.value.valueOf());
  return Interval.fromInteger(n, value);
}
floor.__doc__ = 'Round value down to the nearest integer.';
floor.__node__ = builtinNode(floor);

function round(this: ExpressionVisitor, value: Interval) {
  value = relin.bind(this)(value);
  const n = Math.round(value.value.valueOf());
  return Interval.fromInteger(n, value);
}
round.__doc__ = 'Round value to the nearest integer.';
round.__node__ = builtinNode(round);

function trunc(this: ExpressionVisitor, value: Interval) {
  value = relin.bind(this)(value);
  const n = Math.trunc(value.value.valueOf());
  return Interval.fromInteger(n, value);
}
trunc.__doc__ = 'Truncate value towards zero to the nearest integer.';
trunc.__node__ = builtinNode(trunc);

function ceil(this: ExpressionVisitor, value: Interval) {
  value = relin.bind(this)(value);
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

function min(this: ExpressionVisitor, ...args: Interval[]) {
  const c = compare.bind(this);
  return args.slice(1).reduce((a, b) => (c(a, b) <= 0 ? a : b), args[0]);
}
min.__doc__ = 'Obtain the argument with the minimum value.';
min.__node__ = builtinNode(min);

function max(this: ExpressionVisitor, ...args: Interval[]) {
  const c = compare.bind(this);
  return args.slice(1).reduce((a, b) => (c(a, b) >= 0 ? a : b), args[0]);
}
max.__doc__ = 'Obtain the argument with the maximum value.';
max.__node__ = builtinNode(max);

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

function pop(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  if (!scale.length) {
    throw new Error('Pop from an empty scale');
  }
  return scale.pop()!;
}
pop.__doc__ = 'Remove and return the last interval in the current/given scale.';
pop.__node__ = builtinNode(pop);

function popAll(this: ExpressionVisitor, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  const result = [...scale];
  scale.length = 0;
  return result;
}
popAll.__doc__ = 'Remove and return all intervals in the current/given scale.';
popAll.__node__ = builtinNode(popAll);

function push(this: ExpressionVisitor, interval: Interval, scale?: Interval[]) {
  scale ??= this.getCurrentScale();
  scale.push(interval);
}
push.__doc__ = 'Append an interval onto the current/given scale.';
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
  return Interval.fromInteger(scale.length);
}
length.__doc__ = 'Return the number of intervals in the scale.';
length.__node__ = builtinNode(length);

// TODO: Store function signature in mapper.length and avoid integer conversion when possible.
function map(
  this: ExpressionVisitor,
  mapper: (value: any, index: Interval, array: any[]) => unknown,
  array?: any[]
) {
  mapper = mapper.bind(this);
  array ??= this.getCurrentScale();
  return array.map((value, index, arr) =>
    mapper(value, Interval.fromInteger(index), arr)
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
    sonicTruth(tester(value, Interval.fromInteger(index), arr))
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
        reducer(value, currentValue, Interval.fromInteger(currentIndex), arr),
      initialValue
    );
  } else {
    return array.reduce((value, currentValue, currentIndex, arr) =>
      reducer(value, currentValue, Interval.fromInteger(currentIndex), arr)
    );
  }
}
arrayReduce.__doc__ =
  'Reduce the given/current scale to a single value by the `reducer` riff which takes an accumulator, the current value, the current index and the array as arguments.';
arrayReduce.__node__ = builtinNode(arrayReduce);

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
  if (value instanceof Color) {
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
    const names = params.identifiers.map(p => p.id);
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
  // Constants
  E,
  PI,
  TAU,
  // First-party wrappers
  numComponents,
  // Third-party wrappers
  mosSubset,
  isPrime,
  primes,
  // Domain conversion
  simplify,
  bleach,
  linear,
  logarithmic,
  cologarithmic,
  relin,
  ablin,
  relog,
  ablog,
  // Type conversion
  bool,
  int: trunc,
  decimal,
  fraction,
  radical,
  cents,
  absoluteFJS,
  FJS,
  monzo: toMonzo,
  // Type detection
  isInterval,
  isColor,
  isString,
  isFunction,
  isArray,
  // Integer conversion
  floor,
  round,
  trunc,
  ceil,
  // Other
  cosJIP,
  JIP,
  PrimeMapping,
  tenneyHeight,
  gcd,
  lcm,
  hasConstantStructure,
  str,
  repr,
  slice,
  zip,
  zipLongest,
  abs,
  min,
  max,
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
  kCombinations,
  // CSS color generation
  rgb,
  rgba,
  hsl,
  hsla,
  centsColor,
  factorColor,
};

export const PRELUDE_SOURCE = `
// == Functions ==
riff sanitize interval {
  "Get rid of interval formatting, color and label."
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
riff log x y {
  "Calculate the logarithm of x base y. Base defaults to E.";
  y ??= E;
  return x ~/_ y;
}
riff pow x y {
  "Calculate x to the power of y.";
  return x ~^ y;
}

riff avg ...terms {
  "Calculate the arithmetic mean of the terms.";
  return arrayReduce(a b => a ~+ b, terms) ~% length(terms);
}

riff havg ...terms {
  "Calculate the harmonic mean of the terms.";
  return ~%arrayReduce(total a => total +~ ~%a, terms, 0) ~* length(terms);
}

riff geoavg ...factors {
  "Calculate the geometric mean of the factors.";
  return arrayReduce(a b => a ~* b, factors) /^ length(factors);
}

riff circleDifference a b equave {
  "Calculate the geometric difference of two intervals on a circle.";
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
  return arrayReduce(total, element => total +~ element, terms);
}

riff prod factors {
  "Calculate the (linear) product of the factors or the current scale i.e. the logarithmic sum.";
  factors ??= $$;
  return arrayReduce(total, element => total *~ element, factors);
}

riff cumsum array {
  "Calculate the cumulative sums of the terms in the array.";
  array;
  let i = 0;
  while (++i < length($))
    $[i] ~+= $[i-1];
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
  "Apply labels (or colors) from the first array to the current/given scale.";
  scale ??= $$;
  let i = -1;
  while (++i < min(length(labels), length(scale)))
    scale[i] = scale[i] labels[i];
}

riff tune a b numIter weighting {
  "Find a combination of two vals that is closer to just intonation.";
  numIter ??= 1;
  while (numIter--) {
    const x = 2 * a - b;
    const y = a + b;
    const z = 2 * b - a;

    [a, b] = sorted([a, b, x, y, z], u, v => cosJIP(v) - cosJIP(u));
  }
  return a;
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
  reflected(end::start);
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
  "Generate a finite segment of a Rank-2 scale generated by stacking the given generator against the given period (or the octave \`2/1\` by default).";
  down ??= 0;
  period ??= 2;
  numPeriods ??= 1;
  [generator ~^ i ~rdc period for i of [-down..up]];
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

riff spanLattice basis ups downs equave {
  "Span a lattice by extending a basis combinatorically.";
  basis = basis[..];
  ups = ups[..] if ups else [];
  downs = downs[..] if downs else [];
  equave ??= 2;
  while (length(ups) < length(basis)) push(1, ups);
  while (length(downs) < length(basis)) push(0, downs);

  1;

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

  let remainder = 0;
  while (++remainder < equave) {
    let n = remainder;
    while (n <= guide) {
      if (not (guide ~mod n)) n;
      n ~+= equave;
    }
  }
  i => i ~% root ~rdc equave;
  sort();
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

riff gs generators ordinal period numPeriods maxSize {
  "Generate a constant structure generator sequence. Zero ordinal corresponds to the (trivial) stack of all generators while positive ordinals denote scales with constant structure ordered by increasing size.";
  ordinal ??= 1;
  period ??= 2;
  numPeriods ??= 1;
  maxSize ??= 100;
  cumprod(generators);
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
  equave;
  return;
}

riff rotated onto scale {
  "Obtain a copy of the current/given scale rotated onto the given degree.";
  scale ?? $$;
  rotate(onto);
}

riff clear scale {
  "Remove the contents of the current/given scale.";
  $ = scale ?? $$;
  while ($) void(pop());
  return;
}

riff repeated times scale {
  "Stack the current/given on top of itself.";
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

riff subset indices scale {
  "Only keep the given indices (scale degrees) of the current/given scale.";
  scale ??= $$;
  distill(_, i => i of indices, scale);
}

riff subsetOf indices scale {
  "Obtain a copy of the current/given scale with only the given indices kept.";
  filter(_, i => i of indices, scale ?? $$);
}

riff toSubharmonics overtone scale {
  "Quantize the current/given scale to subharmonics of the given overtone.";
  $ = scale ?? $$;
  i => %~(%~i to~ %~overtone);
  return;
}

riff subharmonicsOf overtone scale {
  "Obtain a copy of the current/given scale quantized to subharmonics of the given overtone.";
  map(i => %~(%~i to~ %~overtone), scale ?? $$);
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
  const copies = $ ~tns offsets;
  void(shift());

  if (overflow === 'drop') {
    remap(copy => filter(i => i > 1 and i < equave, copy), copies);
  } else if (overflow === 'wrap') {
    remap(copy => map(i => i ~rd equave, copy), copies);
  }

  copies;
  sort();
  equave;
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
  const equave = scale[-1];
  let last = 1;
  let group = [];
  for (const interval of scale[..length(scale) - 1]) {
    if (circleDistance(last, interval, equave) > tolerance and group) {
      if (action === 'lowest') {
        group[0];
      } else if (action === 'highest') {
        group[-1];
      } else if (action === 'avg') {
        avg(...group);
      } else if (action === 'avg') {
        havg(...group);
      } else if (action === 'geoavg') {
        geoavg(...group);
      } else {
        sort(group, (a b => tenneyHeight(a) - tenneyHeight(b)));
        group[0];
      }
      group = [];
    }
    last = interval;
    push(interval, group);
  }
  equave;
}

riff coalesce tolerance action scale {
  "Coalesce intervals in the current/given scale separated by \`tolerance\` (default 3.5 cents) into one. \`action\` is one of 'simplest', 'lowest', 'highest', 'avg', 'havg' or 'geoavg' defaulting to 'simplest'.";
  $ = scale ?? $$;
  scale = $[..];
  clear();
  coalesced(tolerance, action, scale);
  return;
}
`;
