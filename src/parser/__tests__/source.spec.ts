import {describe, it, expect} from 'vitest';
import {
  parseAST,
  evaluateSource,
  StatementVisitor,
  getSourceVisitor,
  getGlobalVisitor,
} from '../../parser';
import {TimeMonzo} from '../../monzo';
import {Interval} from '../../interval';
import {RootContext} from '../../context';
import {relative} from '../../stdlib';

function parseSource(source: string) {
  const visitor = evaluateSource(source, false);
  return visitor.mutables.get('$') as Interval[];
}

function expand(source: string) {
  const visitor = evaluateSource(source, false);
  return visitor.expand(visitor.rootContext!).split('\n');
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
      '1;1\\2;2;6.283185307179586r;7'
    );
  });

  it('can declare variables', () => {
    const ast = parseAST('const i = 676/675 (* The Island comma *);');
    const visitor = new StatementVisitor();
    visitor.rootContext = new RootContext();
    visitor.visit(ast.body[0]);
    expect(visitor.get('i')?.toString()).toBe('676/675');
  });

  it('can invert a scale', () => {
    const scale = parseSource(`
      2;3;4;5;6;7;8; (* Build scale *)
      const equave = pop(); (* Pop from the scale *)
      i => equave %~ i; (* Functions map over the scale implicitly *)
      reverse(); (* Reverse the current scale *)
      equave; (* The default action is to push onto the current scale *)
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
    const ast = parseAST('riff plusOne (x) { x ~+ 1; }');
    const visitor = new StatementVisitor();
    visitor.rootContext = new RootContext();
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
      riff sqrt(x){ x ~^ 1/2; }
      sqrt(3);
    `);
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('3^1/2');
  });

  it('can call custom functions as expressions', () => {
    const scale = parseSource(`
      riff cbrt( x ){ return x ~^ 1/3; }
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
    const scale = parseSource('riff foo() { while(1) return 2; } foo();');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.value.toBigInteger()).toBe(2n);
  });

  it('can affect the outer context from inside a block statement', () => {
    let i = 5;
    while (i) {
      --i;
    }
    const scale = parseSource('let i = 5; while (i) { --i; }');
    expect(scale).toHaveLength(5);
    expect(scale.map(i => i.toString()).join(';')).toBe('4;3;2;1;0');
  });

  it('supports explicit arguments to builtin functions', () => {
    const scale = parseSource(`
      const segment = [1..5];
      segment;
      reverseInPlace(segment);
      map(i => i + 10, segment);
    `);
    expect(scale).toHaveLength(10);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1;2;3;4;5;15;14;13;12;11'
    );
  });

  it('can build scales in two parts', () => {
    const scale = parseSource('[2, 3, 4 #dad];[#fae, "three", "four"];');
    expect(scale).toHaveLength(3);
    expect(scale[0].color?.value).toBe('#fae');
    expect(scale[1].label).toBe('three');
    expect(scale[2].color?.value).toBe('#dad');
    expect(scale[2].label).toBe('four');
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
    const scale = parseSource('[round, trunc][0](3,14);');
    expect(scale).toHaveLength(1);
    expect(scale[0].toString()).toBe('3');
  });

  it('supports pythagorean absolute notation', () => {
    const scale = parseSource('C4 = 262 Hz; A4;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.valueOf()).toBeCloseTo(442.12);
  });

  it('supports interordinal nominals', () => {
    const scale = parseSource('C6 = 1000 Hz; γ6;');
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
    const scale = parseSource('γ0=1/1;δ0;ε0;ζ0;η1;α1;β1;γ1;');
    expect(scale).toHaveLength(7);
    expect(scale.map(i => i.value.toFraction().toFraction()).join(';')).toBe(
      '9/8;81/64;4/3;3/2;27/16;243/128;2'
    );
  });

  it('can spell diaschismic antisymmetrically', () => {
    const scale = parseSource(`
      (* Scale Workshop 3 will add this line automatically.
        (* Declare base nominal and frequency. *)
      *)
      C0 = 1/1 = 261.6 Hz;

      (* First cycle: Greek - Latin - Greek... *)
      eta0; (* Or η0 if you want to get fancy. *)
      D0;
      alp0;
      E0;
      bet0; (* Or F0 depending on taste. *)
      gam0; (* Period *)

      (* Second cycle: Latin - Greek - Latin ... *)
      G0;
      del0;
      A0;
      eps0;
      B0; (* Or zet0 depending on taste. *)
      C1; (* Equave = 2 * period *)

      (* Temperament *)
      12@;
    `);
    expect(scale).toHaveLength(12);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\12;2\\12;3\\12;4\\12;5\\12;6\\12;7\\12;8\\12;9\\12;10\\12;11\\12;12\\12'
    );
  });

  it('supports absolute FJS', () => {
    const scale = parseSource('C6 = 1 kHz; Bb6^7;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.valueOf()).toBeCloseTo(1750);
  });

  it('can implicitly temper a major chord in 12edo', () => {
    const scale = parseSource('5/4;3/2;12@;');
    expect(scale).toHaveLength(2);
    expect(scale.map(i => i.toString()).join(';')).toBe('4\\12;7\\12');
  });

  it('has ups-and-downs', () => {
    const scale = parseSource('C0=1/1;^C0;η0;vD0;D0;22@;');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\22;2\\22;3\\22;4\\22'
    );
  });

  it('can make soft-jaric accidentals', () => {
    const scale = parseSource('^=a4-P8/2;C0=1/1;^C0;η0;vD0;D0;22@;');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\22;2\\22;3\\22;4\\22'
    );
  });

  it('can construct well-temperaments (manual)', () => {
    const scale = parseSource(`
      (* Bach / Louie 2018 *)
      const g = logarithmic(3/2);
      const p = logarithmic(531441/524288);
      const equave = logarithmic(2);
      (* Down *)
      -g;
      $[-1] - g;
      $[-1] - g;
      $[-1] - g;
      (* Up *)
      g - p % 6;
      $[-1] + g - p % 6;
      $[-1] + g - p % 6;
      $[-1] + g - p % 6;
      $[-1] + g - p % 6;
      $[-1] + g - p % 18;
      $[-1] + g - p % 18;
      (* Reduce *)
      i => i mod equave;
      sort();
      (* Equave *)
      equave;
      cents;
    `);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '91.52832958332323r¢;196.08999826922548r¢;294.1349974038386r¢;392.17999653845095r¢;498.0449991346128r¢;590.876662628194r¢;698.0449991346128r¢;792.1799965384507r¢;894.1349974038386r¢;996.0899982692256r¢;1090.224995673063r¢;1200.'
    );
  });

  it('can rig ups-and-downs', () => {
    const scale = parseSource(`
      ^ = 81/80

      vM3
      P5
      ^m6
      P8

      (* Break fragiles *)
      ^ = 1°

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
      riff rig (i) {
        const ups = round(1° ~dot i);
        return i ~% (1° * ups) ~* 81/80 ^ ups;
      }
      vM3;P5;P8;
      rig;
      relative;
      linear;
    `);
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('5/4;3/2;2');
  });

  it('has CSS colors', () => {
    const scale = parseSource('C4 = 1/1; C#4; D4; [black, white];');
    expect(scale).toHaveLength(2);
    expect(scale[0].color?.value).toBe('black');
    expect(scale[1].color?.value).toBe('white');
  });

  it('does polyoffsets as tensor products', () => {
    const scale = parseSource(
      '2:3:4; $ tns (4:5:7); i => i rd 2; sort(); shift() * 2;'
    );
    expect(scale).toHaveLength(6);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '5/4;21/16;3/2;7/4;15/8;2'
    );
  });

  it('has manual/semiquartal notation for 19edo', () => {
    const scale = parseSource(`
      ^ = P4 / 2 - M2;

      C0 = 1/1;
      ^C0;
      vD0;
      D0;
      φ0;
      ^φ0;
      vχ0;
      χ0;
      F0;
      ^F0;
      vG0;
      G0;
      ^G0;
      vA0;
      A0;
      ψ0;
      ^ψ0;
      vω0;
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
      '0;1;0;1'
    );
  });

  it('can get (odd) primes at given ordinals', () => {
    const scale = expand('nthPrime([1, 10, 100, 1000])');
    expect(scale).toEqual(['3', '31', '547', '7927']);
  });

  it('can list primes (within bounds)', () => {
    const scale = parseSource('primes(3, 22)');
    expect(scale).toHaveLength(7);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '3;5;7;11;13;17;19'
    );
  });

  it('can list primes (between ordinals)', () => {
    const scale = parseSource('primeRange(2, 7)') as Interval[];
    expect(scale).toHaveLength(7 - 2);
    expect(scale.map(i => i.toString()).join(';')).toBe('5;7;11;13;17');
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

  it('can average absolute pitches', () => {
    const visitor = evaluateSource(
      'C4 = 261 Hz; absoluteFJS((B4 + Bb4) % 2)',
      false
    );
    const beeSemiflat = visitor.get('$')![0];
    expect(beeSemiflat.toString(visitor.rootContext)).toBe('Bd4');
  });

  it('can convert monzo to absolute FJS', () => {
    const visitor = evaluateSource('C4 = 261 Hz; absoluteFJS([0 -1 1>)', false);
    const pitch = visitor.get('$')![0];
    expect(pitch.toString(visitor.rootContext)).toBe('A♮4^5');
  });

  it('supports other roots besides C4', () => {
    const scale = parseSource(`
      A_3 = 200 Hz
      D_4
      E_4
      A_4
      relative;
    `);
    const ratios = scale.map(i => i.value.valueOf());
    expect(ratios[0]).toBeCloseTo(4 / 3);
    expect(ratios[1]).toBeCloseTo(3 / 2);
    expect(ratios[2]).toBeCloseTo(2 / 1);
  });

  it('supports guard rails against infinite loops', () => {
    const ast = parseAST('while (true) {}');

    const visitor = getSourceVisitor(false);
    visitor.rootContext!.gas = 100;
    expect(() => visitor.visit(ast.body[0])).toThrow();
  });

  it('supports guard rails against huge segments', () => {
    const ast = parseAST('1000::2000');
    const visitor = getSourceVisitor(false);
    visitor.rootContext!.gas = 100;
    expect(() => visitor.visit(ast.body[0])).toThrow();
  });

  it('supports guard rails against large tensors', () => {
    const ast = parseAST('[1..15] tns [1..15]');
    const visitor = getSourceVisitor(false);
    visitor.rootContext!.gas = 100;
    expect(() => visitor.visit(ast.body[0])).toThrow();
  });

  it('supports guard rails against array producing builtins', () => {
    const ast = parseAST('mosSubset(50, 51)');

    const visitor = getSourceVisitor(false);
    visitor.rootContext!.gas = 100;
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
    const visitor = evaluateSource('5::10', false);
    expect(visitor.expand(visitor.rootContext!)).toBe(
      '6/5\n7/5\n8/5\n9/5\n10/5'
    );
  });

  it("can't expand the global scope", () => {
    const visitor = getGlobalVisitor(false);
    expect(() => visitor.expand(visitor.rootContext!)).toThrow();
  });

  it('can expand customized scales', () => {
    const visitor = evaluateSource(
      'A4 = 440 Hz = 1/1;^D4;A4 = 432 Hz;^ = 2°;const syn=81/80;vD4~*syn;3;$[-1]=5;',
      false
    );
    expect(visitor.expand(getSourceVisitor(false).rootContext!)).toBe(
      [
        'C4 = 256 Hz',
        '1/1 = 432 Hz',
        '^ = 2°',
        'const syn = 81/80',
        '[1 1 4 -1 1 0 1>@1°.Hz.2..',
        'vD♮4_5',
        '5',
      ].join('\n')
    );
  });

  it('can expand colored scales', () => {
    const visitor = evaluateSource(
      '4::8;$[1] = $[1] black; $[2] = $[2] "seventh"',
      false
    );
    expect(visitor.expand(getSourceVisitor(false).rootContext!)).toBe(
      '5/4\n6/4 black\n7/4 "seventh"\n8/4'
    );
  });

  it('can expand riffs', () => {
    const visitor = evaluateSource('riff foo (bar) {bar + 3};foo(1)', false);
    expect(visitor.expand(getSourceVisitor(false).rootContext!)).toBe(
      'riff foo (bar) {bar + 3}\n4'
    );
  });

  it('can expand fns', () => {
    const visitor = evaluateSource('fn foo(bar){bar + 3};foo(1)', false);
    expect(visitor.expand(getSourceVisitor(false).rootContext!)).toBe(
      'fn foo(bar){bar + 3}\n4'
    );
  });

  it('can expand arrow functions', () => {
    const visitor = evaluateSource('const foo = bar => bar + 2;foo(1)', false);
    expect(visitor.expand(getSourceVisitor(false).rootContext!)).toBe(
      'const foo = bar => bar + 2\n3'
    );
  });

  it('can expend variables that start with "riff"', () => {
    const visitor = evaluateSource('const riffy = 42', false);
    expect(visitor.expand(getSourceVisitor(false).rootContext!)).toBe(
      'const riffy = 42\n'
    );
  });

  it('can expand renamed builtins', () => {
    const visitor = evaluateSource('let foo = gcd;foo(6, 8)', false);
    expect(visitor.expand(getSourceVisitor(false).rootContext!)).toBe(
      'let foo = gcd\n2'
    );
  });

  it('can sort scales after the fact', () => {
    const globalVisitor = getGlobalVisitor(false);
    const ast = parseAST('C5 = 256 Hz;const baseMidiNote = 72;');
    for (const statement of ast.body) {
      globalVisitor.visit(statement);
    }
    const defaults = globalVisitor.rootContext!.clone();

    const visitor = new StatementVisitor(globalVisitor);
    visitor.isUserRoot = true;

    const userAst = parseAST('D4 = 270 Hz;let x = 7;D4;200 Hz;x;3;2');
    for (const statement of userAst.body) {
      visitor.visit(statement);
    }
    const r = relative.bind(visitor.rootContext);
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
    expect(oopsFourth.toString()).toBe('[1 2 -1>@1°.2..');
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
      riff fun(foo, ...bar) {return foo + bar[1]}
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

  it('accepts empty lines', () => {
    const nothing = parseSource(';;;');
    expect(nothing).toHaveLength(0);
  });

  it('has slice assignment', () => {
    const arr = parseSource('const arr = [1, 2, 3]; arr[1..] = [4]; arr');
    expect(arr.map(i => i.toString()).join(';')).toBe('1;4');
  });

  it("doesn't leak comprehension variables", () => {
    expect(() => parseSource('[i for i of [1]]; i')).toThrow();
  });

  it('supports plus minus val notation', () => {
    const scale = parseSource(`
      5/4
      3/2
      2/1

      17[+5]@
      map(str)
    `);
    expect(scale.map(i => i.label)).toEqual(['6\\17', '10\\17', '17\\17']);
  });

  it('supports equaves and ups/downs in val notation', () => {
    const scale = expand(`
      5/3
      7/3
      3/1

      [3]13[v7]@
    `);
    expect(scale).toEqual(['6\\13<3>', '9\\13<3>', '13\\13<3>']);
  });

  it('supports equaves with val literals', () => {
    const scale = expand(`
      5/3
      7/3
      3/1

      <13 19 23]@3.5.7
    `);
    expect(scale).toEqual(['6\\13<3>', '10\\13<3>', '13\\13<3>']);
  });

  it('has function scope similar to javascript', () => {
    const a = 1;
    function foo() {
      return a;
    }
    {
      const a = 2;
      // eslint-disable-next-line no-inner-declarations
      function bar() {
        return a;
      }
      expect(foo()).toBe(1);
      expect(bar()).toBe(2);
    }
    const scale = expand(`
      const a = 1
      riff foo() {a}
      {
        const a = 2
        riff bar() {a}
        foo()
        bar()
      }
    `);
    expect(scale).toEqual(['const a = 1', 'riff foo() {a}', '1', '2']);
  });

  it('has arrow function scope similar to javascript', () => {
    const a = 1;
    const foo = () => a;
    {
      const a = 2;
      const bar = () => a;
      expect(foo()).toBe(1);
      expect(bar()).toBe(2);
    }
    const scale = expand(`
      const a = 1
      const foo = () => a
      {
        const a = 2
        const bar = () => a
        foo()
        bar()
      }
    `);
    expect(scale).toEqual(['const a = 1', 'const foo = () => a', '1', '2']);
  });

  it('iterates over ranges', () => {
    const scale = expand(`{
      const factors = [1, 3, 5, 7]
      for (const i of [0 .. length(factors)-1]) {
        for (const j of [i+1 .. length(factors)-1]) {
          factors[i] * factors[j]
        }
      }
    }`);
    expect(scale).toEqual(['3', '5', '7', '15', '21', '35']);
  });

  it('pushes after a specified index', () => {
    const scale = expand('5::10;push(4/3, $, 1)');
    expect(scale).toEqual(['6/5', '4/3', '7/5', '8/5', '9/5', '10/5']);
  });

  it('supports operators inside enumerations', () => {
    const scale = expand('%6:%5:%4');
    expect(scale).toEqual(['6/5', '3/2']);
  });

  it('maps higher primes to real cents', () => {
    const scale = expand(
      '11/8;3/2;7/4;2/1;PrimeMapping(1200., 1901.955, 1.5e*PI, 2.5e*E)'
    );
    expect(scale).toEqual([
      '551.317942364757r¢',
      '701.955',
      '917.5477629315908r¢',
      '1200.',
    ]);
  });

  it('leaves higher prime limits alone in implicit tempering', () => {
    const scale = parseSource('5/4 "3rd";7/5;3/2;2/1;101 "big";12@.5');
    expect(scale[0].totalCents()).toBeCloseTo(400);
    expect(scale[1].totalCents()).toBeCloseTo(3368.825906469125 - 2800);
    expect(scale[2].totalCents()).toBeCloseTo(700);
    expect(scale[3].totalCents()).toBeCloseTo(1200);
    expect(scale[4].totalCents()).toBeCloseTo(7989.853779302155);

    expect(scale[0].label).toBe('3rd');
    expect(scale[4].label).toBe('big');
  });

  it('can insert intervals into a sorted scale', () => {
    const scale = expand('28/27;16/15;4/3;14/9;8/5;2/1;insert(3/2)');
    expect(scale).toEqual([
      '28/27',
      '16/15',
      '4/3',
      '3/2',
      '14/9',
      '8/5',
      '2/1',
    ]);
  });

  it('can enumerate cents', () => {
    const scale = expand('100.:200.:432.1');
    expect(scale).toEqual(['100.', '332.1']);
  });

  it('can enumerate cents (mirrored)', () => {
    const scale = expand('/400.:300.:234.5');
    expect(scale).toEqual(['100.', '165.5']);
  });

  it('vectorizes ups', () => {
    const scale = expand('^[M3, P5]');
    expect(scale).toEqual(['^M3', '^P5']);
  });

  it('vectorizes down expressions', () => {
    const scale = expand('v{[M3, P5]}');
    expect(scale).toEqual(['vM3', 'vP5']);
  });

  it('vectorizes labels', () => {
    const scale = expand('[1, 2] green');
    expect(scale).toEqual(['1 green', '2 green']);
  });

  it('can notate 311p using syntonic rastmic subchroma inflections', () => {
    const scale = expand('P1^1s;P1^2s;P1^3s;P1^4s;P1^23s;½a1_9s;311@');
    expect(scale).toEqual([
      '1\\311',
      '2\\311',
      '3\\311',
      '4\\311',
      '5\\311',
      '6\\311',
    ]);
  });

  it('can convert just intonation to absolute HEWM53', () => {
    const visitor = getSourceVisitor(false);
    const ast = parseAST('A4 = 440Hz = 1/1; absoluteFJS(23/16, "m")');
    for (const statement of ast.body) {
      visitor.visit(statement);
    }
    const E5 = visitor.currentScale[0];
    expect(E5.toString(visitor.rootContext)).toBe('E♮5_23m');
    expect(E5.valueOf()).toBeCloseTo(440 * (23 / 16));
  });

  it('can generate Farey scales', () => {
    const scale = expand('fareySequence(4) + 1');
    expect(scale).toEqual(['1', '5/4', '4/3', '3/2', '5/3', '7/4', '2']);
  });

  it('can generate Farey interiors', () => {
    const scale = expand('fareyInterior(5)');
    expect(scale).toEqual([
      '1/5',
      '1/4',
      '1/3',
      '2/5',
      '1/2',
      '3/5',
      '2/3',
      '3/4',
      '4/5',
    ]);
  });

  it('has nested destructuring', () => {
    const scale = expand(`{
      const [foo, [bar, baz]] = [1, [2, 3]]
      foo;bar;baz
    }`);
    expect(scale).toEqual(['1', '2', '3']);
  });

  it('has a third-apotome in 15edo', () => {
    const step = parseSource('⅓a1;15@')[0];
    expect(step.toString()).toBe('1\\15');
  });

  it('has a fifth-apotome in 25edo', () => {
    const step = parseSource('⅕a1;25@')[0];
    expect(step.toString()).toBe('1\\25');
  });

  it('can keep track of tempered intervals', () => {
    const scale = parseSource('6/5;3/2;9/5;2/1;track;12@');
    expect(scale.map(i => i.toString())).toEqual([
      '3\\12',
      '7\\12',
      '10\\12',
      '12\\12',
    ]);
    expect(scale.map(i => Array.from(i.trackingIds)[0])).toEqual([1, 2, 3, 4]);
  });

  it('has the Konami code', () => {
    const scale = expand('^^vv/\\/\\B4;A4 "start"');
    expect(scale).toEqual(['B4', 'A4 "start"']);
  });

  it('has try..catch..finally', () => {
    const scale = expand(`
      5/4
      try {
        pop()
      } catch (e) {
        3/2 e
      } finally {
        2/1
      }
    `);
    expect(scale).toEqual(['5/4', '3/2 "Pop from an empty scale."', '2/1']);
  });

  it('can softly convert a scale with a one-liner', () => {
    const scale = expand(`
      C4 = 1
      9/8
      E % 2r
      G4
      i => FJS(i) lest i
    `);
    expect(scale).toEqual(['M2', '1.3591409142295225r', 'P5']);
  });

  it('has while..break', () => {
    const scale = expand(`{
      let i = 0;
      while (i < 10) {
        ++i;
        if (i > 3)
          break;
        10 + i;
      }
    }`);
    expect(scale).toEqual(['1', '11', '2', '12', '3', '13', '4']);
  });

  it('has while..continue', () => {
    const scale = expand(`{
      let i = 0;
      while (i < 10) {
        ++i;
        if (i > 3) {
          continue;
        }
        10 + i;
      }
    }`);
    expect(scale).toEqual([
      '1',
      '11',
      '2',
      '12',
      '3',
      '13',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
    ]);
  });

  it('has for..of..break', () => {
    const scale = expand(`
      for (const i of [1..10]) {
        i;
        if (i > 3) {
          break;
        }
        10 + i;
      }
    `);
    expect(scale).toEqual(['1', '11', '2', '12', '3', '13', '4']);
  });

  it('has for..of..continue', () => {
    const scale = expand(`
      for (const i of [1..10]) {
        i;
        if (i > 3)
          continue;
        10 + i;
      }
    `);
    expect(scale).toEqual([
      '1',
      '11',
      '2',
      '12',
      '3',
      '13',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
    ]);
  });

  it('has while..else', () => {
    const scale = expand(`
      for (const i of [2..12]) {
        let j = 1;
        while (++j < i) {
          if (i mod j == 0) break;
        } else {
          i;
        }
      }
    `);
    expect(scale).toEqual(['2', '3', '5', '7', '11']);
  });

  it('has for..of..else', () => {
    const scale = expand(`
      for (const i of [2..12]) {
        for (const j of [2..i-1]) {
          if (i mod j == 0) break;
        } else {
          i;
        }
      }
    `);
    expect(scale).toEqual(['2', '3', '5', '7', '11']);
  });

  it('can use $$ as a default value', () => {
    const scale = expand(`{
      riff foo (scale = $$) {
        scale[0];
      }
      1;
      2;
      foo();
    }`);
    expect(scale).toEqual(['1', '2', '1']);
  });

  it('assigns default values', () => {
    const scale = expand(`{
      riff eulerGenus(guide, root = 1, equave = 2) {
        "Span a lattice from all divisors of the guide-tone rotated to the root-tone.";
        if (guide ~mod root) {
          throw "Root must divide the guide tone.";
        }
      
        let remainder = guide ~* 0;
        while (++remainder < equave) {
          let n = remainder;
          while (n <= guide) {
            if (not (guide ~mod n)) n;
            n ~+= equave;
          }
        }
        i => i ~% root ~rdc equave;
        sort();
        pop() colorOf(equave) labelOf(equave);
      }
      eulerGenus(45);
    }`);
    expect(scale).toEqual(['9/8', '5/4', '45/32', '3/2', '15/8', '2']);
  });

  it('has default values for variable declarations', () => {
    const scale = expand(`{
      let foo = 1, [bar, baz, qux = 4] = [2], quux;
      foo;
      bar;
      3 str(baz);
      qux;
      5 str(quux)
    }`);
    expect(scale).toEqual(['1', '2', '3 "niente"', '4', '5 "niente"']);
  });

  it('has default values for loop elements', () => {
    const scale = expand(`
      for (const [a, b = 10] of [[1, 2], [3]]) {
        a;
        b;
      }
    `);
    expect(scale).toEqual(['1', '2', '3', '10']);
  });

  it('can access arrays with boolean arrays', () => {
    const scale = expand(`{
      const foo = [1..10];
      foo[foo < 5];
    }`);
    expect(scale).toEqual(['1', '2', '3', '4']);
  });

  it('can access arrays with integer arrays', () => {
    const scale = expand(`{
      const foo = [1..10];
      foo[[0, 2, 4, -1]];
    }`);
    expect(scale).toEqual(['1', '3', '5', '10']);
  });

  it('can filter out duplicate intervals from an unsorted scale', () => {
    const scale = expand(`
      6/5;
      4/3;
      6/5;
      7/4;
      7/4;
      2/1;
      keepUnique();
    `);
    expect(scale).toEqual(['6/5', '4/3', '7/4', '2/1']);
  });

  it('can approximate an entire harmonic segment', () => {
    const scale = expand('8::16 by~ 1\\12');
    expect(scale).toEqual([
      '2\\12',
      '4\\12',
      '6\\12',
      '7\\12',
      '8\\12',
      '10\\12',
      '11\\12',
      '12\\12',
    ]);
  });

  it('has inline labels for ordered scales using records', () => {
    const scale = expand(
      '3/1 "pre-existing";#{third: 6/5, "The Octave": 2/1, fif: 3/2}'
    );
    expect(scale).toEqual([
      '3/1 "pre-existing"',
      '6/5 "third"',
      '3/2 "fif"',
      '2/1 "The Octave"',
    ]);
  });

  it('throws an error if you try to call simplify without arguments', () => {
    expect(() => parseSource('simplify()')).toThrow(
      "Parameter 'interval' is required."
    );
  });

  it('has a vectorized simplify', () => {
    const scale = expand('6/4;6/3;simplify($)');
    expect(scale).toEqual(['6/4', '6/3', '3/2', '2']);
  });

  it('throws an error if you use sort as a mapper', () => {
    expect(() => parseSource('2/1;3/2;sort')).toThrow(
      'Only arrays can be sorted.'
    );
  });

  it('tempers in the 3-limit', () => {
    const scale = expand(`
      C4 = 263 Hz

      A4
      C5

      12@.3
    `);
    expect(scale).toEqual(['9\\12', '12\\12']);
  });

  it('tempers in the 3-limit inline', () => {
    const scale = expand('C4 = 263Hz;[A4, C5] tmpr 12@.3');
    expect(scale).toEqual(['9\\12', '12\\12']);
  });

  it('supports harmonic segments as parts of enumerated chords', () => {
    const scale = expand('2:4::7:11:14::17');
    expect(scale).toEqual([
      '4/2',
      '5/2',
      '6/2',
      '7/2',
      '11/2',
      '14/2',
      '15/2',
      '16/2',
      '17/2',
    ]);
  });

  it('supports subharmonic segments as parts of reflected enumerated chords', () => {
    const scale = expand('/16:14::9:5');
    expect(scale).toEqual([
      '16/14',
      '16/13',
      '16/12',
      '16/11',
      '16/10',
      '16/9',
      '16/5',
    ]);
  });

  it('has rest assignment', () => {
    const scale = expand(`{
      let x, r
      [x, ...r] = [1, 2, 3, 4]
      r
    }`);
    expect(scale).toEqual(['2', '3', '4']);
  });

  it('freezes existing content on unison frequency re-declaration', () => {
    const scale = parseSource(`
      1 = 256 Hz
      (* Every scalar is henceforth interpreted as multiples of 256 hertz. *)
      5/4 (* 320 Hz *)
      3/2 (* 384 Hz *)
      2   (* 512 Hz *)

      (* Upon re-declaration of the unison frequency the existing content is converted to frequencies. *)
      1 = 440 Hz
      (* From now on scalars are multiples of 440 hertz instead. *)
      16/11 (* 640 Hz *)
      9/5   (* 792 Hz *)
      2     (* 880 Hz *)

      (* Manual conversion *)
      absolute
    `);
    const frequencies = scale.map(i => i.valueOf());
    expect(frequencies).toEqual([320, 384, 512, 640, 792, 880]);
  });

  it('technically supports partial application', () => {
    const scale = expand(`{
      fn add(x) {
        return y => y + x;
      }
      const plusTwo = add 2;
      plusTwo 1;
      plusTwo 5;
      add 11 300;
    }`);
    expect(scale).toEqual(['3', '7', '311']);
  });

  it('can make a sort without call syntax', () => {
    const scale = expand(`{
      riff popSort(i) {
        if (isArray(i)) {
          return sort(popAll(i));
        }
        return sort(popAll($$));
      }

      5:8:7:9:6:10;
      popSort; (* Pushes [sorted($), [], [], ...] onto the scale *)
    }`);
    expect(scale).toEqual(['6/5', '7/5', '8/5', '9/5', '10/5']);
  });

  it('only colors uncolored intervals using the default action', () => {
    const scale = expand(`
      5/4
      3/2
      green
      2/1
      red
    `);
    expect(scale).toEqual(['5/4 green', '3/2 green', '2/1 red']);
  });

  it('parses Raga Bageshri (otonal)', () => {
    const scale = expand(`
      54 white:
      60 black:
      64 white:
      72 white:
      81 white:
      90 black:
      96 white:
      108 '2/1'

      simplify
    `);
    expect(scale).toEqual([
      '10/9 black',
      '32/27 white',
      '4/3 white',
      '3/2 white',
      '5/3 black',
      '16/9 white',
      '2 "2/1" white',
    ]);
  });

  it('parses Pythagoras[12] (golfed)', () => {
    const scale = expand(`
      [3^i rdc 2 white for i of [-2..4]] ['F', 'C', 'G', 'D', 'A', 'E', 'B']
      [3^i rdc 2 black for i of [-7..-3]] ['G♭', 'D♭', 'A♭', 'E♭', 'B♭']
      sort()
    `);
    expect(scale).toEqual([
      '256/243 "A♭" black',
      '9/8 "A" white',
      '32/27 "B♭" black',
      '81/64 "B" white',
      '4/3 "C" white',
      '1024/729 "D♭" black',
      '3/2 "D" white',
      '128/81 "E♭" black',
      '27/16 "E" white',
      '16/9 "F" white',
      '4096/2187 "G♭" black',
      '2 "G" white',
    ]);
  });

  it('can build complex indexing conditionals using vectorized boolean ops', () => {
    const scale = expand(`{
      const xs = [0..9];
      xs[vnot xs vor xs > 3 vand xs <= 7];
    }`);
    expect(scale).toEqual(['0', '4', '5', '6', '7']);
  });

  it('could golf ablin', () => {
    const scale = expand(
      '1=6z;{const ablin = i => i linear absolute;3::6;ablin}'
    );
    expect(scale).toEqual(['8 Hz', '10 Hz', '12 Hz']);
  });

  it('can defer tempering', () => {
    const scale = expand(`
      defer 12@
      M3
      P5
      P8
    `);
    expect(scale).toEqual(['4\\12', '7\\12', '12\\12']);
  });

  it('has defer similar to Zig (single)', () => {
    evaluateSource(
      `
      let x = 5;
      {
          defer x += 2;
          if (x <> 5) {
            throw 'Defer executed early!';
          }
      }
      if (x <> 7) {
        throw 'Defer did not execute!';
      }
    `,
      false
    );
  });

  it('has defer similar to Zig (multi)', () => {
    evaluateSource(
      `
      let x = 5;
      {
          defer x += 2;
          defer x /= 2;
      }
      if (x <> 4.5e) {
        throw 'Deferred statements executed in the wrong order!';
      }
    `,
      false
    );
  });

  it('rejects confusing defer', () => {
    expect(() =>
      evaluateSource(
        `
          for (const i of [3, 5]) {
            defer break;
            i / (i - 1);
          }
        `,
        false
      )
    ).toThrow('Illegal BreakStatement inside a deferred block.');
  });

  it('rejects unassigned absolute pitches (ASCII)', () => {
    expect(() => evaluateSource('fsi#4', false)).toThrow(
      'Nominal fsi is unassigned.'
    );
  });

  it('rejects unassigned absolute pitches (unicode)', () => {
    expect(() => evaluateSource('ς♭2', false)).toThrow(
      'Nominal ς is unassigned.'
    );
  });

  it('rejects unassigned accidentals', () => {
    expect(() => evaluateSource('Ce4', false)).toThrow(
      'Accidental e is unassigned.'
    );
  });

  it('can generate absolute Diamond mos notation for the lambda scale', () => {
    const scale = parseSource(`
      MOS 121212121<3>
      J3 = 100 Hz = 1
      K3
      L3
      M_3 (* Looks like major third *)
      N3 (* Let's not do capital neutrals, OK? *)
      O3
      P3 (* Perfect thirds don't exist *)
      Q3
      R3
      J4
      map(str)
    `);
    expect(scale.map(i => i.valueOf())).toEqual([
      108.8182243463317, 128.8560769230961, 140.21889487005652,
      166.03888560010878, 180.68056703447525, 213.95119415112754,
      232.8178904430297, 275.68911531325966, 300,
    ]);
    expect(scale.map(i => i.label)).toEqual([
      'K3',
      'L3',
      'M_3',
      'N3',
      'O3',
      'P3',
      'Q3',
      'R3',
      'J4',
    ]);
  });

  it('can generate relative Diamond mos notation for ekic', () => {
    const scale = parseSource(`
      "Ekic - LLsLLLsL (Nightmare)"
      MOS {
        6L 2s
        hardness = 3
      }
      P1ms
      M2ms
      P3ms
      P4ms
      P5ms
      M6ms
      P7ms
      P8ms
      map(str)
    `);
    expect(
      scale.map(i => i.value.toEqualTemperament().fractionOfEquave.toFraction())
    ).toEqual(['3/20', '3/10', '7/20', '1/2', '13/20', '4/5', '17/20', '1']);
    expect(scale.map(i => i.label)).toEqual([
      'P1ms',
      'M2ms',
      'P3ms',
      'P4ms',
      'P5ms',
      'M6ms',
      'P7ms',
      'P8ms',
    ]);
  });

  it('generates the basic bright mode by default', () => {
    const scale = expand(`
      MOS 3L 2s
      K4
      L4
      M_4
      N4
      J5
      nedji
    `);
    expect(scale).toEqual([
      'MOS {LLsLs;L=2^1/4;s=2^1/8}',
      '1\\4',
      '1\\2',
      '5\\8',
      '7\\8',
      '1\\1',
    ]);
  });

  it('supports large/small declaration in MOS', () => {
    const scale = expand(`
      MOS {LLsLs;L=2^1/4;s=2^1/8}
      K4
      L4
      M_4
      N4
      J5
      nedji
    `);
    expect(scale).toEqual([
      'MOS {LLsLs;L=2^1/4;s=2^1/8}',
      '1\\4',
      '1\\2',
      '5\\8',
      '7\\8',
      '1\\1',
    ]);
  });

  it('makes the exception for nL ns', () => {
    const scale = expand(`
      MOS 4L 4s;
      m1ms;
      P2ms;
      M3ms;
      P4ms;
      n5ms;
      P6ms;
      P8ms;
      MOS niente;
    `);
    expect(scale).toEqual([
      '1\\12',
      '1\\4',
      '5\\12',
      '1\\2',
      '5\\8',
      '3\\4',
      '1\\1',
    ]);
  });

  it('supports step sizes larger than 10 in MOS declaration', () => {
    const scale = expand(`
      MOS 43,43, 43, 43,
        43, 10, 43, 43,
      J&4;
      K@4;
      Ka4;
      K4;
      Ke4;
      J5;
      MOS niente;
    `);
    expect(scale).toEqual([
      '33\\311',
      '10\\311',
      '53\\622',
      '43\\311',
      '119\\622',
      '1\\1',
    ]);
  });

  it('supports irrational hardness in MOS declaration', () => {
    const scale = expand(`
      MOS {
        5L 2s
        hardness = PI
      }
      automos()
      MOS niente
    `);
    expect(scale).toEqual([
      '212.8935511816436r¢',
      '425.7871023632872r¢',
      '638.6806535449307r¢',
      '706.446775590823r¢',
      '919.3403267724666r¢',
      '1132.23387795411r¢',
      '1200.0000000000025r¢',
    ]);
  });

  it('supports radicals in SOV', () => {
    const scale = expand(`
      9/8
      3/2
      3/^2
      [√3]8@2.√3
    `);
    expect(scale).toEqual(['1\\8<3>', '3\\8<3>', '1\\2<3>']);
  });

  it('generates automos', () => {
    const scale = parseSource(`
      MOS 4L 3s 3|3
      J4 = 100z
      automos()
      map(str)
    `);
    expect(scale.map(i => i.label)).toEqual([
      'K♮4',
      'L♮4',
      'M♮4',
      'N♮4',
      'O♮4',
      'P♮4',
      'J♮5',
    ]);
    expect(scale.map(i => i.valueOf())).toEqual([
      113.4312522195463, 120.80894444044476, 137.03509847201238,
      145.94801056814464, 165.55065597696213, 176.31825099920434, 200,
    ]);
  });

  it('allows you to call the smaller step L in MOS declaration', () => {
    const scale = expand(`
      MOS {
        3L 2s
        L = 9/8
      }
      automos()
      relative
      linear
    `);
    expect(scale).toEqual([
      'MOS {LLsLs;L=9/8;s=32/27}',
      '9/8',
      '81/64',
      '3/2',
      '27/16',
      '2',
    ]);
  });

  it('allows you to create negative steps', () => {
    const scale = expand(`
      MOS {
        6L 1s
        L = 9/8
      }
      automos()
      relative
      linear
    `);
    expect(scale).toEqual([
      'MOS {LLLLLLs;L=9/8;s=524288/531441}',
      '9/8',
      '81/64',
      '729/512',
      '6561/4096',
      '59049/32768',
      '531441/262144',
      '2',
    ]);
  });

  it('preserves equalized MOS declaration', () => {
    const scale = expand(`
      MOS {
        5L 2s
        L = 1\\7
      }
      M1ms
      M2ms
      P3ms
      P4ms
      M5ms
      M6ms
      P7ms
    `);
    expect(scale).toEqual([
      'MOS {LLLsLLs;L=2^1/7;s=2^1/7}',
      'M1ms',
      'M2ms',
      'P3ms',
      'P4ms',
      'M5ms',
      'M6ms',
      'P7ms',
    ]);
  });

  it('supports infinite hardness (explicit)', () => {
    const scale = expand(`
      MOS {
        5L 2s
        hardness = inf
      }
      J4 = 123 Hz
      automos()
      nedji
    `);
    expect(scale).toEqual([
      'MOS {LLLsLLs;L=2^1/5;s=1}',
      '1\\5',
      '2\\5',
      '3\\5',
      '3\\5',
      '4\\5',
      '1\\1',
      '1\\1',
    ]);
  });

  it('supports infinite hardness (implicit)', () => {
    const scale = expand(`
      MOS 101010;
      automos()
      nedji
    `);
    expect(scale).toEqual([
      'MOS {LsLsLs;L=2^1/3;s=1}',
      '1\\3',
      '1\\3',
      '2\\3',
      '2\\3',
      '1\\1',
      '1\\1',
    ]);
  });

  it('supports infinite hardness (s=1)', () => {
    const scale = expand(`
      MOS {LsLsLs;L=2^1/3;s=1}
      automos()
      nedji
    `);
    expect(scale).toEqual([
      'MOS {LsLsLs;L=2^1/3;s=1}',
      '1\\3',
      '1\\3',
      '2\\3',
      '2\\3',
      '1\\1',
      '1\\1',
    ]);
  });

  it('supports large MOS scales', () => {
    const scale = expand(`
      MOS 42L 7s
      JK_4
      JT♮4
      KQ&4
      J5
      i => i str(nedji(i, niente, 91))
    `);
    expect(scale).toEqual([
      'MOS {LLLLLLsLLLLLLsLLLLLLsLLLLLLsLLLLLLsLLLLLLsLLLLLLs;L=2^2/91;s=2^1/91}',
      'JK_4 "34\\\\91"',
      'JT♮4 "51\\\\91"',
      'KQ&4 "78\\\\91"',
      'J5 "91\\\\91"',
    ]);
  });

  it('has automos that works with two-character nominals', () => {
    const scale = expand(`
      MOS 9L 9s
      automos()
      i => nedji(i, niente, 27)
    `);
    expect(scale).toEqual([
      'MOS {LsLsLsLsLsLsLsLsLs;L=2^2/27;s=2^1/27}',
      '2\\27',
      '3\\27',
      '5\\27',
      '6\\27',
      '8\\27',
      '9\\27',
      '11\\27',
      '12\\27',
      '14\\27',
      '15\\27',
      '17\\27',
      '18\\27',
      '20\\27',
      '21\\27',
      '23\\27',
      '24\\27',
      '26\\27',
      '27\\27',
    ]);
  });

  it('supports guard rails against absurd MOS declarations', () => {
    const ast = parseAST('MOS 420L 69s');

    const visitor = getSourceVisitor(false);
    visitor.rootContext!.gas = 100;
    expect(() => visitor.executeProgram(ast)).toThrow();
  });

  it('supports guard rails against unreasonable automos', () => {
    const ast = parseAST(`
      MOS 20L 20s
      automos()
    `);

    const visitor = getSourceVisitor(false);
    visitor.rootContext!.gas = 100;
    visitor.visit(ast.body[0]);
    expect(() => visitor.visit(ast.body[1])).toThrow();
  });

  it('can pop the current scale as a magic variable', () => {
    const scale = expand(`
      5/4
      3/2
      2/1
      sort(%£ rdc pop$[-1])
    `);
    expect(scale).toEqual(['4/3', '8/5', '2/1']);
  });

  it('can pop the parent scale as a magic variable', () => {
    const scale = expand(String.raw`{
      fn poppyStack(array = ££) {
        "Cumulatively stack the current/given intervals on top of each other.";
        array;
        let i = 0r;
        const len = real(length($));
        while (++i < len)
          $[i] ~*= $[i-1r];
      }
      2 \ 12
      2 \ 12
      1 \ 12
      poppyStack();
      $[-1] + poppyStack([2, 2, 2, 1] \ 12);
    }`);
    expect(scale).toEqual([
      '2\\12',
      '4\\12',
      '5\\12',
      '7\\12',
      '9\\12',
      '11\\12',
      '12\\12',
    ]);
  });

  it('can label intervals after generating', () => {
    const scale = parseSource(`
      4/3
      3/2
      2
      £ ["fourth", "fifth", "octave"]
    `);
    expect(scale).toHaveLength(3);
    expect(scale[0].label).toBe('fourth');
    expect(scale[1].label).toBe('fifth');
    expect(scale[2].label).toBe('octave');
  });

  it('can paint the whole scale', () => {
    const scale = expand('3::6;white;£ "bob"');
    expect(scale).toEqual([
      '4/3 "bob" white',
      '5/3 "bob" white',
      '6/3 "bob" white',
    ]);
  });

  it('can delete record entries', () => {
    const scale = expand(`{
      const foo = #{bar: 1, baz: 2}
      del foo['bar']
      foo
    }`);
    expect(scale).toEqual(['2 "baz"']);
  });

  it('can delete array elements', () => {
    const scale = expand(`{
      const foo = primeRange(5)
      del foo[2]
      foo
    }`);
    expect(scale).toEqual(['2', '3', '7', '11']);
  });

  it('can delete multiple array elements (boolean)', () => {
    const scale = expand(`{
      const primes = [2..30]
      let i = -1
      while (++i < length(primes))
        del primes[primes > primes[i] vand vnot primes mod primes[i]]
      primes
    }`);
    expect(scale).toEqual([
      '2',
      '3',
      '5',
      '7',
      '11',
      '13',
      '17',
      '19',
      '23',
      '29',
    ]);
  });

  it('can delete multiple array elements (indices)', () => {
    const scale = expand(`{
      const foo = primeRange(6)
      del foo[[1, 3]]
      foo
    }`);
    expect(scale).toEqual(['2', '5', '11', '13']);
  });

  it('can delete multiple array elements (slice)', () => {
    const scale = expand(`{
      const foo = primeRange(7)
      del foo[1,3..]
      foo
    }`);
    expect(scale).toEqual(['2', '5', '11', '17']);
  });

  it('throws for out-of-bounds delete', () => {
    expect(() => parseSource('del [1, 2][3]')).toThrow('Index out of range.');
  });

  it("doesn't throw for out-of-bounds nullish delete", () => {
    expect(() => parseSource('del [1, 2]~[3]')).not.toThrow(
      'Index out of range.'
    );
  });

  it('can handle too complex multiplication resulting from too accurate prime mappings', () => {
    const scale = expand(`
      14/13
      8/7
      44/35
      4/3
      99/70
      99/65
      396/245
      2178/1225
      66/35
      9801/4900
      (* Commas = 1716/1715, 2080/2079 *)
      PrimeMapping(1200., 1902.0236738027506, 2786.2942222449124, 3369.11433503606, 4151.361209675464, 4440.252343874884)
      cents(£, 3)
    `);
    expect(scale).toEqual([
      '128.862',
      '230.886',
      '395.953',
      '497.976',
      '600.',
      '728.862',
      '830.886',
      '995.953',
      '1097.976',
      '1200.',
    ]);
  });

  it('supports block expressions as valid RHS in assignment', () => {
    const scale = expand(`{
      const arr = {
        2
        1
        3
        sort()
      }
      arr;
    }`);
    expect(scale).toEqual(['1', '2', '3']);
  });

  it('supports block expressions as operands', () => {
    const scale = expand(`
      10 * ({
        defer sort()
        2
        1
        3
      })
    `);
    expect(scale).toEqual(['10', '20', '30']);
  });

  it('supports block expressions as function arguments', () => {
    const truth = expand(`
      hasConstantStructure({
        9/8
        81/64
        4/3
        3/2
        27/16
        243/128
        2/1
      })
    `);
    expect(truth).toEqual(expand('true'));
  });

  it('captures outside variables in block expressions', () => {
    const pentic = expand(`{
      const octave = 2;
      const fifth = 3/2;
      const pentic = {
        (fifth ^ 2) / octave
        (fifth ^ 4) / (octave ^ 2)
        fifth
        (fifth ^ 3) / octave
        octave
      };
      pentic;
    }`);
    expect(pentic).toEqual(
      expand(`{
        9/8
        81/64
        3/2
        27/16
        2
      }`)
    );
  });

  it('tempers using a TE prime mapping', () => {
    const scale = expand(`
      "worcester9"
      9/8
      6/5
      5/4
      36/25
      3/2
      25/16
      9/5
      15/8
      2
      (* Commas = 576/575 *)
      PrimeMapping(1199.7950716344951, 1901.783400264411, 2786.6819940512733, 3368.825906469125, 4151.317942364757, 4440.527661769311, 4904.955409500408, 5097.513016132302, 5428.9732422332445)
      cents(£, 6)
    `);
    expect(scale).toEqual([
      '"worcester9"',
      '204.181586',
      '314.896478',
      '387.091851',
      '629.792956',
      '701.988329',
      '774.183702',
      '1016.884806',
      '1089.080179',
      '1199.795072',
    ]);
  });

  it('converts a val basis to an array', () => {
    const scale = expand('basisToArray(@√2.√3.5)');
    expect(scale).toEqual(['2^1/2', '3^1/2', '5']);
  });

  it('can temper using the zero val', () => {
    const scale = expand('3/2;5/3;2/1;0@');
    expect(scale).toEqual(['0\\1', '0\\1', '0\\1']);
  });

  it("tells the user to reflect on their life's choices when using the 0c val", () => {
    expect(() => expand('3/2;5/3;2/1;0[^5]@')).toThrow(
      'Non-unitary tempering by zero divisions of an equave.'
    );
  });

  it('can temper using the 0c val if the equave is correct', () => {
    const scale = expand('3/2;5/3;2/1;c0c@');
    expect(scale).toEqual(['0\\1<5>', '1\\1<5>', '0\\1<5>']);
  });

  it('respells pyth to zarlino', () => {
    const scale = expand('3^[-1..5] rdc 2;sort();respell(S9)');
    expect(scale).toEqual(['9/8', '5/4', '4/3', '3/2', '5/3', '15/8', '2']);
  });

  it('tempers zarlino to TE meantone (large prime limit)', () => {
    const scale = expand(`
      9/8
      5/4
      4/3
      3/2
      5/3
      15/8
      2
      Temperament([12@, 19@])
      cents(£, 3)
    `);
    expect(scale).toEqual([
      '192.104',
      '384.209',
      '504.002',
      '696.107',
      '888.211',
      '1080.315',
      '1200.109',
    ]);
  });

  it('tempers barbados to near-CTE', () => {
    const scale = expand(
      'sort(15/13^[-2..2] rdc 2);Temperament([5@2.3.13/5, 9@2.3.13/5], 9001);cents(£, 3)'
    );
    expect(scale).toEqual(['248.925', '497.85', '702.15', '951.075', '1200.']);
  });

  it('generates TE marveldene', () => {
    const scale = expand(`
      3^[0..3] tns 5^[0..2]
      sort(£ rdc 2)
      commaList(225/224)
      cents(£, 3)
    `);
    expect(scale).toEqual([
      '84.902',
      '200.915',
      '267.816',
      '383.829',
      '468.731',
      '584.744',
      '700.756',
      '767.658',
      '901.671',
      '968.573',
      '1084.585',
      '1200.598',
    ]);
  });

  it('generates TE orgone with a named subgroup', () => {
    const scale = expand(`{
      77/64
      16/11
      7/4
      2/1
      const S = @2.7.11
      Temperament([11@S, 26@S])
      cents(£, 3)
    }`);
    expect(scale).toEqual(['323.28', '646.56', '969.84', '1199.66']);
  });

  it('can label a whole scale with its strings', () => {
    const scale = expand(`
      9/8
      4/3
      3/2
      9/5
      2/1
      vstr($)
      12@
    `);
    expect(scale).toEqual([
      '2\\12 "9/8"',
      '5\\12 "4/3"',
      '7\\12 "3/2"',
      '10\\12 "9/5"',
      '12\\12 "2/1"',
    ]);
  });

  it('tempers using 6@3/2.8/7', () => {
    const scale = expand(`
      8/7
      3/2
      6@3/2.8/7
    `);
    expect(scale).toEqual(['2\\6<3/2>', '6\\6<3/2>']);
  });

  it('tempers using r6q@8/7.3/2', () => {
    const scale = expand(`
      8/7
      3/2
      r6q@8/7.3/2
    `);
    expect(scale).toEqual(['1\\6<3/2>', '6\\6<3/2>']);
  });

  it('spells a spiral segment of minor seconds cleanly', () => {
    const scale = expand('C4 + m2 * [1..5]');
    expect(scale).toEqual(['D♭4', 'E𝄫4', 'F𝄫4', 'G♭𝄫4', 'A𝄫𝄫4']);
  });

  it('spells stacked augmented unisons cleanly', () => {
    const scale = expand('C4 + Aug1 * [1..4]');
    expect(scale).toEqual(['C♯4', 'C𝄪4', 'C♯𝄪4', 'C𝄪𝄪4']);
  });

  it('rejects 2 = 1 in a way that makes sense to the user', () => {
    expect(() => evaluateSource('2 = 1')).toThrow(
      'Cannot assign relative pitch to relative pitch.'
    );
  });

  it('respects fractional formatting in rdc (both)', () => {
    const scale = expand('sort(3/2 ^ [-2..2] rdc 2/1)');
    expect(scale).toEqual(['9/8', '4/3', '3/2', '16/9', '2/1']);
  });

  it('respects fractional formatting in rdc (right)', () => {
    const scale = expand('sort(3 ^ [-2..2] rdc 2/1)');
    expect(scale).toEqual(['9/8', '4/3', '3/2', '16/9', '2/1']);
  });

  it('respects fractional formatting in rdc (left)', () => {
    const scale = expand('sort(3/2 ^ [-2..2] rdc 2)');
    expect(scale).toEqual(['9/8', '4/3', '3/2', '16/9', '2/1']);
  });

  it('formats (un)respelled logarithmic quantities logarithmically', () => {
    const scale = expand('[1..5] \\ 5;respell([16/15], 1)');
    expect(scale).toEqual(['1\\5', '2\\5', '3\\5', '4\\5', '5\\5']);
  });

  it('gives up on absolute diamond MOS if J4 is not unison (relative)', () => {
    const scale = expand('A4 = 9\\12;MOS 4L 2s;automos()');
    expect(scale).toEqual([
      'MOS {LLsLLs;L=2^1/5;s=2^1/10}',
      'P1ms',
      'Aug2ms',
      'P3ms',
      'P4ms',
      'Aug5ms',
      'P6ms',
    ]);
  });

  it('gives up on absolute diamond MOS if J4 is not unison (absolute)', () => {
    const scale = expand('A4 = 440 Hz;MOS 2L 6s;automos()');
    expect(scale).toEqual([
      'MOS {LsssLsss;L=2^1/5;s=2^1/10}',
      'Aug1ms',
      'Maj2ms',
      'P3ms',
      'P4ms',
      'Aug5ms',
      'Maj6ms',
      'P7ms',
      'P8ms',
    ]);
  });

  it('recreates diatonic with automos if J4 is not unison', () => {
    const scale = expand('MOS {LLsLLLs;L=9/8};J4=2;automos()');
    expect(scale).toEqual([
      'MOS {LLsLLLs;L=9/8;s=256/243}',
      'Maj1ms',
      'Maj2ms',
      'P3ms',
      'P4ms',
      'Maj5ms',
      'Maj6ms',
      'P7ms',
    ]);
  });
});
