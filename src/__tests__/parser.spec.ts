import {describe, it, expect} from 'vitest';
import {parseSource} from '../parser';

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
    if (interval.node?.type === 'PlainLiteral') {
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
    expect(interval.toString()).toBe('1<3>'); // TODO: Parse PowjiLiterals
  });

  it('accesses variables', () => {
    const scale = parseSource('TAU;');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    // The correct value is actually 6,283185307179586, but it gets mushed a bit along the way.
    expect(interval.toString()).toBe('6,283185307179587');
  });

  it('can call built-in functions', () => {
    const scale = parseSource('7;1;2;TAU;1\\2;sort();');
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1;1\\2;2;6,283185307179587;7'
    );
  });
});
