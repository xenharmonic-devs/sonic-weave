import {Fraction} from 'xen-dev-utils';
import {TimeMonzo} from './monzo';
import {ONE, ZERO} from './utils';

export class Blade {
  weight: Fraction;
  factors: TimeMonzo[];

  constructor(weight: Fraction, factors: TimeMonzo[]) {
    this.weight = weight;
    this.factors = [...factors];
  }

  get grade() {
    return this.factors.length;
  }

  wedge(other: Blade) {
    return new Blade(
      this.weight.mul(other.weight),
      this.factors.concat(other.factors)
    );
  }

  inverse() {
    function p(
      product: Fraction,
      indices: number[],
      rest: TimeMonzo[]
    ): Fraction {
      if (!rest.length) {
        return product;
      }
      const head = rest[0].primeExponents;
      const tail = rest.slice(1);
      let sum = new Fraction(0);
      for (let i = 0; i < head.length; ++i) {
        if (indices.includes(i)) {
          continue;
        }
        sum = sum.add(p(product.mul(head[i]), indices.concat([i]), tail));
      }
      return sum;
    }
    const norm2 = p(new Fraction(1), [], this.factors);
    if (this.grade % 4 <= 2) {
      return new Blade(this.weight.inverse().div(norm2), this.factors);
    }
    return new Blade(this.weight.neg().inverse().div(norm2), this.factors);
  }

  dotL(other: Blade): Blade {
    if (this.grade === 0) {
      return new Blade(this.weight.mul(other.weight), other.factors);
    }
    if (other.grade === 0) {
      return other.dotL(this);
    }
    if (this.grade === 1 && other.grade === 1) {
      return new Blade(
        this.factors[0]
          .dot(other.factors[0])
          .mul(this.weight)
          .mul(other.weight),
        []
      );
    }
    if (this.grade === 1 && other.grade === 2) {
      const result: Fraction[] = [];
      const x = this.factors[0].primeExponents;
      const y = other.factors[0].primeExponents;
      const z = other.factors[1].primeExponents;
      for (let i = 0; i < x.length; ++i) {
        for (let j = 0; j < y.length; ++j) {
          for (let k = 0; k < z.length; ++k) {
            const grade = Number(i !== j) + Number(i !== k) + Number(j !== k);
            if (grade === 1) {
              const product = x[i].mul(y[j]).mul(z[k]);
              if (i === j) {
                result[k] = (result[k] ?? ZERO).add(product);
              }
              if (i === k) {
                result[j] = (result[j] ?? ZERO).sub(product);
              }
            }
          }
        }
      }
      return new Blade(this.weight.mul(other.weight), [
        new TimeMonzo(ZERO, result),
      ]);
    }
    if (this.grade === 1) {
      const twoBlades: Blade[] = [];
      for (let i = 0; i < other.grade - 1; ++i) {
        twoBlades.push(new Blade(ONE, other.factors.slice(i, i + 2)));
      }
      const unit = new Blade(ONE, this.factors);
      const factors = twoBlades.map(b => unit.dotL(b).factors[0]);
      const weight = other.factors
        .slice(1)
        .reduce(
          (total, factor) =>
            total.div(new Blade(ONE, [factor]).dotL(unit).weight),
          this.weight.mul(other.weight)
        );
      return new Blade(weight, factors);
    }
    throw new Error(
      `Left contraction not implemented for grades ${this.grade} and ${other.grade}`
    );
  }
}
