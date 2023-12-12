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
};

export const PRELUDE_SOURCE = `
riff niente { return; }
niente = niente();

riff sqrt x { return x ~^ 1/2; }
riff cbrt x { return x ~^ 1/3; }

riff mtof index { return 440 Hz * 2^((index - 69) % 12); }
riff ftom freq { return freq % 440 Hz log 2 * 12 + 69; }

riff edo divisions {
  [1..divisions];
  step => step \\ divisions;
}

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
`;
