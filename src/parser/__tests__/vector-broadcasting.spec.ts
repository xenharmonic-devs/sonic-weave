import {describe, it, expect} from 'vitest';
import {sw} from '../parser';
import {Interval} from '../../interval';

function sw1D(strings: TemplateStringsArray, ...args: any[]): number[] {
  const result: any = sw(strings, ...args);
  if (!Array.isArray(result)) {
    throw new Error('Failed to evaluate to an array.');
  }
  for (let i = 0; i < result.length; ++i) {
    if (result[i] instanceof Interval) {
      result[i] = result[i].valueOf();
    } else {
      throw new Error('Failed to evaluate to intervals.');
    }
  }
  return result;
}

function sw2D(strings: TemplateStringsArray, ...args: any[]): number[][] {
  const result: any = sw(strings, ...args);
  if (!Array.isArray(result)) {
    throw new Error('Failed to evaluate to an array.');
  }
  for (let i = 0; i < result.length; ++i) {
    if (!Array.isArray(result[i])) {
      throw new Error('Failed to evaluate to arrays.');
    }
    for (let j = 0; j < result[i].length; ++j) {
      if (result[i][j] instanceof Interval) {
        result[i][j] = result[i][j].valueOf();
      } else {
        throw new Error('Failed to evaluate to intervals.');
      }
    }
  }
  return result;
}

function swRec(
  strings: TemplateStringsArray,
  ...args: any[]
): Record<string, number> {
  const result: any = sw(strings, ...args);
  return Object.fromEntries(
    Object.entries(result).map(([key, value]) => [
      key,
      (value as any).valueOf(),
    ])
  ) as Record<string, number>;
}

describe('SonicWeave vector broadcasting', () => {
  it('refuses to mix arrays with records', () => {
    expect(() => sw`[1, 2] {a: 3, b: 4}`).toThrow(
      'Unable to broadcast an array and record together.'
    );
  });

  it('refuses to mix arrays of different lengths together', () => {
    expect(() => sw`[1, 2] [3, 4, 5]`).toThrow(
      'Unable to broadcast arrays together with lengths 2 and 3.'
    );
  });

  it('refuses to mix disparate records together', () => {
    expect(() => sw`({a: 1}) {b: 2}`).toThrow(
      'Unable broadcast records together on key b.'
    );
  });

  it('implicitly multiplies a scalar with a 1D array', () => {
    const vec = sw1D`3 [5, 7]`;
    expect(vec).toEqual([15, 21]);
  });

  it('implicitly multiplies a scalar with a 2D array', () => {
    const mat = sw2D`3 [[5, 7], [11, 13]]`;
    expect(mat).toEqual([
      [15, 21],
      [33, 39],
    ]);
  });

  it('implicitly multiplies a 1D array with a scalar', () => {
    const vec = sw1D`[3, 5] 7`;
    expect(vec).toEqual([21, 35]);
  });

  it('implicitly multiplies a 1D array with a 1D array', () => {
    const vec = sw1D`[3, 5] [7, 11]`;
    expect(vec).toEqual([21, 55]);
  });

  it('implicitly multiplies a 1D array with a 2D array', () => {
    const mat = sw2D`[3, 5] [[7, 11], [13, 17]]`;
    expect(mat).toEqual([
      [21, 33],
      [65, 85],
    ]);
  });

  it('implicitly multiplies a 2D array with a scalar', () => {
    const mat = sw2D`[[3, 5], [7, 11]] 13`;
    expect(mat).toEqual([
      [39, 65],
      [91, 143],
    ]);
  });

  it('implicitly multiplies a 2D array with a 1D array', () => {
    const mat = sw2D`[[3, 5], [7, 11]] [13, 17]`;
    expect(mat).toEqual([
      [39, 65],
      [119, 187],
    ]);
  });

  it('implicitly multiplies a 2D array with a 2D array', () => {
    const mat = sw2D`[[3, 5], [7, 11]] [[13, 17], [19, 23]]`;
    expect(mat).toEqual([
      [39, 85],
      [133, 253],
    ]);
  });

  it('implicitly multiplies records', () => {
    const rec = swRec`({a: 3, b: 5}) {a: 7, b: 11}`;
    expect(rec).toEqual({a: 21, b: 55});
  });
});
