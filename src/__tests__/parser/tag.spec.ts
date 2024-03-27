import {describe, it, expect} from 'vitest';
import {sw} from '../../parser';
import {Interval} from '../../interval';

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
    const value = sw`"\n"` as string;
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
});
