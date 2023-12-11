import {IntervalLiteral, addNodes, subNodes, toString} from './expression';
import {TimeMonzo} from './monzo';

export type Domain = 'linear' | 'logarithmic' | 'cologarithmic';

export class Color {
  value: string;

  constructor(value: string) {
    this.value = value;
  }
}

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

  compare(other: Interval) {
    return this.value.valueOf() - other.value.valueOf();
  }

  toString() {
    if (this.node) {
      return toString(this.node);
    }
    return this.value.toString(this.domain === 'linear');
  }
}
