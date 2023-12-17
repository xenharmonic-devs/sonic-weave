import {Fraction, kCombinations, mmod} from 'xen-dev-utils';
import {Color, Interval} from './interval';
import {TimeMonzo} from './monzo';

// Runtime

export type SonicWeaveValue =
  | Function
  | Interval
  | Interval[]
  | Color
  | string
  | undefined;

const ZERO = new Fraction(0);
export const LINEAR_ZERO = new Interval(
  new TimeMonzo(ZERO, [], ZERO),
  'linear',
  {
    type: 'IntegerLiteral',
    value: 0n,
  }
);
export const LINEAR_UNITY = new Interval(new TimeMonzo(ZERO, []), 'linear', {
  type: 'IntegerLiteral',
  value: 1n,
});

export function sonicTruth(test: SonicWeaveValue) {
  if (test instanceof Interval) {
    return test.value.residual.n;
  } else if (Array.isArray(test)) {
    return test.length;
  }
  return Number(Boolean(test));
}

export function sonicBool(b: boolean) {
  return b ? LINEAR_UNITY : LINEAR_ZERO;
}

// Library

const E = new Interval(TimeMonzo.fromValue(Math.E), 'linear');
const PI = new Interval(TimeMonzo.fromValue(Math.PI), 'linear');
const TAU = new Interval(TimeMonzo.fromValue(2 * Math.PI), 'linear');

// TODO: Import from moment-of-symmetry
function mos(
  numberOfLargeSteps: number,
  numberOfSmallSteps: number,
  sizeOfLargeStep = 2,
  sizeOfSmallStep = 1,
  brightGeneratorsDown = 1
) {
  if (numberOfLargeSteps !== 5 || numberOfSmallSteps !== 2) {
    throw new Error('This is just a placeholder');
  }
  const period = numberOfLargeSteps + numberOfSmallSteps;
  const g = 3 * sizeOfLargeStep + sizeOfSmallStep;
  const p =
    numberOfLargeSteps * sizeOfLargeStep + numberOfSmallSteps * sizeOfSmallStep;
  const d = brightGeneratorsDown;

  const result: number[] = [];
  for (let i = 0; i < period; ++i) {
    result.push(mmod((i - d) * g, p));
  }
  result.sort((a, b) => a - b);
  result.shift();
  result.push(p);
  return result;
}

function mosSubset(...args: (Interval | undefined)[]) {
  const iargs = args.map(i =>
    i === undefined ? undefined : Math.round(i.value.valueOf())
  );
  const result = mos(...(iargs as [number, number]));
  return result.map(Interval.fromInteger);
}

function random() {
  const value = TimeMonzo.fromValue(Math.random());
  return new Interval(value, 'linear');
}

function randomCents() {
  const value = TimeMonzo.fromCents(Math.random());
  return new Interval(value, 'logarithmic');
}

function floor(value: Interval) {
  const n = Math.floor(value.value.valueOf());
  return Interval.fromInteger(n);
}

function round(value: Interval) {
  const n = Math.round(value.value.valueOf());
  return Interval.fromInteger(n);
}

function ceil(value: Interval) {
  const n = Math.ceil(value.value.valueOf());
  return Interval.fromInteger(n);
}

function abs(value: Interval) {
  return value.abs();
}

function min(...args: Interval[]) {
  return args.slice(1).reduce((a, b) => (a.compare(b) <= 0 ? a : b), args[0]);
}

function max(...args: Interval[]) {
  return args.slice(1).reduce((a, b) => (a.compare(b) >= 0 ? a : b), args[0]);
}

function sort(scale?: Interval[]) {
  scale ??= this.context.get('$') as Interval[];
  scale.sort((a, b) => a.compare(b));
}

function reverse(scale?: Interval[]) {
  scale ??= this.context.get('$') as Interval[];
  scale.reverse();
}

function pop(scale?: Interval[]) {
  scale ??= this.context.get('$') as Interval[];
  if (!scale.length) {
    throw new Error('Pop from an empty scale');
  }
  return scale.pop()!;
}

function push(interval: Interval, scale?: Interval[]) {
  scale ??= this.context.get('$') as Interval[];
  scale.push(interval);
}

function shift(scale?: Interval[]) {
  scale ??= this.context.get('$') as Interval[];
  if (!scale.length) {
    throw new Error('Shift from an empty scale');
  }
  return scale.shift()!;
}

function unshift(interval: Interval, scale?: Interval[]) {
  scale ??= this.context.get('$') as Interval[];
  scale.unshift(interval);
}

function length(scale?: Interval[]) {
  scale ??= this.context.get('$') as Interval[];
  return Interval.fromInteger(scale.length);
}

// Get rid of formatting.
function simplify(interval: Interval) {
  return new Interval(interval.value.clone(), interval.domain);
}

export function ablin(interval: Interval) {
  if (interval.isAbsolute()) {
    const te = interval.value.timeExponent;
    return new Interval(interval.value.pow(te.inverse().neg()), 'linear');
  }
  if (!this.context.has('1')) {
    throw new Error(
      'Reference frequency must be set for relative -> absolute conversion. Try 1/1 = 440 Hz'
    );
  }
  const referenceFrequency = this.context.get('1') as TimeMonzo;
  return new Interval(interval.value.mul(referenceFrequency), 'linear');
}

export function relin(interval: Interval) {
  if (interval.isRelative()) {
    return new Interval(interval.value.clone(), 'linear');
  }
  if (!this.context.has('1')) {
    throw new Error(
      'Reference frequency must be set for absolute -> relative conversion. Try 1/1 = 440 Hz'
    );
  }
  const referenceFrequency = this.context.get('1') as TimeMonzo;
  const absoluteLinear = ablin(interval);
  return new Interval(absoluteLinear.value.div(referenceFrequency), 'linear');
}

export function ablog(interval: Interval) {
  const converted = ablin(interval);
  converted.domain = 'logarithmic';
  return converted;
}

export function relog(interval: Interval) {
  const converted = relin(interval);
  converted.domain = 'logarithmic';
  return converted;
}

export function cents(interval: Interval) {
  const converted = relog(interval);
  converted.node = converted.value.as({
    type: 'CentsLiteral',
    whole: 0n,
    fractional: '',
  });
  return converted;
}

// TODO: Store function signature in mapper.length and avoid integer conversion when possible.
function map(
  mapper: (value: any, index: Interval, array: any[]) => unknown,
  array?: any[]
) {
  mapper = mapper.bind(this);
  array ??= this.context.get('$') as Interval[];
  return array.map((value, index, arr) =>
    mapper(value, Interval.fromInteger(index), arr)
  );
}

function remap(
  mapper: (value: any, index: Interval, array: any[]) => unknown,
  array?: any[]
) {
  array ??= this.context.get('$') as Interval[];
  const mapped = map.bind(this)(mapper, array);
  array.length = 0;
  array.push(...mapped);
}

function filter(
  tester: (value: any, index: Interval, array: any[]) => SonicWeaveValue,
  array?: any[]
) {
  tester = tester.bind(this);
  array ??= this.context.get('$') as Interval[];
  return array.filter((value, index, arr) =>
    sonicTruth(tester(value, Interval.fromInteger(index), arr))
  );
}

function distill(
  tester: (value: any, index: Interval, array: any[]) => SonicWeaveValue,
  array?: any[]
) {
  array ??= this.context.get('$') as Interval[];
  const filtered = filter.bind(this)(tester, array);
  array.length = 0;
  array.push(...filtered);
}

function arrayReduce(
  reducer: (
    previousValue: any,
    currentValue: any,
    currentIndex: Interval,
    array: any[]
  ) => any,
  initialValue: any,
  array?: any[]
) {
  reducer = reducer.bind(this);
  array ??= this.context.get('$') as Interval[];
  return array.reduce(
    (value, currentValue, currentIndex, arr) =>
      reducer(value, currentValue, Interval.fromInteger(currentIndex), arr),
    initialValue
  );
}

function isArray(value: any) {
  return sonicBool(Array.isArray(value));
}

function print(...args: any[]) {
  console.log(...args.map(a => a.toString()));
}

function dir(arg: any) {
  console.dir(arg, {depth: null});
}

export const BUILTIN_CONTEXT: Record<string, Interval | Function> = {
  E,
  PI,
  TAU,
  true: LINEAR_UNITY,
  false: LINEAR_ZERO,
  mosSubset,
  abs,
  min,
  max,
  random,
  randomCents,
  floor,
  round,
  ceil,
  isArray,
  sort,
  reverse,
  pop,
  push,
  shift,
  unshift,
  length,
  simplify,
  relin,
  ablin,
  relog,
  ablog,
  cents,
  print,
  dir,
  map,
  remap,
  filter,
  distill,
  arrayReduce,
  kCombinations,
};

export const PRELUDE_SOURCE = `
// == Constants ==
riff niente { return; }
niente = niente();

// == Functions ==
riff sqrt x { return x ~^ 1/2; }
riff cbrt x { return x ~^ 1/3; }

riff mtof index { return 440 Hz * 2^((index - 69) % 12); }
riff ftom freq { return freq % 440 Hz log 2 * 12 + 69; }

riff void {
  return;
}

riff sum terms {
  return arrayReduce(total, element => total +~ element, 0, terms);
}

riff prod factors {
  return arrayReduce(total, element => total *~ element, 1, factors);
}

riff cumsum array {
  array;
  i = 0;
  while (++i < length($))
    $[i] ~+= $[i-1];
}

riff cumprod array {
  array;
  i = 0;
  while (++i < length($))
    $[i] ~*= $[i-1];
}

// == Scale generation ==
riff ed divisions equave {
  [1..divisions];
  if (equave === niente) step => step \\ divisions;
  else step => step \\ divisions < equave >;
}

riff subharmonics start end {
  start::end;
  invert();
}

riff mos numberOfLargeSteps numberOfSmallSteps sizeOfLargeStep sizeOfSmallStep brightGeneratorsDown equave {
  mosSubset(numberOfLargeSteps, numberOfSmallSteps, sizeOfLargeStep, sizeOfSmallStep, brightGeneratorsDown);
  divisions = $[-1];
  if (equave === niente) step => step \\ divisions;
  else step => step \\ divisions < equave >;
}

riff rank2 generator up down period {
  down ??= 0;
  period ??= 2;
  accumulator = 1;
  while (up--) {
    accumulator *~= generator;
    accumulator;
  }
  accumulator = 1;
  while (down--) {
    accumulator %~= generator;
    accumulator;
  }
  period;
  reduce();
  sort();
}

riff cps factors count equave withUnity {
  equave ??= 2;
  for (combination of kCombinations(factors, count))
    prod(combination);
  sort();
  if (!withUnity) ground();
  equave;
  reduce();
  sort();
}

riff wellTemperament commaFractions comma up down generator period {
  comma ??= 81/80;
  up ??= 11;
  down ??= 11 - up;
  generator ??= 3/2;
  period ??= 2;

  accumulator = 1;
  i = 0;
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
  basis = basis[..];
  ups = ups[..] if ups else [];
  downs = downs[..] if downs else [];
  equave ??= 2;
  while (length(ups) < length(basis)) push(1, ups);
  while (length(downs) < length(basis)) push(0, downs);

  1;

  while (basis) {
    generator = pop(basis);
    up = pop(ups);
    down = pop(downs);

    for (root of $$) {
      accumulator = root;
      u = up;
      while (u--) {
        accumulator *~= generator;
        accumulator;
      }
      accumulator = root;
      d = down;
      while (d--) {
        accumulator %~= generator;
        accumulator;
      }
    }
  }

  void(shift());
  equave;
  reduce();
  sort();
}

riff eulerGenus guide root equave {
  root ??= 1;
  equave ??= 2;
  if (guide ~mod root) {
    throw "Root must divide the guide tone";
  }

  remainder = 0;
  while (++remainder < equave) {
    n = remainder;
    while (n <= guide) {
      if (!(guide ~mod n)) n;
      n ~+= equave;
    }
  }
  i => i ~% root ~red equave;
  sort();
  void(shift());
  equave;
}

// == Scale modification ==
riff reduce scale {
  $ = scale ?? $$;
  equave = pop();
  i => i ~red equave;
  equave;
  return;
}

riff invert scale {
  $ = scale ?? $$;
  equave = pop();
  i => equave %~ i;
  reverse();
  equave;
  return;
}

riff rotate onto scale {
  onto ??= 1;
  $ = scale ?? $$;
  equave = $[-1];
  while (--onto) equave *~ shift();
  root = shift();
  i => i ~% root;
  equave;
  return;
}

riff clear scale {
  $ = scale ?? $$;
  while ($) void(pop());
}

riff repeat times {
  times ??= 2;
  scale = $$;
  if (!times) {
    return clear(scale);
  }
  equave = scale[-1];
  while (--times) {
    scale;
    i => i ~* equave ~^ times;
  }
}

riff ground scale {
  $ = scale ?? $$;
  root = shift();
  i => i ~% root;
  return;
}

riff subset indices scale {
  scale ??= $$;
  distill(_, i => i of indices, scale);
}

riff toSubharmonics overtone scale {
  $ = scale ?? $$;
  i => %~(%~i to~ %~overtone);
  return;
}

// Assumes a sorted scale
riff keepUnique scale {
  scale ??= $$;
  last = niente;
  i = length(scale);
  while (i--) {
    current = shift(scale);
    if (last != current) {
      current;
      last = current;
    }
  }
  i => push(i, scale);
  return;
}

riff mergeOffset offset overflow scale {
  overflow ??= 'drop';
  $ = scale ?? $$;
  equave = pop();
  copy = map(i => i ~* offset, $);
  unshift(offset, copy);
  if (overflow === 'drop') {
    distill(i => i > 1 && i < equave, copy);
  } else if (overflow === 'wrap') {
    remap(i => i ~red equave, copy);
  }
  copy;
  sort();
  equave;
  keepUnique();
  return;
}

riff stretch amount scale {
  $ = scale ?? $$;
  i => i ~^ amount;
  return;
}

riff randomVariance amount varyEquave scale {
  $ = scale ?? $$;
  if (!varyEquave) equave = pop();
  i => i ~* (amount ~^ (2 * random() - 1));
  if (!varyEquave) equave;
  return;
}
`;
