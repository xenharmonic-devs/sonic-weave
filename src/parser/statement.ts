import {Interval, Color, Val, ValBasis, Temperament} from '../interval';
import {TimeMonzo, TimeReal} from '../monzo';
import {
  SonicWeaveValue,
  sonicTruth,
  SonicWeaveFunction,
  repr,
  upcastBool,
  SonicWeavePrimitive,
  sortInPlace,
  temper,
  absolute,
} from '../stdlib';
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
  DeferStatement,
  Program,
  ModuleDeclaration,
  ExportConstantStatement,
  ExportFunctionStatement,
  ExportAllStatement,
  ImportStatement,
  ImportAllStatement,
  MosDeclaration,
  DeleteStatement,
} from '../ast';
import {
  ExpressionVisitor,
  VisitorContext,
  arrayRecordOrString,
  containerToArray,
} from './expression';
import {Tardigrade} from './mos';
import {hasOwn} from '../utils';

/**
 * An interrupt representing a return, break or continue statement.
 */
export class Interrupt {
  /**
   * The abstract syntax tree node that triggered the break in code flow.
   */
  node: ReturnStatement | BreakStatement | ContinueStatement;
  /**
   * Value of a return statement if present.
   */
  value?: SonicWeaveValue;

  /**
   * Construct a new interrupt.
   * @param node AST node corresponding to the interrupting statement.
   * @param value Return value if present.
   */
  constructor(
    node: ReturnStatement | BreakStatement | ContinueStatement,
    value?: SonicWeaveValue
  ) {
    this.node = node;
    this.value = value;
  }

  /**
   * Get the type of the interrupt.
   */
  get type() {
    return this.node.type;
  }
}

export const MODULE_DOCSTRING = Symbol();

export type SonicWeaveModule = Map<
  string | typeof MODULE_DOCSTRING,
  SonicWeaveValue
>;

/**
 * Abstract syntax tree visitor for statements in a SonicWeave program.
 */
export class StatementVisitor {
  /**
   * Parent context of the surrounding code block.
   */
  parent?: StatementVisitor | ExpressionVisitor;
  /**
   * Local context for mutable (let) variables.
   */
  mutables: VisitorContext;
  /**
   * Local context for immutable (const) variables.
   */
  immutables: VisitorContext;
  /**
   * Whether or not the state of the visitor can be represented as text and that state represents the runtime from a user's perspective. The global context doesn't have a representation because the builtins are not written in the SonicWeave DSL.
   */
  isUserRoot: boolean;
  /**
   * Deferred statement to be executed at the end of the current block.
   */
  deferred: Statement[];
  /**
   * Exported constants and functions usually from a module declaration.
   */
  exports: SonicWeaveModule;
  /**
   * Declared modules.
   */
  modules: Map<string, SonicWeaveModule>;
  /**
   * Imported names.
   */
  imported: Set<string>;

  private rootContext_?: RootContext;

  /**
   * Construct a new visitor for a block of code inside the AST.
   * @param parent Parent context of the surrounding code block.
   */
  constructor(parent?: StatementVisitor | ExpressionVisitor) {
    this.parent = parent;
    this.mutables = new Map();
    this.mutables.set('$', []);
    this.immutables = new Map();
    this.isUserRoot = false;
    this.deferred = [];
    this.exports = new Map();
    this.modules = new Map();
    this.imported = new Set();
  }

  /**
   * The root context with the current values of the root pitch, ups, lifts, etc.
   */
  get rootContext(): RootContext | undefined {
    if (this.parent) {
      return this.parent.rootContext;
    }
    return this.rootContext_;
  }

  set rootContext(context: RootContext | undefined) {
    if (this.parent) {
      this.parent.rootContext = context;
    }
    this.rootContext_ = context;
  }

  spendGas(amount?: number) {
    const context = this.rootContext;
    if (context) {
      context.spendGas(amount);
    }
  }

  /**
   * Create an independent (shallow) clone of the visitor useable as a cache of runtime state.
   * @returns A {@link StatementVisitor} in the same state as this one.
   */
  clone() {
    const result = new StatementVisitor();
    result.rootContext = this.rootContext;
    result.mutables = new Map(this.mutables);
    result.immutables = new Map(this.immutables);
    const scale = this.currentScale;
    result.mutables.set('$', [...scale]);
    result.isUserRoot = this.isUserRoot;
    return result;
  }

  /**
   * Construct a visitor for evaluating the contents of an {@link ExpressionStatement}.
   * @param inheritVariables If `true` the expression visitor will share context of the variables with this one.
   * @returns A new visitor for the AST of an expression.
   */
  createExpressionVisitor(inheritVariables = false) {
    if (inheritVariables) {
      return new ExpressionVisitor(this, this.mutables);
    }
    return new ExpressionVisitor(this);
  }

  // Chicken-and-egg method to prevent circular dependency with ExpressionVisitor
  /** @hidden */
  _createStatementVisitor(parent: ExpressionVisitor) {
    return new StatementVisitor(parent);
  }

  /**
   * Convert the state of this statement visitor into a block of text in the SonicWeave DSL. Only intended for the user scope just above the global scope.
   * @param defaultRootContext Root context for determining if root pitch declaration must be included.
   * @returns A string that when evaluated should recreate the same runtime state.
   */
  expand(defaultRootContext: RootContext) {
    if (!this.isUserRoot) {
      throw new Error('Only the user root scope may be expanded.');
    }
    if (!this.rootContext) {
      throw new Error('Root context must be present during expansion.');
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
      if (this.imported.has(key)) {
        continue;
      }
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
    const scale = this.currentScale;
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

  /**
   * Visit a node in the abstract syntax tree.
   * @param node The AST node of the statement to evaluate.
   * @returns An interrupt if encountered. `undefined` otherwise.
   */
  visit(node: Statement): Interrupt | undefined {
    this.spendGas();
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
      case 'DeferStatement':
        return this.visitDeferStatement(node);
      case 'ModuleDeclaration':
        return this.visitModuleDeclaration(node);
      case 'ExportConstantStatement':
        return this.visitExportConstantStatement(node);
      case 'ExportFunctionStatement':
        return this.visitExportFunctionStatement(node);
      case 'ExportAllStatement':
        return this.visitExportAllStatement(node);
      case 'ImportStatement':
        return this.visitImportStatement(node);
      case 'ImportAllStatement':
        return this.visitImportAllStatement(node);
      case 'MosDeclaration':
        return this.visitMosDeclaration(node);
      case 'DeleteStatement':
        return this.visitDeleteStatement(node);
      case 'EmptyStatement':
        return;
    }
    node satisfies never;
  }

  protected visitDeleteStatement(node: DeleteStatement) {
    const subVisitor = this.createExpressionVisitor();
    const entry = node.entry;
    const object = arrayRecordOrString(subVisitor.visit(entry.object));
    if (typeof object === 'string') {
      throw new Error('Strings are immutable.');
    }
    if (entry.type === 'AccessExpression') {
      if (!Array.isArray(object)) {
        const key = subVisitor.visit(entry.key);
        if (!(typeof key === 'string')) {
          throw new Error('Record keys must be strings.');
        }
        if (!hasOwn(object, key) && !entry.nullish) {
          throw new Error(`Key error: "${key}".`);
        }
        delete object[key];
        return undefined;
      }
      let index = subVisitor.visit(entry.key);
      if (Array.isArray(index)) {
        const toDelete = new Set<number>();
        index = index.flat(Infinity);
        for (let i = 0; i < index.length; ++i) {
          const idx = index[i];
          if (!(typeof idx === 'boolean' || idx instanceof Interval)) {
            throw new Error(
              'Only booleans and intervals can be used as indices.'
            );
          }
          if (idx === true) {
            if (i >= object.length) {
              if (!entry.nullish) {
                throw new Error('Indexing boolean out of range.');
              }
            } else {
              toDelete.add(i);
            }
            continue;
          } else if (idx === false) {
            continue;
          }
          let j = idx.toInteger();
          if (j < 0) {
            j += object.length;
          }
          if (j < 0 || j >= object.length) {
            if (!entry.nullish) {
              throw new Error('Index out of range.');
            }
          } else {
            toDelete.add(j);
          }
        }
        // Delete elements from largest to smallest.
        for (const i of Array.from(toDelete).sort((a, b) => b - a)) {
          object.splice(i, 1);
        }
        return undefined;
      }
      if (!(index instanceof Interval)) {
        throw new Error('Array delete access with a non-integer.');
      }
      let i = index.toInteger();
      if (i < 0) {
        i += object.length;
      }
      if (i < 0 || i >= object.length) {
        if (entry.nullish) {
          return undefined;
        }
        throw new Error('Index out of range.');
      }
      object.splice(i, 1);
      return undefined;
    }

    entry.type satisfies 'ArraySlice';
    if (!Array.isArray(object)) {
      throw new Error('Array slice delete on non-array.');
    }
    if (
      entry.start === null &&
      entry.second === null &&
      entry.penultimate === false &&
      entry.end === null
    ) {
      object.length = 0;
      return undefined;
    }

    // TODO: Refactor bounds calculation to be shared with ExpressionVisitor.visitArraySlice.
    let start = 0;
    let step = 1;
    const pu = entry.penultimate;
    let end = -1;

    if (entry.start) {
      const interval = subVisitor.visit(entry.start);
      if (!(interval instanceof Interval)) {
        throw new Error('Slice indices must consist of intervals.');
      }
      start = interval.toInteger();
    }

    if (entry.end) {
      const interval = subVisitor.visit(entry.end);
      if (!(interval instanceof Interval)) {
        throw new Error('Slice indices must consist of intervals.');
      }
      end = interval.toInteger();
    }

    if (entry.second) {
      const second = subVisitor.visit(entry.second);
      if (!(second instanceof Interval)) {
        throw new Error('Slice indices must consist of intervals.');
      }
      step = second.toInteger() - start;
    }

    if (start < 0) {
      start += object.length;
    }
    if (end < 0) {
      end += object.length;
    }

    const toDelete = new Set<number>();

    if (step > 0) {
      start = Math.max(0, start);
      if ((pu ? start >= end : start > end) || start >= object.length) {
        return undefined;
      }
      end = Math.min(object.length - 1, end);

      toDelete.add(start);
      let next = start + step;
      while (pu ? next < end : next <= end) {
        toDelete.add(next);
        next += step;
      }
    } else if (step < 0) {
      start = Math.min(object.length - 1, start);
      if ((pu ? start <= end : start < end) || start < 0) {
        return undefined;
      }
      end = Math.max(0, end);

      toDelete.add(start);
      let next = start + step;
      while (pu ? next > end : next >= end) {
        toDelete.add(next);
        next += step;
      }
    } else {
      throw new Error('Slice step must not be zero.');
    }
    // Delete elements from largest to smallest.
    for (const i of Array.from(toDelete).sort((a, b) => b - a)) {
      object.splice(i, 1);
    }
    return undefined;
  }

  protected visitMosDeclaration(node: MosDeclaration) {
    if (!this.rootContext) {
      throw new Error('Root context is required.');
    }
    if (!node.body.length) {
      this.rootContext.mosConfig = undefined;
      return undefined;
    }
    const subVisitor = this.createExpressionVisitor();
    const mosPiglet = new Tardigrade(subVisitor);
    for (const expression of node.body) {
      mosPiglet.visit(expression);
    }
    this.rootContext.mosConfig = mosPiglet.createMosConfig();
    return undefined;
  }

  protected visitModuleDeclaration(node: ModuleDeclaration) {
    const sisterVisitor = new StatementVisitor(this.parent);
    const body = [...node.body];
    // Extract docstring
    let docstring = '';
    if (
      body.length &&
      body[0].type === 'ExpressionStatement' &&
      body[0].expression.type === 'StringLiteral'
    ) {
      docstring = body[0].expression.value;
      body.shift();
    }

    const interrupt = sisterVisitor.executeStatements(body);
    if (interrupt) {
      throw new Error(`Illegal ${interrupt.type}.`);
    }
    const exports = sisterVisitor.exports;
    exports.set(MODULE_DOCSTRING, docstring);
    this.modules.set(node.name, exports);
    return undefined;
  }

  protected visitExportConstantStatement(node: ExportConstantStatement) {
    const name = node.parameter.id;
    if (this.immutables.has(name) || this.mutables.has(name)) {
      throw new Error(`Name ${name} already exists in current scope.`);
    }
    if (this.exports.has(name)) {
      throw new Error(`Cannot re-export ${name}.`);
    }
    if (!node.parameter.defaultValue) {
      throw new Error('An exported value is required.');
    }
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.parameter.defaultValue);
    this.exports.set(name, value);
    this.immutables.set(name, value);
    return undefined;
  }

  protected visitExportFunctionStatement(node: ExportFunctionStatement) {
    const name = node.name.id;
    if (this.immutables.has(name) || this.mutables.has(name)) {
      throw new Error(`Name ${name} already exists in current scope.`);
    }
    if (this.exports.has(name)) {
      throw new Error(`Cannot re-export ${name}.`);
    }

    const value = this.realizeFunction(node);
    this.exports.set(node.name.id, value);
    this.immutables.set(name, value);
    return undefined;
  }

  protected getModule(name: string): SonicWeaveModule {
    if (this.modules.has(name)) {
      return this.modules.get(name)!;
    }
    if (this.parent && this.parent instanceof StatementVisitor) {
      return this.parent.getModule(name);
    }
    throw new Error(`Module ${name} not found.`);
  }

  protected visitExportAllStatement(node: ExportAllStatement) {
    const exports = this.getModule(node.module);
    for (const [name, value] of exports) {
      if (name === MODULE_DOCSTRING) {
        continue;
      }
      if (this.exports.has(name)) {
        throw new Error(`Export * would overwrite ${name}.`);
      }
      this.exports.set(name, value);
    }
    return undefined;
  }

  protected visitImportStatement(node: ImportStatement) {
    const exports = this.getModule(node.module);
    for (const element of node.elements) {
      const alias = element.alias ?? element.id;
      if (this.immutables.has(alias)) {
        throw new Error(`Name ${alias} is already in use.`);
      }
      if (!exports.has(element.id)) {
        throw new Error(`Module does not export name ${element.id}.`);
      }
      const value = exports.get(element.id);
      this.immutables.set(alias, value);
      this.imported.add(alias);
    }
    return undefined;
  }

  protected visitImportAllStatement(node: ImportAllStatement) {
    const exports = this.getModule(node.module);
    for (const [name, value] of exports) {
      if (name === MODULE_DOCSTRING) {
        continue;
      }
      if (this.immutables.has(name)) {
        throw new Error(`Import * would overwrite ${name}.`);
      }
      this.immutables.set(name, value);
      this.imported.add(name);
    }
    return undefined;
  }

  protected visitDeferStatement(node: DeferStatement) {
    this.deferred.push(node.body);
    return undefined;
  }

  protected visitReturnStatement(node: ReturnStatement) {
    let value: SonicWeaveValue;
    if (node.argument) {
      const subVisitor = this.createExpressionVisitor();
      value = subVisitor.visit(node.argument);
    }
    return new Interrupt(node, value);
  }

  protected visitBreakStatement(node: BreakStatement) {
    return new Interrupt(node);
  }

  protected visitContinueStatement(node: ContinueStatement) {
    return new Interrupt(node);
  }

  protected visitThrowStatement(node: ThrowStatement) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.argument);
    if (typeof value === 'string') {
      throw new Error(value);
    }
    throw value;
  }

  protected declareVariable(
    subVisitor: ExpressionVisitor,
    parameters: Parameter | Parameters_,
    mutable: boolean,
    value?: SonicWeaveValue
  ) {
    if (arguments.length < 4) {
      if (parameters.defaultValue !== null) {
        value = subVisitor.visit(parameters.defaultValue);
      } else if (parameters.type === 'Parameter' && !mutable) {
        throw new Error('Missing declared value.');
      }
    }
    if (parameters.type === 'Parameters') {
      if (value instanceof ValBasis) {
        value = value.toArray();
      }
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

  protected visitVariableDeclaration(node: VariableDeclaration) {
    const subVisitor = this.createExpressionVisitor();
    this.declareVariable(subVisitor, node.parameters, node.mutable);
    return undefined;
  }

  protected assign(name: Identifier | Identifiers, value: SonicWeaveValue) {
    if (name.type === 'Identifiers') {
      if (!Array.isArray(value)) {
        throw new Error('Destructuring assignment must use an array.');
      }
      for (let i = 0; i < name.identifiers.length; ++i) {
        this.assign(name.identifiers[i], value[i]);
      }
      if (name.rest) {
        this.assign(name.rest, value.slice(name.identifiers.length));
      }
    } else {
      const id = name.id;
      if (this.immutables.has(id)) {
        throw new Error('Assignment to a constant variable.');
      }
      this.set(id, value);
    }
  }

  protected visitAssignmentStatement(node: AssignmentStatement) {
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
        if (Array.isArray(index)) {
          if (!Array.isArray(value)) {
            throw new Error('Unrecoverable error in array assignment.');
          }
          let j = 0;
          for (let i = 0; i < index.length; ++i) {
            const idx = index[i];
            if (!(typeof idx === 'boolean' || idx instanceof Interval)) {
              throw new Error(
                'Only booleans and intervals can be used as indices.'
              );
            }
            if (idx === true) {
              object[i] = value[j++];
              continue;
            } else if (idx === false) {
              continue;
            }
            let k = idx.toInteger();
            if (k < 0) {
              k += object.length;
            }
            object[k] = value[j++];
          }
          return undefined;
        }
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

  protected freezeScale() {
    const a = absolute.bind(this.createExpressionVisitor());
    const scale = this.currentScale;
    const frozen = scale.map(i => a(i));
    scale.length = 0;
    scale.push(...frozen);
  }

  protected visitPitchDeclaration(node: PitchDeclaration) {
    if (!this.rootContext) {
      throw new Error('Root context required for pitch declaration.');
    }
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

      const newC4 = C4.mul(value.value).div(pitch.value);
      if (newC4 instanceof TimeReal) {
        throw new Error('Cannot declare a non-algebraic pitch.');
      }
      this.rootContext.C4 = newC4;
      // Coerce absolute reference to Hz
      if (this.rootContext.C4.timeExponent.n) {
        this.rootContext.C4 = this.rootContext.C4.pow(
          this.rootContext.C4.timeExponent.inverse().neg()
        ) as TimeMonzo;
      }

      if (!node.middle) {
        if (value.value instanceof TimeReal) {
          throw new Error('Cannot declare non-algebraic unison.');
        }
        // Implicit 1/1
        if (value.value.timeExponent.n) {
          this.freezeScale();
          const absolute = value.value;
          this.rootContext.unisonFrequency = absolute.pow(
            absolute.timeExponent.inverse().neg()
          ) as TimeMonzo;
        }
        return undefined;
      }
    }
    const left = subVisitor.visit(node.middle ?? node.left);
    const right = subVisitor.visit(node.right);
    if (!(left instanceof Interval && right instanceof Interval)) {
      throw new Error('Pitch declaration must evaluate to an interval.');
    }
    if (left.value instanceof TimeReal) {
      throw new Error('Cannot declare non-algebraic pitch.');
    }
    if (right.value instanceof TimeReal) {
      throw new Error('Cannot declare non-algebraic reference frequency.');
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
      if (!right.value.timeExponent.n) {
        throw new Error('Cannot assign relative pitch to relative pitch.');
      }
      absolute = right.value;
      relative = left.value;
    }
    this.freezeScale();
    this.rootContext.unisonFrequency = absolute
      .pow(absolute.timeExponent.inverse().neg())
      .div(relative) as TimeMonzo;
    return undefined;
  }

  protected visitUpDeclaration(node: UpDeclaration) {
    if (!this.rootContext) {
      throw new Error('Root context required for up declaration.');
    }
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.value);
    if (!(value instanceof Interval)) {
      throw new Error('Up declaration must evaluate to an interval.');
    }
    this.rootContext.up = value.shallowClone();
    return undefined;
  }

  protected visitLiftDeclaration(node: LiftDeclaration) {
    if (!this.rootContext) {
      throw new Error('Root context required for lift declaration.');
    }
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.value);
    if (!(value instanceof Interval)) {
      throw new Error('Lift declaration must evaluate to an interval.');
    }
    this.rootContext.lift = value.shallowClone();
    return undefined;
  }

  protected visitExpression(node: ExpressionStatement) {
    const subVisitor = this.createExpressionVisitor();
    const value = subVisitor.visit(node.expression);
    this.handleValue(value, subVisitor);
    return undefined;
  }

  /**
   * Handle a value by pushing it to the current scale or taking some other action depending on the type of the value.
   * @param value Value understood by the SonicWeave runtime.
   * @param subVisitor Currently active expression evaluator.
   */
  handleValue(value: SonicWeaveValue, subVisitor: ExpressionVisitor) {
    const scale = this.currentScale;
    if (value instanceof Color) {
      for (let i = 0; i < scale.length; ++i) {
        if (scale[i].color === undefined) {
          scale[i] = scale[i].shallowClone();
          scale[i].color = value;
        }
      }
    } else if (value instanceof Interval) {
      scale.push(value);
    } else if (value instanceof Val) {
      this.spendGas(scale.length);
      const mapped = temper.bind(subVisitor)(value, scale) as Interval[];
      scale.length = 0;
      scale.push(...mapped);
    } else if (Array.isArray(value)) {
      this.handleArray(value);
    } else if (value === undefined) {
      /* Do nothing */
    } else if (typeof value === 'string') {
      if (!this.rootContext) {
        throw new Error('No root context found for storing scale title.');
      }
      if (!this.isUserRoot) {
        throw new Error('Scale title must be given at root level.');
      }
      this.rootContext.title = value;
    } else if (typeof value === 'boolean') {
      scale.push(upcastBool(value));
    } else if (value instanceof ValBasis) {
      this.spendGas(scale.length);
      const rebased: Interval[] = [];
      for (const interval of scale) {
        rebased.push(value.intrinsicCall(interval));
      }
      scale.length = 0;
      scale.push(...rebased);
    } else if (value instanceof Temperament) {
      this.spendGas(scale.length);
      const tempered: Interval[] = [];
      for (const interval of scale) {
        const monzo = value.temper(interval.value);
        tempered.push(
          new Interval(
            monzo,
            'logarithmic',
            interval.steps,
            undefined,
            interval
          )
        );
      }
      scale.length = 0;
      scale.push(...tempered);
    } else if (typeof value === 'object') {
      const entries = Object.entries(value);
      for (const [key, subValue] of entries) {
        this.handleValue(subVisitor.implicitCall(key, subValue), subVisitor);
      }
      const tail = scale.slice(-entries.length);
      scale.length = scale.length - tail.length;
      sortInPlace.bind(subVisitor)(tail);
      scale.push(...tail);
    } else {
      this.spendGas(scale.length);
      const bound = value.bind(subVisitor);
      const mapped = scale.map(i => bound(i));
      scale.length = 0;
      this.handleArray(mapped);
    }
  }

  protected handleArray(array: SonicWeavePrimitive[]) {
    const scale = this.currentScale;
    const result = [...this.currentScale];
    for (let i = 0; i < array.length; ++i) {
      const value = array[i];
      if (value instanceof Interval || typeof value === 'boolean') {
        result.push(upcastBool(value));
        continue;
      } else if (Array.isArray(value)) {
        for (const subValue of value.flat(Infinity)) {
          if (subValue instanceof Interval || typeof subValue === 'boolean') {
            result.push(upcastBool(subValue));
          } else {
            throw new Error('Nested pushed array elements must be intervals.');
          }
        }
        continue;
      }
      if (i >= scale.length) {
        continue;
      }
      if (value instanceof Color) {
        result[i] = result[i].shallowClone();
        result[i].color = value;
      } else if (value === undefined) {
        result[i] = result[i].shallowClone();
        result[i].color = undefined;
      } else if (typeof value === 'string') {
        result[i] = result[i].shallowClone();
        result[i].label = value;
      } else {
        throw new Error(
          'A pushed array element must be color, string, niente or interval.'
        );
      }
    }
    scale.length = 0;
    scale.push(...result);
  }

  /**
   * Execute the abstract syntax tree of a SonicWeave program.
   * @param program Program containing the AST to be executed.
   */
  executeProgram(program: Program) {
    const interrupt = this.executeStatements(program.body);
    if (interrupt) {
      throw new Error(`Illegal ${interrupt.type}.`);
    }
  }

  /**
   * Execute an array of SonicWeave statements from an abstract syntax tree.
   * @param body The AST nodes to be executed.
   * @returns An interrupt or undefined if none encountered.
   */
  executeStatements(body: Statement[]): Interrupt | undefined {
    let interrupt: Interrupt | undefined = undefined;
    for (const statement of body) {
      interrupt = this.visit(statement);
      if (interrupt) {
        break;
      }
    }
    while (this.deferred.length) {
      const badInterrupt = this.visit(this.deferred.pop()!);
      if (badInterrupt) {
        throw new Error(
          `Illegal ${badInterrupt.type} inside a deferred block.`
        );
      }
    }
    return interrupt;
  }

  protected visitBlockStatement(node: BlockStatement) {
    const subVisitor = new StatementVisitor(this);
    const scale = this.currentScale;
    subVisitor.mutables.set('$$', scale);
    const interrupt = subVisitor.executeStatements(node.body);
    if (interrupt?.type === 'ReturnStatement') {
      return interrupt;
    }
    const subScale = subVisitor.currentScale;
    scale.push(...subScale);
    return interrupt;
  }

  protected visitWhileStatement(node: WhileStatement) {
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

  protected declareLoopElement(
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

  protected visitIterationStatement(node: IterationStatement) {
    const subVisitor = this.createExpressionVisitor();
    const array = containerToArray(subVisitor.visit(node.container), node.kind);
    const loopVisitor = new StatementVisitor(this);
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

  protected visitTryStatement(node: TryStatement) {
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
        const handlerVisitor = new StatementVisitor(this);
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

  protected visitIfStatement(node: IfStatement) {
    const subVisitor = this.createExpressionVisitor();
    if (sonicTruth(subVisitor.visit(node.test))) {
      return this.visit(node.consequent);
    }
    if (node.alternate) {
      return this.visit(node.alternate);
    }
    return undefined;
  }

  protected realizeFunction(
    node: FunctionDeclaration | ExportFunctionStatement
  ) {
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
      const localVisitor = new StatementVisitor(scopeParent);
      localVisitor.mutables.set('$$', this.parent.currentScale);

      // XXX: Poor type system gets abused again.
      // XXX: Abuse variable injection by sharing state.
      const localSubvisitor = localVisitor.createExpressionVisitor(true);
      localSubvisitor.localAssign(node.parameters, args as Interval[]);

      const interrupt = localVisitor.executeStatements(node.body);
      if (interrupt?.type === 'ReturnStatement') {
        return interrupt.value;
      } else if (interrupt) {
        throw new Error(`Illegal ${interrupt.type}.`);
      }
      return localVisitor.currentScale;
    }
    Object.defineProperty(realization, 'name', {
      value: node.name.id,
      enumerable: false,
    });
    realization.__doc__ = docstring;
    realization.__node__ = node;

    return realization;
  }

  protected visitFunctionDeclaration(node: FunctionDeclaration) {
    const name = node.name.id;
    if (this.immutables.has(name) || this.mutables.has(name)) {
      throw new Error(`The name ${name} is already in use.`);
    }

    this.immutables.set(name, this.realizeFunction(node));
    return undefined;
  }

  /**
   * Get the value of a variable in the current context.
   * @param name Name of the variable.
   * @returns Value of the variable.
   * @throws An error if there is no variable declared under the given name.
   */
  get(name: string): SonicWeaveValue {
    if (this.immutables.has(name)) {
      return this.immutables.get(name);
    }
    if (this.mutables.has(name)) {
      return this.mutables.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    throw new Error(`Undeclared variable ${name}.`);
  }

  /**
   * Set the value of a variable in the current context.
   * @param name Name of the variable.
   * @param value Value for the variable.
   * @throws An error if there is no variable declared under the given name or the given variable is declared constant.
   */
  set(name: string, value: SonicWeaveValue): void {
    if (this.immutables.has(name)) {
      throw new Error('Assignment to a constant variable.');
    }
    if (this.mutables.has(name)) {
      this.mutables.set(name, value);
      return;
    }
    if (this.parent) {
      return this.parent.set(name, value);
    }
    throw new Error(`Assignment to an undeclared variable ${name}.`);
  }

  /**
   * Get the array of {@link Interval} instances accumulated in the current context.
   * @returns An array of intervals. (Assuming the user hasn't corrupted the context.)
   */
  get currentScale(): Interval[] {
    const result = this.get('$') as Interval[];
    if (!Array.isArray(result)) {
      throw new Error('Context corruption detected.');
    }
    return result;
  }

  /**
   * Set an array of {@link Interval} instances as the current scale where new intervals are accumulated.
   */
  set currentScale(scale: Interval[]) {
    if (!Array.isArray(scale)) {
      throw new Error('Context corruption not allowed.');
    }
    this.set('$', scale);
  }
}
