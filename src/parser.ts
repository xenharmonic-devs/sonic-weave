import {Fraction} from 'xen-dev-utils';
import {
  NedoLiteral,
  PlainLiteral,
  IntervalLiteral,
  DecimalLiteral,
} from './expression';
import {Interval, Color} from './interval';
import {TimeMonzo} from './monzo';
import {parse} from './sonic-weave-ast';

type Program = {
  type: 'Program';
  body: Statement[];
};

type ExpressionStatement = {
  type: 'ExpressionStatement';
  expression: Expression;
};

type Statement = ExpressionStatement;

type BinaryExpression = {
  type: 'BinaryExpression';
  operator: '+' | '-';
  left: Expression;
  right: Expression;
  preferLeft: boolean;
  preferRight: boolean;
};

type ColorLiteral = {
  type: 'ColorLiteral';
  value: string;
};

type Identifier = {
  type: 'Identifier';
  id: string;
};

type CallExpression = {
  type: 'CallExpression';
  callee: Identifier;
};

type Expression =
  | BinaryExpression
  | CallExpression
  | IntervalLiteral
  | ColorLiteral
  | Identifier;

type VisitorContext = Map<
  string,
  Function | Interval | Interval[] | Color | string
>;

class StatementVisitor {
  scale: Interval[];
  context: VisitorContext;
  constructor() {
    this.scale = [];
    this.context = new Map();
    this.context.set('$', this.scale);
  }

  visit(node: Statement) {
    const subVisitor = new ExpressionVisitor(this.context);
    const value = subVisitor.visit(node.expression);
    if (value instanceof Color) {
      if (this.scale.length) {
        this.scale[this.scale.length - 1].color = value;
      }
    } else if (value instanceof Interval) {
      this.scale.push(value);
    }
  }
}

class ExpressionVisitor {
  context: VisitorContext;
  constructor(context: VisitorContext) {
    this.context = context;
  }

  visit(node: Expression): Interval | Color | undefined {
    switch (node.type) {
      case 'BinaryExpression':
        return this.visitBinaryExpression(node);
      case 'CallExpression':
        return this.visitCallExpression(node);
      case 'PlainLiteral':
        return this.visitPlainLiteral(node);
      case 'DecimalLiteral':
        return this.visitDecimalLiteral(node);
      case 'NedoLiteral':
        return this.visitNedoLiteral(node);
      case 'ColorLiteral':
        return new Color(node.value);
      case 'Identifier':
        return this.visitIdentifier(node);
    }
  }

  visitBinaryExpression(node: BinaryExpression): Interval {
    const left = this.visit(node.left);
    const right = this.visit(node.right);
    if (left instanceof Color || right instanceof Color) {
      throw new Error('Cannot operate on colors');
    }
    if (left === undefined || right === undefined) {
      throw new Error('Cannot operate on nothing');
    }
    if (node.preferLeft || node.preferRight) {
      let value: TimeMonzo;
      switch (node.operator) {
        case '+':
          value = left.value.add(right.value);
          break;
        case '-':
          value = left.value.sub(right.value);
          break;
      }
      if (node.preferLeft) {
        return new Interval(
          value,
          left.domain,
          value.as(node.left as IntervalLiteral)
        );
      }
      return new Interval(
        value,
        right.domain,
        value.as(node.right as IntervalLiteral)
      );
    }
    switch (node.operator) {
      case '+':
        return left.add(right);
      case '-':
        return left.sub(right);
    }
  }

  visitCallExpression(node: CallExpression) {
    if (this.context.has(node.callee.id)) {
      return (this.context.get(node.callee.id) as Function)();
    }
    throw new Error(`Reference error: ${node.callee.id} is not defined`);
  }

  visitPlainLiteral(node: PlainLiteral): Interval {
    const value = TimeMonzo.fromBigInt(node.value);
    return new Interval(value, 'linear', node);
  }

  visitDecimalLiteral(node: DecimalLiteral): Interval {
    let numerator = node.whole;
    let denominator = 1n;
    for (const c of node.fractional) {
      numerator = 10n * numerator + BigInt(c);
      denominator *= 10n;
    }
    const value = TimeMonzo.fromBigNumeratorDenominator(numerator, denominator);
    return new Interval(value, 'linear', node);
  }

  visitNedoLiteral(node: NedoLiteral): Interval {
    const value = TimeMonzo.fromEqualTemperament(
      new Fraction(Number(node.numerator), Number(node.denominator))
    );
    return new Interval(value, 'logarithmic', node);
  }

  visitIdentifier(node: Identifier): Interval {
    if (this.context.has(node.id)) {
      return this.context.get(node.id) as Interval;
    }
    throw new Error(`Reference error: ${node.id} is not defined`);
  }
}

export function parseAST(source: string): Program {
  return parse(source);
}

export function parseSource(source: string): Interval[] {
  const program = parseAST(source);
  const visitor = new StatementVisitor();
  visitor.context.set(
    'TAU',
    new Interval(TimeMonzo.fromValue(2 * Math.PI), 'linear')
  );
  visitor.context.set('sort', () => {
    const scale = visitor.context.get('$') as Interval[];
    scale.sort((a: Interval, b: Interval) => a.compare(b));
  });
  for (const statement of program.body) {
    visitor.visit(statement);
  }
  return visitor.scale;
}
