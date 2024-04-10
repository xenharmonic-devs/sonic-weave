import {describe, it, expect} from 'vitest';
import {hasConstantStructure, subtensions} from '../builtin';
import {TimeMonzo} from '../monzo';

describe('Constant structure checker', () => {
  it('accepts the empty scale', () => {
    expect(hasConstantStructure([])).toBe(true);
  });

  it('Accepts the trivial scale', () => {
    expect(hasConstantStructure([TimeMonzo.fromFraction(2)])).toBe(true);
  });

  it('Rejects a scale with a repeated step (early)', () => {
    expect(
      hasConstantStructure([
        TimeMonzo.fromFraction(1),
        TimeMonzo.fromFraction(2),
      ])
    ).toBe(false);
  });

  it('Rejects a scale with a repeated step (late)', () => {
    expect(
      hasConstantStructure([
        TimeMonzo.fromFraction(2),
        TimeMonzo.fromFraction(2),
      ])
    ).toBe(false);
  });
});

describe('Subtension calculator', () => {
  it('calculates the structure of Raga Bhairavi', () => {
    const scale = ['16/15', '9/8', '6/5', '27/20', '3/2', '8/5', '9/5', '2'];
    const subtenders = Object.fromEntries(
      subtensions(scale.map(TimeMonzo.fromFraction)).map(
        ({monzo, subtensions}) => [
          monzo.toFraction().toFraction(),
          Array.from(subtensions).sort(),
        ]
      )
    );
    expect(subtenders).toEqual({
      '2': [8],
      '16/15': [1],
      '9/8': [1, 2],
      '6/5': [2, 3],
      '27/20': [4],
      '3/2': [4, 5],
      '8/5': [5, 6],
      '9/5': [7],
      '135/128': [1],
      '81/64': [3],
      '45/32': [4],
      '27/16': [6],
      '15/8': [7],
      '4/3': [3, 4],
      '64/45': [4],
      '16/9': [6, 7],
      '256/135': [7],
      '5/4': [2, 3],
      '5/3': [5, 6],
      '10/9': [1],
      '32/27': [2],
      '40/27': [4],
      '128/81': [5],
    });
  });
});
