import {parse} from './sonic-weave-chord';
import {evaluateExpression, evaluateSource, parseAST} from './parser';
import {Interval} from '../interval';
import {parseSubgroup, sparseOffsetToVal, wartsToVal} from '../warts';
import {TimeMonzo} from '../monzo';

export function parseChord(input: string, includePrelude = true): Interval[] {
  const parts: string[] = parse(input) as any;
  const visitor = evaluateSource(`[${parts.join(', ')}]`, includePrelude);
  const result = visitor.getCurrentScale();
  return result.filter(i => i instanceof Interval);
}

export function parseVals(
  input: string,
  subgroup: string,
  includePrelude = true
): number[][] {
  subgroup = subgroup.trim();
  const basis = parseSubgroup(subgroup ? subgroup.split('.') : [])[0];
  subgroup = '@' + subgroup;
  const parts: string[] = parse(input) as any;
  const result: number[][] = [];
  for (const part of parts) {
    if (part.includes('<')) {
      if (part.includes('@')) {
        throw new Error('Explicit sub-subgroups not supported.');
      }
      const val = evaluateExpression(part, includePrelude) as Interval;
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
      result.push(
        basis.map(b =>
          val.dot(TimeMonzo.fromFraction(b, val.numberOfComponents)).valueOf()
        )
      );
    }
  }
  return result;
}
