import {
  Fraction,
  PRIMES,
  PRIME_CENTS,
  dot,
  gcd,
  valueToCents,
} from 'xen-dev-utils';
import {Domain, TimeMonzo, TimeReal, getNumberOfComponents} from './monzo';
import {parse} from './scale-workshop-2-ast';
import {Interval} from './interval';
import {
  CentsLiteral,
  DecimalLiteral,
  NedjiLiteral,
  uniformInvertNode,
} from './expression';

const ZERO = new Fraction(0);

// Abstract Syntax Tree hierarchy
type PlainLiteral = {
  type: 'PlainLiteral';
  value: bigint;
};

type SW2CentsLiteral = {
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
  numerator?: bigint;
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
  | SW2CentsLiteral
  | NumericLiteral
  | FractionLiteral
  | EdjiFraction
  | Monzo
  | UnaryExpression
  | BinaryExpression;

function parseAst(input: string): Expression {
  return parse(input);
}

function parseDecimal(sw2Node: NumericLiteral, numberOfComponents: number) {
  const node: DecimalLiteral = {
    type: 'DecimalLiteral',
    sign: '',
    whole: sw2Node.whole ?? 0n,
    fractional: sw2Node.fractional ?? '',
    flavor: 'e',
    exponent: null,
  };
  let numerator = node.whole;
  let denominator = 1n;
  for (const c of node.fractional) {
    numerator = 10n * numerator + BigInt(c);
    denominator *= 10n;
  }
  const value = TimeMonzo.fromBigNumeratorDenominator(
    numerator,
    denominator,
    numberOfComponents
  );
  return new Interval(value, 'linear', 0, node);
}

function parseCents(sw2Node: SW2CentsLiteral, numberOfComponents: number) {
  const node: CentsLiteral = {
    type: 'CentsLiteral',
    sign: '',
    whole: sw2Node.whole ?? 0n,
    fractional: sw2Node.fractional ?? '',
    exponent: null,
    real: false,
  };
  let numerator: bigint | number = node.whole;
  let denominator: bigint | number = 1200n;
  for (const c of node.fractional) {
    numerator = 10n * numerator + BigInt(c);
    denominator *= 10n;
  }
  const factor = gcd(numerator, denominator);
  numerator = Number(numerator / factor);
  denominator = Number(denominator / factor);
  let value: TimeMonzo | TimeReal;
  try {
    value = new TimeMonzo(ZERO, [new Fraction(numerator, denominator)]);
    value.numberOfComponents = numberOfComponents;
  } catch {
    value = TimeReal.fromCents((1200 * numerator) / denominator);
  }
  return new Interval(value, 'logarithmic', 0, node);
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
        0,
        {
          type: 'IntegerLiteral',
          value: ast.value,
        }
      );
    case 'CentsLiteral':
      return parseCents(ast, numberOfComponents);
    case 'NumericLiteral':
      return parseDecimal(ast, numberOfComponents);
    case 'FractionLiteral':
      return new Interval(
        TimeMonzo.fromBigNumeratorDenominator(
          ast.numerator,
          ast.denominator,
          numberOfComponents
        ),
        'linear',
        0,
        {
          type: 'FractionLiteral',
          numerator: ast.numerator,
          denominator: ast.denominator,
        }
      );
  }
  if (ast.type === 'EdjiFraction') {
    const node: NedjiLiteral = {
      type: 'NedjiLiteral',
      numerator: Number(ast.numerator),
      denominator: Number(ast.denominator),
      equaveNumerator: null,
      equaveDenominator: null,
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
      0,
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
    if (cents) {
      return new Interval(
        TimeReal.fromCents(
          dot(
            PRIME_CENTS,
            components.map(f => f.valueOf())
          ) +
            cents +
            valueToCents(residual.valueOf())
        ),
        'logarithmic'
      );
    } else {
      return new Interval(
        new TimeMonzo(ZERO, components, residual),
        'logarithmic'
      );
    }
  } else if (ast.type === 'UnaryExpression') {
    const operand = evaluateAst(ast.operand, numberOfComponents);
    return new Interval(
      operand.value.inverse(),
      operand.domain,
      0,
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
    return new Interval(left.value.mul(right.value), domain);
  }
  return new Interval(left.value.div(right.value), domain);
}
