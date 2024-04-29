import {
  type ArrowFunction,
  type FunctionDeclaration,
  type Parameter,
} from '../ast';
import {Color, Interval, Val} from '../interval';
import {TimeMonzo, TimeReal} from '../monzo';
import {type ExpressionVisitor} from '../parser/expression';
import {ZERO} from '../utils';

/**
 * Function that can be called inside the SonicWeave runtime.
 */
export interface SonicWeaveFunction extends Function {
  __doc__: string | undefined;
  __node__: FunctionDeclaration | ArrowFunction;
}

/**
 * Primitive value type of the SonicWeave DSL.
 */
export type SonicWeavePrimitive =
  | SonicWeaveFunction
  | Interval
  | Val
  | Color
  | string
  | undefined
  | boolean;

/**
 * Value type of the SonicWeave DSL.
 * Arrays and records are actually recursive types, but this simplification makes it easier on TypeScript.
 */
export type SonicWeaveValue =
  | SonicWeavePrimitive
  | SonicWeavePrimitive[]
  | Record<string, SonicWeavePrimitive>;

const ZERO_MONZO = new TimeMonzo(ZERO, [], ZERO);
const ONE_MONZO = new TimeMonzo(ZERO, []);

const INT_CACHE = [...Array(100).keys()].map(i => Interval.fromInteger(i));

/**
 * Convert an integer to an {@link Interval instance}.
 * @param n Integer to convert.
 * @returns Linear interval representing the integer, likely cached.
 */
export function fromInteger(n: number) {
  if (n >= 0 && n < INT_CACHE.length) {
    return INT_CACHE[n].shallowClone();
  }
  return Interval.fromInteger(n);
}

/**
 * Convert boolean value to a 1 or 0.
 * @param b `true` or `false` to convert.
 * @returns Interval literal representing either 1 or 0.
 */
export function upcastBool(b: SonicWeaveValue) {
  if (b instanceof Interval) {
    return b;
  } else if (b === true) {
    return INT_CACHE[1].shallowClone();
  } else if (b === false) {
    return INT_CACHE[0].shallowClone();
  }
  throw new Error('An interval or boolean is required.');
}

/**
 * Obtain the truth value of a SonicWeave value.
 * @param test Value to convert.
 * @returns Boolean corresponding to the truthiness of the test value.
 */
export function sonicTruth(test: SonicWeaveValue) {
  if (test instanceof Interval) {
    if (test.value instanceof TimeReal) {
      return Boolean(test.value.value);
    }
    return Boolean(test.value.residual.n);
  } else if (Array.isArray(test)) {
    return Boolean(test.length);
  }
  return Boolean(test);
}

/**
 * Unity as a linear interval.
 * @returns One.
 */
export function linearOne() {
  return INT_CACHE[1];
}

/**
 * Construct a virtual AST node for a function defined outside of the DSL but callable inside the DSL.
 * @param builtin Function to extract node information from.
 * @returns Virtual {@link FunctionDeclaration} to be attached to `builtin.__node__`.
 */
export function builtinNode(builtin: Function): FunctionDeclaration {
  const parameters: Parameter[] = builtin
    .toString()
    .split('(', 2)[1]
    .split(')', 2)[0]
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length)
    .map(p => ({type: 'Parameter', id: p, defaultValue: null}));
  for (const parameter of parameters) {
    if (parameter.id.includes('=')) {
      let [id, defaultValue] = parameter.id.split('=');
      parameter.id = id.trim();
      defaultValue = defaultValue.trim().replace(/'/g, '"');
      if (defaultValue.includes('"')) {
        parameter.defaultValue = {
          type: 'StringLiteral',
          value: JSON.parse(defaultValue),
        };
      } else if (defaultValue === 'true') {
        parameter.defaultValue = {
          type: 'TrueLiteral',
        };
      } else if (defaultValue === 'false') {
        parameter.defaultValue = {
          type: 'FalseLiteral',
        };
      }
    } else if (parameter.id === 'scale') {
      parameter.defaultValue = {
        type: 'Identifier',
        id: '$$',
      };
    }
  }
  return {
    type: 'FunctionDeclaration',
    name: {type: 'Identifier', id: builtin.name},
    parameters: {type: 'Parameters', parameters, defaultValue: null},
    body: [],
    text: `riff ${builtin.name} { [native riff] }`,
  };
}

/**
 * Throw an error if any of the parameters passed in has an `undefined` value.
 * @param parameters A record of parameters to make mandatory.
 */
export function requireParameters(parameters: Record<string, any>) {
  for (const name of Object.keys(parameters)) {
    if (parameters[name] === undefined) {
      throw new Error(`Parameter '${name}' is required.`);
    }
  }
}

/**
 * Check if the value is an array or a SonicWeave record.
 * @param container Value to check.
 * @returns `true` if the value is a container that supports broadcasting.
 */
export function isArrayOrRecord(container: SonicWeaveValue) {
  if (Array.isArray(container)) {
    return true;
  }
  if (typeof container !== 'object') {
    return false;
  }
  return !(
    container instanceof Interval ||
    container instanceof Color ||
    container instanceof Val
  );
}

/**
 * Apply broadcasting rules to arrays and records.
 * @param this Current evaluation context.
 * @param container Array or record.
 * @param fn Unary function for evaluating subvalues.
 * @returns The function mapped over the values of the container.
 */
export function unaryBroadcast(
  this: ExpressionVisitor,
  container: SonicWeaveValue,
  fn: (x: SonicWeavePrimitive) => SonicWeaveValue
) {
  if (Array.isArray(container)) {
    this.spendGas(container.length);
    return container.map(fn) as SonicWeavePrimitive[];
  }
  if (typeof container !== 'object') {
    throw new Error('Invalid container to map over.');
  }
  if (
    container instanceof Color ||
    container instanceof Val ||
    container instanceof Interval
  ) {
    throw new Error('Invalid container to map over.');
  }
  const entries = Object.entries(container);
  this.spendGas(entries.length);
  return Object.fromEntries(
    entries.map(([key, value]) => [key, fn(value)])
  ) as Record<string, SonicWeavePrimitive>;
}

/**
 * Apply broadcasting rules to arrays and records.
 * @param this Current evaluation context.
 * @param left Array or record. The left operand.
 * @param right Array or record. The right operand.
 * @param fn Binary function for evaluating subvalues.
 * @returns The function mapped over the values of the containers.
 */
export function binaryBroadcast(
  this: ExpressionVisitor,
  left: SonicWeaveValue,
  right: SonicWeaveValue,
  fn: (x: SonicWeavePrimitive, y: SonicWeavePrimitive) => SonicWeaveValue
): SonicWeaveValue {
  if (Array.isArray(left)) {
    if (Array.isArray(right)) {
      if (left.length !== right.length) {
        throw new Error(
          `Unable to broadcast arrays together with lengths ${left.length} and ${right.length}.`
        );
      }
      this.spendGas(left.length);
      return left.map((l, i) => fn(l, right[i])) as SonicWeaveValue;
    }
    if (
      typeof right === 'object' &&
      !(
        right instanceof Color ||
        right instanceof Interval ||
        right instanceof Val
      )
    ) {
      right satisfies Record<string, SonicWeavePrimitive>;
      throw new Error('Unable to broadcast an array and record together.');
    }
    this.spendGas(left.length);
    return left.map(l => fn(l, right)) as SonicWeaveValue;
  }
  if (
    typeof left === 'object' &&
    !(left instanceof Color || left instanceof Interval || left instanceof Val)
  ) {
    left satisfies Record<string, SonicWeavePrimitive>;
    if (Array.isArray(right)) {
      throw new Error('Unable to broadcast an array and record together.');
    }
    const entries = Object.entries(left);
    if (
      typeof right === 'object' &&
      !(
        right instanceof Color ||
        right instanceof Interval ||
        right instanceof Val
      )
    ) {
      right satisfies Record<string, SonicWeavePrimitive>;
      for (const key in right) {
        if (!(key in left)) {
          throw new Error(`Unable broadcast records together on key ${key}.`);
        }
      }
      const resultEntries: [string, SonicWeavePrimitive][] = [];
      for (const [key, value] of entries) {
        if (!(key in right)) {
          throw new Error(`Unable broadcast records together on key ${key}.`);
        }
        this.spendGas();
        resultEntries.push([key, fn(value, right[key]) as SonicWeavePrimitive]);
      }
      return Object.fromEntries(resultEntries);
    }
    this.spendGas(entries.length);
    return Object.fromEntries(
      entries.map(([key, value]) => [
        key,
        fn(value, right) as SonicWeavePrimitive,
      ])
    );
  }
  if (Array.isArray(right)) {
    this.spendGas(right.length);
    return right.map(r => fn(left, r)) as SonicWeaveValue;
  }
  if (
    typeof right !== 'object' ||
    right instanceof Color ||
    right instanceof Interval ||
    right instanceof Val
  ) {
    throw new Error('Invalid container broadcast.');
  }
  right satisfies Record<string, SonicWeavePrimitive>;
  const entries = Object.entries(right);
  this.spendGas(entries.length);
  return Object.fromEntries(
    entries.map(([key, value]) => [key, fn(left, value) as SonicWeavePrimitive])
  );
}
