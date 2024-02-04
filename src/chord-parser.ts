import {parse} from './sonic-weave-chord';
import {evaluateExpression} from './parser';
import {Interval} from './interval';

export function parseChord(input: string, includePrelude = true): Interval[] {
  const parts: string[] = parse(input) as any;
  const result: Interval[] = evaluateExpression(
    `[${parts.join(', ')}]`,
    includePrelude
  ) as Interval[];
  return result.filter(i => i instanceof Interval);
}
