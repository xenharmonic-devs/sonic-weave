import {describe, it, expect} from 'vitest';
import {
  evaluateExpression,
  parseAST,
  evaluateSource,
  StatementVisitor,
} from '../parser';
import {TimeMonzo} from '../monzo';
import {Color, Interval} from '../interval';
import {RootContext} from '../context';

function parseSingle(source: string) {
  const value = evaluateExpression(source);
  expect(value).toBeInstanceOf(Interval);
  return value as Interval;
}

function parseSource(source: string) {
  const visitor = evaluateSource(source);
  return visitor.context.get('$') as Interval[];
}

describe('SonicWeave expression evaluator', () => {
  it('evaluates a single number', () => {
    const value = parseSingle('3');
    expect(value.value.toBigInteger()).toBe(3n);
  });

  it('adds two nedos with denominator preference', () => {
    const interval = parseSingle('4\\12 + 2\\12');
    expect(interval.toString()).toBe('6\\12');
  });

  it('adds a number to nedo (left preference)', () => {
    const interval = parseSingle('2 ~+ 3\\3');
    expect(interval.toString()).toBe('4');
  });

  it('adds a number to nedo (right preference)', () => {
    const interval = parseSingle('2 +~ 3\\3');
    expect(interval.toString()).toBe('6\\3');
  });

  it('adds a number to nedo (impossible right preference)', () => {
    const interval = parseSingle('1 +~ 3\\3');
    expect(interval.toString()).toBe('1\\1<3>');
  });

  it('accesses variables', () => {
    const interval = parseSingle('TAU');
    // The correct value is actually 6.283185307179586, but it gets mushed a bit along the way.
    expect(interval.toString()).toBe('6.283185307179587!');
  });

  it('evaluates a color', () => {
    const purple = evaluateExpression('#dc12ab');
    expect(purple).instanceOf(Color);
    expect((purple as Color).value).toBe('#dc12ab');
  });

  it('adds hertz', () => {
    const interval = parseSingle('69 mHz + 420 Hz + 9 kHz');
    expect(interval.toString()).toBe('9420.069 Hz');
  });

  it('subtracts cents', () => {
    const interval = parseSingle('1.955 - c');
    expect(interval.value.totalCents()).toBeCloseTo(0.955);
  });

  it('supports pythagorean relative notation', () => {
    const sixth = parseSingle('M6');
    expect(sixth.value.toFraction().toFraction()).toBe('27/16');
    expect(sixth.toString()).toBe('M6');
  });

  it('supports neutral intervals', () => {
    const halfFifth = parseSingle('n3');
    expect(halfFifth.value.valueOf()).toBeCloseTo(Math.sqrt(1.5));
  });

  it('supports quarter-augmented intervals', () => {
    const fourthFifth = parseSingle('sM2');
    expect(fourthFifth.value.valueOf()).toBeCloseTo(1.5 ** 0.25);
  });

  it('supports tone-splitter interordinal', () => {
    const splitTone = parseSingle('n1.5');
    expect(splitTone.value.valueOf()).toBeCloseTo(Math.sqrt(9 / 8));
  });

  it('supports semiquartal interordinals', () => {
    const semifourth = parseSingle('m2.5');
    expect(semifourth.value.valueOf()).toBeCloseTo(Math.sqrt(4 / 3));
  });

  it("has mid from ups-and-downs but it's spelled 'n' and mixes with NFJS", () => {
    const undecimalMidFourth = parseSingle('n4^11');
    expect(undecimalMidFourth.value.toFraction().toFraction()).toBe('11/8');
    const undecimalMidFifth = parseSingle('n5_11');
    expect(undecimalMidFifth.value.toFraction().toFraction()).toBe('16/11');
  });

  it("doesn't have '~8' like ups-and-downs doesn't", () => {
    expect(() => parseSingle('n8')).toThrow();
  });

  it('parses monzos', () => {
    const monzo = parseSingle('[+7, 11e-1, 1.4>');
    expect(monzo.domain).toBe('logarithmic');
    const pe = monzo.value.primeExponents;
    expect(pe[0].toFraction()).toBe('7');
    expect(pe[1].toFraction()).toBe('11/10');
    expect(pe[2].toFraction()).toBe('7/5');
    expect(monzo.toString()).toBe('[7 11e-1 1.4>');
  });

  it('parses vals', () => {
    const val = parseSingle('<5/3 , -1.001e1]');
    expect(val.domain).toBe('cologarithmic');
    const pe = val.value.primeExponents;
    expect(pe[0].toFraction()).toBe('5/3');
    expect(pe[1].toFraction()).toBe('-1001/100');
    expect(val.toString()).toBe('<5/3 -1.001e1]');
  });

  it('has reversed ranges', () => {
    const scale = evaluateExpression('[5, 4..1]');
    expect(Array.isArray(scale)).toBe(true);
    expect(scale).toHaveLength(5);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '5;4;3;2;1'
    );
  });

  it('has a reciprocal cent', () => {
    const one = parseSingle('c dot €');
    expect(one.toString()).toBe('1');
  });

  it('supports relative FJS', () => {
    const third = parseSingle('M3^5');
    expect(third.value.toFraction().toFraction()).toBe('5/4');
    expect(third.toString()).toBe('M3^5');
  });

  it('supports neutral FJS', () => {
    const sixth = parseSingle('n6_11');
    expect(sixth.value.toFraction().toFraction()).toBe('18/11');
    expect(sixth.toString()).toBe('n6_11');
  });

  it('can convert time to frequency', () => {
    const freq = parseSingle('ablin(2ms)');
    expect(freq.value.valueOf()).toBe(500);
  });

  it('parses the cursed tritone', () => {
    const tritone = parseSingle('14E-1');
    expect(tritone.value.toFraction().toFraction()).toBe('7/5');
    expect(tritone.toString()).toBe('14e-1');
  });

  it('parses nedji', () => {
    const darkFifth = parseSingle('7\\5<4/3>');
    const {fractionOfEquave, equave} = darkFifth.value.toEqualTemperament();
    expect(fractionOfEquave.toFraction()).toBe('7/5');
    expect(equave.toFraction()).toBe('4/3');
    expect(darkFifth.toString()).toBe('7\\5<4/3>');
  });

  it('has a nominal for a fourth split in four', () => {
    const deeSemiAt = parseSingle('C0 = 1/1; D½@0');
    expect(deeSemiAt.value.pow(4).toFraction().toFraction()).toBe('4/3');
  });

  it('can color and label an interval directly', () => {
    const greenFifth = parseSingle('1,5 green "fifth"');
    expect(greenFifth.color?.value).toBe('#008000');
    expect(greenFifth.label).toBe('fifth');
  });

  it('can format the half eleventh', () => {
    const neutralSixth = parseSingle('P11 % 2');
    expect(neutralSixth.toString()).toBe('n6');
  });

  it('can format the double tone', () => {
    const majorThird = parseSingle('M2 * 2');
    expect(majorThird.toString()).toBe('M3');
  });

  it('can format the half twelfth', () => {
    const majorSixAndAHalfth = parseSingle('P12 % 2');
    expect(majorSixAndAHalfth.toString()).toBe('M6.5');
  });

  it("bails out when there's no Pythagorean to match", () => {
    const thirdFifth = parseSingle('P5 % 3');
    expect(thirdFifth.toString()).toBe('1\\3<3/2>');
  });

  it('has a constant structure calculator', () => {
    // 6\12 is ambiguous as a fourth and a fifth
    const no = parseSingle('hasConstantStructure(mos(5, 2))');
    expect(no.toString()).toBe('false');
    // Augmented fourth and diminished fifth are distinct in 19 edo
    const yes = parseSingle('hasConstantStructure(mos(5, 2, 3, 2))');
    expect(yes.toString()).toBe('true');
  });
});

describe('SonicWeave parser', () => {
  it('evaluates zero', () => {
    const scale = parseSource('0;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.toBigInteger()).toBe(0n);
  });

  it('colors a single number', () => {
    const scale = parseSource('2;#f00;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.toBigInteger()).toBe(2n);
    expect(scale[0].color?.value).toBe('#f00');
  });

  it('adds two numbers', () => {
    const scale = parseSource('3 + 4;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.value.toBigInteger()).toBe(7n);
    if (interval.node?.type === 'IntegerLiteral') {
      expect(interval.node.value).toBe(7n);
    } else {
      expect.fail();
    }
  });

  it('can call built-in functions', () => {
    const scale = parseSource('7;1;2;TAU;1\\2;sort();');
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1;1\\2;2;6.283185307179587!;7'
    );
  });

  it('can declare variables', () => {
    const ast = parseAST('i = 676/675 /* The Island comma */;');
    const visitor = new StatementVisitor(new RootContext());
    visitor.visit(ast.body[0]);
    expect(visitor.context.get('i')?.toString()).toBe('676/675');
  });

  it('can invert a scale', () => {
    const scale = parseSource(`
      2;3;4;5;6;7;8; // Build scale
      equave = pop(); // Pop from the scale
      i => equave %~ i; // Functions map over the scale implicitly
      reverse(); // Reverse the current scale
      equave; // The default action is to push onto the current scale
    `);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '8/7;4/3;8/5;2;8/3;4;8'
    );
  });

  it('can parse otonal chords', () => {
    const scale = parseSource('5:TAU:7:3\\1:9:10;');
    expect(scale).toHaveLength(5);

    expect(scale[0].domain).toBe('linear');
    expect(scale[1].domain).toBe('linear');
    expect(scale[2].domain).toBe('logarithmic');
    expect(scale[3].domain).toBe('linear');
    expect(scale[4].domain).toBe('linear');

    expect(scale[0].value.valueOf()).toBeCloseTo((2 * Math.PI) / 5);
    expect(scale[1].value.toFraction().equals('7/5')).toBe(true);
    expect(scale[2].value.toFraction().equals('8/5')).toBe(true);
    expect(scale[3].value.toFraction().equals('9/5')).toBe(true);
    expect(scale[4].value.toBigInteger()).toBe(2n);
  });

  it('can parse harmonic series segments', () => {
    const scale = parseSource('4 :: 8;');
    expect(scale.map(i => i.toString()).join(';')).toBe('5/4;6/4;7/4;8/4');
  });

  it('can declare functions', () => {
    const ast = parseAST('riff plusOne x { x ~+ 1; }');
    const visitor = new StatementVisitor(new RootContext());
    visitor.visit(ast.body[0]);
    expect(visitor.context.has('plusOne')).toBe(true);
    const two = new Interval(TimeMonzo.fromBigInt(2n), 'linear');
    expect(
      (visitor.context.get('plusOne') as Function)
        .bind(visitor)(two)[0]
        .value.toBigInteger()
    ).toBe(3n);
  });

  it('can call a custom function', () => {
    const scale = parseSource(`
      riff sqrt x { x ~^ 1/2; }
      sqrt(3);
    `);
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('3^1/2');
  });

  it('can call custom functions as expressions', () => {
    const scale = parseSource(`
      riff cbrt x { return x ~^ 1/3; }
      cbrt(5) * cbrt(5) * cbrt(5);
    `);
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('5');
  });

  it('parses hard decimals (reals)', () => {
    const scale = parseSource('1.6180339887498948482!;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.value.valueOf()).toBeCloseTo(Math.sqrt(1.25) + 0.5);
  });

  it('can return from inside nested statements', () => {
    const scale = parseSource('riff foo { while(1) return 2; } foo();');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.value.toBigInteger()).toBe(2n);
  });

  it('can affect the outer context from inside a block statement', () => {
    let i = 5;
    while (i) {
      i--;
    }
    const scale = parseSource('i = 5; while (i) { i--; }');
    expect(scale).toHaveLength(5);
    expect(scale.map(i => i.toString()).join(';')).toBe('5;4;3;2;1');
  });

  it('supports explicit arguments to builtin functions', () => {
    const scale = parseSource(`
      segment = [1..5];
      segment;
      reverse(segment);
      map(i => i + 10, segment);
    `);
    expect(scale).toHaveLength(10);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1;2;3;4;5;15;14;13;12;11'
    );
  });

  it('can build scales from heterogenous arrays', () => {
    const scale = parseSource('[2, #fae, 3, "three", [4, #dad]];');
    expect(scale).toHaveLength(3);
    expect(scale[0].color?.value).toBe('#fae');
    expect(scale[1].label).toBe('three');
    expect(scale[2].color?.value).toBe('#dad');
  });

  it('can round to nearest harmonic', () => {
    const scale = parseSource('1\\3;2\\3;3\\3;i => i to~ 1/8;');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('10/8;13/8;16/8');
  });

  it('can approximate by equal temperament', () => {
    const scale = parseSource('2;3;5;p => p by~ 1\\12;');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('12\\12;19\\12;28\\12');
  });

  it('can call functions from arrays', () => {
    const scale = parseSource('[round, abs][0](3,14);');
    expect(scale).toHaveLength(1);
    expect(scale[0].toString()).toBe('3');
  });

  it('supports pythagorean absolute notation', () => {
    const scale = parseSource('C4 = 262 Hz; A=4;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.valueOf()).toBeCloseTo(442.12);
  });

  it('supports interordinal nominals', () => {
    const scale = parseSource('C6 = 1000 Hz; ζ6;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.valueOf()).toBeCloseTo(1414.213562373095);
  });

  it('can spell the major scale in Latin', () => {
    const scale = parseSource('C0=1/1;D0;E0;F0;G0;A0;B0;C1;');
    expect(scale).toHaveLength(7);
    expect(scale.map(i => i.value.toFraction().toFraction()).join(';')).toBe(
      '9/8;81/64;4/3;3/2;27/16;243/128;2'
    );
  });

  it('can spell the major scale in Greek', () => {
    const scale = parseSource('ζ0=1/1;η0;α0;β0;γ1;δ1;ε1;ζ1;');
    expect(scale).toHaveLength(7);
    expect(scale.map(i => i.value.toFraction().toFraction()).join(';')).toBe(
      '9/8;81/64;4/3;3/2;27/16;243/128;2'
    );
  });

  it('can spell diaschismic antisymmetrically', () => {
    const scale = parseSource(`
      // Scale Workshop 3 will add this line automatically.
      // Declare base nominal and frequency.
      C0 = 1/1 = 261.6 Hz;

      // First cycle (Greek - Latin - Greek...)
      gamma0; // Or γ0 if you want to get fancy.
      D0;
      delta0;
      E0;
      epsilon0; // Or F0 depending on taste.
      zeta0; // Period

      // Second cycle (Latin - Greek - Latin ...)
      G0;
      eta0;
      A0;
      alpha0;
      B0; // Or beta0 depending on taste.
      C1; // Equave = 2 * period

      // Temperament
      12@;
    `);
    expect(scale).toHaveLength(12);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\12;2\\12;3\\12;4\\12;5\\12;6\\12;7\\12;8\\12;9\\12;10\\12;11\\12;12\\12'
    );
  });

  it('supports absolute FJS', () => {
    const scale = parseSource('C6 = 1kHz; Bb6^7;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.valueOf()).toBeCloseTo(1750);
  });

  it('can implicitly temper a major chord in 12edo', () => {
    const scale = parseSource('5/4;3/2;12@;');
    expect(scale).toHaveLength(2);
    expect(scale.map(i => i.toString()).join(';')).toBe('4\\12;7\\12');
  });

  it('has ups-and-downs', () => {
    const scale = parseSource('C0=1/1;^C0;γ0;vD0;D0;22@;');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\22;2\\22;3\\22;4\\22'
    );
  });

  it('can construct well-temperaments (manual)', () => {
    const scale = parseSource(`
      // Bach / Louie 2018
      g = relog(3/2);
      p = relog(531441/524288);
      equave = relog(2);
      // Down
      -g;
      $[-1] - g;
      $[-1] - g;
      $[-1] - g;
      // Up
      g - p % 6;
      $[-1] + g - p % 6;
      $[-1] + g - p % 6;
      $[-1] + g - p % 6;
      $[-1] + g - p % 6;
      $[-1] + g - p % 18;
      $[-1] + g - p % 18;
      // Reduce
      i => i mod equave;
      sort();
      // Equave
      equave;
      cents;
    `);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '91.5283295833232842!c;196.08999826922536158!c;294.13499740383849712!c;392.17999653845072316!c;498.04499913461268079!c;590.8766626281940262!c;698.04499913461268079!c;792.17999653845072316!c;894.13499740383849712!c;996.08999826922536158!c;1090.2249956730629492!c;1200.'
    );
  });

  it('can rig ups-and-downs (builtin)', () => {
    const scale = parseSource(`
      vM3
      P5
      ^m6
      P8
      upsAs(81/80)
    `);
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('M3^5;P5;m6_5;P8');
  });

  it('can rig ups-and-downs (manual)', () => {
    const scale = parseSource(`
      riff rig i {
        ups = round(1!€ dot i);
        return i ~% (1!c * ups) ~* 81/80 ^ ups;
      }
      vM3;P5;P8;
      rig;
      relin;
    `);
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('5/4;3/2;2');
  });

  it('can construct the hard cotritave', () => {
    const scale = parseSource(`
      tritave = 1! * relog(3);
      cotritave = %tritave;
      tritave dot cotritave;
    `);
    expect(scale).toHaveLength(1);
    expect(scale.map(i => i.toString()).join(';')).toBe('1');
  });

  it('has CSS colors', () => {
    const scale = parseSource('C4 = 1/1; C#4; black; D4; white;');
    expect(scale).toHaveLength(2);
    expect(scale[0].color?.value).toBe('#000000');
    expect(scale[1].color?.value).toBe('#FFFFFF');
  });

  it('does polyoffsets as tensor products', () => {
    const scale = parseSource(
      '2:3:4; $ tns 4:5:7; i => i red 2; sort(); shift() * 2;'
    );
    expect(scale).toHaveLength(6);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '5/4;21/16;3/2;7/4;15/8;2'
    );
  });

  it('has demisemiquartal notation for 19edo', () => {
    const scale = parseSource(`
      C0 = 1/1;
      C½&0;
      D½@0;
      D0;
      φ0;
      φ½&0;
      χ½@0;
      χ0;
      F0;
      F½&0;
      Ga0;
      G0;
      Ge0;
      A½@0;
      A0;
      ψ0;
      ψ½&0;
      ω½@0;
      ω0;
      C1;
      19@;
    `);
    expect(
      (scale as Interval[]).map(i =>
        i.value.toEqualTemperament().fractionOfEquave.mul(19).valueOf()
      )
    ).toEqual([...Array(20).keys()].slice(1));
  });

  it('has automatic semicolon insertion', () => {
    const scale = parseSource(`
      9/8
      1 +
       1/2
      P8
    `);
    expect(scale).toHaveLength(3);
    expect(
      (scale as Interval[])
        .map(i => i.value.toFraction().toFraction())
        .join(';')
    ).toBe('9/8;3/2;2');
  });

  it('can detect primality', () => {
    const scale = parseSource(`
      -1;
      2;
      6;
      11;
      isPrime
    `);
    expect(scale).toHaveLength(4);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      'false;true;false;true'
    );
  });

  it('can list primes', () => {
    const scale = parseSource('primes(3, 22)');
    expect(scale).toHaveLength(7);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '3;5;7;11;13;17;19'
    );
  });

  it('supports expressions inside ranges', () => {
    const scale = parseSource(`
      factors = [1, 3, 5, 7]
      for (i of [0 .. length(factors)-1]) {
        factors[i] + i
      }
    `);
    expect(scale).toHaveLength(4);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '1;4;7;10'
    );
  });

  it('can label intervals after generating', () => {
    const scale = parseSource(`
      4/3
      3/2
      2
      label(["fourth", "fifth", "octave"])
    `);
    expect(scale).toHaveLength(3);
    expect(scale[0].label).toBe('fourth');
    expect(scale[1].label).toBe('fifth');
    expect(scale[2].label).toBe('octave');
  });
});

describe('SonicWeave standard library', () => {
  it('converts MIDI note number to frequency', () => {
    const scale = parseSource('mtof(60);');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('4685120000^1/4 * Hz');
  });

  it('converts frequency to MIDI note number / MTS value', () => {
    const scale = parseSource('ftom(261.6 Hz);');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.value.valueOf()).toBeCloseTo(60);
  });

  it('generates equal temperaments', () => {
    const scale = parseSource('ed(6);');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\6;2\\6;3\\6;4\\6;5\\6;6\\6'
    );
  });

  it('generates tritave equivalent equal temperaments', () => {
    const scale = parseSource('ed(3, 3);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\3<3>;2\\3<3>;3\\3<3>'
    );
  });

  it('generates MOS scales', () => {
    const scale = parseSource('mos(5, 2, niente, niente, 5);');
    expect(scale).toHaveLength(7);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '2\\12;4\\12;5\\12;7\\12;9\\12;11\\12;12\\12'
    );
  });

  it('generates subharmonic segments', () => {
    const scale = parseSource('subharmonics(4, 8);');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('8/7;8/6;8/5;8/4');
  });

  it('generates rank-2 scales', () => {
    const scale = parseSource('rank2(707.048, 2, 2, 600.0, 2);');
    expect(scale).toHaveLength(10);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '107.048;214.096;385.904;492.952;600.0;707.048;814.096;985.904;1092.952;1200.'
    );
  });

  it('generates combination product sets (default params)', () => {
    const scale = parseSource('cps([3, 5, 7], 2);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('7/6;7/5;2');
  });

  it('generates combination product sets (custom)', () => {
    const scale = parseSource('cps([2, 5, 7], 2, 3, true);');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('10/9;35/27;14/9;3');
  });

  it('generates well-temperaments', () => {
    const werckmeister3 = parseSource(
      'wellTemperament([0, 0, 0, -1/4, -1/4, -1/4, 0, 0, -1/4, 0, 0], 81/80, 8);cents;'
    );
    expect(werckmeister3).toHaveLength(12);
    expect(werckmeister3.map(i => i.toString()).join(';')).toBe(
      '92.17871646099638383!c;193.15685693241744048!c;294.13499740383849712!c;391.6902862640135936!c;498.04499913461268079!c;590.22371559560951937!c;696.5784284662087202!c;794.1337173263841578!c;889.7352853986262744!c;996.08999826922536158!c;1093.6452871294009128!c;1200.'
    );
  });

  it('generates a cube', () => {
    const scale = parseSource('spanLattice([3, 5, 7]);');
    expect(scale).toHaveLength(8);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '35/32;5/4;21/16;3/2;105/64;7/4;15/8;2'
    );
  });

  it('generates Euler-Fokker genera', () => {
    const scale = parseSource('eulerGenus(45);');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '9/8;5/4;45/32;3/2;15/8;2'
    );
  });

  it('generates the Easter egg', () => {
    const scale = parseSource('octaplex(3, 5, 7, 11);');
    expect(scale).toHaveLength(24);
  });

  it('can take edo subsets', () => {
    const scale = parseSource('ed(7);subset([0, 1, 6]);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('1\\7;2\\7;7\\7');
  });

  it('can take relative edo subsets', () => {
    const scale = parseSource(
      'ed(12);subset(cumsum([2 - 1, 2, 1, 2, 2, 2, 1]));'
    );
    expect(scale).toHaveLength(7);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '2\\12;4\\12;5\\12;7\\12;9\\12;11\\12;12\\12'
    );
  });

  it('reduces scales by their equave', () => {
    const scale = parseSource('3;5;7;11;13;2;reduce();');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '3/2;5/4;7/4;11/8;13/8;2'
    );
  });

  it('has a nothing', () => {
    const scale = parseSource('niente;');
    expect(scale).toHaveLength(0);
  });

  it('inverts scales', () => {
    const scale = parseSource('1\\6;2\\6;3\\6;6\\6;invert();');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('3\\6;4\\6;5\\6;6\\6');
  });

  it('rotates scales one step', () => {
    const scale = parseSource('1\\6;2\\6;6\\6;rotate();');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('1\\6;5\\6;6\\6');
  });

  it('rotates scales two steps', () => {
    const scale = parseSource('1\\6;2\\6;6\\6;rotate(2);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('4\\6;5\\6;6\\6');
  });

  it('clears the scale', () => {
    const scale = parseSource('2;clear();');
    expect(scale).toHaveLength(0);
  });

  it('clears the scale (repeat(0))', () => {
    const scale = parseSource('2;repeat(0);');
    expect(scale).toHaveLength(0);
  });

  it('can round to nearest subharmonic', () => {
    const scale = parseSource('1\\3;2\\3;3\\3;toSubharmonics(16);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('16/13;16/10;16/8');
  });

  it('can merge offset copies', () => {
    const zarlino = parseSource(
      'rank2(3/2, 3); mergeOffset(5/4); rotate(4); simplify;'
    );
    expect(zarlino).toHaveLength(7);
    expect(zarlino.map(i => i.toString()).join(';')).toBe(
      '9/8;5/4;4/3;3/2;5/3;15/8;2'
    );
  });

  it('can merge offset copies with overflow preferences', () => {
    const scale = parseSource(
      'rank2(3/2, 3); mergeOffset(5/4, "wrap"); rotate(2); simplify;'
    );
    expect(scale).toHaveLength(8);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '10/9;5/4;4/3;3/2;5/3;16/9;15/8;2'
    );
  });

  it('makes sense of negative offsets', () => {
    const drop = parseSource('2;mergeOffset(1/3, "drop");');
    expect(drop.map(i => i.toString()).join(';')).toBe('2');
    const wrap = parseSource('2;mergeOffset(1/3, "wrap");');
    expect(wrap.map(i => i.toString()).join(';')).toBe('4/3;2');
    const keep = parseSource('2;mergeOffset(1/3, "keep");');
    expect(keep.map(i => i.toString()).join(';')).toBe('1/3;2');
  });

  it('can merge polyoffsets', () => {
    const scale = parseSource('2:3:4; mergeOffset(4:5:7, "wrap");');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '5/4;21/16;3/2;7/4;15/8;2'
    );
  });

  it('can compress a scale', () => {
    const scale = parseSource('3/2;2;stretch(0,99);');
    expect(scale).toHaveLength(2);
    expect(scale[0].value.valueOf()).toBeCloseTo(1.494);
    expect(scale[1].value.valueOf()).toBeCloseTo(1.986);
  });

  it('can randomize a scale (stable equave)', () => {
    const scale = parseSource('4/3;2;randomVariance(10.0);');
    expect(scale).toHaveLength(2);
    expect(scale[0].value.valueOf()).greaterThan(1.32);
    expect(scale[0].value.valueOf()).lessThan(1.342);
    expect(scale[1].value.valueOf()).toBe(2);
  });

  it('can randomize a scale (unstable equave)', () => {
    const scale = parseSource('4/3;2;randomVariance(10.0, true);');
    expect(scale).toHaveLength(2);
    expect(scale[0].value.valueOf()).greaterThan(1.32);
    expect(scale[0].value.valueOf()).lessThan(1.342);
    expect(scale[1].value.valueOf()).not.toBe(2); // There's like a one in a quadrillion chance that this fails.
    expect(scale[1].value.valueOf()).greaterThan(1.98);
    expect(scale[1].value.valueOf()).lessThan(2.02);
  });

  it('can generate alternating generator sequences (diasem #1)', () => {
    const scale = parseSource('ags([8/7, 7/6]);');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('8/7;8/6;32/21;2');
  });

  it('can generate alternating generator sequences (diasem #2)', () => {
    const scale = parseSource('ags([8/7, 7/6], 2);');
    expect(scale).toHaveLength(5);
    expect(scale.map(i => i.toString()).join(';')).toBe('8/7;8/6;32/21;16/9;2');
  });

  it('can generate alternating generator sequences (diasem #3)', () => {
    const scale = parseSource('ags([8/7, 7/6], 3);');
    expect(scale).toHaveLength(9);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '64/63;8/7;32/27;8/6;256/189;32/21;128/81;16/9;2'
    );
  });

  it('throws for ags with no constant structure', () => {
    expect(() => parseSource('ags([8/7, 7/6, 8/7], 3);')).toThrow();
  });
});
