import {Fraction} from 'xen-dev-utils';
import {
  NedoLiteral,
  PlainLiteral,
  IntervalLiteral,
  DecimalLiteral,
  FractionLiteral,
} from './expression';
import {Interval, Color} from './interval';
import {TimeMonzo} from './monzo';
import {parse} from './sonic-weave-ast';
import {BUILTIN_CONTEXT} from './builtin';

type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '×'
  | '%'
  | '÷'
  | 'mod'
  | 'reduce'
  | 'log'
  | 'dot';

type Program = {
  type: 'Program';
  body: Statement[];
};

type VariableDeclaration = {
  type: 'VariableDeclaration';
  name: Identifier;
  value: Expression;
};

type ExpressionStatement = {
  type: 'ExpressionStatement';
  expression: Expression;
};

type Statement = VariableDeclaration | ExpressionStatement;

type BinaryExpression = {
  type: 'BinaryExpression';
  operator: BinaryOperator;
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

type ArrowFunction = {
  type: 'ArrowFunction';
  args: Identifier[];
  expression: Expression;
};

type Expression =
  | BinaryExpression
  | CallExpression
  | ArrowFunction
  | IntervalLiteral
  | ColorLiteral
  | Identifier;

type SonicWeaveValue = Function | Interval | Interval[] | Color | string;

export type VisitorContext = Map<string, SonicWeaveValue>;

export class StatementVisitor {
  scale: Interval[];
  context: VisitorContext;
  constructor() {
    this.scale = [];
    this.context = new Map();
    this.context.set('$', this.scale);
  }

  visit(node: Statement) {
    switch (node.type) {
      case 'VariableDeclaration':
        return this.visitVariableDeclaration(node);
      case 'ExpressionStatement':
        return this.visitExpression(node);
    }
  }

  visitVariableDeclaration(node: VariableDeclaration) {
    const subVisitor = new ExpressionVisitor(this.context);
    const value = subVisitor.visit(node.value);
    if (!value) {
      throw new Error('Cannot assign nothing');
    }
    this.context.set(node.name.id, value);
  }

  visitExpression(node: ExpressionStatement) {
    const subVisitor = new ExpressionVisitor(this.context);
    const value = subVisitor.visit(node.expression);
    if (value instanceof Color) {
      if (this.scale.length) {
        this.scale[this.scale.length - 1].color = value;
      }
    } else if (value instanceof Interval) {
      this.scale.push(value);
    } else if (typeof value === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.scale = this.scale.map(value.bind(this) as any);
      this.context.set('$', this.scale);
    }
  }
}

class ExpressionVisitor {
  context: VisitorContext;
  constructor(context: VisitorContext) {
    this.context = context;
  }

  visit(node: Expression): Interval | Color | Function | undefined {
    switch (node.type) {
      case 'BinaryExpression':
        return this.visitBinaryExpression(node);
      case 'CallExpression':
        return this.visitCallExpression(node);
      case 'ArrowFunction':
        return this.visitArrowFunction(node);
      case 'PlainLiteral':
        return this.visitPlainLiteral(node);
      case 'DecimalLiteral':
        return this.visitDecimalLiteral(node);
      case 'FractionLiteral':
        return this.visitFractionLiteral(node);
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
    if (typeof left === 'function' || typeof right === 'function') {
      throw new Error('Cannot operate on functions');
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
        case '%':
          value = left.value.div(right.value);
          break;
        default:
          throw new Error('Unimplemented');
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
      default:
        throw new Error('Unimplemented');
    }
  }

  visitCallExpression(node: CallExpression) {
    if (this.context.has(node.callee.id)) {
      return (this.context.get(node.callee.id) as Function).bind(this)();
    }
    throw new Error(`Reference error: ${node.callee.id} is not defined`);
  }

  visitArrowFunction(node: ArrowFunction) {
    function realization(...args: SonicWeaveValue[]) {
      const localContext: VisitorContext = new Map(this.context);
      for (let i = 0; i < Math.min(args.length, node.args.length); ++i) {
        localContext.set(node.args[i].id, args[i]);
      }
      const localVisitor = new ExpressionVisitor(localContext);
      return localVisitor.visit(node.expression);
    }
    return realization;
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

  visitFractionLiteral(node: FractionLiteral): Interval {
    const value = TimeMonzo.fromBigNumeratorDenominator(
      node.numerator,
      node.denominator
    );
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
  for (const name in BUILTIN_CONTEXT) {
    const value = BUILTIN_CONTEXT[name];
    visitor.context.set(name, value);
  }

  for (const statement of program.body) {
    visitor.visit(statement);
  }
  return visitor.scale;
}
