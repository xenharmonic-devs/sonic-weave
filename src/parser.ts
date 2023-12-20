import {Fraction} from 'xen-dev-utils';
import {
  NedjiLiteral,
  IntegerLiteral,
  IntervalLiteral,
  DecimalLiteral,
  FractionLiteral,
  HertzLiteral,
  CentsLiteral,
  uniformInvertNode,
  AbsoluteFJS,
  FJS,
  WartsLiteral,
  SecondLiteral,
  MonzoLiteral,
  VectorComponent,
  formatComponent,
  ValLiteral,
} from './expression';
import {Interval, Color, Domain} from './interval';
import {TimeMonzo} from './monzo';
import {parse} from './sonic-weave-ast';
import {CSS_COLOR_CONTEXT} from './css-colors';
import {
  SonicWeaveValue,
  sonicTruth,
  BUILTIN_CONTEXT,
  PRELUDE_SOURCE,
  sonicBool,
  relog,
  linearOne,
} from './builtin';
import {bigGcd, metricExponent, ZERO, ONE, NEGATIVE_ONE, TWO} from './utils';
import {pythagoreanMonzo, absoluteMonzo} from './pythagorean';
import {inflect} from './fjs';
import {inferEquave, wartsToVal} from './warts';

type BinaryOperator =
  | '??'
  | '||'
  | '&&'
  | '==='
  | '!=='
  | '=='
  | '!='
  | '<='
  | '>='
  | '<'
  | '>'
  | 'of'
  | '!of'
  | '~of'
  | '!~of'
  | '+'
  | '-'
  | 'to'
  | 'by'
  | ''
  | '*'
  | '×'
  | '%'
  | '÷'
  | '\\'
  | 'mod'
  | 'red'
  | 'log'
  | '·'
  | 'dot'
  | '⊗'
  | 'tns'
  | '^';

type Program = {
  type: 'Program';
  body: Statement[];
};

type VariableDeclaration = {
  type: 'VariableDeclaration';
  name: Identifier | Identifier[] | ArrayAccess;
  value: Expression;
};

type FunctionDeclaration = {
  type: 'FunctionDeclaration';
  name: Identifier;
  parameters: Identifier[];
  body: Statement[];
};

type PitchDeclaration = {
  type: 'PitchDeclaration';
  left: Expression;
  middle?: Expression;
  right: Expression;
};

type BlockStatement = {
  type: 'BlockStatement';
  body: Statement[];
};

type ReturnStatement = {
  type: 'ReturnStatement';
  argument?: Expression;
};

type ThrowStatement = {
  type: 'ThrowStatement';
  argument: Expression;
};

type WhileStatement = {
  type: 'WhileStatement';
  test: Expression;
  body: Statement;
};

type IfStatement = {
  type: 'IfStatement';
  test: Expression;
  consequent: Statement;
  alternate?: Statement;
};

type ForOfStatement = {
  type: 'ForOfStatement';
  element: Identifier | Identifier[];
  array: Expression;
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
  | PitchDeclaration
  | BlockStatement
  | WhileStatement
  | IfStatement
  | ForOfStatement
  | ThrowStatement
  | ReturnStatement;

type ConditionalExpression = {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
};

type ArrayAccess = {
  type: 'ArrayAccess';
  object: Expression;
  index: Expression;
};

type ArraySlice = {
  type: 'ArraySlice';
  object: Expression;
  start: Expression | null;
  second: Expression | null;
  end: Expression | null;
};

type UnaryExpression = {
  type: 'UnaryExpression';
  operator: '+' | '-' | '%' | '÷' | '!' | '^' | '++' | '--';
  operand: Expression;
  prefix: boolean;
  uniform: boolean;
};

type BinaryExpression = {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
  preferLeft: boolean;
  preferRight: boolean;
};

type LabeledExpression = {
  type: 'LabeledExpression';
  object: Expression;
  labels: (Identifier | ColorLiteral | StringLiteral)[];
};

type NedjiProjection = {
  type: 'NedjiProjection';
  octaves: Expression;
  base: Expression;
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
  callee: Identifier | ArrayAccess;
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

type ArrayLiteral = {
  type: 'ArrayLiteral';
  elements: Expression[];
};

type StringLiteral = {
  type: 'StringLiteral';
  value: string;
};

type Expression =
  | ConditionalExpression
  | ArrayAccess
  | ArraySlice
  | UnaryExpression
  | BinaryExpression
  | LabeledExpression
  | NedjiProjection
  | CallExpression
  | ArrowFunction
  | IntervalLiteral
  | ColorLiteral
  | Identifier
  | EnumeratedChord
  | Range
  | ArrayLiteral
  | StringLiteral
  | HarmonicSegment;

function strictIncludes(element: Interval, scale: Interval[]) {
  for (const existing of scale) {
    if (existing.strictEquals(element)) {
      return true;
    }
  }
  return false;
}

function includes(element: Interval, scale: Interval[]) {
  for (const existing of scale) {
    if (existing.equals(element)) {
      return true;
    }
  }
  return false;
}

export type VisitorContext = Map<string, SonicWeaveValue>;

class Interupt {
  node: ReturnStatement;
  value?: SonicWeaveValue;
  constructor(node: ReturnStatement, value?: SonicWeaveValue) {
    this.node = node;
    this.value = value;
  }
}

export class StatementVisitor {
  context: VisitorContext;
  constructor() {
    this.context = new Map();
    this.context.set('$', []);
  }

  // TODO: Deep cloning
  clone() {
    const result = new StatementVisitor();
    result.context = new Map(this.context);
    result.context.set('$', []);
    return result;
  }

  visit(node: Statement): Interupt | undefined {
    switch (node.type) {
      case 'VariableDeclaration':
        return this.visitVariableDeclaration(node);
      case 'ExpressionStatement':
        return this.visitExpression(node);
      case 'FunctionDeclaration':
        return this.visitFunctionDeclaration(node);
      case 'PitchDeclaration':
        return this.visitPitchDeclaration(node);
      case 'BlockStatement':
        return this.visitBlockStatement(node);
      case 'WhileStatement':
        return this.visitWhileStatement(node);
      case 'IfStatement':
        return this.visitIfStatement(node);
      case 'ForOfStatement':
        return this.visitForOfStatement(node);
      case 'ReturnStatement':
        return this.visitReturnStatement(node);
      case 'ThrowStatement':
        throw this.visitThrowStatement(node);
    }
    node satisfies never;
  }

  visitReturnStatement(node: ReturnStatement) {
    let value: SonicWeaveValue;
    if (node.argument) {
      const subVisitor = new ExpressionVisitor(this.context);
      value = subVisitor.visit(node.argument);
    }
    return new Interupt(node, value);
  }

  visitThrowStatement(node: ThrowStatement) {
    const subVisitor = new ExpressionVisitor(this.context);
    const value = subVisitor.visit(node.argument);
    if (typeof value === 'string') {
      throw new Error(value);
    }
    throw value;
  }

  visitVariableDeclaration(node: VariableDeclaration) {
    const subVisitor = new ExpressionVisitor(this.context);
    const value = subVisitor.visit(node.value);
    if (Array.isArray(node.name)) {
      if (!Array.isArray(value)) {
        throw new Error('Destructuring declaration must assign an array');
      }
      for (let i = 0; i < node.name.length; ++i) {
        this.context.set(node.name[i].id, value[i]);
      }
    } else if (node.name.type === 'Identifier') {
      this.context.set(node.name.id, value);
    } else {
      const object = subVisitor.visit(node.name.object);
      if (!Array.isArray(object)) {
        throw new Error('Array access on non-array');
      }
      const index = subVisitor.visit(node.name.index);
      if (!(index instanceof Interval)) {
        throw new Error('Array access with a non-integer');
      }
      let i = Number(index.value.toBigInteger());
      if (i < 0) {
        i += object.length;
      }
      // XXX: Abuses the type system.
      object[i] = value as Interval;
    }
    return undefined;
  }

  visitPitchDeclaration(node: PitchDeclaration) {
    if (
      node.middle?.type === 'AbsoluteFJS' ||
      node.right.type === 'AbsoluteFJS'
    ) {
      throw new Error('Declared pitch must be on the left');
    }

    const subVisitor = new ExpressionVisitor(this.context);

    if (node.left.type === 'AbsoluteFJS') {
      const value = subVisitor.visit(node.middle ?? node.right);
      if (!(value instanceof Interval)) {
        throw new Error('Pitch declaration must evaluate to an interval');
      }

      const pitch = subVisitor.visit(node.left) as Interval;

      const C4: TimeMonzo =
        (this.context.get('C4') as unknown as TimeMonzo) ?? UNITY_MONZO;

      this.context.set(
        'C4',
        C4.mul(value.value).div(pitch.value) as unknown as Interval
      );
      if (!node.middle) {
        return undefined;
      }
    }
    const left = subVisitor.visit(node.middle ?? node.left);
    const right = subVisitor.visit(node.right);
    if (!(left instanceof Interval && right instanceof Interval)) {
      throw new Error('Pitch declaration must evaluato an interval');
    }
    let absolute: TimeMonzo;
    let relative: TimeMonzo;
    if (left.value.timeExponent.n) {
      absolute = left.value;
      if (right.value.timeExponent.n) {
        throw new Error('Cannot assign absolute pitch to absolute pitch');
      }
      relative = right.value;
    } else {
      absolute = right.value;
      relative = left.value;
    }
    this.context.set(
      '1',
      absolute
        .pow(absolute.timeExponent.inverse().neg())
        .div(relative) as unknown as Interval
    );
    return undefined;
  }

  visitExpression(node: ExpressionStatement) {
    const subVisitor = new ExpressionVisitor(this.context);
    const value = subVisitor.visit(node.expression);
    this.handleValue(value);
    return undefined;
  }

  handleValue(value: SonicWeaveValue) {
    const scale = this.context.get('$');
    if (!Array.isArray(scale)) {
      throw new Error('Context corruption detected');
    }
    if (value instanceof Color) {
      if (scale.length) {
        scale[scale.length - 1].color = value;
      }
    } else if (value instanceof Interval) {
      if (value.domain === 'cologarithmic') {
        let divisions = value.value.primeExponents[0];
        let equave = new Fraction(2);
        let equaveNumerator: number | undefined = undefined;
        let equaveDenominator: number | undefined = undefined;
        if (value?.node?.type === 'WartsLiteral') {
          divisions = new Fraction(Number(value.node.divisions));
          const equave_ = inferEquave(value.node);
          if (!equave_) {
            throw new Error('Invalid warts equave');
          }
          equave = equave_;
          if (equave.compare(TWO)) {
            equaveNumerator = equave.n;
            equaveDenominator = equave.d;
          }
        }
        const step = new Interval(
          TimeMonzo.fromFraction(equave).pow(divisions.inverse()),
          'logarithmic',
          {
            type: 'NedoLiteral',
            numerator: BigInt(divisions.d),
            denominator: BigInt(divisions.n),
            equaveNumerator,
            equaveDenominator,
          }
        );
        const rl = relog.bind(this as unknown as ExpressionVisitor);
        const mapped = scale.map(i => rl(i).dot(value).mul(step));
        scale.length = 0;
        scale.push(...mapped);
      } else {
        scale.push(value);
      }
    } else if (Array.isArray(value)) {
      for (const subvalue of value) {
        this.handleValue(subvalue);
      }
    } else if (value === undefined) {
      /* Do nothing */
    } else if (typeof value === 'string') {
      if (scale.length) {
        scale[scale.length - 1].label = value;
      } else {
        this.context.set('"', value);
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
    return undefined;
  }

  visitWhileStatement(node: WhileStatement) {
    const subVisitor = new ExpressionVisitor(this.context);
    while (sonicTruth(subVisitor.visit(node.test))) {
      const interrupt = this.visit(node.body);
      if (interrupt) {
        return interrupt;
      }
    }
    return undefined;
  }

  visitForOfStatement(node: ForOfStatement) {
    const subVisitor = new ExpressionVisitor(this.context);
    const array = subVisitor.visit(node.array);
    if (!Array.isArray(array)) {
      throw new Error('Can only iterate over arrays');
    }
    for (const value of array) {
      if (Array.isArray(node.element)) {
        if (!Array.isArray(value)) {
          throw new Error('Must iterate over arrays when destructuring');
        }
        for (let i = 0; i < node.element.length; ++i) {
          this.context.set(node.element[i].id, value[i]);
        }
      } else {
        this.context.set(node.element.id, value);
      }
      const interrupt = this.visit(node.body);
      if (interrupt) {
        return interrupt;
      }
    }
    return undefined;
  }

  visitIfStatement(node: IfStatement) {
    const subVisitor = new ExpressionVisitor(this.context);
    if (sonicTruth(subVisitor.visit(node.test))) {
      return this.visit(node.consequent);
    }
    if (node.alternate) {
      return this.visit(node.alternate);
    }
    return undefined;
  }

  visitFunctionDeclaration(node: FunctionDeclaration) {
    function realization(this: ExpressionVisitor, ...args: SonicWeaveValue[]) {
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
        if (interrupt && interrupt.node.type === 'ReturnStatement') {
          return interrupt.value;
        }
      }
      return localVisitor.context.get('$');
    }
    Object.defineProperty(realization, 'name', {
      value: node.name.id,
      enumerable: false,
    });
    this.context.set(node.name.id, realization);
    return undefined;
  }
}

const UNITY_MONZO = new TimeMonzo(ZERO, []);
const TEN_MONZO = new TimeMonzo(ZERO, [ONE, ZERO, ONE]);
const CENT_MONZO = new TimeMonzo(ZERO, [new Fraction(1, 1200)]);
const RECIPROCAL_CENT_MONZO = new TimeMonzo(ZERO, [new Fraction(1200)]);

function resolvePreference(
  value: TimeMonzo,
  left: Interval,
  right: Interval,
  node: BinaryExpression
) {
  if (node.preferLeft && node.preferRight) {
    let domain = left.domain;
    if (right.domain === 'linear') {
      domain = 'linear';
    }
    return new Interval(value, domain);
  }
  if (node.preferLeft) {
    return new Interval(value, left.domain, value.as(left.node));
  }
  return new Interval(value, right.domain, value.as(right.node));
}

export class ExpressionVisitor {
  context: VisitorContext;
  constructor(context: VisitorContext) {
    this.context = context;
  }

  visit(node: Expression): SonicWeaveValue {
    switch (node.type) {
      case 'ConditionalExpression':
        return this.visitConditionalExpression(node);
      case 'ArrayAccess':
        return this.visitArrayAccess(node);
      case 'ArraySlice':
        return this.visitArraySlice(node);
      case 'UnaryExpression':
        return this.visitUnaryExpression(node);
      case 'BinaryExpression':
        return this.visitBinaryExpression(node);
      case 'LabeledExpression':
        return this.visitLabeledExpression(node);
      case 'NedjiProjection':
        return this.visitNedjiProjection(node);
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
      case 'CentsLiteral':
        return this.visitCentsLiteral(node);
      case 'CentLiteral':
        return new Interval(CENT_MONZO, 'logarithmic', {type: 'CentLiteral'});
      case 'ReciprocalCentLiteral':
        return new Interval(RECIPROCAL_CENT_MONZO, 'cologarithmic', {
          type: 'ReciprocalCentLiteral',
        });
      case 'TrueLiteral':
        return sonicBool(true);
      case 'FalseLiteral':
        return sonicBool(false);
      case 'MonzoLiteral':
        return this.visitMonzoLiteral(node);
      case 'ValLiteral':
        return this.visitValLiteral(node);
      case 'FJS':
        return this.visitFJS(node);
      case 'AbsoluteFJS':
        return this.visitAbsoluteFJS(node);
      case 'HertzLiteral':
        return this.visitHertzLiteral(node);
      case 'SecondLiteral':
        return this.visitSecondLiteral(node);
      case 'WartsLiteral':
        return this.visitWartsLiteral(node);
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
      case 'ArrayLiteral':
        // We cheat here to simplify the type hierarchy definition (no nested arrays).
        return node.elements.map(this.visit.bind(this)) as SonicWeaveValue;
      case 'StringLiteral':
        return node.value;
    }
    node satisfies never;
  }

  visitLabeledExpression(node: LabeledExpression) {
    const object = this.visit(node.object);
    if (!(object instanceof Interval)) {
      throw new Error('Labels can only be applied to intervals');
    }
    for (const label of node.labels) {
      const l = this.visit(label);
      if (typeof l === 'string') {
        object.label = l;
      } else if (l instanceof Color) {
        object.color = l;
      } else {
        throw new Error('Labels must be strings or colors');
      }
    }
    return object;
  }

  visitConditionalExpression(node: ConditionalExpression) {
    const test = this.visit(node.test);
    if (sonicTruth(test)) {
      return this.visit(node.consequent);
    }
    return this.visit(node.alternate);
  }

  visitComponent(component: VectorComponent) {
    // XXX: This is so backwards...
    return new Fraction(formatComponent(component));
  }

  visitMonzoLiteral(node: MonzoLiteral) {
    const primeExponents = node.components.map(this.visitComponent);
    const value = new TimeMonzo(ZERO, primeExponents);
    return new Interval(value, 'logarithmic', node);
  }

  visitValLiteral(node: ValLiteral) {
    const primeExponents = node.components.map(this.visitComponent);
    const value = new TimeMonzo(ZERO, primeExponents);
    // Rig ups-and-downs.
    value.cents = 1;
    return new Interval(value, 'cologarithmic', node);
  }

  visitNedjiProjection(node: NedjiProjection) {
    const octaves = this.visit(node.octaves);
    if (!(octaves instanceof Interval)) {
      throw new Error('Nedji steps must evaluate to an interval');
    }
    const base = this.visit(node.base);
    if (!(base instanceof Interval)) {
      throw new Error('Nedji base must evaluate to an interval');
    }
    return octaves.project(base);
  }

  visitWartsLiteral(node: WartsLiteral) {
    const val = wartsToVal(node);
    // Rig ups-and-downs.
    val.cents = 1;
    return new Interval(val, 'cologarithmic', node);
  }

  visitFJS(node: FJS) {
    const monzo = inflect(
      pythagoreanMonzo(node.pythagorean),
      node.superscripts,
      node.subscripts
    );
    monzo.cents = -node.downs;
    return new Interval(monzo, 'logarithmic', node);
  }

  visitAbsoluteFJS(node: AbsoluteFJS) {
    const C4: TimeMonzo =
      (this.context.get('C4') as unknown as TimeMonzo) ?? UNITY_MONZO;
    const relativeToC4 = inflect(
      absoluteMonzo(node.pitch),
      node.superscripts,
      node.subscripts
    );
    relativeToC4.cents = -node.downs;
    return new Interval(C4.mul(relativeToC4), 'logarithmic', node);
  }

  visitArrayAccess(node: ArrayAccess): SonicWeaveValue {
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

  visitArraySlice(node: ArraySlice): Interval[] {
    const object = this.visit(node.object);
    if (!Array.isArray(object)) {
      throw new Error('Array slice on non-array');
    }
    let start = 0;
    let step = 1;
    let end = object.length - 1;

    if (node.start) {
      const interval = this.visit(node.start);
      if (!(interval instanceof Interval)) {
        throw new Error('Slice indices must consist of intervals');
      }
      start = Number(interval.value.toBigInteger());
    }

    if (node.end) {
      const interval = this.visit(node.end);
      if (!(interval instanceof Interval)) {
        throw new Error('Slice indices must consist of intervals');
      }
      end = Number(interval.value.toBigInteger());
    }

    if (node.second) {
      const second = this.visit(node.second);
      if (!(second instanceof Interval)) {
        throw new Error('Slice indices must consist of intervals');
      }
      step = Number(second.value.toBigInteger()) - start;
    }
    if (step > 0) {
      if (start > end) {
        return [];
      }

      const result = [object[start]];
      let next = start + step;
      while (next <= end) {
        result.push(object[next]);
        next += step;
      }
      return result;
    } else if (step < 0) {
      if (start < end) {
        return [];
      }

      const result = [object[start]];
      let next = start + step;
      while (next >= end) {
        result.push(object[next]);
        next += step;
      }
      return result;
    }
    throw new Error('Slice step must not be zero');
  }

  visitUnaryExpression(node: UnaryExpression): Interval {
    const operand = this.visit(node.operand);
    if (node.operator === '!') {
      return sonicBool(!sonicTruth(operand));
    }
    if (!(operand instanceof Interval)) {
      throw new Error(`${node.operator} can only operate on intervals`);
    }
    if (node.uniform) {
      let value: TimeMonzo;
      let newNode = operand.node;
      switch (node.operator) {
        case '-':
          value = operand.value.neg();
          break;
        case '%':
        case '\u00F7':
          value = operand.value.inverse();
          newNode = uniformInvertNode(newNode);
          break;
        default:
          // The grammar shouldn't let you get here.
          throw new Error('Uniform operation not supported');
      }
      return new Interval(value, operand.domain, newNode);
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
      case '^':
        return operand.up();
      case '++':
        newValue = operand.add(linearOne());
        break;
      case '--':
        newValue = operand.sub(linearOne());
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

  visitBinaryExpression(node: BinaryExpression): SonicWeaveValue {
    const left = this.visit(node.left);
    if (node.operator === '??') {
      if (left !== undefined) {
        return left;
      }
      return this.visit(node.right);
    }
    if (node.operator === '||') {
      if (sonicTruth(left)) {
        return left;
      }
      return this.visit(node.right);
    }
    if (node.operator === '&&') {
      if (!sonicTruth(left)) {
        return left;
      }
      return this.visit(node.right);
    }
    const right = this.visit(node.right);
    if (node.operator === 'tns') {
      if (!Array.isArray(left) || !Array.isArray(right)) {
        throw new Error('Tensor product is only defined on arrays');
      }
      const result: any[] = [];
      if (node.preferLeft || node.preferRight) {
        for (const l of left) {
          const row: Interval[] = [];
          for (const r of right) {
            const value = l.value.mul(r.value);
            row.push(resolvePreference(value, l, r, node));
          }
          result.push(row);
        }
      } else {
        for (const l of left) {
          const row: Interval[] = [];
          for (const r of right) {
            row.push(l.mul(r));
          }
          result.push(row);
        }
      }
      return result;
    }
    if (left instanceof Interval && right instanceof Interval) {
      if (node.preferLeft || node.preferRight) {
        let value: TimeMonzo;
        switch (node.operator) {
          case '+':
            value = left.value.add(right.value);
            break;
          case '-':
            value = left.value.sub(right.value);
            break;
          case 'to':
            value = left.value.roundTo(right.value);
            break;
          case 'by':
            value = left.value.pitchRoundTo(right.value);
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
          case 'mod':
            value = left.value.mmod(right.value);
            break;
          case '·':
          case 'dot':
            value = left.dot(right).value;
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
        return resolvePreference(value, left, right, node);
      }
      switch (node.operator) {
        case '===':
          return sonicBool(left.strictEquals(right));
        case '!==':
          return sonicBool(!left.strictEquals(right));
        case '==':
          return sonicBool(left.equals(right));
        case '!=':
          return sonicBool(!left.equals(right));
        case '<=':
          return sonicBool(left.compare(right) <= 0);
        case '>=':
          return sonicBool(left.compare(right) >= 0);
        case '<':
          return sonicBool(left.compare(right) < 0);
        case '>':
          return sonicBool(left.compare(right) > 0);
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
        case 'mod':
          return left.mmod(right);
        case '·':
        case 'dot':
          return left.dot(right);
        case 'red':
          return left.reduce(right);
        default:
          throw new Error(`${node.operator} unimplemented`);
      }
    }
    switch (node.operator) {
      case '===':
        return sonicBool(left === right);
      case '!==':
        return sonicBool(left !== right);
      case '==':
        // eslint-disable-next-line eqeqeq
        return sonicBool(left == right);
      case '!=':
        // eslint-disable-next-line eqeqeq
        return sonicBool(left != right);
    }

    if (left instanceof Color || right instanceof Color) {
      throw new Error('Cannot operate on colors');
    }
    if (typeof left === 'function' || typeof right === 'function') {
      throw new Error('Cannot operate on functions');
    }
    if (Array.isArray(left)) {
      throw new Error('Cannot operate on arrays');
    }
    if (typeof left === 'string' || typeof right === 'string') {
      throw new Error('Cannot operate on strings');
    }
    if (left === undefined || right === undefined) {
      throw new Error('Cannot operate on nothing');
    }
    if (Array.isArray(right)) {
      switch (node.operator) {
        case 'of':
          return sonicBool(strictIncludes(left, right));
        case '!of':
          return sonicBool(!strictIncludes(left, right));
        case '~of':
          return sonicBool(includes(left, right));
        case '!~of':
          return sonicBool(!includes(left, right));
        default:
          throw new Error(`${node.operator} not supported with arrays`);
      }
    }
    throw new Error('Unhandled binary operation');
  }

  visitCallExpression(node: CallExpression) {
    if (node.callee.type === 'Identifier') {
      if (this.context.has(node.callee.id)) {
        const args = node.args.map(arg => this.visit(arg));
        return (this.context.get(node.callee.id) as Function).bind(this)(
          ...args
        );
      }
      throw new Error(`Reference error: ${node.callee.id} is not defined`);
    } else {
      const callee = this.visitArrayAccess(node.callee);
      const args = node.args.map(arg => this.visit(arg));
      return (callee as Function).bind(this)(...args);
    }
  }

  visitArrowFunction(node: ArrowFunction) {
    function realization(this: ExpressionVisitor, ...args: SonicWeaveValue[]) {
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
        parseFloat(`${node.whole}.${node.fractional}e${node.exponent ?? '0'}`)
      );
      return new Interval(value, 'linear', node);
    }
    let numerator = node.whole;
    let denominator = 1n;
    const exponent = node.exponent || 0n;
    if (exponent > 0) {
      numerator *= 10n ** exponent;
    } else if (exponent < 0) {
      denominator *= 10n ** -exponent;
    }
    for (const c of node.fractional) {
      numerator = 10n * numerator + BigInt(c);
      denominator *= 10n;
    }
    const value = TimeMonzo.fromBigNumeratorDenominator(numerator, denominator);
    return new Interval(value, 'linear', node);
  }

  visitCentsLiteral(node: CentsLiteral): Interval {
    let numerator: bigint | number = node.whole;
    let denominator: bigint | number = 1200n;
    for (const c of node.fractional) {
      numerator = 10n * numerator + BigInt(c);
      denominator *= 10n;
    }
    const factor = bigGcd(numerator, denominator);
    numerator = Number(numerator / factor);
    denominator = Number(denominator / factor);
    let value: TimeMonzo;
    try {
      value = new TimeMonzo(ZERO, [new Fraction(numerator, denominator)]);
    } catch {
      value = TimeMonzo.fromCents((1200 * numerator) / denominator);
    }
    return new Interval(value, 'logarithmic', node);
  }

  visitFractionLiteral(node: FractionLiteral): Interval {
    const value = TimeMonzo.fromBigNumeratorDenominator(
      node.numerator,
      node.denominator
    );
    return new Interval(value, 'linear', node);
  }

  visitNedoLiteral(node: NedjiLiteral): Interval {
    if (node.equaveNumerator !== undefined) {
      throw new Error('Unexpected nedji equave in AST');
    }
    const value = TimeMonzo.fromEqualTemperament(
      new Fraction(Number(node.numerator), Number(node.denominator))
    );
    return new Interval(value, 'logarithmic', node);
  }

  visitHertzLiteral(node: HertzLiteral): Interval {
    const value = TEN_MONZO.pow(metricExponent(node.prefix));
    value.timeExponent = NEGATIVE_ONE;
    return new Interval(value, 'linear', node);
  }

  visitSecondLiteral(node: SecondLiteral): Interval {
    const value = TEN_MONZO.pow(metricExponent(node.prefix));
    value.timeExponent = ONE;
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

    let step = linearOne();
    if (node.second) {
      const second = this.visit(node.second);
      if (!(second instanceof Interval)) {
        throw new Error('Ranges must consist of intervals');
      }
      step = second.sub(start);
    }
    if (step.value.residual.s > 0) {
      if (start.compare(end) > 0) {
        return [];
      }
      const result = [start];
      let next = start.add(step);
      while (next.compare(end) <= 0) {
        result.push(next);
        next = next.add(step);
      }
      return result;
    } else if (step.value.residual.s < 0) {
      if (start.compare(end) < 0) {
        return [];
      }
      const result = [start];
      let next = start.add(step);
      while (next.compare(end) >= 0) {
        result.push(next);
        next = next.add(step);
      }
      return result;
    }
    throw new Error('Range step must not be zero');
  }

  visitHarmonicSegment(node: HarmonicSegment): Interval[] {
    const root = this.visit(node.root);
    const end = this.visit(node.end);
    if (!(root instanceof Interval && end instanceof Interval)) {
      throw new Error('Harmonic segments must be built from intervals');
    }
    const one = linearOne();
    let next = root.add(one);
    const result: Interval[] = [];
    while (next.compare(end) <= 0) {
      result.push(next.div(root));
      next = next.add(one);
    }
    return result;
  }
}

export function parseAST(source: string): Program {
  return parse(source);
}

// Cached globally on first initialization.
let SOURCE_VISITOR: StatementVisitor | null = null;

function getSourceVisitor(includePrelude: boolean) {
  if (SOURCE_VISITOR) {
    return SOURCE_VISITOR.clone();
  } else {
    const visitor = new StatementVisitor();
    for (const [name, color] of CSS_COLOR_CONTEXT) {
      visitor.context.set(name, color);
    }
    for (const name in BUILTIN_CONTEXT) {
      const value = BUILTIN_CONTEXT[name];
      visitor.context.set(name, value);
    }

    if (includePrelude) {
      const prelude = parseAST(PRELUDE_SOURCE);
      for (const statement of prelude.body) {
        visitor.visit(statement);
      }
      SOURCE_VISITOR = visitor.clone();
      return visitor;
    } else {
      throw new Error('Sdtlib is mandatory for now');
    }
  }
}

export function evaluateSource(source: string, includePrelude = true) {
  const visitor = getSourceVisitor(includePrelude);

  const program = parseAST(source);
  for (const statement of program.body) {
    const interrupt = visitor.visit(statement);
    if (interrupt) {
      throw new Error('Illegal statement');
    }
  }
  if (!Array.isArray(visitor.context.get('$'))) {
    throw new Error('Context corruption detected');
  }
  return visitor;
}

export function evaluateExpression(
  source: string,
  includePrelude = true
): SonicWeaveValue {
  const visitor = getSourceVisitor(includePrelude);
  const program = parseAST(source);
  for (const statement of program.body.slice(0, -1)) {
    const interrupt = visitor.visit(statement);
    if (interrupt) {
      throw new Error('Illegal statement');
    }
  }
  const finalStatement = program.body[program.body.length - 1];
  if (finalStatement.type !== 'ExpressionStatement') {
    throw new Error(`Expected expression. Got ${finalStatement.type}`);
  }
  const subVisitor = new ExpressionVisitor(visitor.context);
  return subVisitor.visit(finalStatement.expression);
}
