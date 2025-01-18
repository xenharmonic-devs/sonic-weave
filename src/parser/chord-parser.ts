import {parse} from './sonic-weave-chord';
import {evaluateExpression, evaluateSource, parseAST} from './parser';
import {Interval, Temperament, Val, ValBasis} from '../interval';
import {sparseOffsetToVal, wartsToVal} from '../warts';
import {TimeMonzo, TimeReal, getNumberOfComponents} from '../monzo';
import {Fraction, PRIMES} from 'xen-dev-utils';
import {ValBasisElement} from '../expression';
import {StatementVisitor} from './statement';

const CTE_EQUAVE_WEIGHT = 5000;
export type OptimizationScheme = 'TE' | 'POTE' | 'CTE';

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
 * Parse a string like "2.3.5" to a subgroup basis. A single number is interpreted as a prime limit.
 * @param input User input in a context that expects a subgroup basis.
 * @returns A {@link ValBasis} instance.
 */
export function parseBasis(input: string): ValBasis {
  input = input.trim();
  if (!input.length) {
    return new ValBasis(getNumberOfComponents());
  }
  if (input.includes('.') || input.startsWith('@')) {
    if (input.startsWith('@')) {
      input = input.slice(1);
    }
    const basis: ValBasisElement[] = [];
    // Custom parser because the grammar is simple enough.
    for (let element of input.split('.')) {
      element = element.trim();
      if (!element) {
        basis.push(element as ValBasisElement);
        continue;
      }
      let radical = false;
      if (element.startsWith('√')) {
        element = element.slice(1);
        radical = true;
      }
      const {s, n, d} = new Fraction(element);
      if (s <= 0) {
        throw new Error('Basis elements may not be negative or zero.');
      }
      basis.push({
        radical,
        numerator: n,
        denominator: d === 1 ? null : d,
      });
    }
    const visitor = new StatementVisitor().createExpressionVisitor();
    return visitor.visit({
      type: 'ValBasisLiteral',
      basis,
    }) as ValBasis;
  }
  const prime = parseInt(input, 10);
  if (PRIMES.includes(prime)) {
    return new ValBasis(PRIMES.indexOf(prime) + 1);
  }
  throw new Error(`Unrecognized prime limit ${input}.`);
}

/**
 * Parse a list of vals separated by '|', '&', ':', ';', ',' or whitespace.
 * @param input User input in a context that expects a sequence of vals.
 * @param basis Dot-separated subgroup basis or the prime limit parsed by {@link parseBasis}.
 * @param includePrelude Whether or not to include the extended standard library. Passing in `false` results in a faster start-up time.
 * @returns An array of number arrays representing vals in the subgroup basis.
 */
export function parseVals(
  input: string,
  basis: ValBasis,
  includePrelude = true
): Val[] {
  const parts: string[] = parse(input) as any;
  const result: Val[] = [];
  for (let part of parts) {
    if (part.includes('<')) {
      if (part.endsWith('@')) {
        part = part.slice(0, -1);
      }
      if (part.includes('@')) {
        throw new Error('Explicit subgroups not supported.');
      }
      const val = evaluateExpression(part, includePrelude) as Val;
      // Just re-interpret in the subgroup's basis.
      result.push(Val.fromBasisMap(val.sval, basis));
    } else {
      // Add a dummy named subgroup to make the warts parser do the right thing.
      if (!part.includes('@')) {
        part = part + '@S';
      } else if (part.endsWith('@')) {
        part = part + 'S';
      }
      const ast = parseAST(part)['body'][0];
      if (ast.type !== 'ExpressionStatement') {
        throw new Error('Invalid val literal.');
      }
      const node = ast.expression;
      let val: Val;
      if (node.type === 'WartsLiteral') {
        val = wartsToVal(node, basis);
      } else if (node.type === 'SparseOffsetVal') {
        val = sparseOffsetToVal(node, basis);
      } else {
        throw new Error('Invalid val literal.');
      }
      result.push(val);
    }
  }
  return result;
}

/**
 * Obtain a temperament from a comma list based on user input.
 * @param commaInput User-provided comma list.
 * @param subgroupInput Optional user-provided subgroup basis.
 * @param optimizationScheme Optimization scheme to use.
 * @param subgroupWeights Additional importance weights to apply on top of Tenney weights.
 * @returns A {@link Temperament} instance tempering out the given commas.
 */
export function temperamentFromCommas(
  commaInput: string,
  subgroupInput: string,
  optimizationScheme: OptimizationScheme,
  subgroupWeights?: number[]
) {
  const chord = parseChord(commaInput);
  const commas: TimeMonzo[] = [];
  for (const interval of chord) {
    if (interval.value instanceof TimeReal) {
      throw new Error('Tempering real values not supported.');
    }
    commas.push(interval.value);
  }
  subgroupInput = subgroupInput.trim();
  let basis: ValBasis | undefined = undefined;
  if (subgroupInput.length) {
    basis = parseBasis(subgroupInput);
  }
  subgroupWeights ??= [];
  subgroupWeights = [...subgroupWeights];
  if (optimizationScheme === 'CTE') {
    subgroupWeights.shift();
    subgroupWeights.unshift(CTE_EQUAVE_WEIGHT);
  }
  const pureEquaves = optimizationScheme !== 'TE';
  return Temperament.fromCommas(commas, basis, subgroupWeights, pureEquaves);
}

/**
 * Obtain a rank-2 temperament from a comma list based on user input.
 * @param commaInput User-provided comma list.
 * @param subgroupInput Optional user-provided subgroup basis.
 * @param optimizationScheme Optimization scheme to use.
 * @param subgroupWeights Additional importance weights to apply on top of Tenney weights.
 * @returns A {@link Temperament} instance tempering out the given commas and featuring exactly two independent generators.
 */
export function rank2FromCommas(
  commaInput: string,
  subgroupInput: string,
  optimizationScheme: OptimizationScheme,
  subgroupWeights?: number[]
) {
  // Try same construction as above.
  const chord = parseChord(commaInput);
  const commas: TimeMonzo[] = [];
  for (const interval of chord) {
    if (interval.value instanceof TimeReal) {
      throw new Error('Tempering real values not supported.');
    }
    commas.push(interval.value);
  }
  subgroupInput = subgroupInput.trim();
  let basis: ValBasis | undefined = undefined;
  if (subgroupInput.length) {
    basis = parseBasis(subgroupInput);
  }
  subgroupWeights ??= [];
  subgroupWeights = [...subgroupWeights];
  if (optimizationScheme === 'CTE') {
    subgroupWeights.shift();
    subgroupWeights.unshift(CTE_EQUAVE_WEIGHT);
  }
  const pureEquaves = optimizationScheme !== 'TE';
  let result = Temperament.fromCommas(
    commas,
    basis,
    subgroupWeights,
    pureEquaves
  );
  // Check if result is as intended.
  if (result.rank === 2) {
    return result;
  }
  // Explicit subgroup given. Complain about the mistake.
  if (subgroupInput) {
    throw new Error(
      "Given commas don't define a rank-2 temperament in the subgroup."
    );
  }
  if (result.rank > 2) {
    throw new Error('Failed to infer subgroup. Provide an explicit one.');
  }

  // Try adding some primes.
  const primes = new Set<number>();
  for (const comma of commas) {
    for (const prime of comma.factorize().keys()) {
      if (prime < 2) {
        throw new Error('Negative or zero commas not supported.');
      }
      primes.add(prime);
    }
  }
  let rank = result.rank;
  for (const prime of PRIMES) {
    if (!primes.has(prime)) {
      primes.add(prime);
      if (++rank >= 2) {
        break;
      }
    }
  }
  const subgroup = Array.from(primes);
  subgroup.sort((a, b) => a - b);
  basis = new ValBasis(subgroup.map(p => TimeMonzo.fromFraction(p)));
  result = Temperament.fromCommas(commas, basis, subgroupWeights, pureEquaves);
  if (result.rank === 2) {
    return result;
  }
  throw new Error('Failed to infer subgroup. Provide an explicit one.');
}

/**
 * Obtain a temperament from a list of vals based on user input.
 * Some effort is made to ensure the resulting temperament has rank equal to the number of vals provided.
 * @param valsInput User-provided list of vals.
 * @param subgroupInput Optional user-provided subgroup basis.
 * @param optimizationScheme Optimization scheme to use.
 * @param subgroupWeights Additional importance weights to apply on top of Tenney weights.
 * @returns A {@link Temperament} instance representing the temperament supported by all vals provided.
 */
export function temperamentFromVals(
  valsInput: string,
  subgroupInput: string,
  optimizationScheme: OptimizationScheme,
  subgroupWeights?: number[]
) {
  subgroupWeights ??= [];
  subgroupWeights = [...subgroupWeights];
  if (optimizationScheme === 'CTE') {
    subgroupWeights.shift();
    subgroupWeights.unshift(CTE_EQUAVE_WEIGHT);
  }
  const pureEquaves = optimizationScheme !== 'TE';

  subgroupInput = subgroupInput.trim();
  if (!subgroupInput) {
    // It's a well-known fact* that primes above 13 do not exist.
    for (const n of [3, 4, 5, 6]) {
      const basis = new ValBasis(n);
      const vals = parseVals(valsInput, basis);
      const result = Temperament.fromVals(vals, subgroupWeights, pureEquaves);
      if (result.rank === vals.length) {
        return result;
      }
    }
  }
  const basis = parseBasis(subgroupInput);
  const vals = parseVals(valsInput, basis);
  return Temperament.fromVals(vals, subgroupWeights, pureEquaves);
}

// *) Primes above 13 such as 17 actually exist.
