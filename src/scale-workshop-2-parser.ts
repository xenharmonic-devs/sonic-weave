import {Fraction, PRIMES, PRIME_CENTS} from 'xen-dev-utils';
import {TimeMonzo} from './monzo';
import {parse} from './scale-workshop-2-ast';

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
 * Parse a string to the {@link TimeMonzo} it represents.
 * @param input A string to parse.
 * @param numberOfComponents Number of components to use for the {@link TimeMonzo} instance's prime exponent part.
 * @param admitBareNumbers Interprete bare numbers as n/1 ratios instead of throwing an error.
 * @param universalMinus Allow unary minus operator in front of every line type.
 * @returns {@link TimeMonzo} instance constructed from the input string.
 * @throws An error if the input cannot be interpreted as an interval.
 */
export function parseScaleWorkshop2Line(
  input: string,
  numberOfComponents: number,
  admitBareNumbers = false,
  universalMinus = true
): TimeMonzo {
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
  return evaluateAst(ast, numberOfComponents);
}

function evaluateAst(ast: Expression, numberOfComponents: number): TimeMonzo {
  switch (ast.type) {
    case 'PlainLiteral':
      return TimeMonzo.fromBigInt(ast.value, numberOfComponents);
    case 'CentsLiteral':
      return TimeMonzo.fromCents(
        parseDegenerateFloat(ast.whole, ast.fractional),
        numberOfComponents
      );
    case 'NumericLiteral':
      return TimeMonzo.fromValue(
        parseDegenerateFloat(ast.whole, ast.fractional),
        numberOfComponents
      );
    case 'FractionLiteral':
      return TimeMonzo.fromBigNumeratorDenominator(
        ast.numerator,
        ast.denominator,
        numberOfComponents
      );
  }
  if (ast.type === 'EdjiFraction') {
    const fractionOfEquave = new Fraction(
      Number(ast.numerator),
      Number(ast.denominator)
    );
    let equave: Fraction | undefined;
    if (ast.equave?.type === 'PlainLiteral') {
      equave = new Fraction(Number(ast.equave.value));
    } else if (ast.equave?.type === 'FractionLiteral') {
      equave = new Fraction(
        Number(ast.equave.numerator),
        Number(ast.equave.denominator)
      );
    }
    return TimeMonzo.fromEqualTemperament(
      fractionOfEquave,
      equave,
      numberOfComponents
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
    return new TimeMonzo(ZERO, components, residual, cents);
  } else if (ast.type === 'UnaryExpression') {
    const operand = evaluateAst(ast.operand, numberOfComponents);
    return operand.inverse();
  }
  const left = evaluateAst(ast.left, numberOfComponents);
  const right = evaluateAst(ast.right, numberOfComponents);
  if (ast.operator === '+') {
    return left.mul(right);
  }
  return left.div(right);
}
