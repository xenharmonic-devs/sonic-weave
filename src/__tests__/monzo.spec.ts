import {describe, it, expect} from 'vitest';
import {Fraction, valueToCents} from 'xen-dev-utils';

import {TimeMonzo} from '../monzo';

describe('Extended Monzo', () => {
  it('can be constructed from an integer', () => {
    const result = TimeMonzo.fromFraction(75, 3);
    expect(result.primeExponents.length).toBe(3);
    expect(result.primeExponents[0].equals(0)).toBeTruthy();
    expect(result.primeExponents[1].equals(1)).toBeTruthy();
    expect(result.primeExponents[2].equals(2)).toBeTruthy();
    expect(result.residual.equals(1)).toBeTruthy();
    expect(result.cents).toBe(0);
  });
  it('can be constructed from an integer with residual', () => {
    const result = TimeMonzo.fromFraction(75, 2);
    expect(result.primeExponents.length).toBe(2);
    expect(result.primeExponents[0].equals(0)).toBeTruthy();
    expect(result.primeExponents[1].equals(1)).toBeTruthy();
    expect(result.residual.equals(25)).toBeTruthy();
    expect(result.cents).toBe(0);
  });
  it('can be constructed from a fraction', () => {
    const result = TimeMonzo.fromFraction(new Fraction(3, 2), 2);
    expect(result.primeExponents.length).toBe(2);
    expect(result.primeExponents[0].equals(-1)).toBeTruthy();
    expect(result.primeExponents[1].equals(1)).toBeTruthy();
    expect(result.residual.equals(1)).toBeTruthy();
    expect(result.cents).toBe(0);
  });
  it('can be constructed from a fraction with residual', () => {
    const result = TimeMonzo.fromFraction(new Fraction(33, 28), 2);
    expect(result.primeExponents.length).toBe(2);
    expect(result.primeExponents[0].equals(-2)).toBeTruthy();
    expect(result.primeExponents[1].equals(1)).toBeTruthy();
    expect(result.residual.equals(new Fraction(11, 7))).toBeTruthy();
    expect(result.cents).toBe(0);
  });
  it('can be constructed from cents', () => {
    const result = TimeMonzo.fromCents(1200, 0);
    expect(result.primeExponents.length).toBe(0);
    expect(result.residual.equals(1)).toBeTruthy();
    expect(result.cents).toBe(1200);
  });
  it('can be constructed from n of edo', () => {
    const fifthOfTwelveEdo = new Fraction(7, 12);
    const octave = new Fraction(2);
    const result = TimeMonzo.fromEqualTemperament(fifthOfTwelveEdo, octave, 2);
    expect(result.primeExponents.length).toBe(2);
    expect(result.primeExponents[0].equals(new Fraction(7, 12))).toBeTruthy();
    expect(result.primeExponents[1].equals(0)).toBeTruthy();
    expect(result.residual.equals(1)).toBeTruthy();
    expect(result.cents).toBe(0);
  });
  it('can be constructed from n of edo without default octave', () => {
    const flatFifth = new Fraction(13, 23);
    const result = TimeMonzo.fromEqualTemperament(flatFifth, undefined, 1);
    expect(result.primeExponents.length).toBe(1);
    expect(result.primeExponents[0].equals(new Fraction(13, 23))).toBeTruthy();
    expect(result.residual.equals(1)).toBeTruthy();
    expect(result.cents).toBe(0);
  });

  it('can be converted to a fraction', () => {
    const monzo = new TimeMonzo(new Fraction(0), [
      new Fraction(-3),
      new Fraction(2),
    ]);
    expect(monzo.toFraction().equals(new Fraction(9, 8))).toBeTruthy();
  });
  it('can be converted to cents', () => {
    const monzo = new TimeMonzo(new Fraction(0), [new Fraction(1, 2)]);
    expect(monzo.toCents()).toBeCloseTo(600);
  });
  it('can be converted to n of edo', () => {
    const monzo = new TimeMonzo(new Fraction(0), [new Fraction(5, 12)]);
    const {fractionOfEquave, equave} = monzo.toEqualTemperament();
    expect(fractionOfEquave.equals(new Fraction(5, 12))).toBeTruthy();
    expect(equave.equals(2)).toBeTruthy();
  });
  it('can be converted to equal temperament', () => {
    const monzo = new TimeMonzo(new Fraction(0), [
      new Fraction(3),
      new Fraction(-3, 2),
    ]);
    const {fractionOfEquave, equave} = monzo.toEqualTemperament();
    expect(fractionOfEquave.equals(new Fraction(3, 2))).toBeTruthy();
    expect(equave.equals(new Fraction(4, 3))).toBeTruthy();
  });
  it('converts the zero monzo to unison in the degenerate equal temperament 1ed1', () => {
    const monzo = new TimeMonzo(new Fraction(0), []);
    const {fractionOfEquave, equave} = monzo.toEqualTemperament();
    expect(fractionOfEquave.equals(0)).toBeTruthy();
    expect(equave.equals(1)).toBeTruthy();
  });

  it('uses multiplication to add in pitch space (integers)', () => {
    const a = 15;
    const b = 123457;

    const aMonzo = TimeMonzo.fromFraction(a, 3);
    const bMonzo = TimeMonzo.fromFraction(b, 3);
    const aTimesBMonzo = TimeMonzo.fromFraction(a * b, 3);

    expect(aMonzo.mul(bMonzo).strictEquals(aTimesBMonzo)).toBeTruthy();
  });
  it('uses multiplication to add in pitch space (fractions)', () => {
    const a = new Fraction(5, 4);
    const b = new Fraction(16, 11);

    const aMonzo = TimeMonzo.fromFraction(a, 3);
    const bMonzo = TimeMonzo.fromFraction(b, 3);
    const aTimesBMonzo = TimeMonzo.fromFraction(a.mul(b), 3);

    expect(aMonzo.mul(bMonzo).strictEquals(aTimesBMonzo)).toBeTruthy();
  });
  it('converts division to subtract in pitch space', () => {
    const a = new Fraction(5, 4);
    const b = new Fraction(16, 11);

    const aMonzo = TimeMonzo.fromFraction(a, 3);
    const bMonzo = TimeMonzo.fromFraction(b, 3);
    const aDividedByBMonzo = TimeMonzo.fromFraction(a.div(b), 3);

    expect(aMonzo.div(bMonzo).strictEquals(aDividedByBMonzo)).toBeTruthy();
  });
  it('uses inversion to negate in pitch space', () => {
    const a = new Fraction(5, 4);

    const aMonzo = TimeMonzo.fromFraction(a, 3);
    const aInverseMonzo = TimeMonzo.fromFraction(a.inverse(), 3);

    expect(aMonzo.inverse().strictEquals(aInverseMonzo)).toBeTruthy();
  });
  it('converts exponentiation to scalar multiplication in pitch space', () => {
    const a = 15;
    const b = 5;

    const aMonzo = TimeMonzo.fromFraction(a, 2);
    const aToThePowerOfBMonzo = TimeMonzo.fromFraction(a ** b, 2);

    expect(aMonzo.pow(b).strictEquals(aToThePowerOfBMonzo)).toBeTruthy();
  });
  it('it implicitly converts unrepresentable exponentiation to cents', () => {
    const a = 6;
    const b = new Fraction(1, 2);

    const result = TimeMonzo.fromFraction(a, 1).pow(b);

    expect(result.primeExponents.length).toBe(1);
    expect(result.primeExponents[0].equals(new Fraction(1, 2))).toBeTruthy();
    expect(result.residual.equals(1)).toBeTruthy();
    expect(result.cents).toBeCloseTo(valueToCents(3 ** 0.5));
  });
  it('respects the ordering of rational numbers', () => {
    const majorThird = new Fraction(5, 4);
    const perfectFifth = new Fraction(3, 2);
    const octave = new Fraction(2);

    const intervals = [octave, perfectFifth, majorThird];
    const monzoIntervals = intervals.map(f => TimeMonzo.fromFraction(f, 3));
    intervals.sort((a, b) => a.compare(b));
    monzoIntervals.sort((a, b) => a.compare(b));
    intervals.forEach((f, i) => {
      expect(
        monzoIntervals[i].strictEquals(TimeMonzo.fromFraction(f, 3))
      ).toBeTruthy();
    });
  });
  it('supports taking the absolute value in pitch space', () => {
    const fourthUp = new TimeMonzo(new Fraction(0), [
      new Fraction(2),
      new Fraction(-1),
    ]);
    const fourthDown = new TimeMonzo(new Fraction(0), [
      new Fraction(-2),
      new Fraction(1),
    ]);
    expect(fourthDown.pitchAbs().strictEquals(fourthUp)).toBeTruthy();
  });
  it('supports octave reduction', () => {
    const fourthDown = new TimeMonzo(new Fraction(0), [
      new Fraction(-2),
      new Fraction(1),
    ]);
    const fifth = new TimeMonzo(new Fraction(0), [
      new Fraction(-1),
      new Fraction(1),
    ]);
    const tritave = new TimeMonzo(new Fraction(0), [
      new Fraction(0),
      new Fraction(1),
    ]);
    const octave = new TimeMonzo(new Fraction(0), [
      new Fraction(1),
      new Fraction(0),
    ]);
    expect(fourthDown.mmod(octave).strictEquals(fifth));
    expect(tritave.mmod(octave).strictEquals(fifth));
  });
  it('throws an error when trying to reduce by unison', () => {
    const unison = new TimeMonzo(new Fraction(0), [new Fraction(0)]);
    const octave = new TimeMonzo(new Fraction(0), [new Fraction(1)]);
    expect(() => octave.reduce(unison)).toThrow();
  });
  it('can be stretched', () => {
    const octave = new TimeMonzo(new Fraction(0), [new Fraction(1)]);
    expect(octave.stretch(1.01).toCents()).toBeCloseTo(1212);
  });
  it('can be approximated by a harmonic', () => {
    const majorSecond = TimeMonzo.fromEqualTemperament(
      new Fraction(2, 12),
      new Fraction(2),
      2
    );
    const justMajorSecond = majorSecond.approximateHarmonic(8);
    expect(
      justMajorSecond.toFraction().equals(new Fraction(9, 8))
    ).toBeTruthy();
  });
  it('can be approximated by a subharmonic', () => {
    const subfifth = TimeMonzo.fromEqualTemperament(
      new Fraction(6, 11),
      new Fraction(2),
      5
    );
    const undecimalSubfifth = subfifth.approximateSubharmonic(16);
    expect(
      undecimalSubfifth.toFraction().equals(new Fraction(16, 11))
    ).toBeTruthy();
  });
  it('can be approximated by its convergents', () => {
    const tritone = TimeMonzo.fromEqualTemperament(
      new Fraction(1, 2),
      new Fraction(2),
      1
    );
    expect(
      tritone.getConvergent(0).toFraction().equals(new Fraction(1))
    ).toBeTruthy();
    expect(
      tritone.getConvergent(1).toFraction().equals(new Fraction(3, 2))
    ).toBeTruthy();
    expect(
      tritone.getConvergent(2).toFraction().equals(new Fraction(7, 5))
    ).toBeTruthy();
    expect(
      tritone.getConvergent(3).toFraction().equals(new Fraction(17, 12))
    ).toBeTruthy();
  });

  it('can represent huge numbers', () => {
    const result = TimeMonzo.fromFraction(4522822787109375, 4);
    // Check that each prime exponent is less than 10.
    result.primeExponents.forEach(component => {
      expect(component.compare(10)).toBeLessThan(0);
    });
    expect(result.residual.equals(1)).toBeTruthy();
    expect(result.cents).toBe(0);
  });

  it('can represent even bigger numbers', () => {
    const result = TimeMonzo.fromBigInt(794280046581000000000n, 4);
    // Check that each prime exponent is less than 10.
    result.primeExponents.forEach(component => {
      expect(component.compare(10)).toBeLessThan(0);
    });
    expect(result.residual.equals(1)).toBeTruthy();
    expect(result.cents).toBe(0);
  });

  it('can combine equal temperament steps exactly', () => {
    const majorThirdOfTwelveEdo = new TimeMonzo(new Fraction(0), [
      new Fraction(4, 12),
    ]);
    const octave = majorThirdOfTwelveEdo
      .mul(majorThirdOfTwelveEdo)
      .mul(majorThirdOfTwelveEdo)
      .toFraction();
    expect(octave.equals(2)).toBeTruthy();
  });

  it('can be ambiquous in terms of total size', () => {
    const tritaveJI = new TimeMonzo(new Fraction(0), [
      new Fraction(0),
      new Fraction(1),
    ]);
    const tritaveCents = new TimeMonzo(
      new Fraction(0),
      [],
      undefined,
      valueToCents(3)
    );
    expect(tritaveJI.strictEquals(tritaveCents)).toBeFalsy();
    expect(tritaveJI.equals(tritaveCents)).toBeTruthy();
  });

  it("doesn't throw for zero (number)", () => {
    const zero = TimeMonzo.fromFraction(0, 1);
    expect(zero.primeExponents[0].equals(0)).toBeTruthy();
    expect(zero.residual.equals(0)).toBeTruthy();
    expect(zero.cents).toBe(0);
  });

  it('throws for zero (fraction)', () => {
    const zero = TimeMonzo.fromFraction(new Fraction(0), 1);
    expect(zero.primeExponents[0].equals(0)).toBeTruthy();
    expect(zero.residual.equals(0)).toBeTruthy();
    expect(zero.cents).toBe(0);
  });

  it('can be tested for being a power of two (residual)', () => {
    const eight = TimeMonzo.fromFraction(8, 0);
    expect(eight.isPowerOfTwo()).toBeTruthy();
    const six = TimeMonzo.fromFraction(6, 0);
    expect(six.isPowerOfTwo()).toBeFalsy();
  });

  it('can be tested for being a power of two (vector)', () => {
    const eight = TimeMonzo.fromFraction(8, 2);
    expect(eight.isPowerOfTwo()).toBeTruthy();
    const six = TimeMonzo.fromFraction(6, 2);
    expect(six.isPowerOfTwo()).toBeFalsy();
  });

  it('has a generic representation for linear quantities', () => {
    const value = new TimeMonzo(
      new Fraction(1, 2),
      [
        new Fraction(2),
        new Fraction(3, 2),
        new Fraction(0),
        new Fraction(-5, 3),
      ],
      new Fraction(-31, 23),
      -1.25
    );
    expect(value.toString()).toBe(
      '2^2*3^3/2*7^-5/3*-31/23*0.9992782322866353r*(1s)^1/2'
    );
  });

  it('has a generic representation for logarithmic quantities', () => {
    const value = new TimeMonzo(
      new Fraction(-3, 2),
      [new Fraction(3, 2), new Fraction(-5, 3)],
      new Fraction(31, 23),
      1.25
    );
    expect(value.toString('logarithmic')).toBe(
      '-3/2*logarithmic(1s)+[3/2 -5/3>+logarithmic(31/23)+1.25rc'
    );
  });

  it('has a generic representation for cologarithmic quantities', () => {
    const value = new TimeMonzo(
      new Fraction(-3, 2),
      [new Fraction(3, 2), new Fraction(-5, 3)],
      new Fraction(31, 23),
      2.25
    );
    expect(value.toString('cologarithmic')).toBe(
      '-3/2*cologarithmic(1s)+<3/2 -5/3]+cologarithmic(31/23)+2.25r€'
    );
  });

  it('tails residuals', () => {
    const value = new TimeMonzo(new Fraction(0), [], new Fraction(7, 6));
    expect(value.tail(2).toString()).toBe('7');
  });

  it('can be displayed as a fraction beyond safe limits', () => {
    const generator = TimeMonzo.fromFraction('3/2');
    const period = TimeMonzo.fromFraction('2/1');
    let accumulator = TimeMonzo.fromFraction('1/1');
    let n = 1n;
    let d = 1n;
    for (let i = 0; i < 50; ++i) {
      accumulator = accumulator.mul(generator).reduce(period);
      n *= 3n;
      while (n > 2n * d) {
        d *= 2n;
      }
      expect(accumulator.toString()).toBe(`${n}/${d}`);
    }
  });

  it('can be displayed as a radical expression beyond absurd limits', () => {
    const absurd = new TimeMonzo(new Fraction(0), [
      new Fraction(-15849),
      new Fraction(10000),
    ]);
    expect(absurd.toString()).toBe('2^-15849*3^10000');
  });

  it('survives repeated multiplication of higher primes', () => {
    let trouble = TimeMonzo.fromFraction('113/110');
    const cents = trouble.totalCents();
    trouble = trouble.mul(trouble);
    trouble = trouble.mul(trouble);
    trouble = trouble.mul(trouble);
    trouble = trouble.mul(trouble);
    expect(trouble.totalCents()).toBeCloseTo(cents * 16);
  });

  it('survives repeated division by higher primes', () => {
    let foo = TimeMonzo.fromFraction('3/2');
    const originalCents = foo.totalCents();
    const bar = TimeMonzo.fromFraction('103/101');
    const stepCents = bar.totalCents();
    for (let i = 0; i < 10; ++i) {
      foo = foo.div(bar);
    }
    expect(foo.totalCents()).toBeCloseTo(originalCents - 10 * stepCents);
  });

  it('survives multiplication by complex fractions of the octave', () => {
    const foo = new TimeMonzo(new Fraction(0), [
      new Fraction(23999993, 120000000),
    ]);
    expect(foo.mul(foo).toString('logarithmic')).toBe('23999993\\60000000');
  });
});
