import {Fraction} from 'xen-dev-utils';
import {
  NedoLiteral,
  IntegerLiteral,
  IntervalLiteral,
  DecimalLiteral,
  FractionLiteral,
  HertzLiteral,
} from './expression';
import {Interval, Color, Domain} from './interval';
import {TimeMonzo} from './monzo';
import {parse} from './sonic-weave-ast';
import {BUILTIN_CONTEXT} from './builtin';
import {metricExponent} from './utils';

type BinaryOperator =
  | '+'
  | '-'
  | ''
  | '*'
  | '×'
  | '%'
  | '÷'
  | 'mod'
  | 'reduce'
  | 'log'
  | 'dot'
  | '^';

type Program = {
  type: 'Program';
  body: Statement[];
};

type VariableDeclaration = {
  type: 'VariableDeclaration';
  name: Identifier;
  value: Expression;
};

type FunctionDeclaration = {
  type: 'FunctionDeclaration';
  name: Identifier;
  parameters: Identifier[];
  body: Statement[];
};

type BlockStatement = {
  type: 'BlockStatement';
  body: Statement[];
};

type ExpressionStatement = {
  type: 'ExpressionStatement';
  expression: Expression;
};

type Statement =
  | VariableDeclaration
  | ExpressionStatement
  | FunctionDeclaration
  | BlockStatement;

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
  args: Expression[];
};

type ArrowFunction = {
  type: 'ArrowFunction';
  parameters: Identifier[];
  expression: Expression;
};

type OtonalChord = {
  type: 'OtonalChord';
  intervals: Expression[];
};

type HarmonicSegment = {
  type: 'HarmonicSegment';
  root: bigint;
  end: bigint;
};

type Expression =
  | BinaryExpression
  | CallExpression
  | ArrowFunction
  | IntervalLiteral
  | ColorLiteral
  | Identifier
  | OtonalChord
  | HarmonicSegment;

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
      case 'FunctionDeclaration':
        return this.visitFunctionDeclaration(node);
      case 'BlockStatement':
        return this.visitBlockStatement(node);
    }
    node satisfies never;
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
    } else if (Array.isArray(value)) {
      this.scale.push(...value);
    } else if (value === undefined) {
      /* Do nothing */
    } else {
      const bound = value.bind(this);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.scale = this.scale.map(i => bound(i));
      this.context.set('$', this.scale);
    }
  }

  visitBlockStatement(node: BlockStatement) {
    const subVisitor = new StatementVisitor();
    for (const [name, value] of this.context) {
      subVisitor.context.set(name, value);
    }
    subVisitor.context.set('$$', this.scale);
    subVisitor.context.set('$', subVisitor.scale);
    for (const statement of node.body) {
      subVisitor.visit(statement);
    }
    this.scale.push(...subVisitor.scale);
  }

  visitFunctionDeclaration(node: FunctionDeclaration) {
    function realization(...args: SonicWeaveValue[]) {
      const localVisitor = new StatementVisitor();
      for (const [name, value] of this.context) {
        localVisitor.context.set(name, value);
      }
      localVisitor.context.set('$$', this.scale);
      localVisitor.context.set('$', localVisitor.scale);

      for (let i = 0; i < Math.min(args.length, node.parameters.length); ++i) {
        localVisitor.context.set(node.parameters[i].id, args[i]);
      }
      for (const statement of node.body) {
        localVisitor.visit(statement);
      }
      return localVisitor.scale;
    }
    Object.defineProperty(realization, 'name', {
      value: node.name.id,
      enumerable: false,
    });
    this.context.set(node.name.id, realization);
  }
}

const ZERO = new Fraction(0);
const ONE = new Fraction(1);
const NEGATIVE_ONE = new Fraction(-1);
const CENT = new Interval(
  new TimeMonzo(ZERO, [new Fraction(1, 1200)]),
  'logarithmic',
  {type: 'CentLiteral'}
);

class ExpressionVisitor {
  context: VisitorContext;
  constructor(context: VisitorContext) {
    this.context = context;
  }

  visit(
    node: Expression
  ): Interval | Interval[] | Color | Function | undefined {
    switch (node.type) {
      case 'BinaryExpression':
        return this.visitBinaryExpression(node);
      case 'CallExpression':
        return this.visitCallExpression(node);
      case 'ArrowFunction':
        return this.visitArrowFunction(node);
      case 'IntegerLiteral':
        return this.visitIntegerLiteral(node);
      case 'DecimalLiteral':
        return this.visitDecimalLiteral(node);
      case 'FractionLiteral':
        return this.visitFractionLiteral(node);
      case 'NedoLiteral':
        return this.visitNedoLiteral(node);
      case 'CentLiteral':
        return CENT;
      case 'HertzLiteral':
        return this.visitHertzLiteral(node);
      case 'ColorLiteral':
        return new Color(node.value);
      case 'Identifier':
        return this.visitIdentifier(node);
      case 'OtonalChord':
        return this.visitOtonalChord(node);
      case 'HarmonicSegment':
        return this.visitHarmonicSegment(node);
    }
    node satisfies never;
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
    if (Array.isArray(left) || Array.isArray(right)) {
      throw new Error('Cannot operate on arrays');
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
        case '^':
          value = left.value.pow(right.value);
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
      case '×':
      case '*':
      case '':
        return left.mul(right);
      default:
        throw new Error('Unimplemented');
    }
  }

  visitCallExpression(node: CallExpression) {
    if (this.context.has(node.callee.id)) {
      const args = node.args.map(arg => this.visit(arg));
      return (this.context.get(node.callee.id) as Function).bind(this)(...args);
    }
    throw new Error(`Reference error: ${node.callee.id} is not defined`);
  }

  visitArrowFunction(node: ArrowFunction) {
    function realization(...args: SonicWeaveValue[]) {
      const localContext: VisitorContext = new Map(this.context);
      for (let i = 0; i < Math.min(args.length, node.parameters.length); ++i) {
        localContext.set(node.parameters[i].id, args[i]);
      }
      const localVisitor = new ExpressionVisitor(localContext);
      return localVisitor.visit(node.expression);
    }
    Object.defineProperty(realization, 'name', {
      value: '(lambda)',
      enumerable: false,
    });
    return realization;
  }

  visitIntegerLiteral(node: IntegerLiteral): Interval {
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

  visitHertzLiteral(node: HertzLiteral): Interval {
    const value = new TimeMonzo(ZERO, [ONE, ZERO, ONE]).pow(
      metricExponent(node.prefix)
    );
    value.timeExponent = NEGATIVE_ONE;
    return new Interval(value, 'linear', node);
  }

  visitIdentifier(node: Identifier): Interval {
    if (this.context.has(node.id)) {
      return this.context.get(node.id) as Interval;
    }
    throw new Error(`Reference error: ${node.id} is not defined`);
  }

  visitOtonalChord(node: OtonalChord): Interval[] {
    const domains: Domain[] = [];
    const monzos: TimeMonzo[] = [];
    for (const expression of node.intervals) {
      const interval = this.visit(expression);
      if (interval instanceof Interval) {
        monzos.push(interval.value);
        domains.push(interval.domain);
      } else {
        throw new Error('Type error: Can only stack intervals in a chord');
      }
    }
    domains.shift();
    const root = monzos.shift()!;
    const intervals: Interval[] = [];
    for (let i = 0; i < monzos.length; ++i) {
      intervals.push(new Interval(monzos[i].div(root), domains[i]));
    }
    return intervals;
  }

  visitHarmonicSegment(node: HarmonicSegment): Interval[] {
    const intervals: Interval[] = [];
    for (let n = node.root + 1n; n <= node.end; ++n) {
      const syntheticNode: FractionLiteral = {
        type: 'FractionLiteral',
        numerator: n,
        denominator: node.root,
      };
      intervals.push(
        new Interval(
          TimeMonzo.fromBigNumeratorDenominator(n, node.root),
          'linear',
          syntheticNode
        )
      );
    }
    return intervals;
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
