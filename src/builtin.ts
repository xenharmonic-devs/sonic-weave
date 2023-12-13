import {Fraction, kCombinations} from 'xen-dev-utils';
import {Interval} from './interval';
import {TimeMonzo} from './monzo';

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

const E = new Interval(TimeMonzo.fromValue(Math.E), 'linear');
const PI = new Interval(TimeMonzo.fromValue(Math.PI), 'linear');
const TAU = new Interval(TimeMonzo.fromValue(2 * Math.PI), 'linear');

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

function remap(mapper: (i: Interval) => Interval, scale?: Interval[]) {
  mapper = mapper.bind(this);
  scale ??= this.context.get('$') as Interval[];
  const mapped = scale.map(i => mapper(i));
  scale.length = 0;
  scale.push(...mapped);
}

function map(
  mapper: (value: any, index: number, array: any[]) => unknown,
  array?: any[]
) {
  mapper = mapper.bind(this);
  array ??= this.context.get('$') as Interval[];
  return array.map(mapper);
}

function arrayReduce(
  reducer: (
    previousValue: any,
    currentValue: any,
    currentIndex: number,
    array: any[]
  ) => any,
  initialValue: any,
  array?: any[]
) {
  reducer = reducer.bind(this);
  array ??= this.context.get('$') as Interval[];
  return array.reduce(reducer, initialValue);
}

function isArray(value: any) {
  return Array.isArray(value) ? LINEAR_UNITY : LINEAR_ZERO;
}

function print(...args: any[]) {
  console.log(...args);
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
  isArray,
  sort,
  reverse,
  pop,
  push,
  shift,
  unshift,
  print,
  dir,
  remap,
  map,
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

riff void _ {
  return;
}

riff sum terms {
  return arrayReduce(total, element => total +~ element, 0, terms);
}

riff prod factors {
  return arrayReduce(total, element => total *~ element, 1, factors);
}

// == Scale generation ==
riff edo divisions {
  [1..divisions];
  step => step \\ divisions;
}

riff subharmonics start end {
  start::end;
  invert();
}

riff rank2 generator period up down {
  down ??= 0;
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
`;
