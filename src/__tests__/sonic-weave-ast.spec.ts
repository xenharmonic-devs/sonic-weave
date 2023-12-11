import {describe, it, expect} from 'vitest';

import {parse} from '../sonic-weave-ast';

// Debug
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function d(thing: any) {
  console.dir(thing, {depth: null});
}

describe('SonicWeave Abstract Syntax Tree parser', () => {
  it('parses a plain literal (single number)', () => {
    const ast = parse('5;');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'ExpressionStatement',
          expression: {type: 'PlainLiteral', value: 5n},
        },
      ],
    });
  });

  it('parses a color literal (single)', () => {
    const ast = parse('#fae;');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'ExpressionStatement',
          expression: {type: 'ColorLiteral', value: '#fae'},
        },
      ],
    });
  });

  it('parses a colored integer', () => {
    const ast = parse('7; #12ff34;');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'ExpressionStatement',
          expression: {type: 'PlainLiteral', value: 7n},
        },
        {
          type: 'ExpressionStatement',
          expression: {type: 'ColorLiteral', value: '#12ff34'},
        },
      ],
    });
  });

  it('rejects a single comma', () => {
    expect(() => parse(',;')).toThrow();
  });
});
