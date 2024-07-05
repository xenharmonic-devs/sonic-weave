import {describe, it, expect} from 'vitest';
import {TimeMonzo, TimeReal} from '../monzo';
import {
  Interval,
  Temperament,
  Val,
  ValBasis,
  intervalValueAs,
} from '../interval';
import {FractionLiteral, NedjiLiteral} from '../expression';
import {sw} from '../parser';
import {dot} from 'xen-dev-utils';

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
    expect(interval.toString()).toBe('[-1>@inf');
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
  '["hello",{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[2,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":1,"d":1}},"d":0,"s":0,"l":"","n":{"type":"i","v":"12"},"t":[]},12,{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[1,1,1,1,-1,1,0,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":1,"d":1}},"d":0,"s":0,"l":"","n":{"type":"DecimalLiteral","sign":"","whole":"1","fractional":"2","exponent":null,"flavor":"e"},"t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[0,1,-1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":1,"d":1}},"d":0,"s":0,"l":"","n":{"type":"f","n":"5","d":"3"},"t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[1,3,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":1,"d":1}},"d":0,"s":0,"l":"","n":{"type":"RadicalLiteral","argument":{"n":2,"d":1},"exponent":{"n":1,"d":3}},"t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[46797,80000],"r":{"n":1,"d":1}},"d":1,"s":0,"l":"","n":{"type":"c","s":"","w":"701","f":"955","e":null,"r":false},"t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[-4,1,4,1,-1,1,0,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":1,"d":1}},"d":1,"s":0,"l":"","n":{"type":"SquareSuperparticular","start":"9","end":null},"t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[],"r":{"n":1,"d":1}},"d":1,"s":3,"l":"","n":{"type":"StepLiteral","count":3},"t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[0,1,6,13,0,1,0,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":1,"d":1}},"d":1,"s":0,"l":"","n":{"type":"n","n":6,"d":13,"p":3,"q":null},"t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[-2,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":1,"d":1}},"d":1,"s":0,"l":"","n":{"ups":0,"lifts":0,"type":"FJS","pythagorean":{"type":"Pythagorean","quality":{"fraction":"","quality":"M"},"degree":{"negative":false,"base":3,"octaves":0,"imperfect":true}},"superscripts":[[5,""]],"subscripts":[]},"t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[1,1,-2,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":1,"d":1}},"d":1,"s":0,"l":"","n":{"ups":0,"lifts":0,"type":"AbsoluteFJS","pitch":{"type":"AbsolutePitch","nominal":"A","accidentals":[{"fraction":"","accidental":"b"}],"octave":4},"superscripts":[[7,""]],"subscripts":[]},"t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":-1,"d":1},"p":[0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":37,"d":1}},"d":0,"s":0,"l":"","t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":1,"d":1},"p":[-3,1,1,1,-3,1,0,1,0,1,0,1,0,1,0,1,0,1],"r":{"n":1,"d":1}},"d":0,"s":0,"l":"","t":[]},{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[-3,1,1,1,1,1],"r":{"n":1,"d":1}},"d":1,"s":0,"l":"","n":{"ups":0,"lifts":0,"type":"MonzoLiteral","components":[{"sign":"-","left":3,"separator":"","right":"","exponent":null},{"sign":"","left":1,"separator":"","right":"","exponent":null},{"sign":"","left":1,"separator":"","right":"","exponent":null}],"basis":[]},"t":[]}]';

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

describe('(Val) subgroup basis', () => {
  it('has an orthogonalized state', () => {
    const basis = new ValBasis([
      TimeMonzo.fromArray([1, -1, 3]),
      TimeMonzo.fromArray([1, 0, 5]),
      TimeMonzo.fromArray([1, 2, 6]),
    ]);
    expect(
      basis.ortho.map(m => m.primeExponents.map(c => c.toFraction()))
    ).toEqual([
      ['1', '-1', '3'],
      ['-5/11', '16/11', '7/11'],
      ['1/2', '1/5', '-1/10'],
    ]);
    expect(basis.ortho[0].dot(basis.ortho[1]).n).toBe(0);
    expect(basis.ortho[0].dot(basis.ortho[2]).n).toBe(0);
    expect(basis.ortho[1].dot(basis.ortho[2]).n).toBe(0);
  });

  it('can fix subgroup maps to the standard basis', () => {
    const basis = new ValBasis([
      TimeMonzo.fromFraction('3/2'),
      TimeMonzo.fromFraction('10/9'),
      TimeMonzo.fromFraction('7/5'),
    ]);
    const map = [700, 200, 600];
    const fixed = basis.standardFix(map);
    expect(dot(basis.value[0].toIntegerMonzo(), fixed)).toBeCloseTo(700);
    expect(dot(basis.value[1].toIntegerMonzo(), fixed)).toBeCloseTo(200);
    expect(dot(basis.value[2].toIntegerMonzo(), fixed)).toBeCloseTo(600);
  });
});

describe('Temperament', () => {
  it('constructs septimal magic from commas', () => {
    const temperament = Temperament.fromCommas([
      TimeMonzo.fromFraction('225/224'),
      TimeMonzo.fromFraction('245/243'),
    ]);
    expect(temperament.canonicalMapping).toEqual([
      [1, 0, 2, -1],
      [0, 5, 1, 12],
    ]);
  });

  it('constructs septimal magic from vals', () => {
    const temperament = Temperament.fromVals([
      Val.fromArray([19, 30, 44, 53]),
      Val.fromArray([22, 35, 51, 62]),
    ]);
    expect(temperament.canonicalMapping).toEqual([
      [1, 0, 2, -1],
      [0, 5, 1, 12],
    ]);
  });

  it('obtains the commas of septimal magic', () => {
    const temperament = new Temperament([
      [1, 0, 2, -1],
      [0, 5, 1, 12],
    ]);
    expect(temperament.commaBasis.toString()).toBe('@225/224.245/243');
  });

  it('obtains the generators of septimal magic', () => {
    const temperament = new Temperament([
      [1, 0, 2, -1],
      [0, 5, 1, 12],
    ]);
    expect(temperament.preimage.toString()).toBe('@2.5/4');
  });

  it('respells square roots away', () => {
    const temperament = Temperament.fromCommas([
      TimeMonzo.fromFraction('65536/65219'),
    ]);
    expect(temperament.basis.toString()).toBe('@2.7.11');
    const sharpMinorThird = TimeMonzo.fromEqualTemperament('1/2', '16/11');
    const respelled = temperament.respell(sharpMinorThird);
    expect(respelled.toString()).toBe('77/64');
  });

  it('construct 5-limit JI (vals)', () => {
    const ji5 = Temperament.fromVals([
      Val.fromArray([2, 3, 5]),
      Val.fromArray([3, 5, 7]),
      Val.fromArray([4, 6, 9]),
    ]);
    expect(ji5.canonicalMapping).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it('construct 5-limit JI (commas)', () => {
    const ji5 = Temperament.fromCommas([], new ValBasis(3));
    expect(ji5.canonicalMapping).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it('rejects the trivial temperament (vals)', () => {
    expect(() => Temperament.fromVals([Val.fromArray([0, 0, 0])])).toThrow(
      'Constructing the trivial temperament is not supported.'
    );
  });

  it('rejects the trivial temperament (commas)', () => {
    expect(() =>
      Temperament.fromCommas([
        TimeMonzo.fromFraction('9/8'),
        TimeMonzo.fromFraction('256/243'),
      ])
    ).toThrow('Constructing the trivial temperament is not supported.');
  });

  it('canonizes mirkwai to positive preimage', () => {
    const mirkwai = Temperament.fromCommas(
      [TimeMonzo.fromFraction('16875/16807')],
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    expect(mirkwai.canonicalMapping).toEqual([
      [1, 0, 0, 0],
      [0, 1, 3, 3],
      [-0, -0, -5, -4],
    ]);
    expect(mirkwai.preimage.toString()).toEqual('@2.3.7/5');
    expect(mirkwai.generators.map(g => g.toFixed(3))).toEqual([
      '1200.000',
      '1901.783',
      '583.905',
    ]);
  });
});
