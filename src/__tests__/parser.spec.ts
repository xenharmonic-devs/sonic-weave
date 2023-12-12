import {describe, it, expect} from 'vitest';
import {parseAST, parseSource, StatementVisitor} from '../parser';
import {TimeMonzo} from '../monzo';
import {Interval} from '../interval';

describe('SonicWeave parser', () => {
  it('evaluates a single number', () => {
    const scale = parseSource('3;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.toBigInteger()).toBe(3n);
  });

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

  it('adds two nedos with denominator preference', () => {
    const scale = parseSource('4\\12 + 2\\12;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('6\\12');
  });

  it('adds a number to nedo (left preference)', () => {
    const scale = parseSource('2 ~+ 3\\3;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('4');
  });

  it('adds a number to nedo (right preference)', () => {
    const scale = parseSource('2 +~ 3\\3;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('6\\3');
  });

  it('adds a number to nedo (impossible right preference)', () => {
    const scale = parseSource('1 +~ 3\\3;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('1\\1<3>');
  });

  it('accesses variables', () => {
    const scale = parseSource('TAU;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    // The correct value is actually 6,283185307179586, but it gets mushed a bit along the way.
    expect(interval.toString()).toBe('6,283185307179587!');
  });

  it('can call built-in functions', () => {
    const scale = parseSource('7;1;2;TAU;1\\2;sort();');
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1;1\\2;2;6,283185307179587!;7'
    );
  });

  it('can declare variables', () => {
    const ast = parseAST('i = 676/675 /* The Island comma */;');
    const visitor = new StatementVisitor();
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

  it('adds hertz', () => {
    const scale = parseSource('69 mHz + 420 Hz + 9 kHz;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('9420.069 Hz');
  });

  it('subtracts cents', () => {
    const scale = parseSource('1.955 - c;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.value.totalCents()).toBeCloseTo(0.955);
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
    const visitor = new StatementVisitor();
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
    const scale = parseSource('edo(6);');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\6;2\\6;3\\6;4\\6;5\\6;6\\6'
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

  it.skip('rotates scales', () => {
    const scale = parseSource('1\\6;2\\6;6\\6;rotate();');
  });
});
