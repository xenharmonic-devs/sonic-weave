import {describe, it, expect} from 'vitest';

import {parse} from '../sonic-weave-ast';

// Debug
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function d(thing: any) {
  console.dir(thing, {depth: null});
}

function parseSingle(source: string) {
  return parse(source + ';').body[0];
}

describe('SonicWeave Abstract Syntax Tree parser', () => {
  it('parses a plain literal (single number)', () => {
    const ast = parse('5;');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'ExpressionStatement',
          expression: {type: 'IntegerLiteral', value: 5n},
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
          expression: {type: 'IntegerLiteral', value: 7n},
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

  it('parses kilohertz', () => {
    const ast = parseSingle('kHz');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {type: 'HertzLiteral', prefix: 'k'},
    });
  });

  it('parses hertz with implicit scalar multiplication', () => {
    const ast = parseSingle('420.69 Hz');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '',
        left: {
          type: 'DecimalLiteral',
          whole: 420n,
          fractional: '69',
          hard: false,
        },
        right: {type: 'HertzLiteral', prefix: ''},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses cents with implicit units', () => {
    const ast = parseSingle('1.955');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '',
        left: {
          type: 'DecimalLiteral',
          whole: 1n,
          fractional: '955',
          hard: false,
        },
        right: {type: 'CentLiteral'},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses hard decimals over cents', () => {
    const ast = parseSingle('1.955!');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'DecimalLiteral',
        whole: 1n,
        fractional: '955',
        hard: true,
      },
    });
  });
});
