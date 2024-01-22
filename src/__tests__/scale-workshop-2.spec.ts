import {describe, it, expect} from 'vitest';

import {parseScaleWorkshop2Line} from '../scale-workshop-2-parser';
import {TimeMonzo} from '../monzo';
import {Fraction} from 'xen-dev-utils';
import {Interval} from '../interval';

const DEFAULT_NUMBER_OF_COMPONENTS = 25;

function parseLine(input: string) {
  return parseScaleWorkshop2Line(input, DEFAULT_NUMBER_OF_COMPONENTS);
}

describe('Line parser', () => {
  it("doesn't parse bare numbers", () => {
    expect(() => parseLine('42')).toThrow();
  });

  it('parses negative fractions and interpretes them as inverses', () => {
    const result = parseLine('-1/2');
    expect(
      result.equals(
        new Interval(
          TimeMonzo.fromFraction(new Fraction(2), DEFAULT_NUMBER_OF_COMPONENTS),
          'linear'
        )
      )
    ).toBeTruthy();
  });

  it("doesn't parse negative fractions with universal minus disabled", () => {
    expect(() =>
      parseScaleWorkshop2Line(
        '-1/2',
        DEFAULT_NUMBER_OF_COMPONENTS,
        undefined,
        false
      )
    ).toThrow();
  });

  it('does parse fractions with universal minus disabled', () => {
    const result = parseScaleWorkshop2Line(
      '3/2',
      DEFAULT_NUMBER_OF_COMPONENTS,
      undefined,
      false
    );
    expect(
      result.equals(
        new Interval(
          TimeMonzo.fromFraction(
            new Fraction(3, 2),
            DEFAULT_NUMBER_OF_COMPONENTS
          ),
          'linear'
        )
      )
    ).toBeTruthy();
  });

  it('does parse negative cents even with minus disabled for other types', () => {
    const result = parseScaleWorkshop2Line(
      '-1.23',
      DEFAULT_NUMBER_OF_COMPONENTS,
      undefined,
      false
    );
    expect(result.value.totalCents()).toBeCloseTo(-1.23);
  });

  it('rejects fractions without a numerator', () => {
    expect(() => parseLine('/5')).toThrow();
  });

  it('parses N-of-EDO (negative)', () => {
    const result = parseLine('-2\\5');
    expect(
      result.equals(
        new Interval(
          TimeMonzo.fromEqualTemperament(
            new Fraction(-2, 5),
            new Fraction(2),
            DEFAULT_NUMBER_OF_COMPONENTS
          ),
          'logarithmic'
        )
      )
    ).toBeTruthy();
  });

  it('parses N-of-EDO (negative EDO)', () => {
    const result = parseLine('2\\-5');
    expect(
      result.equals(
        new Interval(
          TimeMonzo.fromEqualTemperament(
            new Fraction(2, 5),
            new Fraction(1, 2),
            DEFAULT_NUMBER_OF_COMPONENTS
          ),
          'logarithmic'
        )
      )
    ).toBeTruthy();
  });

  it('parses generalized N-of-EDO (fraction equave)', () => {
    const result = parseLine('5\\11<7/3>');
    expect(
      result.equals(
        new Interval(
          TimeMonzo.fromEqualTemperament(
            new Fraction(5, 11),
            new Fraction(7, 3),
            DEFAULT_NUMBER_OF_COMPONENTS
          ),
          'logarithmic'
        )
      )
    ).toBeTruthy();
  });

  it('parses generalized N-of-EDO (integer equave)', () => {
    const result = parseLine('-7\\13<5>');
    expect(
      result.equals(
        new Interval(
          TimeMonzo.fromEqualTemperament(
            new Fraction(-7, 13),
            new Fraction(5),
            DEFAULT_NUMBER_OF_COMPONENTS
          ),
          'logarithmic'
        )
      )
    ).toBeTruthy();
  });

  it('accepts N-of-EDO without a numerator', () => {
    const result = parseLine('\\8');
    expect(
      result.equals(
        new Interval(
          TimeMonzo.fromEqualTemperament(0, 2, DEFAULT_NUMBER_OF_COMPONENTS),
          'logarithmic'
        )
      )
    ).toBeTruthy();
  });

  it('parses monzos', () => {
    const result = parseLine('[-1, 2, 3/2, 0>');
    const components = [new Fraction(-1), new Fraction(2), new Fraction(3, 2)];
    while (components.length < DEFAULT_NUMBER_OF_COMPONENTS) {
      components.push(new Fraction(0));
    }
    expect(
      result.equals(
        new Interval(new TimeMonzo(new Fraction(0), components), 'logarithmic')
      )
    ).toBeTruthy();
  });

  it('parses ambiguous composites (unary minus vs. negative offset)', () => {
    const result = parseLine('3/1 + [-1>');
    expect(
      result.equals(
        new Interval(
          TimeMonzo.fromFraction(
            new Fraction(3, 2),
            DEFAULT_NUMBER_OF_COMPONENTS
          ),
          'logarithmic'
        )
      )
    ).toBeTruthy();
  });

  it('parses composites (any)', () => {
    const result = parseLine('3\\15 + 103/101 + 6.9');
    const vector = Array(DEFAULT_NUMBER_OF_COMPONENTS).fill(new Fraction(0));
    vector[0] = new Fraction(3, 15);
    expect(
      result.equals(
        new Interval(
          new TimeMonzo(new Fraction(0), vector, new Fraction(103, 101), 6.9),
          'logarithmic'
        )
      )
    ).toBeTruthy();
  });

  it('optionally admits bare numbers', () => {
    const ratio = parseScaleWorkshop2Line(
      '3',
      DEFAULT_NUMBER_OF_COMPONENTS,
      true
    );
    expect(ratio.valueOf()).toBe(3);
  });

  it('supports omitting leading zeros', () => {
    const quarterCents = parseLine('.25');
    const half = parseLine(',5');
    expect(quarterCents.value.totalCents()).toBe(0.25);
    expect(half.valueOf()).toBeCloseTo(0.5);
  });

  it('supports omitting trailing zeros', () => {
    const cent = parseLine('1.');
    const two = parseLine('2,');
    expect(cent.value.totalCents()).toBe(1);
    expect(two.valueOf()).toBeCloseTo(2);
  });

  it('supports completely omitted zeros', () => {
    const noCents = parseLine('.');
    const zero = parseLine(',');
    expect(noCents.value.totalCents()).toBe(0);
    expect(zero.valueOf()).toBe(0);
  });
});

describe('Line parser formatting', () => {
  it('preserves fractions', () => {
    expect(parseLine('6/4').toString()).toBe('6/4');
  });

  it('preserves N-of-EDO', () => {
    expect(parseLine('4\\12').toString()).toBe('4\\12');
  });

  it('adds flavor to comma-decimals', () => {
    expect(parseLine('1,23').toString()).toBe('1.23e');
  });

  it('produces octave-related cents', () => {
    expect(parseLine('1.23').toString()).toBe('1.23');
  });

  it('inflects linearly', () => {
    expect(parseLine('10/9 + 81/80').toString()).toBe('9/8');
  });

  it('inflects logarithmically', () => {
    expect(parseLine('7\\12 - 1\\5').toString()).toBe('23\\60');
  });
});
