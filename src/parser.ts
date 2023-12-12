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
import {BUILTIN_CONTEXT, PRELUDE_SOURCE} from './builtin';
import {metricExponent} from './utils';

type BinaryOperator =
  | '??'
  | '+'
  | '-'
  | ''
  | '*'
  | '×'
  | '%'
  | '÷'
  | '\\'
  | 'mod'
  | 'red'
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

type ReturnStatement = {
  type: 'ReturnStatement';
  argument?: Expression;
};

type WhileStatement = {
  type: 'WhileStatement';
  test: Expression;
  body: Statement;
};

type ExpressionStatement = {
  type: 'ExpressionStatement';
  expression: Expression;
};

type Statement =
  | VariableDeclaration
  | ExpressionStatement
  | FunctionDeclaration
  | BlockStatement
  | WhileStatement
  | ReturnStatement;

type ArrayAccess = {
  type: 'ArrayAccess';
  object: Expression;
  index: Expression;
};

type UnaryExpression = {
  type: 'UnaryExpression';
  operator: '+' | '-' | '%' | '÷' | '++' | '--';
  operand: Expression;
  prefix: boolean;
};

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

type EnumeratedChord = {
  type: 'EnumeratedChord';
  intervals: Expression[];
};

type HarmonicSegment = {
  type: 'HarmonicSegment';
  root: Expression;
  end: Expression;
};

type Range = {
  type: 'Range';
  start: Expression;
  second?: Expression;
  end: Expression;
};

type Expression =
  | ArrayAccess
  | UnaryExpression
  | BinaryExpression
  | CallExpression
  | ArrowFunction
  | IntervalLiteral
  | ColorLiteral
  | Identifier
  | EnumeratedChord
  | Range
  | HarmonicSegment;

type SonicWeaveValue =
  | Function
  | Interval
  | Interval[]
  | Color
  | string
  | undefined;

export type VisitorContext = Map<string, SonicWeaveValue>;

export class StatementVisitor {
  context: VisitorContext;
  constructor() {
    this.context = new Map();
    this.context.set('$', []);
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
      case 'WhileStatement':
        return this.visitWhileStatement(node);
      case 'ReturnStatement':
        return node;
    }
    node satisfies never;
  }

  visitVariableDeclaration(node: VariableDeclaration) {
    const subVisitor = new ExpressionVisitor(this.context);
    const value = subVisitor.visit(node.value);
    this.context.set(node.name.id, value);
  }

  visitExpression(node: ExpressionStatement) {
    const subVisitor = new ExpressionVisitor(this.context);
    const value = subVisitor.visit(node.expression);
    const scale = this.context.get('$');
    if (!Array.isArray(scale)) {
      throw new Error('Context corruption detected');
    }
    if (value instanceof Color) {
      if (scale.length) {
        scale[scale.length - 1].color = value;
      }
    } else if (value instanceof Interval) {
      scale.push(value);
    } else if (Array.isArray(value)) {
      scale.push(...value);
    } else if (value === undefined) {
      /* Do nothing */
    } else if (typeof value === 'string') {
      if (scale.length) {
        scale[scale.length - 1].label = value;
      }
    } else {
      const bound = value.bind(this);
      const mapped = scale.map(i => bound(i));
      scale.length = 0;
      scale.push(...mapped);
    }
  }

  visitBlockStatement(node: BlockStatement) {
    const subVisitor = new StatementVisitor();
    for (const [name, value] of this.context) {
      subVisitor.context.set(name, value);
    }
    const scale = this.context.get('$')!;
    if (!Array.isArray(scale)) {
      throw new Error('Context corruption detected');
    }
    subVisitor.context.set('$$', scale);
    subVisitor.context.set('$', []);
    for (const statement of node.body) {
      const interrupt = subVisitor.visit(statement);
      if (interrupt) {
        return interrupt;
      }
    }
    const subScale = subVisitor.context.get('$');
    if (!Array.isArray(subScale)) {
      throw new Error('Context corruption detected');
    }
    scale.push(...subScale);
    for (const [name, value] of subVisitor.context) {
      if (name === '$' || name === '$$') {
        continue;
      }
      if (this.context.has(name)) {
        this.context.set(name, value);
      }
    }
  }

  visitWhileStatement(node: WhileStatement) {
    const subVisitor = new ExpressionVisitor(this.context);
    let test: SonicWeaveValue | number = subVisitor.visit(node.test);
    if (test instanceof Interval) {
      test = test.value.valueOf();
    }
    while (test) {
      const interrupt = this.visit(node.body);
      if (interrupt && interrupt.type === 'ReturnStatement') {
        return interrupt;
      }
      test = subVisitor.visit(node.test);
      if (test instanceof Interval) {
        test = test.value.valueOf();
      }
    }
  }

  visitFunctionDeclaration(node: FunctionDeclaration) {
    function realization(...args: SonicWeaveValue[]) {
      const localVisitor = new StatementVisitor();
      for (const [name, value] of this.context) {
        localVisitor.context.set(name, value);
      }
      localVisitor.context.set('$$', this.context.get('$'));
      localVisitor.context.set('$', []);

      for (let i = 0; i < node.parameters.length; ++i) {
        if (i < args.length) {
          localVisitor.context.set(node.parameters[i].id, args[i]);
        } else {
          localVisitor.context.set(node.parameters[i].id, undefined);
        }
      }
      for (const statement of node.body) {
        const interrupt = localVisitor.visit(statement);
        if (interrupt && interrupt.type === 'ReturnStatement') {
          if (interrupt.argument === undefined) {
            return;
          }
          const argumentVisitor = new ExpressionVisitor(localVisitor.context);
          return argumentVisitor.visit(interrupt.argument);
        }
      }
      return localVisitor.context.get('$');
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
const LINEAR_UNITY = new Interval(new TimeMonzo(ZERO, []), 'linear', {
  type: 'IntegerLiteral',
  value: 1n,
});

class ExpressionVisitor {
  context: VisitorContext;
  constructor(context: VisitorContext) {
    this.context = context;
  }

  visit(node: Expression): SonicWeaveValue {
    switch (node.type) {
      case 'ArrayAccess':
        return this.visitArrayAccess(node);
      case 'UnaryExpression':
        return this.visitUnaryExpression(node);
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
      case 'EnumeratedChord':
        return this.visitEnumeratedChord(node);
      case 'Range':
        return this.visitRange(node);
      case 'HarmonicSegment':
        return this.visitHarmonicSegment(node);
    }
    node satisfies never;
  }

  visitArrayAccess(node: ArrayAccess): Interval {
    const object = this.visit(node.object);
    if (!Array.isArray(object)) {
      throw new Error('Array access on non-array');
    }
    const index = this.visit(node.index);
    if (!(index instanceof Interval)) {
      throw new Error('Array access with a non-integer');
    }
    let i = Number(index.value.toBigInteger());
    if (i < 0) {
      i += object.length;
    }
    return object[i];
  }

  visitUnaryExpression(node: UnaryExpression): Interval {
    const operand = this.visit(node.operand);
    if (!(operand instanceof Interval)) {
      throw new Error('Can only operate on intervals');
    }
    let newValue: Interval;
    switch (node.operator) {
      case '+':
        return operand;
      case '-':
        return operand.neg();
      case '%':
      case '\u00F7':
        return operand.inverse();
      case '++':
        newValue = operand.add(LINEAR_UNITY);
        break;
      case '--':
        newValue = operand.sub(LINEAR_UNITY);
        break;
    }
    if (node.operand.type !== 'Identifier') {
      throw new Error('Cannot increment/decrement a value');
    }
    this.context.set(node.operand.id, newValue);
    if (node.prefix) {
      return newValue;
    }
    return operand;
  }

  visitBinaryExpression(node: BinaryExpression): Interval | undefined {
    const left = this.visit(node.left);
    const right = this.visit(node.right);
    if (left instanceof Color || right instanceof Color) {
      throw new Error('Cannot operate on colors');
    }
    if (typeof left === 'function' || typeof right === 'function') {
      throw new Error('Cannot operate on functions');
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      throw new Error('Cannot operate on arrays');
    }
    if (typeof left === 'string' || typeof right === 'string') {
      throw new Error('Cannot operate on strings');
    }
    if (left === undefined || right === undefined) {
      if (node.operator !== '??') {
        throw new Error('Cannot operate on nothing');
      }
      return left ?? right;
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
        case '×':
        case '*':
          value = left.value.mul(right.value);
          break;
        case '÷':
        case '%':
          value = left.value.div(right.value);
          break;
        case 'red':
          value = left.value.reduce(right.value);
          break;
        case '^':
          value = left.value.pow(right.value);
          break;
        case '\\':
          throw new Error('Preference not supported with backslahes');
        default:
          throw new Error(
            `${node.preferLeft ? '~' : ''}${node.operator}${
              node.preferRight ? '~' : ''
            } unimplemented`
          );
      }
      if (node.preferLeft) {
        return new Interval(value, left.domain, value.as(left.node));
      }
      return new Interval(value, right.domain, value.as(right.node));
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
      case '÷':
      case '%':
        return left.div(right);
      case '^':
        return left.pow(right);
      case 'log':
        return left.log(right);
      case '\\':
        return left.backslash(right);
      case '??':
        return left;
      default:
        throw new Error(`${node.operator} unimplemented`);
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
      for (let i = 0; i < node.parameters.length; ++i) {
        if (i < args.length) {
          localContext.set(node.parameters[i].id, args[i]);
        } else {
          localContext.set(node.parameters[i].id, undefined);
        }
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
    if (node.hard) {
      const value = TimeMonzo.fromValue(
        parseFloat(`${node.whole}.${node.fractional}`)
      );
      return new Interval(value, 'linear', node);
    }
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

  visitEnumeratedChord(node: EnumeratedChord): Interval[] {
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

  visitRange(node: Range): Interval[] {
    const start = this.visit(node.start);
    const end = this.visit(node.end);
    if (!(start instanceof Interval && end instanceof Interval)) {
      throw new Error('Ranges must consist of intervals');
    }

    let step = LINEAR_UNITY;
    if (node.second) {
      const second = this.visit(node.second);
      if (!(second instanceof Interval)) {
        throw new Error('Ranges must consist of intervals');
      }
      if (second.compare(end) > 0) {
        throw new Error('Empty range');
      }
      step = second.sub(start);
    } else if (start.compare(end) > 0) {
      throw new Error('Empty range');
    }
    const result = [start];
    let next = start.add(step);
    while (next.compare(end) <= 0) {
      result.push(next);
      next = next.add(step);
    }
    return result;
  }

  visitHarmonicSegment(node: HarmonicSegment): Interval[] {
    const root = this.visit(node.root);
    const end = this.visit(node.end);
    if (!(root instanceof Interval && end instanceof Interval)) {
      throw new Error('Harmonic segments must be built from intervals');
    }
    let next = root.add(LINEAR_UNITY);
    const result: Interval[] = [];
    while (next.compare(end) <= 0) {
      result.push(next.div(root));
      next = next.add(LINEAR_UNITY);
    }
    return result;
  }
}

export function parseAST(source: string): Program {
  return parse(source);
}

export function parseSource(source: string, includePrelude = true): Interval[] {
  // TODO: Cache on first intialization.
  const visitor = new StatementVisitor();
  for (const name in BUILTIN_CONTEXT) {
    const value = BUILTIN_CONTEXT[name];
    visitor.context.set(name, value);
  }

  if (includePrelude) {
    const prelude = parseAST(PRELUDE_SOURCE);
    for (const statement of prelude.body) {
      visitor.visit(statement);
    }
  }

  const program = parseAST(source);
  for (const statement of program.body) {
    const interrupt = visitor.visit(statement);
    if (interrupt) {
      throw new Error('Illegal statement');
    }
  }
  const scale = visitor.context.get('$');
  if (!Array.isArray(scale)) {
    throw new Error('Context corruption detected');
  }
  return scale;
}
