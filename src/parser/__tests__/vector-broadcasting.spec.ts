import {describe, it, expect} from 'vitest';
import {evaluateExpression, sw} from '../parser';
import {Interval} from '../../interval';
import {SonicWeavePrimitive} from '../../stdlib';

function sw0D(strings: TemplateStringsArray, ...args: any[]): number {
  const result = sw(strings, ...args);
  if (result instanceof Interval) {
    return result.valueOf();
  }
  throw new Error('Failed to evaluate to an interval.');
}

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

  it('implicitly multiplies a scalar with a scalar', () => {
    const x = sw0D`3 5`;
    expect(x).toEqual(15);
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

  it("doesn't broadcast unary not", () => {
    expect(evaluateExpression('not 0')).toBe(true);
    expect(evaluateExpression('not []')).toBe(true);
    expect(evaluateExpression('not 2')).toBe(false);
    expect(evaluateExpression('not [0, 0]')).toBe(false);
  });

  it.each([
    'vnot ',
    '-',
    '+',
    '%',
    '÷',
    '^',
    '∧',
    '∨',
    '/',
    'lift ',
    '\\',
    'drop ',
  ])('broadcasts unary operator "%s"', op => {
    const four = evaluateExpression(`${op}4`) as Interval;
    const negHalf = evaluateExpression(`${op}(-1/2)`) as Interval;

    const vec = evaluateExpression(`${op}[4, -1/2]`) as Interval[];
    expect(vec).toHaveLength(2);
    if (op === 'vnot ') {
      expect(vec[0]).toBe(four);
      expect(vec[1]).toBe(negHalf);
    } else {
      expect(vec[0].strictEquals(four)).toBe(true);
      expect(vec[1].strictEquals(negHalf)).toBe(true);
    }

    const mat = evaluateExpression(
      `${op}[[4, -1/2], [1, 1]]`
    ) as unknown as Interval[][];
    expect(mat).toHaveLength(2);
    expect(mat[0]).toHaveLength(2);
    if (op === 'vnot ') {
      expect(mat[0][0]).toBe(four);
      expect(mat[0][1]).toBe(negHalf);
    } else {
      expect(mat[0][0].strictEquals(four)).toBe(true);
      expect(mat[0][1].strictEquals(negHalf)).toBe(true);
    }

    const rec = evaluateExpression(
      `${op}{four: 4, "negative half": -1/2}`
    ) as Record<string, Interval>;
    expect(Object.keys(rec)).toHaveLength(2);
    if (op === 'vnot ') {
      expect(rec.four).toBe(four);
      expect(rec['negative half']).toBe(negHalf);
    } else {
      expect(rec.four.strictEquals(four)).toBe(true);
      expect(rec['negative half'].strictEquals(negHalf)).toBe(true);
    }
  });

  it.each([
    'vor',
    'vand',
    '===',
    '!==',
    '==',
    '!=',
    '<=',
    '>=',
    '<',
    '>',
    '+',
    '-',
    'max',
    'min',
    'to',
    'by',
    '/+',
    '⊕',
    '/-',
    '⊖',
    '*',
    '×',
    '%',
    '÷',
    '\\',
    '°',
    'mod',
    'modc',
    'rd',
    'rdc',
    'ed',
    '/_',
    '·',
    'dot',
    '^',
    '/^',
    '^/',
    '/',
  ])('broadcasts binary operator "%s"', op => {
    const fiveOpTwo = evaluateExpression(`5 ${op} 2`);
    const negHalfOpPi = evaluateExpression(`(-1/2) ${op} PI`);

    const mat = evaluateExpression(
      `[[5, 1], [1, -1/2]] ${op} [2, PI]`
    ) as unknown as SonicWeavePrimitive[][];
    expect(mat).toHaveLength(2);
    expect(mat[0]).toHaveLength(2);

    const rec = evaluateExpression(
      `({a: 5, b: -1/2}) ${op} {a: 2, b: PI}`
    ) as Record<string, SonicWeavePrimitive>;
    expect(Object.keys(rec)).toHaveLength(2);

    if (typeof fiveOpTwo === 'boolean') {
      expect(mat[0][0]).toBe(fiveOpTwo);
      expect(mat[1][1]).toBe(negHalfOpPi);

      expect(rec.a).toBe(fiveOpTwo);
      expect(rec.b).toBe(negHalfOpPi);
    } else if (
      fiveOpTwo instanceof Interval &&
      negHalfOpPi instanceof Interval
    ) {
      expect(fiveOpTwo.strictEquals(mat[0][0] as Interval)).toBe(true);
      expect(fiveOpTwo.strictEquals(rec.a as Interval)).toBe(true);
      if (isNaN(negHalfOpPi.valueOf())) {
        expect(mat[1][1]?.valueOf()).toBeNaN();
        expect(rec.b?.valueOf()).toBeNaN();
      } else {
        expect(negHalfOpPi.strictEquals(mat[1][1] as Interval)).toBe(true);
        expect(negHalfOpPi.strictEquals(rec.b as Interval)).toBe(true);
      }
    } else {
      throw new Error('Failed to evaluate to a boolean or an interval.');
    }
  });

  // TODO:
  // 'int',
  // 'radical',
  // 'nedji',
  // 'absoluteFJS',
  // 'FJS',
  // 'labelAbsoluteFJS',

  // 'tail',
  // 'colorOf',
  // 'labelOf',
  // 'equaveOf',
  // 'withEquave',

  it.each([
    'acos',
    'asin',
    'atan',
    'clz32',
    'cos',
    'expm1',
    'fround',
    'imul',
    'log1p',
    'sin',
    'tan',
    'isPrime',
    'simplify',
    'bleach',
    'linear',
    'logarithmic',
    'absolute',
    'relative',
    'decimal',
    'fraction',
    'monzo',
    'complexityOf',
    'JIP',
    'PrimeMapping(1200., 1902.)',
    'tenneyHeight',
    'floor',
    'round',
    'trunc',
    'ceil',
    'abs',
  ])('broadcasts unary function "%s"', fn => {
    // Implicit call
    const three = evaluateExpression(`1=440z;${fn} 3`) as Interval;
    // Explicit call
    const negThird = evaluateExpression(`1=440z;${fn}(-1/3)`) as Interval;

    const vec = evaluateExpression(`1=440z;${fn} [3, -1/3]`) as Interval[];
    expect(vec).toHaveLength(2);
    if (fn === 'isPrime') {
      expect(vec[0]).toBe(three);
      expect(vec[1]).toBe(negThird);
    } else {
      if (isNaN(three.valueOf())) {
        expect(vec[0].valueOf()).toBeNaN();
      } else {
        expect(vec[0].strictEquals(three)).toBe(true);
      }
      if (isNaN(negThird.valueOf())) {
        expect(vec[1].valueOf()).toBeNaN();
      } else {
        expect(vec[1].strictEquals(negThird)).toBe(true);
      }
    }

    const mat = evaluateExpression(
      `1=440z;${fn}([[3, -1/3], [1, 1]])`
    ) as unknown as Interval[][];
    expect(mat).toHaveLength(2);
    expect(mat[0]).toHaveLength(2);

    const rec = evaluateExpression(
      `1=440z;${fn} {a: 3, "negative third": -1/3}`
    ) as Record<string, Interval>;
    expect(Object.keys(rec)).toHaveLength(2);
  });
});
