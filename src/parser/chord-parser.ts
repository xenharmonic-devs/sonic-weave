import {parse} from './sonic-weave-chord';
import {evaluateExpression, evaluateSource, parseAST} from './parser';
import {Interval, Val} from '../interval';
import {sparseOffsetToVal, wartsToVal} from '../warts';
import {TimeMonzo, getNumberOfComponents} from '../monzo';
import {PRIMES} from 'xen-dev-utils';
import {ONE, ZERO} from '../utils';

/**
 * Parse a list of intervals separated by '|', '&', ':', ';', ',' or whitespace.
 * @param input User input in a context that expects a chord.
 * @param includePrelude Whether or not to include the extended standard library. Passing in `false` results in a faster start-up time.
 * @returns An array of parsed {@link Interval} instances.
 */
export function parseChord(input: string, includePrelude = true): Interval[] {
  const parts: string[] = parse(input) as any;
  const visitor = evaluateSource(`[${parts.join(', ')}]`, includePrelude);
  const result = visitor.currentScale;
  return result.filter(i => i instanceof Interval);
}

/**
 * Parse a list of vals separated by '|', '&', ':', ';', ',' or whitespace.
 * @param input User input in a context that expects a sequance of vals.
 * @param subgroup Dot-separated subgroup basis or the prime limit.
 * @param includePrelude Whether or not to include the extended standard library. Passing in `false` results in a faster start-up time.
 * @returns An array of number arrays representing vals in the subgroup basis.
 */
export function parseVals(
  input: string,
  subgroup: string,
  includePrelude = true
): number[][] {
  subgroup = subgroup.trim();
  const basis: TimeMonzo[] = [];
  if (subgroup.length && !subgroup.includes('.')) {
    const prime = parseInt(subgroup, 10);
    const index = PRIMES.indexOf(prime);
    if (index < 0) {
      throw new Error(`Invalid prime limit ${subgroup}.`);
    }
    for (let i = 0; i <= index; ++i) {
      basis.push(TimeMonzo.fromFraction(PRIMES[i]));
    }
    subgroup = '@.' + subgroup;
  } else if (subgroup.length) {
    basis.push(...subgroup.split('.').map(e => TimeMonzo.fromFraction(e)));
    subgroup = '@' + subgroup;
  } else {
    subgroup = '@';
  }
  if (!basis.length) {
    for (let i = 0; i < getNumberOfComponents(); ++i) {
      const monzo = new TimeMonzo(ZERO, Array(i).fill(ZERO));
      monzo.primeExponents[i] = ONE;
      basis.push(monzo);
    }
  }
  const parts: string[] = parse(input) as any;
  const result: number[][] = [];
  for (const part of parts) {
    if (part.includes('<')) {
      if (part.includes('@')) {
        throw new Error('Explicit sub-subgroups not supported.');
      }
      const val = evaluateExpression(part, includePrelude) as Val;
      // Just re-interprete in the subgroup's basis.
      result.push(val.value.toIntegerMonzo());
    } else {
      const ast = parseAST(part + subgroup)['body'][0];
      if (ast.type !== 'ExpressionStatement') {
        throw new Error('Invalid val literal');
      }
      const node = ast.expression;
      let val: TimeMonzo;
      if (node.type === 'WartsLiteral') {
        val = wartsToVal(node);
      } else if (node.type === 'SparseOffsetVal') {
        val = sparseOffsetToVal(node);
      }
      result.push(basis.map(e => val.dot(e).valueOf()));
    }
  }
  return result;
}
