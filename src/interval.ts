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
  literalFromJSON,
  sqrtNode,
  pitchAbsNode,
} from './expression';
import {TimeMonzo, TimeReal} from './monzo';
import {asAbsoluteFJS, asFJS} from './fjs';
import {type RootContext} from './context';
import {
  NUM_INTERCHANGE_COMPONENTS,
  ONE,
  ZERO,
  countUpsAndLifts,
  setUnion,
} from './utils';
import {Fraction, FractionValue} from 'xen-dev-utils';

/**
 * Interval domain. The operator '+' means addition in the linear domain. In the logarithmic domain '+' correspond to multiplication of the underlying values instead.
 */
export type IntervalDomain = 'linear' | 'logarithmic';

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
      if (value.value.type === 'TimeMonzo') {
        monzo = TimeMonzo.reviver('value', value.value);
      } else {
        monzo = TimeReal.reviver('value', value.value);
      }
      const result = new Interval(
        monzo,
        value.domain,
        value.steps,
        literalFromJSON(value.node)
      );
      result.label = value.label;
      result.color = value.color && new Color(value.color);
      result.trackingIds = new Set(value.trackingIds);
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
      value: this.value.toJSON(),
      domain: this.domain,
      steps: this.steps,
      label: this.label,
      color: this.color && this.color.value,
      node: literalToJSON(this.node),
      trackingIds: Array.from(this.trackingIds),
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
    return new Val(this.value.geometricInverse(), this.value.clone(), node);
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
    if (
      interchange &&
      (node.basis.length ||
        node.components.length > NUM_INTERCHANGE_COMPONENTS ||
        this.steps)
    ) {
      node = this.value.asInterchangeLiteral()!;
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
 * A mappping vector commonly used to convert intervals in just intonation to steps of an equal temperament.
 */
export class Val {
  value: TimeMonzo;
  equave: TimeMonzo;
  domain = 'cologarithmic' as const;
  node?: IntervalLiteral;

  /**
   * Construct a mapping vector.
   * @param value A {@link TimeMonzo} instance interpreted as a val. Usually a projective approximation to the Just Intonation Point with integer coefficients.
   * @param equave The interval of equivalence of the equal temperament associated with this val.
   * @param node Node in the abstract syntax tree used for string representation.
   */
  constructor(value: TimeMonzo, equave: TimeMonzo, node?: IntervalLiteral) {
    this.value = value;
    this.equave = equave;
    this.node = node;
  }

  /**
   * Construct a val from an array of mapping entries representing equal divisions of an equave.
   * @param primeExponentMap Val components.
   * @param equave Equave of the equal temperament. Defaults to the octave.
   * @returns A cologarithmic mapping vector.
   */
  static fromArray(
    primeExponentMap: FractionValue[],
    equave?: TimeMonzo | FractionValue
  ) {
    if (!(equave instanceof TimeMonzo)) {
      equave = TimeMonzo.fromFraction(equave ?? 2);
    }
    return new Val(TimeMonzo.fromArray(primeExponentMap), equave);
  }

  /**
   * The number of divisions in the equal temperament associated with this val.
   */
  get divisions() {
    return this.value.dot(this.equave);
  }

  /**
   * The additive inverse of this val.
   * @returns The negative of this val.
   */
  neg() {
    return new Val(this.value.inverse(), this.equave);
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
   * A meaningless operation.
   * @returns A new val obtained by pretending its value represents a logarithmic quantity.
   */
  abs() {
    return new Val(this.value.pitchAbs(), this.equave);
  }

  /**
   * Throws an error.
   */
  pitchAbs(): Val {
    throw new Error(
      'Logarithmic extension of the already-cologarithmic domain not implemented.'
    );
  }

  /**
   * A meaningless operation.
   * @returns A new Val obtained by pretending its value represents a linear quantity.
   */
  sqrt() {
    const value = this.value.sqrt();
    if (value instanceof TimeMonzo) {
      return new Val(value, this.equave);
    }
    throw new Error('Val square root operation failed.');
  }

  /**
   * Check if this val has the same size and equave as another.
   * @param other Another val.
   * @returns `true` if the vals have the same size and their equaves have the same size.
   */
  equals(other: Val) {
    return this.value.equals(other.value) && this.equave.equals(other.equave);
  }

  /**
   * Check if this val has the same structure as another.
   * @param other Another val.
   * @returns `true` if the vals and their equaves have the same components.
   */
  strictEquals(other: Val) {
    return (
      this.value.strictEquals(other.value) &&
      this.equave.strictEquals(other.equave)
    );
  }

  /**
   * Add this this val to another.
   * @param other Another val.
   * @returns The sum of the vals.
   */
  add(other: Val) {
    if (!this.equave.strictEquals(other.equave)) {
      throw new Error('Val equaves must match in addition');
    }
    const node = addNodes(this.node, other.node);
    const value = this.value.mul(other.value);
    if (value instanceof TimeReal) {
      throw new Error('Val addition failed.');
    }
    return new Val(value, this.equave, node);
  }

  /**
   * Subtract another val from this one.
   * @param other Another val.
   * @returns The difference of the vals.
   */
  sub(other: Val) {
    if (!this.equave.strictEquals(other.equave)) {
      throw new Error('Val equaves must match in subtraction');
    }
    const node = subNodes(this.node, other.node);
    const value = this.value.div(other.value);
    if (value instanceof TimeReal) {
      throw new Error('Val subtraction failed.');
    }
    return new Val(value, this.equave, node);
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
    return new Val(value, this.equave);
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
    return new Val(value, this.equave);
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
   * Obtain a faithful string representation of this val.
   * @returns A string that evaluates to a val with the same value as this one when interpreted as a SonicWeave expression.
   */
  toString() {
    if (this.node) {
      return literalToString(this.node);
    }
    const result = this.value.toString('cologarithmic');
    if (this.equave.compare(TWO)) {
      return `withEquave(${result}, ${this.equave.toString()})`;
    }
    return result;
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
