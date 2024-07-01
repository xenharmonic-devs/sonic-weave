import {Interval} from '../../interval';
import {TimeMonzo, TimeReal} from '../../monzo';
import {ExpressionVisitor} from '../../parser/expression';
import {
  SonicWeaveFunction,
  SonicWeaveValue,
  binaryBroadcast,
  builtinNode,
  isArrayOrRecord,
  requireParameters,
  unaryBroadcast,
  upcastBool,
} from '../runtime';

// == Constants
const E = new Interval(TimeReal.fromValue(Math.E), 'linear');
const LN10 = new Interval(TimeReal.fromValue(Math.LN10), 'linear');
const LN2 = new Interval(TimeReal.fromValue(Math.LN2), 'linear');
const LOG10E = new Interval(TimeReal.fromValue(Math.LOG10E), 'linear');
const LOG2E = new Interval(TimeReal.fromValue(Math.LOG2E), 'linear');
const PI = new Interval(TimeReal.fromValue(Math.PI), 'linear');
const SQRT1_2 = new Interval(TimeMonzo.fromEqualTemperament('-1/2'), 'linear');
const SQRT2 = new Interval(TimeMonzo.fromEqualTemperament('1/2'), 'linear');
const TAU = new Interval(TimeReal.fromValue(2 * Math.PI), 'linear');

// == Real-valued Math wrappers ==
const MATH_WRAPPERS: Record<string, SonicWeaveFunction> = {};
const MATH_KEYS: (keyof Math)[] = [
  'acos',
  'asin',
  'atan',
  'clz32',
  'cos',
  'expm1',
  'fround',
  'imul',
  'log1p',
  'sin',
  'tan',
];
// There's no way to produce logarithmic quantities using logdivision.
// The log-associated functions get the same treatment as their stdlib counterparts.
const LOGS: (keyof Math)[] = ['acos', 'asin', 'atan', 'clz32', 'log1p'];

for (const name of MATH_KEYS) {
  const fn = Math[name] as (x: number) => number;
  // eslint-disable-next-line no-inner-declarations
  function wrapper(
    this: ExpressionVisitor,
    x: SonicWeaveValue
  ): SonicWeaveValue {
    requireParameters({x});
    if (typeof x === 'boolean' || x instanceof Interval) {
      x = upcastBool(x);
      return new Interval(
        TimeReal.fromValue(fn(x.valueOf())),
        LOGS.includes(name) ? 'linear' : x.domain,
        0,
        undefined,
        x
      );
    }
    const w = wrapper.bind(this);
    return unaryBroadcast.bind(this)(x, w);
  }
  Object.defineProperty(wrapper, 'name', {value: name, enumerable: false});
  wrapper.__doc__ = `Calculate ${String(name)} x.`;
  wrapper.__node__ = builtinNode(wrapper);
  MATH_WRAPPERS[name as string] = wrapper;
}

function atan2(
  this: ExpressionVisitor,
  y: SonicWeaveValue,
  x: SonicWeaveValue
): SonicWeaveValue {
  if (isArrayOrRecord(y) || isArrayOrRecord(x)) {
    return binaryBroadcast.bind(this)(y, x, atan2.bind(this));
  }
  y = upcastBool(y);
  x = upcastBool(x);
  return new Interval(
    TimeReal.fromValue(Math.atan2(y.valueOf(), x.valueOf())),
    'linear'
  );
}
atan2.__doc__ =
  'Calculate atan2(y, x) which is the angle between (1, 0) and (x, y), chosen to lie in (−π; π], positive anticlockwise.';
atan2.__node__ = builtinNode(atan2);

// Equivalent to atan2 but with swapped arguments.
// Rationale is that atanXY(x, y) = log(x + i * y), x and y now coordinates.
function atanXY(
  this: ExpressionVisitor,
  x: SonicWeaveValue,
  y: SonicWeaveValue
) {
  return atan2.bind(this)(y, x);
}
atanXY.__doc__ =
  'Calculate atanXY(x, y) = atan2(y, x) which is the angle between (1, 0) and (x, y), chosen to lie in (−π; π], positive anticlockwise.';
atanXY.__node__ = builtinNode(atanXY);

export const MATH_BUILTINS: Record<string, Interval | SonicWeaveFunction> = {
  ...MATH_WRAPPERS,
  atan2,
  atanXY,
  // Constants
  E,
  LN10,
  LN2,
  LOG10E,
  LOG2E,
  PI,
  SQRT1_2,
  SQRT2,
  TAU,
};
