import {Fraction, gcd} from 'xen-dev-utils';
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
} from '../expression';
import {
  Interval,
  Color,
  intervalValueAs,
  infect,
  log,
  Val,
  IntervalDomain,
} from '../interval';
import {TimeMonzo, TimeReal} from '../monzo';
import {
  SonicWeaveValue,
  sonicTruth,
  linearOne,
  SonicWeaveFunction,
  compare,
  upcastBool,
  SonicWeavePrimitive,
  temper,
  fromInteger,
} from '../stdlib';
import {
  metricExponent,
  ZERO,
  ONE,
  NEGATIVE_ONE,
  hasOwn,
  binaryExponent,
  MetricPrefix,
  BinaryPrefix,
  F,
} from '../utils';
import {pythagoreanMonzo, absoluteMonzo} from '../pythagorean';
import {inflect} from '../fjs';
import {
  STEP_ELEMENT,
  inferEquave,
  parseSubgroup,
  parseValSubgroup,
  sparseOffsetToVal,
  valToTimeMonzo,
  wartsToVal,
} from '../warts';
import {RootContext} from '../context';
import {
  Argument,
  AccessExpression,
  ArrayComprehension,
  ArrayLiteral,
  ArraySlice,
  ArrowFunction,
  BinaryExpression,
  CallExpression,
  ConditionalExpression,
  DownExpression,
  EnumeratedChord,
  Expression,
  HarmonicSegment,
  Identifier,
  Parameter,
  Parameters_,
  Range,
  RecordLiteral,
  UnaryExpression,
  IterationKind,
  TemplateArgument,
  UpdateExpression,
  UpdateOperator,
} from '../ast';
import {type StatementVisitor} from './statement';

/**
 * Local context within a SonicWeave code block or a function.
 */
export type VisitorContext = Map<string, SonicWeaveValue>;

export function arrayRecordOrString(
  value: SonicWeaveValue,
  message = 'Array, record or string expected.'
) {
  if (typeof value === 'string') {
    return value;
  }
  if (
    typeof value !== 'object' ||
    value instanceof Interval ||
    value instanceof Val ||
    value instanceof Color
  ) {
    throw new Error(message);
  }
  return value;
}

export function containerToArray(
  container: SonicWeaveValue,
  kind: IterationKind
) {
  container = arrayRecordOrString(
    container,
    'Can only iterate over arrays, records or strings.'
  );
  if (typeof container === 'string') {
    container = [...container];
  }
  if (Array.isArray(container)) {
    if (kind === 'in') {
      container = container.map((_, i) => Interval.fromInteger(i));
    }
  } else {
    if (kind === 'of') {
      container = Object.values(container);
    } else {
      container = Object.keys(container);
    }
  }
  return container;
}

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

const TWO_MONZO = new TimeMonzo(ZERO, [ONE]);
const TEN_MONZO = new TimeMonzo(ZERO, [ONE, ZERO, ONE]);
const KIBI_MONZO = new TimeMonzo(ZERO, [F(10)]);
const CENT_MONZO = new TimeMonzo(ZERO, [F(1, 1200)]);
const CENT_REAL = new TimeReal(0, 1.0005777895065548);
const RECIPROCAL_CENT_MONZO = new TimeMonzo(ZERO, [F(1200)]);

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
  value: TimeMonzo | TimeReal,
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
      resolvedNode = intervalValueAs(value, left.node, simplify);
    }
    return new Interval(value, domain, 0, resolvedNode, infect(left, right));
  }
  if (node.preferLeft) {
    return new Interval(
      value,
      left.domain,
      0,
      intervalValueAs(value, left.node, simplify),
      left
    );
  }
  return new Interval(
    value,
    right.domain,
    0,
    intervalValueAs(value, right.node, simplify),
    right
  );
}

function unaryMapContainer(
  this: ExpressionVisitor,
  container: SonicWeaveValue,
  fn: (x: SonicWeavePrimitive) => SonicWeaveValue
) {
  if (Array.isArray(container)) {
    this.spendGas(container.length);
    return container.map(fn) as SonicWeavePrimitive[];
  }
  if (typeof container !== 'object') {
    throw new Error('Invalid container to map over.');
  }
  if (
    container instanceof Color ||
    container instanceof Val ||
    container instanceof Interval
  ) {
    throw new Error('Invalid container to map over.');
  }
  const entries = Object.entries(container);
  this.spendGas(entries.length);
  return Object.fromEntries(
    entries.map(([key, value]) => [key, fn(value)])
  ) as Record<string, SonicWeavePrimitive>;
}

/**
 * Boardcast containers together and map a binary function over them.
 */
function binaryMapContainers(
  this: ExpressionVisitor,
  left: SonicWeaveValue,
  right: SonicWeaveValue,
  fn: (x: SonicWeavePrimitive, y: SonicWeavePrimitive) => SonicWeaveValue
): SonicWeaveValue {
  if (Array.isArray(left)) {
    if (Array.isArray(right)) {
      if (left.length !== right.length) {
        throw new Error(
          `Unable to broadcast arrays together with lengths ${left.length} and ${right.length}.`
        );
      }
      this.spendGas(left.length);
      return left.map((l, i) => fn(l, right[i])) as SonicWeaveValue;
    }
    if (
      typeof right === 'object' &&
      !(
        right instanceof Color ||
        right instanceof Interval ||
        right instanceof Val
      )
    ) {
      right satisfies Record<string, SonicWeavePrimitive>;
      throw new Error('Unable to broadcast an array and record together.');
    }
    this.spendGas(left.length);
    return left.map(l => fn(l, right)) as SonicWeaveValue;
  }
  if (
    typeof left === 'object' &&
    !(left instanceof Color || left instanceof Interval || left instanceof Val)
  ) {
    left satisfies Record<string, SonicWeavePrimitive>;
    if (Array.isArray(right)) {
      throw new Error('Unable to broadcast an array and record together.');
    }
    const entries = Object.entries(left);
    if (
      typeof right === 'object' &&
      !(
        right instanceof Color ||
        right instanceof Interval ||
        right instanceof Val
      )
    ) {
      right satisfies Record<string, SonicWeavePrimitive>;
      for (const key in right) {
        if (!(key in left)) {
          throw new Error(`Unable broadcast records together on key ${key}.`);
        }
      }
      const resultEntries: [string, SonicWeavePrimitive][] = [];
      for (const [key, value] of entries) {
        if (!(key in right)) {
          throw new Error(`Unable broadcast records together on key ${key}.`);
        }
        this.spendGas();
        resultEntries.push([key, fn(value, right[key]) as SonicWeavePrimitive]);
      }
      return Object.fromEntries(resultEntries);
    }
    this.spendGas(entries.length);
    return Object.fromEntries(
      entries.map(([key, value]) => [
        key,
        fn(value, right) as SonicWeavePrimitive,
      ])
    );
  }
  if (Array.isArray(right)) {
    this.spendGas(right.length);
    return right.map(r => fn(left, r)) as SonicWeaveValue;
  }
  if (
    typeof right !== 'object' ||
    right instanceof Color ||
    right instanceof Interval ||
    right instanceof Val
  ) {
    throw new Error('Invalid container broadcast.');
  }
  right satisfies Record<string, SonicWeavePrimitive>;
  const entries = Object.entries(right);
  this.spendGas(entries.length);
  return Object.fromEntries(
    entries.map(([key, value]) => [key, fn(left, value) as SonicWeavePrimitive])
  );
}

/**
 * Abstract syntax tree visitor for SonicWeave expressions.
 */
export class ExpressionVisitor {
  /**
   * Local context inside arrow functions and array comprehensions.
   */
  mutables: VisitorContext;
  /**
   * Parent context containing a particular expression statement.
   */
  parent: StatementVisitor;

  /**
   * Construct a new visitor for an {@link ExpressionStatement} inside the AST.
   * @param parent Parent context containing the expression statement to be visited.
   */
  constructor(parent: StatementVisitor, mutables?: VisitorContext) {
    this.mutables = mutables ?? new Map();
    this.parent = parent;
  }

  /**
   * Get the root context with the current values of the root pitch, ups, lifts, etc.
   */
  get rootContext(): RootContext | undefined {
    return this.parent.rootContext;
  }

  /**
   * Set the root context with the current values of the root pitch, ups, lifts, etc.
   *
   * Warning: Modifies parent context!
   */
  set rootContext(context: RootContext | undefined) {
    this.parent.rootContext = context;
  }

  /**
   * Get the array of {@link Interval} instances accumulated in the current context.
   * @returns An array of intervals. (Assuming the user hasn't corrupted the context.)
   */
  get currentScale(): Interval[] {
    return this.parent.currentScale;
  }

  /**
   * Set an array of {@link Interval} instances as the current scale where new intervals are accumulated.
   */
  set currentScale(scale: Interval[]) {
    this.parent.currentScale = scale;
  }

  spendGas(amount?: number) {
    this.parent.spendGas(amount);
  }

  /**
   * Visit a node in the abstract syntax tree and evaluate to a value.
   * @param node The AST node of the expression to evaluate.
   * @returns The result of evaluation.
   */
  visit(node: Expression): SonicWeaveValue {
    this.spendGas();
    switch (node.type) {
      case 'ConditionalExpression':
        return this.visitConditionalExpression(node);
      case 'AccessExpression':
        return this.visitAccessExpression(node);
      case 'ArraySlice':
        return this.visitArraySlice(node);
      case 'UnaryExpression':
        return this.visitUnaryExpression(node);
      case 'UpdateExpression':
        return this.visitUpdateExpression(node);
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
      case 'NedjiLiteral':
        return this.visitNedjiLiteral(node);
      case 'CentsLiteral':
        return this.visitCentsLiteral(node);
      case 'CentLiteral':
        if (node.real) {
          return new Interval(CENT_REAL, 'logarithmic', 0, node);
        }
        return new Interval(CENT_MONZO, 'logarithmic', 0, node);
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
      case 'RecordLiteral':
        return this.visitRecordLiteral(node);
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
      case 'TemplateArgument':
        return this.visitTemplateArgument(node);
    }
    node satisfies never;
  }

  protected visitTemplateArgument(node: TemplateArgument) {
    if (!this.rootContext) {
      throw new Error('Root context required to access template arguments.');
    }
    return this.rootContext.templateArguments[node.index];
  }

  protected visitSquareSuperparticular(node: SquareSuperparticular) {
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
        0,
        node
      );
    }
    const s = node.start * node.start;
    return new Interval(
      TimeMonzo.fromBigNumeratorDenominator(s, s - 1n),
      'logarithmic',
      0,
      node
    );
  }

  /**
   * Assign arguments to their corresponding parameter(s) in the current context.
   * @param name Name(s) of the parameters and their default values.
   * @param arg The argument/value to assign to the local variables.
   */
  localAssign(name: Parameter | Parameters_, arg?: SonicWeaveValue) {
    if (arguments.length < 2) {
      if (name.defaultValue) {
        arg = this.visit(name.defaultValue);
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
          this.localAssign(name.parameters[i], arg[i]);
        } else {
          this.localAssign(name.parameters[i]);
        }
      }
      if (name.rest) {
        this.localAssign(name.rest, arg.slice(name.parameters.length));
      }
    } else {
      this.mutables.set(name.id, arg);
    }
  }

  protected comprehend(
    node: ArrayComprehension,
    result: SonicWeavePrimitive[],
    index: number
  ) {
    if (index >= node.comprehensions.length) {
      if (node.test && !sonicTruth(this.visit(node.test))) {
        return;
      }
      result.push(this.visit(node.expression) as SonicWeavePrimitive);
      return;
    }
    const comprehension = node.comprehensions[index];
    const array = containerToArray(
      this.visit(comprehension.container),
      comprehension.kind
    );
    const element = comprehension.element;
    for (const value of array) {
      this.localAssign(element, value);
      this.comprehend(node, result, index + 1);
    }
  }

  protected visitArrayComprehension(node: ArrayComprehension) {
    const result: SonicWeavePrimitive[] = [];
    this.comprehend(node, result, 0);
    this.mutables.clear();

    return result;
  }

  protected spread(args: Argument[]): SonicWeavePrimitive[] {
    const result: SonicWeavePrimitive[] = [];
    for (const arg of args) {
      if (arg.spread) {
        result.push(...(this.visit(arg.expression) as SonicWeavePrimitive[]));
      } else {
        result.push(this.visit(arg.expression) as SonicWeavePrimitive);
      }
    }
    return result;
  }

  // We cheat here to simplify the type hierarchy definition (no nested arrays).
  protected visitArrayLiteral(node: ArrayLiteral): SonicWeavePrimitive[] {
    return this.spread(node.elements);
  }

  protected visitRecordLiteral(
    node: RecordLiteral
  ): Record<string, SonicWeavePrimitive> {
    const result: Record<string, SonicWeavePrimitive> = {};
    for (const [key, value] of node.properties) {
      if (key === null) {
        const spread = this.visit(value);
        if (
          typeof spread !== 'object' ||
          spread instanceof Interval ||
          spread instanceof Val ||
          spread instanceof Color ||
          Array.isArray(spread)
        ) {
          throw new Error('Spread argument must be a record.');
        }
        for (const [subKey, subValue] of Object.entries(spread)) {
          result[subKey] = subValue;
        }
      } else {
        result[key] = this.visit(value) as SonicWeavePrimitive;
      }
    }
    return result;
  }

  protected visitStepLiteral(node: StepLiteral) {
    const value = new TimeMonzo(ZERO, []);
    return new Interval(value, 'logarithmic', node.count, node);
  }

  protected down(
    operand: SonicWeaveValue,
    count: number
  ): Interval | Interval[] {
    if (!this.rootContext) {
      throw new Error('Root context required for down.');
    }
    if (Array.isArray(operand)) {
      const d = this.down.bind(this);
      return operand.map(x => d(x, count)) as Interval[];
    }
    return upcastBool(operand).down(this.rootContext, count);
    throw new Error('Can only apply down arrows to intervals and vals');
  }

  protected visitDownExpression(node: DownExpression) {
    const operand = this.visit(node.operand);
    return this.down(operand, node.count);
  }

  protected visitConditionalExpression(node: ConditionalExpression) {
    const test = this.visit(node.test);
    if (sonicTruth(test)) {
      return this.visit(node.consequent);
    }
    return this.visit(node.alternate);
  }

  protected visitComponent(component: VectorComponent) {
    // XXX: This is so backwards...
    return new Fraction(formatComponent(component));
  }

  protected upLift(
    value: TimeMonzo | TimeReal,
    node: MonzoLiteral | FJS | AbsoluteFJS
  ) {
    if (!this.rootContext) {
      throw new Error('Root context required for uplift.');
    }
    value = value
      .mul(this.rootContext.up.value.pow(node.ups))
      .mul(this.rootContext.lift.value.pow(node.lifts));
    return new Interval(
      value,
      'logarithmic',
      this.rootContext.up.steps * node.ups +
        this.rootContext.lift.steps * node.lifts,
      node
    );
  }

  protected visitMonzoLiteral(node: MonzoLiteral) {
    const exponents = node.components.map(this.visitComponent);
    let value: TimeMonzo | TimeReal;
    let steps = ZERO;
    if (node.basis.length) {
      const {subgroup} = parseSubgroup(node.basis, exponents.length);
      if (exponents.length > subgroup.length) {
        throw new Error('Too many monzo components for given subgroup.');
      }
      value = new TimeMonzo(ZERO, []);
      for (let i = 0; i < exponents.length; ++i) {
        const element = subgroup[i];
        if (element === STEP_ELEMENT) {
          steps = steps.add(exponents[i]);
        } else {
          value = value.mul(element.pow(exponents[i]));
        }
      }
    } else {
      value = new TimeMonzo(ZERO, exponents);
    }
    const result = this.upLift(value, node);
    if (steps.d !== 1) {
      throw new Error('Cannot create fractional steps.');
    }
    result.steps += steps.valueOf();
    if (node.ups || node.lifts) {
      // Uplift already throws if context is missing.
      this.rootContext!.fragiles.push(result);
    }
    return result;
  }

  protected visitValLiteral(node: ValLiteral) {
    const val = node.components.map(this.visitComponent);
    let value: TimeMonzo;
    let equave = TWO_MONZO;
    if (node.basis.length) {
      const {subgroup} = parseValSubgroup(node.basis, val.length);
      if (val.length !== subgroup.length) {
        throw new Error('Val components must be given for the whole subgroup.');
      }
      value = valToTimeMonzo(val, subgroup);
      equave = subgroup[0];
    } else {
      value = new TimeMonzo(ZERO, val);
    }
    return new Val(value, equave, node);
  }

  protected project(
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

  protected visitWartsLiteral(node: WartsLiteral) {
    const val = wartsToVal(node);
    const equave = inferEquave(node);
    if (!equave) {
      throw new Error('Failed to infer wart equave.');
    }
    return new Val(val, equave, node);
  }

  protected visitSparseOffsetVal(node: SparseOffsetVal) {
    const val = sparseOffsetToVal(node);
    let equave = TWO_MONZO;
    if (node.equave) {
      equave = TimeMonzo.fromFraction(
        new Fraction(node.equave.numerator, node.equave.denominator ?? 1)
      );
    }
    return new Val(val, equave, node);
  }

  protected visitFJS(node: FJS) {
    const monzo = inflect(
      pythagoreanMonzo(node.pythagorean),
      node.superscripts,
      node.subscripts
    );
    const result = this.upLift(monzo, node);
    this.rootContext!.fragiles.push(result);
    return result;
  }

  protected visitAbsoluteFJS(node: AbsoluteFJS) {
    const relativeToC4 = inflect(
      absoluteMonzo(node.pitch),
      node.superscripts,
      node.subscripts
    );
    const upLifted = this.upLift(relativeToC4, node);
    const result = new Interval(
      this.rootContext!.C4.mul(upLifted.value),
      'logarithmic',
      upLifted.steps,
      node
    );
    this.rootContext!.fragiles.push(result);
    return result;
  }

  protected visitAccessExpression(node: AccessExpression): SonicWeaveValue {
    const object = arrayRecordOrString(
      this.visit(node.object),
      'Can only access arrays, records or strings.'
    );
    if (!Array.isArray(object) && typeof object !== 'string') {
      const key = this.visit(node.key);
      if (!(typeof key === 'string')) {
        throw new Error('Record keys must be strings.');
      }
      if (!hasOwn(object, key)) {
        if (node.nullish) {
          return undefined;
        }
        throw new Error(`Key error: "${key}".`);
      }
      return object[key];
    }
    let index = this.visit(node.key);
    if (Array.isArray(index)) {
      index = index.flat(Infinity);
      const result: SonicWeavePrimitive[] = [];
      for (let i = 0; i < index.length; ++i) {
        const idx = index[i];
        if (!(typeof idx === 'boolean' || idx instanceof Interval)) {
          throw new Error(
            'Only booleans and intervals can be used as indices.'
          );
        }
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

  protected visitArraySlice(node: ArraySlice): Interval[] | string {
    const object = this.visit(node.object);
    if (!Array.isArray(object) && typeof object !== 'string') {
      throw new Error('Array slice on non-array.');
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
        throw new Error('Slice indices must consist of intervals.');
      }
      start = Number(interval.value.toBigInteger());
    }

    if (node.end) {
      const interval = this.visit(node.end);
      if (!(interval instanceof Interval)) {
        throw new Error('Slice indices must consist of intervals.');
      }
      end = Number(interval.value.toBigInteger());
    }

    if (node.second) {
      const second = this.visit(node.second);
      if (!(second instanceof Interval)) {
        throw new Error('Slice indices must consist of intervals.');
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
    throw new Error('Slice step must not be zero.');
  }

  protected unaryOperate(
    operand: SonicWeaveValue,
    node: UnaryExpression
  ): Interval | Interval[] | Val {
    if (Array.isArray(operand)) {
      const op = this.unaryOperate.bind(this);
      return operand.map(o => op(o, node)) as Interval[];
    }
    if (typeof operand === 'boolean') {
      operand = upcastBool(operand);
    }
    if (!(operand instanceof Interval || operand instanceof Val)) {
      throw new Error(
        `${node.operator} can only operate on intervals and vals.`
      );
    }
    const operator = node.operator;
    if (node.uniform) {
      let value: TimeMonzo | TimeReal;
      let newNode = operand.node;
      switch (operator) {
        case '-':
          value = operand.value.neg();
          break;
        case '%':
        case '÷':
          value = operand.value.inverse();
          newNode = uniformInvertNode(newNode);
          break;
        default:
          // The grammar shouldn't let you get here.
          throw new Error('Uniform operation not supported.');
      }
      if (operand.domain === 'cologarithmic') {
        if (value instanceof TimeMonzo) {
          return new Val(value, operand.equave, newNode);
        }
        throw new Error('Val unary operation failed.');
      }
      return new Interval(value, operand.domain, 0, newNode, operand);
    }
    switch (operator) {
      case '+':
        return operand;
      case '-':
        return operand.neg();
      case '%':
      case '÷':
        return operand.inverse();
    }
    if (operand instanceof Val) {
      throw new Error(`Unary operation '${operator} not supported on vals.`);
    }
    if (!this.rootContext) {
      throw new Error('Root context required.');
    }
    switch (operator) {
      case '^':
      case '∧':
        return operand.up(this.rootContext);
      case '\u2228':
        return operand.down(this.rootContext);
      case '/':
      case 'lift':
        return operand.lift(this.rootContext);
      case '\\':
      case 'drop':
        return operand.drop(this.rootContext);
    }
    // The runtime shouldn't let you get here.
    throw new Error('Unexpected unary operation.');
  }

  protected visitUnaryExpression(node: UnaryExpression) {
    const operand = this.visit(node.operand);
    if (node.operator === 'not') {
      return !sonicTruth(operand);
    }
    return this.unaryOperate(operand, node);
  }

  protected updateArgument(
    argument: SonicWeaveValue,
    operator: UpdateOperator
  ): Interval | Interval[] {
    if (Array.isArray(argument)) {
      const u = this.updateArgument.bind(this);
      return argument.map(x => u(x, operator)) as Interval[];
    }
    if (typeof argument === 'boolean' || argument instanceof Interval) {
      if (operator === '++') {
        return upcastBool(argument).add(linearOne());
      }
      return upcastBool(argument).sub(linearOne());
    }
    throw new Error('Only intervals may be incremented or decremented.');
  }

  protected visitUpdateExpression(node: UpdateExpression) {
    const argument = this.visit(node.argument);
    const newValue = this.updateArgument(argument, node.operator);
    if (node.argument.type === 'Identifier') {
      this.set(node.argument.id, newValue);
    } else if (node.argument.type === 'AccessExpression') {
      const key = this.visit(node.argument.key);
      const object = arrayRecordOrString(
        this.visit(node.argument.object),
        'Only array elements or record values may be incremented or decremented.'
      );
      if (typeof object === 'string') {
        throw new Error('Strings are immutable.');
      }
      if (Array.isArray(object)) {
        if (typeof key === 'boolean' || key instanceof Interval) {
          const index = upcastBool(key).toInteger();
          object[index] = newValue as SonicWeavePrimitive;
        } else {
          throw new Error('Array indices must be intervals.');
        }
      } else {
        if (typeof key === 'string') {
          object[key] = newValue as SonicWeavePrimitive;
        } else {
          throw new Error('Record keys must be strings.');
        }
      }
    } else {
      throw new Error(
        'Only identifiers, array elements or record values may be incremented or decremented.'
      );
    }
    return newValue;
  }

  protected tensor(
    left: SonicWeaveValue,
    right: SonicWeaveValue,
    node: BinaryExpression
  ): Interval | Interval[] {
    if (typeof left === 'boolean') {
      left = upcastBool(left);
    }
    if (typeof right === 'boolean') {
      right = upcastBool(right);
    }
    if (!(left instanceof Interval || Array.isArray(left))) {
      throw new Error('Can only tensor intervals or arrays.');
    }
    if (left instanceof Interval) {
      if (!(right instanceof Interval || Array.isArray(right))) {
        throw new Error('Can only tensor intervals or arrays.');
      }
      if (right instanceof Interval) {
        this.spendGas();
        if (node.preferLeft || node.preferRight) {
          const value = left.value.mul(right.value);
          return resolvePreference(
            value,
            left,
            right,
            node,
            left.domain === 'linear' && right.domain === 'linear'
          );
        }
        return left.mul(right) as Interval;
      }
      const tns = this.tensor.bind(this);
      return right.map(r => tns(left, r, node)) as Interval[];
    }
    const tns = this.tensor.bind(this);
    return left.map(l => tns(l, right, node)) as Interval[];
  }

  protected binaryOperate(
    left: SonicWeaveValue,
    right: SonicWeaveValue,
    node: BinaryExpression
  ): boolean | boolean[] | Interval | Interval[] | Val | Val[] {
    if (Array.isArray(left)) {
      const b = this.binaryOperate.bind(this);
      if (Array.isArray(right)) {
        return left.map((l, i) =>
          b(l, (right as SonicWeavePrimitive[])[i], node)
        ) as Interval[];
      }
      return left.map(l => b(l, right, node)) as Interval[];
    }
    if (Array.isArray(right)) {
      const b = this.binaryOperate.bind(this);
      return right.map(r => b(left, r, node)) as Interval[];
    }
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
          let value: TimeMonzo | TimeReal;
          let simplify = false;
          let steps = 0;
          switch (operator) {
            case '+':
              value = left.value.add(right.value);
              break;
            case '-':
              value = left.value.sub(right.value);
              break;
            case 'max':
              value =
                compare.bind(this)(left, right) >= 0 ? left.value : right.value;
              break;
            case 'min':
              value =
                compare.bind(this)(left, right) <= 0 ? left.value : right.value;
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
              steps = left.steps + right.steps;
              simplify = left.domain === 'linear' && right.domain === 'linear';
              break;
            case '÷':
            case '%':
            case '/':
              value = left.value.div(right.value);
              steps = left.steps - right.steps;
              simplify = left.domain === 'linear' && right.domain === 'linear';
              break;
            case 'rd':
              value = left.value.reduce(right.value);
              break;
            case 'rdc':
              value = left.value.reduce(right.value, true);
              break;
            case '^':
              value = left.value.pow(right.value);
              steps = Math.round(left.steps * right.valueOf());
              simplify = true;
              break;
            case '/^':
            case '^/':
              value = left.value.pow(right.value.inverse());
              steps = Math.round(left.steps / right.valueOf());
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
            case 'ed':
              value = left.value.project(right.value);
              break;
            case '\\':
            case '°':
              throw new Error('Preference not supported with backslahes');
            case 'tmpr':
              throw new Error('Tempering needs an interval and a val.');
            default:
              throw new Error(
                `${node.preferLeft ? '~' : ''}${node.operator}${
                  node.preferRight ? '~' : ''
                } unimplemented.`
              );
          }
          const result = resolvePreference(value, left, right, node, simplify);
          if (steps) {
            result.steps = steps;
            result.break();
          }

          // Special handling for domain crossing operations
          if (operator === '/_' || operator === 'dot' || operator === '·') {
            result.domain = 'linear';
            result.node = undefined;
          } else if (operator === 'ed') {
            result.domain = 'logarithmic';
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
            return left.mul(right);
          case '÷':
          case '%':
          case '/':
            return left.div(right);
          case '^':
            return left.pow(right);
          case '/^':
          case '^/':
            return left.ipow(right);
          case '/_':
            return left.log(right);
          case '\\':
          case '°':
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
            return compare.bind(this)(left, right) >= 0 ? left : right;
          case 'min':
            return compare.bind(this)(left, right) <= 0 ? left : right;
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
          case 'ed':
            return left.project(right);
          case 'tmpr':
            throw new Error('Tempering needs an interval and a val.');
          case 'lest':
          case '??':
          case 'or':
          case 'and':
          case 'of':
          case 'not of':
          case '~of':
          case 'not ~of':
          case 'in':
          case 'not in':
          case '~in':
          case 'not ~in':
          case '⊗':
          case 'tns':
          case ' ':
            throw new Error('Unexpected code flow.');
        }
        operator satisfies never;
      } else if (right instanceof Val) {
        switch (operator) {
          case '×':
          case '*':
            return left.mul(right);
          case '·':
          case 'dot':
            return left.dot(right);
          case 'tmpr':
            return temper.bind(this)(right, left);
        }
        throw new Error(
          `Operator '${operator}' not implemented between intervals and vals.`
        );
      }
    } else if (left instanceof Val) {
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
      if (right instanceof Interval) {
        right = upcastBool(right);
        switch (operator) {
          case '×':
          case '*':
            return left.mul(right);
          case '÷':
          case '%':
          case '/':
            return left.div(right);
          case '·':
          case 'dot':
            return left.dot(right);
          case 'tmpr':
            return temper.bind(this)(left, right);
        }
        throw new Error(
          `Operator '${operator}' not implemented between vals and intervals.`
        );
      }
    }
    throw new Error(
      `Unsupported type encountered during vector binary operation broadcasting of '${operator}'.`
    );
  }

  /**
   * Invoke intrinsic behavior associated with SonicWeave values.
   * @param left The callee.
   * @param right The caller.
   * @returns The return value of the intrinsic call.
   */
  implicitCall(left: SonicWeaveValue, right: SonicWeaveValue): SonicWeaveValue {
    switch (typeof left) {
      case 'string':
        return this.intrinsicStringCall(left, right);
      case 'undefined':
        return this.intrinsicNoneCall(right);
      case 'boolean':
        return this.intrinsicIntervalCall(upcastBool(left), right);
      case 'function':
        return left.bind(this)(right);
    }
    if (left instanceof Interval) {
      return this.intrinsicIntervalCall(left, right);
    } else if (left instanceof Val) {
      return this.intrinsicValCall(left, right);
    } else if (left instanceof Color) {
      return this.intrinsicColorCall(left, right);
    }
    const ic = this.implicitCall.bind(this);
    return binaryMapContainers.bind(this)(left, right, ic);
  }

  protected intrinsicStringCall(
    callee: string,
    caller: SonicWeaveValue
  ): SonicWeaveValue {
    if (typeof caller === 'string') {
      return callee + caller;
    }
    if (typeof caller === 'boolean' || caller instanceof Interval) {
      caller = upcastBool(caller).shallowClone();
      caller.label = callee;
      return caller;
    }
    const ic = this.intrinsicStringCall.bind(this);
    return unaryMapContainer.bind(this)(caller, c => ic(callee, c));
  }

  protected intrinsicColorCall(
    callee: Color,
    caller: SonicWeaveValue
  ): SonicWeaveValue {
    if (typeof caller === 'boolean' || caller instanceof Interval) {
      caller = upcastBool(caller).shallowClone();
      caller.color = callee;
      return caller;
    }
    const ic = this.intrinsicColorCall.bind(this);
    return unaryMapContainer.bind(this)(caller, c => ic(callee, c));
  }

  protected intrinsicNoneCall(caller: SonicWeaveValue): SonicWeaveValue {
    if (typeof caller === 'boolean' || caller instanceof Interval) {
      caller = upcastBool(caller).shallowClone();
      caller.color = undefined;
      return caller;
    }
    const n = this.intrinsicNoneCall.bind(this);
    return unaryMapContainer.bind(this)(caller, n);
  }

  protected intrinsicIntervalCall(
    callee: Interval,
    caller: SonicWeaveValue
  ): SonicWeaveValue {
    switch (typeof caller) {
      case 'string':
        callee = callee.shallowClone();
        callee.label = caller;
        return callee;
      case 'boolean':
        if (caller) {
          return callee.shallowClone();
        }
        return fromInteger(0);
      case 'undefined':
        callee = callee.shallowClone();
        callee.color = undefined;
        return callee;
    }
    if (caller instanceof Interval || caller instanceof Val) {
      return caller.mul(callee);
    } else if (caller instanceof Color) {
      callee = callee.shallowClone();
      callee.color = caller;
      return callee;
    }
    const ic = this.intrinsicIntervalCall.bind(this);
    return unaryMapContainer.bind(this)(caller, c => ic(callee, c));
  }

  protected intrinsicValCall(
    callee: Val,
    caller: SonicWeaveValue
  ): SonicWeaveValue {
    if (typeof caller === 'boolean' || caller instanceof Interval) {
      return upcastBool(caller).mul(callee);
    }
    const ic = this.intrinsicValCall.bind(this);
    return unaryMapContainer.bind(this)(caller, c => ic(callee, c));
  }

  protected visitBinaryExpression(node: BinaryExpression): SonicWeaveValue {
    const operator = node.operator;
    if (operator === 'lest') {
      try {
        return this.visit(node.right);
      } catch {
        return this.visit(node.left);
      }
    }
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
    let right = this.visit(node.right);
    if (operator === ' ') {
      return this.implicitCall(left, right);
    }
    if (operator === 'tns' || operator === '⊗') {
      return this.tensor(left, right, node);
    }
    if (
      operator === 'of' ||
      operator === 'not of' ||
      operator === '~of' ||
      operator === 'not ~of'
    ) {
      right = arrayRecordOrString(
        right,
        `Target of '${operator}' must be an array, record or a string.`
      );
      if (typeof right === 'string') {
        right = [...right];
      } else if (!Array.isArray(right)) {
        right = Object.values(right);
      }
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
      operator satisfies never;
    }
    if (
      operator === 'in' ||
      operator === 'not in' ||
      operator === '~in' ||
      operator === 'not ~in'
    ) {
      right = arrayRecordOrString(
        right,
        `Target of '${operator}' must be an array, record or a string.`
      );
      if (Array.isArray(right) || typeof right === 'string') {
        if (!(left instanceof Interval && left.value.isIntegral())) {
          throw new Error('Can only test for integer keys.');
        }
        const index = left.toInteger();
        switch (operator) {
          case 'in':
            return index >= 0 && index < right.length;
          case 'not in':
            return index < 0 || index >= right.length;
          case '~in':
            return index >= -right.length && index < right.length;
          case 'not ~in':
            return index < -right.length || index > right.length;
        }
        operator satisfies never;
      }
      if (typeof left !== 'string') {
        throw new Error('Can only test for string keys in records.');
      }
      if (operator === 'in' || operator === '~in') {
        return hasOwn(right, left);
      }
      return !hasOwn(right, left);
    }
    if (
      (left instanceof Interval ||
        left instanceof Val ||
        typeof left === 'boolean' ||
        Array.isArray(left)) &&
      (right instanceof Interval ||
        right instanceof Val ||
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
      case '<=':
        return (left as any) <= (right as any);
      case '<':
        return (left as any) < (right as any);
      case '>=':
        return (left as any) >= (right as any);
      case '>':
        return (left as any) > (right as any);
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
    throw new Error(`Unhandled binary operation '${node.operator}'.`);
  }

  protected visitCallExpression(node: CallExpression) {
    const args = this.spread(node.args);
    if (node.callee.type === 'Identifier') {
      const callee = this.get(node.callee.id) as SonicWeaveFunction;
      return callee.bind(this)(...args);
    }
    const callee = this.visit(node.callee);
    if (typeof callee === 'function') {
      return (callee as SonicWeaveFunction).bind(this)(...args);
    }
    if (args.length !== 1) {
      throw new Error('Intrinsic calls require exactly one argument.');
    }
    return this.implicitCall(callee, args[0]);
  }

  protected visitArrowFunction(node: ArrowFunction) {
    const scopeVisitor = this.parent.createExpressionVisitor();

    function realization(...args: SonicWeaveValue[]) {
      // XXX: Poor type system gets abused again.
      scopeVisitor.localAssign(node.parameters, args as SonicWeavePrimitive[]);

      const result = scopeVisitor.visit(node.expression);
      scopeVisitor.mutables.clear();
      return result;
    }
    Object.defineProperty(realization, 'name', {
      value: '(lambda)',
      enumerable: false,
    });
    realization.__doc__ = undefined;
    realization.__node__ = node;
    return realization as SonicWeaveFunction;
  }

  protected visitIntegerLiteral(node: IntegerLiteral): Interval {
    const value = TimeMonzo.fromBigInt(node.value);
    return new Interval(value, 'linear', 0, node);
  }

  protected visitDecimalLiteral(node: DecimalLiteral): Interval {
    if (node.flavor === 'r') {
      const value = TimeReal.fromValue(
        parseFloat(
          `${node.sign}${node.whole}.${node.fractional}e${node.exponent ?? '0'}`
        )
      );
      return new Interval(value, 'linear', 0, node);
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
    return new Interval(value, 'linear', 0, node);
  }

  protected visitCentsLiteral(node: CentsLiteral): Interval {
    if (node.real) {
      throw new Error('Unexpected real cents.');
    }
    let numerator: bigint | number = node.whole;
    let denominator: bigint | number = 1200n;
    for (const c of node.fractional) {
      numerator = 10n * numerator + BigInt(c);
      denominator *= 10n;
    }
    const exponent = BigInt(node.exponent || 0);
    if (exponent > 0) {
      numerator *= 10n ** exponent;
    } else if (exponent < 0) {
      denominator *= 10n ** -exponent;
    }
    const factor = gcd(numerator, denominator);
    numerator = Number(numerator / factor);
    denominator = Number(denominator / factor);
    let value: TimeMonzo | TimeReal;
    try {
      value = new TimeMonzo(ZERO, [new Fraction(numerator, denominator)]);
    } catch {
      value = TimeReal.fromCents((1200 * numerator) / denominator);
      node = {...node};
      node.real = true;
    }
    return new Interval(value, 'logarithmic', 0, node);
  }

  protected visitFractionLiteral(node: FractionLiteral): Interval {
    const value = TimeMonzo.fromBigNumeratorDenominator(
      node.numerator,
      node.denominator
    );
    return new Interval(value, 'linear', 0, node);
  }

  protected visitNedjiLiteral(node: NedjiLiteral): Interval {
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
    return new Interval(value, 'logarithmic', 0, node);
  }

  protected visitHertzLiteral(node: HertzLiteral): Interval {
    let value: TimeMonzo;
    if (node.prefix.endsWith('i')) {
      value = KIBI_MONZO.pow(
        binaryExponent(node.prefix as BinaryPrefix)
      ) as TimeMonzo;
    } else {
      value = TEN_MONZO.pow(
        metricExponent(node.prefix as MetricPrefix)
      ) as TimeMonzo;
    }
    value.timeExponent = NEGATIVE_ONE;
    return new Interval(value, 'linear', 0, node);
  }

  protected visitSecondLiteral(node: SecondLiteral): Interval {
    let value: TimeMonzo;
    if (node.prefix.endsWith('i')) {
      value = KIBI_MONZO.pow(
        binaryExponent(node.prefix as BinaryPrefix)
      ) as TimeMonzo;
    } else {
      value = TEN_MONZO.pow(
        metricExponent(node.prefix as MetricPrefix)
      ) as TimeMonzo;
    }
    value.timeExponent = ONE;
    return new Interval(value, 'linear', 0, node);
  }

  protected visitIdentifier(node: Identifier): SonicWeaveValue {
    return this.get(node.id);
  }

  protected visitEnumeratedChord(node: EnumeratedChord): Interval[] {
    const intervals: Interval[] = [];
    const domains: IntervalDomain[] = [];
    const monzos: (TimeMonzo | TimeReal)[] = [];
    for (const expression of node.enumerals) {
      if (expression.type === 'HarmonicSegment') {
        const segment = this.visitHarmonicSegment(expression, true);
        for (const interval of segment) {
          intervals.push(interval);
          monzos.push(interval.value);
          domains.push(interval.domain);
        }
      } else {
        let interval = this.visit(expression);
        if (typeof interval === 'boolean') {
          interval = upcastBool(interval);
        }
        if (interval instanceof Interval) {
          intervals.push(interval);
          monzos.push(interval.value);
          domains.push(interval.domain);
        } else {
          throw new Error('Type error: Can only stack intervals in a chord.');
        }
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
        const steps = intervals[i].steps - rootInterval.steps;
        result.push(
          new Interval(
            node.mirror ? root.div(monzos[i]) : monzos[i].div(root),
            domains[i],
            node.mirror ? -steps : steps,
            undefined,
            infect(intervals[i], rootInterval)
          )
        );
      }
    }
    return result;
  }

  protected visitRange(node: Range): Interval[] {
    const start = this.visit(node.start);
    const end = this.visit(node.end);
    if (!(start instanceof Interval && end instanceof Interval)) {
      throw new Error('Ranges must consist of intervals.');
    }

    let step = linearOne();
    if (node.second) {
      const second = this.visit(node.second);
      if (!(second instanceof Interval)) {
        throw new Error('Ranges must consist of intervals.');
      }
      step = second.sub(start);
    }
    if (step.value instanceof TimeReal) {
      // TODO: Re-enable.
      throw new Error('Irrational ranges disabled for now.');
    }
    if (step.value.residual.s !== 0) {
      this.spendGas(
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
    throw new Error('Range step must not be zero.');
  }

  protected visitHarmonicSegment(
    node: HarmonicSegment,
    enumeral = false
  ): Interval[] {
    let root = this.visit(node.root);
    let end = this.visit(node.end);
    if (typeof root === 'boolean') {
      root = upcastBool(root);
    }
    if (typeof end === 'boolean') {
      end = upcastBool(end);
    }
    if (!(root instanceof Interval && end instanceof Interval)) {
      throw new Error('Harmonic segments must be built from intervals.');
    }
    this.spendGas(Math.abs(end.value.valueOf() - root.value.valueOf()));
    const one = linearOne();
    const result: Interval[] = [];
    let next = root;
    if (root.compare(end) <= 0) {
      while (next.compare(end) <= 0) {
        result.push(next);
        next = next.add(one);
      }
    } else {
      while (next.compare(end) >= 0) {
        result.push(next);
        next = next.sub(one);
      }
    }
    if (enumeral) {
      return result;
    }
    return result.slice(1).map(i => i.div(root as Interval));
  }

  /**
   * Get the value of a variable in the current context.
   * @param name Name of the variable.
   * @returns Value of the variable.
   * @throws An error if there is no variable declared under the given name.
   */
  get(name: string): SonicWeaveValue {
    if (this.mutables.has(name)) {
      return this.mutables.get(name);
    }
    return this.parent.get(name);
  }

  // Note: Local mutable variables should be initialized directly by manipulating `this.mutables`.

  /**
   * Set the value of a variable in the current context.
   * @param name Name of the variable.
   * @param value Value for the variable.
   * @throws An error if there is no variable declared under the given name or the given variable is declared constant.
   */
  set(name: string, value: SonicWeaveValue) {
    if (this.mutables.has(name)) {
      this.mutables.set(name, value);
    }
    this.parent.set(name, value);
  }
}
