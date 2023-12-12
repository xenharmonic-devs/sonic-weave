import {Fraction} from 'xen-dev-utils';
import {
  IntervalLiteral,
  NedoLiteral,
  addNodes,
  subNodes,
  toString,
} from './expression';
import {TimeMonzo} from './monzo';

export type Domain = 'linear' | 'logarithmic' | 'cologarithmic';

export class Color {
  value: string;

  constructor(value: string) {
    this.value = value;
  }
}

const TWO = new TimeMonzo(new Fraction(0), [new Fraction(1)]);

export class Interval {
  value: TimeMonzo;
  domain: Domain;
  node?: IntervalLiteral;
  color?: Color;
  label?: string;

  constructor(value: TimeMonzo, domain: Domain, node?: IntervalLiteral) {
    this.value = value;
    this.domain = domain;
    this.node = node;
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

  mul(other: Interval) {
    if (this.domain !== 'linear' && other.domain !== 'linear') {
      throw new Error('At least one domain must be linear in multiplication');
    }
    if (other.domain === 'logarithmic') {
      return new Interval(other.value.pow(this.value), other.domain);
    }
    if (this.domain === 'logarithmic') {
      return new Interval(this.value.pow(other.value), this.domain);
    }
    return new Interval(this.value.mul(other.value), this.domain);
  }

  div(other: Interval) {
    if (other.domain === 'logarithmic') {
      if (this.domain !== 'logarithmic') {
        throw new Error('Domains must match in non-scalar division');
      }
      return new Interval(this.value.log(other.value), 'linear');
    }
    if (this.domain === 'logarithmic') {
      return new Interval(this.value.pow(other.value.inverse()), this.domain);
    }
    return new Interval(this.value.div(other.value), this.domain);
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

  backslash(other: Interval) {
    if (!this.value.isScalar() || !other.value.isScalar()) {
      throw new Error('Only scalars can be backslashed');
    }
    if (this.domain !== 'linear' || other.domain !== 'linear') {
      throw new Error('Only linear backslashing implemented');
    }
    const value = TWO.pow(this.value.div(other.value));
    let node: NedoLiteral | undefined;
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

  toString() {
    if (this.node) {
      return toString(this.node);
    }
    return this.value.toString(this.domain === 'linear');
  }
}
