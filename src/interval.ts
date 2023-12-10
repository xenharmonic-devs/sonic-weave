import {Primary, addNodes, subNodes} from './expression';
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
  node?: Primary;
  color?: Color;
  label?: string;

  constructor(value: TimeMonzo, domain: Domain, node?: Primary) {
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
}
