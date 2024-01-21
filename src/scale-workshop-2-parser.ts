import {Fraction, PRIMES, PRIME_CENTS} from 'xen-dev-utils';
import {Domain, TimeMonzo, getNumberOfComponents} from './monzo';
import {parse} from './scale-workshop-2-ast';
import {Interval} from './interval';
import {
  NedjiLiteral,
  divNodes,
  mulNodes,
  uniformInvertNode,
} from './expression';

const ZERO = new Fraction(0);

// Abstract Syntax Tree hierarchy
type PlainLiteral = {
  type: 'PlainLiteral';
  value: bigint;
};

type CentsLiteral = {
  type: 'CentsLiteral';
  whole: bigint | null;
  fractional: string | null;
};

type NumericLiteral = {
  type: 'NumericLiteral';
  whole: bigint | null;
  fractional: string | null;
};

type FractionLiteral = {
  type: 'FractionLiteral';
  numerator: bigint;
  denominator: bigint;
};

type EdjiFraction = {
  type: 'EdjiFraction';
  numerator: bigint;
  denominator: bigint;
  equave: null | PlainLiteral | FractionLiteral;
};

type Monzo = {
  type: 'Monzo';
  components: string[];
};

type UnaryExpression = {
  type: 'UnaryExpression';
  operator: '-';
  operand: Expression;
};

type BinaryExpression = {
  type: 'BinaryExpression';
  operator: '+' | '-';
  left: Expression;
  right: Expression;
};

type Expression =
  | PlainLiteral
  | CentsLiteral
  | NumericLiteral
  | FractionLiteral
  | EdjiFraction
  | Monzo
  | UnaryExpression
  | BinaryExpression;

function parseAst(input: string): Expression {
  return parse(input);
}

function parseDegenerateFloat(whole: bigint | null, fractional: string | null) {
  return parseFloat(`${whole ?? 0n}.${fractional ?? ''}`);
}

/**
 * Parse a string to the {@link Interval} it represents.
 * @param input A string to parse.
 * @param numberOfComponents Number of components to use for the {@link Interval} instance's {@link TimeMonzo} prime exponent part.
 * @param admitBareNumbers Interprete bare numbers as n/1 ratios instead of throwing an error.
 * @param universalMinus Allow unary minus operator in front of every line type.
 * @returns {@link Interval} instance constructed from the input string.
 * @throws An error if the input cannot be interpreted as an interval.
 */
export function parseScaleWorkshop2Line(
  input: string,
  numberOfComponents?: number,
  admitBareNumbers = false,
  universalMinus = true
): Interval {
  const ast = parseAst(input);
  if (!universalMinus && ast.type === 'UnaryExpression') {
    if (ast.operand.type !== 'CentsLiteral') {
      throw new Error('Univeral minus violation');
    }
  }
  if (
    !admitBareNumbers &&
    (ast.type === 'PlainLiteral' ||
      (ast.type === 'UnaryExpression' && ast.operand.type === 'PlainLiteral'))
  ) {
    throw new Error('Bare numbers not allowed');
  }
  numberOfComponents ??= getNumberOfComponents();
  return evaluateAst(ast, numberOfComponents);
}

function evaluateAst(ast: Expression, numberOfComponents: number): Interval {
  switch (ast.type) {
    case 'PlainLiteral':
      return new Interval(
        TimeMonzo.fromBigInt(ast.value, numberOfComponents),
        'linear',
        {
          type: 'IntegerLiteral',
          value: ast.value,
        }
      );
    case 'CentsLiteral':
      return new Interval(
        TimeMonzo.fromCents(
          parseDegenerateFloat(ast.whole, ast.fractional),
          numberOfComponents
        ),
        'logarithmic',
        {
          type: 'CentsLiteral',
          whole: ast.whole ?? 0n,
          fractional: ast.fractional ?? '',
        }
      );
    case 'NumericLiteral':
      return new Interval(
        TimeMonzo.fromValue(
          parseDegenerateFloat(ast.whole, ast.fractional),
          numberOfComponents
        ),
        'linear',
        {
          type: 'DecimalLiteral',
          whole: ast.whole ?? 0n,
          fractional: ast.fractional ?? '',
          flavor: 'e',
          exponent: null,
        }
      );
    case 'FractionLiteral':
      return new Interval(
        TimeMonzo.fromBigNumeratorDenominator(
          ast.numerator,
          ast.denominator,
          numberOfComponents
        ),
        'linear',
        {
          type: 'FractionLiteral',
          numerator: ast.numerator,
          denominator: ast.denominator,
        }
      );
  }
  if (ast.type === 'EdjiFraction') {
    const node: NedjiLiteral = {
      type: 'NedoLiteral',
      numerator: Number(ast.numerator),
      denominator: Number(ast.denominator),
    };
    const fractionOfEquave = new Fraction(node.numerator, node.denominator);
    let equave: Fraction | undefined;
    if (ast.equave?.type === 'PlainLiteral') {
      node.equaveNumerator = Number(ast.equave.value);
      equave = new Fraction(node.equaveNumerator);
    } else if (ast.equave?.type === 'FractionLiteral') {
      node.equaveNumerator = Number(ast.equave.numerator);
      node.equaveDenominator = Number(ast.equave.denominator);
      equave = new Fraction(node.equaveNumerator, node.equaveDenominator);
    }
    return new Interval(
      TimeMonzo.fromEqualTemperament(
        fractionOfEquave,
        equave,
        numberOfComponents
      ),
      'logarithmic',
      node
    );
  } else if (ast.type === 'Monzo') {
    const components = ast.components.map(c => new Fraction(c));
    while (components.length < numberOfComponents) {
      components.push(new Fraction(0));
    }
    let residual = new Fraction(1);
    let cents = 0;
    while (components.length > numberOfComponents) {
      const exponent = new Fraction(components.pop()!);
      const factor = new Fraction(PRIMES[components.length]).pow(exponent);
      if (factor === null) {
        cents += exponent.valueOf() * PRIME_CENTS[components.length];
      } else {
        residual = residual.mul(factor);
      }
    }
    return new Interval(
      new TimeMonzo(ZERO, components, residual, cents),
      'logarithmic'
    );
  } else if (ast.type === 'UnaryExpression') {
    const operand = evaluateAst(ast.operand, numberOfComponents);
    return new Interval(
      operand.value.inverse(),
      operand.domain,
      uniformInvertNode(operand.node),
      operand
    );
  }
  const left = evaluateAst(ast.left, numberOfComponents);
  const right = evaluateAst(ast.right, numberOfComponents);
  let domain: Domain = 'linear';
  if (left.domain === 'logarithmic' || right.domain === 'logarithmic') {
    domain = 'logarithmic';
  }
  if (ast.operator === '+') {
    return new Interval(
      left.value.mul(right.value),
      domain,
      mulNodes(left.node, right.node)
    );
  }
  return new Interval(
    left.value.div(right.value),
    domain,
    divNodes(left.node, right.node)
  );
}
