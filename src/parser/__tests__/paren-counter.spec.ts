import {describe, it, expect} from 'vitest';
import {parse} from '../paren-counter';

describe('Parenthesis counter', () => {
  it('counts complete statements', () => {
    const counts = parse(`
      if (1 === 2) {
        123;
      }
      (456 + 789);
    `);
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 0});
  });

  it('counts incomplete statements', () => {
    const counts = parse(`
      if (1 === 2) {
        123;
    `);
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 1});
  });

  it('ignores curly braces inside strings', () => {
    const counts = parse(`
      let i = 10
      while (i--) {
        i "Look at this curly brace }!"
    `);
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 1});
  });

  it('ignores curly braces inside comments #1', () => {
    const counts = parse(`
      for (const i of $) {
        (* Stealthy curly brace } *)
        (* More stealthy braces {{{
          (* Oh no it's an unpaired square bracket [ ! *)
            *)
    `);
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 1});
  });

  it('ignores curly braces inside comments #2', () => {
    const counts = parse('if (0) {\n(*//}*)\n');
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 1});
  });

  it('works with monzos', () => {
    const counts = parse('[-1 1>');
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 0});
  });

  it('works with partial statements and monzos', () => {
    const counts = parse('if(1){\n[-1 1>\n');
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 1});
  });

  it('works with penultimate ranges', () => {
    const counts = parse('[1 .. < 5]');
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 0});
  });

  it('works with penultimate ranges (unclosed)', () => {
    const counts = parse('[1 .. < 5');
    expect(counts).toEqual({parens: 0, squares: 1, curlies: 0});
  });

  it('works with arrays', () => {
    const counts = parse('[1, 2, "hello"]');
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 0});
  });

  it('works with arrays (unclosed)', () => {
    const counts = parse('[1, 2, "hello"');
    expect(counts).toEqual({parens: 0, squares: 1, curlies: 0});
  });

  it('works with subgroup tails', () => {
    const counts = parse('[1 2>@2..');
    expect(counts).toEqual({parens: 0, squares: 0, curlies: 0});
  });
});
