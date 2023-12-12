import {Interval} from './interval';
import {TimeMonzo} from './monzo';

const E = new Interval(TimeMonzo.fromValue(Math.E), 'linear');
const PI = new Interval(TimeMonzo.fromValue(Math.PI), 'linear');
const TAU = new Interval(TimeMonzo.fromValue(2 * Math.PI), 'linear');

function sort() {
  const scale = this.context.get('$') as Interval[];
  scale.sort((a: Interval, b: Interval) => a.compare(b));
}

function reverse() {
  const scale = this.context.get('$') as Interval[];
  scale.reverse();
}

function pop() {
  const scale = this.context.get('$') as Interval[];
  if (!scale.length) {
    throw new Error('Pop from an empty scale');
  }
  return scale.pop()!;
}

function push(interval: Interval) {
  const scale = this.context.get('$') as Interval[];
  scale.push(interval);
}

function shift() {
  const scale = this.context.get('$') as Interval[];
  if (!scale.length) {
    throw new Error('Shift from an empty scale');
  }
  return scale.shift()!;
}

function unshift(interval: Interval) {
  const scale = this.context.get('$') as Interval[];
  scale.unshift(interval);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function print(...args: any[]) {
  console.log(...args);
}

export const BUILTIN_CONTEXT: Record<string, Interval | Function> = {
  E,
  PI,
  TAU,
  sort,
  reverse,
  pop,
  push,
  shift,
  unshift,
  print,
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

// == Scale modification ==
riff reduce {
  $ = $$;
  equave = pop();
  i => i ~red equave;
  equave;
  return;
}

riff invert {
  $ = $$;
  equave = pop();
  i => equave %~ i;
  reverse();
  equave;
  return;
}

riff rotate onto {
  onto ??= 1;
  $ = $$;
  equave = $[-1];
  while (--onto) equave *~ shift();
  root = shift();
  i => i ~% root;
  equave;
  return;
}

riff void _ {
  return;
}

riff clear {
  $ = $$;
  while ($) void(pop());
}

riff repeat times {
  times ??= 2;
  scale = $$;
  if (!times) {
    $ = scale;
    return clear();
  }
  equave = $$[-1];
  while (--times) {
    scale;
    i => i ~* equave ~^ times;
  }
}
`;
