import {describe, it, expect} from 'vitest';

import {parse} from '../sonic-weave-ast';

// Debug
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function d(thing: any) {
  console.dir(thing, {depth: null});
}

function parseSingle(source: string) {
  return parse(source).body[0];
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
          exponent: null,
          hard: false,
        },
        right: {type: 'HertzLiteral', prefix: ''},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses exaseconds', () => {
    const ast = parseSingle('420Es');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '',
        left: {type: 'IntegerLiteral', value: 420n},
        right: {type: 'SecondLiteral', prefix: 'E'},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses scientific notation in scalar multipliers', () => {
    const ast = parseSingle('420E69s');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '',
        left: {
          type: 'DecimalLiteral',
          whole: 420n,
          fractional: '',
          exponent: 69n,
          hard: false,
        },
        right: {type: 'SecondLiteral', prefix: ''},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses scientific notation in comma decimals', () => {
    const ast = parseSingle('42,0e-69');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'DecimalLiteral',
        whole: 42n,
        fractional: '0',
        exponent: -69n,
        hard: false,
      },
    });
  });

  it('parses scientific notation in dot decimals', () => {
    const ast = parseSingle('42.0e-69');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'DecimalLiteral',
        whole: 42n,
        fractional: '0',
        exponent: -69n,
        hard: false,
      },
    });
  });

  it('parses cents with implicit units', () => {
    const ast = parseSingle('1.955');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {type: 'CentsLiteral', whole: 1n, fractional: '955'},
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
        exponent: null,
        hard: true,
      },
    });
  });

  it('can treat \\ as an operator', () => {
    const ast = parseSingle('7 \\ twelve');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '\\',
        left: {type: 'IntegerLiteral', value: 7n},
        right: {type: 'Identifier', id: 'twelve'},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses ranges', () => {
    const ast = parseSingle('[1..10]');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'Range',
        start: {type: 'IntegerLiteral', value: 1n},
        end: {type: 'IntegerLiteral', value: 10n},
      },
    });
  });

  it('parses a return statement', () => {
    const ast = parse('riff foo{return;}');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'FunctionDeclaration',
          name: {type: 'Identifier', id: 'foo'},
          parameters: [],
          body: [{type: 'ReturnStatement'}],
        },
      ],
    });
  });

  it('parses coalescing reassignment', () => {
    const ast = parseSingle('x ??= 42');
    expect(ast).toEqual({
      type: 'VariableDeclaration',
      name: {type: 'Identifier', id: 'x'},
      value: {
        type: 'BinaryExpression',
        operator: '??',
        left: {type: 'Identifier', id: 'x'},
        right: {type: 'IntegerLiteral', value: 42n},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses iterated array access', () => {
    const ast = parseSingle('x[i][2]');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'ArrayAccess',
        object: {
          type: 'ArrayAccess',
          object: {type: 'Identifier', id: 'x'},
          index: {type: 'Identifier', id: 'i'},
        },
        index: {type: 'IntegerLiteral', value: 2n},
      },
    });
  });

  it('parses for..of', () => {
    const ast = parse('for (foo of bar) foo;');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'ForOfStatement',
          element: {type: 'Identifier', id: 'foo'},
          array: {type: 'Identifier', id: 'bar'},
          body: {
            type: 'ExpressionStatement',
            expression: {type: 'Identifier', id: 'foo'},
          },
        },
      ],
    });
  });

  it('parses if..else', () => {
    const ast = parse('if (foo) bar; else baz;');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'IfStatement',
          test: {type: 'Identifier', id: 'foo'},
          consequent: {
            type: 'ExpressionStatement',
            expression: {type: 'Identifier', id: 'bar'},
          },
          alternate: {
            type: 'ExpressionStatement',
            expression: {type: 'Identifier', id: 'baz'},
          },
        },
      ],
    });
  });

  it('parses double-quoted string literals with escapes', () => {
    const ast = parseSingle('"hello\\nworld"');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {type: 'StringLiteral', value: 'hello\nworld'},
    });
  });

  it('parses single-quoted string literals with escapes', () => {
    const ast = parseSingle("'hell\\u0000 world'");
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {type: 'StringLiteral', value: 'hell\x00 world'},
    });
  });

  it('accepts \\x escapes', () => {
    const ast = parseSingle('"hello w\\x00rld"');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {type: 'StringLiteral', value: 'hello w\x00rld'},
    });
  });

  it('parses array element assignment', () => {
    const ast = parseSingle('arr[1] = 2');
    expect(ast).toEqual({
      type: 'VariableDeclaration',
      name: {
        type: 'ArrayAccess',
        object: {type: 'Identifier', id: 'arr'},
        index: {type: 'IntegerLiteral', value: 1n},
      },
      value: {type: 'IntegerLiteral', value: 2n},
    });
  });

  it('lets you call functions from arrays', () => {
    const ast = parseSingle('arr[1]()');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'ArrayAccess',
          object: {type: 'Identifier', id: 'arr'},
          index: {type: 'IntegerLiteral', value: 1n},
        },
        args: [],
      },
    });
  });

  it('parses N-steps-of-M-equal-divisions-of-just-intonation (literal)', () => {
    const ast = parseSingle('7\\13<3>');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'NedjiProjection',
        octaves: {type: 'NedoLiteral', numerator: 7n, denominator: 13n},
        base: {type: 'IntegerLiteral', value: 3n},
      },
    });
  });

  it('parses N-steps-of-equal-divisions-of-just-intonation (binary expression)', () => {
    const ast = parseSingle('n\\m<ji>');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'NedjiProjection',
        octaves: {
          type: 'BinaryExpression',
          operator: '\\',
          left: {type: 'Identifier', id: 'n'},
          right: {type: 'Identifier', id: 'm'},
          preferLeft: false,
          preferRight: false,
        },
        base: {type: 'Identifier', id: 'ji'},
      },
    });
  });

  it('prefers augmented fourth over the absolute pitch A4', () => {
    const ast = parseSingle('A4');
    expect(ast.expression.type).toBe('FJS');
  });

  it("has an alternative spelling for the absolute pitch nominal 'A'", () => {
    const ast = parseSingle('a4');
    expect(ast.expression.type).toBe('AbsoluteFJS');
  });

  it('prefers pitch declaration over variable declaration', () => {
    const ast = parseSingle('a4 = 440 Hz');
    expect(ast.type).toBe('PitchDeclaration');
    expect(ast.left.type).toBe('AbsoluteFJS');
  });

  it('is aware of interval qualities (no minor twelfth)', () => {
    const ast = parseSingle('m12');
    expect(ast.expression.type).toBe('Identifier');
  });

  it('differentiates natural accidentals from variable declaration', () => {
    const ast = parseSingle('D=4');
    expect(ast.expression.type).toBe('AbsoluteFJS');
  });

  it("still parses variable declaration when there's no conflict with FJS", () => {
    const ast = parseSingle('d=4');
    expect(ast.type).toBe('VariableDeclaration');
  });

  it('supports unary expressions applied to call expressions', () => {
    const ast = parseSingle('!foo()');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'UnaryExpression',
        operator: '!',
        operand: {
          type: 'CallExpression',
          callee: {type: 'Identifier', id: 'foo'},
          args: [],
        },
        prefix: true,
        uniform: false,
      },
    });
  });

  it('prioritizes unary expression over plain', () => {
    const ast = parseSingle('i--');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'UnaryExpression',
        operator: '--',
        operand: {type: 'Identifier', id: 'i'},
        prefix: false,
        uniform: false,
      },
    });
  });

  it('parses a lone comma-decimal', () => {
    const ast = parseSingle('3,14');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'DecimalLiteral',
        whole: 3n,
        fractional: '14',
        exponent: null,
        hard: false,
      },
    });
  });

  it('parses FJS in array literals', () => {
    const ast = parseSingle('[C#4^11_5,7,P5^77_25]');
    expect(ast.expression.elements).toHaveLength(2);
  });
});

describe('Automatic semicolon insertion', () => {
  it('works with return statements', () => {
    const ast = parse('return\nreturn');
    expect(ast.body).toHaveLength(2);
  });

  it('works with throw statements', () => {
    const ast = parse('throw "this"\nthrow "that"');
    expect(ast.body).toHaveLength(2);
  });

  it('works with identifiers', () => {
    const ast = parse('foo\nbar');
    expect(ast.body).toHaveLength(2);
  });

  it('works with unary minus', () => {
    const ast = parse('foo\n-bar');
    expect(ast.body).toHaveLength(2);
  });

  it('works with repeated ups', () => {
    const ast = parse('^B4\n^^B4');
    expect(ast.body).toHaveLength(2);
  });

  it('works with nedji projection', () => {
    const ast = parse('1\\2<3>\n2\\2<3>');
    expect(ast.body).toHaveLength(2);
  });
});
