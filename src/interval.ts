import {
  IntervalLiteral,
  NedjiLiteral,
  addNodes,
  divNodes,
  mulNodes,
  projectNodes,
  subNodes,
  literalToString,
  modNodes,
  roundToNodes,
  validateNode,
  negNode,
  invertNode,
  absNode,
  lensAddNodes,
  lensSubNodes,
  pitchRoundToNodes,
  powNodes,
  ipowNodes,
  logNodes,
  reduceNodes,
  inferFJSFlavor,
  integerToVectorComponent,
  MonzoLiteral,
  literalToJSON,
  intervalLiteralFromJSON,
  sqrtNode,
  pitchAbsNode,
  ValBasisLiteral,
  CoIntervalLiteral,
  WartBasisElement,
} from './expression';
import {TimeMonzo, TimeReal, getNumberOfComponents} from './monzo';
import {asAbsoluteFJS, asFJS} from './fjs';
import {type RootContext} from './context';
import {
  NUM_INTERCHANGE_COMPONENTS,
  ONE,
  ZERO,
  countUpsAndLifts,
  setUnion,
} from './utils';
import {
  BIG_INT_PRIMES,
  Fraction,
  FractionValue,
  FractionalMonzo,
  GramResult,
  LOG_PRIMES,
  Monzo,
  PRIMES,
  PRIME_CENTS,
  ProtoFractionalMonzo,
  add,
  applyWeights,
  arraysEqual,
  cokernel,
  defactoredHnf,
  dot,
  dotPrecise,
  fractionalDot,
  fractionalLenstraLenstraLovasz,
  gram,
  hnf,
  kernel,
  lenstraLenstraLovasz,
  preimage,
  primeFactorize,
  primeLimit,
  pruneZeroRows,
  scale,
  sub,
  transpose,
  unapplyWeights,
} from 'xen-dev-utils';
import {TuningMap, combineTuningMaps} from './temper';

/**
 * Interval domain. The operator '+' means addition in the linear domain. In the logarithmic domain '+' correspond to multiplication of the underlying values instead.
 */
export type IntervalDomain = 'linear' | 'logarithmic';

/**
 * How to treat subgroups with non-primes during temperament optimization.
 *
 * - 'subgroup': Promote composite/fractional subgroup to a prime subgroup and project result.
 *
 * - 'inharmonic': Treat formal primes as prime numbers according to their size.
 *
 * - 'Tenney-Pakkanen': Weigh formal primes according to their Tenney-height.
 */
export type FormalPrimeMetric = 'subgroup' | 'inharmonic' | 'Tenney-Pakkanen';

/**
 * CSS color value.
 */
export class Color {
  value: string;

  constructor(value: string) {
    this.value = value;
  }

  /**
   * SonicWeave representation of the CSS color.
   * @returns The color value as a string.
   */
  toString() {
    return this.value;
  }

  /**
   * Check if this color is strictly the same as another.
   * @param other Another Color instance.
   * @returns `true` if the colors have the same value.
   */
  strictEquals(other: Color) {
    return this.value === other.value;
  }
}

const TWO = new TimeMonzo(ZERO, [ONE]);

function logLinMul(
  logarithmic: Interval,
  linear: Interval,
  node?: IntervalLiteral,
  zombie?: Interval
) {
  if (linear.steps) {
    throw new Error('Cannot multiply with a stepful scalar.');
  }
  let steps = 0;
  if (logarithmic.steps) {
    steps = logarithmic.steps * linear.valueOf();
    if (!Number.isInteger(steps)) {
      throw new Error('Cannot create fractional steps.');
    }
  }
  if (linear.value instanceof TimeReal) {
    const size = logarithmic.totalCents();
    return new Interval(
      TimeReal.fromCents(size * linear.value.valueOf()),
      logarithmic.domain,
      steps,
      node,
      zombie
    );
  }
  const value = logarithmic.value.pow(linear.value);
  if (
    logarithmic.node?.type === 'FJS' ||
    logarithmic.node?.type === 'AspiringFJS'
  ) {
    node = {type: 'AspiringFJS', flavor: ''};
  }
  return new Interval(value, logarithmic.domain, steps, node, zombie);
}

/**
 * Infer a color, a label and tracking identifiers from two {@link Interval} instances.
 * @param left The preferred source of information.
 * @param right The secondary source of information.
 * @returns Dummy interval with the combined information.
 */
export function infect(left: Interval, right: Interval) {
  ZOMBIE.color = left.color ?? right.color;
  ZOMBIE.label = left.label || right.label;
  ZOMBIE.trackingIds = setUnion(left.trackingIds, right.trackingIds);
  return ZOMBIE;
}

/**
 * Calculate the logarithm of the first value in the base of the second value.
 * @param left Logarithmand.
 * @param right Logdividend.
 * @returns Left value divided by the right value as a {@link TimeMonzo} or {@link TimeReal}.
 */
export function log(left: Interval, right: Interval) {
  const log = left.value.log(right.value);
  if (typeof log === 'number') {
    if (left.steps || right.steps) {
      throw new Error('Steps do not match in logarithm.');
    }
    return TimeReal.fromValue(log);
  } else {
    if (!log.mul(right.steps).equals(left.steps)) {
      throw new Error('Steps do not match in logarithm.');
    }
    return TimeMonzo.fromFraction(log);
  }
}

/**
 * A musical interval associated with a domain, an AST node, CSS color, note label and tracking identifiers.
 */
export class Interval {
  value: TimeMonzo | TimeReal;
  domain: IntervalDomain;
  steps: number;
  node?: IntervalLiteral;
  color?: Color;
  label: string;
  trackingIds: Set<number>;

  /**
   * Construct a musical interval.
   * @param value A time monzo representing the size and echelon (frequency vs. frequency ratio) of the interval.
   * @param domain Domain determining what addition means.
   * @param steps A steps offset used in tempering.
   * @param node Node in the abstract syntax tree used for string representation.
   * @param convert Another {@link Interval} instance to obtain CSS color, note label and tracking information from.
   */
  constructor(
    value: TimeMonzo | TimeReal,
    domain: IntervalDomain,
    steps = 0,
    node?: IntervalLiteral,
    convert?: Interval
  ) {
    validateNode(node);
    this.value = value;
    this.domain = domain;
    this.steps = steps;
    this.node = node;
    this.trackingIds = new Set();
    if (convert !== undefined) {
      this.color = convert.color;
      this.label = convert.label;
      for (const id of convert.trackingIds) {
        this.trackingIds.add(id);
      }
    } else {
      this.label = '';
    }
  }

  /**
   * Construct a linear domain interval from an integer.
   * @param value Integer to convert.
   * @param convert Another {@link Interval} instance to obtain CSS color, note label and tracking information from.
   * @returns Musical interval representing a harmonic.
   */
  static fromInteger(value: number | bigint, convert?: Interval) {
    value = BigInt(value);
    const monzo = TimeMonzo.fromBigInt(value);
    return new Interval(
      monzo,
      'linear',
      0,
      {type: 'IntegerLiteral', value},
      convert
    );
  }

  /**
   * Construct a linear domain interval from a fraction.
   * @param value Rational number to convert.
   * @param convert Another {@link Interval} instance to obtain CSS color, note label and tracking information from.
   * @returns Musical interval representing a frequency ratio.
   */
  static fromFraction(value: FractionValue, convert?: Interval) {
    const monzo = TimeMonzo.fromFraction(value);
    const {numerator, denominator} = monzo.toBigNumeratorDenominator();
    return new Interval(
      monzo,
      'linear',
      0,
      {type: 'FractionLiteral', numerator, denominator},
      convert
    );
  }

  /**
   * Construct a linear domain interval from a real number.
   * @param value Real number to convert.
   * @param convert Another {@link Interval} instance to obtain CSS color, note label and tracking information from.
   * @returns Musical interval representing a (possibly irrational) frequency ratio.
   */
  static fromValue(value: number, convert?: Interval) {
    const real = TimeReal.fromValue(value);
    return new Interval(real, 'linear', 0, real.asDecimalLiteral(), convert);
  }

  /**
   * Revive an {@link Interval} instance produced by `Interval.toJSON()`. Return everything else as is.
   *
   * Intended usage:
   * ```ts
   * const data = JSON.parse(serializedData, Interval.reviver);
   * ```
   *
   * @param key Property name.
   * @param value Property value.
   * @returns Deserialized {@link Interval} instance or other data without modifications.
   */
  static reviver(key: string, value: any) {
    if (
      typeof value === 'object' &&
      value !== null &&
      value.type === 'Interval'
    ) {
      let monzo: TimeMonzo | TimeReal;
      if (value.v.type === 'TimeMonzo') {
        monzo = TimeMonzo.reviver('value', value.v);
      } else {
        monzo = TimeReal.reviver('value', value.v);
      }
      const result = new Interval(
        monzo,
        value.d ? 'logarithmic' : 'linear',
        value.s,
        intervalLiteralFromJSON(value.n)
      );
      result.label = value.l;
      result.color = value.c && new Color(value.c);
      result.trackingIds = new Set(value.t);
      return result;
    }
    return value;
  }

  /**
   * Serialize the time monzo to a JSON compatible object.
   * @returns The serialized object with property `type` set to `'Interval'`.
   */
  toJSON(): any {
    return {
      type: 'Interval',
      v: this.value.toJSON(),
      d: this.domain === 'linear' ? 0 : 1,
      s: this.steps,
      l: this.label,
      c: this.color && this.color.value,
      n: literalToJSON(this.node),
      t: Array.from(this.trackingIds),
    };
  }

  /**
   * Clone this {@link Interval} instance without deeply copying any of the parts.
   * @returns An interval like this one but replacing any of the parts won't change the original.
   */
  shallowClone(): Interval {
    return new Interval(this.value, this.domain, this.steps, this.node, this);
  }

  /**
   * Clone this {@link Interval instance} including the value.
   * @returns An interval like this one but mutating the value won't change the original.
   */
  clone(): Interval {
    return new Interval(
      this.value.clone(),
      this.domain,
      this.steps,
      {...this.node} as IntervalLiteral,
      this
    );
  }

  /** Convert the interval to an integer. */
  toInteger(): number {
    if (this.value instanceof TimeReal && Number.isInteger(this.value.value)) {
      return this.value.value;
    }
    return Number(this.value.toBigInteger());
  }

  /** Convert the interval to a fraction in linear space. */
  toFraction(): Fraction {
    return this.value.toFraction();
  }

  /** Return `true` if the interval represents a ratio of frequencies. */
  isRelative() {
    return !this.value.timeExponent.valueOf();
  }

  /** Return `true` if the interval could be interpreted as a frequency. */
  isAbsolute() {
    return !!this.value.timeExponent.valueOf();
  }

  /**
   * Return the size of the interval in cents.
   * @param ignoreSign Compute the size of the absolute value.
   */
  totalCents(ignoreSign = false) {
    return this.value.totalCents(ignoreSign);
  }

  /**
   * Negate the frequency/value of a linear interval or reflect a logarithmic interval about the unison.
   * @returns Negative counterpart of this interval.
   */
  neg() {
    const node = negNode(this.node);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.neg(),
        this.domain,
        this.steps, // Iffy, but not wrong.
        node,
        this
      );
    }
    return new Interval(
      this.value.inverse(),
      this.domain,
      -this.steps,
      node,
      this
    );
  }

  /**
   * Invert the value of a linear interval or convert a logarithmic interval to a val that maps it to unity.
   * @returns Inverse of this interval.
   */
  inverse() {
    const node = invertNode(this.node);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.inverse(),
        this.domain,
        -this.steps,
        node,
        this
      );
    }
    if (this.value instanceof TimeReal) {
      throw new Error('Unable to convert irrational number to val.');
    }
    // This overload should be fine because multiplication is not implemented in the logarithmic domain.
    return new Val(
      this.value.geometricInverse(),
      new ValBasis([this.value.clone()]),
      undefined
    );
  }

  /**
   * Calculate the absolute value of a linear interval or obtain a logarithmic intervals distance to unison.
   * @returns Absolute value of this interval.
   */
  abs() {
    if (this.steps) {
      throw new Error('Steps are ambiguous in abs.');
    }
    const node = absNode(this.node);
    if (this.domain === 'linear') {
      return new Interval(this.value.abs(), this.domain, 0, node, this);
    }
    return new Interval(this.value.pitchAbs(), this.domain, 0, node, this);
  }

  /**
   * Calculate the geometric absolute value of a linter interval.
   * @returns Superunitary value.
   */
  pitchAbs() {
    if (this.domain === 'logarithmic') {
      throw new Error(
        'Logarithmic absolute value not implemented in the already-logarithmic domain.'
      );
    }
    if (this.steps) {
      throw new Error('Steps are ambiguous in labs.');
    }
    const node = pitchAbsNode(this.node);
    return new Interval(this.value.pitchAbs(), this.domain, 0, node, this);
  }

  /**
   * Calculate the square root of the underlying value regardless of domain.
   * @returns The square root.
   */
  sqrt() {
    if (this.steps % 2) {
      throw new Error('Cannot split steps using √.');
    }
    const node = sqrtNode(this.node);
    return new Interval(
      this.value.sqrt(),
      this.domain,
      this.steps / 2,
      node,
      this
    );
  }

  /**
   * Project the exponent of two to the given base.
   * @param base New base to replace prime two.
   * @returns N steps of equal divisions of the new base assuming this interval was N steps of an equally divided octave.
   */
  project(base: Interval) {
    const steps = this.value.octaves.mul(base.steps);
    if (steps.d !== 1) {
      throw new Error('Cannot create fractional steps.');
    }
    let node: undefined | IntervalLiteral;
    if (!steps.n) {
      node = projectNodes(this.node, base.node);
    }
    return new Interval(
      this.value.project(base.value),
      'logarithmic',
      steps.valueOf(),
      node,
      infect(this, base)
    );
  }

  /**
   * Add two linear intervals or multiply the underlying values of two logarithmic intervals.
   * @param other Another interval.
   * @returns Sum of the intervals.
   */
  add(other: Interval) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in addition.');
    }
    if (this.domain === 'linear' && (this.steps || other.steps)) {
      throw new Error('Linear addition of steps is not allowed.');
    }
    let node = addNodes(this.node, other.node);
    const value =
      this.domain === 'linear'
        ? this.value.add(other.value)
        : this.value.mul(other.value);
    if (!node && this.node?.type === other.node?.type) {
      node = intervalValueAs(value, this.node, true);
    }
    const zombie = infect(this, other);
    return new Interval(
      value,
      this.domain,
      this.steps + other.steps,
      node,
      zombie
    );
  }

  /**
   * Subtract two linear intervals or divide the underlying values of two logarithmic intervals.
   * @param other Another interval.
   * @returns Difference of the intervals.
   */
  sub(other: Interval) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in subtraction');
    }
    if (this.domain === 'linear' && (this.steps || other.steps)) {
      throw new Error('Linear subtraction of steps is not allowed.');
    }
    let node = subNodes(this.node, other.node);
    const value =
      this.domain === 'linear'
        ? this.value.sub(other.value)
        : this.value.div(other.value);
    if (!node && this.node?.type === other.node?.type) {
      node = intervalValueAs(value, this.node, true);
    }
    const zombie = infect(this, other);
    return new Interval(
      value,
      this.domain,
      this.steps - other.steps,
      node,
      zombie
    );
  }

  /**
   * Subtract this interval from another.
   * @param other Another interval.
   * @returns Difference of the intervals (with swapped arguments).
   */
  lsub(other: Interval) {
    const result = other.sub(this);
    result.color = this.color ?? other.color;
    result.label = this.label || other.label;
    return result;
  }

  /**
   * Harmonically add two intervals.
   * @param other Another interval.
   * @returns The lens sum of the intervals.
   */
  lensAdd(other: Interval) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in harmonic addition');
    }
    if (this.steps || other.steps) {
      throw new Error('Steps not supported in harmonic addition.');
    }
    const node = lensAddNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.lensAdd(other.value),
        this.domain,
        0,
        node,
        zombie
      );
    }
    if (this.value instanceof TimeReal || other.value instanceof TimeReal) {
      throw new Error('Irrational logarithmic lens addition not implemented.');
    }
    const magnitude = this.value.dot(this.value);
    if (!magnitude.n) {
      return new Interval(this.value.clone(), this.domain, 0, node, zombie);
    }
    const otherMagnitude = other.value.dot(other.value);
    if (!otherMagnitude.n) {
      return new Interval(other.value.clone(), this.domain, 0, node, zombie);
    }
    const value = this.value
      .pow(magnitude.inverse())
      .mul(other.value.pow(otherMagnitude.inverse()));

    if (value instanceof TimeReal) {
      throw new Error('Logarithmic lens addition failed.');
    }
    return new Interval(value.geometricInverse(), this.domain, 0, node, zombie);
  }

  /**
   * Harmonically subtract two intervals.
   * @param other Another interval.
   * @returns The lens difference of the intervals.
   */
  lensSub(other: Interval) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in harmonic subtraction');
    }
    if (this.steps || other.steps) {
      throw new Error('Steps not supported in harmonic subtraction.');
    }
    const node = lensSubNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.lensSub(other.value),
        this.domain,
        0,
        node,
        zombie
      );
    }
    if (this.value instanceof TimeReal || other.value instanceof TimeReal) {
      throw new Error(
        'Irrational logarithmic lens subtraction not implemented.'
      );
    }
    const magnitude = this.value.dot(this.value);
    if (!magnitude.n) {
      return new Interval(this.value.clone(), this.domain, 0, node, zombie);
    }
    const otherMagnitude = other.value.dot(other.value);
    if (!otherMagnitude.n) {
      return new Interval(other.value.clone(), this.domain, 0, node, zombie);
    }
    const value = this.value
      .pow(magnitude.inverse())
      .div(other.value.pow(otherMagnitude.inverse()));
    if (value instanceof TimeReal) {
      throw new Error('Logarithmic lens subtraction failed.');
    }
    return new Interval(value.geometricInverse(), this.domain, 0, node, zombie);
  }

  /**
   * Round a linear interval to a multiple of another or a logarithmic interval to a power of the underlying value of another.
   * @param other Another interval.
   * @returns Closest multiple of the other to this one.
   */
  roundTo(other: Interval) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in rounding');
    }
    if (this.steps || other.steps) {
      throw new Error('Steps not supported in rounding.');
    }
    const node = roundToNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.roundTo(other.value),
        this.domain,
        0,
        node,
        zombie
      );
    }
    return new Interval(
      this.value.pitchRoundTo(other.value),
      this.domain,
      0,
      node,
      zombie
    );
  }

  /**
   * Calculate the modulus of a linear interval with respect to another or reduce (repeatedly divide) the underlying value of a logarithmic interval by another.
   * @param other Another interval.
   * @param ceiling If `true` `x.mmod(x)` evaluates to `x`.
   * @returns This interval modulo other.
   */
  mmod(other: Interval, ceiling = false) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in modulo');
    }
    if (this.steps || other.steps) {
      throw new Error('Steps not supported in modulo.');
    }
    const node = modNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.mmod(other.value, ceiling),
        this.domain,
        0,
        node,
        zombie
      );
    }
    return new Interval(
      this.value.reduce(other.value, ceiling),
      this.domain,
      0,
      node,
      zombie
    );
  }

  /**
   * Round a linear interval to a power of another.
   * @param other Another interval.
   * @returns The closest power of the other to this one.
   */
  pitchRoundTo(other: Interval) {
    if (this.domain === 'logarithmic' || other.domain === 'logarithmic') {
      throw new Error(
        'Exponential rounding not implemented in logarithmic domain'
      );
    }
    if (this.steps || other.steps) {
      throw new Error('Steps not supported in pitch rounding.');
    }
    if (!other.value.isScalar()) {
      throw new Error('Only scalar exponential rounding implemented');
    }
    const node = pitchRoundToNodes(this.node, other.node);
    return new Interval(
      this.value.pitchRoundTo(other.value),
      this.domain,
      0,
      node,
      infect(this, other)
    );
  }

  /**
   * Multiply two linear intervals or raise the underlying value of a logarithmic interval to the power of a linear one.
   * @param other Another interval.
   * @returns The product of the intervals.
   */
  mul(other: Interval): Interval;
  mul(other: Val): Val;
  mul(other: Interval | Val) {
    if (this.domain !== 'linear' && other.domain !== 'linear') {
      throw new Error('At least one domain must be linear in multiplication');
    }
    if (other.domain === 'cologarithmic') {
      return other.mul(this);
    }
    const node = mulNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (other.domain === 'logarithmic') {
      return logLinMul(other, this, node, zombie);
    }
    if (this.domain === 'logarithmic') {
      return logLinMul(this, other, node, zombie);
    }
    return new Interval(
      this.value.mul(other.value),
      this.domain,
      this.steps + other.steps,
      node,
      zombie
    );
  }

  /**
   * Divide two linear intervals or take the root of the underlying value of a logarithmic interval with respect to a linear one.
   * The ratio of two logarithmic intervals is a linear scalar equal to the logdivision of the underlying values.
   * @param other Another interval.
   * @returns The ratio of the intervals.
   */
  div(other: Interval) {
    let node = divNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (other.domain === 'logarithmic') {
      if (this.domain !== 'logarithmic') {
        throw new Error('Domains must match in non-scalar division');
      }
      // Log throws an error if this won't work.
      const steps = this.steps / (other.steps || 1);
      return new Interval(log(this, other), 'linear', steps, node, zombie);
    }
    if (this.domain === 'logarithmic') {
      let steps = 0;
      if (this.steps) {
        steps = this.steps / other.valueOf();
        if (!Number.isInteger(steps)) {
          throw new Error('Cannot create fractional steps.');
        }
      }
      const value = this.value.pow(other.value.inverse());
      if (this.node?.type === 'FJS' || this.node?.type === 'AspiringFJS') {
        node = {type: 'AspiringFJS', flavor: ''};
      }
      return new Interval(value, this.domain, steps, node, zombie);
    }
    return new Interval(
      this.value.div(other.value),
      this.domain,
      this.steps - other.steps,
      node,
      zombie
    );
  }

  /**
   * Divide another interval by this one.
   * @param other Another interval.
   * @returns The ratio of the intervals (with swapped arguments).
   */
  ldiv(other: Interval) {
    const result = other.div(this);
    result.color = this.color ?? other.color;
    result.label = this.label || other.label;
    return result;
  }

  /**
   * Compute the dot product of the prime count vectors (monzos) associated with two intervals or an interval and a val.
   * @param other Another interval or a val.
   * @returns Linear domain interval representing the cosine of the unweighted angle between the prime counts.
   */
  dot(other: Interval | Val) {
    let product: Fraction;
    if (other.domain === 'cologarithmic') {
      // Rig ups and downs.
      product = this.value.dot(other.value).add(this.steps);
    } else {
      product = this.value.dot(other.value).add(this.steps * other.steps);
    }

    const zombie = other instanceof Interval ? infect(this, other) : this;
    if (product.d === 1) {
      const value = BigInt(product.s * product.n);
      return new Interval(
        TimeMonzo.fromBigInt(value),
        'linear',
        0,
        {
          type: 'IntegerLiteral',
          value,
        },
        zombie
      );
    }
    return new Interval(
      TimeMonzo.fromFraction(product),
      'linear',
      0,
      {
        type: 'FractionLiteral',
        numerator: BigInt(product.s * product.n),
        denominator: BigInt(product.d),
      },
      zombie
    );
  }

  /**
   * Raise a linear interval to the power of another.
   * @param other Another interval.
   * @returns This interval exponentiated by the other.
   */
  pow(other: Interval) {
    if (this.domain === 'logarithmic' || other.domain === 'logarithmic') {
      throw new Error('Exponentiation not implemented in logarithmic domain.');
    }
    if (!other.value.isScalar() || other.steps) {
      throw new Error('Only scalar exponentiation implemented.');
    }
    const node = powNodes(this.node, other.node);
    let steps = 0;
    if (this.steps) {
      steps = this.steps * other.valueOf();
      if (!Number.isInteger(steps)) {
        throw new Error('Cannot create fractional steps.');
      }
    }
    return new Interval(
      this.value.pow(other.value),
      this.domain,
      steps,
      node,
      infect(this, other)
    );
  }

  /**
   * Calculate the recipropower between two linear intervals.
   * @param other Another interval.
   * @returns The root of this interval with respect to the other.
   */
  ipow(other: Interval) {
    if (this.domain === 'logarithmic' || other.domain === 'logarithmic') {
      throw new Error(
        'Inverse exponentiation not implemented in logarithmic domain.'
      );
    }
    if (!other.value.isScalar() || other.steps) {
      throw new Error('Only scalar inverse exponentiation implemented.');
    }
    const node = ipowNodes(this.node, other.node);
    const exponent = other.value.inverse();
    let steps = 0;
    if (this.steps) {
      steps = this.steps * exponent.valueOf();
      if (!Number.isInteger(steps)) {
        throw new Error('Cannot create fractional steps.');
      }
    }
    return new Interval(
      this.value.pow(exponent),
      this.domain,
      steps,
      node,
      infect(this, other)
    );
  }

  /**
   * Calculate logdivision between two linear intervals.
   * @param other Another interval.
   * @returns The logarithm of this in the base of the other.
   */
  log(other: Interval) {
    if (this.domain === 'logarithmic' || other.domain === 'logarithmic') {
      throw new Error(
        'Logarithm not implemented in the (already) logarithmic domain.'
      );
    }
    // Log fails if this won't work.
    const steps = this.steps / (other.steps || 1);
    const node = logNodes(this.node, other.node);
    return new Interval(
      log(this, other),
      this.domain,
      steps,
      node,
      infect(this, other)
    );
  }

  /**
   * Equave-reduce a linear interval by another other.
   * @param other Another interval (the equave).
   * @param ceiling If `true` `x.reduce(x)` evaluates to `x`.
   * @returns This interval divided by the other until it's between it and unison.
   */
  reduce(other: Interval, ceiling = false) {
    if (this.domain === 'logarithmic' || other.domain === 'logarithmic') {
      throw new Error('Reduction not implemented in logarithmic domain.');
    }
    if (this.steps || other.steps) {
      throw new Error('Steps not supported in reduction.');
    }
    const node = reduceNodes(this.node, other.node);
    return new Interval(
      this.value.reduce(other.value, ceiling),
      this.domain,
      0,
      node,
      infect(this, other)
    );
  }

  /**
   * Calculate this many steps of the octave equally divided into `other` parts.
   * @param other Another interval (the edo).
   * @returns A logarithmic quantity representing two to the power of the ratio of the intervals.
   */
  backslash(other: Interval) {
    if (!this.value.isScalar() || !other.value.isScalar()) {
      throw new Error('Only scalars can be backslashed.');
    }
    if (this.domain !== 'linear' || other.domain !== 'linear') {
      throw new Error('Only linear backslashing implemented.');
    }
    if (this.steps || other.steps) {
      throw new Error('Steps not supported in backslashing.');
    }
    const value = TWO.pow(this.value.div(other.value));
    let node: NedjiLiteral | undefined;
    if (this.value.isIntegral() && other.value.isIntegral()) {
      node = {
        type: 'NedjiLiteral',
        numerator: this.toInteger(),
        denominator: other.toInteger(),
        equaveNumerator: null,
        equaveDenominator: null,
      };
    }
    return new Interval(value, 'logarithmic', 0, node, infect(this, other));
  }

  /**
   * Return a number suitable for `Array.sort()` to indicate the size of this interval w.r.t. the other.
   * @param other Another interval.
   * @returns A number that's less than zero if this is less than other, zero if equal and greater than zero otherwise.
   */
  compare(other: Interval) {
    return this.value.compare(other.value);
  }

  /**
   * Check if this interval has the same size as another.
   * @param other Another interval.
   * @returns `true` if this has the same size as the other.
   */
  equals(other: Interval) {
    return this.value.equals(other.value);
  }

  /**
   * Check for strict equality between this and another interval.
   * @param other Another interval.
   * @returns `true` if the values share the same time exponent, prime exponents, residual and cents offset and the domains match.
   */
  strictEquals(other: Interval) {
    return (
      this.domain === other.domain &&
      this.steps === other.steps &&
      this.value.strictEquals(other.value)
    );
  }

  /**
   * Return `true` if this interval is only composed of abstract edosteps.
   * @returns `true` if the interval is a unit scalar, possibly with edosteps, `false` otherwise.
   */
  isPureSteps() {
    return this.value.isScalar() && this.value.isUnity();
  }

  /**
   * (This method is an optimization detail.) Convert aspiring nodes to true AST nodes for formatting.
   * @param context Current root context with information about root pitch and size of ups and lifts.
   * @returns A true AST node suitable for string conversion or `undefined` realization is impossible in the given context.
   */
  realizeNode(context: RootContext): IntervalLiteral | undefined {
    if (!this.node) {
      return this.node;
    }
    if (this.node.type === 'AspiringAbsoluteFJS') {
      let ups = 0;
      let lifts = 0;
      let steps = 0;
      if (context.up.isPureSteps() && context.lift.isPureSteps()) {
        ({ups, lifts, steps} = countUpsAndLifts(
          this.steps,
          context.up.steps,
          context.lift.steps
        ));
        if (steps) {
          return undefined;
        }
      }

      const C4 = context.C4;
      const relativeToC4 = this.value.div(C4);
      if (relativeToC4 instanceof TimeReal || !relativeToC4.isScalar()) {
        return undefined;
      }
      const node = asAbsoluteFJS(relativeToC4, this.node.flavor);
      if (!node) {
        return undefined;
      }
      node.ups = ups;
      node.lifts = lifts;
      return node;
    }
    if (this.node.type === 'AspiringFJS') {
      if (this.value instanceof TimeReal) {
        return undefined;
      }
      let ups = 0;
      let lifts = 0;
      let steps = 0;

      if (context.up.isPureSteps() && context.lift.isPureSteps()) {
        ({ups, lifts, steps} = countUpsAndLifts(
          this.steps,
          context.up.steps,
          context.lift.steps
        ));
        if (steps) {
          return undefined;
        }
      }

      const node = asFJS(this.value, this.node.flavor);
      if (!node) {
        return undefined;
      }
      node.ups = ups;
      node.lifts = lifts;
      return node;
    }
    return this.node;
  }

  /**
   * Convert the interval to a virtual AST node representing the universal type.
   * @param interchange Boolean flag to format everything explicitly.
   * @returns A virtual monzo literal.
   */
  asMonzoLiteral(interchange = false): MonzoLiteral {
    let node: MonzoLiteral;
    if (
      interchange &&
      this.value instanceof TimeMonzo &&
      !this.value.residual.isUnity()
    ) {
      const clone = this.value.clone();
      clone.numberOfComponents = NUM_INTERCHANGE_COMPONENTS;
      node = clone.asMonzoLiteral();
    } else {
      node = this.value.asMonzoLiteral();
    }
    if (!Array.isArray(node.basis)) {
      throw new Error('Unexpexted unpruned basis.');
    }
    if (
      interchange &&
      (node.basis.length ||
        node.components.length > NUM_INTERCHANGE_COMPONENTS ||
        this.steps)
    ) {
      node = this.value.asInterchangeLiteral()!;
      if (!Array.isArray(node.basis)) {
        throw new Error('Unexpexted unpruned basis.');
      }
    }
    if (this.steps) {
      if (!node.basis.length && node.components.length) {
        node.basis.push({numerator: 2, denominator: null, radical: false});
        if (node.components.length > 1) {
          node.basis.push('');
          node.basis.push('');
        }
      }
      node.basis.unshift('1°');
      node.components.unshift(integerToVectorComponent(this.steps));
    }
    return node;
  }

  /**
   * Convert this interval to a string that faithfully represents it ignoring formatting, colors and labels.
   * Doesn't depend on the current root context.
   * @returns String that has the same value and domain as this interval if evaluated as a SonicWeave expression.
   */
  simpleStr() {
    if (this.steps) {
      let result: string;
      if (this.isPureSteps()) {
        result = `${this.steps}°`;
      } else {
        const node = this.asMonzoLiteral();
        result = literalToString(node);
      }
      if (this.domain === 'linear') {
        return `linear(${result})`;
      }
      return result;
    }
    return this.value.toString(this.domain);
  }

  /**
   * Convert this interval to a string that faithfully represents it ignoring colors and labels.
   * @param context Current root context with information about root pitch and size of ups and lifts.
   * @returns String that has the same value and domain as this interval if evaluated as a SonicWeave expression.
   */
  str(context?: RootContext) {
    if (this.node) {
      let node: IntervalLiteral | undefined = this.node;
      if (this.node.type === 'AspiringAbsoluteFJS') {
        if (!context) {
          return this.simpleStr();
        }
        node = this.realizeNode(context);
        if (!node) {
          return this.simpleStr();
        }
      }
      if (this.node.type === 'AspiringFJS') {
        if (context) {
          node = this.realizeNode(context);
        } else if (this.steps) {
          return this.simpleStr();
        } else if (this.value instanceof TimeMonzo) {
          node = asFJS(this.value, this.node.flavor);
        } else {
          return this.simpleStr();
        }

        if (!node) {
          return this.simpleStr();
        }
      }
      return literalToString(node);
    }
    return this.simpleStr();
  }

  // "JS" toString or "Python" repr.
  /**
   * Convert this interval to a string that faithfully represents it including color and label.
   * @param context Current root context with information about root pitch and size of ups and lifts.
   * @param interchange Boolean flag to always include label and color.
   * @returns String that has the same value and domain as this interval if evaluated as a SonicWeave expression.
   */
  toString(context?: RootContext, interchange = false) {
    const base = this.str(context);
    const color = this.color ? this.color.toString() : '';
    if (interchange) {
      return `${base} ${JSON.stringify(this.label)} ${color || 'niente'}`;
    } else if (color || this.label) {
      let result = '(' + base;
      if (this.label) {
        result += ' ' + JSON.stringify(this.label);
      }
      if (color) {
        result += ' ' + color;
      }
      return result + ')';
    }
    return base;
  }

  /**
   * Convert a relative interval to a real number representing a ratio of frequencies.
   * Convert an absolute interval to the scalar of its time unit.
   * @returns A real number.
   */
  valueOf() {
    if (this.value.isIntegral()) {
      return Number((this.value as TimeMonzo).toBigInteger());
    }
    return this.value.valueOf();
  }

  /**
   * Apply an up arrow to this interval.
   * @param context Current root context with the value of "up" to apply.
   * @returns A new interval with size increased by the current "up" value.
   */
  up(context: RootContext) {
    const value = this.value.mul(context.up.value);
    const steps = this.steps + context.up.steps;
    if (
      this.node?.type === 'FJS' ||
      this.node?.type === 'AbsoluteFJS' ||
      this.node?.type === 'MonzoLiteral'
    ) {
      const node = {...this.node};
      node.ups++;
      const result = new Interval(value, this.domain, steps, node, this);
      context.fragiles.push(result);
      return result;
    }
    return new Interval(value, this.domain, steps, undefined, this);
  }

  /**
   * Apply a down arrow to this interval.
   * @param context Current root context with the value of "down" to apply.
   * @param count How many down arrows to apply.
   * @returns A new interval with size decreased by the current "up" value.
   */
  down(context: RootContext, count = 1) {
    const value = this.value.div(context.up.value.pow(count));
    const steps = this.steps - context.up.steps * count;
    if (
      this.node?.type === 'FJS' ||
      this.node?.type === 'AbsoluteFJS' ||
      this.node?.type === 'MonzoLiteral'
    ) {
      const node = {...this.node};
      node.ups -= count;
      const result = new Interval(value, this.domain, steps, node, this);
      context.fragiles.push(result);
      return result;
    }
    return new Interval(value, this.domain, steps, undefined, this);
  }

  /**
   * Apply a lift to this interval.
   * @param context Current root context with the value of "lift" to apply.
   * @returns A new interval with size increased by the current "lift" value.
   */
  lift(context: RootContext) {
    const value = this.value.mul(context.lift.value);
    const steps = this.steps + context.lift.steps;
    if (
      this.node?.type === 'FJS' ||
      this.node?.type === 'AbsoluteFJS' ||
      this.node?.type === 'MonzoLiteral'
    ) {
      const node = {...this.node};
      node.lifts++;
      const result = new Interval(value, this.domain, steps, node, this);
      context.fragiles.push(result);
      return result;
    }
    return new Interval(value, this.domain, steps, undefined, this);
  }

  /**
   * Apply a drop to this interval.
   * @param context Current root context with the value of "drop" to apply.
   * @returns A new interval with size decreased by the current "lift" value.
   */
  drop(context: RootContext) {
    const value = this.value.div(context.lift.value);
    const steps = this.steps - context.lift.steps;
    if (
      this.node?.type === 'FJS' ||
      this.node?.type === 'AbsoluteFJS' ||
      this.node?.type === 'MonzoLiteral'
    ) {
      const node = {...this.node};
      node.lifts--;
      const result = new Interval(value, this.domain, steps, node, this);
      context.fragiles.push(result);
      return result;
    }
    return new Interval(value, this.domain, steps, undefined, this);
  }

  /**
   * Remove stored context-dependent formatting information. (Triggered by a context shift.)
   */
  break(force = false) {
    if (this.node?.type === 'FJS') {
      this.node = {type: 'AspiringFJS', flavor: inferFJSFlavor(this.node)};
    }
    if (this.node?.type === 'AbsoluteFJS') {
      if (/[J-Z]/.test(this.node.pitch.nominal)) {
        this.node = undefined;
      } else {
        this.node = {
          type: 'AspiringAbsoluteFJS',
          flavor: inferFJSFlavor(this.node),
        };
      }
    }
    if (
      this.node?.type === 'MonzoLiteral' ||
      this.node?.type === 'MosStepLiteral' ||
      force
    ) {
      this.node = undefined;
    }
  }
}

// Dummy variable to hold color and label infections.
const ZOMBIE = new Interval(TWO, 'logarithmic');

/**
 * A basis of a fractional just intonation subgroup.
 */
export class ValBasis {
  value: TimeMonzo[];
  ortho: TimeMonzo[];
  dual: TimeMonzo[];
  node?: ValBasisLiteral;
  tenneyValue_?: number[][];
  tenneyGram_?: GramResult;

  /**
   * Construct a basis for a fractional just intonation subgroup.
   * @param basis Array of basis elements or number of primes starting from 2.
   * @param node Virtual AST node associated with this basis.
   */
  constructor(basis: TimeMonzo[] | number, node?: ValBasisLiteral) {
    this.node = node;
    if (typeof basis === 'number') {
      const numberOfComponents = basis;
      this.value = PRIMES.slice(0, numberOfComponents).map(p =>
        TimeMonzo.fromFraction(p, numberOfComponents)
      );
      this.ortho = this.value;
      this.dual = this.value;
      return;
    }
    basis = [...basis];
    let numberOfComponents = 0;
    for (const element of basis) {
      if (!element.residual.isUnity()) {
        if (element.residual.s !== 1) {
          throw new Error('Only positive elements supported in val subgroups.');
        }
        numberOfComponents = Math.max(
          primeLimit(element.residual.n, true),
          primeLimit(element.residual.d, true),
          numberOfComponents
        );
      } else {
        const pe = [...element.primeExponents];
        while (pe.length && !pe[pe.length - 1].n) {
          pe.pop();
        }
        numberOfComponents = Math.max(pe.length, numberOfComponents);
      }
    }

    if (isNaN(numberOfComponents)) {
      throw new Error('Unable to determine val prime limit.');
    }

    for (let i = 0; i < basis.length; ++i) {
      if (basis[i].numberOfComponents !== numberOfComponents) {
        basis[i] = basis[i].clone();
        basis[i].numberOfComponents = numberOfComponents;
      }
    }
    this.value = basis;

    // Perform Gram process
    this.ortho = [...this.value];
    this.dual = [];

    for (let i = 0; i < this.ortho.length; ++i) {
      for (let j = 0; j < i; ++j) {
        const oi = this.ortho[i].div(
          this.ortho[j].pow(this.dual[j].dot(this.ortho[i]))
        );
        if (oi instanceof TimeReal) {
          throw new Error('Basis orthoginalization failed.');
        }
        this.ortho[i] = oi;
      }
      this.dual.push(this.ortho[i].geometricInverse());
    }
  }

  /**
   * Number of basis elements / number of dimensions
   */
  get size() {
    return this.value.length;
  }

  /**
   * Prime limit of the basis as a 0-based ordinal.
   */
  get numberOfComponents() {
    return this.value[0].numberOfComponents;
  }

  /**
   * Basis elements that are not true prime numbers.
   */
  get nonPrimes(): TimeMonzo[] {
    const result: TimeMonzo[] = [];
    for (const monzo of this.value) {
      if (monzo.isIntegral()) {
        if (!PRIMES.includes(monzo.valueOf())) {
          result.push(monzo);
        }
      } else {
        result.push(monzo);
      }
    }
    return result;
  }

  /**
   * The value of this basis weighted with the logarithms of the primes.
   */
  get tenneyValue(): number[][] {
    if (this.tenneyValue_ === undefined) {
      this.tenneyValue_ = this.value.map(m =>
        applyWeights(m.toMonzo(), LOG_PRIMES)
      );
    }
    return this.tenneyValue_;
  }

  /**
   * The unnormalized Gram-Schmidt process applied to tenney-weighted coordinates.
   */
  get tenneyGram(): GramResult {
    if (this.tenneyGram_ === undefined) {
      this.tenneyGram_ = gram(this.tenneyValue);
    }
    return this.tenneyGram_;
  }

  /**
   * Check if this basis is only "pointing" along prime axis.
   * @returns `true` if all basis elements are powers of primes. `false` otherwise.
   */
  isPrimewise(): boolean {
    for (const element of this.value) {
      if (element.timeExponent.n) {
        return false;
      }
      let count = 0;
      for (const pe of element.primeExponents) {
        if (pe.n) {
          count++;
        }
      }
      if (count > 1) {
        return false;
      }
      for (const prime of primeFactorize(element.residual).keys()) {
        if (prime <= 0) {
          return false;
        }
        count++;
      }
      if (count !== 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Obtain the minimal prime basis this basis is embedded in.
   * @returns The super-basis.
   */
  superBasis(): ValBasis {
    const primes = new Set<number>();
    for (const element of this.value) {
      if (element.timeExponent.n) {
        throw new Error('Absolute basis does not have a prime super-basis.');
      }
      for (const prime of element.factorize().keys()) {
        if (prime <= 0) {
          throw new Error(
            'Negative or zero basis does not have a prime super-basis.'
          );
        }
        primes.add(prime);
      }
    }
    const subgroup = Array.from(primes);
    subgroup.sort((a, b) => a - b);
    return new ValBasis(subgroup.map(p => TimeMonzo.fromFraction(p)));
  }

  /**
   * Convert this basis to an array of linear intervals.
   * @returns The basis elements as {@link Interval} instances.
   */
  toArray() {
    return this.value.map(m => new Interval(m, 'linear'));
  }

  /**
   * Perform Lenstra-Lenstra-Lovász basis reduction.
   * @param weighting Weighting to use when judging basis angles and lengths.
   * @returns A reduced {@link ValBasis} instance.
   */
  lll(weighting: 'none' | 'tenney') {
    for (const element of this.value) {
      if (!element.isScalar()) {
        throw new Error(
          'LLL reduction is only implemented in the relative echelon.'
        );
      }
    }
    if (weighting === 'none') {
      try {
        const basis: FractionalMonzo[] = this.value.map(m => m.primeExponents);
        const lll = fractionalLenstraLenstraLovasz(basis);
        return new ValBasis(
          lll.basis.map(pe => new TimeMonzo(ZERO, pe).pitchAbs())
        );
      } catch {
        /** Fall through */
      }
    }
    let basis: number[][] = this.value.map(m => m.toMonzo());
    if (weighting === 'tenney') {
      basis = this.tenneyValue;
    }
    const lll = lenstraLenstraLovasz(basis);
    if (weighting === 'tenney') {
      lll.basis = lll.basis.map(pe => unapplyWeights(pe, LOG_PRIMES));
    }
    return new ValBasis(
      lll.basis.map(pe =>
        new TimeMonzo(
          ZERO,
          pe.map(c => new Fraction(Math.round(c)))
        ).pitchAbs()
      )
    );
  }

  /**
   * Respell an interval to a simpler comma-equivalent one using a variant of Babai's nearest plane algorithm for approximate CVP.
   * @param monzo The rational interval to reduce.
   * @returns The reduced interval.
   */
  respell(monzo: TimeMonzo, weighting: 'none' | 'tenney') {
    if (weighting === 'none') {
      for (let i = this.size - 1; i >= 0; --i) {
        const mu = this.dual[i].dot(monzo);
        monzo = monzo.div(this.value[i].pow(mu.round())) as TimeMonzo;
        if (monzo instanceof TimeReal) {
          throw new Error('Respelling failed.');
        }
      }
      return monzo;
    }
    let v = applyWeights(monzo.toMonzo(), LOG_PRIMES);
    const basis = this.tenneyValue;
    const dual = this.tenneyGram.dual;
    for (let i = this.size - 1; i >= 0; --i) {
      const mu = dot(dual[i], v);
      v = sub(v, scale(basis[i], Math.round(mu)));
    }
    v = unapplyWeights(v, LOG_PRIMES).map(Math.round);
    return new TimeMonzo(
      ZERO,
      v.map(pe => new Fraction(pe))
    );
  }

  /**
   * Check if this basis is the same as another.
   * @param other Another basis.
   * @returns `true` if this basis is the same as the other.
   */
  equals(other: ValBasis) {
    if (this.size !== other.size) {
      return false;
    }
    for (let i = 0; i < this.value.length; ++i) {
      if (!this.value[i].equals(other.value[i])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if this basis is strictly the same as another.
   * @param other Another basis.
   * @returns `true` if this basis is strictly the same as the other.
   */
  strictEquals(other: ValBasis) {
    if (this.size !== other.size) {
      return false;
    }
    for (let i = 0; i < this.value.length; ++i) {
      if (!this.value[i].strictEquals(other.value[i])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if this basis is the standard prime basis.
   * @param soft Only check for primality, not length of basis.
   * @returns `true` if the basis consists of prime numbers in order.
   */
  isStandard(soft = false) {
    if (!soft && this.size !== getNumberOfComponents()) {
      return false;
    }
    for (let i = 0; i < this.value.length; ++i) {
      if (!this.value[i].isIntegral()) {
        return false;
      }
      if (this.value[i].toBigInteger() !== BIG_INT_PRIMES[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Fix a map in this basis to the stadard basis.
   * @param map Tuning map of this basis' elements to cents.
   * @returns Tuning map of primes to cents.
   */
  standardFix(map: TuningMap): TuningMap {
    let result = PRIME_CENTS.slice(0, this.numberOfComponents);
    const basis = this.value.map(m => m.toMonzo());
    const ortho = this.ortho.map(m => m.toMonzo());
    for (let i = 0; i < basis.length; ++i) {
      const cents = dot(basis[i], result);
      result = add(
        result,
        scale(ortho[i], (map[i] - cents) / dot(basis[i], ortho[i]))
      );
    }
    return result;
  }

  /**
   * Convert a time monzo in the standard basis to this basis.
   * @param monzo Standard monzo.
   * @returns Subgroup monzo with integer coefficients.
   * @throws An error if the standard monzo is not integral in this basis.
   */
  toSubgroupMonzo(monzo: TimeMonzo): Monzo {
    const result: Monzo = [];
    for (let i = 0; i < this.size; ++i) {
      const c = this.dual[i].dot(monzo);
      if (c.d !== 1) {
        throw new Error('Monzo is fractional inside subgroup.');
      }
      result.push(c.valueOf());
      monzo = monzo.div(this.ortho[i].pow(c)) as TimeMonzo;
      if (monzo instanceof TimeReal) {
        throw new Error('Subgroup conversion failed.');
      }
    }
    if (!(monzo.isScalar() && monzo.isUnity())) {
      throw new Error('Monzo outside subgroup.');
    }
    return result;
  }

  /**
   * Convert a time monzo in the standard basis to this basis and leave a residual of the unconverted tail.
   * @param monzo Standard monzo.
   * @returns Subgroup monzo and a standard residual outside of this basis.
   */
  toSmonzoAndResidual(monzo: TimeMonzo): [FractionalMonzo, TimeMonzo] {
    const smonzo: FractionalMonzo = [];
    for (let i = 0; i < this.size; ++i) {
      const c = this.dual[i].dot(monzo);
      smonzo.push(c);
      monzo = monzo.div(this.ortho[i].pow(c)) as TimeMonzo;
      if (monzo instanceof TimeReal) {
        throw new Error('Subgroup conversion failed.');
      }
    }
    return [smonzo, monzo];
  }

  /**
   * Convert a subgroup monzo in this basis to the standard basis.
   * @param subgroupMonzo Subgroup monzo in this basis.
   * @returns Time monzo in the standard basis.
   */
  dot(subgroupMonzo: ProtoFractionalMonzo): TimeMonzo {
    if (!subgroupMonzo.length) {
      return new TimeMonzo(ZERO, []);
    }
    let result = this.value[0].pow(subgroupMonzo[0]);
    for (let i = Math.min(this.size, subgroupMonzo.length) - 1; i > 0; --i) {
      result = result.mul(this.value[i].pow(subgroupMonzo[i]));
    }
    if (result instanceof TimeReal) {
      throw new Error('Smonzo conversion failed.');
    }
    return result;
  }

  /**
   * Rebase intervals from the standard basis to this basis.
   * Rebase vals from a foreign subgroup basis to this basis.
   * @param other {@link Interval} or {@link Val} to reinterprete.
   * @return The rebased value.
   */
  intrinsicCall(other: Interval): Interval;
  intrinsicCall(other: Val): Val;
  intrinsicCall(other: Val | Interval): Val | Interval {
    if (other instanceof Interval) {
      let value: TimeMonzo;
      if (other.value instanceof TimeReal) {
        // We use a convention where reals have infinitely sparse monzos.
        value = new TimeMonzo(ZERO, []);
      } else {
        value = this.dot(other.value.primeExponents);
      }
      return new Interval(
        value,
        other.domain,
        0,
        intervalValueAs(value, other.node, true),
        other
      );
    }
    if (other instanceof Val) {
      return Val.fromBasisMap(other.sval, this);
    }
    return other;
  }

  /**
   * Convert this basis to a virtual AST fragment compatible with wart notation.
   * @returns Array of wart basis elements.
   */
  toWartBasis(): WartBasisElement[] {
    if (this.isStandard()) {
      return [''];
    }
    const result: WartBasisElement[] = [];
    for (let monzo of this.value) {
      if (monzo.isScalar() && monzo.isSqrt()) {
        let radical = false;
        if (!monzo.isFractional()) {
          radical = true;
          monzo = monzo.pow(2) as TimeMonzo;
        }
        const {s, n, d} = monzo.toFraction();
        if (s <= 0) {
          throw new Error('Invalid basis.');
        }
        result.push({
          radical,
          numerator: n,
          denominator: d === 1 ? null : d,
        });
      } else {
        throw new Error('Basis is imcompatible with warts and SOV.');
      }
    }
    // TODO: Trim if primes
    return result;
  }

  /**
   * Convert this basis to a string that faithfully represents it.
   * @returns String that has the same value as this basis if evaluated as a SonicWeave expression.
   */
  toString() {
    if (this.node) {
      return literalToString(this.node);
    }
    const node = {
      type: 'ValBasisLiteral',
      basis: [] as any[],
    };
    const bail = () => `basis(${this.value.map(m => m.toString()).join(', ')})`;
    for (let monzo of this.value) {
      if (monzo.isUnity()) {
        if (monzo.timeExponent.equals(-1)) {
          node.basis.push('Hz');
        } else if (monzo.timeExponent.equals(1)) {
          node.basis.push('s');
        } else {
          return bail();
        }
      } else if (monzo.isSqrt()) {
        let radical = false;
        if (!monzo.isFractional()) {
          radical = true;
          monzo = monzo.pow(2) as TimeMonzo;
        }
        const {s, n, d} = monzo.toFraction();
        if (s <= 0) {
          throw new Error('Invalid basis.');
        }
        node.basis.push({
          radical,
          numerator: n,
          denominator: d === 1 ? null : d,
        });
      } else {
        return bail();
      }
    }
    // TODO: Trim if primes
    return literalToString(node as ValBasisLiteral);
  }
}

/**
 * A mappping vector commonly used to convert intervals in just intonation to steps of an equal temperament.
 */
export class Val {
  value: TimeMonzo;
  basis: ValBasis;
  domain = 'cologarithmic' as const;
  node?: CoIntervalLiteral;

  /**
   * Construct a mapping vector.
   * @param value A {@link TimeMonzo} instance interpreted as a val. Usually a projective approximation to the Just Intonation Point with integer coefficients.
   * @param equave The interval of equivalence of the equal temperament associated with this val.
   * @param node Node in the abstract syntax tree used for string representation.
   */
  constructor(value: TimeMonzo, basis: ValBasis, node?: CoIntervalLiteral) {
    this.value = value;
    this.basis = basis;
    this.node = node;
  }

  /**
   * Construct a val from an array of mapping entries representing equal divisions of an equave.
   * @param primeExponentMap Val components.
   * @param basis Basis of the subgroup. Defaults to the primes.
   * @param node Node in the abstract syntax tree used for string representation.
   * @returns A cologarithmic mapping vector.
   */
  static fromArray(
    primeExponentMap: FractionValue[],
    basis?: ValBasis,
    node?: CoIntervalLiteral
  ) {
    if (!basis) {
      basis = new ValBasis(primeExponentMap.length);
    }
    return new Val(TimeMonzo.fromArray(primeExponentMap), basis, node);
  }

  /**
   * Convert an array of components in a subgroup basis to a val in the standard basis.
   * @param basisExponentMap Components of the val.
   * @param basis Basis of the val.
   * @param node Node in the abstract syntax tree used for string representation.
   */
  static fromBasisMap(
    basisExponentMap: FractionValue[],
    basis: ValBasis,
    node?: CoIntervalLiteral
  ) {
    let result = new TimeMonzo(
      ZERO,
      Array(basis.numberOfComponents).fill(ZERO)
    );
    for (let i = 0; i < basis.value.length; ++i) {
      const mapped = result.dot(basis.value[i]);
      const diff = mapped.sub(basisExponentMap[i]);
      result = result.div(
        basis.ortho[i].pow(diff.div(basis.value[i].dot(basis.ortho[i])))
      ) as TimeMonzo;
    }
    if (!(result instanceof TimeMonzo)) {
      throw new Error('Val construction failed.');
    }
    return new Val(result, basis, node);
  }

  /**
   * The interval this val is equally dividing.
   */
  get equave() {
    return this.basis.value[0];
  }

  /**
   * The number of divisions in the equal temperament associated with this val.
   */
  get divisions() {
    return this.value.dot(this.equave);
  }

  /**
   * The value of this val within the associated basis.
   */
  get sval(): FractionalMonzo {
    return this.basis.value.map(m => this.value.dot(m));
  }

  /**
   * The additive inverse of this val.
   * @returns The negative of this val.
   */
  neg() {
    return new Val(this.value.inverse(), this.basis);
  }

  /**
   * The geometric inverse of this val.
   * @returns An interval in the logarithmic domain whose dot product with the original val is unitary.
   */
  inverse() {
    // This overload should be fine because multiplication is not implemented in the logarithmic domain.
    return new Interval(this.value.geometricInverse(), 'logarithmic');
  }

  /**
   * Normalize the leading coefficient to be positive.
   * @returns A new val with a positive division of its equave.
   */
  abs() {
    if (this.divisions.s < 0) {
      return new Val(this.value.inverse(), this.basis);
    }
    return new Val(this.value.clone(), this.basis);
  }

  /**
   * A meaningless operation.
   * @returns A new Val obtained by pretending its value represents a linear quantity.
   */
  sqrt() {
    const value = this.value.sqrt();
    if (value instanceof TimeMonzo) {
      return new Val(value, this.basis);
    }
    throw new Error('Val square root operation failed.');
  }

  /**
   * Check if this val has the same size and equave as another.
   * @param other Another val.
   * @returns `true` if the vals have the same size and their equaves have the same size.
   */
  equals(other: Val) {
    return this.value.equals(other.value) && this.basis.equals(other.basis);
  }

  /**
   * Check if this val has the same structure as another.
   * @param other Another val.
   * @returns `true` if the vals and their equaves have the same components.
   */
  strictEquals(other: Val) {
    return (
      this.value.strictEquals(other.value) &&
      this.basis.strictEquals(other.basis)
    );
  }

  /**
   * Add this this val to another.
   * @param other Another val.
   * @returns The sum of the vals.
   */
  add(other: Val) {
    if (!this.basis.strictEquals(other.basis)) {
      throw new Error('Val basis must match in addition.');
    }
    const value = this.value.mul(other.value);
    if (value instanceof TimeReal) {
      throw new Error('Val addition failed.');
    }
    return new Val(value, this.basis);
  }

  /**
   * Subtract another val from this one.
   * @param other Another val.
   * @returns The difference of the vals.
   */
  sub(other: Val) {
    if (!this.basis.strictEquals(other.basis)) {
      throw new Error('Val basis must match in subtraction.');
    }
    const value = this.value.div(other.value);
    if (value instanceof TimeReal) {
      throw new Error('Val subtraction failed.');
    }
    return new Val(value, this.basis);
  }

  /**
   * Scale this val by a linear interval.
   * @param other A linear scalar.
   * @returns A rescaled version of this val.
   */
  mul(other: Interval) {
    if (other.domain !== 'linear' || other.value.timeExponent.valueOf()) {
      throw new Error('Only scalar multiplication implemented for vals.');
    }
    if (other.value instanceof TimeReal) {
      throw new Error('Cannot multiply val by an irrational scalar.');
    }
    const value = this.value.pow(other.value);
    if (value instanceof TimeReal) {
      throw new Error('Val scalar multiplication failed.');
    }
    return new Val(value, this.basis);
  }

  /**
   * Inversely scale this val by a linear interval.
   * @param other A linear scalar.
   * @returns A rescaled version of this val.
   */
  div(other: Interval) {
    if (other.domain !== 'linear' || other.value.timeExponent.valueOf()) {
      throw new Error('Only scalar multiplication implemented for vals.');
    }
    const value = this.value.pow(other.value.inverse());
    if (value instanceof TimeReal) {
      throw new Error('Val scalar multiplication failed.');
    }
    return new Val(value, this.basis);
  }

  /**
   * Map an interval using this val or calculate the cosine of the unweighted angle between two vals.
   * @param other An interval to map or another val.
   * @returns The dot product between this and the other as a linear interval.
   */
  dot(other: Interval | Val) {
    if (other instanceof Interval) {
      return other.dot(this);
    }

    const product = this.value.dot(other.value);
    if (product.d === 1) {
      return Interval.fromInteger(product.s * product.n);
    }
    return Interval.fromFraction(product);
  }

  /**
   * Compute the root mean squared error against the just intonation point.
   * @param weights Additional weights to apply on top of Tenney weights.
   * @param unnormalized Return the unnormalized squared error instead.
   * @returns The TE error.
   */
  errorTE(weights: number[], unnormalized = false) {
    const jip = this.basis.value.map(m => m.totalCents());
    const divisions = this.divisions.valueOf();
    if (!divisions) {
      const sval = this.sval;
      if (sval.some(f => f.n)) {
        return Infinity;
      }
      const result = dotPrecise(weights, weights);
      if (unnormalized) {
        return result;
      }
      return Math.sqrt(result / this.basis.numberOfComponents) * jip[0];
    }
    const n = jip[0] / this.divisions.valueOf();
    const sval = this.sval.map(x => x.valueOf() * n);
    const diff = sub(weights, applyWeights(unapplyWeights(sval, jip), weights));
    const result = dotPrecise(diff, diff);
    if (unnormalized) {
      return result;
    }
    return Math.sqrt(result / this.basis.numberOfComponents) * jip[0];
  }

  /**
   * Obtain the next val in the basis' generalized patent val sequence or approach it if this val is off-JIP.
   * @param weights Additional weights to apply on top of Tenney weights.
   * @returns The val at unit distance that comes after this one (non-projective metric).
   */
  nextGPV(weights: number[]) {
    const jip = this.basis.value.map(m => m.totalCents());
    const fmap = this.basis.value.map(m => this.value.dot(m));
    if (!this.divisions.n) {
      fmap[0] = fmap[0].add(ONE);
      return Val.fromBasisMap(fmap, this.basis);
    }
    const map = fmap.map(f => f.valueOf());
    let leastError = Infinity;
    let idx = -1;
    for (let i = 0; i < this.basis.size; ++i) {
      const m = [...map];
      m[i] += 1;
      const n = jip[0] / m[0];
      const diff = sub(
        weights,
        applyWeights(unapplyWeights(scale(m, n), jip), weights)
      );
      const error = dotPrecise(diff, diff);
      if (error < leastError) {
        leastError = error;
        idx = i;
      }
    }
    fmap[idx] = fmap[idx].add(ONE);
    return Val.fromBasisMap(fmap, this.basis);
  }

  /**
   * Obtain a faithful string representation of this val.
   * @returns A string that evaluates to a val with the same value as this one when interpreted as a SonicWeave expression.
   */
  toString() {
    if (this.node) {
      return literalToString(this.node);
    }
    const result = this.value.toString('cologarithmic');
    if (result.includes('@') || !this.basis.isStandard(true)) {
      return `withBasis(${result}, ${this.basis.toString()})`;
    }
    return result;
  }
}

/**
 * Regular temperament combining multiple vals to a more optimal tuning.
 */
export class Temperament {
  canonicalMapping: number[][];
  basis: ValBasis;
  weights: number[];
  pureEquaves: boolean;
  metric: FormalPrimeMetric;
  commaBasis: ValBasis;
  preimage: ValBasis;
  private subgroupMapping_?: number[];

  /**
   * Construct a new temperament from an array of svals.
   * @param mapping A matrix where the rows are linearly independent subgroup vals.
   * @param basis Basis of the svals.
   * @param weights Additional weights on top of Tenney weights to tweak what is considered optimal.
   * @param pureEquaves Boolean flag to force the tuning of the first basis element to remain pure.
   */
  constructor(
    mapping: number[][],
    basis?: ValBasis,
    weights?: number[],
    pureEquaves = false,
    metric: FormalPrimeMetric = 'subgroup'
  ) {
    if (!basis) {
      basis = new ValBasis(mapping[0].length);
    }
    this.basis = basis;

    // Remove contorsion
    this.canonicalMapping = defactoredHnf(mapping);

    if (weights === undefined) {
      weights = [];
    } else {
      weights = [...weights];
    }
    while (weights.length < basis.size) {
      weights.push(1);
    }
    while (weights.length > basis.size) {
      weights.pop();
    }
    this.weights = weights;
    this.pureEquaves = pureEquaves;
    this.metric = metric;

    // Compute comma basis
    const scommas = transpose(kernel(this.canonicalMapping));
    this.commaBasis = new ValBasis(scommas.map(c => basis!.dot(c))).lll(
      'tenney'
    );

    // Compute mapping generators
    const sgens = transpose(preimage(this.canonicalMapping));
    const gens = sgens.map(g => basis!.dot(g));
    this.preimage = new ValBasis(
      gens.map(g => this.commaBasis.respell(g, 'tenney'))
    );

    // Make mapping generators positive
    const pi = this.preimage.value;
    for (let i = 0; i < pi.length; ++i) {
      if (pi[i].totalCents() < 0) {
        pi[i] = pi[i].inverse();
        this.canonicalMapping[i] = this.canonicalMapping[i].map(c => -c);
      }
    }
  }

  /**
   * Constuct a temperament that retains the properties shared by all of the given vals.
   * @param vals Vals to mix into a more optimal combination. The number of vals decides the rank of the temperament.
   * @param weights Additional weights on top of Tenney weights to tweak what is considered optimal.
   * @param pureEquaves Boolean flag to force the tuning of the first basis element to remain pure.
   * @returns A higher rank temperament.
   */
  static fromVals(
    vals: Val[],
    weights?: number[],
    pureEquaves = false,
    metric: FormalPrimeMetric = 'subgroup'
  ): Temperament {
    if (!vals.length) {
      throw new Error(
        'At least one val is required when constructing a temperament.'
      );
    }
    const basis = vals[0].basis;
    for (const val of vals.slice(1)) {
      if (!val.basis.equals(basis)) {
        throw new Error('Bases must match when constructing a temperament.');
      }
    }
    // Use bigints to avoid overflow in intermediate results.
    let svals = vals.map(val => val.sval.map(f => BigInt(f.valueOf())));
    svals = hnf(svals);

    // Remove rank deficiency
    pruneZeroRows(svals);

    return new Temperament(
      svals.map(row => row.map(Number)),
      basis,
      weights,
      pureEquaves,
      metric
    );
  }

  /**
   * Constuct a temperament that tempers out the given commas.
   * @param commas Commas to temper out. The number of commas decides the co-rank of the temperament.
   * @param basis Optional basis. Leave undefined to automatically infer from commas.
   * @param weights Additional weights on top of Tenney weights to tweak what is considered optimal.
   * @param pureEquaves Boolean flag to force the tuning of the first basis element to remain pure.
   * @param fullPrimeLimit If no basis is given, use the full prime limit instead of a minimal prime subgroup.
   * @returns A higher rank temperament. Lower co-rank than just intonation.
   */
  static fromCommas(
    commas: TimeMonzo[],
    basis?: ValBasis,
    weights?: number[],
    pureEquaves = false,
    metric: FormalPrimeMetric = 'subgroup',
    fullPrimeLimit = false
  ) {
    // Use bigints to avoid overflow in intermediate results.
    let smonzos: bigint[][] = [];
    if (basis) {
      smonzos.push(...commas.map(c => basis!.toSubgroupMonzo(c).map(BigInt)));
    } else {
      for (const comma of commas) {
        if (!(comma.isScalar() && comma.isFractional())) {
          throw new Error('Only relative rational commas supported.');
        }
      }
      const factorizations = commas.map(comma => comma.factorize());
      const primes = new Set<number>();
      for (const fs of factorizations) {
        for (const prime of fs.keys()) {
          if (prime === 0) {
            throw new Error('Zero cannot be tempered out.');
          }
          if (prime < 0) {
            throw new Error('Negative values cannot be tempered out.');
          }
          primes.add(prime);
        }
      }
      let subgroup = Array.from(primes);
      subgroup.sort((a, b) => a - b);
      if (fullPrimeLimit) {
        const limit = PRIMES.indexOf(subgroup.pop()!) + 1;
        subgroup = PRIMES.slice(0, limit);
      }
      basis = new ValBasis(subgroup.map(p => TimeMonzo.fromFraction(p)));
      for (const fs of factorizations) {
        smonzos.push(subgroup.map(p => BigInt((fs.get(p) ?? 0).valueOf())));
      }
    }
    smonzos = hnf(smonzos);

    // Remove redundant commas
    pruneZeroRows(smonzos);

    return new Temperament(
      cokernel(transpose(smonzos)).map(row => row.map(Number)),
      basis,
      weights,
      pureEquaves,
      metric
    );
  }

  /**
   * Tuning in cents of this temperament's subgroup basis.
   */
  get subgroupMapping(): number[] {
    if (this.subgroupMapping_ !== undefined) {
      return this.subgroupMapping_;
    }
    if (this.metric === 'subgroup' && !this.basis.isPrimewise()) {
      const superBasis = this.basis.superBasis();
      let superWeights = Array(superBasis.size).fill(0);
      for (let i = 0; i < this.basis.size; ++i) {
        const superMonzo = superBasis.toSubgroupMonzo(this.basis.value[i]);
        superWeights = add(
          superWeights,
          scale(superMonzo, this.weights[i]).map(Math.abs)
        );
      }
      const superTemperament = Temperament.fromCommas(
        this.commaBasis.value,
        this.basis.superBasis(),
        superWeights,
        this.pureEquaves,
        'inharmonic'
      );
      this.subgroupMapping_ = this.basis.value.map(m =>
        superTemperament.temper(m).totalCents()
      );
      return this.subgroupMapping_;
    }
    const jip = this.basis.value.map(m => m.totalCents());
    const weights: number[] = [];
    for (let i = 0; i < this.basis.size; ++i) {
      const w =
        this.metric === 'Tenney-Pakkanen'
          ? this.basis.value[i].tenneyHeight()
          : this.basis.value[i].totalCents();
      weights.push(this.weights[i] / w);
    }
    const mapping = combineTuningMaps(
      applyWeights(jip, weights),
      this.canonicalMapping.map(m => applyWeights(m, weights))
    );
    this.subgroupMapping_ = unapplyWeights(mapping, weights);
    if (this.pureEquaves) {
      const n = jip[0] / this.subgroupMapping_[0];
      this.subgroupMapping_ = this.subgroupMapping_.map(m => m * n);
    }
    return this.subgroupMapping_;
  }

  /**
   * Simplify a rational value based on equivalences available in this temperament.
   * @param monzo A rational value to simplify.
   * @returns A rational value with reduced tenney height if found. The result is tuned the same as the original by this temperament.
   */
  respell(monzo: TimeMonzo): TimeMonzo {
    const [smonzo, residual] = this.basis.toSmonzoAndResidual(monzo);
    monzo = new TimeMonzo(ZERO, []);
    const gens = this.preimage.value;
    for (let i = 0; i < gens.length; ++i) {
      monzo = monzo.mul(
        gens[i].pow(fractionalDot(this.canonicalMapping[i], smonzo))
      ) as TimeMonzo;
    }
    const result = this.commaBasis.respell(monzo, 'tenney').mul(residual);
    if (result instanceof TimeReal) {
      throw new Error('Respelling failed.');
    }
    return result;
  }

  /**
   * Tune a value according to this temperament.
   * @param monzo A value to tune.
   * @returns The value retuned according this temperament's optimality criteria.
   */
  temper(monzo: TimeMonzo | TimeReal): TimeReal {
    if (monzo instanceof TimeReal) {
      return monzo;
    }
    const [smonzo, residual] = this.basis.toSmonzoAndResidual(monzo);
    return TimeReal.fromCents(
      dot(
        smonzo.map(f => f.valueOf()),
        this.subgroupMapping
      )
    ).mul(residual);
  }

  /**
   * Produce an array of generator coefficients.
   * @param other A value to interprete.
   * @returns An array representing the number of generators adding up to the value.
   */
  dot(other: Interval): Interval[] {
    if (other.value instanceof TimeReal) {
      return this.canonicalMapping.map(() => Interval.fromInteger(0));
    }
    const [smonzo] = this.basis.toSmonzoAndResidual(other.value);
    const values = this.canonicalMapping.map(m => fractionalDot(m, smonzo));
    return values.map(v => Interval.fromFraction(v));
  }

  /**
   * Compute the root mean squared error against the just intonation point.
   * @returns The TE error.
   */
  errorTE() {
    const jip = this.basis.value.map(m => m.totalCents());
    const diff = sub(
      this.weights,
      applyWeights(this.weights, unapplyWeights(this.subgroupMapping, jip))
    );
    return Math.sqrt(dotPrecise(diff, diff) / jip.length) * jip[0];
  }

  /**
   * Check if this temperament is the same as another.
   * @param other Another temperament.
   * @returns `true` if this temperament is the same as the other.
   */
  equals(other: Temperament) {
    if (this.canonicalMapping.length !== other.canonicalMapping.length) {
      return false;
    }
    for (let i = 0; i < this.canonicalMapping.length; ++i) {
      for (let j = 0; j < this.canonicalMapping[i].length; ++j) {
        if (this.canonicalMapping[i][j] !== other.canonicalMapping[i][j]) {
          return false;
        }
      }
    }
    if (!arraysEqual(this.weights, other.weights)) {
      return false;
    }
    if (!this.basis.equals(other.basis)) {
      return false;
    }
    return this.pureEquaves === other.pureEquaves;
  }

  /**
   * Check if this temperament is strictly the same as another.
   * @param other Another temperament.
   * @returns `true` if this temperament is strictly the same as the other.
   */
  strictEquals(other: Temperament) {
    if (this.canonicalMapping.length !== other.canonicalMapping.length) {
      return false;
    }
    for (let i = 0; i < this.canonicalMapping.length; ++i) {
      for (let j = 0; j < this.canonicalMapping[i].length; ++j) {
        if (this.canonicalMapping[i][j] !== other.canonicalMapping[i][j]) {
          return false;
        }
      }
    }
    if (!arraysEqual(this.weights, other.weights)) {
      return false;
    }
    if (!this.basis.strictEquals(other.basis)) {
      return false;
    }
    return this.pureEquaves === other.pureEquaves;
  }

  /**
   * Produce a faithful string representation of this temperament.
   * @returns A string that when evaluated reproduces a value equal to this temperament.
   */
  toString() {
    let result = 'Temperament([';
    result += this.canonicalMapping
      .map(m => '⟨' + m.join(' ') + ']')
      .join(', ');
    result += ']';
    if (!this.basis.isStandard(true)) {
      result += ` ${this.basis}`;
    }
    if (this.weights.every(w => w === 1)) {
      if (this.pureEquaves) {
        result += ', niente, true';
      }
    } else {
      result += ', [' + this.weights.map(w => `${w}r`).join(', ') + ']';
      if (this.pureEquaves) {
        result += ', true';
      }
    }
    return result + ')';
  }
}

/**
 * Format a {@link TimeMonzo} instance as a node in the abstract syntax tree if possible.
 * @param value Time monzo to convert.
 * @param node Reference node to infer type and formatting information from.
 * @param simplify Ignore formatting information from the reference AST node.
 * @returns AST node representing the time monzo.
 */
export function intervalValueAs(
  value: TimeMonzo | TimeReal,
  node: IntervalLiteral | undefined,
  simplify = false
): IntervalLiteral | undefined {
  if (!node) {
    return undefined;
  }
  switch (node.type) {
    case 'IntegerLiteral':
      return value.asIntegerLiteral();
    case 'FractionLiteral':
      return value.asFractionLiteral(simplify ? undefined : node);
    case 'NedjiLiteral':
      return value.asNedjiLiteral(simplify ? undefined : node);
    case 'CentsLiteral':
      return value.asCentsLiteral();
    case 'MonzoLiteral':
      return value.asMonzoLiteral();
    case 'FJS':
    case 'AspiringFJS':
      return {type: 'AspiringFJS', flavor: inferFJSFlavor(node)};
    case 'AbsoluteFJS':
    case 'AspiringAbsoluteFJS':
      return {type: 'AspiringAbsoluteFJS', flavor: inferFJSFlavor(node)};
    default:
      return undefined;
  }
}
