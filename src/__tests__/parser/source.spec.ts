import {describe, it, expect} from 'vitest';
import {
  parseAST,
  evaluateSource,
  StatementVisitor,
  getSourceVisitor,
} from '../../parser';
import {TimeMonzo} from '../../monzo';
import {Interval} from '../../interval';
import {RootContext} from '../../context';
import {relin} from '../../builtin';

function parseSource(source: string) {
  const visitor = evaluateSource(source);
  return visitor.mutables.get('$') as Interval[];
}

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
      '1;1\\2;2;6.283185307179587r;7'
    );
  });

  it('can declare variables', () => {
    const ast = parseAST('const i = 676/675 /* The Island comma */;');
    const visitor = new StatementVisitor(new RootContext());
    visitor.visit(ast.body[0]);
    expect(visitor.get('i')?.toString()).toBe('676/675');
  });

  it('can invert a scale', () => {
    const scale = parseSource(`
      2;3;4;5;6;7;8; // Build scale
      const equave = pop(); // Pop from the scale
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
    expect(visitor.immutables.has('plusOne')).toBe(true);
    const two = new Interval(TimeMonzo.fromBigInt(2n), 'linear');
    expect(
      (visitor.get('plusOne') as Function)
        .bind(visitor.createExpressionVisitor())(two)[0]
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
    const scale = parseSource('1.6180339887498948482r;');
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
    const scale = parseSource('let i = 5; while (i) { i--; }');
    expect(scale).toHaveLength(5);
    expect(scale.map(i => i.toString()).join(';')).toBe('5;4;3;2;1');
  });

  it('supports explicit arguments to builtin functions', () => {
    const scale = parseSource(`
      const segment = [1..5];
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

  it('has soft-jaric accidentals', () => {
    const scale = parseSource('C0=1/1;Cr0;γ0;Dp0;D0;22@;');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\22;2\\22;3\\22;4\\22'
    );
  });

  it('can construct well-temperaments (manual)', () => {
    const scale = parseSource(`
      // Bach / Louie 2018
      const g = relog(3/2);
      const p = relog(531441/524288);
      const equave = relog(2);
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
      '91.5283295833232842rc;196.08999826922536158rc;294.13499740383849712rc;392.17999653845072316rc;498.04499913461268079rc;590.8766626281940262rc;698.04499913461268079rc;792.17999653845072316rc;894.13499740383849712rc;996.08999826922536158rc;1090.2249956730629492rc;1200.'
    );
  });

  it('can rig ups-and-downs', () => {
    const scale = parseSource(`
      ^ = 81/80

      vM3
      P5
      ^m6
      P8

      // Break fragiles
      ^ = 1\\

      FJS
    `);
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('M3^5;P5;m6_5;P8');
  });

  it('can rig lifts-and-drops', () => {
    const scale = parseSource(`
      / = 81/80

      \\M3
      P5
      /m6
      P8

      FJS
    `);
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('M3^5;P5;m6_5;P8');
  });

  it('can rig ups-and-downs (manual)', () => {
    const scale = parseSource(`
      riff rig i {
        const ups = round(1r€ dot i);
        return i ~% (1rc * ups) ~* 81/80 ^ ups;
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
      const tritave = 1r * relog(3);
      const cotritave = %tritave;
      tritave dot cotritave;
    `);
    expect(scale).toHaveLength(1);
    expect(scale.map(i => i.toString()).join(';')).toBe('1');
  });

  it('has CSS colors', () => {
    const scale = parseSource('C4 = 1/1; C#4; black; D4; white;');
    expect(scale).toHaveLength(2);
    expect(scale[0].color?.value).toBe('black');
    expect(scale[1].color?.value).toBe('white');
  });

  it('does polyoffsets as tensor products', () => {
    const scale = parseSource(
      '2:3:4; $ tns 4:5:7; i => i rd 2; sort(); shift() * 2;'
    );
    expect(scale).toHaveLength(6);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '5/4;21/16;3/2;7/4;15/8;2'
    );
  });

  it('has manual/semiquartal notation for 19edo', () => {
    const scale = parseSource(`
      C0 = 1/1;
      C&0;
      D@0;
      D0;
      φ0;
      φ&0;
      χ@0;
      χ0;
      F0;
      F&0;
      G@0;
      G0;
      G&0;
      A@0;
      A0;
      ψ0;
      ψ&0;
      ω@0;
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
      const factors = [1, 3, 5, 7]
      for (const i of [0 .. length(factors)-1]) {
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

  it('can average absolute pitches', () => {
    const visitor = evaluateSource('C4 = 261Hz; absoluteFJS((B4 + Bb4) % 2)');
    const beeSemiflat = visitor.get('$')![0];
    expect(beeSemiflat.toString(visitor.rootContext)).toBe('Bd4');
  });

  it('can convert monzo to absolute FJS', () => {
    const visitor = evaluateSource('C4 = 261Hz; absoluteFJS([0 -1 1>)');
    const pitch = visitor.get('$')![0];
    expect(pitch.toString(visitor.rootContext)).toBe('A♮4^5');
  });

  it('supports other roots besides C4', () => {
    const scale = parseSource(`
      A=3 = 200 Hz
      D=4
      E=4
      A=4
      relin;
    `);
    const ratios = scale.map(i => i.value.valueOf());
    expect(ratios[0]).toBeCloseTo(4 / 3);
    expect(ratios[1]).toBeCloseTo(3 / 2);
    expect(ratios[2]).toBeCloseTo(2 / 1);
  });

  it('supports guard rails against infinite loops', () => {
    const ast = parseAST('while (true) {}');

    const visitor = getSourceVisitor();
    visitor.rootContext.gas = 100;
    expect(() => visitor.visit(ast.body[0])).toThrow();
  });

  it('supports guard rails against huge segments', () => {
    const ast = parseAST('1000::2000');
    const visitor = getSourceVisitor();
    visitor.rootContext.gas = 100;
    expect(() => visitor.visit(ast.body[0])).toThrow();
  });

  it('supports guard rails against large tensors', () => {
    const ast = parseAST('[1..15] tns [1..15]');
    const visitor = getSourceVisitor();
    visitor.rootContext.gas = 100;
    expect(() => visitor.visit(ast.body[0])).toThrow();
  });

  it('can make edji', () => {
    const scale = parseSource(`
      1\\5<3>
      2\\5<3>
      5\\5<3>
    `);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '1\\5<3>;2\\5<3>;5\\5<3>'
    );
  });

  it('can expand basic scales', () => {
    const visitor = evaluateSource('5::10');
    expect(visitor.expand(visitor)).toBe('6/5\n7/5\n8/5\n9/5\n10/5');
  });

  it('can expand customized scales', () => {
    const visitor = evaluateSource(
      'A=4 = 440Hz = 1/1;^D4;A=4 = 432Hz;^ = 2\\;const syn=81/80;vD4~*syn;3;$[-1]=5;'
    );
    expect(visitor.expand(getSourceVisitor())).toBe(
      [
        'C4 = 256 Hz',
        '1/1 = 432 Hz',
        '^ = 2\\',
        'const syn = 81/80',
        '^D♮4^5,11 - 1\\',
        'vD♮4_5',
        '5',
      ].join('\n')
    );
  });

  it('can expand colored scales', () => {
    const visitor = evaluateSource(
      '4::8;$[1] = $[1] black; $[2] = $[2] "seventh"'
    );
    expect(visitor.expand(getSourceVisitor())).toBe(
      '5/4\n6/4 black\n7/4 "seventh"\n8/4'
    );
  });

  it('can sort scales after the fact', () => {
    const visitor = getSourceVisitor();
    const ast = parseAST('C5 = 256 Hz;const baseMidiNote = 72;');
    for (const statement of ast.body) {
      visitor.visit(statement);
    }
    const defaults = visitor.clone();
    defaults.rootContext = visitor.rootContext.clone();

    const userAst = parseAST('D4 = 270 Hz;let x = 7;D4;200Hz;x;3;2');
    for (const statement of userAst.body) {
      visitor.visit(statement);
    }
    const r = relin.bind(visitor);
    (visitor.get('$') as Interval[]).sort((a, b) => r(a).compare(r(b)));
    expect(visitor.expand(defaults)).toBe(
      [
        'C4 = 240 Hz',
        '1/1 = 270 Hz',
        'let x = 7',
        '200 Hz',
        'D4',
        '2',
        '3',
        '7',
      ].join('\n')
    );
  });

  it('breaks ups on monzos', () => {
    const oopsFourth = parseSource(`
      ^[2 -1>

      ^ = 81/80
    `);
    expect(oopsFourth.toString()).toBe('[2 -1>+1\\');
  });

  it('has syntax for subharmonic segments', () => {
    const scale = parseSource('/10::5');
    expect(scale).toHaveLength(5);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '10/9;10/8;10/7;10/6;10/5'
    );
  });

  it('has syntax for subharmonic chords', () => {
    const scale = parseSource('/8:7:6:5:4');
    expect(scale).toHaveLength(4);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '8/7;8/6;8/5;8/4'
    );
  });

  it('has rest syntax', () => {
    const scale = parseSource(`
      riff fun foo ...bar {return foo + bar[1]}
      fun(1, 2, 3, 4, 5, 6)
    `);
    expect(scale).toHaveLength(1);
    expect(scale[0].toInteger()).toBe(4);
  });

  it('can color enumerations', () => {
    const scale = parseSource('(5 white):(7 blue):(9 silver):10');
    expect(scale).toHaveLength(3);
    expect(scale[0].color?.value).toBe('blue');
    expect(scale[1].color?.value).toBe('silver');
    expect(scale[2].color?.value).toBe('white');
  });

  it('can color reflected enumerations', () => {
    const scale = parseSource('/(5 white):(7 blue):(9 silver):10');
    expect(scale).toHaveLength(3);
    expect(scale[0].color?.value).toBe('blue');
    expect(scale[1].color?.value).toBe('silver');
    expect(scale[2].color?.value).toBe('white');
  });

  // Manual inspection
  it.skip('has a coloring method based on interval size', () => {
    const colors = parseSource('[-12..24];n => n * 100.0;centsColor');
    console.log(colors);
  });

  // Manual inspection
  it.skip('has a coloring method base on prime factors', () => {
    const colors = parseSource(
      '[1/3, 1, 3, 9] tns [1/5, 1, 5, 25]; popAll() tns [1/7, 1, 7, 49]; factorColor'
    );
    console.log(colors);
  });
});
