import {describe, it, expect} from 'vitest';
import {evaluateExpression} from '..';
import {Color, Interval, Val} from '../../interval';
import {TimeMonzo, TimeReal} from '../../monzo';

function parseSingle(source: string) {
  const interval = evaluateExpression(source, false);
  expect(interval).toBeInstanceOf(Interval);
  if (interval instanceof Interval) {
    expect(interval.value).toBeInstanceOf(TimeMonzo);
    if (interval.value instanceof TimeMonzo) {
      let fraction: undefined | string = undefined;
      if (interval.value.isFractional()) {
        try {
          fraction = interval.value.toFraction().toFraction();
        } catch {
          /** empty */
        }
      }
      return {interval, value: interval.value, fraction};
    }
  }
  throw new Error('Unreachable.');
}

function evaluate(source: string) {
  return evaluateExpression(source, false);
}

describe('SonicWeave expression evaluator', () => {
  it('evaluates a single number', () => {
    const value = parseSingle('3');
    expect(value.value.toBigInteger()).toBe(3n);
  });

  it('evaluates negative unity', () => {
    const value = parseSingle('-1');
    expect(value.value.toBigInteger()).toBe(-1n);
  });

  it('evaluates positive unity', () => {
    const value = parseSingle('+1');
    expect(value.value.toBigInteger()).toBe(1n);
  });

  it('adds two nedos with denominator preference', () => {
    const {interval} = parseSingle('4\\12 + 2\\12');
    expect(interval.toString()).toBe('6\\12');
  });

  it('adds a number to nedo (left preference)', () => {
    const {interval} = parseSingle('2 ~+ 3\\3');
    expect(interval.toString()).toBe('4');
  });

  it('adds a number to nedo (right preference)', () => {
    const {interval} = parseSingle('2 +~ 3\\3');
    expect(interval.toString()).toBe('6\\3');
  });

  it('adds a number to nedo (impossible right preference)', () => {
    const {interval} = parseSingle('1 +~ 3\\3');
    expect(interval.toString()).toBe('1\\1<3>');
  });

  it('accesses variables', () => {
    const interval = evaluate('TAU') as Interval;
    expect(interval.toString()).toBe('6.283185307179586r');
  });

  it('evaluates a color', () => {
    const purple = evaluate('#dc12ab');
    expect(purple).instanceOf(Color);
    expect((purple as Color).value).toBe('#dc12ab');
  });

  it('adds hertz', () => {
    const {interval} = parseSingle('69 mHz + 420 Hz + 9 kHz');
    expect(interval.toString()).toBe('9420.069 Hz');
  });

  it('subtracts cents', () => {
    const {interval} = parseSingle('1.955 - 1c');
    expect(interval.totalCents()).toBeCloseTo(0.955);
  });

  it('supports pythagorean relative notation', () => {
    const {interval, fraction} = parseSingle('M6');
    expect(fraction).toBe('27/16');
    expect(interval.toString()).toBe('M6');
  });

  it('supports neutral intervals', () => {
    const halfFifth = parseSingle('n3');
    expect(halfFifth.value.valueOf()).toBeCloseTo(Math.sqrt(1.5));
  });

  it('supports quarter-augmented intervals', () => {
    const fourthFifth = parseSingle('sM2');
    expect(fourthFifth.value.valueOf()).toBeCloseTo(1.5 ** 0.25);
  });

  it('supports tone-splitter interordinals', () => {
    const splitTone = parseSingle('P1.5');
    expect(splitTone.value.valueOf()).toBeCloseTo(Math.sqrt(9 / 8));
  });

  it('supports semiquartal interordinals', () => {
    const semifourth = parseSingle('n2.5');
    expect(semifourth.value.valueOf()).toBeCloseTo(Math.sqrt(4 / 3));
  });

  it("has mid from ups-and-downs but it's spelled 'n' and mixes with NFJS", () => {
    const undecimalMidFourth = parseSingle('n4^11n');
    expect(undecimalMidFourth.value.toFraction().toFraction()).toBe('11/8');
    const undecimalMidFifth = parseSingle('n5_11n');
    expect(undecimalMidFifth.value.toFraction().toFraction()).toBe('16/11');
  });

  it("doesn't have '~8' like ups-and-downs doesn't", () => {
    expect(() => parseSingle('n8')).toThrow();
  });

  it('parses monzos', () => {
    const {interval, value} = parseSingle('[+7, 11e-1, 1.4>');
    expect(interval.domain).toBe('logarithmic');
    const pe = value.primeExponents;
    expect(pe[0].toFraction()).toBe('7');
    expect(pe[1].toFraction()).toBe('11/10');
    expect(pe[2].toFraction()).toBe('7/5');
    expect(interval.toString()).toBe('[7 11e-1 1.4>');
  });

  it('parses vals', () => {
    const val = evaluate('<5/3 , -1.001e1]') as Val;
    expect(val.domain).toBe('cologarithmic');
    const pe = val.value.primeExponents;
    expect(pe[0].toFraction()).toBe('5/3');
    expect(pe[1].toFraction()).toBe('-1001/100');
    expect(val.toString()).toBe('<5/3 -1.001e1]');
  });

  it('has reversed ranges', () => {
    const scale = evaluate('[5, 4..1]');
    expect(Array.isArray(scale)).toBe(true);
    expect(scale).toHaveLength(5);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '5;4;3;2;1'
    );
  });

  it('has a reciprocal cent', () => {
    const {interval} = parseSingle('€ dot 1c');
    expect(interval.toString()).toBe('1');
  });

  it('supports relative FJS', () => {
    const {interval, fraction} = parseSingle('M3^5');
    expect(fraction).toBe('5/4');
    expect(interval.toString()).toBe('M3^5');
  });

  it('supports neutral FJS', () => {
    const {interval, fraction} = parseSingle('n6_11n');
    expect(fraction).toBe('18/11');
    expect(interval.toString()).toBe('n6_11n');
  });

  it('has access to NFJS accidentals on rationals (relative)', () => {
    const flatFifth = parseSingle('P5^121n');
    expect(flatFifth.value.toFraction().toFraction()).toBe('121/81');
  });

  it('has access to NFJS accidentals on rationals (absolute)', () => {
    const flatFifth = parseSingle('G4_11n,11n');
    expect(flatFifth.value.toFraction().toFraction()).toBe('729/484');
  });

  it('can convert time to frequency', () => {
    const freq = parseSingle('absolute(2 ms)');
    expect(freq.value.valueOf()).toBe(500);
  });

  it('parses the cursed tritone', () => {
    const {interval, fraction} = parseSingle('14E-1');
    expect(fraction).toBe('7/5');
    expect(interval.toString()).toBe('14e-1');
  });

  it('parses nedji', () => {
    const {interval, value} = parseSingle('7\\5<4/3>');
    const {fractionOfEquave, equave} = value.toEqualTemperament();
    expect(fractionOfEquave.toFraction()).toBe('7/5');
    expect(equave.toFraction()).toBe('4/3');
    expect(interval.toString()).toBe('7\\5<4/3>');
  });

  it('can color and label an interval directly', () => {
    const {interval} = parseSingle('1.5e0 green "fifth"');
    expect(interval.color?.value).toBe('green');
    expect(interval.label).toBe('fifth');
  });

  it('can convert FJS to monzo', () => {
    const {interval} = parseSingle('monzo(vm6_5)');
    expect(interval.toString()).toBe('[-1 3 0 -1>@1°.2..');
  });

  it('can convert zero to subgroup monzo', () => {
    const {interval} = parseSingle('monzo(0)');
    expect(interval.toString()).toBe('[1>@0');
  });

  it('can parse the monzo representation of zero', () => {
    const {interval} = parseSingle('[1>@0');
    expect(interval.valueOf()).toBe(0);
  });

  it('can convert negative twelve to subgroup monzo', () => {
    const {interval} = parseSingle('monzo(-12)');
    expect(interval.toString()).toBe('[1 2 1>@-1.2..');
  });

  it('can parse the monzo representation of negative unity', () => {
    const {interval} = parseSingle('[1>@-1');
    expect(interval.valueOf()).toBe(-1);
  });

  it('can convert 13231/13184 to monzo', () => {
    const {interval} = parseSingle('monzo(13231/13184)');
    expect(interval.toString()).toBe('[1 -7>@13231/103.2');
  });

  it('can convert 1 Hz to monzo', () => {
    const {interval} = parseSingle('monzo(1z)');
    expect(interval.toString()).toBe('[1>@Hz');
  });

  it('can parse the monzo representation of 1 Hz', () => {
    const {interval, value} = parseSingle('[1>@Hz');
    expect(interval.valueOf()).toBe(1);
    expect(value.timeExponent.equals(-1)).toBe(true);
  });

  it('can convert cents to boolean', () => {
    const yes = evaluate('bool(0.0 red)');
    expect(yes).toBe(true);
  });

  it('can convert boolean to cents', () => {
    const {interval} = parseSingle('cents(true)');
    expect(interval.toString()).toBe('0.');
  });

  it('bool converts empty array to false', () => {
    const thereAreOddPerfectNumbers = evaluate('bool([])');
    expect(thereAreOddPerfectNumbers).toBe(false);
  });

  it('fails to converts pi to an integer', () => {
    expect(() => parseSingle('int(PI)')).toThrow();
  });

  it('converts pi to a real decimal', () => {
    const interval = evaluate('decimal(PI)') as Interval;
    expect(interval.toString()).toBe('3.141592653589793r');
  });

  it('converts pi to a rational decimal', () => {
    const {interval} = parseSingle('decimal(PI, 5)');
    expect(interval.toString()).toBe('3.14159e');
  });

  it('fails to convert pi to a fraction', () => {
    expect(() => parseSingle('fraction(PI)')).toThrow();
  });

  it('converts pi to a fraction', () => {
    const {interval} = parseSingle('fraction(PI, 0.5)');
    expect(interval.toString()).toBe('333/106');
  });

  it('converts pi to a radical (outside of prime limit)', () => {
    const {interval} = parseSingle('radical(PI, 5)');
    expect(interval.toString()).toBe('355/113');
  });

  it('converts pi to a radical (within prime limit)', () => {
    const {interval} = parseSingle('radical(PI, 10, 1000)');
    expect(interval.toString()).toBe('306^1/5');
  });

  it('converts pi to soft cents', () => {
    const {interval} = parseSingle('cents(PI, 3)');
    expect(interval.toString()).toBe('1981.795');
  });

  it('fails to convert pi to NEDJI', () => {
    expect(() => parseSingle('nedji(PI)')).toThrow();
  });

  it('converts pi to monzo', () => {
    const interval = evaluate('monzo(PI)') as Interval;
    expect(interval.toString()).toBe('[1981.7953553667824>@rc');
  });

  it('parses a real monzo', () => {
    const interval = evaluate('[1981.7953553667824>@rc') as Interval;
    expect(interval.valueOf()).toBeCloseTo(Math.PI);
  });

  it.each([
    'bool',
    'round',
    'decimal',
    'fraction',
    'radical',
    'cents',
    'monzo',
    'FJS(fraction',
    'absoluteFJS(fraction',
    'monzo(fraction',
  ])('has a string representation for variants of %s(pi)', (tier: string) => {
    let tolerance = '';
    if (tier === 'fraction') {
      tolerance = ', 3.5';
    } else if (tier === 'radical') {
      tolerance = ', 5';
    } else if (tier.endsWith('(fraction')) {
      tolerance = ', 3.5)';
    }
    for (const hz of ['', ' Hz']) {
      for (const conversion of [
        'simplify',
        'relative',
        'absolute',
        'linear',
        'logarithmic',
      ]) {
        const value = evaluate(
          `A4 = 440 Hz = 27/16; ${conversion}(${tier}(3.141592653589793r${hz}${tolerance}))`
        ) as Interval;
        const iterated = evaluate(
          `A4 = 440 Hz = 27/16; ${value.toString()}`
        ) as Interval;
        expect(iterated.domain).toBe(value.domain);
        expect(iterated.valueOf()).toBeCloseTo(value.valueOf());
      }
    }
  });

  it('has a string representation for an absurd absolute quantity', () => {
    const value = evaluate(
      'A4 = 440Hz = 27/16; absolute(fraction(3.141592653589793r, -0.1))'
    ) as Interval;
    const iterated = evaluate(value.toString()) as Interval;
    expect(iterated.domain).toBe(value.domain);
    expect(iterated.valueOf()).toBeCloseTo(value.valueOf());
  });

  it('can access builtin docs', () => {
    const doc = evaluate('doc(primes)');
    expect(doc).toBe(
      'Obtain an array of prime numbers such that start <= p <= end. Or p <= start if end is omitted.'
    );
  });

  it('sets implicit 1/1 on pitch declaration', () => {
    const freq = parseSingle('Bb5 = 100 Hz; absolute(2)');
    expect(freq.value.timeExponent.equals(-1)).toBe(true);
    expect(freq.value.valueOf()).toBeCloseTo(200);
  });

  it('has lifts', () => {
    const {interval} = parseSingle('/P1');
    expect(interval.steps).toBe(5);
    expect(interval.totalCents()).toBe(0);
  });

  it('has drops', () => {
    const {interval} = parseSingle('\\P1');
    expect(interval.steps).toBe(-5);
    expect(interval.totalCents()).toBe(0);
  });

  it('has steps', () => {
    const {interval} = parseSingle('7°');
    expect(interval.steps).toBe(7);
    expect(interval.totalCents()).toBe(0);
  });

  it('has steps (ASCII)', () => {
    const {interval} = parseSingle('5 deg');
    expect(interval.steps).toBe(5);
    expect(interval.totalCents()).toBe(0);
  });

  it('has gcd', () => {
    const {interval} = parseSingle('gcd(30, 84)');
    expect(interval.toString()).toBe('6');
  });

  it('has lcm', () => {
    const {interval} = parseSingle('lcm(30, 84)');
    expect(interval.toString()).toBe('420');
  });

  it('has a just intonation point', () => {
    const marvelCents = evaluate('JIP(225/224)') as Interval;
    expect(marvelCents.toString()).toBe('7.711522991319705r¢');
  });

  it('parses negative intervals correctly', () => {
    const {interval} = parseSingle('aa-2');
    expect(interval.totalCents()).toBeCloseTo(-431.28);
  });

  it('converts negative intervals correctly', () => {
    const {interval} = parseSingle('FJS([25 -16>)');
    expect(interval.toString()).toBe('aa-2');
  });

  it('preserves ups and lifts on FJS', () => {
    const str = evaluate('str(/vvM3)');
    expect(str).toBe('/vvM3');
  });

  it('preserves ups and lifts on AbsoluteFJS', () => {
    const str = evaluate('str(\\^^E#7)');
    expect(str).toBe('\\^^E#7');
  });

  it('has a fancy cent', () => {
    const {interval} = parseSingle('1¢');
    expect(interval.toString()).toBe('1.');
  });

  it('can add FJS', () => {
    const {interval} = parseSingle('M3 + M3');
    expect(interval.toString()).toBe('a5');
  });

  it('can mod FJS', () => {
    const {interval} = parseSingle('M17^5 mod P8');
    expect(interval.toString()).toBe('M3^5');
  });

  it('can round FJS', () => {
    const {interval} = parseSingle('M17^5 to P8');
    expect(interval.toString()).toBe('P15');
  });

  it('can multiply FJS', () => {
    const {interval} = parseSingle('M2 * 2');
    expect(interval.toString()).toBe('M3');
  });

  it('can split FJS', () => {
    const {interval} = parseSingle('m7 % 2');
    expect(interval.toString()).toBe('P4');
  });

  it('can wing sum FJS', () => {
    const {interval} = parseSingle('P12 ~+~ M17^5');
    expect(interval.toString()).toBe('P22');
  });

  it('can measure the quality of vals', () => {
    const prettyGood = evaluate('errorTE(12@.5)') as Interval;
    expect(prettyGood.totalCents()).toBeCloseTo(3.476825868549166);

    const great = evaluate('errorTE(53@.5)') as Interval;
    expect(great.totalCents()).toBeCloseTo(0.35099473056221553);
  });

  it('can strip colors and labels to get a plain string representation', () => {
    const fifth = evaluate('str(6/4 lime "fifth")');
    expect(fifth).toBe('6/4');
  });

  it('can compare absolute to relative', () => {
    const fifth = evaluate('1/1 = 440 Hz; 700 Hz min 3/2');
    expect(fifth?.toString()).toBe('3/2');

    const eightHundred = evaluate('1/1 = 440 Hz; 800 Hz max 3/2');
    expect(eightHundred?.toString()).toBe('800 Hz');
  });

  it('produces a cents literal from cent multiplication (integer)', () => {
    const {interval} = parseSingle('88 c');
    expect(interval.toString()).toBe('88.');
  });

  it('produces a cents literal from cent multiplication (decimal)', () => {
    const {interval} = parseSingle('12.03 c');
    expect(interval.toString()).toBe('12.03');
  });

  it('preserves absolute FJS formatting', () => {
    const phiAt = evaluate('str(alpd4)');
    expect(phiAt).toBe('alpd4');
  });

  it('preserves lifts on monzos', () => {
    const {interval} = parseSingle('/[-1 1>');
    expect(interval.toString()).toBe('/[-1 1>');
  });

  it('preserves neutral FJS formatting', () => {
    const neutralThird = evaluate('str(n3^11)');
    expect(neutralThird).toBe('n3^11');
  });

  it('supports negative indexing on strings', () => {
    const r = evaluate('"bar"[-1]');
    expect(r).toBe('r');
  });

  it('supports slices on strings', () => {
    const ba = evaluate('"bar"[..1]');
    expect(ba).toBe('ba');
  });

  it('supports penultimation tag in slices', () => {
    const oba = evaluate('"foobar"[2..<5]');
    expect(oba).toBe('oba');
  });

  it('supports penultimation tag in slices (first two)', () => {
    const fo = evaluate('"foobar"[..<2]');
    expect(fo).toBe('fo');
  });

  it('supports indexing on str calls', () => {
    const C = evaluate('str(C4)[0]');
    expect(C).toBe('C');
  });

  it('has a lower-case hertz literal', () => {
    const {interval} = parseSingle('90hz');
    expect(interval.isAbsolute()).toBe(true);
    expect(interval.value.valueOf()).toBeCloseTo(90);
  });

  it('has zepto hertz', () => {
    const {interval} = parseSingle('1 zhz');
    expect(interval.isAbsolute()).toBe(true);
    expect(interval.value.valueOf()).toBeCloseTo(1e-21);
  });

  it('has hecto hertz', () => {
    const {interval} = parseSingle('1hHz');
    expect(interval.isAbsolute()).toBe(true);
    expect(interval.value.valueOf()).toBeCloseTo(100);
  });

  it('has exponentiation as a binary operation', () => {
    const {interval} = parseSingle('3 ^ 2');
    expect(interval.toInteger()).toBe(9);
  });

  it('has inverse exponentiation as a binary operation', () => {
    const {interval} = parseSingle('9 /^ 2');
    expect(interval.toInteger()).toBe(3);
  });

  it('has inverse exponentiation as a binary operation (alternative spelling)', () => {
    const {interval} = parseSingle('9 ^/ 2');
    expect(interval.toInteger()).toBe(3);
  });

  it('has the logarithm as a binary operation', () => {
    const {interval} = parseSingle('9 /_ 3');
    expect(interval.toInteger()).toBe(2);
  });

  it('supports underscores as separators (integer)', () => {
    const {interval} = parseSingle('1_000_000');
    expect(interval.toInteger()).toBe(1_000_000);
  });

  it('supports underscores as separators (fraction)', () => {
    const {interval} = parseSingle('1_000_001/1_000_000');
    expect(interval.toString()).toBe('1000001/1000000');
  });

  it('supports hsl colors', () => {
    const greenish = evaluate('hsl(123deg 45% 67%)') as Color;
    expect(greenish.value).toBe('hsl(123deg 45% 67%)');
    expect(greenish.toString()).toBe('hsl(123deg 45% 67%)');
    const retry = evaluate(greenish.toString()) as Color;
    expect(retry.value).toBe(greenish.value);
  });

  it('supports rgb color labels and reprs', () => {
    const lightFifth = evaluate('repr(3/2 rgb(200, 222, 256))');
    expect(lightFifth).toBe('(3/2 rgb(200.000 222.000 256.000))');
  });

  it('can concatenate strings', () => {
    const helloWorld = evaluate('concat("Hello", ",", " ", "World", "!")');
    expect(helloWorld).toBe('Hello, World!');
  });

  it('has spread syntax', () => {
    const stuff = evaluate('["1", ...["2", "3"], "4"]');
    expect(stuff).toEqual(['1', ...['2', '3'], '4']);
  });

  it('cannot produce empty ranges without the penultimation flag', () => {
    const zero = evaluate('[0..0]') as Interval[];
    expect(zero).toHaveLength(1);
    expect(zero[0].toInteger()).toBe(0);
  });

  it('can produce empty ranges with the penultimation flag', () => {
    const zero = evaluate('[0..<0]') as Interval[];
    expect(zero).toHaveLength(0);
  });

  it('can produce empty segments', () => {
    const nothing = evaluate('1::1') as Interval[];
    expect(nothing).toHaveLength(0);
  });

  it('has rgba syntax', () => {
    const faded = evaluate('rgba(255 255 255 / 0.5)') as Color;
    expect(faded.value).toBe('rgba(255 255 255 / 0.5)');
  });

  it('preserves labels based on preference (left)', () => {
    const {interval} = parseSingle('(9 lime) ~rd (2 tomato)');
    expect(interval.color?.value).toBe('lime');
  });

  it('preserves labels based on preference (right)', () => {
    const {interval} = parseSingle('(9 lime) rd~ (2 tomato)');
    expect(interval.color?.value).toBe('tomato');
  });

  it('resolves labels based on preference (wings)', () => {
    const {interval} = parseSingle('(9 lime) ~rd~ (2 tomato)');
    expect(interval.color?.value).toBe('lime');
  });

  it('has infectious labels', () => {
    const {interval} = parseSingle('(8 "redtone") % (7 red)');
    expect(interval.color?.value).toBe('red');
    expect(interval.label).toBe('redtone');
  });

  it('can simplify formatting', () => {
    const fifth = evaluate('repr(simplify(6/4 plum))');
    expect(fifth).toBe('(3/2 plum)');
  });

  it('can bleach away colors', () => {
    const fifth = evaluate('repr(bleach(6/4 plum))');
    expect(fifth).toBe('6/4');
  });

  it('has a frequency flavor', () => {
    const nice = parseSingle('69z');
    expect(nice.value.valueOf()).toBeCloseTo(69);
    expect(nice.value.timeExponent.equals(-1));
  });

  it('has array comprehensions', () => {
    const pyth12 = evaluate('map(str, sort([3^i rdc 2 for i of [-4..7]]))');
    expect(pyth12).toEqual([
      '2187/2048',
      '9/8',
      '32/27',
      '81/64',
      '4/3',
      '729/512',
      '3/2',
      '128/81',
      '27/16',
      '16/9',
      '243/128',
      '2',
    ]);
  });

  it('has ceiling modulo', () => {
    const {interval} = parseSingle('(-4) modc (-4)');
    expect(interval.toInteger()).toBe(-4);
  });

  it("doesn't let you color pi (variable)", () => {
    const purePi = evaluate('PI chocolate;PI') as Interval;
    expect(purePi.color?.value).toBe(undefined);
  });

  it("doesn't let you color pi (scale)", () => {
    const purePi = evaluate('PI;[chocolate];PI') as Interval;
    expect(purePi.color?.value).toBe(undefined);
  });

  it('can color nedji', () => {
    const {interval} = parseSingle('9\\13<3> blue');
    expect(interval.color?.value).toBe('blue');
  });

  it('can color nedji projection', () => {
    const {interval} = parseSingle('9\\13 ed 3 blue');
    expect(interval.color?.value).toBe('blue');
  });

  it('can add vals', () => {
    const yes = evaluate('24@.7 + 5@.7 == 29c@.7');
    expect(yes).toBe(true);
  });

  it('knows how to calculate logarithms of negative values', () => {
    const {interval} = parseSingle('(-8) /_ (-2)');
    expect(interval.toString()).toBe('3');
  });

  it('knows how to calculate logarithms of negative radicals', () => {
    const {interval} = parseSingle('(-2^3/2) /_ (-2^1/2)');
    expect(interval.toString()).toBe('3');
  });

  it('knows how to calculate negative logarithms', () => {
    const {interval} = parseSingle('1/9 /_ 3');
    expect(interval.toString()).toBe('-2');
  });

  it('has an accurate rdc', () => {
    const {interval} = parseSingle('29791 rdc 31');
    expect(interval.toString()).toBe('31');
  });

  it('can calculate log pi base two', () => {
    const logPi = evaluate('PI /_ 2') as Interval;
    expect(logPi.toString()).toBe('1.6514961294723187r');
  });

  it('can calculate log 2 base pi', () => {
    const logPi = evaluate('2 /_ PI') as Interval;
    expect(logPi.toString()).toBe('0.6055115613982802r');
  });

  it('calculates geometric absolute value', () => {
    const {interval} = parseSingle('abs logarithmic(-1/6)');
    expect(interval.toString()).toBe('1\\1<6>');
  });

  it('can put variables into arrays', () => {
    const foobar = evaluate('const foo = "foo"; const bar = "bar"; [foo, bar]');
    expect(foobar).toEqual(['foo', 'bar']);
  });

  it('reduces 6 by 3', () => {
    const {interval} = parseSingle('6 rdc 3');
    expect(interval.toString()).toBe('2');
  });

  it('calculates tenney height of 5/3', () => {
    const value = evaluate('tenneyHeight(5/3)') as Interval;
    expect(value.valueOf()).toBeCloseTo(2.70805);
  });

  it('supports nullish array access', () => {
    const nothing = evaluate('[1, 2, 3]~[4]');
    expect(nothing).toBeUndefined();
  });

  it('clears colors using niente', () => {
    const {interval} = parseSingle('1,5 lime "my fifth" niente');
    expect(interval.color).toBeUndefined;
    expect(interval.label).toBe('my fifth');
  });

  it('supports fraction formatting preference (numerator)', () => {
    const {interval} = parseSingle('fraction(1.5e, niente, 6)');
    expect(interval.toString()).toBe('6/4');
  });

  it('supports fraction formatting preference (denominator)', () => {
    const {interval} = parseSingle('fraction(1.5e, niente, 0, 6)');
    expect(interval.toString()).toBe('9/6');
  });

  it('can convert a string to a fraction', () => {
    const {fraction} = parseSingle('fraction("6/4")');
    expect(fraction).toBe('3/2');
  });

  it('supports nedji formatting preference', () => {
    const {interval} = parseSingle('nedji(1\\3, 0, 12)');
    expect(interval.toString()).toBe('4\\12');
  });

  it('can convert a string to nedji', () => {
    const {interval} = parseSingle('nedji("7\\\\13<3>")');
    const {fractionOfEquave, equave} = interval.value.toEqualTemperament();
    expect(fractionOfEquave.toFraction()).toBe('7/13');
    expect(equave.toFraction()).toBe('3');
  });

  it('can use "s" as a handy inflection', () => {
    const third = parseSingle('const s = logarithmic(81/80);M3-s');
    expect(third.value.toFraction().toFraction()).toBe('5/4');
  });

  it('can repeat strings', () => {
    const batperson = evaluate('arrayRepeat(5, "na")');
    expect(batperson).toBe('nanananana');
  });

  it('can repeat arrays', () => {
    const stuff = evaluate('1;2;3;arrayRepeat(3)') as Interval[];
    expect(stuff.map(i => i.toString()).join(';')).toBe('1;2;3;1;2;3;1;2;3');
  });

  it('has harmonic addition', () => {
    const {interval} = parseSingle('3/2 /+ 5/3');
    expect(interval.toString()).toBe('15/19');
  });

  it('has harmonic subtraction', () => {
    const {interval} = parseSingle('15/19 /- 5/3');
    expect(interval.toString()).toBe('3/2');
  });

  it('has something better left unnamed', () => {
    const {interval} = parseSingle('P5 /+ M3^5');
    expect(interval.toString()).toBe('1\\11<6075/512>');
  });

  it('has something even stranger', () => {
    const {interval} = parseSingle('1\\11<6075/512> /- P5');
    expect(interval.toString()).toBe('1\\1<5/4>');
  });

  it('has flat multiple array comprehensions', () => {
    const uncutDiamond = evaluate(
      '[str(p % q) for p of [1..5] for q of [1..5]]'
    );
    expect(uncutDiamond).toEqual([
      '1/1',
      '1/2',
      '1/3',
      '1/4',
      '1/5',
      '2/1',
      '2/2',
      '2/3',
      '2/4',
      '2/5',
      '3/1',
      '3/2',
      '3/3',
      '3/4',
      '3/5',
      '4/1',
      '4/2',
      '4/3',
      '4/4',
      '4/5',
      '5/1',
      '5/2',
      '5/3',
      '5/4',
      '5/5',
    ]);
  });

  it('produces cents from addition', () => {
    const {interval} = parseSingle('894.9 + 5.1');
    expect(interval.toString()).toBe('900.');
  });

  it('produces cents from subtraction', () => {
    const {interval} = parseSingle('905.1 - 5.1');
    expect(interval.toString()).toBe('900.');
  });

  it('has explicit subgroups for monzos', () => {
    const {interval, fraction} = parseSingle('[0, 1, -1>@2.3.13/5');
    expect(interval.toString()).toBe('[0 1 -1>@2.3.13/5');
    expect(fraction).toBe('15/13');
  });

  it('has explicit subgroups for vals', () => {
    const fiveGPV = evaluate('<5, 8, 7]@2.3.13/5') as Val;
    expect(fiveGPV.toString()).toBe('<5 8 7]@2.3.13/5');
    expect(fiveGPV.value.primeExponents.map(pe => pe.toFraction())).toEqual([
      '5',
      '8',
      '-7/2',
      '0',
      '0',
      '7/2',
    ]);
    expect(
      fiveGPV.value.dot(TimeMonzo.fromFraction('15/13')).toFraction()
    ).toBe('1');
  });

  it('has trivial tensoring', () => {
    const {interval} = parseSingle('3 tns 5');
    expect(interval.toString()).toBe('15');
  });

  it('has rank-1 tensoring (left)', () => {
    const doubles = evaluate('2 tns [3, 5]') as Interval[];
    expect(doubles.map(i => i.toString())).toEqual(['6', '10']);
  });

  it('has rank-1 tensoring (right)', () => {
    const fives = evaluate('[2, 3] tns 5') as Interval[];
    expect(fives.map(i => i.toString())).toEqual(['10', '15']);
  });

  it('has rank-3 tensoring', () => {
    const block = evaluate(
      '([1/1, 3/2]⊗[5/4, 2/1])⊗[7/4, 2/1]'
    ) as unknown as Interval[][][];
    expect(
      block.map(mat => mat.map(row => row.map(i => i.toString())))
    ).toEqual([
      [
        ['35/16', '5/2'],
        ['7/2', '4'],
      ],
      [
        ['105/32', '15/4'],
        ['21/4', '6'],
      ],
    ]);
  });

  it('crashes with zero enumeration', () => {
    expect(() => evaluate('0:1:2:3')).toThrow();
  });

  it('has vector negation', () => {
    const vec = evaluate('-[1, -2, 3]') as Interval[];
    expect(vec.map(i => i.toString())).toEqual(['-1', '2', '-3']);
  });

  it('has vector addition', () => {
    const vec = evaluate('[1, 2, 3] + [10, 20, 300]') as Interval[];
    expect(vec.map(i => i.toString())).toEqual(['11', '22', '303']);
  });

  it('has quick(ish) edo subset', () => {
    const ionian = evaluate('[2, 4, 5, 7, 9, 11, 12] \\ 12') as Interval[];
    expect(ionian.map(i => i.toString())).toEqual([
      '2\\12',
      '4\\12',
      '5\\12',
      '7\\12',
      '9\\12',
      '11\\12',
      '12\\12',
    ]);
  });

  it('has quick nedji subset', () => {
    const scale = evaluate('[1, 2, 5] \\ 13 ed 3') as Interval[];
    expect(scale.map(i => i.toString())).toEqual([
      '1\\13<3>',
      '2\\13<3>',
      '5\\13<3>',
    ]);
  });

  it('parses binary nedo over a step literal (identifier)', () => {
    const {interval} = parseSingle('const two = 2;1\\two');
    expect(interval.toString()).toBe('1\\2');
  });

  it('parses binary nedo over a step literal (call)', () => {
    const {interval} = parseSingle('1\\trunc(2.2e)');
    expect(interval.toString()).toBe('1\\2');
  });

  it('formats non-standard simplified vals', () => {
    const orphanBohlenPierce = evaluate('simplify(b13@)') as Val;
    expect(orphanBohlenPierce.toString()).toBe(
      'withBasis(<8 13 19 23 28 30 34 35 37], @3.2.5.7.11.13.17.19.23)'
    );
  });

  it('parses non-standard vals', () => {
    const orphanBohlenPierce = evaluate(
      'withBasis(<8 13 19 23], @3.2.5..)'
    ) as Val;
    expect(orphanBohlenPierce.equave.toString()).toBe('3');
    expect(
      orphanBohlenPierce.value.primeExponents.map(pe => pe.toFraction())
    ).toEqual(['8', '13', '19', '23']);
  });

  it('has square superparticulars', () => {
    const {interval} = parseSingle('S8');
    expect(interval.domain).toBe('logarithmic');
    expect(interval.value.toFraction().toFraction()).toBe('64/63');
  });

  it('does S-expressions in the logarithmic domain', () => {
    const {interval} = parseSingle('S6-S8');
    expect(interval.domain).toBe('logarithmic');
    expect(interval.value.toFraction().toFraction()).toBe('81/80');
  });

  it('can use square superparticulars as inflections', () => {
    const {interval} = parseSingle('M2-S9..11');
    expect(interval.domain).toBe('logarithmic');
    expect(interval.value.toFraction().toFraction()).toBe('12/11');
  });

  it('evaluates S2..16 correctly', () => {
    expect(evaluate('str(linear(S2..16))')).toBe('32/17');
  });

  it('evaluates S11..37 correctly', () => {
    expect(evaluate('str(linear(S11..37))')).toBe('407/380');
  });

  it('has Helmholtz-Ellis 2020 comma flavors', () => {
    const h17 = parseSingle('a1_17h');
    expect(h17.value.toFraction().toFraction()).toBe('17/16');
  });

  it("has richie's HEJI extension", () => {
    const h71 = parseSingle('M2_71h');
    expect(h71.value.toFraction().toFraction()).toBe('71/64');
  });

  it('has wolf-monzo variant', () => {
    const h17 = parseSingle('M2_17m');
    expect(h17.value.toFraction().toFraction()).toBe('17/16');
  });

  it("has Lumi's bridging commas (island)", () => {
    const semifourth = parseSingle('C4 = 1/1;alpd4_3l');
    expect(semifourth.value.toFraction().toFraction()).toBe('15/13');
  });

  it("has Lumi's bridging commas (memes)", () => {
    const ohNo = parseSingle('sm2^0l');
    expect(ohNo.value.toFraction().toFraction()).toBe('15/14');
  });

  it('has syntonic rastmic subchroma notation (relative artodemisharp)', () => {
    const artodemi = parseSingle('sa1_1s');
    expect(artodemi.value.toFraction().toFraction()).toBe('33/32');
  });

  it('has syntonic rastmic subchroma notation (absolute tendodemisharp)', () => {
    const artodemi = parseSingle('C4 = 1/1;Ct4^1s');
    expect(artodemi.value.toFraction().toFraction()).toBe('729/704');
  });

  it('has syntonic rastmic subchroma notation (relative sesquiraflat)', () => {
    const srf = parseSingle('P1_12s');
    const monzo = srf.value.primeExponents;
    expect(monzo[0].equals('3/2')).toBe(true);
    expect(monzo[1].equals('-15/2')).toBe(true);
    expect(monzo[2].equals('0')).toBe(true);
    expect(monzo[3].equals('0')).toBe(true);
    expect(monzo[4].equals('3')).toBe(true);
  });

  it('can convert just intonation to HEWM53', () => {
    const {interval} = parseSingle('FJS(19/16, "m")');
    expect(interval.toString()).toBe('M2^19m');
    expect(interval.value.toFraction().toFraction()).toBe('19/16');
  });

  it('can parenthesize nedo denominator', () => {
    const almostOctave = parseSingle('1\\ (13/12)');
    expect(almostOctave.value.primeExponents[0].toFraction()).toBe('12/13');
  });

  // XXX: Actually works now. Funny consequence of grammar optimization.
  it.skip("doesn't let you call step literals", () => {
    expect(() => parseSingle('(1\\)(13/12)')).toThrow('Invalid callee.');
  });

  it('can detect echelons (relative)', () => {
    const yes = evaluate('str(isRelative(3/2))');
    expect(yes).toBe('true');
  });

  it('can detect echelons (absolute)', () => {
    const no = evaluate('str(isAbsolute(3/2))');
    expect(no).toBe('false');
  });

  it('has a representation for a harmonic segment in FJS', () => {
    for (let i = 49; i <= 96; ++i) {
      const {interval} = parseSingle(`FJS(${i}/48)`);
      expect(interval.valueOf()).toBeGreaterThan(1);
      expect(interval.valueOf()).toBeLessThanOrEqual(2);
      const retry = parseSingle(interval.toString()).interval;
      expect(interval.equals(retry)).toBe(true);
    }
  });

  it('has a representation for a harmonic segment in FJS using HEWM53 flavors', () => {
    for (let i = 30; i <= 58; ++i) {
      const {interval} = parseSingle(`FJS(${i}/29, 'm')`);
      expect(interval.valueOf()).toBeGreaterThan(1);
      expect(interval.valueOf()).toBeLessThanOrEqual(2);
      const retry = parseSingle(interval.toString()).interval;
      expect(interval.equals(retry)).toBe(true);
    }
  });

  it("has a 'mu fourth' and an 'ex fifth' using Lumi's commas", () => {
    const µ4 = parseSingle('n4_2l');
    expect(µ4.value.toFraction().toFraction()).toBe('4/3');
    const x5 = parseSingle('n5^2l');
    expect(x5.value.toFraction().toFraction()).toBe('3/2');
  });

  it('has unicode dot product between vals and intervals', () => {
    const plenty = evaluate('str(€ · P8)');
    expect(plenty).toBe('1200');
  });

  it('has nested destructuring in array comprehensions', () => {
    const sums = evaluate(
      '[str(foo + bar + baz) for [foo, [bar, baz]] of [[1, [2, 3]], [4, [5, 6]]]]'
    );
    expect(sums).toEqual(['6', '15']);
  });

  it("has FloraC's flavor for FJS", () => {
    const unison = parseSingle('P1^11f_31f');
    expect(unison.value.toFraction().toFraction()).toBe('33/31');
  });

  it('has classic FJS flavor available', () => {
    const unison = parseSingle('P1^11c_31c');
    expect(unison.value.toFraction().toFraction()).toBe('8019/7936');
  });

  it("can do FJS conversion to with FloraC's flavors", () => {
    const {interval} = parseSingle('FJS(157/128, "f")');
    expect(interval.toString()).toBe('M3^157f');
  });

  it('switches domains while converting JI to cents', () => {
    const {interval} = parseSingle('cents(2)');
    expect(interval.totalCents()).toBeCloseTo(1200);
    expect(interval.domain).toBe('logarithmic');
  });

  it('converts string to cents interpreted literally', () => {
    const {interval} = parseSingle('cents("701.955")');
    expect(interval.totalCents()).toBeCloseTo(701.955);
  });

  it('switched domains while converting cents to decimals', () => {
    const {interval} = parseSingle('decimal(1200.)');
    expect(interval.value.valueOf()).toBeCloseTo(2);
    expect(interval.domain).toBe('linear');
  });

  it('converts a string to a decimal', () => {
    const {fraction} = parseSingle('decimal("12.3")');
    expect(fraction).toBe('123/10');
  });

  it('evaluates the difference in absolute FJS as relative FJS (default)', () => {
    const M2 = evaluate('str(E4 - D4)');
    expect(M2).toBe('M2');
  });

  it('evaluates the difference in absolute FJS as relative FJS (relative reference)', () => {
    const m2 = evaluate('B3 = 1/1; str(F4 - E4)');
    expect(m2).toBe('m2');
  });

  it('evaluates the difference in absolute FJS as relative FJS (absolute reference)', () => {
    const P5 = evaluate('F#5 = 555Hz; str(G3 - C3)');
    expect(P5).toBe('P5');
  });

  it('evaluates the difference in absolute FJS as relative FJS (non-standard reference A)', () => {
    const P5 = evaluate('F#5 = 5ms; str(G3 - C3)');
    expect(P5).toBe('P5');
  });

  it('evaluates the difference in absolute FJS as relative FJS (non-standard reference B)', () => {
    const P5 = evaluate('F#5 = (1s)^5/2; str(G3 - C3)');
    expect(P5).toBe('P5');
  });

  it('has C5 an octave above C4 even with non-standard reference', () => {
    const {interval} = parseSingle('C4 = 10ms; relative(C5)');
    expect(interval.toString()).toBe('1\\1');
  });

  it('has not-a-number', () => {
    const nan = evaluate('nan') as Interval;
    expect(nan.valueOf()).toBeNaN();
    expect(nan.toString()).toBe('nan');
  });

  it('has negative infinity', () => {
    const inf = evaluate('-inf') as Interval;
    expect(inf.valueOf()).toBe(-Infinity);
    expect(inf.toString()).toBe('-inf');
  });

  it('has root half', () => {
    const {interval} = parseSingle('SQRT1_2 ^ 2');
    expect(interval.toString()).toBe('1/2');
  });

  it('has sine', () => {
    const sinRad = evaluate('sin(1)') as Interval;
    expect(sinRad.toString()).toBe('0.8414709848078965r');
  });

  it('has a vectorized cos', () => {
    const xs = evaluate('cos([0, 1, PI/2, PI])') as Interval[];
    expect(xs).toHaveLength(4);
    expect(xs[0].valueOf()).toBeCloseTo(1);
    expect(xs[1].valueOf()).toBeCloseTo(0.54);
    expect(xs[2].valueOf()).toBeCloseTo(0);
    expect(xs[3].valueOf()).toBeCloseTo(-1);
  });

  it('produces nan from asin', () => {
    const wishIwasAcomplexNumber = evaluate('asin(2)') as Interval;
    expect(wishIwasAcomplexNumber.toString()).toBe('nan');
  });

  it('has domain-crossing acos', () => {
    const acosHalf = evaluate('acos(-P8)') as Interval;
    expect(acosHalf.toString()).toBe('1.0471975511965979r');
  });

  it('formats uniformly inverted NEDJI', () => {
    const {interval} = parseSingle('%~4\\12');
    expect(interval.toString()).toBe('-4\\12');
  });

  it('adds S-expressions to FJS (plain)', () => {
    const {interval} = parseSingle('m3+S9');
    expect(interval.toString()).toBe('m3_5');
  });

  it('adds S-expressions to FJS (flavored)', () => {
    const {interval} = parseSingle('m3_19h+S9');
    expect(interval.toString()).toBe('m3^5h_19h');
  });

  it('subtracts S-expressions from absoluteFJS', () => {
    const e4 = evaluate('a4=440z;str(E4-S9)');
    expect(e4).toBe('E♮4^5');
  });

  it('has linear universal logarithm', () => {
    const {interval} = parseSingle('6\\12 ~/_ 2\\12');
    expect(interval.toString()).toBe('3');
  });

  it('has linear universal dot product', () => {
    const {interval} = parseSingle('4/3 dot~ 3/2');
    expect(interval.toString()).toBe('-3');
  });

  it('has negative cents', () => {
    const {interval} = parseSingle('-123.4');
    expect(interval.toString()).toBe('-123.4');
  });

  it('has moves negation to the degree in FJS and flips scripts', () => {
    const {interval} = parseSingle('-M3^5');
    expect(interval.toString()).toBe('M-3_5');
  });

  it('distributes monzo negation', () => {
    const {interval} = parseSingle('-[4 -4 1>');
    expect(interval.toString()).toBe('[-4 4 -1>');
  });

  it("uses FloraC's FJS inflections by default", () => {
    const quarterTone = parseSingle('P1_31');
    expect(quarterTone.value.toFraction().toFraction()).toBe('32/31');
  });

  it('has negative sub-unity cents', () => {
    const {interval} = parseSingle('-.4');
    expect(interval.toString()).toBe('-0.4');
  });

  it('has negative sub-unity comma-decimals', () => {
    const {interval} = parseSingle('-,99');
    expect(interval.toString()).toBe('-0.99e');
  });

  it('has lens absorbing logarithmic unison (addition)', () => {
    const {interval} = parseSingle('0\\12 /+ 5\\12');
    expect(interval.totalCents()).toBeCloseTo(0);
  });

  it('has lens absorbing logarithmic unison (subtraction)', () => {
    const {interval} = parseSingle('7\\12 /- 0\\12');
    expect(interval.totalCents()).toBeCloseTo(0);
  });

  it('can slice niente arrays', () => {
    const twoNothings = evaluate('[niente, niente, niente][1..]');
    expect(twoNothings).toHaveLength(2);
  });

  it('can slice assign nientes', () => {
    const nothings = evaluate(
      'const arr = [1, 2, 3, 4]; arr[0,2..] = [niente, niente]; map(str, arr)'
    );
    expect(nothings).toEqual(['niente', '2', 'niente', '4']);
  });

  it('aspires to preserve FJS flavor', () => {
    const {interval} = parseSingle('P5 + n3^11n');
    expect(interval.toString()).toBe('n7^11n');
  });

  it('knows that 7 is an integer', () => {
    const yes = evaluate('isInt(7)');
    expect(yes).toBe(true);
  });

  it('knows that sqrt(15) is not an integer', () => {
    const no = evaluate('isInt(15 /^ 2)');
    expect(no).toBe(false);
  });

  it('knows that 7/5 is a rational number', () => {
    const yes = evaluate('isRational(14e-1)');
    expect(yes).toBe(true);
  });

  it('knows that sqrt(15) is not rational', () => {
    const no = evaluate('isRational(15 /^ 2)');
    expect(no).toBe(false);
  });

  it('knows that sqrt(15) is a radical', () => {
    const sure = evaluate('isRadical(15 /^ 2)');
    expect(sure).toBe(true);
  });

  it('knows that TAU is not a radical', () => {
    const no = evaluate('isRadical(TAU)');
    expect(no).toBe(false);
  });

  it('labels up-E-semiflat-super-11-neutral', () => {
    const {interval} = parseSingle(
      'C4 = 1;labelAbsoluteFJS(11/9 * linear(1°), "n")'
    );
    expect(interval.label).toBe('^Ed^11n');
    expect(interval.color?.value).toBe('black');
  });

  it('breaks constructed absolute FJS', () => {
    const {interval} = parseSingle(
      'F4 = 1;const g = absoluteFJS(9/8);C4 = 1;g str(g)'
    );
    expect(interval.value.toFraction().toFraction()).toBe('9/8');
    expect(interval.label).toBe('D♮4');
  });

  it('preserves ups in FJS conversion', () => {
    const upSixth = evaluate('str(FJS(^m6))');
    expect(upSixth).toBe('^m6');
  });

  it('can flatten a nested array', () => {
    const arr = evaluate(
      'flatten([["a", ["b", "c"]], ["d", ["e", "f"]], "g"])'
    );
    expect(arr).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });

  it('converts a mixture of rational and irrational to real in cents conversion', () => {
    const c = evaluate('cents(3/2 % 1.00123r)') as Interval;
    expect(c.toString()).toBe('699.8268915041559r¢');
    expect(c.value.totalCents()).toBeCloseTo(699.82689);
  });

  it('parses negative reals', () => {
    const r = evaluate('-1.23r') as Interval;
    expect(r.valueOf()).toBeCloseTo(-1.23);
  });

  it('parses negative real cents', () => {
    const c = evaluate('-1.23rc') as Interval;
    expect(c.totalCents()).toBeCloseTo(-1.23);
  });

  it('has a semiquartal spelling for 7/6 (relative parsing)', () => {
    const {interval} = parseSingle('n2.5^7q');
    expect(interval.value.toFraction().toFraction()).toBe('7/6');
  });

  it('has a semiquartal spelling for 7/6 (absolute parsing)', () => {
    const q = parseSingle('C4 = 1;alpd4^7q');
    expect(q.value.toFraction().toFraction()).toBe('7/6');
  });

  it('has a semiquartal spelling for 7/6 (relative)', () => {
    const q = evaluate('str(FJS(7/6, "q"))');
    expect(q).toBe('n2.5^7q');
  });

  it('has a semiquartal spelling for 7/6 (absolute)', () => {
    const q = evaluate('str(absoluteFJS(7/6, "q"))');
    expect(q).toBe('αd4^7q');
  });

  it('has a simple semiquartal (canceling) spelling for 15/13', () => {
    const q = evaluate('str(FJS(15/13, "q"))');
    expect(q).toBe('M2^5q_13q');
  });

  it('has a simple semiquartal (canceling) spelling for 17/15', () => {
    const q = evaluate('str(FJS(17/15, "q"))');
    expect(q).toBe('m2^17q_5q');
  });

  it('has a tone-splitter spelling for 24/23', () => {
    const lesserVicesimotertial = parseSingle('P1.5_23t');
    expect(lesserVicesimotertial.value.toFraction().toFraction()).toBe('24/23');
  });

  it('has semioctave spelling for 17/12', () => {
    const zeta = parseSingle('C4 = 1; γ4^17t');
    expect(zeta.value.toFraction().toFraction()).toBe('17/12');
  });

  it('has inline analogue of try..catch (success)', () => {
    const {interval} = parseSingle('fraction([-1 1>) lest [-1 1>');
    expect(interval.toString()).toBe('3/2');
  });

  it('has inline analogue of try..catch (left success)', () => {
    const {interval} = parseSingle(
      'fraction([1>) lest fraction([-1 1>) lest [-1 1>'
    );
    expect(interval.toString()).toBe('2/1');
  });

  it('has an inline analogue of try..catch (failure)', () => {
    const pi = evaluate('fraction(PI) lest PI') as Interval;
    expect(pi.value.isFractional()).toBe(false);
    expect(pi.valueOf()).toBeCloseTo(Math.PI);
  });

  it('has an inline analogue of try..catch (ternary fail.fail.fail)', () => {
    expect(() =>
      evaluate('fraction(E) lest fraction(PI) lest fraction(LN2)')
    ).toThrow('Input is irrational and no tolerance given.');
  });

  it('has an inline analogue of try..catch (ternary fail.fail.success)', () => {
    const {fraction} = parseSingle(
      'fraction(E) lest fraction(PI) lest fraction(LN2, 10.)'
    );
    expect(fraction).toBe('9/13');
  });

  it('has an inline analogue of try..catch (ternary fail.success.no-eval)', () => {
    const {fraction} = parseSingle(
      'fraction(E) lest fraction(PI, 10.) lest fraction(LN2)'
    );
    expect(fraction).toBe('22/7');
  });

  it('has an inline analogue of try..catch (ternary success.no-eval.no-eval)', () => {
    const {fraction} = parseSingle(
      'fraction(E, 10.) lest fraction(PI, 10.) lest fraction(LN2)'
    );
    expect(fraction).toBe('19/7');
  });

  it('has atan2 with swapped arguments', () => {
    const interval = evaluate('atanXY(S5, -E)') as Interval;
    expect(interval.domain).toBe('linear');
    expect(interval.valueOf()).toBeCloseTo(-1.2048493);
  });

  it('can add booleans producing intervals', () => {
    const {interval} = parseSingle('false + false');
    expect(interval.toString()).toBe('0');
  });

  it('can multiply boolean with an interval (left domain-specific)', () => {
    const {interval} = parseSingle('true * 3');
    expect(interval.toString()).toBe('3');
  });

  it('can multiply boolean with an interval (right universal)', () => {
    const {interval} = parseSingle('3 ~* true');
    expect(interval.toString()).toBe('3');
  });

  it("throws if you don't pass arguments to sin", () => {
    expect(() => parseSingle('sin()')).toThrow("Parameter 'x' is required.");
  });

  it("throws if you don't pass arguments to int", () => {
    expect(() => parseSingle('int()')).toThrow(
      "Parameter 'interval' is required."
    );
  });

  it('converts a string to an integer', () => {
    // parseSingle checks that it's converted to an interval.
    const {fraction} = parseSingle('int("311")');
    expect(fraction).toBe('311');
  });

  it('has the empty gcd', () => {
    const {interval} = parseSingle('gcd()');
    expect(interval.toString()).toBe('0');
  });

  it('can calculate the step string for Lydian', () => {
    const pattern = evaluate(
      '9/8;81/64;729/512;3/2;27/16;243/128;2/1;stepString()'
    );
    expect(pattern).toBe('LLLsLLs');
  });

  it('can calculate the step string for pseudo-Ionian in 8edo', () => {
    const pattern = evaluate('2\\8;4\\8;3\\8;5\\8;7\\8;9\\8;8\\8;stepString()');
    expect(pattern).toBe('PPμPPPμ');
  });

  it('calculates step strings for scales with repeats', () => {
    const pattern = evaluate('5/4;3/2;3/2;2;stepString()');
    expect(pattern).toBe('MszL');
  });

  it('uses uppercase P alongside the zilch step', () => {
    const pattern = evaluate('1\\4;2\\4;2\\4;3\\4;4\\4;stepString()');
    expect(pattern).toBe('PPzPP');
  });

  it('calculates step strings for scales of large variety (positive)', () => {
    const pattern = evaluate('16::32;stepString()');
    expect(pattern).toBe('ABCDEFGHabcdefgh');
  });

  it('calculates step strings for scales of large variety (negative)', () => {
    const pattern = evaluate('/16::32;stepString()');
    expect(pattern).toBe('ποξνμλκιθηζεδγβα');
  });

  it('uses fillers in step strings when it runs out of letters (positive)', () => {
    const pattern = evaluate('53::106;stepString()');
    expect(pattern).toBe(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxy??'
    );
  });

  it('uses fillers in step strings when it runs out of letters (negative)', () => {
    const pattern = evaluate('/30::60;stepString()');
    expect(pattern).toBe('ωψχφυτσςρποξνμλκιθηζεδγβα¿¿¿¿¿');
  });

  it('uses w before u in step strings', () => {
    const pattern = evaluate('8::16;stepString()');
    expect(pattern).toBe('BHLMnstw');
  });

  it('has a comfortable precedence between addition, min and max', () => {
    const {interval} = parseSingle('2 + 1 min 3 - 4 max 5');
    expect(interval.toString()).toBe('5');
  });

  it('has a string representation for the eighth fifth (relative)', () => {
    const {interval} = parseSingle('P5 % 8');
    expect(interval.toString()).toBe('⅛d1.5');
  });

  it('parses the eighth fifth', () => {
    const quarterMinorSesquith = parseSingle('⅛d1.5');
    expect(quarterMinorSesquith.value.primeExponents[0].toFraction()).toBe(
      '-1/8'
    );
    expect(quarterMinorSesquith.value.primeExponents[1].toFraction()).toBe(
      '1/8'
    );
  });

  it('has a string representation for the eighth fifth (absolute)', () => {
    const {interval} = parseSingle('absoluteFJS(P5 % 8)');
    expect(interval.toString()).toBe('η⅛♭4');
  });

  it('parses the absolute eighth fifth (eighth flat)', () => {
    const gamma = parseSingle('η⅛♭4');
    expect(gamma.value.primeExponents[0].toFraction()).toBe('-1/8');
    expect(gamma.value.primeExponents[1].toFraction()).toBe('1/8');
  });

  it('parses the absolute eighth fifth (quarter semiflat)', () => {
    const gamma = parseSingle('etaqd4');
    expect(gamma.value.primeExponents[0].toFraction()).toBe('-1/8');
    expect(gamma.value.primeExponents[1].toFraction()).toBe('1/8');
  });

  it("is kind of weird how 4/8 - 11/8 is -7/8 and how it pairs up with 7/8 of the three's exponent", () => {
    const {interval} = parseSingle('8 * relative(gam⅛#4) - 7 * P5');
    expect(interval.totalCents()).toBe(0);
  });

  it('correctly gives up on FJS with the sixteenth fifth', () => {
    const {interval} = parseSingle('P5 % 16');
    expect(interval.toString()).toBe('1\\16<3/2>');
  });

  it('has record syntax', () => {
    const record = evaluate('#{foo: "a", "bar": "b", "here be spaces": "c"}');
    expect(record).toEqual({bar: 'b', 'here be spaces': 'c', foo: 'a'});
  });

  it('has record access', () => {
    const {interval} = parseSingle('#{foo: 3/2}["foo"]');
    expect(interval.toString()).toBe('3/2');
  });

  it('has the empty record', () => {
    const blank = evaluate('#{}');
    expect(blank).toEqual({});
  });

  it('has nullish record access', () => {
    const nothing = evaluate('#{}~["zero nothings"]');
    expect(nothing).toBe(undefined);
  });

  it('is resistant to pathological JS record keys', () => {
    expect(() => evaluate('#{}["toString"]')).toThrow('Key error: "toString"');
  });

  it('has string representation of records', () => {
    const str = evaluate('str(#{foo: 1})');
    expect(str).toBe('#{"foo": 1}');
  });

  it('can assign record keys', () => {
    const record = evaluate('const rec = #{foo: "a"};rec["bar"] = "b";rec');
    expect(record).toEqual({foo: 'a', bar: 'b'});
  });

  it('can re-assign record values', () => {
    const record = evaluate(
      'const rec = #{foo: 1, bar: 2};rec["bar"] *= 3; rec'
    ) as Record<string, Interval>;
    expect(record['foo'].toString()).toBe('1');
    expect(record['bar'].toString()).toBe('6');
  });

  it('can get the entries of a record', () => {
    const entries = evaluate('entries(#{foo: "a", bar: "b"})') as unknown as [
      string,
      string,
    ][];
    entries.sort((a, b) => a[1].localeCompare(b[1]));
    expect(entries).toEqual([
      ['foo', 'a'],
      ['bar', 'b'],
    ]);
  });

  it('can test for presence of keys in a record', () => {
    const yes = evaluate('"foo" in #{foo: 1}');
    expect(yes).toBe(true);
  });

  it('has a record shorthand', () => {
    const record = evaluate('const foo = "a";#{foo}');
    const foo = 'a';
    expect(record).toEqual({foo});
  });

  it('has sanity limits in Pythagorean formatting (relative descending)', () => {
    const {interval} = parseSingle('9001 * d1');
    expect(interval.toString()).toBe('-9001\\1<2187/2048>');
  });

  it('has sanity limits in Pythagorean formatting (absolute ascending)', () => {
    const doNotWant = evaluate('A4 = 440 Hz; str(C2 + 9001 * Â1)');
    expect(doNotWant).toBe('[1 -99006 63004 1 0 1>@Hz.2..');
  });

  it('can format a weighted sum of absolute and relative intervals', () => {
    const doWant = evaluate('A4 = 440 Hz; str(C2 + 9 * Â1)');
    expect(doWant).toBe('C♯𝄪𝄪𝄪𝄪2');
  });

  it('has formatting for fractions of the apotome (relative)', () => {
    for (let i = 1; i < 20; ++i) {
      const str = evaluate(`str(a1 % ${i})`);
      expect(str).not.toContain('undefined');
    }
  });

  it('has formatting for fractions of the apotome (absolute)', () => {
    for (let i = 1; i < 20; ++i) {
      const str = evaluate(`A4 = 440Hz; str(C4 + a1 % ${i})`);
      expect(str).not.toContain('undefined');
    }
  });

  it('can compare strings', () => {
    const aBeforeB = evaluate('"a" < "b"');
    expect(aBeforeB).toBe(true);
  });

  it('can sort an array of strings', () => {
    const swac = evaluate('sort([..."SonicWeave"])') as string[];
    expect(swac.join('')).toBe('SWaceeinov');
  });

  it('has a tightly binding fractional slash operator', () => {
    const tritonus = parseSingle(
      'const Diabolus = 7; const unus = 1; const musica = 5; const duo = 2; Diabolus/musica ^ duo/unus'
    );
    expect(tritonus.value.toFraction().toFraction()).toBe('49/25');
  });

  it('formats the relative third fourth', () => {
    const {interval} = parseSingle('P4 % 3');
    expect(interval.toString()).toBe('⅓M2');
  });

  it('parses the relative third fourth', () => {
    const thirdFourth = parseSingle('⅓M2');
    const {fractionOfEquave, equave} = thirdFourth.value.toEqualTemperament();
    expect(fractionOfEquave.toFraction()).toBe('1/3');
    expect(equave.toFraction()).toBe('4/3');
  });

  it('formats the absolute fifth sixth', () => {
    const deeFifthFlat = evaluate('C4 = 1;str(C4 + M6 / 5)');
    expect(deeFifthFlat).toBe('D⅕♭4');
  });

  it('parses the absolute fifth sixth', () => {
    const deeFifthFlat = parseSingle('C4 = 1;D⅕♭4');
    const {fractionOfEquave, equave} = deeFifthFlat.value.toEqualTemperament();
    expect(fractionOfEquave.toFraction()).toBe('1/5');
    expect(equave.toFraction()).toBe('27/16');
  });

  it('has "Aug" as an alternative spelling for "a"', () => {
    const {fraction} = parseSingle('Aug4');
    expect(fraction).toBe('729/512');
  });

  it('has "dim" as an alternative spelling for "d"', () => {
    const {fraction} = parseSingle('dim5');
    expect(fraction).toBe('1024/729');
  });

  it('has a porcupine inflection', () => {
    const {fraction} = parseSingle('⅓m3_6l');
    expect(fraction).toBe('6/5');
  });

  it('is a wizard, Harry!', () => {
    const {fraction} = parseSingle('⅓M2_7l');
    expect(fraction).toBe('11/10');
  });

  it('has amity', () => {
    const {fraction} = parseSingle('⅗M2^9l');
    expect(fraction).toBe('10/9');
  });

  it('has binary prefixes for mild amusement', () => {
    const {interval} = parseSingle('3 Yis');
    expect(interval.isAbsolute()).toBe(true);
    expect(interval.valueOf()).toBeCloseTo(3 * 1024 ** 8);
  });

  it('has a "lift" operator because the template tag requires a "drop" operator, but I guess it is useful for enumerated chords where mirroring would take precedence...', () => {
    const rootLift = evaluate('lift 4:5:6') as Interval[];
    // TODO: Actually observe the drop
    expect(rootLift).toHaveLength(2);
    expect(rootLift[0].valueOf()).toBe(1.25);
    expect(rootLift[1].valueOf()).toBe(1.5);
  });

  it('can long-tail monzo components starting from a prime', () => {
    const tooMuch = parseSingle('[1 -2 3 -4 5 -6 7 -8 9>@31..');
    const pe = tooMuch.value.primeExponents.map(e => e.toFraction());
    expect(pe).toEqual([
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '1',
      '-2',
      '3',
      '-4',
      '5',
      '-6',
      '7',
      '-8',
      '9',
    ]);
  });

  it('has near-universal vals', () => {
    const why = evaluate('<1 2 3 4 5 6 7]@Hz.2..') as Val;
    expect(why.domain).toBe('cologarithmic');
    expect(why.value.timeExponent.toFraction()).toBe('-1');
    expect(why.value.primeExponents.map(pe => pe.toFraction())).toEqual([
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
  });

  it("measures timeness using second's val", () => {
    const {interval} = parseSingle('<1]@s dot 1z ^ 1/2');
    expect(interval.valueOf()).toBe(-0.5);
  });

  it('has unicode down operator', () => {
    const {interval} = parseSingle('^ = 81/80; ∨27/16');
    expect(interval.toFraction().toFraction()).toBe('5/3');
  });

  it('evaluates patent val of agnostic tetracot', () => {
    const val = evaluate('4@3/2') as Val;
    expect(val.divisions.toFraction()).toBe('4');
    expect(val.equave.toFraction().toFraction()).toBe('3/2');
  });

  it('can create 4@3/2.10/9 that behaves as expected', () => {
    const val = evaluate('4@3/2.10/9') as Val;
    expect(val.divisions.toFraction()).toBe('4');
    expect(val.value.dot(TimeMonzo.fromFraction('10/9')).toFraction()).toBe(
      '1'
    );
  });

  it('knows the tetracot comma is tempered out in 4@3/2.10/9', () => {
    const {interval} = parseSingle('4@3/2.10/9 dot 20000/19683');
    expect(interval.valueOf()).toBe(0);
  });

  it('has insane units', () => {
    const miksiTeitSen = evaluate(
      '1 = 440Hz; relative([10000>@Hz)'
    ) as Interval;
    expect(miksiTeitSen.toString()).toBe('-1\\1<440>');
  });

  it('it formats one quebihertz', () => {
    const fallback = evaluate('str(1 QiHz)');
    expect(fallback).toBe('2^100*1Hz');
  });

  it('can multiply a step literal', () => {
    const {interval} = parseSingle('2° * 3');
    expect(interval.steps).toBe(6);
    expect(interval.toString()).toBe('6°');
  });

  it('can multiply a step literal (universal)', () => {
    const {interval} = parseSingle('2° ~^ 3');
    expect(interval.steps).toBe(6);
    expect(interval.toString()).toBe('6°');
  });

  it('has monzo representation for a step', () => {
    const {interval} = parseSingle('monzo(1°)');
    expect(interval.steps).toBe(1);
    expect(interval.toString()).toBe('[1>@1°');
  });

  it('has linear representation for a step', () => {
    const {interval} = parseSingle('^1');
    expect(interval.steps).toBe(1);
    expect(interval.toString()).toBe('linear(1°)');
  });

  it('has linear representation for up two', () => {
    const {interval} = parseSingle('^2');
    expect(interval.steps).toBe(1);
    expect(interval.toString()).toBe('linear([1 1>@1°.2)');
  });

  it('has linear representation for up three', () => {
    const {interval} = parseSingle('^3');
    expect(interval.steps).toBe(1);
    expect(interval.toString()).toBe('linear([1 0 1>@1°.2..)');
  });

  it('has universal formatting for negative real quantities', () => {
    const interval = evaluate('monzo(-3.14r)') as Interval;
    expect(interval.toString()).toBe('[1 1980.917470940283>@-1.rc');
  });

  it('parses negative real monzos', () => {
    const interval = evaluate('[1 1980.917470940283>@-1.rc') as Interval;
    expect(interval.valueOf()).toBeCloseTo(-3.14);
  });

  it('finds the lexicographically minimal string', () => {
    const a = evaluate('minimum("c", "a", "b")');
    expect(a).toBe('a');
  });

  it('finds the lexicographically maximal string', () => {
    const c = evaluate('maximum("c", "a", "b")');
    expect(c).toBe('c');
  });

  it('tempers a sixth in 31ed2 inline (val right)', () => {
    const {interval} = parseSingle('5/3 tmpr 31@');
    const {fractionOfEquave, equave} = interval.value.toEqualTemperament();
    expect(fractionOfEquave.toFraction()).toBe('23/31');
    expect(equave.toFraction()).toBe('2');
  });

  it('tempers a sixth in 31ed2 inline (val left)', () => {
    const {interval} = parseSingle('31@ tmpr 5/3');
    const {fractionOfEquave, equave} = interval.value.toEqualTemperament();
    expect(fractionOfEquave.toFraction()).toBe('23/31');
    expect(equave.toFraction()).toBe('2');
  });

  it('lets you spell FJS using vees', () => {
    const {fraction} = parseSingle('m3v5');
    expect(fraction).toBe('6/5');
  });

  it('can compute string char codes', () => {
    const {fraction} = parseSingle('charCodeAt("asdf", 1)');
    expect(fraction).toBe('115');
  });

  it('can count string code-points from the end', () => {
    const {fraction} = parseSingle('codePointAt("asdf", -2)');
    expect(fraction).toBe('100');
  });

  it('can construct strings from char codes', () => {
    const str = evaluate('fromCharCode(65, 66, 67)');
    expect(str).toBe('ABC');
  });

  it('can construct strings from code-points', () => {
    const str = evaluate('fromCodePoint(9731, 9733, 9842)');
    expect(str).toBe('☃★♲');
  });

  it('applies the full count from a down expression', () => {
    const {interval} = parseSingle('vvv{1}');
    expect(interval.totalCents()).toBe(0);
    expect(interval.steps).toBe(-3);
  });

  it('supports fancy angle brackets', () => {
    const {fraction} = parseSingle('⟨1 2 3] · [4 5 6⟩');
    expect(fraction).toBe((1 * 4 + 2 * 5 + 3 * 6).toString());
  });

  it('evaluates the explicit tmpr operator from the docs', () => {
    const {value} = parseSingle(`
      const v = <12 19 28]
      const m = 7/5
      ((v dot relative(m)) \\ (v dot basisOf(v)[0]) ed basisOf(v)[0]) ~* tail(relative(m), complexityOf(v, true))
    `);
    const pe = [...value.primeExponents];
    while (!pe[pe.length - 1].n) {
      pe.pop();
    }
    expect(pe).toHaveLength(4);
    expect(pe[0].toFraction()).toBe('-7/3');
    expect(pe[1].toFraction()).toBe('0');
    expect(pe[2].toFraction()).toBe('0');
    expect(pe[3].toFraction()).toBe('1');
  });

  it('has a chainable not', () => {
    const yep = evaluate('not not hotpink');
    expect(yep).toBe(true);
  });

  it('increments a value', () => {
    const {fraction} = parseSingle('let i = 0;++i;i');
    expect(fraction).toBe('1');
  });

  it('increments an array element', () => {
    const arr = evaluate('const arr = [1, 2];++arr[1];map(str, arr)');
    expect(arr).toEqual(['1', '3']);
  });

  it('increments a record value', () => {
    const rec = evaluate('const rec = #{a: 1, b: 2};++rec["a"];rec') as Record<
      string,
      Interval
    >;
    expect(rec.a.toInteger()).toBe(2);
    expect(rec.b.toInteger()).toBe(2);
  });

  it('increments an array', () => {
    const arr = evaluate('let arr = [1, 2];++arr') as Interval[];
    expect(arr[0].toInteger()).toBe(2);
    expect(arr[1].toInteger()).toBe(3);
  });

  it('reject literal increment', () => {
    expect(() => evaluate('++1')).toThrow(
      'Only identifiers, array elements or record values may be incremented or decremented.'
    );
  });

  it('supports assigning boolean and', () => {
    const {fraction} = parseSingle('let foo = 1;foo and= 0;foo');
    expect(fraction).toBe('0');
  });

  it('converts the neutrino to cents as fractions of the octave', () => {
    const neutrino = evaluate('cents([1889 -2145 138 424⟩, 12)') as Interval;
    expect(neutrino.toString()).toBe('0.000000000164');
  });

  it('converts the neutrino to real cents', () => {
    const neutrino = evaluate('cents([1889 -2145 138 424⟩)') as Interval;
    expect(neutrino.toString()).toBe('1.6375916287501086e-10r¢');
  });

  it('parses cents with exponents', () => {
    const {interval} = parseSingle('4.65e-2¢');
    expect(interval.totalCents()).toBeCloseTo(4.65e-2, 6);
  });

  it('parses real cents with exponents', () => {
    const smol = evaluate('4.6552193953432127e-10r¢') as Interval;
    expect(smol.totalCents()).toBeCloseTo(4.6552193953432127e-10, 12);
  });

  it("doesn't render non-standard pitches as absolute FJS", () => {
    const suchE = evaluate('C4 = 256 Hz; str(E4 + E4)');
    expect(suchE).toBe('[-2 4 8>@s.2..');
  });

  it('parses zero exponents as linear decimals', () => {
    const {interval, fraction} = parseSingle('1.5e0');
    expect(interval.toString()).toBe('1.5e0');
    expect(fraction).toBe('3/2');
  });

  it('can order intervals accurately', () => {
    const smidgeWider = evaluate('[162 -84 -12⟩ > 2');
    expect(smidgeWider).toBe(true);
  });

  it('supports complex exponents', () => {
    const {interval} = parseSingle(
      '2^(19019/12000) \'Guybrush "3L 3s" Threewood\''
    );
    expect(interval.totalCents()).toBe(1901.9);
  });

  it('no longer has implicit elementwise product', () => {
    expect(() => evaluate('[2, 3] [5, 7]')).toThrow(
      'Undefined intrinsic call.'
    );
  });

  it('has implicit function calls', () => {
    const {interval} = parseSingle('simplify 6/4');
    expect(interval.toString()).toBe('3/2');
  });

  it('has implicit fallback call semantics for chaining unary functions', () => {
    const {interval} = parseSingle('(abs -6/4) simplify logarithmic');
    expect(interval.toString()).toBe('1\\1<3/2>');
  });

  it('has deprecated implicit multiplication', () => {
    expect(() => parseSingle('(3) 5')).toThrow('Undefined intrinsic call.');
  });

  it('has explicit deprecated intrinsic multiplication', () => {
    expect(() => parseSingle('3(5)')).toThrow('Undefined intrinsic call.');
  });

  it("doesn't have negative literals for a good reason", () => {
    const {fraction} = parseSingle('2 -1');
    expect(fraction).toBe('1');
  });

  it('keeps unique strings', () => {
    const strings = evaluate('keepUnique(["hello", "world", "hello"])');
    expect(strings).toEqual(['hello', 'world']);
  });

  it('multiplies a monzo from the left', () => {
    const {fraction} = parseSingle('2 × [2 -1>');
    expect(fraction).toBe('16/9');
  });

  it('compares two to two minus one', () => {
    const no = evaluate('2 < 2 - 1');
    expect(no).toBe(false);
  });

  it('rejects val multiplication from the left due to grammatical issues', () => {
    expect(() => evaluate('2 <2 -1]')).toThrow();
  });

  it('accepts deprecated val multiplication from the left if you speak softly enough', () => {
    expect(() => evaluate('2 ⟨2 -1]')).toThrow('Undefined intrinsic call.');
  });

  it('has pythonic string multiplication (right)', () => {
    const batman = evaluate('"na" * 5');
    expect(batman).toBe('nanananana');
  });

  it('has pythonic string multiplication (left)', () => {
    const batman = evaluate('5 * "na"');
    expect(batman).toBe('nanananana');
  });

  it('allows for spaces in NEDO (right)', () => {
    const {interval} = parseSingle('1\\ 2');
    expect(interval.totalCents()).toBe(600);
  });

  it('allows for spaces in NEDO (left)', () => {
    const {interval} = parseSingle('1 \\2');
    expect(interval.totalCents()).toBe(600);
  });

  it('allows for spaces in NEDO (both)', () => {
    const {interval} = parseSingle('1 \\ 2');
    expect(interval.totalCents()).toBe(600);
  });

  it('generates shaped arrays of random values', () => {
    const rands = evaluate('random(4, 3, 2)') as unknown as Interval[][][];
    expect(rands).toHaveLength(4);
    expect(rands[0]).toHaveLength(3);
    expect(rands[0][0]).toHaveLength(2);
    const [x, y] = rands[0][0].map(i => i.valueOf());
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(1);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(1);
    // I'm pretty sure node's Math.random is bad enough for this to be guaranteed.
    expect(x).not.toBe(y);
  });

  it('generates shaped arrays of random cents', () => {
    const rands = evaluate('randomCents(3, 4, 2)') as unknown as Interval[][][];
    expect(rands).toHaveLength(3);
    expect(rands[0]).toHaveLength(4);
    expect(rands[0][0]).toHaveLength(2);
    const [x, y] = rands[0][0].map(i => i.totalCents());
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(1);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(1);
    // I'm pretty sure node's Math.random is bad enough for this to be guaranteed.
    expect(x).not.toBe(y);
  });

  it('has a broadcasting ternary operator', () => {
    const vec = evaluate('[2, 3] where [true, false] else 4') as Interval[];
    expect(vec.map(i => i.toInteger())).toEqual([2, 4]);
  });

  it('has a broadcasting ternary operator (broadcasting failure)', () => {
    expect(() => evaluate('[2] where [true, false] else [4, 5, 6]')).toThrow(
      'Unable to broadcast arrays together with lengths 1, 2 and 3.'
    );
  });

  it('has a broadcasting ternary operator (broadcasting failure *)', () => {
    expect(() => evaluate('2 where [true, false] else [4, 5, 6]')).toThrow(
      'Unable to broadcast arrays together with lengths *, 2 and 3.'
    );
  });

  it('ignores ternary broadcasting of records', () => {
    const oof = evaluate('1 where [true, false] else #{a: 2}') as any;
    expect(oof).toHaveLength(2);
    expect(oof[0].valueOf()).toBe(1);
    expect(oof[1].a.valueOf()).toBe(2);
  });

  it('can measure the Wilson complexity of 11/8', () => {
    const {fraction} = parseSingle('wilsonHeight(11/8)');
    expect(fraction).toBe('17');
  });

  it('can measure the Wilson complexity of 1073741820', () => {
    const {fraction} = parseSingle('wilsonHeight(1073741820)');
    expect(fraction).toBe((2 + 2 + 3 + 5 + 29 + 43 + 113 + 127).toString());
  });

  it('can convert 1073741821/1073741820 to a prime monzo', () => {
    const {interval, fraction} = parseSingle(
      'primeMonzo(1073741821/1073741820)'
    );
    expect(fraction).toBe('1073741821/1073741820');
    expect(interval.toString()).toBe(
      '[-2 -1 -1 1 -1 -1 -1 -1 1>@2.3.5.23.29.43.113.127.46684427'
    );
    expect(interval.domain).toBe('logarithmic');
  });

  it('can convert 81/80 to a prime count array', () => {
    const counts = evaluate('toPrimeArray(81/80)') as Interval[];
    expect(counts.map(i => i.toInteger())).toEqual([-4, 4, -1]);
  });

  it('can convert [-4, 4, -1] to a monzo', () => {
    const {interval, fraction} = parseSingle(
      'monzoFromPrimeArray([-4, 4, -1])'
    );
    expect(fraction).toBe('81/80');
    expect(interval.toString()).toBe('[-4 4 -1>');
  });

  it('can convert 12@.5 to a prime mapping array', () => {
    const map = evaluate('toPrimeArray(12@.5)') as Interval[];
    expect(map.map(i => i.toInteger())).toEqual([12, 19, 28]);
  });

  it('can convert [12, 19, 28] to a val', () => {
    const val = evaluate('valFromPrimeArray([12, 19, 28])') as Val;
    expect(val.toString()).toBe('<12 19 28]');
  });

  it('rejects defer at root scope', () => {
    expect(() => evaluate('defer 2;3')).toThrow(
      'Deferred actions not allowed when evaluating expressions.'
    );
  });

  it('accepts defer in sub-blocks', () => {
    const {fraction} = parseSingle('{defer 2; 3};$[-1]');
    expect(fraction).toBe('2');
  });

  it('has irrational ranges', () => {
    const soReal = evaluate('[E,PI..4] str');
    expect(soReal).toEqual(
      '[2.718281828459045r, 3.141592653589793r, 3.564903478720541r, 3.988214303851289r]'
    );
  });

  it('can convert the semioctave to a linear real value', () => {
    const sqrt2 = evaluate('real(1\\2)') as Interval;
    expect(sqrt2.domain).toBe('linear');
    expect(sqrt2.valueOf()).toBeCloseTo(Math.SQRT2);
  });

  it('has string representation for the geometric inverse of the logarithmic Hertz', () => {
    const whatIsThis = evaluate('str(%logarithmic(1z))');
    expect(whatIsThis).toBe('withBasis(<1]@Hz, @Hz)');
  });

  it('can evaluate the hertz val', () => {
    const pilcrowspoob = evaluate('withBasis(<1]@Hz, @Hz)') as Val;
    expect(pilcrowspoob.value.isUnity()).toBe(true);
    expect(pilcrowspoob.basis.value[0].isUnity()).toBe(true);
    expect(pilcrowspoob.value.timeExponent.equals(-1)).toBe(true);
    expect(pilcrowspoob.basis.value[0].timeExponent.equals(-1)).toBe(true);
  });

  it('has a literal for the geometric inverse of the logarithmic Hertz', () => {
    const {fraction} = parseSingle('¶ dot logarithmic(1z)');
    expect(fraction).toBe('1');
  });

  it('has "horizontal" precedence between √ and ÷', () => {
    const {interval} = parseSingle('√2÷3');
    expect(interval.toString()).toBe('2/9^1/2');
    expect(interval.valueOf()).toBeCloseTo(Math.SQRT2 / 3);
  });

  it('has "vertical" precedence between √ and /', () => {
    const {interval} = parseSingle('√3/2');
    expect(interval.toString()).toBe('3/2^1/2');
    expect(interval.valueOf()).toBeCloseTo(Math.sqrt(1.5));
  });

  it('has hemipyth monzos', () => {
    const {interval} = parseSingle('[-1, 1>@√2.√3');
    expect(interval.toString()).toBe('[-1 1>@√2.√3');
    expect(interval.valueOf()).toBeCloseTo(Math.sqrt(1.5));
  });

  it('has hemipyth vals', () => {
    const {fraction} = parseSingle('<12 19]@√2.√3 dot P5');
    expect(fraction).toBe('14');
  });

  it('evokes intrinsic behavior between PI and E', () => {
    expect(() => evaluateExpression('PI(E)')).toThrow(
      'Undefined intrinsic call.'
    );
  });

  it('normalizes zero (frequency)', () => {
    const {interval, fraction} = parseSingle('0 Hz');
    expect(interval.isAbsolute()).toBe(false);
    expect(fraction).toBe('0');
  });

  it("doesn't normalize real zero to rational", () => {
    const interval = evaluate('0r') as Interval;
    expect(interval.isAbsolute()).toBe(false);
    expect(interval.valueOf()).toBe(0);
    expect(interval.value).toBeInstanceOf(TimeReal);
  });

  it('can add zero to anything (frequency)', () => {
    const {interval} = parseSingle('440 Hz + 0');
    expect(interval.isAbsolute()).toBe(true);
    expect(interval.valueOf()).toBe(440);
  });

  it('can add zero to anything (real)', () => {
    const interval = evaluate('PI + 0') as Interval;
    expect(interval.isAbsolute()).toBe(false);
    expect(interval.valueOf()).toBeCloseTo(Math.PI);
  });

  it('parses universal negative infinite frequency', () => {
    const interval = evaluate('[1. 1 1>@Hz.-1.inf') as Interval;
    expect(interval.isAbsolute()).toBe(true);
    expect(interval.valueOf()).toBe(-Infinity);
  });

  it('parses the universal real zero', () => {
    const interval = evaluate('[-1>@inf') as Interval;
    expect(interval.isAbsolute()).toBe(false);
    expect(interval.valueOf()).toBe(0);
    expect(interval.value).toBeInstanceOf(TimeReal);
  });

  it('parses the universal not-a-number', () => {
    const interval = evaluate('[1 1>@0.inf') as Interval;
    expect(interval.valueOf()).toBeNaN();
    expect(interval.value).toBeInstanceOf(TimeReal);
  });

  it('can stack ups', () => {
    const {interval} = parseSingle('^^^P1 tmpr 12@');
    expect(interval.totalCents()).toBe(300);
  });

  it('can stack downs', () => {
    const {interval} = parseSingle('vvvP1 tmpr 12@');
    expect(interval.totalCents()).toBe(-300);
  });

  it('can stack lifts', () => {
    const {interval} = parseSingle('///P1 tmpr 12@');
    expect(interval.totalCents()).toBe(1500);
  });

  it('can stack drops', () => {
    const {interval} = parseSingle(String.raw`\\\P1 tmpr 12@`);
    expect(interval.totalCents()).toBe(-1500);
  });

  it('coerces too large integers to real', () => {
    const interval = evaluate('9007199254740997') as Interval;
    expect(interval.value).toBeInstanceOf(TimeReal);
    expect(interval.valueOf()).toBeCloseTo(9007199254740996);
  });

  it('coerces too accurate fractions to real', () => {
    const interval = evaluate('9007199254740997/9000000000000000') as Interval;
    expect(interval.value).toBeInstanceOf(TimeReal);
    expect(interval.valueOf()).toBeCloseTo(1.0008, 6);
  });

  it('coerces too accurate decimals to real', () => {
    const interval = evaluate('1.23456789012345678901e') as Interval;
    expect(interval.value).toBeInstanceOf(TimeReal);
    expect(interval.valueOf()).toBeCloseTo(1.23456);
  });

  it('coerces too accurate hertz to real', () => {
    const interval = evaluate('1.23456789012345678901Hz') as Interval;
    expect(interval.value).toBeInstanceOf(TimeReal);
    expect(interval.valueOf()).toBeCloseTo(1.23456);
    expect(interval.isAbsolute()).toBe(true);
  });

  it('coerces too accurate nedji to real', () => {
    const interval = evaluate(
      '1000000000000000\\9007199254740997<3>'
    ) as Interval;
    expect(interval.value).toBeInstanceOf(TimeReal);
    expect(interval.valueOf()).toBeCloseTo(1.12972);
  });

  it('coerces too accurate cents to real', () => {
    const interval = evaluate('1234.56789012345678901') as Interval;
    expect(interval.value).toBeInstanceOf(TimeReal);
    expect(interval.valueOf()).toBeCloseTo(2.04);
  });

  it('coerces too accurate monzos to real', () => {
    const ronzo = evaluate('[1.234567890123456780901>') as Interval;
    expect(ronzo.value).toBeInstanceOf(TimeReal);
    expect(ronzo.valueOf()).toBeCloseTo(2.3531);
  });

  it('coerces too complex nedo subtraction', () => {
    const interval = evaluate('103\\94906266 - 1\\94906267') as Interval;
    expect(interval.value).toBeInstanceOf(TimeReal);
    expect(interval.valueOf()).toBeCloseTo(1.000000745, 10);
  });

  it('allows return from block expressions', () => {
    const foo = evaluate(`
      const foo = ({
        const ba = "ba"
        return ba "r"
        throw "not executed"
      })
      foo
    `);
    expect(foo).toBe('bar');
  });

  it('has medium-length neutral quality', () => {
    const mediumStr = evaluate('str(neu3)');
    expect(mediumStr).toBe('neu3');
    const semiFif = evaluate('str(radical(neu3))');
    expect(semiFif).toBe('3/2^1/2');
    const half4dias = evaluate('MOS 5L 2s;str(nedji(neu2ms))');
    expect(half4dias).toBe('7\\24');
  });

  it('has medium-length minor quality', () => {
    const sixth = evaluate('str(fraction(min6v5))');
    expect(sixth).toBe('8/5');
    const twoDias = evaluate('MOS 5L2s;str(nedji(min2ms))');
    expect(twoDias).toBe('1\\4');
  });

  it('has medium-length major qualities', () => {
    const sixth = evaluate('str(fraction(Maj6^5))');
    expect(sixth).toBe('5/3');
    const semiDemiFif = evaluate('str(radical(½maj2))');
    expect(semiDemiFif).toBe('3/2^1/4');
    const twoDias = evaluate('MOS LLsLLLs;str(nedji(maj2ms))');
    expect(twoDias).toBe('1\\3');
  });

  it('compares colors', () => {
    expect(evaluate('str(#f00 == #f00)')).toBe('true');
    expect(evaluate('str(red == blue)')).toBe('false');
  });

  it('compares bases', () => {
    expect(evaluate('str(@2.3.5 == @2.3.5)')).toBe('true');
    expect(evaluate('str(@2.3.5 == @2.3.7)')).toBe('false');
  });

  it('converts a val literal to wartless warts', () => {
    const tet12 = evaluate('str(warts(<12 19 28]))');
    expect(tet12).toBe('12@2.3.5');
  });

  it('converts a hemipyth val to wartless warts', () => {
    const val = evaluate('str(warts(<11 17]@√2.√3))');
    expect(val).toBe('11@√2.√3');
  });

  it('converts a val literal to warts', () => {
    const tet17c = evaluate('str(warts(<17 27 40]))');
    expect(tet17c).toBe('17c@2.3.5');
  });

  it('converts a val literal to tweakless SOV', () => {
    const tet5 = evaluate('str(SOV(<5 8 12]))');
    expect(tet5).toBe('5[]@2.3.5');
  });

  it('converts a warts literal to SOV', () => {
    const b13 = evaluate('str(SOV(b13@))');
    expect(b13).toBe('13[]@3.2.5.7.11.13.17.19.23');
  });

  it('can construct the zero val (literal)', () => {
    const rank0 = evaluate('<0 0 0]') as Val;
    expect(rank0).toBeInstanceOf(Val);
    expect(rank0.value.isUnity()).toBe(true);
  });

  it('can construct the zero val (warts)', () => {
    const rank0 = evaluate('0@2.3.5') as Val;
    expect(rank0).toBeInstanceOf(Val);
    expect(rank0.value.isUnity()).toBe(true);
  });

  it('can construct the zero val (SOV)', () => {
    const rank0 = evaluate('0[]@2.3.5') as Val;
    expect(rank0).toBeInstanceOf(Val);
    expect(rank0.value.isUnity()).toBe(true);
  });

  it('can construct <0 0 1] (literal)', () => {
    const fives = evaluate('<0 0 1]') as Val;
    expect(fives).toBeInstanceOf(Val);
    expect(fives.value.toIntegerMonzo()).toEqual([0, 0, 1]);
  });

  it('can construct <0 0 1] (warts)', () => {
    const fives = evaluate('0c@.5') as Val;
    expect(fives).toBeInstanceOf(Val);
    expect(fives.value.toIntegerMonzo()).toEqual([0, 0, 1]);
  });

  it('can construct <0 0 1] (SOV)', () => {
    const fives = evaluate('0[+5]@2..5') as Val;
    expect(fives).toBeInstanceOf(Val);
    expect(fives.value.toIntegerMonzo()).toEqual([0, 0, 1]);
  });

  it('can convert <0 0 1] to warts', () => {
    const c0 = evaluate('str(warts(<0 0 1]))');
    expect(c0).toBe('0c@2.3.5');
  });

  it('can convert <0 0 1] to SOV', () => {
    const c0 = evaluate('str(SOV(<0 0 1]))');
    expect(c0).toBe('0[^5]@2.3.5');
  });

  it('can invert a rational matrix', () => {
    const inverse = evaluate(`
      inv([
        [1, 2, 3],
        [-4, 5, 6],
        [7, 8, -9],
      ])
    `) as unknown as Interval[][];
    expect(
      inverse.map(row => row.map(i => i.toFraction().toFraction()))
    ).toEqual([
      ['31/94', '-7/47', '1/94'],
      ['-1/47', '5/47', '3/47'],
      ['67/282', '-1/47', '-13/282'],
    ]);
  });

  it('can invert a real matrix', () => {
    const inverse = evaluate(
      'inv([[PI, 1\\2], [-E, √5 - √3]])'
    ) as unknown as Interval[][];
    expect(inverse.map(row => row.map(i => i.valueOf().toFixed(4)))).toEqual([
      ['0.0929', '-0.2606'],
      ['0.5008', '0.5788'],
    ]);
  });

  it('can compute a rational determinant', () => {
    const {fraction} = parseSingle(`
      det([
        [1, 2, 3],
        [-1/2, 1/3, 1/4],
        [0, 2, 7/5],
      ]);
    `);
    expect(fraction).toBe('-49/30');
  });

  it('can compute a real determinant', () => {
    const d = evaluate('det([[-PI, E], [1\\3, 0r]])');
    expect(d?.valueOf()).toBeCloseTo(-3.42482);
  });

  it('can do the LLL', () => {
    const reduced = evaluate('str(lll(basis(4125/4096, 385/384)))');
    expect(reduced).toBe('@225/224.540/539');
  });

  it('respells 531441/262144 using 81/80', () => {
    const {fraction} = parseSingle('respell(81/80)(531441/262144)');
    expect(fraction).toBe('125/64');
  });

  it('respells 531441/262144 using 128/125', () => {
    const {fraction} = parseSingle('respell(128/125)(531441/262144)');
    expect(fraction).toBe('531441/250000');
  });

  it('respells 531441/262144 using [81/80, 128/125, 135/128]', () => {
    const {fraction} = parseSingle(
      'respell([81/80, 128/125, 135/128])(531441/262144)'
    );
    expect(fraction).toBe('1');
  });

  it('re-organizes named subgroups', () => {
    const str = evaluate('const S = @2.3.7;str(b39@S) " but " str(S)');
    expect(str).toBe('withBasis(<25 39 0 69], @3.2.7) but @2.3.7');
  });

  it('has pythonic ternary comparison (less than)', () => {
    const sure = evaluate('-1 < 0 < 1');
    expect(sure).toBe(true);
  });

  it('has pythonic ternary comparison (greater than)', () => {
    const sure = evaluate('5 >= 5 > 4');
    expect(sure).toBe(true);
  });

  it('can respell square roots away (single comma)', () => {
    const {fraction} = parseSingle('respell(2048/2025)(2 /^ 2)');
    expect(fraction).toBe('45/32');
  });

  it('can respell square roots away (multiple commas)', () => {
    const {fraction} = parseSingle(
      'respell([64/63, 78/77, 144/143], 3)(3/2 /^ 2)'
    );
    expect(fraction).toBe('11/9');
  });

  it("doesn't aspire relative when the value is absolute", () => {
    const str = evaluate('A4 = 440z;str(A4 *~ a1)');
    expect(str).toBe('[1 -8 7 1 0 1>@Hz.2..');
  });

  it('has sanity limits on Pythagorean conversion', () => {
    expect(() => evaluate('FJS([-1000 1000>)')).toThrow();
  });

  it('has sanity limits on FJS conversion', () => {
    expect(() => evaluate('FJS([0 -2000 500>)')).toThrow();
  });

  it('has computed S-expressions', () => {
    const {interval, fraction} = parseSingle('S(5)');
    expect(interval.domain).toBe('logarithmic');
    expect(fraction).toBe('25/24');
  });

  it('coalesces niente', () => {
    const {fraction} = parseSingle('niente al 2');
    expect(fraction).toBe('2');
  });

  it('coalesces niente (al~)', () => {
    const {fraction} = parseSingle('niente al~ 2');
    expect(fraction).toBe('2');
  });

  it('has SMP spelling for 9/5', () => {
    const {fraction} = parseSingle('C4 = 1;B𝄬4');
    expect(fraction).toBe('9/5');
  });

  it('throws if you try to take the absolute value of a frequency', () => {
    expect(() => evaluate('abs 432 Hz')).toThrow();
  });

  it('treats the empty object as falsy', () => {
    expect(evaluate('bool(#{})')).toBe(false);
  });

  it('treats the empty basis as falsy', () => {
    expect(evaluate('bool(basis())')).toBe(false);
  });

  it('treats 0p as truthy', () => {
    expect(evaluate('bool(0@)')).toBe(true);
  });

  it('converts to exact cents with 12 fraction digits', () => {
    const {value} = parseSingle('cents(3/2, 12)');
    expect(
      value.primeExponents[0].equals('701955000865387/1200000000000000')
    ).toBe(true);
  });

  it('converts to real cents when 13 fraction digits is attempted', () => {
    const interval = evaluateExpression('cents(3/2, 13)');
    expect(interval!.toString()).toBe('701.9550008653874r¢');
  });

  // The prime limit is too high for this to succeed.
  it.fails('converts 10657/8748 to FJS', () => {
    const interval = evaluateExpression('FJS(10657/8748)');
    console.log(interval!.toString());
  });

  // This one runs out of primes.
  it.fails('represents a-92^10657', () => {
    const interval = evaluateExpression('a-92^10657');
    console.log(interval!.toString());
  });
});
