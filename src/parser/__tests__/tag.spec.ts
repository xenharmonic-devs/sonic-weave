import {describe, it, expect} from 'vitest';
import {sw, swr} from '../../parser';
import {Interval} from '../../interval';
import {Fraction} from 'xen-dev-utils';

describe('SonicWeave template tag', () => {
  it('evaluates a single number', () => {
    const value = sw`3` as Interval;
    expect(value.value.toBigInteger()).toBe(3n);
  });

  it('evaluates a single number passed in', () => {
    const n = Math.floor(Math.random() * 100);
    const value = sw`${n}` as Interval;
    expect(value.toInteger()).toBe(n);
  });

  it('evaluates a newline', () => {
    const value = sw`"\\n"` as string;
    expect(value).toBe('\n');
  });

  it('evaluates an array of numbers passed in', () => {
    const nums: number[] = [];
    for (let i = 0; i < 10 * Math.random(); ++i) {
      nums.push(Math.floor(Math.random() * 100));
    }
    const value = sw`${nums}` as Interval[];
    expect(value.map(i => i.toInteger())).toEqual(nums);
  });

  it('evaluates PI passed in', () => {
    const value = sw`${Math.PI}` as Interval;
    expect(value.valueOf()).toBeCloseTo(Math.PI);
  });

  it('evaluates the backslash of two number passed in', () => {
    const value = sw`${12}\\${12}` as Interval;
    expect(value.valueOf()).toBe(2);
  });

  it('evaluates drop of a fraction passed in', () => {
    const fraction = new Fraction('3/2');
    const value = sw`\\${fraction}` as Interval;
    expect(value.valueOf()).toBe(1.4956740800018837);
  });

  it('evaluates access to a record passed in', () => {
    const value = sw`${{
      third: new Fraction('6/5'),
      fifth: new Fraction('3/2'),
      octave: 2,
    }}['fifth']` as Interval;
    expect(value.domain).toBe('linear');
    expect(value.valueOf()).toBe(1.5);
  });

  it('evaluates the TypeDoc example', () => {
    const interval = sw`7\\12` as Interval;
    expect(interval.totalCents()).toBe(700);
  });
});

describe('SonicWeave raw template tag', () => {
  it('evaluates a single number', () => {
    const value = swr`3` as Interval;
    expect(value.value.toBigInteger()).toBe(3n);
  });

  it('evaluates a single number passed in', () => {
    const n = Math.floor(Math.random() * 100);
    const value = swr`${n}` as Interval;
    expect(value.toInteger()).toBe(n);
  });

  it('evaluates a newline', () => {
    const value = swr`"\n"` as string;
    expect(value).toBe('\n');
  });

  it('evaluates an array of numbers passed in', () => {
    const nums: number[] = [];
    for (let i = 0; i < 10 * Math.random(); ++i) {
      nums.push(Math.floor(Math.random() * 100));
    }
    const value = swr`${nums}` as Interval[];
    expect(value.map(i => i.toInteger())).toEqual(nums);
  });

  it('evaluates PI passed in', () => {
    const value = swr`${Math.PI}` as Interval;
    expect(value.valueOf()).toBeCloseTo(Math.PI);
  });

  it('evaluates the backslash of two number passed in', () => {
    // JS template grammar is broken:
    // swr`${12}\${12}` escapes the dollar sign (Not even String.raw survives this corner case.)
    // swr`${12}\\${12}` is equivalent to 12 \ (\12)
    const value = swr`${12}°${12}` as Interval;
    expect(value.valueOf()).toBe(2);
  });

  it('evaluates drop of a fraction passed in', () => {
    const fraction = new Fraction('3/2');
    // See above why swr`\${fraction}` just won't do...
    const value = swr`drop${fraction}` as Interval;
    expect(value.valueOf()).toBe(1.4956740800018837);
  });

  it('evaluates the TypeDoc example', () => {
    const interval = swr`7\12` as Interval;
    expect(interval.totalCents()).toBe(700);
  });
});
