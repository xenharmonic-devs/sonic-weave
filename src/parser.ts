import {Fraction} from 'xen-dev-utils';
import {
  NedjiLiteral,
  IntegerLiteral,
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
  StepLiteral,
  IntervalLiteral,
  PlusMinusVal,
} from './expression';
import {Interval, Color, timeMonzoAs, infect, log} from './interval';
import {TimeMonzo, Domain} from './monzo';
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
  SonicWeaveFunction,
  repr,
  compare,
} from './builtin';
import {bigGcd, metricExponent, ZERO, ONE, NEGATIVE_ONE, TWO} from './utils';
import {pythagoreanMonzo, absoluteMonzo} from './pythagorean';
import {inflect} from './fjs';
import {inferEquave, plusMinusToVal, wartsToVal} from './warts';
import {RootContext} from './context';
import {
  Argument,
  ArrayAccess,
  ArrayComprehension,
  ArrayLiteral,
  ArraySlice,
  ArrowFunction,
  AssignmentStatement,
  BinaryExpression,
  BlockStatement,
  CallExpression,
  ConditionalExpression,
  DownExpression,
  EnumeratedChord,
  Expression,
  ExpressionStatement,
  ForOfStatement,
  FunctionDeclaration,
  HarmonicSegment,
  Identifier,
  IfStatement,
  LabeledExpression,
  LiftDeclaration,
  NedjiProjection,
  PitchDeclaration,
  Program,
  Range,
  ReturnStatement,
  Statement,
  ThrowStatement,
  UnaryExpression,
  UpDeclaration,
  VariableDeclaration,
  WhileStatement,
} from './ast';

function strictIncludes(element: SonicWeaveValue, scale: SonicWeaveValue[]) {
  if (element instanceof Interval) {
    for (const existing of scale) {
      if (existing instanceof Interval && existing.strictEquals(element)) {
        return true;
      }
    }
    return false;
  }
  return scale.includes(element);
}

function includes(element: SonicWeaveValue, scale: SonicWeaveValue[]) {
  if (element instanceof Interval) {
    for (const existing of scale) {
      if (existing instanceof Interval && existing.equals(element)) {
        return true;
      }
    }
    return false;
  }
  return scale.includes(element);
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
  rootContext: RootContext;
  parent?: StatementVisitor;
  mutables: VisitorContext;
  immutables: VisitorContext;

  constructor(rootContext: RootContext, parent?: StatementVisitor) {
    this.rootContext = rootContext;
    this.parent = parent;
    this.mutables = new Map();
    this.mutables.set('$', []);
    this.immutables = new Map();
  }

  // TODO: Deep cloning
  clone() {
    const result = new StatementVisitor(this.rootContext);
    result.mutables = new Map(this.mutables);
    result.immutables = new Map(this.immutables);
    const scale = this.getCurrentScale();
    result.mutables.set('$', [...scale]);
    return result;
  }

  createExpressionVisitor() {
    return new ExpressionVisitor(this);
  }

  expand(defaults: StatementVisitor) {
    let base = this.rootContext.expand(defaults.rootContext);
    if (base) {
      base += '\n';
    }
    const variableLines: string[] = [];
    const r = repr.bind(this.createExpressionVisitor());
    for (const key of this.mutables.keys()) {
      if (key === '$' || key === '$$') {
        continue;
      }
      // TODO: Verify that nothing was changed.
      if (defaults.mutables.has(key)) {
        continue;
      }
      const value = r(this.mutables.get(key));
      if (value.startsWith('riff')) {
        const name = (this.mutables.get(key) as SonicWeaveFunction).name;
        variableLines.push(`let ${key} = ${name}`);
      } else {
        variableLines.push(`let ${key} = ${value}`);
      }
    }
    for (const key of this.immutables.keys()) {
      if (defaults.immutables.has(key)) {
        continue;
      }
      const value = r(this.immutables.get(key));
      if (value.startsWith('riff')) {
        if (value.includes('[native riff]')) {
          const name = (this.immutables.get(key) as SonicWeaveFunction).name;
          variableLines.push(`const ${key} = ${name}`);
        } else {
          variableLines.push(value);
        }
      } else {
        variableLines.push(`const ${key} = ${value}`);
      }
    }
    if (variableLines.length) {
      base += variableLines.join('\n') + '\n';
    }
    const scale = this.getCurrentScale();
    const scaleLines = scale.map(interval =>
      interval.toString(this.rootContext)
    );
    for (let i = 0; i < scaleLines.length; ++i) {
      if (scaleLines[i].startsWith('(') && scaleLines[i].endsWith(')')) {
        scaleLines[i] = scaleLines[i].slice(1, -1);
      }
    }
    return `${base}${scaleLines.join('\n')}`;
  }

  visit(node: Statement): Interupt | undefined {
    this.rootContext.spendGas();
    switch (node.type) {
      case 'VariableDeclaration':
        return this.visitVariableDeclaration(node);
      case 'AssignmentStatement':
        return this.visitAssignmentStatement(node);
      case 'ExpressionStatement':
        return this.visitExpression(node);
      case 'FunctionDeclaration':
        return this.visitFunctionDeclaration(node);
      case 'PitchDeclaration':
        return this.visitPitchDeclaration(node);
      case 'UpDeclaration':
        return this.visitUpDeclaration(node);
      case 'LiftDeclaration':
        return this.visitLiftDeclaration(node);
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
      const subVisitor = this.createExpressionVisitor();
      value = subVisitor.visit(node.argument);
    }
    return new Interupt(node, value);
  }

  visitThrowStatement(node: ThrowStatement) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.argument);
    if (typeof value === 'string') {
      throw new Error(value);
    }
    throw value;
  }

  visitVariableDeclaration(node: VariableDeclaration) {
    const subVisitor = this.createExpressionVisitor();
    const value = node.value ? subVisitor.visit(node.value) : undefined;
    if (node.name.type === 'Parameters') {
      if (!Array.isArray(value)) {
        throw new Error('Destructuring declaration must assign an array.');
      }
      for (let i = 0; i < node.name.identifiers.length; ++i) {
        const name = node.name.identifiers[i].id;
        if (this.immutables.has(name) || this.mutables.has(name)) {
          throw new Error('Cannot redeclare variable.');
        }
        if (node.mutable) {
          this.mutables.set(name, value[i]);
        } else {
          this.immutables.set(name, value[i]);
        }
      }
      if (node.name.rest) {
        const name = node.name.rest.id;
        if (this.immutables.has(name) || this.mutables.has(name)) {
          throw new Error('Cannot redeclare variable.');
        }
        if (node.mutable) {
          this.mutables.set(name, value.slice(node.name.identifiers.length));
        } else {
          this.immutables.set(name, value.slice(node.name.identifiers.length));
        }
      }
    } else {
      const name = node.name.id;
      if (this.immutables.has(name) || this.mutables.has(name)) {
        throw new Error('Cannot redeclare variable.');
      }
      if (node.mutable) {
        this.mutables.set(name, value);
      } else {
        this.immutables.set(name, value);
      }
    }
    return undefined;
  }

  visitAssignmentStatement(node: AssignmentStatement) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.value);
    if (node.name.type === 'Parameters') {
      if (!Array.isArray(value)) {
        throw new Error('Destructuring assignment must use an array.');
      }
      for (let i = 0; i < node.name.identifiers.length; ++i) {
        const name = node.name.identifiers[i].id;
        this.set(name, value[i]);
      }
      if (node.name.rest) {
        const name = node.name.rest.id;
        this.set(name, value.slice(node.name.identifiers.length));
      }
    } else if (node.name.type === 'Identifier') {
      const name = node.name.id;
      if (this.immutables.has(name)) {
        throw new Error('Assignment to a constant variable.');
      }
      this.set(name, value);
    } else if (node.name.type === 'ArraySlice') {
      if (!Array.isArray(value)) {
        throw new Error('Slice assignment with a non-array.');
      }
      const object = subVisitor.visit(node.name.object);
      if (!Array.isArray(object)) {
        throw new Error('Array slice on non-array.');
      }
      let start = 0;
      let step = 1;
      let end = object.length - 1;

      if (node.name.start) {
        const interval = subVisitor.visit(node.name.start);
        if (!(interval instanceof Interval)) {
          throw new Error('Slice indices must consist of intervals.');
        }
        start = Number(interval.value.toBigInteger());
      }

      if (node.name.end) {
        const interval = subVisitor.visit(node.name.end);
        if (!(interval instanceof Interval)) {
          throw new Error('Slice indices must consist of intervals.');
        }
        end = Number(interval.value.toBigInteger());
      }

      if (node.name.second) {
        const second = subVisitor.visit(node.name.second);
        if (!(second instanceof Interval)) {
          throw new Error('Slice indices must consist of intervals.');
        }
        step = Number(second.value.toBigInteger()) - start;
      }

      let i = 0;
      if (step > 0) {
        if (start > end) {
          throw new Error('Invalid slice assignment.');
        }

        object[start] = value[i++];
        let next = start + step;
        while (next <= end) {
          object[next] = value[i++];
          next += step;
        }
        object.splice(end, 0, ...value.slice(i));
        // TODO: Add support for niente arrays.
        object.splice(0, object.length, ...object.filter(x => x !== undefined));
        return undefined;
      } else if (step < 0) {
        if (start < end) {
          throw new Error('Invalid slice assignment.');
        }

        object[start] = value[i++];
        let next = start + step;
        while (next >= end) {
          object[next] = value[i++];
          next += step;
        }
        const rest = value.slice(i);
        rest.reverse();
        object.splice(end, 0, ...rest);
        // TODO: Add support for niente arrays.
        object.splice(0, object.length, ...object.filter(x => x !== undefined));
        return undefined;
      }
      throw new Error('Slice step must not be zero');
    } else {
      const object = subVisitor.visit(node.name.object);
      if (!Array.isArray(object)) {
        throw new Error('Array access on non-array.');
      }
      const index = subVisitor.visit(node.name.index);
      if (!(index instanceof Interval)) {
        throw new Error('Array access with a non-integer.');
      }
      let i = index.toInteger();
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

    const subVisitor = this.createExpressionVisitor();

    if (node.left.type === 'AbsoluteFJS') {
      const value = subVisitor.visit(node.middle ?? node.right);
      if (!(value instanceof Interval)) {
        throw new Error('Pitch declaration must evaluate to an interval');
      }

      const pitch = subVisitor.visit(node.left) as Interval;

      const C4: TimeMonzo = this.rootContext.C4;

      this.rootContext.C4 = C4.mul(value.value).div(pitch.value);
      if (!node.middle) {
        // Implicit 1/1
        if (value.value.timeExponent.n) {
          const absolute = value.value;
          this.rootContext.unisonFrequency = absolute.pow(
            absolute.timeExponent.inverse().neg()
          );
        }
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
    this.rootContext.unisonFrequency = absolute
      .pow(absolute.timeExponent.inverse().neg())
      .div(relative);
    return undefined;
  }

  visitUpDeclaration(node: UpDeclaration) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.value);
    if (!(value instanceof Interval)) {
      throw new Error('Up declaration must evaluate to an interval');
    }
    this.rootContext.up = value.value;
    return undefined;
  }

  visitLiftDeclaration(node: LiftDeclaration) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.value);
    if (!(value instanceof Interval)) {
      throw new Error('Lift declaration must evaluate to an interval');
    }
    this.rootContext.lift = value.value;
    return undefined;
  }

  visitExpression(node: ExpressionStatement) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.expression);
    this.handleValue(value, subVisitor);
    return undefined;
  }

  handleValue(value: SonicWeaveValue, subVisitor: ExpressionVisitor) {
    const scale = this.getCurrentScale();
    if (value instanceof Color) {
      if (scale.length) {
        scale[scale.length - 1] = scale[scale.length - 1].shallowClone();
        scale[scale.length - 1].color = value;
      }
    } else if (value instanceof Interval) {
      if (value.domain === 'cologarithmic') {
        let divisions = value.value.primeExponents[0];
        let equave = new Fraction(2);
        let equaveNumerator: number | null = null;
        let equaveDenominator: number | null = null;
        if (value?.node?.type === 'WartsLiteral') {
          divisions = new Fraction(value.node.divisions);
          const equave_ = inferEquave(value.node);
          if (!equave_) {
            throw new Error('Invalid warts equave');
          }
          equave = equave_;
        } else if (value.node?.type === 'PlusMinusVal') {
          divisions = new Fraction(value.node.divisions);
          if (value.node.equave) {
            equave = new Fraction(value.node.equave);
          }
        }
        if (equave.compare(TWO)) {
          equaveNumerator = equave.n;
          if (equave.d !== 1) {
            equaveDenominator = equave.d;
          }
        }
        const step = new Interval(
          TimeMonzo.fromFraction(equave).pow(divisions.inverse()),
          'logarithmic',
          {
            type: 'NedjiLiteral',
            numerator: divisions.d,
            denominator: divisions.n,
            equaveNumerator,
            equaveDenominator,
          }
        );
        const rl = relog.bind(subVisitor);
        const mapped = scale.map(i =>
          rl(i)
            .dot(value as Interval)
            .mul(step)
        );
        for (let i = 0; i < scale.length; ++i) {
          mapped[i].color = scale[i].color;
          mapped[i].label = scale[i].label;
        }
        scale.length = 0;
        scale.push(...mapped);
      } else {
        scale.push(value);
      }
    } else if (Array.isArray(value)) {
      scale.push(...this.flattenArray(value));
    } else if (value === undefined) {
      /* Do nothing */
    } else if (typeof value === 'string') {
      if (scale.length) {
        scale[scale.length - 1] = scale[scale.length - 1].shallowClone();
        scale[scale.length - 1].label = value;
      } else {
        this.rootContext.title = value;
      }
    } else {
      this.rootContext.spendGas(scale.length);
      const bound = value.bind(subVisitor);
      const mapped = scale.map(i => bound(i));
      scale.length = 0;
      scale.push(...mapped);
    }
  }

  flattenArray(value: any): Interval[] {
    const result: any[] = [];
    for (const subvalue of value) {
      if (Array.isArray(subvalue)) {
        result.push(...this.flattenArray(subvalue));
      } else if (subvalue instanceof Interval) {
        result.push(subvalue);
      } else if (result.length) {
        if (subvalue instanceof Color) {
          result[result.length - 1] = result[result.length - 1].shallowClone();
          result[result.length - 1].color = subvalue;
        } else if (typeof subvalue === 'string') {
          result[result.length - 1] = result[result.length - 1].shallowClone();
          result[result.length - 1].label = subvalue;
        }
      }
    }
    return result;
  }

  visitBlockStatement(node: BlockStatement) {
    const subVisitor = new StatementVisitor(this.rootContext, this);
    const scale = this.getCurrentScale();
    subVisitor.mutables.set('$$', scale);
    for (const statement of node.body) {
      const interrupt = subVisitor.visit(statement);
      if (interrupt) {
        return interrupt;
      }
    }
    const subScale = subVisitor.getCurrentScale();
    scale.push(...subScale);
    return undefined;
  }

  visitWhileStatement(node: WhileStatement) {
    const subVisitor = this.createExpressionVisitor();
    while (sonicTruth(subVisitor.visit(node.test))) {
      const interrupt = this.visit(node.body);
      if (interrupt) {
        return interrupt;
      }
    }
    return undefined;
  }

  visitForOfStatement(node: ForOfStatement) {
    const subVisitor = this.createExpressionVisitor();
    const array = subVisitor.visit(node.array);
    if (!Array.isArray(array)) {
      throw new Error('Can only iterate over arrays.');
    }
    const loopVisitor = new StatementVisitor(this.rootContext, this);
    loopVisitor.mutables.delete('$'); // Collapse scope
    for (const value of array) {
      if (node.element.type === 'Parameters') {
        if (!Array.isArray(value)) {
          throw new Error('Must iterate over arrays when destructuring.');
        }
        for (let i = 0; i < node.element.identifiers.length; ++i) {
          const name = node.element.identifiers[i].id;
          if (node.mutable) {
            loopVisitor.mutables.set(name, value[i]);
          } else {
            // Technically a mutation, but should be fine.
            loopVisitor.immutables.set(name, value[i]);
          }
        }
        if (node.element.rest) {
          const name = node.element.rest.id;
          if (node.mutable) {
            loopVisitor.mutables.set(
              name,
              value.slice(node.element.identifiers.length)
            );
          } else {
            loopVisitor.immutables.set(
              name,
              value.slice(node.element.identifiers.length)
            );
          }
        }
      } else {
        const name = node.element.id;
        if (node.mutable) {
          loopVisitor.mutables.set(name, value);
        } else {
          loopVisitor.immutables.set(name, value);
        }
      }
      const interrupt = loopVisitor.visit(node.body);
      if (interrupt) {
        return interrupt;
      }
    }
    return undefined;
  }

  visitIfStatement(node: IfStatement) {
    const subVisitor = this.createExpressionVisitor();
    if (sonicTruth(subVisitor.visit(node.test))) {
      return this.visit(node.consequent);
    }
    if (node.alternate) {
      return this.visit(node.alternate);
    }
    return undefined;
  }

  visitFunctionDeclaration(node: FunctionDeclaration) {
    // Extract docstring
    node = {...node};
    node.body = [...node.body];
    let docstring: string | undefined = undefined;
    if (
      node.body.length &&
      node.body[0].type === 'ExpressionStatement' &&
      node.body[0].expression.type === 'StringLiteral'
    ) {
      docstring = node.body[0].expression.value;
      node.body.shift();
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const scopeParent = this;

    function realization(this: ExpressionVisitor, ...args: SonicWeaveValue[]) {
      const localVisitor = new StatementVisitor(
        scopeParent.rootContext,
        scopeParent
      );
      localVisitor.mutables.set('$$', this.parent.getCurrentScale());

      for (let i = 0; i < node.parameters.identifiers.length; ++i) {
        const name = node.parameters.identifiers[i].id;
        if (i < args.length) {
          localVisitor.mutables.set(name, args[i]);
        } else {
          localVisitor.mutables.set(name, undefined);
        }
      }
      if (node.parameters.rest) {
        const name = node.parameters.rest.id;
        // XXX: Poor type system gets abused again.
        localVisitor.mutables.set(
          name,
          args.slice(node.parameters.identifiers.length) as Interval[]
        );
      }
      for (const statement of node.body) {
        const interrupt = localVisitor.visit(statement);
        if (interrupt && interrupt.node.type === 'ReturnStatement') {
          return interrupt.value;
        }
      }
      return localVisitor.getCurrentScale();
    }
    Object.defineProperty(realization, 'name', {
      value: node.name.id,
      enumerable: false,
    });
    realization.__doc__ = docstring;
    realization.__node__ = node;
    this.immutables.set(node.name.id, realization);
    return undefined;
  }

  get(name: string) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let parent: StatementVisitor | undefined = this;
    while (parent) {
      if (parent.immutables.has(name)) {
        return parent.immutables.get(name)!;
      }
      if (parent.mutables.has(name)) {
        return parent.mutables.get(name)!;
      }
      parent = parent.parent;
    }
    throw new Error(`Undeclared variable ${name}`);
  }

  set(name: string, value: SonicWeaveValue) {
    if (this.immutables.has(name)) {
      throw new Error('Assignment to a constant variable.');
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let parent: StatementVisitor | undefined = this;
    while (parent) {
      if (parent.mutables.has(name)) {
        parent.mutables.set(name, value);
        return;
      }
      parent = parent.parent;
    }
    throw new Error('Assignment to an undeclared variable.');
  }

  getCurrentScale(): Interval[] {
    const result = this.get('$') as Interval[];
    if (!Array.isArray(result)) {
      throw new Error('Context corruption detected.');
    }
    return result;
  }
}

const TEN_MONZO = new TimeMonzo(ZERO, [ONE, ZERO, ONE]);
const CENT_MONZO = new TimeMonzo(ZERO, [new Fraction(1, 1200)]);
const RECIPROCAL_CENT_MONZO = new TimeMonzo(ZERO, [new Fraction(1200)]);

function typesCompatible(
  a: IntervalLiteral | undefined,
  b: IntervalLiteral | undefined
) {
  if (a?.type === b?.type) {
    return true;
  }
  if (a?.type === 'FJS' && b?.type === 'AspiringFJS') {
    return true;
  }
  if (b?.type === 'FJS' && a?.type === 'AspiringFJS') {
    return true;
  }
  return false;
}

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
    let resolvedNode: IntervalLiteral | undefined = undefined;
    if (typesCompatible(left.node, right.node)) {
      resolvedNode = timeMonzoAs(value, left.node);
    }
    return new Interval(value, domain, resolvedNode, infect(left, right));
  }
  if (node.preferLeft) {
    return new Interval(
      value,
      left.domain,
      timeMonzoAs(value, left.node),
      left
    );
  }
  return new Interval(
    value,
    right.domain,
    timeMonzoAs(value, right.node),
    right
  );
}

export class ExpressionVisitor {
  parent: StatementVisitor;

  constructor(parent: StatementVisitor) {
    this.parent = parent;
  }

  get rootContext() {
    return this.parent.rootContext;
  }

  getCurrentScale() {
    return this.parent.getCurrentScale();
  }

  visit(node: Expression): SonicWeaveValue {
    this.rootContext.spendGas();
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
      case 'NedjiLiteral':
        return this.visitNedjiLiteral(node);
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
      case 'PlusMinusVal':
        return this.visitPlusMinusVal(node);
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
        return this.visitArrayLiteral(node);
      case 'StringLiteral':
        return node.value;
      case 'NoneLiteral':
        return undefined;
      case 'DownExpression':
        return this.visitDownExpression(node);
      case 'StepLiteral':
        return this.visitStepLiteral(node);
      case 'RadicalLiteral':
        throw new Error('Unexpected radical literal');
      case 'AspiringFJS':
        throw new Error('Unexpected aspiring FJS');
      case 'AspiringAbsoluteFJS':
        throw new Error('Unexpected aspiring absolute FJS');
      case 'ArrayComprehension':
        return this.visitArrayComprehension(node);
    }
    node satisfies never;
  }

  visitArrayComprehension(node: ArrayComprehension) {
    const array = this.visit(node.array);
    if (!Array.isArray(array)) {
      throw new Error('Can only iterate over arrays.');
    }
    const result: Interval[] = [];
    const localVisitor = new StatementVisitor(this.rootContext, this.parent);
    localVisitor.mutables.delete('$'); // Collapse scope
    const localSubvisitor = localVisitor.createExpressionVisitor();
    for (const value of array) {
      if (node.element.type === 'Parameters') {
        if (!Array.isArray(value)) {
          throw new Error('Must iterate over arrays when destructuring.');
        }
        for (let i = 0; i < node.element.identifiers.length; ++i) {
          const name = node.element.identifiers[i].id;
          localVisitor.mutables.set(name, value[i]);
        }
        if (node.element.rest) {
          const name = node.element.rest.id;
          this.parent.mutables.set(
            name,
            value.slice(node.element.identifiers.length)
          );
        }
      } else {
        const name = node.element.id;
        localVisitor.mutables.set(name, value);
      }
      result.push(localSubvisitor.visit(node.expression) as Interval);
    }
    return result;
  }

  spread(args: Argument[]): Interval[] {
    const result: Interval[] = [];
    for (const arg of args) {
      if (arg.spread) {
        result.push(...(this.visit(arg.expression) as Interval[]));
      } else {
        result.push(this.visit(arg.expression) as Interval);
      }
    }
    return result;
  }

  // We cheat here to simplify the type hierarchy definition (no nested arrays).
  visitArrayLiteral(node: ArrayLiteral): Interval[] {
    return this.spread(node.elements);
  }

  visitStepLiteral(node: StepLiteral) {
    const value = new TimeMonzo(ZERO, [], undefined, Number(node.count));
    return new Interval(value, 'logarithmic', node);
  }

  visitDownExpression(node: DownExpression) {
    const operand = this.visit(node.operand);
    if (!(operand instanceof Interval)) {
      throw new Error('Can only apply down arrows to intervals');
    }
    return operand.down(this.rootContext);
  }

  visitLabeledExpression(node: LabeledExpression) {
    let object = this.visit(node.object);
    if (!(object instanceof Interval)) {
      throw new Error('Labels can only be applied to intervals');
    }
    object = object.shallowClone();
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

  up(monzo: TimeMonzo, node: MonzoLiteral | ValLiteral | FJS | AbsoluteFJS) {
    return monzo.mul(this.rootContext.up.pow(node.ups));
  }

  visitMonzoLiteral(node: MonzoLiteral) {
    const primeExponents = node.components.map(this.visitComponent);
    const value = this.up(new TimeMonzo(ZERO, primeExponents), node);
    const result = new Interval(value, 'logarithmic', node);
    if (node.ups) {
      this.rootContext.fragiles.push(result);
    }
    return result;
  }

  visitValLiteral(node: ValLiteral) {
    const primeExponents = node.components.map(this.visitComponent);
    const value = this.up(new TimeMonzo(ZERO, primeExponents), node);
    const result = new Interval(value, 'cologarithmic', node);
    if (node.ups) {
      this.rootContext.fragiles.push(result);
    }
    return result;
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
    return new Interval(val, 'cologarithmic', node);
  }

  visitPlusMinusVal(node: PlusMinusVal) {
    const val = plusMinusToVal(node);
    return new Interval(val, 'cologarithmic', node);
  }

  visitFJS(node: FJS) {
    const monzo = inflect(
      pythagoreanMonzo(node.pythagorean),
      node.superscripts,
      node.subscripts
    );
    const result = new Interval(this.up(monzo, node), 'logarithmic', node);
    this.rootContext.fragiles.push(result);
    return result;
  }

  visitAbsoluteFJS(node: AbsoluteFJS) {
    const relativeToC4 = inflect(
      absoluteMonzo(node.pitch),
      node.superscripts,
      node.subscripts
    );
    const result = new Interval(
      this.rootContext.C4.mul(this.up(relativeToC4, node)),
      'logarithmic',
      node
    );
    this.rootContext.fragiles.push(result);
    return result;
  }

  visitArrayAccess(node: ArrayAccess): SonicWeaveValue {
    const object = this.visit(node.object);
    if (!Array.isArray(object) && typeof object !== 'string') {
      throw new Error('Array access on non-array.');
    }
    const index = this.visit(node.index);
    if (!(index instanceof Interval)) {
      throw new Error('Array access with a non-integer.');
    }
    let i = index.toInteger();
    if (i < 0) {
      i += object.length;
    }
    if (i < 0 || i >= object.length) {
      throw new Error('Index out of range.');
    }
    return object[i];
  }

  visitArraySlice(node: ArraySlice): Interval[] | string {
    const object = this.visit(node.object);
    if (!Array.isArray(object) && typeof object !== 'string') {
      throw new Error('Array slice on non-array');
    }

    const empty = typeof object === 'string' ? '' : [];

    if (!object.length) {
      return empty;
    }

    let start = 0;
    let step = 1;
    let end = -1;

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

    if (start < 0) {
      start += object.length;
    }
    if (end < 0) {
      end += object.length;
    }

    if (step > 0) {
      start = Math.max(0, start);
      if (start > end || start >= object.length) {
        return empty;
      }
      end = Math.min(object.length - 1, end);

      const result = [object[start]];
      let next = start + step;
      while (next <= end) {
        result.push(object[next]);
        next += step;
      }
      if (typeof object === 'string') {
        return result.join('');
      }
      return result as Interval[];
    } else if (step < 0) {
      start = Math.min(object.length - 1, start);
      if (start < end || start < 0) {
        return empty;
      }
      end = Math.max(0, end);

      const result = [object[start]];
      let next = start + step;
      while (next >= end) {
        result.push(object[next]);
        next += step;
      }
      if (typeof object === 'string') {
        return result.join('');
      }
      return result as Interval[];
    }
    throw new Error('Slice step must not be zero');
  }

  visitUnaryExpression(node: UnaryExpression): Interval {
    const operand = this.visit(node.operand);
    if (node.operator === 'not') {
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
      return new Interval(value, operand.domain, newNode, operand);
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
        return operand.up(this.rootContext);
      case '/':
        return operand.lift(this.rootContext);
      case '\\':
        return operand.drop(this.rootContext);
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
    const name = node.operand.id;
    this.parent.set(name, newValue);
    if (node.prefix) {
      return newValue;
    }
    return operand;
  }

  visitBinaryExpression(node: BinaryExpression): SonicWeaveValue {
    const operator = node.operator;
    const left = this.visit(node.left);
    if (operator === '??') {
      if (left !== undefined) {
        return left;
      }
      return this.visit(node.right);
    }
    if (operator === 'or') {
      if (sonicTruth(left)) {
        return left;
      }
      return this.visit(node.right);
    }
    if (operator === 'and') {
      if (!sonicTruth(left)) {
        return left;
      }
      return this.visit(node.right);
    }
    const right = this.visit(node.right);
    if (operator === 'tns' || operator === '⊗') {
      if (!Array.isArray(left) || !Array.isArray(right)) {
        throw new Error('Tensor product is only defined on arrays');
      }
      this.rootContext.spendGas(left.length * right.length);
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
    if (
      operator === 'of' ||
      operator === 'not of' ||
      operator === '~of' ||
      operator === 'not ~of'
    ) {
      if (Array.isArray(right)) {
        switch (operator) {
          case 'of':
            return sonicBool(strictIncludes(left, right));
          case 'not of':
            return sonicBool(!strictIncludes(left, right));
          case '~of':
            return sonicBool(includes(left, right));
          case 'not ~of':
            return sonicBool(!includes(left, right));
        }
      } else {
        throw new Error("Target of 'of' must be an array");
      }
      operator satisfies never;
    }
    if (left instanceof Interval && right instanceof Interval) {
      if (node.preferLeft || node.preferRight) {
        let value: TimeMonzo;
        switch (operator) {
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
          case 'rd':
            value = left.value.reduce(right.value);
            break;
          case 'rdc':
            value = left.value.reduce(right.value, true);
            break;
          case '^':
            value = left.value.pow(right.value);
            break;
          case '/^':
            value = left.value.pow(right.value.inverse());
            break;
          case 'mod':
            value = left.value.mmod(right.value);
            break;
          case 'modc':
            value = left.value.mmod(right.value, true);
            break;
          case '·':
          case 'dot':
            value = left.dot(right).value;
            break;
          case '/_':
            value = log(left, right);
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
      switch (operator) {
        case '===':
          return sonicBool(left.strictEquals(right));
        case '!==':
          return sonicBool(!left.strictEquals(right));
        case '==':
          return sonicBool(left.equals(right));
        case '!=':
          return sonicBool(!left.equals(right));
        case '<=':
          return sonicBool(compare.bind(this)(left, right) <= 0);
        case '>=':
          return sonicBool(compare.bind(this)(left, right) >= 0);
        case '<':
          return sonicBool(compare.bind(this)(left, right) < 0);
        case '>':
          return sonicBool(compare.bind(this)(left, right) > 0);
        case '+':
          return left.add(right);
        case '-':
          return left.sub(right);
        case '×':
        case '*':
        case ' ':
          return left.mul(right);
        case '÷':
        case '%':
          return left.div(right);
        case '^':
          return left.pow(right);
        case '/^':
          return left.ipow(right);
        case '/_':
          return left.log(right);
        case '\\':
          return left.backslash(right);
        case 'mod':
          return left.mmod(right);
        case 'modc':
          return left.mmod(right, true);
        case '·':
        case 'dot':
          return left.dot(right);
        case 'rd':
          return left.reduce(right);
        case 'rdc':
          return left.reduce(right, true);
        case 'to':
          return left.roundTo(right);
        case 'by':
          return left.pitchRoundTo(right);
      }
      operator satisfies never;
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
    if (Array.isArray(left) || Array.isArray(right)) {
      throw new Error('Cannot operate on arrays');
    }
    if (typeof left === 'string' || typeof right === 'string') {
      throw new Error('Cannot operate on strings');
    }
    if (left === undefined || right === undefined) {
      throw new Error('Cannot operate on nothing');
    }
    throw new Error('Unhandled binary operation');
  }

  visitCallExpression(node: CallExpression) {
    const args = this.spread(node.args);
    if (node.callee.type === 'Identifier') {
      const callee = this.parent.get(node.callee.id) as SonicWeaveFunction;
      return callee.bind(this)(...args);
    } else if (node.callee.type === 'ArraySlice') {
      throw new Error('Cannot call array slices.');
    } else {
      const callee = this.visitArrayAccess(node.callee);
      return (callee as SonicWeaveFunction).bind(this)(...args);
    }
  }

  visitArrowFunction(node: ArrowFunction) {
    const scopeParent = this.parent;
    function realization(this: ExpressionVisitor, ...args: SonicWeaveValue[]) {
      const localVisitor = new StatementVisitor(
        scopeParent.rootContext,
        scopeParent
      );

      // Manipulate immediate scope
      localVisitor.mutables.set('$', this.get('$'));
      if (this.parent.mutables.has('$$')) {
        localVisitor.mutables.set('$$', this.get('$$'));
      }

      for (let i = 0; i < node.parameters.identifiers.length; ++i) {
        const name = node.parameters.identifiers[i].id;
        if (i < args.length) {
          localVisitor.mutables.set(name, args[i]);
        } else {
          localVisitor.mutables.set(name, undefined);
        }
      }
      if (node.parameters.rest) {
        const name = node.parameters.rest.id;
        localVisitor.mutables.set(
          name,
          args.slice(node.parameters.identifiers.length) as Interval[]
        );
      }
      return localVisitor.createExpressionVisitor().visit(node.expression);
    }
    Object.defineProperty(realization, 'name', {
      value: '(lambda)',
      enumerable: false,
    });
    realization.__doc__ = undefined;
    realization.__node__ = node;
    return realization as SonicWeaveFunction;
  }

  visitIntegerLiteral(node: IntegerLiteral): Interval {
    const value = TimeMonzo.fromBigInt(node.value);
    return new Interval(value, 'linear', node);
  }

  visitDecimalLiteral(node: DecimalLiteral): Interval {
    if (node.flavor === 'r') {
      const value = TimeMonzo.fromValue(
        parseFloat(`${node.whole}.${node.fractional}e${node.exponent ?? '0'}`)
      );
      return new Interval(value, 'linear', node);
    }
    let numerator = node.whole;
    let denominator = 1n;
    const exponent = BigInt(node.exponent || 0);
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
    if (node.flavor === 'z') {
      value.timeExponent = NEGATIVE_ONE;
    }
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

  visitNedjiLiteral(node: NedjiLiteral): Interval {
    let value: TimeMonzo;
    const fractionOfEquave = new Fraction(node.numerator, node.denominator);
    if (node.equaveNumerator !== null) {
      value = TimeMonzo.fromEqualTemperament(
        fractionOfEquave,
        new Fraction(node.equaveNumerator, node.equaveDenominator ?? undefined)
      );
    } else {
      value = TimeMonzo.fromEqualTemperament(fractionOfEquave);
    }
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

  visitIdentifier(node: Identifier): SonicWeaveValue {
    return this.parent.get(node.id);
  }

  visitEnumeratedChord(node: EnumeratedChord): Interval[] {
    const intervals: Interval[] = [];
    const domains: Domain[] = [];
    const monzos: TimeMonzo[] = [];
    for (const expression of node.intervals) {
      const interval = this.visit(expression);
      if (interval instanceof Interval) {
        intervals.push(interval);
        monzos.push(interval.value);
        domains.push(interval.domain);
      } else {
        throw new Error('Type error: Can only stack intervals in a chord');
      }
    }
    const rootInterval = intervals.shift()!;
    const rootDomain = domains.shift()!;
    const root = monzos.shift()!;
    const result: Interval[] = [];
    for (let i = 0; i < monzos.length; ++i) {
      if (rootDomain === 'linear' && domains[i] === 'linear') {
        result.push(
          node.mirror
            ? intervals[i].ldiv(rootInterval)
            : intervals[i].div(rootInterval)
        );
      } else {
        result.push(
          new Interval(
            node.mirror ? root.div(monzos[i]) : monzos[i].div(root),
            domains[i],
            undefined,
            infect(intervals[i], rootInterval)
          )
        );
      }
    }
    return result;
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
    if (step.value.residual.s !== 0) {
      this.rootContext.spendGas(
        Math.abs(
          (end.value.valueOf() - start.value.valueOf()) / step.value.valueOf()
        )
      );
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
    this.rootContext.spendGas(
      Math.abs(end.value.valueOf() - root.value.valueOf())
    );
    const one = linearOne();
    const result: Interval[] = [];
    if (root.compare(end) <= 0) {
      let next = root.add(one);
      while (next.compare(end) <= 0) {
        result.push(node.mirror ? root.div(next) : next.div(root));
        next = next.add(one);
      }
    } else {
      let next = root.sub(one);
      while (next.compare(end) >= 0) {
        result.push(node.mirror ? root.div(next) : next.div(root));
        next = next.sub(one);
      }
    }
    return result;
  }

  get(name: string) {
    return this.parent.get(name);
  }
}

export function parseAST(source: string): Program {
  return parse(source);
}

// Cached globally on first initialization.
let SOURCE_VISITOR_WITH_PRELUDE: StatementVisitor | null = null;
let SOURCE_VISITOR_NO_PRELUDE: StatementVisitor | null = null;

export function getSourceVisitor(includePrelude = true) {
  const rootContext = new RootContext();
  if (includePrelude && SOURCE_VISITOR_WITH_PRELUDE) {
    const visitor = SOURCE_VISITOR_WITH_PRELUDE.clone();
    visitor.rootContext = rootContext;
    return visitor;
  } else if (!includePrelude && SOURCE_VISITOR_NO_PRELUDE) {
    const visitor = SOURCE_VISITOR_NO_PRELUDE.clone();
    visitor.rootContext = rootContext;
    return visitor;
  } else {
    const visitor = new StatementVisitor(rootContext);
    for (const [name, color] of CSS_COLOR_CONTEXT) {
      visitor.immutables.set(name, color);
    }
    for (const name in BUILTIN_CONTEXT) {
      const value = BUILTIN_CONTEXT[name];
      visitor.immutables.set(name, value);
    }

    if (includePrelude) {
      const prelude = parseAST(PRELUDE_SOURCE);
      for (const statement of prelude.body) {
        visitor.visit(statement);
      }
      SOURCE_VISITOR_WITH_PRELUDE = visitor.clone();
      return visitor;
    } else {
      SOURCE_VISITOR_NO_PRELUDE = visitor.clone();
      return visitor;
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
  const subVisitor = visitor.createExpressionVisitor();
  return subVisitor.visit(finalStatement.expression);
}
