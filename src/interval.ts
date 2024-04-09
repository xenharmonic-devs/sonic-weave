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
} from './expression';
import {TimeMonzo} from './monzo';
import {asAbsoluteFJS, asFJS} from './fjs';
import {RootContext} from './context';
import {ONE, ZERO, countUpsAndLifts, setUnion} from './utils';
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
   * @returns A string without percentage signs.
   */
  toString() {
    return this.value.replace(/%/g, '');
  }
}

const TWO = new TimeMonzo(ZERO, [ONE]);

function logLinMul(
  logarithmic: Interval,
  linear: Interval,
  node?: IntervalLiteral,
  zombie?: Interval
) {
  if (linear.node?.type === 'DecimalLiteral' && linear.node.flavor === 'r') {
    const size = logarithmic.totalCents();
    return new Interval(
      TimeMonzo.fromCents(size * linear.value.valueOf()),
      logarithmic.domain,
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
  return new Interval(value, logarithmic.domain, node, zombie);
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
 * @returns Left value divided by the right value as a {@link TimeMonzo}.
 */
export function log(left: Interval, right: Interval) {
  const log = left.value.log(right.value);
  if (typeof log === 'number') {
    return TimeMonzo.fromValue(log);
  } else {
    return TimeMonzo.fromFraction(log);
  }
}

/**
 * A musical interval associated with a domain, an AST node, CSS color, note label and tracking identifiers.
 */
export class Interval {
  value: TimeMonzo;
  domain: IntervalDomain;
  node?: IntervalLiteral;
  color?: Color;
  label: string;
  trackingIds: Set<number>;

  /**
   * Construct a musical interval.
   * @param value A time monzo representing the size and echelon (frequency vs. frequency ratio) of the interval.
   * @param domain Domain determining what addition means.
   * @param node Node in the abstract syntax tree used for string representation.
   * @param convert Another {@link Interval} instance to obtain CSS color, note label and tracking information from.
   */
  constructor(
    value: TimeMonzo,
    domain: IntervalDomain,
    node?: IntervalLiteral,
    convert?: Interval
  ) {
    validateNode(node);
    this.value = value;
    this.domain = domain;
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
    const monzo = TimeMonzo.fromValue(value);
    return new Interval(monzo, 'linear', monzo.asDecimalLiteral(), convert);
  }

  /**
   * Clone this {@link Interval} instance without deeply copying any of the parts.
   * @returns An interval like this one but replacing any of the parts won't change the original.
   */
  shallowClone(): Interval {
    return new Interval(this.value, this.domain, this.node, this);
  }

  /** Convert the interval to an integer. */
  toInteger(): number {
    return Number(this.value.toBigInteger());
  }

  /** Convert the interval to a fraction in linear space. */
  toFraction(): Fraction {
    return this.value.toFraction();
  }

  /** Return `true` if the interval represents a ratio of frequencies. */
  isRelative() {
    return !this.value.timeExponent.n;
  }

  /** Return `true` if the interval could be interpreted as a frequency. */
  isAbsolute() {
    return !!this.value.timeExponent.n;
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
      return new Interval(this.value.neg(), this.domain, node, this);
    }
    return new Interval(this.value.inverse(), this.domain, node, this);
  }

  /**
   * Invert the value of a linear interval or convert a logarithmic interval to a val that maps it to unity.
   * @returns Inverse of this interval.
   */
  inverse() {
    const node = invertNode(this.node);
    if (this.domain === 'linear') {
      return new Interval(this.value.inverse(), this.domain, node, this);
    }
    // This overload should be fine because multiplication is not implemented in the logarithmic domain.
    return new Val(this.value.geometricInverse(), this.value.clone(), node);
  }

  /**
   * Calculate the absolute value of a linear interval or obtain a logarithmic intervals distance to unison.
   * @returns Absolute value of this interval.
   */
  abs() {
    const node = absNode(this.node);
    if (this.domain === 'linear') {
      return new Interval(this.value.abs(), this.domain, node, this);
    }
    return new Interval(this.value.pitchAbs(), this.domain, node, this);
  }

  /**
   * Project the exponent of two to the given base.
   * @param base New base to replace prime two.
   * @returns N steps of equal divisions of the new base assuming this interval was N steps of an equally divided octave.
   */
  project(base: Interval) {
    const node = projectNodes(this.node, base.node);
    return new Interval(
      this.value.project(base.value),
      'logarithmic',
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
      throw new Error('Domains must match in addition');
    }
    let node = addNodes(this.node, other.node);
    const value =
      this.domain === 'linear'
        ? this.value.add(other.value)
        : this.value.mul(other.value);
    if (!node && this.node?.type === other.node?.type) {
      node = timeMonzoAs(value, this.node, true);
    }
    const zombie = infect(this, other);
    return new Interval(value, this.domain, node, zombie);
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
    let node = subNodes(this.node, other.node);
    const value =
      this.domain === 'linear'
        ? this.value.sub(other.value)
        : this.value.div(other.value);
    if (!node && this.node?.type === other.node?.type) {
      node = timeMonzoAs(value, this.node, true);
    }
    const zombie = infect(this, other);
    return new Interval(value, this.domain, node, zombie);
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
    const node = lensAddNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.lensAdd(other.value),
        this.domain,
        node,
        zombie
      );
    }
    const magnitude = this.value.dot(this.value);
    if (!magnitude.n) {
      return new Interval(this.value.clone(), this.domain, node, zombie);
    }
    const otherMagnitude = other.value.dot(other.value);
    if (!otherMagnitude.n) {
      return new Interval(other.value.clone(), this.domain, node, zombie);
    }
    return new Interval(
      this.value
        .pow(magnitude.inverse())
        .mul(other.value.pow(otherMagnitude.inverse()))
        .geometricInverse(),
      this.domain,
      node,
      zombie
    );
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
    const node = lensSubNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.lensSub(other.value),
        this.domain,
        node,
        zombie
      );
    }
    const magnitude = this.value.dot(this.value);
    if (!magnitude.n) {
      return new Interval(this.value.clone(), this.domain, node, zombie);
    }
    const otherMagnitude = other.value.dot(other.value);
    if (!otherMagnitude.n) {
      return new Interval(other.value.clone(), this.domain, node, zombie);
    }
    return new Interval(
      this.value
        .pow(magnitude.inverse())
        .div(other.value.pow(otherMagnitude.inverse()))
        .geometricInverse(),
      this.domain,
      node,
      zombie
    );
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
    const node = roundToNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.roundTo(other.value),
        this.domain,
        node,
        zombie
      );
    }
    return new Interval(
      this.value.pitchRoundTo(other.value),
      this.domain,
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
    const node = modNodes(this.node, other.node);
    const zombie = infect(this, other);
    if (this.domain === 'linear') {
      return new Interval(
        this.value.mmod(other.value, ceiling),
        this.domain,
        node,
        zombie
      );
    }
    return new Interval(
      this.value.reduce(other.value, ceiling),
      this.domain,
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
    if (!other.value.isScalar()) {
      throw new Error('Only scalar exponential rounding implemented');
    }
    const node = pitchRoundToNodes(this.node, other.node);
    return new Interval(
      this.value.pitchRoundTo(other.value),
      this.domain,
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
    return new Interval(this.value.mul(other.value), this.domain, node, zombie);
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
      return new Interval(log(this, other), 'linear', node, zombie);
    }
    if (this.domain === 'logarithmic') {
      const value = this.value.pow(other.value.inverse());
      if (this.node?.type === 'FJS' || this.node?.type === 'AspiringFJS') {
        node = {type: 'AspiringFJS', flavor: ''};
      }
      return new Interval(value, this.domain, node, zombie);
    }
    return new Interval(this.value.div(other.value), this.domain, node, zombie);
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
    let monzo: TimeMonzo;
    let val: TimeMonzo;
    // Rig ups and downs.
    if (other.domain === 'cologarithmic') {
      monzo = this.value;
      val = other.value.clone();
      val.cents++;
    } else {
      monzo = this.value;
      val = other.value;
    }

    const product = monzo.dot(val);
    const zombie = other instanceof Interval ? infect(this, other) : this;
    if (product.d === 1) {
      const value = BigInt(product.s * product.n);
      return new Interval(
        TimeMonzo.fromBigInt(value),
        'linear',
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
      throw new Error('Exponentiation not implemented in logarithmic domain');
    }
    if (!other.value.isScalar()) {
      throw new Error('Only scalar exponentiation implemented');
    }
    const node = powNodes(this.node, other.node);
    return new Interval(
      this.value.pow(other.value),
      this.domain,
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
        'Inverse exponentiation not implemented in logarithmic domain'
      );
    }
    if (!other.value.isScalar()) {
      throw new Error('Only scalar inverse exponentiation implemented');
    }
    const node = ipowNodes(this.node, other.node);
    return new Interval(
      this.value.pow(other.value.inverse()),
      this.domain,
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
    const node = logNodes(this.node, other.node);
    return new Interval(
      log(this, other),
      this.domain,
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
    const node = reduceNodes(this.node, other.node);
    return new Interval(
      this.value.reduce(other.value, ceiling),
      this.domain,
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
      throw new Error('Only linear backslashing implemented');
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
    return new Interval(value, 'logarithmic', node, infect(this, other));
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
    return this.domain === other.domain && this.value.strictEquals(other.value);
  }

  /**
   * (This method is an optimization detail.) Convert aspiring nodes to true AST nodes for formatting.
   * @param context Current root context with information about root pitch and size of ups and lifts.
   * @returns A true AST node suitable for string conversion or `undefined` realization is impossible in the given context.
   */
  realizeNode(context: RootContext) {
    if (!this.node) {
      return this.node;
    }
    if (this.node.type === 'AspiringAbsoluteFJS') {
      const C4 = context.C4;
      const relativeToC4 = this.value.div(C4);
      let ups = 0;
      let lifts = 0;
      let steps = 0;
      let residue = 0;
      if (context.up.isRealCents() && context.lift.isRealCents()) {
        ({ups, lifts, steps, residue} = countUpsAndLifts(
          relativeToC4.cents,
          context.up.cents,
          context.lift.cents
        ));
        if (steps || residue) {
          return undefined;
        }
        relativeToC4.cents = 0;
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
      const value = this.value.clone();
      let ups = 0;
      let lifts = 0;
      if (value.cents) {
        let steps = 0;
        let residue = 0;
        if (context.up.isRealCents() && context.lift.isRealCents()) {
          ({ups, lifts, steps, residue} = countUpsAndLifts(
            value.cents,
            context.up.cents,
            context.lift.cents
          ));
          if (steps || residue) {
            return undefined;
          }
          value.cents = 0;
        }
      }

      const node = asFJS(value, this.node.flavor);
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
   * Convert this interval to a string that faithfully represents it ignoring colors and labels.
   * @param context Current root context with information about root pitch and size of ups and lifts.
   * @returns String that has the same value and domain as this interval if evaluated as a SonicWeave expression.
   */
  str(context?: RootContext) {
    if (this.node) {
      let node: IntervalLiteral | undefined = this.node;
      let prefix = '';
      let postfix = '';
      if (this.node.type === 'AspiringAbsoluteFJS') {
        if (!context) {
          return this.value.toString(this.domain);
        }
        const C4 = context.C4;
        const relativeToC4 = this.value.div(C4);
        if (context.up.isRealCents() && context.lift.isRealCents()) {
          ({prefix, postfix} = countUpsAndLifts(
            relativeToC4.cents,
            context.up.cents,
            context.lift.cents
          ));
          relativeToC4.cents = 0;
        }

        node = asAbsoluteFJS(relativeToC4, this.node.flavor);
        if (!node) {
          return this.value.toString(this.domain);
        }
      }
      if (this.node.type === 'AspiringFJS') {
        const value = this.value.clone();
        if (value.cents) {
          if (!context) {
            return this.value.toString(this.domain);
          }
          if (context.up.isRealCents() && context.lift.isRealCents()) {
            ({prefix, postfix} = countUpsAndLifts(
              value.cents,
              context.up.cents,
              context.lift.cents
            ));
            value.cents = 0;
          }
        }

        node = asFJS(value, this.node.flavor);
        if (!node) {
          return this.value.toString(this.domain);
        }
      }
      return prefix + literalToString(node) + postfix;
    }
    return this.value.toString(this.domain);
  }

  // "JS" toString or "Python" repr.
  /**
   * Convert this interval to a string that faithfully represents it including color and label.
   * @param context Current root context with information about root pitch and size of ups and lifts.
   * @returns String that has the same value and domain as this interval if evaluated as a SonicWeave expression.
   */
  toString(context?: RootContext) {
    const base = this.str(context);
    const color = this.color ? this.color.toString() : '';
    if (this.color || this.label) {
      let result = '(' + base;
      if (color) {
        result += ' ' + color;
      }
      if (this.label) {
        result += ' ' + JSON.stringify(this.label);
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
      return Number(this.value.toBigInteger());
    }
    return this.value.valueOf();
  }

  /**
   * Apply an up arrow to this interval.
   * @param context Current root context with the value of "up" to apply.
   * @returns A new interval with size increased by the current "up" value.
   */
  up(context: RootContext) {
    const value = this.value.mul(context.up);
    if (
      this.node?.type === 'FJS' ||
      this.node?.type === 'AbsoluteFJS' ||
      this.node?.type === 'MonzoLiteral' ||
      this.node?.type === 'ValLiteral'
    ) {
      const node = {...this.node};
      node.ups++;
      const result = new Interval(value, this.domain, node, this);
      context.fragiles.push(result);
      return result;
    }
    return new Interval(value, this.domain, undefined, this);
  }

  /**
   * Apply a down arrow to this interval.
   * @param context Current root context with the value of "down" to apply.
   * @returns A new interval with size decreased by the current "up" value.
   */
  down(context: RootContext) {
    const value = this.value.div(context.up);
    if (
      this.node?.type === 'FJS' ||
      this.node?.type === 'AbsoluteFJS' ||
      this.node?.type === 'MonzoLiteral' ||
      this.node?.type === 'ValLiteral'
    ) {
      const node = {...this.node};
      node.ups--;
      const result = new Interval(value, this.domain, node, this);
      context.fragiles.push(result);
      return result;
    }
    return new Interval(value, this.domain, undefined, this);
  }

  /**
   * Apply a lift to this interval.
   * @param context Current root context with the value of "lift" to apply.
   * @returns A new interval with size increased by the current "lift" value.
   */
  lift(context: RootContext) {
    const value = this.value.mul(context.lift);
    if (
      this.node?.type === 'FJS' ||
      this.node?.type === 'AbsoluteFJS' ||
      this.node?.type === 'MonzoLiteral' ||
      this.node?.type === 'ValLiteral'
    ) {
      const node = {...this.node};
      node.lifts++;
      const result = new Interval(value, this.domain, node, this);
      context.fragiles.push(result);
      return result;
    }
    return new Interval(value, this.domain, undefined, this);
  }

  /**
   * Apply a drtop to this interval.
   * @param context Current root context with the value of "drop" to apply.
   * @returns A new interval with size decreased by the current "lift" value.
   */
  drop(context: RootContext) {
    const value = this.value.div(context.lift);
    if (
      this.node?.type === 'FJS' ||
      this.node?.type === 'AbsoluteFJS' ||
      this.node?.type === 'MonzoLiteral' ||
      this.node?.type === 'ValLiteral'
    ) {
      const node = {...this.node};
      node.lifts--;
      const result = new Interval(value, this.domain, node, this);
      context.fragiles.push(result);
      return result;
    }
    return new Interval(value, this.domain, undefined, this);
  }

  /**
   * Remove stored context-dependent formatting information. (Triggered by a context shift.)
   */
  break() {
    if (this.node?.type === 'FJS') {
      this.node = {type: 'AspiringFJS', flavor: ''};
    }
    if (this.node?.type === 'AbsoluteFJS') {
      this.node = {type: 'AspiringAbsoluteFJS', flavor: ''};
    }
    if (
      this.node?.type === 'MonzoLiteral' ||
      this.node?.type === 'ValLiteral'
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
    if (value.timeExponent.n || equave.timeExponent.n) {
      throw new Error('Only relative vals implemented.');
    }
    this.value = value;
    this.equave = equave;
    this.node = node;
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
   * Increase the "upness" of this val by one.
   * @param context Current root context with the value of "up" to apply.
   * @returns A val that maps up/down arrows on intervals more aggressively.
   */
  up(context: RootContext) {
    const value = this.value.mul(context.up);
    if (this.node?.type === 'ValLiteral') {
      const node = {...this.node};
      node.ups++;
      const result = new Val(value, this.equave, node);
      context.fragiles.push(result);
      return result;
    }
    return new Val(value, this.equave);
  }

  /**
   * Increase the "downness" of this val by one.
   * @param context Current root context with the value of "down" to apply.
   * @returns A val that maps up/down arrows on intervals more aggressively.
   */
  down(context: RootContext) {
    const value = this.value.div(context.up);
    if (this.node?.type === 'ValLiteral') {
      const node = {...this.node};
      node.ups--;
      const result = new Val(value, this.equave, node);
      context.fragiles.push(result);
      return result;
    }
    return new Val(value, this.equave);
  }

  /**
   * Increase the "liftness" of this val by one.
   * @param context Current root context with the value of "lift" to apply.
   * @returns A val that maps lifts/drops on intervals more aggressively.
   */
  lift(context: RootContext) {
    const value = this.value.mul(context.lift);
    if (this.node?.type === 'ValLiteral') {
      const node = {...this.node};
      node.lifts++;
      const result = new Val(value, this.equave, node);
      context.fragiles.push(result);
      return result;
    }
    return new Val(value, this.equave);
  }

  /**
   * Increase the "dropness" of this val by one.
   * @param context Current root context with the value of "drop" to apply.
   * @returns A val that maps lifts/drops on intervals more aggressively.
   */
  drop(context: RootContext) {
    const value = this.value.div(context.lift);
    if (this.node?.type === 'ValLiteral') {
      const node = {...this.node};
      node.lifts--;
      const result = new Val(value, this.equave, node);
      context.fragiles.push(result);
      return result;
    }
    return new Val(value, this.equave);
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
    return new Val(value, this.equave, node);
  }

  /**
   * Scale this val by a linear interval.
   * @param other A linear scalar.
   * @returns A rescaled version of this val.
   */
  mul(other: Interval) {
    if (other.domain !== 'linear' || other.value.timeExponent.n) {
      throw new Error('Only scalar multiplication implemented for vals.');
    }
    if (other.node?.type === 'DecimalLiteral' && other.node.flavor === 'r') {
      const size = this.value.totalCents() * 1200 ** -2;
      return new Val(
        TimeMonzo.fromCents(size * other.value.valueOf()),
        this.equave
      );
    }
    return new Val(this.value.pow(other.value), this.equave);
  }

  /**
   * Inversely scale this val by a linear interval.
   * @param other A linear scalar.
   * @returns A rescaled version of this val.
   */
  div(other: Interval) {
    if (other.domain !== 'linear' || other.value.timeExponent.n) {
      throw new Error('Only scalar multiplication implemented for vals.');
    }
    const scalar = other.value.inverse();
    return new Val(this.value.pow(scalar), this.equave);
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
      const value = BigInt(product.s * product.n);
      return new Interval(TimeMonzo.fromBigInt(value), 'linear', {
        type: 'IntegerLiteral',
        value,
      });
    }
    return new Interval(TimeMonzo.fromFraction(product), 'linear', {
      type: 'FractionLiteral',
      numerator: BigInt(product.s * product.n),
      denominator: BigInt(product.d),
    });
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

  /**
   * Remove formatting information. (Triggered on context shift.)
   */
  break() {
    this.node = undefined;
  }
}

/**
 * Format a {@link TimeMonzo} instance as a node in the abstract syntax tree if possible.
 * @param monzo Time monzo to convert.
 * @param node Reference node to infer type and formatting information from.
 * @param simplify Ignore formatting information from the reference AST node.
 * @returns AST node representing the time monzo.
 */
export function timeMonzoAs(
  monzo: TimeMonzo,
  node: IntervalLiteral | undefined,
  simplify = false
): IntervalLiteral | undefined {
  if (!node) {
    return undefined;
  }
  switch (node.type) {
    case 'IntegerLiteral':
      return monzo.asIntegerLiteral();
    case 'FractionLiteral':
      return monzo.asFractionLiteral(simplify ? undefined : node);
    case 'NedjiLiteral':
      return monzo.asNedjiLiteral(simplify ? undefined : node);
    case 'CentsLiteral':
      return monzo.asCentsLiteral();
    case 'MonzoLiteral':
      return monzo.asMonzoLiteral();
    case 'FJS':
    case 'AspiringFJS':
      return {type: 'AspiringFJS', flavor: ''};
    case 'AbsoluteFJS':
    case 'AspiringAbsoluteFJS':
      return {type: 'AspiringAbsoluteFJS', flavor: ''};
    default:
      return undefined;
  }
}
