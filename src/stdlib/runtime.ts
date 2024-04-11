import {
  type ArrowFunction,
  type FunctionDeclaration,
  type Parameter,
} from '../ast';
import {Color, Interval, Val} from '../interval';
import {TimeMonzo} from '../monzo';
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
export function upcastBool(b: boolean) {
  return b ? INT_CACHE[1].shallowClone() : INT_CACHE[0].shallowClone();
}

/**
 * Obtain the truth value of a SonicWeave value.
 * @param test Value to convert.
 * @returns Boolean corresponding to the truthiness of the test value.
 */
export function sonicTruth(test: SonicWeaveValue) {
  if (test instanceof Interval) {
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
      parameter.defaultValue = {
        type: 'StringLiteral',
        value: JSON.parse(defaultValue),
      };
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
