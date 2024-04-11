import {Interval, Color, Val} from '../interval';
import {TimeMonzo} from '../monzo';
import {
  SonicWeaveValue,
  sonicTruth,
  relative,
  SonicWeaveFunction,
  repr,
  upcastBool,
  SonicWeavePrimitive,
  sort,
} from '../stdlib';
import {TWO} from '../utils';
import {RootContext} from '../context';
import {
  AssignmentStatement,
  BlockStatement,
  BreakStatement,
  ContinueStatement,
  ExpressionStatement,
  IterationStatement,
  FunctionDeclaration,
  Identifier,
  Identifiers,
  IfStatement,
  LiftDeclaration,
  Parameter,
  Parameters_,
  PitchDeclaration,
  ReturnStatement,
  Statement,
  ThrowStatement,
  TryStatement,
  UpDeclaration,
  VariableDeclaration,
  WhileStatement,
} from '../ast';
import {
  ExpressionVisitor,
  VisitorContext,
  arrayRecordOrString,
  containerToArray,
} from './expression';

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
      case 'IterationStatement':
        return this.visitIterationStatement(node);
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
      const object = subVisitor.visit(
        node.name.object
      ) as (SonicWeavePrimitive | null)[];
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
      throw new Error('Slice step must not be zero.');
    } else if (node.name.type === 'AccessExpression') {
      const object = arrayRecordOrString(
        subVisitor.visit(node.name.object),
        'Can only assign elements of arrays or records.'
      );
      if (typeof object === 'string') {
        throw new Error('Strings are immutable.');
      }
      if (Array.isArray(object)) {
        const index = subVisitor.visit(node.name.key);
        if (!(index instanceof Interval)) {
          throw new Error('Array access with a non-integer.');
        }
        let i = index.toInteger();
        if (i < 0) {
          i += object.length;
        }
        // XXX: Abuses the type system.
        object[i] = value as SonicWeavePrimitive;
        return undefined;
      }
      const key = subVisitor.visit(node.name.key);
      if (!(typeof key === 'string')) {
        throw new Error('Record keys must be strings.');
      }
      object[key] = value as SonicWeavePrimitive;
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
      throw new Error('Declared pitch must be on the left.');
    }

    const subVisitor = this.createExpressionVisitor();

    if (node.left.type === 'AbsoluteFJS') {
      const value = subVisitor.visit(node.middle ?? node.right);
      if (!(value instanceof Interval)) {
        throw new Error('Pitch declaration must evaluate to an interval.');
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
      throw new Error('Pitch declaration must evaluate to an interval.');
    }
    let absolute: TimeMonzo;
    let relative: TimeMonzo;
    if (left.value.timeExponent.n) {
      absolute = left.value;
      if (right.value.timeExponent.n) {
        throw new Error('Cannot assign absolute pitch to absolute pitch.');
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
      throw new Error('Up declaration must evaluate to an interval.');
    }
    this.rootContext.up = value.value;
    return undefined;
  }

  visitLiftDeclaration(node: LiftDeclaration) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.value);
    if (!(value instanceof Interval)) {
      throw new Error('Lift declaration must evaluate to an interval.');
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
        if (t.totalCents(true)) {
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
    } else if (typeof value === 'object') {
      const entries = Object.entries(value);
      for (const [key, subValue] of entries) {
        this.handleValue(subValue, subVisitor);
        this.handleValue(key, subVisitor);
      }
      const tail = scale.slice(-entries.length);
      scale.length = scale.length - tail.length;
      sort.bind(subVisitor)(tail);
      scale.push(...tail);
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

  visitIterationStatement(node: IterationStatement) {
    const subVisitor = this.createExpressionVisitor();
    const array = containerToArray(subVisitor.visit(node.container), node.kind);
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
      const localSubvisitor = localVisitor.createExpressionVisitor();
      // XXX: Abuse variable injection.
      localSubvisitor.mutables = localVisitor.mutables;
      localSubvisitor.localAssign(node.parameters, args as Interval[]);

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
    throw new Error(`Undeclared variable ${name}.`);
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
