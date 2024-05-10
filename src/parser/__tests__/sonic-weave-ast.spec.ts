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
    const ast = parseSingle('1 kHz');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '×',
        left: {type: 'IntegerLiteral', value: 1n},
        right: {type: 'HertzLiteral', prefix: 'k'},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses hertz with implicit scalar multiplication', () => {
    const ast = parseSingle('420.69 Hz');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '×',
        left: {
          type: 'DecimalLiteral',
          sign: '',
          whole: 420n,
          fractional: '69',
          exponent: null,
          flavor: '',
        },
        right: {type: 'HertzLiteral', prefix: ''},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses exaseconds', () => {
    const ast = parseSingle('420 Es');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '×',
        left: {type: 'IntegerLiteral', value: 420n},
        right: {type: 'SecondLiteral', prefix: 'E'},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses scientific notation in scalar multipliers', () => {
    const ast = parseSingle('420E69 s');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '×',
        left: {
          type: 'DecimalLiteral',
          sign: '',
          whole: 420n,
          fractional: '',
          exponent: 69,
          flavor: '',
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
        sign: '',
        whole: 42n,
        fractional: '0',
        exponent: -69,
        flavor: '',
      },
    });
  });

  it('parses scientific notation in dot decimals', () => {
    const ast = parseSingle('42.0e-69');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'DecimalLiteral',
        sign: '',
        whole: 42n,
        fractional: '0',
        exponent: -69,
        flavor: '',
      },
    });
  });

  it('parses cents with implicit units', () => {
    const ast = parseSingle('1.955');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'CentsLiteral',
        sign: '',
        whole: 1n,
        fractional: '955',
        exponent: null,
        real: false,
      },
    });
  });

  it('parses real decimals over cents', () => {
    const ast = parseSingle('-1.955r');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'UnaryExpression',
        operator: '-',
        operand: {
          type: 'DecimalLiteral',
          sign: '',
          whole: 1n,
          fractional: '955',
          exponent: null,
          flavor: 'r',
        },
        uniform: false,
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
        penultimate: false,
        end: {type: 'IntegerLiteral', value: 10n},
      },
    });
  });

  it('parses a return statement', () => {
    const ast = parse('riff foo(){return;}');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'FunctionDeclaration',
          name: {type: 'Identifier', id: 'foo'},
          parameters: {
            type: 'Parameters',
            parameters: [],
            rest: null,
            defaultValue: null,
          },
          body: [{type: 'ReturnStatement'}],
          text: 'riff foo(){return;}',
        },
      ],
    });
  });

  it('parses rest syntax', () => {
    const ast = parse('riff foo(bar, ...baz ) {}');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'FunctionDeclaration',
          name: {type: 'Identifier', id: 'foo'},
          parameters: {
            type: 'Parameters',
            parameters: [{type: 'Parameter', id: 'bar', defaultValue: null}],
            rest: {type: 'Parameter', id: 'baz', defaultValue: null},
            defaultValue: null,
          },
          body: [],
          text: 'riff foo(bar, ...baz ) {}',
        },
      ],
    });
  });

  it('parses spread syntax', () => {
    const ast = parse('[foo, ...bar, baz]');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'ArrayLiteral',
            elements: [
              {
                type: 'Argument',
                spread: false,
                expression: {type: 'Identifier', id: 'foo'},
              },
              {
                type: 'Argument',
                spread: true,
                expression: {type: 'Identifier', id: 'bar'},
              },
              {
                type: 'Argument',
                spread: false,
                expression: {type: 'Identifier', id: 'baz'},
              },
            ],
          },
        },
      ],
    });
  });

  it('parses coalescing reassignment', () => {
    const ast = parseSingle('x al= 42');
    expect(ast).toEqual({
      type: 'AssignmentStatement',
      name: {type: 'Identifier', id: 'x'},
      value: {
        type: 'BinaryExpression',
        operator: 'al',
        left: {type: 'Identifier', id: 'x'},
        right: {type: 'IntegerLiteral', value: 42n},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses iterated array access', () => {
    const ast = parseSingle('x[i]~[2]');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'AccessExpression',
        object: {
          type: 'AccessExpression',
          object: {type: 'Identifier', id: 'x'},
          nullish: false,
          key: {type: 'Identifier', id: 'i'},
        },
        nullish: true,
        key: {type: 'IntegerLiteral', value: 2n},
      },
    });
  });

  it('parses iterated slice and array access', () => {
    const ast = parseSingle('x[0,2..10][1..2][0]');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'AccessExpression',
        nullish: false,
        object: {
          type: 'ArraySlice',
          object: {
            type: 'ArraySlice',
            object: {type: 'Identifier', id: 'x'},
            start: {type: 'IntegerLiteral', value: 0n},
            second: {type: 'IntegerLiteral', value: 2n},
            penultimate: false,
            end: {type: 'IntegerLiteral', value: 10n},
          },
          start: {type: 'IntegerLiteral', value: 1n},
          second: null,
          penultimate: false,
          end: {type: 'IntegerLiteral', value: 2n},
        },
        key: {type: 'IntegerLiteral', value: 0n},
      },
    });
  });

  it('parses for..of', () => {
    const ast = parse('for (const foo of bar) foo;');
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'IterationStatement',
          element: {type: 'Parameter', id: 'foo', defaultValue: null},
          kind: 'of',
          container: {type: 'Identifier', id: 'bar'},
          body: {
            type: 'ExpressionStatement',
            expression: {type: 'Identifier', id: 'foo'},
          },
          tail: null,
          mutable: false,
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
      type: 'AssignmentStatement',
      name: {
        type: 'AccessExpression',
        object: {type: 'Identifier', id: 'arr'},
        nullish: false,
        key: {type: 'IntegerLiteral', value: 1n},
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
          type: 'AccessExpression',
          object: {type: 'Identifier', id: 'arr'},
          nullish: false,
          key: {type: 'IntegerLiteral', value: 1n},
        },
        args: [],
      },
    });
  });

  it('lets you call functions from sliced arrays', () => {
    const ast = parseSingle('arr[..][1]()');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'AccessExpression',
          nullish: false,
          object: {
            type: 'ArraySlice',
            object: {type: 'Identifier', id: 'arr'},
            start: null,
            second: null,
            penultimate: false,
            end: null,
          },
          key: {type: 'IntegerLiteral', value: 1n},
        },
        args: [],
      },
    });
  });

  it('parses N-steps-of-M-equal-divisions-of-just-intonation (literal)', () => {
    const ast = parseSingle('7\\13 ed 3');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: 'ed',
        left: {
          type: 'NedjiLiteral',
          numerator: 7,
          denominator: 13,
          equaveNumerator: null,
          equaveDenominator: null,
        },
        right: {type: 'IntegerLiteral', value: 3n},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('parses N-steps-of-equal-divisions-of-just-intonation (binary expression)', () => {
    const ast = parseSingle('n\\m ed ji');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: 'ed',
        left: {
          type: 'BinaryExpression',
          operator: '\\',
          left: {type: 'Identifier', id: 'n'},
          right: {type: 'Identifier', id: 'm'},
          preferLeft: false,
          preferRight: false,
        },
        right: {type: 'Identifier', id: 'ji'},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('prefers absolute pitch A4 over augmented fourth', () => {
    const ast = parseSingle('A4');
    expect(ast.expression.type).toBe('AbsoluteFJS');
  });

  it('has a lowercase spelling for the augmented fourth', () => {
    const ast = parseSingle('a4');
    expect(ast.expression.type).toBe('FJS');
  });

  it('prefers pitch declaration over variable declaration', () => {
    const ast = parseSingle('A4 = 440 Hz');
    expect(ast.type).toBe('PitchDeclaration');
    expect(ast.left.type).toBe('AbsoluteFJS');
  });

  // The parser spends most of its time trying to tell identifiers from FJS so we sacrifice this distinction in interest of speed.
  it.skip('is aware of interval qualities (no minor twelfth)', () => {
    const ast = parseSingle('m12');
    expect(ast.expression.type).toBe('Identifier');
  });

  it('differentiates FJS with subscripts from identifiers', () => {
    const ast = parseSingle('m3_5');
    expect(ast.expression.type).toBe('FJS');
  });

  it('differentiates AbsoluteFJS with subscripts from identifiers', () => {
    const ast = parseSingle('Eb4_5');
    expect(ast.expression.type).toBe('AbsoluteFJS');
  });

  it('differentiates S-expressions from identifiers', () => {
    const ast = parseSingle('S37');
    expect(ast.expression.type).toBe('SquareSuperparticular');
  });

  it('uses underscores as natural accidentals', () => {
    const ast = parseSingle('D_4');
    expect(ast.expression.type).toBe('AbsoluteFJS');
  });

  it('parses single letter variable assignment', () => {
    const ast = parseSingle('d=4');
    expect(ast.type).toBe('AssignmentStatement');
  });

  it('supports unary expressions applied to call expressions', () => {
    const ast = parseSingle('not foo()');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'UnaryExpression',
        operator: 'not',
        operand: {
          type: 'CallExpression',
          callee: {type: 'Identifier', id: 'foo'},
          args: [],
        },
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
        sign: '',
        whole: 3n,
        fractional: '14',
        exponent: null,
        flavor: '',
      },
    });
  });

  it('parses FJS in array literals', () => {
    const ast = parseSingle('[C#4^11_5,7,P5^77_25]');
    expect(ast.expression.elements).toHaveLength(2);
  });

  it('can label and color comma-decimals', () => {
    const ast = parseSingle('1,234 "my third" #0dead0');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: ' ',
        left: {
          type: 'BinaryExpression',
          operator: ' ',
          left: {
            type: 'DecimalLiteral',
            sign: '',
            whole: 1n,
            fractional: '234',
            exponent: null,
            flavor: '',
          },
          right: {type: 'StringLiteral', value: 'my third'},
          preferLeft: false,
          preferRight: false,
        },
        right: {type: 'ColorLiteral', value: '#0dead0'},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('can enumerate unary expressions and function calls', () => {
    const ast = parseSingle('root():-2');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'EnumeratedChord',
        mirror: false,
        enumerals: [
          {
            type: 'CallExpression',
            callee: {type: 'Identifier', id: 'root'},
            args: [],
          },
          {
            type: 'UnaryExpression',
            operator: '-',
            operand: {type: 'IntegerLiteral', value: 2n},
            uniform: false,
          },
        ],
      },
    });
  });

  it('accepts implicit multiplication', () => {
    const ast = parseSingle('1 2');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: ' ',
        left: {type: 'IntegerLiteral', value: 1n},
        right: {type: 'IntegerLiteral', value: 2n},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('accepts array comprehensions spanning multiple rows', () => {
    const ast = parseSingle(`
      [
        foo bar
          for
            foo of baz
          for
            bar in qux
      ]
    `);
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'ArrayComprehension',
        expression: {
          type: 'BinaryExpression',
          operator: ' ',
          left: {type: 'Identifier', id: 'foo'},
          right: {type: 'Identifier', id: 'bar'},
          preferLeft: false,
          preferRight: false,
        },
        comprehensions: [
          {
            element: {type: 'Parameter', id: 'foo', defaultValue: null},
            kind: 'of',
            container: {type: 'Identifier', id: 'baz'},
          },
          {
            element: {type: 'Parameter', id: 'bar', defaultValue: null},
            kind: 'in',
            container: {type: 'Identifier', id: 'qux'},
          },
        ],
        test: null,
      },
    });
  });

  it('accepts conditional array comprehensions', () => {
    const ast = parseSingle('[foo for foo of bar if baz]');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'ArrayComprehension',
        expression: {type: 'Identifier', id: 'foo'},
        comprehensions: [
          {
            element: {type: 'Parameter', id: 'foo', defaultValue: null},
            kind: 'of',
            container: {type: 'Identifier', id: 'bar'},
          },
        ],
        test: {type: 'Identifier', id: 'baz'},
      },
    });
  });

  it('accepts ranges spanning multiple rows', () => {
    const ast = parseSingle('[\n1\n..\n10\n]');
    expect(ast.expression.type).toBe('Range');
  });

  it('accepts step ranges spanning multiple rows', () => {
    const ast = parseSingle('[\n2\n,\n4\n..\n10\n]');
    expect(ast.expression.type).toBe('Range');
  });

  it('accepts array access spanning multiple rows', () => {
    const ast = parseSingle('foo[\nbar\n]');
    expect(ast.expression.type).toBe('AccessExpression');
  });

  it('accepts array slice spanning multiple rows', () => {
    const ast = parseSingle('foo[\n1\n..\n10\n]');
    expect(ast.expression.type).toBe('ArraySlice');
  });

  it('prioritizes recipropower over lift', () => {
    const ast = parseSingle('3/2^/ 2');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: '^/',
        left: {type: 'FractionLiteral', numerator: 3n, denominator: 2n},
        right: {type: 'IntegerLiteral', value: 2n},
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('supports multiple superscripts on FJS', () => {
    const ast = parseSingle('M2^5^7');
    expect(ast.expression.superscripts).toEqual([
      [5, ''],
      [7, ''],
    ]);
  });

  it('supports multiple subcripts on AbsoluteFJS', () => {
    const ast = parseSingle('Fb4_5_5');
    expect(ast.expression.subscripts).toEqual([
      [5, ''],
      [5, ''],
    ]);
  });

  it('has try..catch', () => {
    const ast = parseSingle(
      'try { throw "Stop trying to hit me, hit me!" } catch { "I know what you\'re trying to do..." }'
    );
    expect(ast).toEqual({
      type: 'TryStatement',
      body: {
        type: 'BlockStatement',
        body: [
          {
            type: 'ThrowStatement',
            argument: {
              type: 'StringLiteral',
              value: 'Stop trying to hit me, hit me!',
            },
          },
        ],
      },
      handler: {
        type: 'CatchClause',
        body: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'StringLiteral',
                value: "I know what you're trying to do...",
              },
            },
          ],
        },
      },
    });
  });

  it('supports multiple const initializers', () => {
    const ast = parseSingle('const a = 1, [b, c, d = 4] = [2, 3]');
    expect(ast).toEqual({
      type: 'VariableDeclaration',
      parameters: {
        type: 'Parameters',
        defaultValue: null,
        parameters: [
          {
            type: 'Parameter',
            id: 'a',
            defaultValue: {type: 'IntegerLiteral', value: 1n},
          },
          {
            type: 'Parameters',
            parameters: [
              {type: 'Parameter', id: 'b', defaultValue: null},
              {type: 'Parameter', id: 'c', defaultValue: null},
              {
                type: 'Parameter',
                id: 'd',
                defaultValue: {type: 'IntegerLiteral', value: 4n},
              },
            ],
            rest: null,
            defaultValue: {
              type: 'ArrayLiteral',
              elements: [
                {
                  type: 'Argument',
                  spread: false,
                  expression: {type: 'IntegerLiteral', value: 2n},
                },
                {
                  type: 'Argument',
                  spread: false,
                  expression: {type: 'IntegerLiteral', value: 3n},
                },
              ],
            },
          },
        ],
      },
      mutable: false,
    });
  });

  it('parses arrow functions as call arguments', () => {
    const ast = parseSingle('func((u) => u)');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {type: 'Identifier', id: 'func'},
        args: [
          {
            type: 'Argument',
            spread: false,
            expression: {
              type: 'ArrowFunction',
              parameters: {
                type: 'Parameters',
                parameters: [{type: 'Parameter', id: 'u', defaultValue: null}],
                rest: null,
                defaultValue: null,
              },
              expression: {type: 'Identifier', id: 'u'},
              text: '(u) => u',
            },
          },
        ],
      },
    });
  });

  it('parses array access by arrays', () => {
    const ast = parseSingle('foo[[true, false]]');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'AccessExpression',
        object: {type: 'Identifier', id: 'foo'},
        nullish: false,
        key: {
          type: 'ArrayLiteral',
          elements: [
            {
              type: 'Argument',
              spread: false,
              expression: {type: 'TrueLiteral'},
            },
            {
              type: 'Argument',
              spread: false,
              expression: {type: 'FalseLiteral'},
            },
          ],
        },
      },
    });
  });

  it('parses record literals', () => {
    const ast = parseSingle('{foo: 1, "bar": 2}');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'RecordLiteral',
        properties: [
          ['bar', {type: 'IntegerLiteral', value: 2n}],
          ['foo', {type: 'IntegerLiteral', value: 1n}],
        ],
      },
    });
  });

  it('has to concede grammar space from the slash (no negative denominators)', () => {
    const ast = parseSingle('a/-b');
    expect(ast.expression.operator).toBe('/-');
  });

  it('has to concede grammar space from the slash (no upshimmered denominators)', () => {
    const ast = parseSingle('a/^b');
    expect(ast.expression.operator).toBe('/^');
  });

  it('has to concede grammar space from the slash (no lodash denominators)', () => {
    const ast = parseSingle('a/_b');
    expect(ast.expression.operator).toBe('/_');
    expect(ast.expression.right.id).toBe('b');
  });

  it('can use spaces with the slash for negative denominators', () => {
    const ast = parseSingle('a / -b');
    expect(ast.expression.operator).toBe('/');
  });

  it('can use spaces with the slash for upshimmered denominators', () => {
    const ast = parseSingle('a / ^b');
    expect(ast.expression.operator).toBe('/');
  });

  it('can use spaces with the slash for lodash denominators', () => {
    const ast = parseSingle('a / _b');
    expect(ast.expression.operator).toBe('/');
    expect(ast.expression.right.id).toBe('_b');
  });

  it('parses comments after dot product', () => {
    const ast = parseSingle('3 dot 12@ // Are the comments fixed now?');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'BinaryExpression',
        operator: 'dot',
        left: {type: 'IntegerLiteral', value: 3n},
        right: {
          type: 'WartsLiteral',
          equave: '',
          divisions: 12,
          warts: [],
          basis: [''],
        },
        preferLeft: false,
        preferRight: false,
      },
    });
  });

  it('has a ternary operator complex with pythonic associativity', () => {
    const ast = parseSingle('foo if bar else baz where qux else quux');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'ConditionalExpression',
        kind: 'if',
        test: {type: 'Identifier', id: 'bar'},
        alternate: {
          type: 'ConditionalExpression',
          kind: 'where',
          test: {type: 'Identifier', id: 'qux'},
          alternate: {type: 'Identifier', id: 'quux'},
          consequent: {type: 'Identifier', id: 'baz'},
        },
        consequent: {type: 'Identifier', id: 'foo'},
      },
    });
  });

  it('has a pythonic precedence between logical and relational', () => {
    const ast = parseSingle('not a < b and c > d or not e == f');
    const e = ast.expression;
    expect(e.operator).toBe('or');
    {
      expect(e.left.operator).toBe('and');
      {
        expect(e.left.left.operator).toBe('not');
        expect(e.left.left.operand.operator).toBe('<');
        {
          expect(e.left.left.operand.left.id).toBe('a');
          expect(e.left.left.operand.right.id).toBe('b');
        }
        expect(e.left.right.operator).toBe('>');
        {
          expect(e.left.right.left.id).toBe('c');
          expect(e.left.right.right.id).toBe('d');
        }
      }
      expect(e.right.operator).toBe('not');
      expect(e.right.operand.operator).toBe('==');
      {
        expect(e.right.operand.left.id).toBe('e');
        expect(e.right.operand.right.id).toBe('f');
      }
    }
  });

  it('parses boolean not without mutilating a variable name', () => {
    const ast = parseSingle('not nothing');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        type: 'UnaryExpression',
        operator: 'not',
        operand: {type: 'Identifier', id: 'nothing'},
        uniform: false,
      },
    });
  });

  it('parses an identifier that starts with a reserved word', () => {
    const ast = parseSingle('nientes');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {type: 'Identifier', id: 'nientes'},
    });
  });

  it('admits trailing space after blocks', () => {
    const ast = parse(`
      {
        1;
        2;
      }

      3;
    `);
    expect(ast).toEqual({
      type: 'Program',
      body: [
        {
          type: 'BlockStatement',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {type: 'IntegerLiteral', value: 1n},
            },
            {
              type: 'ExpressionStatement',
              expression: {type: 'IntegerLiteral', value: 2n},
            },
          ],
        },
        {
          type: 'ExpressionStatement',
          expression: {type: 'IntegerLiteral', value: 3n},
        },
      ],
    });
  });

  it('has module syntax', () => {
    const ast = parse(`
      module foo {
        export const bar = 1;
        export riff baz(qux) {
          return qux + bar;
        }
      }
      import bar, baz as quux from foo;
    `);
    expect(ast.body[0].type).toBe('ModuleDeclaration');
    expect(ast.body[1]).toEqual({
      type: 'ImportStatement',
      elements: [
        {type: 'ImportElement', id: 'bar', alias: null},
        {type: 'ImportElement', id: 'baz', alias: 'quux'},
      ],
      module: 'foo',
    });
  });

  it('has MOS-step syntax', () => {
    const ast = parseSingle('P0ms');
    expect(ast).toEqual({
      type: 'ExpressionStatement',
      expression: {
        ups: 0,
        lifts: 0,
        type: 'MosStepLiteral',
        mosStep: {
          type: 'MosStep',
          quality: {fraction: '', quality: 'P'},
          degree: 0,
        },
        superscripts: [],
        subscripts: [],
      },
    });
  });

  it('has MOS declarations (simple)', () => {
    const ast = parseSingle('MOS 5252525');
    expect(ast).toEqual({
      type: 'MosDeclaration',
      body: [
        {
          type: 'IntegerPattern',
          pattern: [5, 2, 5, 2, 5, 2, 5],
          equave: null,
        },
      ],
    });
  });

  it('has MOS declaration', () => {
    const ast = parseSingle(`
      MOS {
        10L 2s 4|6(2)
        hardness = 2
        equave = 8/3
      }
    `);
    expect(ast).toEqual({
      type: 'MosDeclaration',
      body: [
        {
          type: 'PatternUpDownPeriod',
          countLarge: 10,
          countSmall: 2,
          udp: {
            type: 'UDP',
            up: 4,
            down: 6,
            period: 2,
          },
          equave: null,
        },
        {
          type: 'HardnessDeclaration',
          value: {type: 'IntegerLiteral', value: 2n},
        },
        {
          type: 'EquaveDeclaration',
          value: {
            denominator: 3n,
            numerator: 8n,
            type: 'FractionLiteral',
          },
        },
      ],
    });
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
    const ast = parse('(1\\2) ed 3\n2\\2 ed (3)');
    expect(ast.body).toHaveLength(2);
  });
});

describe('Negative tests', () => {
  it('rejects numbers without digits', () => {
    expect(() => parse('._')).toThrow();
  });

  it('rejects trailing underscores in numbers', () => {
    expect(() => parse('7_')).toThrow();
  });

  it('rejects labels without spaces', () => {
    expect(() => parse('0$')).toThrow();
  });

  it('rejects unary operations without operators', () => {
    expect(() => parse('~3')).toThrow();
  });

  it('rejects variable substitution in NEDJI', () => {
    expect(() => parse('a\\b<c/d>')).toThrow();
  });

  // XXX: Without the parenthesis this is actually a valid block statement containing an enumeration.
  // Might need to rethink record syntax if this causes more issues.
  it('rejects dim5 as an identifier', () => {
    expect(() => parse('({dim5: "no good"})')).toThrow();
  });

  it('rejects Pythonic matrix multiplication with a human readable error message', () => {
    let rejected = false;
    try {
      parse('foo @ bar');
    } catch (e) {
      rejected = true;
      const message: string = e.message;
      expect(message).toContain('additive operator');
      expect(message).toContain('augmented quality');
      expect(message).toContain('exponentiation');
      expect(message).toContain('whitespace');
      expect(message).toContain('line terminator');
      expect(message).toContain('multiplicative operator');
      expect(message).toContain('pitch nominal');
      expect(message).toContain('relational operator');
      expect(message).toContain('up-and-down');
    } finally {
      expect(rejected).toBe(true);
    }
  });

  it('rejects potentially ambiguous harmonic segment concatenations', () => {
    expect(() => parse('4::7::16')).toThrow();
  });

  it('rejects inner ternary operator association', () => {
    expect(() => parse('foo if bar if baz else qux else quux')).toThrow();
  });

  it('rejects empty variable declaration (const)', () => {
    expect(() => parse('const')).toThrow();
  });

  it('rejects empty variable declaration (let)', () => {
    expect(() => parse('let')).toThrow();
  });

  it('rejects empty arrow function parameters', () => {
    expect(() => parse('=> 0')).toThrow();
  });
});
