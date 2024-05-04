import {describe, it, expect} from 'vitest';
import {Fraction} from 'xen-dev-utils';

import {TimeMonzo, TimeReal} from '../monzo';

describe('Real value with time', () => {
  it('can be constructed from cents', () => {
    const result = TimeReal.fromCents(1200);
    expect(result.timeExponent).toBe(0);
    expect(result.value).toBe(2);
  });

  it('can represent NaN', () => {
    const nan = TimeReal.fromValue(NaN);
    expect(nan.value).toBeNaN();
    expect(nan.toString()).toBe('NaN');
  });

  it('can represent Infinity', () => {
    const inf = TimeReal.fromValue(Infinity);
    expect(inf.value).toBe(Infinity);
    expect(inf.toString()).toBe('Infinity');
  });
});

describe('Extended monzo with time', () => {
  it('can be constructed from an integer', () => {
    const result = TimeMonzo.fromFraction(75, 3);
    expect(result.primeExponents.length).toBe(3);
    expect(result.primeExponents[0].equals(0)).toBeTruthy();
    expect(result.primeExponents[1].equals(1)).toBeTruthy();
    expect(result.primeExponents[2].equals(2)).toBeTruthy();
    expect(result.residual.equals(1)).toBeTruthy();
  });
  it('can be constructed from an integer with residual', () => {
    const result = TimeMonzo.fromFraction(75, 2);
    expect(result.primeExponents.length).toBe(2);
    expect(result.primeExponents[0].equals(0)).toBeTruthy();
    expect(result.primeExponents[1].equals(1)).toBeTruthy();
    expect(result.residual.equals(25)).toBeTruthy();
  });
  it('can be constructed from a fraction', () => {
    const result = TimeMonzo.fromFraction(new Fraction(3, 2), 2);
    expect(result.primeExponents.length).toBe(2);
    expect(result.primeExponents[0].equals(-1)).toBeTruthy();
    expect(result.primeExponents[1].equals(1)).toBeTruthy();
    expect(result.residual.equals(1)).toBeTruthy();
  });
  it('can be constructed from a fraction with residual', () => {
    const result = TimeMonzo.fromFraction(new Fraction(33, 28), 2);
    expect(result.primeExponents.length).toBe(2);
    expect(result.primeExponents[0].equals(-2)).toBeTruthy();
    expect(result.primeExponents[1].equals(1)).toBeTruthy();
    expect(result.residual.equals(new Fraction(11, 7))).toBeTruthy();
  });

  it('can be constructed from n of edo', () => {
    const fifthOfTwelveEdo = new Fraction(7, 12);
    const octave = new Fraction(2);
    const result = TimeMonzo.fromEqualTemperament(fifthOfTwelveEdo, octave, 2);
    expect(result.primeExponents.length).toBe(2);
    expect(result.primeExponents[0].equals(new Fraction(7, 12))).toBeTruthy();
    expect(result.primeExponents[1].equals(0)).toBeTruthy();
    expect(result.residual.equals(1)).toBeTruthy();
  });
  it('can be constructed from n of edo without default octave', () => {
    const flatFifth = new Fraction(13, 23);
    const result = TimeMonzo.fromEqualTemperament(flatFifth, undefined, 1);
    expect(result.primeExponents.length).toBe(1);
    expect(result.primeExponents[0].equals(new Fraction(13, 23))).toBeTruthy();
    expect(result.residual.equals(1)).toBeTruthy();
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
  it('it implicitly converts unrepresentable exponentiation to reals', () => {
    const a = 6;
    const b = new Fraction(1, 2);

    const result = TimeMonzo.fromFraction(a, 1).pow(b) as TimeReal;

    expect(result).toBeInstanceOf(TimeReal);

    expect(result.value).toBeCloseTo(6 ** 0.5);
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
  it('produces NaN from reduction by unison', () => {
    const unison = new TimeMonzo(new Fraction(0), [new Fraction(0)]);
    const octave = new TimeMonzo(new Fraction(0), [new Fraction(1)]);
    const uhOh = octave.reduce(unison);
    expect(uhOh.valueOf()).toBe(NaN);
  });
  it('can be stretched', () => {
    const octave = new TimeMonzo(new Fraction(0), [new Fraction(1)]);
    expect(octave.pow(1.01).toCents()).toBeCloseTo(1212);
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
  });

  it('can represent even bigger numbers', () => {
    const result = TimeMonzo.fromBigInt(794280046581000000000n, 4);
    // Check that each prime exponent is less than 10.
    result.primeExponents.forEach(component => {
      expect(component.compare(10)).toBeLessThan(0);
    });
    expect(result.residual.equals(1)).toBeTruthy();
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

  it('can be ambiquous in terms of total size compared to reals', () => {
    const octaveJI = new TimeMonzo(new Fraction(0), [new Fraction(1)]);
    const octaveReal = new TimeReal(0, 2);
    expect(octaveJI.strictEquals(octaveReal)).toBeFalsy();
    expect(octaveJI.equals(octaveReal)).toBeTruthy();
  });

  it("doesn't throw for zero (number)", () => {
    const zero = TimeMonzo.fromFraction(0, 1);
    expect(zero.primeExponents[0].equals(0)).toBeTruthy();
    expect(zero.residual.equals(0)).toBeTruthy();
  });

  it('throws for zero (fraction)', () => {
    const zero = TimeMonzo.fromFraction(new Fraction(0), 1);
    expect(zero.primeExponents[0].equals(0)).toBeTruthy();
    expect(zero.residual.equals(0)).toBeTruthy();
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
      new Fraction(-31, 23)
    );
    expect(value.toString()).toBe('2^2*3^3/2*7^-5/3*-31/23*(1s)^1/2');
  });

  it('has a generic representation for logarithmic quantities', () => {
    const value = new TimeMonzo(
      new Fraction(-3, 2),
      [new Fraction(3, 2), new Fraction(-5, 3)],
      new Fraction(31, 23)
    );
    expect(value.toString('logarithmic')).toBe('[-3/2 1 3/2 -5/3>@s.31/23.2..');
  });

  it('has a generic representation for cologarithmic quantities', () => {
    const value = new TimeMonzo(
      new Fraction(-3, 2),
      [new Fraction(3, 2), new Fraction(-5, 3)],
      new Fraction(31, 23)
    );
    // It should be impossible to produce this value for a val, but the expression should be meaningful.
    expect(value.toString('cologarithmic')).toBe(
      '<-3/2 1 3/2 -5/3]@s.31/23.2..'
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
      accumulator = accumulator.mul(generator).reduce(period) as TimeMonzo;
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
    let trouble: TimeMonzo | TimeReal = TimeMonzo.fromFraction('113/110');
    const cents = trouble.totalCents();
    trouble = trouble.mul(trouble);
    trouble = trouble.mul(trouble);
    trouble = trouble.mul(trouble);
    trouble = trouble.mul(trouble);
    expect(trouble.totalCents()).toBeCloseTo(cents * 16);
  });

  it('survives repeated division by higher primes', () => {
    let foo: TimeMonzo | TimeReal = TimeMonzo.fromFraction('3/2');
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

  it('has zero as the identity element for gcd', () => {
    const twelve = TimeMonzo.fromBigInt(0n).gcd(TimeMonzo.fromBigInt(12n));
    expect(twelve.toBigInteger()).toBe(12n);
  });

  it('can find all divisors of 360', () => {
    const babylon = TimeMonzo.fromFraction(360).divisors();
    expect(babylon).toEqual([
      1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72,
      90, 120, 180, 360,
    ]);
  });

  it('can calculate the dot product between syntonic and porcupine commas (prime exponents)', () => {
    const neg27 = TimeMonzo.fromFraction('81/80').dot(
      TimeMonzo.fromFraction('250/243')
    );
    expect(neg27.toFraction()).toBe('-27');
  });

  it('can calculate the dot product between syntonic and porcupine commas (residuals)', () => {
    const neg27 = new TimeMonzo(new Fraction(0), [], new Fraction('81/80')).dot(
      new TimeMonzo(new Fraction(0), [], new Fraction('250/243'))
    );
    expect(neg27.toFraction()).toBe('-27');
  });

  it('can calculate the dot product between syntonic and porcupine commas (mixed)', () => {
    const neg27 = new TimeMonzo(
      new Fraction(0),
      [new Fraction(-4)],
      new Fraction('81/5')
    ).dot(
      new TimeMonzo(new Fraction(0), [new Fraction(1)], new Fraction('125/243'))
    );
    expect(neg27.toFraction()).toBe('-27');
  });
});

describe('JSON serialization', () => {
  it('can serialize an array of primitives, fractions and monzos', () => {
    const data = [
      'Hello, world!',
      new Fraction(10, 7),
      new TimeReal(-1, 777),
      3.5,
      TimeMonzo.fromFraction('81/80'),
    ];
    const serialized = JSON.stringify(data);
    expect(serialized).toBe(
      '["Hello, world!",{"n":10,"d":7},{"type":"TimeReal","timeExponent":-1,"value":777},3.5,{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":-4,"d":1},{"n":4,"d":1},{"n":-1,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}}]'
    );
  });

  it('can deserialize an array of primitives, fractions and monzos', () => {
    const serialized =
      '["Hello, world!",{"n":10,"d":7},{"type":"TimeReal","timeExponent":-1,"value":777},3.5,{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":-4,"d":1},{"n":4,"d":1},{"n":-1,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}}]';
    function reviver(key: string, value: any) {
      return TimeMonzo.reviver(
        key,
        TimeReal.reviver(key, Fraction.reviver(key, value))
      );
    }
    const data = JSON.parse(serialized, reviver);
    expect(data).toHaveLength(5);

    expect(data[0]).toBe('Hello, world!');

    expect(data[1]).toBeInstanceOf(Fraction);
    expect(data[1].equals('10/7')).toBe(true);

    expect(data[2]).toBeInstanceOf(TimeReal);
    expect(data[2].timeExponent).toBe(-1);
    expect(data[2].value).toBe(777);

    expect(data[3]).toBe(3.5);

    expect(data[4]).toBeInstanceOf(TimeMonzo);
    expect(data[4].toFraction().toFraction()).toBe('81/80');
  });
});
