import {Interval} from './interval';
import {TimeMonzo} from './monzo';

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

export const BUILTIN_CONTEXT: Record<string, Interval | Function> = {
  TAU,
  sort,
  reverse,
  pop,
  push,
};
