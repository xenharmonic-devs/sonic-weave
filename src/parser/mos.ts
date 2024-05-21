import {Fraction, gcd} from 'xen-dev-utils';
import {
  AbstractStepPattern,
  IntegerPattern,
  HardnessDeclaration,
  MosExpression,
  PatternUpDownPeriod,
  RationalEquave,
  LargeDeclaration,
  SmallDeclaration,
  EquaveDeclaration,
} from '../ast';
import {TimeMonzo, TimeReal} from '../monzo';
import {ExpressionVisitor} from './expression';
import {MosMonzo, MosOptions, generateNotation, mos} from 'moment-of-symmetry';
import {Interval} from '../interval';
import {MosConfig, MosDegree} from '../diamond-mos';
import {ONE, TWO, ZERO} from '../utils';

const TWO_MONZO = new TimeMonzo(ZERO, [ONE]);

function realize(mosMonzo: MosMonzo, large: TimeMonzo, small: TimeMonzo) {
  return large.pow(mosMonzo[0]).mul(small.pow(mosMonzo[1])) as TimeMonzo;
}

/**
 * Pun on MosVisitor.
 */
export class Tardigrade {
  subVisitor: ExpressionVisitor;
  equave?: TimeMonzo;
  hardness?: TimeMonzo | TimeReal;
  large?: TimeMonzo;
  small?: TimeMonzo;
  pattern?: string;

  constructor(subVisitor: ExpressionVisitor) {
    this.subVisitor = subVisitor;
  }

  createMosConfig(): MosConfig {
    if (!this.pattern) {
      throw new Error('Mode must be given in MOS declaration.');
    }
    const notation = generateNotation(this.pattern);
    const N = new Fraction(this.pattern.length);
    const countL = new Fraction((this.pattern.match(/L/g) ?? []).length);
    const countS = N.sub(countL);
    let small: TimeMonzo | TimeReal;
    let large: TimeMonzo | TimeReal;
    if (this.equave) {
      if (this.hardness) {
        if (this.hardness.valueOf() === Infinity) {
          small = this.equave.pow(0);
          large = this.equave.pow(countL.inverse());
        } else {
          // L /_ s = r
          // L = s^r
          // L^countL * s^countS = equave
          // s^(countL * r + countS) = equave
          small = this.equave.pow(
            TimeMonzo.fromFraction(countL)
              .mul(this.hardness)
              .add(TimeMonzo.fromFraction(countS))
              .inverse()
          );
          large = small.pow(this.hardness);
        }
      } else if (this.large) {
        large = this.large;
        small = this.equave
          .div(large.pow(countL))
          .pow(countS.inverse()) as TimeMonzo;
      } else if (this.small) {
        small = this.small;
        large = this.equave
          .div(small.pow(countS))
          .pow(countL.inverse()) as TimeMonzo;
      } else {
        // Assume basic
        small = this.equave.pow(countL.mul(TWO).add(countS).inverse());
        large = small.pow(TWO);
      }
    } else {
      if (this.hardness) {
        if (this.hardness.valueOf() === Infinity) {
          if (this.large) {
            large = this.large;
          } else if (this.small) {
            throw new Error(
              'Small step may not be given with infinite hardness.'
            );
          } else {
            // Assume octave
            large = TWO_MONZO.pow(countL.inverse());
          }
          small = large.pow(0);
        } else {
          if (this.large) {
            large = this.large;
            small = large.pow(this.hardness.inverse());
          } else if (this.small) {
            small = this.small;
            large = small.pow(this.hardness);
          } else {
            // Assume octave
            small = TWO_MONZO.pow(
              TimeMonzo.fromFraction(countL)
                .mul(this.hardness)
                .add(TimeMonzo.fromFraction(countS))
                .inverse()
            );
            large = small.pow(this.hardness);
          }
        }
      } else if (this.large) {
        large = this.large;
        if (this.small) {
          small = this.small;
        } else {
          // L^countL * s^countS = 2/1
          // s^countS = equave ÷ L^countL
          small = TWO_MONZO.div(large.pow(countL)).pow(countS.inverse());
        }
      } else if (this.small) {
        small = this.small;
        // L^countL * s^countS = 2/1
        large = TWO_MONZO.div(small.pow(countS)).pow(countL.inverse());
      } else {
        // Default to octave-equivalent basic
        const M = countL.mul(2).add(countS);
        small = TimeMonzo.fromEqualTemperament(M.inverse());
        large = TimeMonzo.fromEqualTemperament(M.inverse().mul(2));
      }
    }
    if (this.small && !this.small.equals(small)) {
      throw new Error('Inconsistent MOS declaration.');
    }
    if (this.large && !this.large.equals(large)) {
      throw new Error('Inconsistent MOS declaration.');
    }

    if (large instanceof TimeReal || small instanceof TimeReal) {
      throw new Error('MOS declaration must remain radical.');
    }

    const am = large.div(small) as TimeMonzo;
    const semiam = am.sqrt() as TimeMonzo;
    const r = (m: MosMonzo) =>
      realize(m, large as TimeMonzo, small as TimeMonzo);
    const scale = notation.scale as unknown as Map<string, TimeMonzo>;
    for (const [key, value] of notation.scale) {
      scale.set(key, r(value));
    }
    const degrees: MosDegree[] = [];
    for (const degree of notation.degrees) {
      degrees.push({
        imperfect: !degree.perfect,
        center: r(degree.center),
        mid: degree.mid ? r(degree.mid) : undefined,
      });
    }
    return {
      am,
      semiam,
      equave: r(notation.equave),
      period: r(notation.period),
      scale,
      degrees,
      pattern: this.pattern,
      large,
      small,
    };
  }

  visit(node: MosExpression) {
    switch (node.type) {
      case 'AbstractStepPattern':
        return this.visitAbstractStepPattern(node);
      case 'IntegerPattern':
        return this.visitIntegerPattern(node);
      case 'PatternUpDownPeriod':
        return this.visitPatternUpDownPeriod(node);
      case 'HardnessDeclaration':
      case 'LargeDeclaration':
      case 'SmallDeclaration':
      case 'EquaveDeclaration':
        return this.visitDeclaration(node);
    }
    node satisfies never;
  }

  visitRationalEquave(node: RationalEquave) {
    return TimeMonzo.fromFraction(
      new Fraction(node.numerator, node.denominator)
    );
  }

  visitAbstractStepPattern(node: AbstractStepPattern) {
    this.pattern = node.pattern.join('');
    if (node.equave) {
      this.equave = this.visitRationalEquave(node.equave);
    }
  }

  visitIntegerPattern(node: IntegerPattern) {
    const small = Math.min(...node.pattern);
    const large = Math.max(...node.pattern);
    this.pattern = node.pattern.map(i => (i === small ? 's' : 'L')).join('');
    if (small) {
      this.hardness = TimeMonzo.fromFraction(new Fraction(large, small));
    } else {
      this.hardness = TimeReal.fromValue(Infinity);
    }
    if (node.equave) {
      this.equave = this.visitRationalEquave(node.equave);
    }
  }

  visitPatternUpDownPeriod(node: PatternUpDownPeriod) {
    const options: MosOptions = {};
    if (node.udp) {
      options.up = node.udp.up;
      options.down = node.udp.down;
      if (
        node.udp.period !== null &&
        node.udp.period !== gcd(node.countLarge, node.countSmall)
      ) {
        throw new Error('Period must be consistent with counts if given.');
      }
    }
    // moment-of-symmetry generates the brightest mode by default
    const basic = mos(node.countLarge, node.countSmall, options);
    let pattern = '';
    let previous = 0;
    for (const step of basic) {
      if (step - previous === 2) {
        pattern += 'L';
      } else {
        pattern += 's';
      }
      previous = step;
    }
    this.pattern = pattern;
    if (node.equave) {
      this.equave = this.visitRationalEquave(node.equave);
    }
  }

  visitDeclaration(
    node:
      | HardnessDeclaration
      | LargeDeclaration
      | SmallDeclaration
      | EquaveDeclaration
  ) {
    const value = this.subVisitor.visit(node.value);
    if (!(value instanceof Interval)) {
      throw new Error(`${node.type} must evaluate to an interval.`);
    }
    if (node.type === 'HardnessDeclaration' && value.valueOf() === Infinity) {
      return (this.hardness = value.value);
    }
    if (!(value.value instanceof TimeMonzo)) {
      throw new Error(`${node.type} must evaluate to a radical.`);
    }
    switch (node.type) {
      case 'HardnessDeclaration':
        return (this.hardness = value.value);
      case 'LargeDeclaration':
        return (this.large = value.value);
      case 'SmallDeclaration':
        return (this.small = value.value);
      case 'EquaveDeclaration':
        return (this.equave = value.value);
    }
    node satisfies never;
  }
}
