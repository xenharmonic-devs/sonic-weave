/**
 * Exported builtins without complications related to expression visitors or vectorization.
 */
import {Fraction, wilsonHeight as xduWilson} from 'xen-dev-utils';
import {Color, Interval, Temperament, Val, ValBasis} from '../interval';
import {type ExpressionVisitor} from '../parser/expression';
import {FRACTION_PRIMES, NEGATIVE_ONE, TWO} from '../utils';
import {SonicWeavePrimitive, SonicWeaveValue, upcastBool} from './runtime';
import {TimeMonzo, TimeReal} from '../monzo';
import {type RootContext} from '../context';

/**
 * Compare two primitive values.
 * @param this {@link RootContext} for comparing across echelons.
 * @param a Left value.
 * @param b Right value.
 * @returns A negative number if a is less than b, a positive number if a is greater than b, zero if equal.
 */
export function compare(
  this: RootContext | undefined,
  a: SonicWeavePrimitive,
  b: SonicWeavePrimitive
): number {
  if (typeof a === 'string') {
    if (typeof b !== 'string') {
      throw new Error('Only strings can be compared with other strings.');
    }
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  }
  if (typeof a === 'boolean') {
    a = upcastBool(a);
  }
  if (typeof b === 'boolean') {
    b = upcastBool(b);
  }
  if (!(a instanceof Interval && b instanceof Interval)) {
    throw new Error('Only strings or intervals can be compared.');
  }
  if (a.isRelative() && b.isRelative()) {
    return a.compare(b);
  }
  if (a.isAbsolute() && b.isAbsolute()) {
    const ab = absolute.bind(this);
    return ab(a).compare(ab(b));
  }
  const r = relative.bind(this);
  return r(a).compare(r(b));
}

/**
 * Get rid of interval formatting. Simplifies a ratio to lowest terms.
 * @param interval Interval or val to simplify.
 * @returns The interval without a virtual AST node to bias formatting.
 */
export function simplify(interval: Interval | boolean): Interval;
export function simplify(interval: Val): Val;
export function simplify(interval: Val | Interval | boolean): typeof interval {
  if (interval instanceof Val) {
    return new Val(interval.value.clone(), interval.basis);
  }
  if (typeof interval === 'boolean') {
    return upcastBool(interval);
  }
  if (interval instanceof Interval) {
    return new Interval(
      interval.value.clone(),
      interval.domain,
      interval.steps,
      undefined,
      interval
    );
  }
  throw new Error('An interval, val or boolean is required.');
}

/**
 * Get rid of interval coloring and label.
 * @param interval Interval to bleach.
 * @returns The interval without color or label information.
 */
export function bleach(interval: Interval | boolean): Interval {
  interval = upcastBool(interval);
  return new Interval(
    interval.value.clone(),
    interval.domain,
    interval.steps,
    interval.node
  );
}

/**
 * Convert interval to linear representation.
 * @param interval Interval to convert.
 * @returns The interval in the linear domain with the underlying value unmodified.
 */
export function linear(interval: Interval | boolean): Interval {
  interval = upcastBool(interval);
  if (interval.domain === 'linear') {
    return interval.shallowClone();
  }
  return new Interval(
    interval.value.clone(),
    'linear',
    interval.steps,
    undefined,
    interval
  );
}

/**
 * Convert interval to logarithmic representation.
 * @param interval Interval to convert.
 * @returns The interval in the logarithmic domain with the underlying value unmodified.
 */
export function logarithmic(this: any, interval: Interval | boolean): Interval {
  interval = upcastBool(interval);
  if (interval.domain === 'logarithmic') {
    return interval.shallowClone();
  }
  return new Interval(
    interval.value.clone(),
    'logarithmic',
    interval.steps,
    undefined,
    interval
  );
}

/**
 * Convert interval to absolute representation. Normalized to a frequency.
 * @param this {@link RootContext} for unison frequency.
 * @param interval Interval to convert.
 * @returns The interval as a frequency in its respective domain.
 */
export function absolute(
  this: RootContext | undefined,
  interval: Interval | boolean
): Interval {
  interval = upcastBool(interval);
  if (interval.isAbsolute()) {
    const te = interval.value.timeExponent;
    if (NEGATIVE_ONE.equals(te)) {
      return interval.shallowClone();
    }
    return new Interval(
      interval.value.pow(te instanceof Fraction ? te.inverse().neg() : -1 / te),
      interval.domain,
      interval.steps,
      undefined,
      interval
    );
  }
  if (this?.unisonFrequency === undefined) {
    throw new Error(
      'Reference frequency must be set for relative -> absolute conversion. Try 1/1 = 440 Hz.'
    );
  }
  return new Interval(
    interval.value.mul(this.unisonFrequency),
    interval.domain,
    interval.steps,
    undefined,
    interval
  );
}

/**
 * Convert interval to relative representation. Normalized to a frequency ratio.
 * @param this {@link RootContext} for unison frequency.
 * @param interval Interval to convert.
 * @returns The interval as a frequency ratio in its respective domain.
 */
export function relative(
  this: RootContext | undefined,
  interval: Interval | boolean
): Interval {
  interval = upcastBool(interval);
  if (interval.isRelative()) {
    return interval.shallowClone();
  }
  if (this?.unisonFrequency === undefined) {
    throw new Error(
      'Reference frequency must be set for absolute -> relative conversion. Try 1/1 = 440 Hz.'
    );
  }
  const absolute_ = absolute.bind(this)(interval);
  return new Interval(
    absolute_.value.div(this.unisonFrequency),
    interval.domain,
    interval.steps,
    undefined,
    interval
  );
}

/**
 * Calculate the Tenney height of the interval. Natural logarithm of numerator times denominator.
 * @param this {@link RootContext} for the height of absolute intervals.
 * @param interval Interval to measure.
 * @returns Relative linear interval representing the Tenney height.
 */
export function tenneyHeight(
  this: RootContext | undefined,
  interval: Interval | boolean
): Interval {
  return new Interval(
    TimeReal.fromValue(
      relative.bind(this)(upcastBool(interval)).value.tenneyHeight()
    ),
    'linear'
  );
}

/**
 * Calculate the Wilson height of the interval. Sum of prime absolute factors with repetition.
 * @param this {@link RootContext} for the height of absolute intervals.
 * @param interval Interval to measure.
 * @returns Relative linear interval representing the Wilson height.
 */
export function wilsonHeight(
  this: RootContext | undefined,
  interval: Interval | boolean
): Interval {
  const monzo = relative.bind(this)(upcastBool(interval)).value;
  if (monzo instanceof TimeReal) {
    return new Interval(TimeReal.fromValue(Infinity), 'linear');
  }
  const resHeight = xduWilson(monzo.residual);
  if (resHeight === Infinity) {
    return new Interval(TimeReal.fromValue(Infinity), 'linear');
  }
  let result = new Fraction(resHeight);
  const pe = monzo.primeExponents;
  for (let i = 0; i < pe.length; ++i) {
    result = result.add(pe[i].abs().mul(FRACTION_PRIMES[i]));
  }

  return new Interval(TimeMonzo.fromFraction(result), 'linear');
}

/**
 * Attach a tracking ID to the interval.
 * @param this {@link RootContext} for the next tracking ID.
 * @param interval Interval to track.
 * @returns A copy of the interval that can be tracked e.g. for changes in scale order.
 */
export function track(this: RootContext | undefined, interval: Interval) {
  if (!this) {
    throw new Error('Root context required for tracking.');
  }
  const result = interval.shallowClone();
  result.trackingIds.add(this.nextTrackingId());
  return result;
}

/**
 * Sort the current/given scale in ascending order (in place).
 * @param this {@link ExpressionVisitor} instance providing the current scale and context for comparing across echelons.
 * @param scale Musical scale to sort (defaults to context scale).
 * @param compareFn SonicWeave riff for comparing elements.
 */
export function sortInPlace(
  this: ExpressionVisitor,
  scale?: Interval[],
  compareFn?: Function
) {
  scale ??= this.currentScale;
  if (!Array.isArray(scale)) {
    throw new Error('Only arrays can be sorted.');
  }
  if (compareFn === undefined) {
    scale.sort(compare.bind(this.rootContext));
  } else {
    scale.sort((a, b) =>
      (compareFn.bind(this)(a, b) as Interval).value.valueOf()
    );
  }
}

function repr_(
  this: RootContext | undefined,
  value: SonicWeaveValue | null,
  depth = 2
): string {
  if (value === null) {
    return '';
  }
  if (value === undefined) {
    return 'niente';
  }
  if (value instanceof Interval) {
    return value.toString(this);
  }
  if (Array.isArray(value)) {
    if (depth < 0) {
      return '[Array]';
    }
    const s = repr_.bind(this);
    return '[' + value.map(e => s(e, depth - 1)).join(', ') + ']';
  }
  if (typeof value === 'function') {
    return value.__node__.text;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (
    value instanceof Color ||
    value instanceof Val ||
    value instanceof ValBasis ||
    value instanceof Temperament
  ) {
    return value.toString();
  }
  if (typeof value === 'object') {
    const s = repr_.bind(this);
    return (
      '#{' +
      Object.entries(value)
        .map(([k, v]) => `${s(k)}: ${s(v)}`)
        .join(', ') +
      '}'
    );
  }
  return `${value}`;
}

/**
 * Obtain a string representation of the value (with color and label).
 * @param this {@link RootContext} for ups-and-downs etc.
 * @param value Value to represent.
 * @returns String that evaluates to the value.
 */
export function repr(this: RootContext | undefined, value: SonicWeaveValue) {
  return repr_.bind(this)(value);
}

/**
 * Obtain a string representation of the value (w/o color or label).
 * @param this {@link RootContext} for ups-and-downs etc.
 * @param value Value to represent.
 * @returns String that evaluates to the value.
 */
export function str(this: RootContext | undefined, value: SonicWeaveValue) {
  if (value instanceof Interval) {
    return value.str(this);
  }
  return repr_.bind(this)(value);
}

/**
 * Obtain a "best effort" string representation of the value that's below the maximum length (w/o color or label).
 * @param this {@link RootContext} for ups-and-downs etc.
 * @param value Value to represent.
 * @param maxLength Maximum length of the result.
 * @returns Short string representation that's below the maximum length if possible.
 */
export function lstr(
  this: RootContext | undefined,
  value: SonicWeaveValue,
  maxLength: number
) {
  if (value instanceof Interval) {
    let result = value.str(this);
    if (result.length <= maxLength) {
      return result;
    }
    if (value.steps) {
      return value.simpleStr();
    }
    const monzo = value.value;
    result = monzo.toString(value.domain);
    if (result.length <= maxLength) {
      return result;
    }
    if (monzo instanceof TimeReal) {
      if (isNaN(monzo.value) || !isFinite(monzo.value)) {
        return result;
      }
      if (value.domain === 'linear') {
        let suffix = 'r';
        if (monzo.timeExponent === -1) {
          suffix = suffix + 'Hz';
        } else if (monzo.timeExponent === 1) {
          suffix = suffix + 's';
        } else if (monzo.timeExponent) {
          suffix = suffix + 's^*';
        }
        for (let i = maxLength - 1; i >= 2; --i) {
          result = monzo.value.toPrecision(i) + suffix;
          if (result.length <= maxLength) {
            return result;
          }
        }
        return monzo.value.toPrecision(1) + suffix;
      }
      if (monzo.timeExponent || monzo.value <= 0) {
        return value.simpleStr();
      }
      const cents = monzo.totalCents();
      const suffix = 'r¢';
      for (let i = maxLength - 2; i >= 2; --i) {
        result = cents.toPrecision(i) + suffix;
        if (result.length <= maxLength) {
          return result;
        }
      }
      return cents.toPrecision(1) + suffix;
    }
    const x = monzo.valueOf();
    if (value.domain === 'linear') {
      if (!monzo.timeExponent.n) {
        for (let i = maxLength - 1; i >= 2; --i) {
          result = x.toPrecision(i);
          if (!result.includes('e')) {
            result += 'e';
          }
          if (result.length <= maxLength) {
            return result;
          }
        }
        result = x.toPrecision(1);
        if (!result.includes('e')) {
          result += 'e';
        }
        return result;
      }
      let suffix = 's^*';
      const t = monzo.timeExponent.valueOf();
      if (t === 1) {
        suffix = 's';
      } else if (t === -1) {
        suffix = 'Hz';
      }
      for (let i = maxLength - 1; i >= 2; --i) {
        result = x.toPrecision(i) + suffix;
        if (result.length <= maxLength) {
          return result;
        }
      }
      return x.toPrecision(1) + suffix;
    }
    if (monzo.timeExponent.n || monzo.residual.s !== 1) {
      return value.simpleStr();
    }
    const cents = monzo.totalCents();
    result = cents.toString();
    if (result.includes('e') || !result.includes('.')) {
      result += '¢';
    }
    if (result.length <= maxLength) {
      return result;
    }
    for (let i = maxLength - 1; i >= 2; --i) {
      result = cents.toPrecision(i);
      if (result.includes('e') || !result.includes('.')) {
        result += '¢';
      }
      if (result.length <= maxLength) {
        return result;
      }
    }
    result = cents.toPrecision(1);
    if (result.includes('e') || !result.includes('.')) {
      result += '¢';
    }
    return result;
  }
  return repr_.bind(this)(value);
}

/**
 * Color based on the size of the interval. Hue wraps around every 1200 cents.
 * @param this {@link RootContext} for unison frequency.
 * @param interval Interval to measure.
 * @returns Color corresponding to the size of the interval.
 */
export function centsColor(this: RootContext | undefined, interval: Interval) {
  const octaves = relative.bind(this)(interval).totalCents() / 1200;
  const h = octaves * 360;
  const s = Math.tanh(1 - octaves * 0.5) * 50 + 50;
  const l = Math.tanh(octaves * 0.2) * 50 + 50;
  return new Color(`hsl(${h.toFixed(3)}deg ${s.toFixed(3)}% ${l.toFixed(3)}%)`);
}

// Prime colors for over/under.
const PRIME_RGB = [
  // 2
  [
    [0, 0, 0],
    [0, 0, 0],
  ],
  // 3
  [
    [60, 60, 60],
    [-60, -60, -60],
  ],
  // 5
  [
    [255, 255, 0],
    [0, 255, 0],
  ],
  // 7
  [
    [0, 0, 255],
    [255, 0, 0],
  ],
  // 11
  [
    [180, 190, 250],
    [250, 180, 190],
  ],
  // 13
  [
    [255, -100, 255],
    [-100, 255, 255],
  ],
];

function tanh255(x: number) {
  return (127.5 * Math.tanh(x / 300 - 0.75) + 127.5).toFixed(3);
}

/**
 * Color an interval based on its prime factors.
 * @param interval Interval to factor.
 * @returns RBG color combination that reflects the factors of the interval.
 */
export function factorColor(this: RootContext | undefined, interval: Interval) {
  interval = relative.bind(this)(interval);
  let r = 0;
  let g = 0;
  let b = 0;
  if (interval.value instanceof TimeMonzo) {
    const monzo = interval.value.primeExponents.map(f => f.valueOf());
    for (let i = 0; i < Math.min(monzo.length, PRIME_RGB.length); ++i) {
      const prgb = monzo[i] > 0 ? PRIME_RGB[i][0] : PRIME_RGB[i][1];
      const m = Math.abs(monzo[i]);
      r += prgb[0] * m;
      g += prgb[1] * m;
      b += prgb[2] * m;
    }
  }
  return new Color(`rgb(${tanh255(r)} ${tanh255(g)} ${tanh255(b)})`);
}

/**
 * Temper an interval using a val i.e. map exponents of prime factors to steps on an equal temperament.
 * @param this {@link RootContext} for unison frequency.
 * @param interval Interval to map to equal steps.
 * @param val Val to map by.
 * @returns The interval tempered to equal steps of the val's equave.
 */
export function temper(
  this: RootContext | undefined,
  val: Val,
  interval: Interval | Interval[]
): typeof interval {
  const divisions = val.divisions;
  let step: Interval;
  if (divisions.n) {
    try {
      const equave = val.equave.toFraction();
      let equaveNumerator: number | null = null;
      let equaveDenominator: number | null = null;
      if (equave.compare(TWO)) {
        equaveNumerator = equave.n;
        if (equave.d !== 1) {
          equaveDenominator = equave.d;
        }
      }
      step = new Interval(
        TimeMonzo.fromFraction(equave).pow(divisions.inverse()),
        'logarithmic',
        0,
        {
          type: 'NedjiLiteral',
          numerator: divisions.d,
          denominator: divisions.n,
          equaveNumerator,
          equaveDenominator,
        }
      );
    } catch {
      step = new Interval(val.equave.pow(divisions.inverse()), 'logarithmic');
    }
  } else {
    step = new Interval(val.equave.pow(0), 'logarithmic');
  }
  const rel = relative.bind(this);
  if (Array.isArray(interval)) {
    return interval.map(i => {
      i = rel(i);
      const t = i.value.tail(val.value.numberOfComponents);
      const d = i.dot(val);
      if (!divisions.n && d.valueOf()) {
        throw new Error(
          'Non-unitary tempering by zero divisions of an equave.'
        );
      }
      const result = d.mul(step);
      if (t.totalCents(true)) {
        return new Interval(t, 'logarithmic').add(result);
      }
      return result;
    });
  }
  interval = rel(interval);
  const t = interval.value.tail(val.value.numberOfComponents);
  const d = interval.dot(val);
  if (!divisions.n && d.valueOf()) {
    throw new Error('Non-unitary tempering by zero divisions of an equave.');
  }
  const result = d.mul(step);
  if (t.totalCents(true)) {
    return new Interval(t, 'logarithmic').add(result);
  }
  return result;
}
