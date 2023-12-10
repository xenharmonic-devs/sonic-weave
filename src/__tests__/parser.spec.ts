import {describe, it, expect} from 'vitest';
import {parseSource} from '../parser';

describe('SonicWeave parser', () => {
  it('evaluates a single number', () => {
    const scale = parseSource('3;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.toInteger()).toBe(3);
  });

  it('colors a single number', () => {
    const scale = parseSource('2;#f00;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.toInteger()).toBe(2);
    expect(scale[0].color?.value).toBe('#f00');
  });

  it('adds two numbers', () => {
    const scale = parseSource('3 + 4;');
    expect(scale).toHaveLength(1);
    expect(scale[0].value.toInteger()).toBe(7);
    expect(scale[0].node?.value).toBe(7n);
  });
});
