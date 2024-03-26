import {describe, it, expect} from 'vitest';
import {
  zeroVector,
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
  it('does not mutate input', () => {
    const vector = {a: 1, b: 2, c: -3};
    const vector2 = {a: 1, b: 2, c: -3};
    const originalVector = {...vector};
    const originalVector2 = {...vector2};
    add(vector, vector2);
    expect(vector).toStrictEqual(originalVector);
    expect(vector2).toStrictEqual(originalVector2);
    add(vector2, vector);
    expect(vector).toStrictEqual(originalVector);
    const zero = zeroVector();
    add(zero, zeroVector());
    expect(zero).toStrictEqual(zeroVector());
    add(zeroVector(), zero);
    expect(zero).toStrictEqual(zeroVector());
  });
  it('has identity element zeroVector()', () => {
    const vector = {a: 1, b: 2, c: -3};
    expect(add(vector, zeroVector())).toStrictEqual(vector);
    expect(add(zeroVector(), vector)).toStrictEqual(vector);
  });
  it('can update existing components', () => {
    const v1 = {a: 1, b: 2, c: -3};
    const v2 = {a: 1, b: 1, c: 1};
    const sum = {a: 2, b: 3, c: -2};
    expect(add(v1, v2)).toStrictEqual(sum);
    expect(add(v2, v1)).toStrictEqual(sum);
  });
  it('can add new components', () => {
    const v1 = {a: 1, b: 2, c: -3};
    const v2 = {d: 1, e: 1};
    const sum = {a: 1, b: 2, c: -3, d: 1, e: 1};
    expect(add(v1, v2)).toStrictEqual(sum);
    expect(add(v2, v1)).toStrictEqual(sum);
  });
  it('removes components that cancel', () => {
    const v1 = {a: 1, b: 2, c: -3};
    const v2 = {a: -1, b: -2};
    const sum = {c: -3};
    expect(add(v1, v2)).toStrictEqual(sum);
    expect(add(v2, v1)).toStrictEqual(sum);
  });
});

describe('scalarMult()', () => {
  it('does not mutate input', () => {
    const scalar = 1000;
    const vector = {a: 1, b: 2, c: -3};
    const originalVector = {...vector};
    scalarMult(scalar, vector);
    expect(vector).toStrictEqual(originalVector);
    expect(scalar).toBe(1000);
    const zero = zeroVector();
    scalarMult(scalar, zero);
    expect(zero).toStrictEqual(zeroVector());
  });
  it('correctly multiplies values for keys', () => {
    const vector = {a: 1, b: 2, c: -3};
    const tenTimes = scalarMult(10, vector);
    expect(tenTimes).toStrictEqual({a: 10, b: 20, c: -30});
    const minusTenTimes = scalarMult(-10, vector);
    expect(minusTenTimes).toStrictEqual({a: -10, b: -20, c: 30});
  });
  it('returns zero vector if scalar === 0', () => {
    const vector = {a: 1, b: 2, c: -3};
    const shouldBeZero = scalarMult(0, vector);
    expect(shouldBeZero).toStrictEqual(zeroVector());
  });
  it('respects the zero vector', () => {
    const multiple = scalarMult(1000, zeroVector());
    expect(multiple).toStrictEqual(zeroVector());
  });
  it('does not change the vector when multiplying by scalar 1', () => {
    const vector = {a: 1, b: 2, c: -3};
    const oneTimes = scalarMult(1, vector);
    expect(oneTimes).toStrictEqual(vector);
  });
});

describe('neg()', () => {
  it('does not mutate input', () => {
    const vector = {a: 1, b: 2, c: -3};
    const originalVector = {...vector};
    neg(vector);
    expect(vector).toStrictEqual(originalVector);
    const zero = zeroVector();
    neg(zero);
    expect(zero).toStrictEqual(zeroVector());
  });
  it('negates vectors', () => {
    const v = {a: 1, b: 2, c: -3};
    expect(add(v, neg(v))).toStrictEqual(zeroVector());
    expect(add(neg(v), v)).toStrictEqual(zeroVector());
    expect(neg(zeroVector())).toStrictEqual(zeroVector());
  });
});

describe('sub()', () => {
  it('does not mutate input', () => {
    const vector = {a: 1, b: 2, c: -3};
    const vector2 = {a: 1, b: 2, c: -3};
    const originalVector = {...vector};
    const originalVector2 = {...vector2};
    sub(vector, vector2);
    expect(vector).toStrictEqual(originalVector);
    expect(vector2).toStrictEqual(originalVector2);
    sub(vector2, vector);
    expect(vector).toStrictEqual(originalVector);
    const zero = zeroVector();
    sub(zero, zeroVector());
    expect(zero).toStrictEqual(zeroVector());
    sub(zeroVector(), zero);
    expect(zero).toStrictEqual(zeroVector());
  });
  it('subtracts vectors', () => {
    const v1 = {a: 1, b: 2, c: -3};
    const v2 = {a: 1, b: 1, c: 1};
    const diff = {b: 1, c: -4};
    expect(sub(v1, v2)).toStrictEqual(diff);
  });
});

describe('stepSignature()', () => {
  it('does not mutate input', () => {
    const empty = '';
    stepSignature(empty);
    expect(empty).toBe('');
    const ionian = 'LLsLLLs';
    stepSignature(ionian);
    expect(ionian).toBe('LLsLLLs');
  });
  it('converts a string into the corresponding step vector', () => {
    const lydian = 'LLLsLLs';
    const stepSig = stepSignature(lydian);
    expect(stepSig).toStrictEqual({L: 5, s: 2});
  });
  it('orders step sizes correctly', () => {
    const word = 'AZabcz';
    const stepSig = stepSignature(word);
    expect(stepSig).toStrictEqual({
      A: 1,
      Z: 1,
      a: 1,
      b: 1,
      c: 1,
      z: 1,
    });
  });
});
describe('getStepVector()', () => {
  it('does not mutate input', () => {
    const empty = '';
    getStepVector(empty, 1);
    expect(empty).toBe('');
    const ionian = 'LLsLLLs';
    getStepVector(ionian, 1);
    expect(ionian).toBe('LLsLLLs');
  });
  it('returns zero vector if empty word is passed', () => {
    expect(getStepVector('', 1000)).toStrictEqual(zeroVector());
  });
  it('creates a step vector from any 0-based substring of a string', () => {
    const lydian = 'LLLsLLs';
    const zeroStep = getStepVector(lydian, 0);
    expect(zeroStep).toStrictEqual(zeroVector());
    const oneStep = getStepVector(lydian, 1);
    expect(oneStep).toStrictEqual({L: 1});
    const twoStep = getStepVector(lydian, 2);
    expect(twoStep).toStrictEqual({L: 2});
    const threeStep = getStepVector(lydian, 3);
    expect(threeStep).toStrictEqual({L: 3});
    const fourStep = getStepVector(lydian, 4);
    expect(fourStep).toStrictEqual({L: 3, s: 1});
    const fiveStep = getStepVector(lydian, 5);
    expect(fiveStep).toStrictEqual({L: 4, s: 1});
    const sixStep = getStepVector(lydian, 6);
    expect(sixStep).toStrictEqual({L: 5, s: 1});
    const sevenStep = getStepVector(lydian, 7);
    expect(sevenStep).toStrictEqual({L: 5, s: 2});
  });
  it('handles intervals larger than the equave correctly', () => {
    const lydian = 'LLLsLLs';
    const eightStep = getStepVector(lydian, 8);
    expect(eightStep).toStrictEqual({L: 6, s: 2});
    const sixteenStep = getStepVector(lydian, 16);
    expect(sixteenStep).toStrictEqual({L: 12, s: 4});
  });
});

describe('norm()', () => {
  it('does not mutate input', () => {
    const zero = zeroVector();
    norm(zero);
    expect(zero).toStrictEqual(zeroVector());
    const vector = {a: 1, b: 2, c: -3};
    norm(vector);
    expect(vector).toStrictEqual({a: 1, b: 2, c: -3});
  });
  it('returns 0 for zero vector', () => {
    expect(norm(zeroVector())).toBe(0);
  });
  it('computes taxicab norm correctly', () => {
    expect(norm({a: 2, b: -3})).toBe(5);
    expect(norm({a: -1, b: -3, c: -5})).toBe(9);
  });
});

describe('wordArity()', () => {
  it('does not mutate input', () => {
    const empty = '';
    wordArity(empty);
    expect(empty).toBe('');
    const ionian = 'LLsLLLs';
    wordArity(ionian);
    expect(ionian).toBe('LLsLLLs');
  });
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
  it('does not mutate input', () => {
    const zero = zeroVector();
    stepVectorArity(zero);
    expect(zero).toStrictEqual(zeroVector());
    const vector = {a: 1, b: 2, c: -3};
    stepVectorArity(vector);
    expect(vector).toStrictEqual({a: 1, b: 2, c: -3});
  });
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
  it('does not mutate input', () => {
    const empty = '';
    rotate(empty, 1);
    expect(empty).toBe('');
    const ionian = 'LLsLLLs';
    rotate(ionian, 1);
    expect(ionian).toBe('LLsLLLs');
  });
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
