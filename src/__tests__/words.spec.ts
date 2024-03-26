import {describe, it, expect} from 'vitest';

import {
  add,
  sub,
  neg,
  norm,
  scalarMult,
  rotate,
  getStepVector,
  stepSignature,
  wordArity,
  stepVectorArity,
} from '../words';

describe('add()', () => {
  it('has identity element []', () => {
    const vector = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
    ];
    const vectorClone = JSON.parse(JSON.stringify(vector));
    expect(add(vector, [])).toStrictEqual(vector);
    expect(add([], vectorClone)).toStrictEqual(vector);
  });
  it('can update existing components', () => {
    const v1 = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
    ];
    const v2 = [
      ['a', 1],
      ['b', 1],
      ['c', 1],
    ];
    const v1Clone = JSON.parse(JSON.stringify(v1));
    const v2Clone = JSON.parse(JSON.stringify(v2));
    const sum = [
      ['a', 2],
      ['b', 3],
      ['c', -2],
    ];
    expect(add(v1, v2)).toStrictEqual(sum);
    expect(add(v2Clone, v1Clone)).toStrictEqual(sum);
  });
  it('can add new components', () => {
    const v1 = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
    ];
    const v2 = [
      ['d', 1],
      ['e', 1],
    ];
    const v1Clone = JSON.parse(JSON.stringify(v1));
    const v2Clone = JSON.parse(JSON.stringify(v2));
    const sum = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
      ['d', 1],
      ['e', 1],
    ];
    expect(add(v1, v2)).toStrictEqual(sum);
    expect(add(v2Clone, v1Clone)).toStrictEqual(sum);
  });
  it('removes components that cancel', () => {
    const v1 = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
    ];
    const v2 = [
      ['a', -1],
      ['b', -2],
    ];
    const v1Clone = JSON.parse(JSON.stringify(v1));
    const v2Clone = JSON.parse(JSON.stringify(v2));
    const sum = [['c', -3]];
    expect(add(v1, v2)).toStrictEqual(sum);
    expect(add(v2Clone, v1Clone)).toStrictEqual(sum);
  });
});

describe('scalarMult()', () => {
  it('correctly multiplies values for keys', () => {
    const vector = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
    ];
    const tenTimes = scalarMult(10, vector);
    expect(tenTimes).toStrictEqual([
      ['a', 10],
      ['b', 20],
      ['c', -30],
    ]);
    const minusTenTimes = scalarMult(-10, vector);
    expect(minusTenTimes).toStrictEqual([
      ['a', -10],
      ['b', -20],
      ['c', 30],
    ]);
  });
  it('returns zero vector if scalar === 0', () => {
    const vector = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
    ];
    const shouldBeZero = scalarMult(0, vector);
    expect(shouldBeZero).toStrictEqual([]);
  });
  it('respects the zero vector', () => {
    const multiple = scalarMult(1000, []);
    expect(multiple).toStrictEqual([]);
  });
  it('stays the same when multiplying by scalar 1', () => {
    const vector = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
    ];
    const oneTimes = scalarMult(1, vector);
    expect(oneTimes).toStrictEqual(vector);
  });
});

describe('neg()', () => {
  it('negates vectors', () => {
    const v1 = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
    ];
    const v1Clone = JSON.parse(JSON.stringify(v1));
    expect(add(v1, neg(v1))).toStrictEqual([]);
    expect(add(v1Clone, neg(v1Clone))).toStrictEqual([]);
  });
});

describe('sub()', () => {
  it('subtracts vectors', () => {
    const v1 = [
      ['a', 1],
      ['b', 2],
      ['c', -3],
    ];
    const v2 = [
      ['a', 1],
      ['b', 1],
      ['c', 1],
    ];
    const diff = [
      ['b', 1],
      ['c', -4],
    ];
    expect(sub(v1, v2)).toStrictEqual(diff);
  });
});

describe('stepSignature()', () => {
  it('converts a string into the corresponding step vector', () => {
    const lydian = 'LLLsLLs';
    const stepSig = stepSignature(lydian);
    expect(stepSig).toStrictEqual([
      ['L', 5],
      ['s', 2],
    ]);
  });
  it('orders step sizes correctly', () => {
    const word = 'AZabcz';
    const stepSig = stepSignature(word);
    expect(stepSig).toStrictEqual([
      ['A', 1],
      ['Z', 1],
      ['a', 1],
      ['b', 1],
      ['c', 1],
      ['z', 1],
    ]);
  });
});
describe('getStepVector()', () => {
  it('creates a step vector from any 0-based substring of a string', () => {
    const lydian = 'LLLsLLs';
    const zeroStep = getStepVector(lydian, 0);
    expect(zeroStep).toStrictEqual([]);
    const oneStep = getStepVector(lydian, 1);
    expect(oneStep).toStrictEqual([['L', 1]]);
    const twoStep = getStepVector(lydian, 2);
    expect(twoStep).toStrictEqual([['L', 2]]);
    const threeStep = getStepVector(lydian, 3);
    expect(threeStep).toStrictEqual([['L', 3]]);
    const fourStep = getStepVector(lydian, 4);
    expect(fourStep).toStrictEqual([
      ['L', 3],
      ['s', 1],
    ]);
    const fiveStep = getStepVector(lydian, 5);
    expect(fiveStep).toStrictEqual([
      ['L', 4],
      ['s', 1],
    ]);
    const sixStep = getStepVector(lydian, 6);
    expect(sixStep).toStrictEqual([
      ['L', 5],
      ['s', 1],
    ]);
    const sevenStep = getStepVector(lydian, 7);
    expect(sevenStep).toStrictEqual([
      ['L', 5],
      ['s', 2],
    ]);
  });
  it('handles intervals larger than the equave correctly', () => {
    const lydian = 'LLLsLLs';
    const eightStep = getStepVector(lydian, 8);
    expect(eightStep).toStrictEqual([
      ['L', 6],
      ['s', 2],
    ]);
    const sixteenStep = getStepVector(lydian, 16);
    expect(sixteenStep).toStrictEqual([
      ['L', 12],
      ['s', 4],
    ]);
  });
});

describe('norm()', () => {
  it('returns 0 for []', () => {
    expect(norm([])).toBe(0);
  });
  it('computes taxicab norm correctly', () => {
    expect(
      norm([
        ['a', 2],
        ['b', -3],
      ])
    ).toBe(5);
    expect(
      norm([
        ['a', -1],
        ['b', -3],
        ['c', -5],
      ])
    ).toBe(9);
  });
});

describe('wordArity()', () => {
  it('returns 0 for empty string', () => {
    expect(wordArity('')).toBe(0);
  });
  it('returns the correct number of step sizes', () => {
    expect(wordArity('xxxxxxx')).toBe(1);
    expect(wordArity('z')).toBe(1);
    expect(wordArity('abababa')).toBe(2);
    expect(wordArity('abacaba')).toBe(3);
    expect(wordArity('abcdefg')).toBe(7);
  });
});

describe('stepVectorArity()', () => {
  it('is compatible with getStepVector()', () => {
    expect(stepVectorArity(getStepVector(''))).toBe(0);
    expect(stepVectorArity(getStepVector('xxxxxxx'))).toBe(1);
    expect(stepVectorArity(getStepVector('z'))).toBe(1);
    expect(stepVectorArity(getStepVector('abababa'))).toBe(2);
    expect(stepVectorArity(getStepVector('abacaba'))).toBe(3);
    expect(stepVectorArity(getStepVector('abcdefg'))).toBe(7);
  });
});

describe('rotate()', () => {
  it('rotates the diatonic scale correctly', () => {
    const ionian = 'LLsLLLs';
    expect(rotate(ionian, 0)).toBe('LLsLLLs');
    expect(rotate(ionian, 1)).toBe('LsLLLsL');
    expect(rotate(ionian, 2)).toBe('sLLLsLL');
    expect(rotate(ionian, 3)).toBe('LLLsLLs');
    expect(rotate(ionian, 4)).toBe('LLsLLsL');
    expect(rotate(ionian, 5)).toBe('LsLLsLL');
    expect(rotate(ionian, 6)).toBe('sLLsLLL');
    expect(rotate(ionian, 7)).toBe('LLsLLLs');
  });
  it('handles offsets outside of 0, ..., scale.length - 1', () => {
    const ionian = 'LLsLLLs';
    expect(rotate(ionian, -1)).toBe('sLLsLLL');
    expect(rotate(ionian, 7)).toBe('LLsLLLs');
    expect(rotate(ionian, 8)).toBe('LsLLLsL');
  });
});
