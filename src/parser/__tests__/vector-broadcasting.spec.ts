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
    expect(() => sw`[1, 2] #{a: 3, b: 4}`).toThrow(
      'Unable to broadcast an array and record together.'
    );
  });

  it('refuses to mix arrays of different lengths together', () => {
    expect(() => sw`[1, 2] [3, 4, 5]`).toThrow(
      'Unable to broadcast arrays together with lengths 2 and 3.'
    );
  });

  it('refuses to mix disparate records together', () => {
    expect(() => sw`#{a: 1} #{b: 'label for b'}`).toThrow(
      'Unable broadcast records together on key b.'
    );
  });

  it('multiplies a scalar with a 1D array', () => {
    const vec = sw1D`3 * [5, 7]`;
    expect(vec).toEqual([15, 21]);
  });

  it('multiplies a scalar with a 2D array', () => {
    const mat = sw2D`3 * [[5, 7], [11, 13]]`;
    expect(mat).toEqual([
      [15, 21],
      [33, 39],
    ]);
  });

  it('multiplies a scalar with a scalar', () => {
    const x = sw0D`3 * 5`;
    expect(x).toEqual(15);
  });

  it('multiplies a 1D array with a scalar', () => {
    const vec = sw1D`[3, 5] * 7`;
    expect(vec).toEqual([21, 35]);
  });

  it('multiplies a 1D array with a 1D array', () => {
    const vec = sw1D`[3, 5] * [7, 11]`;
    expect(vec).toEqual([21, 55]);
  });

  it('multiplies a 1D array with a 2D array', () => {
    const mat = sw2D`[3, 5] * [[7, 11], [13, 17]]`;
    expect(mat).toEqual([
      [21, 33],
      [65, 85],
    ]);
  });

  it('multiplies a 2D array with a scalar', () => {
    const mat = sw2D`[[3, 5], [7, 11]] * 13`;
    expect(mat).toEqual([
      [39, 65],
      [91, 143],
    ]);
  });

  it('multiplies a 2D array with a 1D array', () => {
    const mat = sw2D`[[3, 5], [7, 11]] * [13, 17]`;
    expect(mat).toEqual([
      [39, 65],
      [119, 187],
    ]);
  });

  it('multiplies a 2D array with a 2D array', () => {
    const mat = sw2D`[[3, 5], [7, 11]] * [[13, 17], [19, 23]]`;
    expect(mat).toEqual([
      [39, 85],
      [133, 253],
    ]);
  });

  it('multiplies records', () => {
    const rec = swRec`#{a: 3, b: 5} * #{a: 7, b: 11}`;
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
      `${op}#{four: 4, "negative half": -1/2}`
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
    '==',
    '<>',
    '~=',
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
    'mod',
    'modc',
    'rd',
    'rdc',
    'ed',
    '/_',
    '~·',
    '~dot',
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
      `#{a: 5, b: -1/2} ${op} #{a: 2, b: PI}`
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
  // 'primeMonzo',
  // 'tail',

  // 'colorOf',
  // 'labelOf',

  // 'isAbsolute',
  // 'isRelative',
  // 'isLinear',
  // 'isLogarithmic',

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
    'wilsonHeight',
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
      `1=440z;${fn} #{a: 3, "negative third": -1/3}`
    ) as Record<string, Interval>;
    expect(Object.keys(rec)).toHaveLength(2);
  });

  it.each(['atan2', 'atanXY', 'gcd', 'lcm', 'S'])(
    'broadcasts binary function %s',
    fn => {
      const z = evaluateExpression(`${fn}(4, 6)`) as Interval;
      const vecL = evaluateExpression(`${fn}([4], 6)`) as Interval[];
      const vecR = evaluateExpression(`${fn}(4, [6])`) as Interval[];
      const vecLR = evaluateExpression(`${fn}([4], [6])`) as Interval[];
      expect(vecL).toHaveLength(1);
      expect(vecR).toHaveLength(1);
      expect(vecLR).toHaveLength(1);
      expect(vecL[0].strictEquals(z)).toBe(true);
      expect(vecR[0].strictEquals(z)).toBe(true);
      expect(vecLR[0].strictEquals(z)).toBe(true);
    }
  );

  it('has a broadcasting sign', () => {
    const zero = sw0D`0 sign`;
    expect(zero).toBe(0);

    const polarity = sw1D`[-1/2, PI] sign`;
    expect(polarity).toEqual([-1, 1]);

    const circleOfNaN = sw2D`sign([[0, LN2], [-1, nan]])`;
    expect(circleOfNaN).toEqual([
      [0, 1],
      [-1, NaN],
    ]);
  });

  it('has a broadcasting range relation', () => {
    const nah = sw0D`round(0 < PI < 3)`;
    expect(nah).toBe(0);

    const facts = sw1D`round([0, 1, 4] < PI <= [5, 4, 4])`;
    expect(facts).toEqual([1, 1, 0]);

    const mat = sw2D`round(3 >= [[-1, 1], [PI, E]] > 0)`;
    expect(mat).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });

  it('has a broadcasting Weil height', () => {
    const ln5 = sw0D`weilHeight 3/5`;
    expect(ln5.valueOf()).toBeCloseTo(Math.log(5));

    const [ln2, ln3] = sw1D`[2, 3/2] weilHeight`;
    expect(ln2.valueOf()).toBeCloseTo(Math.LN2);
    expect(ln3.valueOf()).toBeCloseTo(Math.log(3));
  });

  it('has vector dot product (reduction to scalar)', () => {
    // Missing elements interpreted as 0.
    const fourteen = sw0D`[-1, 2, 3] vdot [4, 5]`;
    expect(fourteen).toBe(6);
    const x = sw0D`[P8, 3] ~vdot [4, 5, 6]`;
    expect(x).toBe(23);
  });

  it('has vector dot product (matrix and vector)', () => {
    const vec = sw1D`[[1, 2], [3, 4]] vdot [5, 6]`;
    expect(vec).toEqual([17, 39]);
  });

  it('has vector dot product (reduction of 1 level)', () => {
    const vec2 = sw1D`[[1, 2], [3, 4]] vdot [[5, 6], [7, 8]]`;
    expect(vec2).toEqual([17, 53]);
  });

  it('has matrix dot product (row-vector and matrix)', () => {
    const vec = sw2D`[[5, 6]] mdot [[1, 2], [3, 4]]`;
    expect(vec).toEqual([[23, 34]]);
  });

  it('has matrix multiplication', () => {
    const mat = sw2D`
      [
        [1, 2, 3],
        [4, 5, 6],
      ] mdot [
        [7, 8],
        [9, 10],
        [11, 12],
      ]
    `;
    expect(mat).toEqual([
      [58, 64],
      [139, 154],
    ]);
  });

  it.skip('has some kind of vectorized matrix multiplication', () => {
    const mats = sw`
      [
        [
          [1, 2],
          [3, 4],
        ],
        [
          [5, 6],
          [7, 8]
        ],
        [
          [9, 10],
          [11, 12],
        ],
      ] mdot [
        [
          [13, 14],
          [15, 16],
        ],
        [
          [17, 18],
          [19, 20],
        ],
      ]
    ` as unknown as Interval[][][];
    expect(mats.map(mat => mat.map(row => row.map(i => i.valueOf())))).toEqual([
      [
        [41, 123],
        [47, 137],
      ],
      [
        [149, 263],
        [171, 293],
      ],
      [
        [257, 403],
        [295, 449],
      ],
    ]);
  });

  it('can transpose a matrix', () => {
    const mat = sw2D`transpose([[1, 2], [3, 4], [5, 6]])`;
    expect(mat).toEqual([
      [1, 3, 5],
      [2, 4, 6],
    ]);
  });
});
