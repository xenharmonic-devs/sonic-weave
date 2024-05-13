import {describe, it, expect} from 'vitest';
import {TimeMonzo, TimeReal} from '../monzo';
import {Interval, intervalValueAs} from '../interval';
import {FractionLiteral, NedjiLiteral} from '../expression';
import {sw} from '../parser';

describe('Idempontent formatting', () => {
  it('has stable ratios (common factor)', () => {
    const sixOverFour = TimeMonzo.fromFraction('6/4', 2);
    const node = intervalValueAs(sixOverFour, {
      type: 'FractionLiteral',
      numerator: 6n,
      denominator: 4n,
    }) as FractionLiteral;
    expect(node.numerator).toBe(6n);
    expect(node.denominator).toBe(4n);
  });

  it('has stable ratios (denominator)', () => {
    const fourOverThree = TimeMonzo.fromFraction('4/3', 2);
    const node = intervalValueAs(fourOverThree, {
      type: 'FractionLiteral',
      numerator: 1n,
      denominator: 6n,
    }) as FractionLiteral;
    expect(node.numerator).toBe(8n);
    expect(node.denominator).toBe(6n);
    const iterated = intervalValueAs(fourOverThree, node) as FractionLiteral;
    expect(iterated.numerator).toBe(8n);
    expect(iterated.denominator).toBe(6n);
  });

  it('has stable equal temperament', () => {
    const majorThird = TimeMonzo.fromEqualTemperament('4/12');
    const node = intervalValueAs(majorThird, {
      type: 'NedjiLiteral',
      numerator: 4,
      denominator: 12,
      equaveNumerator: null,
      equaveDenominator: null,
    }) as NedjiLiteral;
    expect(node.numerator).toBe(4);
    expect(node.denominator).toBe(12);
  });
});

describe('Interchange format', () => {
  it('uses plain monzos up to 23-limit', () => {
    const interval = new Interval(TimeMonzo.fromFraction('23/16'), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[-4 0 0 0 0 0 0 0 1>');
  });

  it('uses plain monzos up to 23-limit (poor internal value)', () => {
    const interval = new Interval(TimeMonzo.fromFraction('5/4', 2), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[-2 0 1>');
  });

  it('switches to subgroup monzos for 29-limit', () => {
    const interval = new Interval(
      TimeMonzo.fromFraction('29/16', 20),
      'logarithmic'
    );
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[-4 1>@2.29');
  });

  it('uses explicit basis with the absolute echelon', () => {
    const interval = new Interval(
      TimeMonzo.fromFractionalFrequency(440),
      'linear'
    );
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[1 3 1 1>@Hz.2.5.11');
  });

  it('uses explicit basis with steps', () => {
    const interval = new Interval(
      TimeMonzo.fromFraction('5/3'),
      'logarithmic',
      -3
    );
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[-3 -1 1>@1°.3.5');
  });

  it('uses increasing non-fractional basis', () => {
    const interval = new Interval(TimeMonzo.fromFraction('103/101'), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[-1 1>@101.103');
  });

  it('has an expression for rational unity', () => {
    const interval = new Interval(TimeMonzo.fromFraction(1), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[>');
  });

  it('has an expression for rational zero', () => {
    const interval = new Interval(TimeMonzo.fromFraction(0), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[1>@0');
  });

  it('has an expression for rational -2', () => {
    const interval = new Interval(TimeMonzo.fromFraction(-2), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[1 1>@-1.2');
  });

  it('has an expression for real unity', () => {
    const interval = new Interval(TimeReal.fromValue(1), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[0.>@rc');
  });

  it('has an expression for real zero', () => {
    const interval = new Interval(TimeReal.fromValue(0), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[1 0.>@0.rc');
  });

  it('has an expression for real -2', () => {
    const interval = new Interval(TimeReal.fromValue(-2), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[1 1200.>@-1.rc');
  });

  it('has an expression for real 256Hz', () => {
    const interval = new Interval(TimeReal.fromFrequency(256), 'linear');
    interval.node = interval.asMonzoLiteral(true);
    expect(interval.toString()).toBe('[1. 9600.>@Hz.rc');
  });
});

const SERIALIZED =
  '["hello",{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":2,"d":1},{"n":1,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}},"domain":"linear","steps":0,"label":"","node":{"type":"IntegerLiteral","value":"12"},"trackingIds":[]},12,{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":1,"d":1},{"n":1,"d":1},{"n":-1,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}},"domain":"linear","steps":0,"label":"","node":{"type":"DecimalLiteral","sign":"","whole":"1","fractional":"2","exponent":null,"flavor":"e"},"trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":0,"d":1},{"n":-1,"d":1},{"n":1,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}},"domain":"linear","steps":0,"label":"","node":{"type":"FractionLiteral","numerator":"5","denominator":"3"},"trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":1,"d":3},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}},"domain":"linear","steps":0,"label":"","node":{"type":"RadicalLiteral","argument":{"n":2,"d":1},"exponent":{"n":1,"d":3}},"trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":46797,"d":80000}],"residual":{"n":1,"d":1}},"domain":"logarithmic","steps":0,"label":"","node":{"type":"CentsLiteral","sign":"","whole":"701","fractional":"955","exponent":null,"real":false},"trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":-4,"d":1},{"n":4,"d":1},{"n":-1,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}},"domain":"logarithmic","steps":0,"label":"","node":{"type":"SquareSuperparticular","start":"9","end":null},"trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[],"residual":{"n":1,"d":1}},"domain":"logarithmic","steps":3,"label":"","node":{"type":"StepLiteral","count":3},"trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":0,"d":1},{"n":6,"d":13},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}},"domain":"logarithmic","steps":0,"label":"","node":{"type":"NedjiLiteral","numerator":6,"denominator":13,"equaveNumerator":3,"equaveDenominator":null},"trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":-2,"d":1},{"n":0,"d":1},{"n":1,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}},"domain":"logarithmic","steps":0,"label":"","node":{"ups":0,"lifts":0,"type":"FJS","pythagorean":{"type":"Pythagorean","quality":{"fraction":"","quality":"M"},"degree":{"negative":false,"base":3,"octaves":0,"imperfect":true}},"superscripts":[[5,""]],"subscripts":[]},"trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":1,"d":1},{"n":-2,"d":1},{"n":0,"d":1},{"n":1,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}},"domain":"logarithmic","steps":0,"label":"","node":{"ups":0,"lifts":0,"type":"AbsoluteFJS","pitch":{"type":"AbsolutePitch","nominal":"A","accidentals":[{"fraction":"","accidental":"b"}],"octave":4},"superscripts":[[7,""]],"subscripts":[]},"trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":-1,"d":1},"primeExponents":[{"n":0,"d":1},{"n":1,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":37,"d":1}},"domain":"linear","steps":0,"label":"","trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":1,"d":1},"primeExponents":[{"n":-3,"d":1},{"n":1,"d":1},{"n":-3,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1},{"n":0,"d":1}],"residual":{"n":1,"d":1}},"domain":"linear","steps":0,"label":"","trackingIds":[]},{"type":"Interval","value":{"type":"TimeMonzo","timeExponent":{"n":0,"d":1},"primeExponents":[{"n":-3,"d":1},{"n":1,"d":1},{"n":1,"d":1}],"residual":{"n":1,"d":1}},"domain":"logarithmic","steps":0,"label":"","node":{"ups":0,"lifts":0,"type":"MonzoLiteral","components":[{"sign":"-","left":3,"separator":"","right":"","exponent":null},{"sign":"","left":1,"separator":"","right":"","exponent":null},{"sign":"","left":1,"separator":"","right":"","exponent":null}],"basis":[]},"trackingIds":[]}]';

describe('Interval JSON serialization', () => {
  it('can be serialized alongside other data', () => {
    const data: any = [
      'hello',
      sw`12`,
      12,
      sw`1.2e`,
      sw`5/3`,
      sw`radical(2 /^ 3)`,
      sw`701.955`,
      sw`S9`,
      sw`3°`,
      sw`6\\13<3>`,
      sw`M3^5`,
      sw`Ab4^7`,
      sw`111 Hz`,
      sw`3ms`,
      sw`[-3 1 1>`,
    ];
    const serialized = JSON.stringify(data);
    expect(serialized).toBe(SERIALIZED);
  });

  it('can be deserialized alongside other data', () => {
    const data = JSON.parse(SERIALIZED, Interval.reviver);
    expect(data).toHaveLength(15);
    expect(data[0]).toBe('hello');
    expect(data[2]).toBe(12);
    expect(data.map(datum => datum.toString())).toEqual([
      'hello',
      '12',
      '12',
      '1.2e',
      '5/3',
      '2^1/3',
      '701.955',
      'S9',
      '3°',
      '6\\13<3>',
      'M3^5',
      'Ab4^7',
      '111 Hz',
      '2^-3*3*5^-3*(1s)^1',
      '[-3 1 1>',
    ]);

    expect(data.map(datum => datum.valueOf())).toEqual([
      'hello',
      12,
      12,
      1.2,
      1.666666666666667,
      1.2599210498948732,
      1.499999999250199,
      1.0124999999999997,
      1,
      1.6603888560010867,
      1.25,
      1.5555555555555558,
      111,
      0.003,
      1.875,
    ]);
  });
});
