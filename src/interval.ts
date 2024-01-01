import {Fraction} from 'xen-dev-utils';
import {
  IntervalLiteral,
  NedjiLiteral,
  addNodes,
  divNodes,
  mulNodes,
  projectNodes,
  subNodes,
  literalToString,
} from './expression';
import {Domain, TimeMonzo} from './monzo';
import {asAbsoluteFJS, asFJS} from './fjs';
import {RootContext} from './context';

export class Color {
  value: string;

  constructor(value: string) {
    this.value = value;
  }
}

const TWO = new TimeMonzo(new Fraction(0), [new Fraction(1)]);

function logLinMul(
  logarithmic: Interval,
  linear: Interval,
  node?: IntervalLiteral
) {
  if (linear.node?.type === 'DecimalLiteral' && linear.node.hard) {
    let size = logarithmic.value.totalCents();
    if (logarithmic.domain === 'cologarithmic') {
      size *= 1200 ** -2;
    }
    return new Interval(
      TimeMonzo.fromCents(size * linear.value.valueOf()),
      logarithmic.domain,
      node
    );
  }
  const value = logarithmic.value.pow(linear.value);
  if (logarithmic.node?.type === 'FJS') {
    node = asFJS(value);
  }
  return new Interval(value, logarithmic.domain, node);
}

export class Interval {
  value: TimeMonzo;
  domain: Domain;
  node?: IntervalLiteral;
  color?: Color;
  label: string;

  constructor(
    value: TimeMonzo,
    domain: Domain,
    node?: IntervalLiteral,
    convert?: Interval
  ) {
    this.value = value;
    this.domain = domain;
    this.node = node;
    if (convert !== undefined) {
      this.color = convert.color;
      this.label = convert.label;
    } else {
      this.label = '';
    }
  }

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

  toInteger(): number {
    return Number(this.value.toBigInteger());
  }

  isRelative() {
    return !this.value.timeExponent.n;
  }

  isAbsolute() {
    return !!this.value.timeExponent.n;
  }

  neg() {
    if (this.domain === 'linear') {
      return new Interval(this.value.neg(), this.domain);
    }
    return new Interval(this.value.inverse(), this.domain);
  }

  inverse() {
    if (this.domain === 'linear') {
      return new Interval(this.value.inverse(), this.domain);
    }
    // This overload should be fine because multiplication is not implemented in the logarithmic domain.
    return new Interval(
      this.value.geometricInverse(),
      this.domain === 'logarithmic' ? 'cologarithmic' : 'logarithmic'
    );
  }

  abs() {
    if (this.domain === 'linear') {
      return new Interval(this.value.abs(), this.domain);
    }
    return new Interval(this.value.pitchAbs(), this.domain);
  }

  project(base: Interval) {
    const node = projectNodes(this.node, base.node);
    return new Interval(
      base.value.pow(this.value.octaves),
      'logarithmic',
      node
    );
  }

  add(other: Interval) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in addition');
    }
    const node = addNodes(this.node, other.node);
    if (this.domain === 'linear') {
      return new Interval(this.value.add(other.value), this.domain, node);
    }
    return new Interval(this.value.mul(other.value), this.domain, node);
  }

  sub(other: Interval) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in subtraction');
    }
    const node = subNodes(this.node, other.node);
    if (this.domain === 'linear') {
      return new Interval(this.value.sub(other.value), this.domain, node);
    }
    return new Interval(this.value.div(other.value), this.domain, node);
  }

  roundTo(other: Interval) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in rounding');
    }
    if (this.domain === 'linear') {
      return new Interval(this.value.roundTo(other.value), this.domain);
    }
    return new Interval(this.value.pitchRoundTo(other.value), this.domain);
  }

  mmod(other: Interval) {
    if (this.domain !== other.domain) {
      throw new Error('Domains must match in modulo');
    }
    if (this.domain === 'linear') {
      return new Interval(this.value.mmod(other.value), this.domain);
    }
    return new Interval(this.value.reduce(other.value), this.domain);
  }

  pitchRoundTo(other: Interval) {
    if (this.domain === 'logarithmic' || other.domain === 'logarithmic') {
      throw new Error(
        'Exponential rounding not implemented in logarithmic domain'
      );
    }
    if (!other.value.isScalar()) {
      throw new Error('Only scalar exponential rounding implemented');
    }
    return new Interval(this.value.pitchRoundTo(other.value), this.domain);
  }

  mul(other: Interval) {
    if (this.domain !== 'linear' && other.domain !== 'linear') {
      throw new Error('At least one domain must be linear in multiplication');
    }
    const node = mulNodes(this.node, other.node);
    if (other.domain === 'logarithmic' || other.domain === 'cologarithmic') {
      return logLinMul(other, this, node);
    }
    if (this.domain === 'logarithmic' || this.domain === 'cologarithmic') {
      return logLinMul(this, other, node);
    }
    return new Interval(this.value.mul(other.value), this.domain, node);
  }

  div(other: Interval) {
    let node = divNodes(this.node, other.node);
    if (other.domain === 'logarithmic') {
      if (this.domain !== 'logarithmic') {
        throw new Error('Domains must match in non-scalar division');
      }
      return new Interval(this.value.log(other.value), 'linear', node);
    }
    if (this.domain === 'logarithmic') {
      const value = this.value.pow(other.value.inverse());
      if (this.node?.type === 'FJS') {
        node = asFJS(value);
      }
      return new Interval(value, this.domain, node);
    }
    return new Interval(this.value.div(other.value), this.domain, node);
  }

  dot(other: Interval) {
    const product = this.value.dot(other.value);
    if (product.d === 1) {
      const value = BigInt(product.s * product.n);
      return new Interval(TimeMonzo.fromBigInt(value), 'linear', {
        type: 'IntegerLiteral',
        value,
      });
    }
    return new Interval(TimeMonzo.fromFraction(product), 'linear');
  }

  pow(other: Interval) {
    if (this.domain === 'logarithmic' || other.domain === 'logarithmic') {
      throw new Error('Exponentiation not implemented in logarithmic domain');
    }
    if (!other.value.isScalar()) {
      throw new Error('Only scalar exponentiation implemented');
    }
    return new Interval(this.value.pow(other.value), this.domain);
  }

  log(other: Interval) {
    if (this.domain === 'logarithmic' || other.domain === 'logarithmic') {
      throw new Error(
        'Logarithm not implemented in the (already) logarithmic domain'
      );
    }
    return new Interval(this.value.log(other.value), this.domain);
  }

  reduce(other: Interval) {
    if (this.domain === 'logarithmic' || other.domain === 'logarithmic') {
      throw new Error('Reduction not implemented in logarithmic domain');
    }
    return new Interval(this.value.reduce(other.value), this.domain);
  }

  backslash(other: Interval) {
    if (!this.value.isScalar() || !other.value.isScalar()) {
      throw new Error('Only scalars can be backslashed');
    }
    if (this.domain !== 'linear' || other.domain !== 'linear') {
      throw new Error('Only linear backslashing implemented');
    }
    const value = TWO.pow(this.value.div(other.value));
    let node: NedjiLiteral | undefined;
    if (this.value.isIntegral() && other.value.isIntegral()) {
      node = {
        type: 'NedoLiteral',
        numerator: this.value.toBigInteger(),
        denominator: other.value.toBigInteger(),
      };
    }
    return new Interval(value, 'logarithmic', node);
  }

  compare(other: Interval) {
    return this.value.compare(other.value);
  }

  equals(other: Interval) {
    return this.value.equals(other.value);
  }

  strictEquals(other: Interval) {
    return this.domain === other.domain && this.value.strictEquals(other.value);
  }

  _toString(context?: RootContext) {
    if (this.node) {
      if (this.node.type === 'AbsoluteFJS') {
        throw new Error('Unexpected frozen absolute FJS');
      }
      let node: IntervalLiteral | undefined = this.node;
      if (this.node.type === 'AspiringAbsoluteFJS') {
        if (!context) {
          return this.value.toString(this.domain);
        }
        const C4 = context.C4;
        const relativeToC4 = this.value.div(C4);
        node = asAbsoluteFJS(relativeToC4);
        if (!node) {
          return this.value.toString(this.domain);
        }
      }
      return literalToString(node);
    }
    return this.value.toString(this.domain);
  }

  toString(context?: RootContext) {
    const base = this._toString(context);
    const color = this.color ? this.color.value : '';
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

  valueOf() {
    if (this.value.isIntegral()) {
      return Number(this.value.toBigInteger());
    }
    return this.value.valueOf();
  }
}

export function timeMonzoAs(
  monzo: TimeMonzo,
  node: IntervalLiteral | undefined
): IntervalLiteral | undefined {
  if (!node) {
    return undefined;
  }
  switch (node.type) {
    case 'IntegerLiteral':
      return monzo.asIntegerLiteral();
    case 'FractionLiteral':
      return monzo.asFractionLiteral(node);
    case 'NedoLiteral':
      return monzo.asNedjiLiteral(node);
    case 'CentsLiteral':
      return monzo.asCentsLiteral();
    case 'MonzoLiteral':
      return monzo.asMonzoLiteral();
    case 'FJS':
      return asFJS(monzo);
    case 'AbsoluteFJS':
      return asAbsoluteFJS(monzo);
    default:
      return undefined;
  }
}
