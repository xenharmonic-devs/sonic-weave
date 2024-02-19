import {describe, it, expect} from 'vitest';
import {parseChord, parseVals} from '../chord-parser';
import {MonzoLiteral} from '../expression';

describe('Chord input parser', () => {
  it.each(['1 2 3', '1|2|3', '1&2&3', '1;2;3', '1,2,3', '1:2:3'])(
    'parses integers %s',
    (input: string) => {
      const result = parseChord(input);
      expect(result).toHaveLength(3);
      expect(result[0].node?.type).toBe('IntegerLiteral');
      expect(result.map(i => i.toString())).toEqual(['1', '2', '3']);
    }
  );
  it('parses comma-separated monzos', () => {
    const result = parseChord('[-4 4 -1>, [0, 1/2>,[0,-1,1>');
    expect(result).toHaveLength(3);
    expect(result[0].node?.type).toBe('MonzoLiteral');
    expect(result.map(i => i.toString())).toEqual([
      '[-4 4 -1>',
      '[0 1/2>',
      '[0 -1 1>',
    ]);
  });
  it('parses a lifted monzo', () => {
    const result = parseChord('/[2 -1>');
    expect(result).toHaveLength(1);
    expect((result[0].node as MonzoLiteral).lifts).toBe(1);
  });
  it('parses nested array-like expressions', () => {
    const result = parseChord('9,(4:5:6),[2,3],geodiff(7:8:9)');
    expect(result.map(i => i.toString())).toEqual([
      '9',
      '5/4',
      '6/4',
      '2',
      '3',
      '8/7',
      '9/8',
    ]);
  });
});

describe('Val input parser', () => {
  it('parses space-separated vals', () => {
    const result = parseVals('<12 19]   <5 8]', '2.3');
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      [12, 19],
      [5, 8],
    ]);
  });
  it('parses &-separated warts', () => {
    const result = parseVals('12&17c', '5');
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      [12, 19, 28],
      [17, 27, 40],
    ]);
  });
  it('parses comma-separated SOVs', () => {
    const result = parseVals('24,67[^7]', '2.3.7');
    expect(result).toEqual([
      [24, 38, 67],
      [67, 106, 189],
    ]);
  });
  it('parses fractional subgroup vals', () => {
    const result = parseVals('5;<9 14,  12]', '2.3.13/5');
    expect(result).toEqual([
      [5, 8, 7],
      [9, 14, 12],
    ]);
  });
  it('parses free vals', () => {
    const result = parseVals('12', '');
    expect(result).toEqual([[12, 19, 28, 34, 42, 44, 49, 51, 54]]);
  });
});
