import {describe, it, expect} from 'vitest';
import {parseChord} from '../chord-parser';
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
  it('parses space-separated vals', () => {
    const result = parseChord('<12 19]   <5 8]');
    expect(result).toHaveLength(2);
    expect(result[0].node?.type).toBe('ValLiteral');
    expect(result.map(i => i.toString())).toEqual(['<12 19]', '<5 8]']);
  });
  it('parses a lifted monzo', () => {
    const result = parseChord('/[2 -1>');
    expect(result).toHaveLength(1);
    expect((result[0].node as MonzoLiteral).lifts).toBe(1);
  });
});
