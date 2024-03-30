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
  SparseOffsetVal,
  SquareSuperparticular,
} from './expression';
import {
  Interval,
  Color,
  timeMonzoAs,
  infect,
  log,
  Val,
  IntervalDomain,
} from './interval';
import {TimeMonzo} from './monzo';
import {parse} from './sonic-weave-ast';
import {CSS_COLOR_CONTEXT} from './css-colors';
import {
  SonicWeaveValue,
  sonicTruth,
  BUILTIN_CONTEXT,
  PRELUDE_SOURCE,
  relative,
  linearOne,
  SonicWeaveFunction,
  repr,
  compare,
  PRELUDE_VOLATILES,
  maximum,
  minimum,
  upcastBool,
} from './builtin';
import {bigGcd, metricExponent, ZERO, ONE, NEGATIVE_ONE, TWO} from './utils';
import {pythagoreanMonzo, absoluteMonzo} from './pythagorean';
import {inflect} from './fjs';
import {
  inferEquave,
  parseSubgroup,
  sparseOffsetToVal,
  valToTimeMonzo,
  wartsToVal,
} from './warts';
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
  BreakStatement,
  CallExpression,
  ConditionalExpression,
  ContinueStatement,
  DownExpression,
  EnumeratedChord,
  Expression,
  ExpressionStatement,
  ForOfStatement,
  FunctionDeclaration,
  HarmonicSegment,
  Identifier,
  Identifiers,
  IfStatement,
  LabeledExpression,
  LestExpression,
  LiftDeclaration,
  NedjiProjection,
  Parameter,
  Parameters_,
  PitchDeclaration,
  Program,
  Range,
  ReturnStatement,
  Statement,
  ThrowStatement,
  TryStatement,
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

export class Interrupt {
  node: ReturnStatement | BreakStatement | ContinueStatement;
  value?: SonicWeaveValue;
  constructor(
    node: ReturnStatement | BreakStatement | ContinueStatement,
    value?: SonicWeaveValue
  ) {
    this.node = node;
    this.value = value;
  }

  get type() {
    return this.node.type;
  }
}

function localAssign(
  localVisitor: StatementVisitor,
  subVisitor: ExpressionVisitor,
  name: Parameter | Parameters_,
  arg?: SonicWeaveValue
) {
  if (arguments.length < 4) {
    if (name.defaultValue) {
      arg = subVisitor.visit(name.defaultValue);
    } else if (name.type === 'Parameter') {
      throw new Error(`Parameter '${name.id}' is required.`);
    }
  }
  if (name.type === 'Parameters') {
    if (!Array.isArray(arg)) {
      throw new Error('Expected an array to destructure.');
    }
    for (let i = 0; i < name.parameters.length; ++i) {
      if (i < arg.length) {
        localAssign(localVisitor, subVisitor, name.parameters[i], arg[i]);
      } else {
        localAssign(localVisitor, subVisitor, name.parameters[i]);
      }
    }
    if (name.rest) {
      localAssign(
        localVisitor,
        subVisitor,
        name.rest,
        arg.slice(name.parameters.length)
      );
    }
  } else {
    localVisitor.mutables.set(name.id, arg);
  }
}

export class StatementVisitor {
  rootContext: RootContext;
  parent?: StatementVisitor;
  mutables: VisitorContext;
  immutables: VisitorContext;
  expandable: boolean;

  constructor(rootContext: RootContext, parent?: StatementVisitor) {
    this.rootContext = rootContext;
    this.parent = parent;
    this.mutables = new Map();
    this.mutables.set('$', []);
    this.immutables = new Map();
    this.expandable = true;
  }

  clone() {
    const result = new StatementVisitor(this.rootContext);
    result.mutables = new Map(this.mutables);
    result.immutables = new Map(this.immutables);
    const scale = this.getCurrentScale();
    result.mutables.set('$', [...scale]);
    result.expandable = this.expandable;
    return result;
  }

  createExpressionVisitor() {
    return new ExpressionVisitor(this);
  }

  expand(defaultRootContext: RootContext) {
    if (!this.expandable) {
      throw new Error('The global scope cannot be expanded.');
    }
    let base = this.rootContext.expand(defaultRootContext);
    if (base) {
      base += '\n';
    }
    const variableLines: string[] = [];
    const r = repr.bind(this.createExpressionVisitor());
    for (const key of this.mutables.keys()) {
      if (key === '$' || key === '$$') {
        continue;
      }
      const value = r(this.mutables.get(key));
      if (value.startsWith('riff') || value.startsWith('fn')) {
        const name = (this.mutables.get(key) as SonicWeaveFunction).name;
        variableLines.push(`let ${key} = ${name}`);
      } else {
        variableLines.push(`let ${key} = ${value}`);
      }
    }
    for (const key of this.immutables.keys()) {
      const value = r(this.immutables.get(key));
      if (value.startsWith('riff') || value.startsWith('fn')) {
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

  visit(node: Statement): Interrupt | undefined {
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
      case 'TryStatement':
        return this.visitTryStatement(node);
      case 'ReturnStatement':
        return this.visitReturnStatement(node);
      case 'BreakStatement':
        return this.visitBreakStatement(node);
      case 'ContinueStatement':
        return this.visitContinueStatement(node);
      case 'ThrowStatement':
        throw this.visitThrowStatement(node);
      case 'EmptyStatement':
        return;
    }
    node satisfies never;
  }

  visitReturnStatement(node: ReturnStatement) {
    let value: SonicWeaveValue;
    if (node.argument) {
      const subVisitor = this.createExpressionVisitor();
      value = subVisitor.visit(node.argument);
    }
    return new Interrupt(node, value);
  }

  visitBreakStatement(node: BreakStatement) {
    return new Interrupt(node);
  }

  visitContinueStatement(node: ContinueStatement) {
    return new Interrupt(node);
  }

  visitThrowStatement(node: ThrowStatement) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.argument);
    if (typeof value === 'string') {
      throw new Error(value);
    }
    throw value;
  }

  declareVariable(
    subVisitor: ExpressionVisitor,
    parameters: Parameter | Parameters_,
    mutable: boolean,
    value?: SonicWeaveValue
  ) {
    if (arguments.length < 4 && parameters.defaultValue) {
      value = subVisitor.visit(parameters.defaultValue);
    }
    if (parameters.type === 'Parameters') {
      if (!Array.isArray(value)) {
        for (let i = 0; i < parameters.parameters.length; ++i) {
          this.declareVariable(subVisitor, parameters.parameters[i], mutable);
        }
      } else {
        for (let i = 0; i < parameters.parameters.length; ++i) {
          if (i < value.length) {
            this.declareVariable(
              subVisitor,
              parameters.parameters[i],
              mutable,
              value[i]
            );
          } else {
            this.declareVariable(subVisitor, parameters.parameters[i], mutable);
          }
        }
        if (parameters.rest) {
          this.declareVariable(
            subVisitor,
            parameters.rest,
            mutable,
            value.slice(parameters.parameters.length)
          );
        }
      }
    } else {
      const id = parameters.id;
      if (this.immutables.has(id) || this.mutables.has(id)) {
        throw new Error('Cannot redeclare variable.');
      }
      if (mutable) {
        this.mutables.set(id, value);
      } else {
        this.immutables.set(id, value);
      }
    }
  }

  visitVariableDeclaration(node: VariableDeclaration) {
    const subVisitor = this.createExpressionVisitor();
    this.declareVariable(subVisitor, node.parameters, node.mutable);
    return undefined;
  }

  assign(name: Identifier | Identifiers, value: SonicWeaveValue) {
    if (name.type === 'Identifiers') {
      if (!Array.isArray(value)) {
        throw new Error('Destructuring assignment must use an array.');
      }
      for (let i = 0; i < name.identifiers.length; ++i) {
        this.assign(name.identifiers[i], value[i]);
      }
      if (name.rest) {
        this.assign(name, value.slice(name.identifiers.length));
      }
    } else {
      const id = name.id;
      if (this.immutables.has(id)) {
        throw new Error('Assignment to a constant variable.');
      }
      this.set(id, value);
    }
  }

  visitAssignmentStatement(node: AssignmentStatement) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.value);
    if (node.name.type === 'ArraySlice') {
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

        // Replace undefined with null for JS array abuse.
        object[start] = value[i++] ?? null;
        let next = start + step;
        while (next <= end) {
          object[next] = value[i++] ?? null;
          next += step;
        }
        object.splice(end, 0, ...value.slice(i));
        // Abuse sparse JS arrays.
        object.splice(
          0,
          object.length,
          ...object
            .filter(x => x !== undefined)
            .map(x => (x === null ? undefined : x) as unknown as Interval)
        );
        return undefined;
      } else if (step < 0) {
        if (start < end) {
          throw new Error('Invalid slice assignment.');
        }

        object[start] = value[i++] ?? null;
        let next = start + step;
        while (next >= end) {
          object[next] = value[i++] ?? null;
          next += step;
        }
        const rest = value.slice(i);
        rest.reverse();
        object.splice(end, 0, ...rest);
        object.splice(
          0,
          object.length,
          ...object
            .filter(x => x !== undefined)
            .map(x => (x === null ? undefined : x) as unknown as Interval)
        );
        return undefined;
      }
      throw new Error('Slice step must not be zero');
    } else if (node.name.type === 'ArrayAccess') {
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
    } else {
      this.assign(node.name, value);
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
      // Coerce absolute reference to Hz
      if (this.rootContext.C4.timeExponent.n) {
        this.rootContext.C4 = this.rootContext.C4.pow(
          this.rootContext.C4.timeExponent.inverse().neg()
        );
      }

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
      scale.push(value);
    } else if (value instanceof Val) {
      const divisions = value.divisions;
      const equave = value.equave.toFraction();
      let equaveNumerator: number | null = null;
      let equaveDenominator: number | null = null;
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
      const rel = relative.bind(subVisitor);
      const mapped = scale.map(i => {
        const t = i.value.tail(value.value.numberOfComponents);
        const result = rel(i).dot(value).mul(step);
        if (t.totalCents()) {
          return new Interval(t, 'logarithmic').add(result);
        }
        return result;
      });
      scale.length = 0;
      scale.push(...mapped);
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
    } else if (typeof value === 'boolean') {
      scale.push(upcastBool(value));
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
    let interrupt: Interrupt | undefined = undefined;
    for (const statement of node.body) {
      interrupt = subVisitor.visit(statement);
      if (interrupt?.type === 'ReturnStatement') {
        return interrupt;
      } else if (interrupt) {
        break;
      }
    }
    const subScale = subVisitor.getCurrentScale();
    scale.push(...subScale);
    return interrupt;
  }

  visitWhileStatement(node: WhileStatement) {
    const subVisitor = this.createExpressionVisitor();
    let executeTail = true;
    while (sonicTruth(subVisitor.visit(node.test))) {
      const interrupt = this.visit(node.body);
      if (interrupt?.type === 'ReturnStatement') {
        return interrupt;
      } else if (interrupt?.type === 'BreakStatement') {
        executeTail = false;
        break;
      } else if (interrupt?.type === 'ContinueStatement') {
        continue;
      }
    }
    if (executeTail && node.tail) {
      return this.visit(node.tail);
    }
    return undefined;
  }

  declareLoopElement(
    loopVisitor: StatementVisitor,
    subVisitor: ExpressionVisitor,
    element: Parameter | Parameters_,
    mutable: boolean,
    value?: SonicWeaveValue
  ) {
    if (arguments.length < 5 && element.defaultValue) {
      value = subVisitor.visit(element.defaultValue);
    }
    if (element.type === 'Parameters') {
      if (!Array.isArray(value)) {
        throw new Error('Must iterate over arrays when destructuring.');
      }
      for (let i = 0; i < element.parameters.length; ++i) {
        if (i < value.length) {
          this.declareLoopElement(
            loopVisitor,
            subVisitor,
            element.parameters[i],
            mutable,
            value[i]
          );
        } else {
          this.declareLoopElement(
            loopVisitor,
            subVisitor,
            element.parameters[i],
            mutable
          );
        }
      }
      if (element.rest) {
        this.declareLoopElement(
          loopVisitor,
          subVisitor,
          element.rest,
          mutable,
          value.slice(element.parameters.length)
        );
      }
    } else {
      const id = element.id;
      if (mutable) {
        loopVisitor.mutables.set(id, value);
      } else {
        // Technically a mutation, but should be fine.
        loopVisitor.immutables.set(id, value);
      }
    }
  }

  visitForOfStatement(node: ForOfStatement) {
    const subVisitor = this.createExpressionVisitor();
    const array = subVisitor.visit(node.array);
    if (!Array.isArray(array)) {
      throw new Error('Can only iterate over arrays.');
    }
    const loopVisitor = new StatementVisitor(this.rootContext, this);
    loopVisitor.mutables.delete('$'); // Collapse scope
    const loopSubVisitor = loopVisitor.createExpressionVisitor();
    let executeTail = true;
    for (const value of array) {
      this.declareLoopElement(
        loopVisitor,
        loopSubVisitor,
        node.element,
        node.mutable,
        value
      );
      const interrupt = loopVisitor.visit(node.body);
      if (interrupt?.type === 'ReturnStatement') {
        return interrupt;
      } else if (interrupt?.type === 'BreakStatement') {
        executeTail = false;
        break;
      } else if (interrupt?.type === 'ContinueStatement') {
        continue;
      }
    }
    if (executeTail && node.tail) {
      return this.visit(node.tail);
    }
    return undefined;
  }

  visitTryStatement(node: TryStatement) {
    try {
      const interrupt = this.visit(node.body);
      if (interrupt) {
        return interrupt;
      }
    } catch (e) {
      if (node.handler && node.handler.parameter) {
        if (e instanceof Error) {
          // eslint-disable-next-line no-ex-assign
          e = e.message;
        }
        const handlerVisitor = new StatementVisitor(this.rootContext, this);
        handlerVisitor.mutables.delete('$'); // Collapse scope
        handlerVisitor.immutables.set(
          node.handler.parameter.id,
          e as SonicWeaveValue
        );
        const interrupt = handlerVisitor.visit(node.handler.body);
        if (interrupt) {
          return interrupt;
        }
      } else if (node.handler) {
        const interrupt = this.visit(node.handler.body);
        if (interrupt) {
          return interrupt;
        }
      }
    } finally {
      if (node.finalizer) {
        const interrupt = this.visit(node.finalizer);
        if (interrupt) {
          // eslint-disable-next-line no-unsafe-finally
          return interrupt;
        }
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

      // XXX: Poor type system gets abused again.
      localAssign(
        localVisitor,
        localVisitor.createExpressionVisitor(),
        node.parameters,
        args as Interval[]
      );
      for (const statement of node.body) {
        const interrupt = localVisitor.visit(statement);
        if (interrupt?.type === 'ReturnStatement') {
          return interrupt.value;
        } else if (interrupt) {
          throw new Error(`Illegal ${interrupt.type}.`);
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

const TWO_MONZO = new TimeMonzo(ZERO, [ONE]);
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
  node: BinaryExpression,
  simplify: boolean
) {
  if (node.preferLeft && node.preferRight) {
    let domain = left.domain;
    if (right.domain === 'linear') {
      domain = 'linear';
    }
    let resolvedNode: IntervalLiteral | undefined = undefined;
    if (typesCompatible(left.node, right.node)) {
      resolvedNode = timeMonzoAs(value, left.node, simplify);
    }
    return new Interval(value, domain, resolvedNode, infect(left, right));
  }
  if (node.preferLeft) {
    return new Interval(
      value,
      left.domain,
      timeMonzoAs(value, left.node, simplify),
      left
    );
  }
  return new Interval(
    value,
    right.domain,
    timeMonzoAs(value, right.node, simplify),
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
      case 'LestExpression':
        return this.visitLestExpression(node);
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
        return new Val(RECIPROCAL_CENT_MONZO, TWO_MONZO, {
          type: 'ReciprocalCentLiteral',
        });
      case 'TrueLiteral':
        return true;
      case 'FalseLiteral':
        return false;
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
      case 'SparseOffsetVal':
        return this.visitSparseOffsetVal(node);
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
      case 'SquareSuperparticular':
        return this.visitSquareSuperparticular(node);
    }
    node satisfies never;
  }

  visitSquareSuperparticular(node: SquareSuperparticular) {
    if (node.end) {
      let numerator = 2n * node.end;
      let denominator = node.end + 1n;
      if (node.start !== 2n) {
        numerator *= node.start;
        denominator *= 2n * node.start - 2n;
      }
      return new Interval(
        TimeMonzo.fromBigNumeratorDenominator(numerator, denominator),
        'logarithmic',
        node
      );
    }
    const s = node.start * node.start;
    return new Interval(
      TimeMonzo.fromBigNumeratorDenominator(s, s - 1n),
      'logarithmic',
      node
    );
  }

  visitArrayComprehension(node: ArrayComprehension) {
    const result: Interval[] = [];

    function comprehend(
      this: ExpressionVisitor,
      localVisitor: StatementVisitor,
      index: number
    ) {
      const localSubvisitor = localVisitor.createExpressionVisitor();
      if (index >= node.comprehensions.length) {
        if (node.test && !sonicTruth(localSubvisitor.visit(node.test))) {
          return;
        }
        result.push(localSubvisitor.visit(node.expression) as Interval);
        return;
      }
      const comprehension = node.comprehensions[index];
      const array = this.visit(comprehension.array);
      if (!Array.isArray(array)) {
        throw new Error('Can only iterate over arrays.');
      }
      const element = comprehension.element;
      for (const value of array) {
        localAssign(localVisitor, localSubvisitor, element, value);
        comprehend.bind(this)(localVisitor, index + 1);
      }
    }

    const localVisitor = new StatementVisitor(this.rootContext, this.parent);
    localVisitor.mutables.delete('$'); // Collapse scope

    comprehend.bind(this)(localVisitor, 0);

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

  down(
    operand: boolean | Interval | (Interval | boolean)[] | Val
  ): Interval | Interval[] | Val {
    if (typeof operand === 'boolean') {
      operand = upcastBool(operand);
    }
    if (operand instanceof Interval || operand instanceof Val) {
      return operand.down(this.rootContext);
    }
    return operand.map(this.down.bind(this)) as Interval[];
  }

  visitDownExpression(node: DownExpression) {
    const operand = this.visit(node.operand);
    if (
      operand instanceof Interval ||
      operand instanceof Val ||
      Array.isArray(operand)
    ) {
      return this.down(operand);
    }
    throw new Error('Can only apply down arrows to intervals and vals');
  }

  label(
    object: boolean | Interval | (Interval | boolean)[],
    labels: (string | Color | undefined)[]
  ): Interval | Interval[] {
    if (typeof object === 'boolean') {
      object = upcastBool(object);
    }
    if (object instanceof Interval) {
      object = object.shallowClone();
      for (const label of labels) {
        if (typeof label === 'string') {
          object.label = label;
        } else if (label instanceof Color) {
          object.color = label;
        } else {
          object.color = undefined;
        }
      }
      return object;
    }
    const l = this.label.bind(this);
    return object.map(o => l(o, labels)) as Interval[];
  }

  visitLabeledExpression(node: LabeledExpression) {
    const object = this.visit(node.object);
    if (
      !(
        typeof object === 'boolean' ||
        object instanceof Interval ||
        Array.isArray(object)
      )
    ) {
      throw new Error('Labels can only be applied to intervals');
    }
    const labels: (string | Color | undefined)[] = [];
    for (const label of node.labels) {
      const l = this.visit(label);
      if (l instanceof Color || typeof l === 'string' || l === undefined) {
        labels.push(l);
      } else {
        throw new Error('Labels must be strings, colors or niente.');
      }
    }
    return this.label(object, labels);
  }

  visitConditionalExpression(node: ConditionalExpression) {
    const test = this.visit(node.test);
    if (sonicTruth(test)) {
      return this.visit(node.consequent);
    }
    return this.visit(node.alternate);
  }

  visitLestExpression(node: LestExpression) {
    try {
      return this.visit(node.primary);
    } catch {
      return this.visit(node.fallback);
    }
  }

  visitComponent(component: VectorComponent) {
    // XXX: This is so backwards...
    return new Fraction(formatComponent(component));
  }

  upLift(
    monzo: TimeMonzo,
    node: MonzoLiteral | ValLiteral | FJS | AbsoluteFJS
  ) {
    return monzo
      .mul(this.rootContext.up.pow(node.ups))
      .mul(this.rootContext.lift.pow(node.lifts));
  }

  visitMonzoLiteral(node: MonzoLiteral) {
    const exponents = node.components.map(this.visitComponent);
    let value: TimeMonzo;
    if (node.basis.length) {
      const basis = parseSubgroup(node.basis)[0];
      if (exponents.length > basis.length) {
        throw new Error('Too many monzo components for given subgroup.');
      }
      value = new TimeMonzo(ZERO, []);
      for (let i = 0; i < exponents.length; ++i) {
        value = value.mul(TimeMonzo.fromFraction(basis[i]).pow(exponents[i]));
      }
    } else {
      value = new TimeMonzo(ZERO, exponents);
    }
    value = this.upLift(value, node);
    const result = new Interval(value, 'logarithmic', node);
    if (node.ups || node.lifts) {
      this.rootContext.fragiles.push(result);
    }
    return result;
  }

  visitValLiteral(node: ValLiteral) {
    const val = node.components.map(this.visitComponent);
    let value: TimeMonzo;
    let equave = TWO_MONZO;
    if (node.basis.length) {
      const basis = parseSubgroup(node.basis)[0];
      if (val.length !== basis.length) {
        throw new Error('Val components must be given for the whole subgroup.');
      }
      value = valToTimeMonzo(val, basis);
      equave = TimeMonzo.fromFraction(basis[0]);
    } else {
      value = new TimeMonzo(ZERO, val);
    }
    value = this.upLift(value, node);
    const result = new Val(value, equave, node);
    if (node.ups || node.lifts) {
      this.rootContext.fragiles.push(result);
    }
    return result;
  }

  project(
    octaves: boolean | Interval | (Interval | boolean)[],
    base: Interval
  ): Interval | Interval[] {
    if (typeof octaves === 'boolean') {
      octaves = upcastBool(octaves);
    }
    if (octaves instanceof Interval) {
      return octaves.project(base);
    }
    const p = this.project.bind(this);
    return octaves.map(o => p(o, base)) as Interval[];
  }

  visitNedjiProjection(node: NedjiProjection) {
    const octaves = this.visit(node.octaves);
    if (
      !(
        typeof octaves === 'boolean' ||
        octaves instanceof Interval ||
        Array.isArray(octaves)
      )
    ) {
      throw new Error(
        'Nedji steps must evaluate to an interval or an array of intervals'
      );
    }
    const base = this.visit(node.base);
    if (!(base instanceof Interval)) {
      throw new Error('Nedji base must evaluate to an interval');
    }
    return this.project(octaves, base);
  }

  visitWartsLiteral(node: WartsLiteral) {
    const val = wartsToVal(node);
    const equave = inferEquave(node);
    if (!equave) {
      throw new Error('Failed to infer wart equave.');
    }
    return new Val(val, TimeMonzo.fromFraction(equave), node);
  }

  visitSparseOffsetVal(node: SparseOffsetVal) {
    const val = sparseOffsetToVal(node);
    let equave = TWO_MONZO;
    if (node.equave) {
      equave = TimeMonzo.fromFraction(node.equave);
    }
    return new Val(val, equave, node);
  }

  visitFJS(node: FJS) {
    const monzo = inflect(
      pythagoreanMonzo(node.pythagorean),
      node.superscripts,
      node.subscripts
    );
    const result = new Interval(this.upLift(monzo, node), 'logarithmic', node);
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
      this.rootContext.C4.mul(this.upLift(relativeToC4, node)),
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
    let index = this.visit(node.index);
    if (Array.isArray(index)) {
      index = index.flat(Infinity);
      const result: (boolean | Interval | string)[] = [];
      for (let i = 0; i < index.length; ++i) {
        const idx = index[i];
        if (idx === true) {
          if (!node.nullish && i >= object.length) {
            throw new Error('Indexing boolean out of range.');
          }
          result.push(object[i]);
          continue;
        } else if (idx === false) {
          continue;
        }
        let j = idx.toInteger();
        if (j < 0) {
          j += object.length;
        }
        if (node.nullish) {
          result.push(object[j]);
          continue;
        }
        if (j < 0 || j >= object.length) {
          throw new Error('Index out of range.');
        }
        result.push(object[j]);
      }
      if (typeof object === 'string') {
        return result.join('');
      }
      return result as Interval[];
    }
    if (!(index instanceof Interval)) {
      throw new Error('Array access with a non-integer.');
    }
    let i = index.toInteger();
    if (i < 0) {
      i += object.length;
    }
    if (node.nullish) {
      return object[i];
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

  unaryOperate(
    operand: boolean | Interval | (Interval | boolean)[] | Val,
    node: UnaryExpression
  ): Interval | Interval[] | Val {
    if (Array.isArray(operand)) {
      const op = this.unaryOperate.bind(this);
      return operand.map(o => op(o, node)) as Interval[];
    }
    if (typeof operand === 'boolean') {
      operand = upcastBool(operand);
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
          throw new Error('Uniform operation not supported.');
      }
      if (operand.domain === 'cologarithmic') {
        return new Val(value, operand.equave, newNode);
      }
      return new Interval(value, operand.domain, newNode, operand);
    }
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
    }
    if (!(operand instanceof Interval)) {
      throw new Error('Unsupported unary operation.');
    }
    let newValue: Interval | undefined;
    if (node.operator === '++') {
      newValue = operand.add(linearOne());
    } else if (node.operator === '--') {
      newValue = operand.sub(linearOne());
    } else {
      // The runtime shouldn't let you get here.
      throw new Error('Unexpected unary operation.');
    }
    if (node.operand.type !== 'Identifier') {
      throw new Error('Cannot increment/decrement a value.');
    }
    const name = node.operand.id;
    this.parent.set(name, newValue);
    if (node.prefix) {
      return newValue;
    }
    return operand;
  }

  visitUnaryExpression(node: UnaryExpression) {
    const operand = this.visit(node.operand);
    if (node.operator === 'not') {
      return !sonicTruth(operand);
    }
    if (
      operand instanceof Interval ||
      Array.isArray(operand) ||
      operand instanceof Val
    ) {
      return this.unaryOperate(operand, node);
    }
    throw new Error(`${node.operator} can only operate on intervals`);
  }

  tensor(
    left: boolean | Interval | (Interval | boolean)[],
    right: boolean | Interval | (Interval | boolean)[],
    node: BinaryExpression
  ): Interval | Interval[] {
    if (typeof left === 'boolean') {
      left = upcastBool(left);
    }
    if (typeof right === 'boolean') {
      right = upcastBool(right);
    }
    if (left instanceof Interval) {
      if (right instanceof Interval) {
        this.rootContext.spendGas();
        if (node.preferLeft || node.preferRight) {
          const value = left.value.mul(right.value);
          return resolvePreference(value, left, right, node, false);
        }
        return left.mul(right) as Interval;
      }
      const tns = this.tensor.bind(this);
      return right.map(r => tns(left, r, node)) as Interval[];
    }
    const tns = this.tensor.bind(this);
    return left.map(l => tns(l, right, node)) as Interval[];
  }

  binaryOperate(
    left: Interval | boolean | (Interval | boolean)[],
    right: Interval | boolean | (Interval | boolean)[],
    node: BinaryExpression
  ): boolean | Interval | Interval[] {
    if (typeof left === 'boolean') {
      left = upcastBool(left);
    }
    if (typeof right === 'boolean') {
      right = upcastBool(right);
    }
    const operator = node.operator;
    if (left instanceof Interval) {
      if (right instanceof Interval) {
        if (node.preferLeft || node.preferRight) {
          let value: TimeMonzo;
          let simplify = false;
          switch (operator) {
            case '+':
              value = left.value.add(right.value);
              break;
            case '-':
              value = left.value.sub(right.value);
              break;
            case 'max':
              value = maximum.bind(this)(left, right).value;
              break;
            case 'min':
              value = minimum.bind(this)(left, right).value;
              break;
            case 'to':
              value = left.value.roundTo(right.value);
              break;
            case 'by':
              value = left.value.pitchRoundTo(right.value);
              break;
            case '×':
            case '*':
            case ' ':
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
              simplify = true;
              break;
            case '/^':
            case '^/':
              value = left.value.pow(right.value.inverse());
              simplify = true;
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
              simplify = true;
              break;
            case '/_':
              value = log(left, right);
              simplify = true;
              break;
            case '/+':
            case '⊕':
              value = left.value.lensAdd(right.value);
              break;
            case '/-':
            case '⊖':
              value = left.value.lensSub(right.value);
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
          const result = resolvePreference(value, left, right, node, simplify);

          // Special handling for domain crossing operations
          if (operator === '/_' || operator === 'dot' || operator === '·') {
            result.domain = 'linear';
            result.node = undefined;
          }

          return result;
        }
        switch (operator) {
          case '===':
            return left.strictEquals(right);
          case '!==':
            return !left.strictEquals(right);
          case '==':
            return left.equals(right);
          case '!=':
            return !left.equals(right);
          case '<=':
            return compare.bind(this)(left, right) <= 0;
          case '>=':
            return compare.bind(this)(left, right) >= 0;
          case '<':
            return compare.bind(this)(left, right) < 0;
          case '>':
            return compare.bind(this)(left, right) > 0;
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
          case '^/':
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
          case 'max':
            return maximum.bind(this)(left, right);
          case 'min':
            return minimum.bind(this)(left, right);
          case 'to':
            return left.roundTo(right);
          case 'by':
            return left.pitchRoundTo(right);
          case '/+':
          case '⊕':
            return left.lensAdd(right);
          case '/-':
          case '⊖':
            return left.lensSub(right);
          case '??':
          case 'or':
          case 'and':
          case 'of':
          case 'not of':
          case '~of':
          case 'not ~of':
          case '⊗':
          case 'tns':
            throw new Error('Unexpected code flow.');
        }
        operator satisfies never;
      }
      const op = this.binaryOperate.bind(this);
      return right.map(r => op(left, r, node)) as Interval[];
    }
    if (right instanceof Interval) {
      const op = this.binaryOperate.bind(this);
      return left.map(l => op(l, right, node)) as Interval[];
    }
    const op = this.binaryOperate.bind(this);
    return left.map((l, i) =>
      op(l, (right as Interval[])[i], node)
    ) as Interval[];
  }

  visitBinaryExpression(node: BinaryExpression): SonicWeaveValue {
    const operator = node.operator;
    let left = this.visit(node.left);
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
    let right = this.visit(node.right);
    if (operator === 'tns' || operator === '⊗') {
      if (typeof left === 'boolean') {
        left = upcastBool(left);
      }
      if (typeof right === 'boolean') {
        right = upcastBool(right);
      }
      if (!(left instanceof Interval) && !Array.isArray(left)) {
        throw new Error('Left tensor operand must be an interval or an array.');
      }
      if (!(right instanceof Interval) && !Array.isArray(right)) {
        throw new Error(
          'Right tensor operand must be an interval or an array.'
        );
      }
      return this.tensor(left, right, node);
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
            return strictIncludes(left, right);
          case 'not of':
            return !strictIncludes(left, right);
          case '~of':
            return includes(left, right);
          case 'not ~of':
            return !includes(left, right);
        }
      } else {
        throw new Error("Target of 'of' must be an array");
      }
      operator satisfies never;
    }
    if (left instanceof Val) {
      if (right instanceof Val) {
        switch (operator) {
          case '===':
            return left.strictEquals(right);
          case '!==':
            return !left.strictEquals(right);
          case '==':
            return left.equals(right);
          case '!=':
            return !left.equals(right);
          case '+':
            return left.add(right);
          case '-':
            return left.sub(right);
          case '·':
          case 'dot':
            return left.dot(right);
        }
        throw new Error(`Operator '${operator}' not implemented between vals.`);
      }
      if (right instanceof Interval || typeof right === 'boolean') {
        if (typeof right === 'boolean') {
          right = upcastBool(right);
        }
        switch (operator) {
          case '×':
          case '*':
          case ' ':
            return left.mul(right);
          case '÷':
          case '%':
            return left.div(right);
          case '·':
          case 'dot':
            return left.dot(right);
        }
        throw new Error(
          `Operator '${operator}' not implemented between vals and intervals.`
        );
      }
    }
    if (right instanceof Val) {
      if (left instanceof Interval) {
        switch (operator) {
          case '×':
          case '*':
          case ' ':
            return left.mul(right);
          case '·':
          case 'dot':
            return left.dot(right);
        }
        throw new Error(
          `Operator '${operator}' not implemented between intervals and vals.`
        );
      }
    }
    if (
      (left instanceof Interval ||
        typeof left === 'boolean' ||
        Array.isArray(left)) &&
      (right instanceof Interval ||
        typeof right === 'boolean' ||
        Array.isArray(right))
    ) {
      return this.binaryOperate(left, right, node);
    }
    switch (node.operator) {
      case '===':
        return left === right;
      case '!==':
        return left !== right;
      case '==':
        // eslint-disable-next-line eqeqeq
        return left == right;
      case '!=':
        // eslint-disable-next-line eqeqeq
        return left != right;
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
    } else if (node.callee.type === 'ArrayAccess') {
      const callee = this.visitArrayAccess(node.callee);
      return (callee as SonicWeaveFunction).bind(this)(...args);
    } else {
      throw new Error('Invalid callee.');
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

      // XXX: Poor type system gets abused again.
      localAssign(
        localVisitor,
        localVisitor.createExpressionVisitor(),
        node.parameters,
        args as Interval[]
      );

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
        parseFloat(
          `${node.sign}${node.whole}.${node.fractional}e${node.exponent ?? '0'}`
        )
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
    const domains: IntervalDomain[] = [];
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
      } else if (typesCompatible(intervals[i].node, rootInterval.node)) {
        result.push(
          node.mirror
            ? intervals[i].lsub(rootInterval)
            : intervals[i].sub(rootInterval)
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
let VOLATILES: Program | null = null;

export function getSourceVisitor(
  includePrelude = true,
  extraBuiltins?: Record<string, SonicWeaveValue>
) {
  extraBuiltins ??= {};
  const rootContext = new RootContext();
  if (includePrelude && SOURCE_VISITOR_WITH_PRELUDE && VOLATILES) {
    const visitor = SOURCE_VISITOR_WITH_PRELUDE.clone();
    // Volatiles depend on the active root context.
    for (const statement of VOLATILES.body) {
      visitor.visit(statement);
    }
    visitor.rootContext = rootContext;
    for (const name in extraBuiltins) {
      const value = extraBuiltins[name];
      visitor.immutables.set(name, value);
    }
    return visitor;
  } else if (!includePrelude && SOURCE_VISITOR_NO_PRELUDE) {
    const visitor = SOURCE_VISITOR_NO_PRELUDE.clone();
    visitor.rootContext = rootContext;
    return visitor;
  } else {
    const visitor = new StatementVisitor(rootContext);
    visitor.expandable = false;
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
      // Volatiles depend on the active root context.
      VOLATILES = parseAST(PRELUDE_VOLATILES);
      for (const statement of VOLATILES.body) {
        visitor.visit(statement);
      }
    } else {
      SOURCE_VISITOR_NO_PRELUDE = visitor.clone();
    }
    for (const name in extraBuiltins) {
      const value = extraBuiltins[name];
      visitor.immutables.set(name, value);
    }
    return visitor;
  }
}

export function evaluateSource(
  source: string,
  includePrelude = true,
  extraBuiltins?: Record<string, SonicWeaveValue>
) {
  const globalVisitor = getSourceVisitor(includePrelude, extraBuiltins);
  const visitor = new StatementVisitor(
    globalVisitor.rootContext,
    globalVisitor
  );

  const program = parseAST(source);
  for (const statement of program.body) {
    const interrupt = visitor.visit(statement);
    if (interrupt) {
      throw new Error(`Illegal ${interrupt.type}.`);
    }
  }
  return visitor;
}

export function evaluateExpression(
  source: string,
  includePrelude = true,
  extraBuiltins?: Record<string, SonicWeaveValue>
): SonicWeaveValue {
  const globalVisitor = getSourceVisitor(includePrelude, extraBuiltins);
  const visitor = new StatementVisitor(
    globalVisitor.rootContext,
    globalVisitor
  );
  const program = parseAST(source);
  for (const statement of program.body.slice(0, -1)) {
    const interrupt = visitor.visit(statement);
    if (interrupt) {
      throw new Error(`Illegal ${interrupt.type}.`);
    }
  }
  const finalStatement = program.body[program.body.length - 1];
  if (finalStatement.type !== 'ExpressionStatement') {
    throw new Error(`Expected expression. Got ${finalStatement.type}`);
  }
  const subVisitor = visitor.createExpressionVisitor();
  return subVisitor.visit(finalStatement.expression);
}

function convert(value: any): SonicWeaveValue {
  switch (typeof value) {
    case 'string':
    case 'undefined':
    case 'function':
    case 'boolean':
      return value;
    case 'number':
      if (Number.isInteger(value)) {
        return Interval.fromInteger(value);
      }
      return Interval.fromValue(value);
    case 'bigint':
      return Interval.fromInteger(value);
    case 'symbol':
      throw new Error('Symbols cannot be converted.');
    case 'object':
      if (value instanceof Interval) {
        return value;
      } else if (value instanceof Fraction) {
        return Interval.fromFraction(value);
      } else if (value instanceof TimeMonzo) {
        return new Interval(value, 'linear');
      } else if (Array.isArray(value)) {
        return value.map(convert) as Interval[];
      }
  }
  throw new Error('Value cannot be converted.');
}

export function createTag(
  includePrelude = true,
  extraBuiltins?: Record<string, SonicWeaveValue>
) {
  function tag(strings: TemplateStringsArray, ...args: any[]) {
    const globalVisitor = getSourceVisitor(includePrelude, extraBuiltins);
    const visitor = new StatementVisitor(
      globalVisitor.rootContext,
      globalVisitor
    );
    let source = strings.raw[0];
    for (let i = 0; i < args.length; ++i) {
      const arg = args[i];
      const name = `__tagArg${i}_${Math.floor(46656 * Math.random()).toString(
        36
      )}`;
      visitor.immutables.set(name, convert(arg));
      source += name + strings.raw[i + 1];
    }
    const program = parseAST(source);
    for (const statement of program.body.slice(0, -1)) {
      const interrupt = visitor.visit(statement);
      if (interrupt) {
        throw new Error(`Illegal ${interrupt.type}.`);
      }
    }
    const finalStatement = program.body[program.body.length - 1];
    if (finalStatement.type !== 'ExpressionStatement') {
      throw new Error(`Expected expression. Got ${finalStatement.type}`);
    }
    const subVisitor = visitor.createExpressionVisitor();
    return subVisitor.visit(finalStatement.expression);
  }
  return tag;
}

export const sw = createTag();
Object.defineProperty(sw, 'name', {
  value: 'sw',
  enumerable: false,
});
