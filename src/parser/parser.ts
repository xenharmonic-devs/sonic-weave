import {Fraction} from 'xen-dev-utils';
import {Color, Interval, Temperament, Val, ValBasis} from '../interval';
import {TimeMonzo} from '../monzo';
import {parse} from './sonic-weave-ast';
import {CSS_COLOR_CONTEXT} from '../css-colors';
import {SonicWeaveValue, SonicWeavePrimitive} from '../stdlib';
import {BUILTIN_CONTEXT} from '../stdlib/builtin';
import {PRELUDE_SOURCE, PRELUDE_VOLATILES} from '../stdlib/prelude';
import {RootContext} from '../context';
import {Program} from '../ast';
import {StatementVisitor} from './statement';

/**
 * Parse a string of text written in the SonicWeave domain specific language into an abstract syntax tree.
 * @param source Source code for a SonicWeave program.
 * @returns The program as the root node of the AST.
 */
export function parseAST(source: string): Program {
  return parse(source);
}

// Cached globally on first initialization.
let SOURCE_VISITOR_WITH_PRELUDE: StatementVisitor | null = null;
let PRELUDE_SCOPE: StatementVisitor | null = null;
let SOURCE_VISITOR_NO_PRELUDE: StatementVisitor | null = null;
let VOLATILES: Program | null = null;

/**
 * Note: Use {@link getSourceVisitor} instead unless you need hack the built-ins for some reason.
 * Obtain a runtime visitor usable as the parent scope of a visitor for the body of a program produced by {@link parseAST}.
 * @param includePrelude Whether or not to include the extended standard library. Passing in `false` results in a faster start-up time.
 * @param extraBuiltins Custom builtins callable inside the SonicWeave program.
 * @returns A SonicWeave statement evaluator containing the built-in global scope.
 */
export function getGlobalVisitor(
  includePrelude = true,
  extraBuiltins?: Record<string, SonicWeaveValue>
) {
  extraBuiltins ??= {};
  const rootContext = new RootContext();
  if (
    includePrelude &&
    SOURCE_VISITOR_WITH_PRELUDE &&
    PRELUDE_SCOPE &&
    VOLATILES
  ) {
    // In order to set gas limits on non-volatiles the cached visitors have to be patched.
    PRELUDE_SCOPE.rootContext = rootContext;
    SOURCE_VISITOR_WITH_PRELUDE.rootContext = rootContext;

    const visitor = SOURCE_VISITOR_WITH_PRELUDE.clone();

    // Volatiles are expected to interact with extra builtins.
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
    SOURCE_VISITOR_NO_PRELUDE.rootContext = rootContext;
    const visitor = SOURCE_VISITOR_NO_PRELUDE.clone();
    visitor.rootContext = rootContext;
    return visitor;
  } else {
    const visitor = new StatementVisitor();
    visitor.rootContext = rootContext;
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
      PRELUDE_SCOPE = visitor;
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

/**
 * Obtain a runtime visitor for the body of a program produced by {@link parseAST}.
 * @param includePrelude Whether or not to include the extended standard library. Passing in `false` results in a faster start-up time.
 * @param extraBuiltins Custom builtins callable inside the SonicWeave program.
 * @returns A SonicWeave statement evaluator.
 */
export function getSourceVisitor(
  includePrelude = true,
  extraBuiltins?: Record<string, SonicWeaveValue>
) {
  const globalVisitor = getGlobalVisitor(includePrelude, extraBuiltins);
  const visitor = new StatementVisitor(globalVisitor);
  visitor.isUserRoot = true;
  return visitor;
}

/**
 * Evaluate a SonicWeave program and return a {@link StatementVisitor} representing the final runtime state.
 * @param source Source code for a SonicWeave program.
 * @param includePrelude Whether or not to include the extended standard library. Passing in `false` results in a faster start-up time.
 * @param extraBuiltins Custom builtins callable inside the SonicWeave program.
 * @returns A SonicWeave statement visitor after evaluating all of the statements in the program.
 */
export function evaluateSource(
  source: string,
  includePrelude = true,
  extraBuiltins?: Record<string, SonicWeaveValue>
) {
  const visitor = getSourceVisitor(includePrelude, extraBuiltins);

  const program = parseAST(source);
  visitor.executeProgram(program);
  return visitor;
}

/**
 * Evaluate a SonicWeave program and return the value of the final expression.
 * @param source Source code for a SonicWeave program.
 * @param includePrelude Whether or not to include the extended standard library. Passing in `false` results in a faster start-up time.
 * @param extraBuiltins Custom builtins callable inside the SonicWeave program.
 * @returns Value of the final expression in the program.
 * @throws An error if the final statement in the program is not an expression.
 */
export function evaluateExpression(
  source: string,
  includePrelude = true,
  extraBuiltins?: Record<string, SonicWeaveValue>
): SonicWeaveValue {
  const visitor = getSourceVisitor(includePrelude, extraBuiltins);
  const program = parseAST(source);
  for (const statement of program.body.slice(0, -1)) {
    const interrupt = visitor.visit(statement);
    if (interrupt) {
      throw new Error(`Illegal ${interrupt.type}.`);
    }
  }
  if (visitor.deferred.length) {
    throw new Error(
      'Deferred actions not allowed when evaluating expressions.'
    );
  }
  const finalStatement = program.body[program.body.length - 1];
  if (finalStatement.type !== 'ExpressionStatement') {
    throw new Error(`Expected expression. Got ${finalStatement.type}.`);
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
      if (
        value instanceof Interval ||
        value instanceof Val ||
        value instanceof Color ||
        value instanceof ValBasis ||
        value instanceof Temperament
      ) {
        return value;
      } else if (value instanceof Fraction) {
        return Interval.fromFraction(value);
      } else if (value instanceof TimeMonzo) {
        return new Interval(value, 'linear');
      } else if (Array.isArray(value)) {
        return value.map(convert) as Interval[];
      } else {
        const result: Record<string, SonicWeavePrimitive> = {};
        for (const [key, subValue] of Object.entries(value)) {
          result[key] = convert(subValue) as SonicWeavePrimitive;
        }
        return result;
      }
  }
  throw new Error('Value cannot be converted.');
}

/**
 * Create a tag for [templates literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) to evaluate SonicWeave programs inside JavaScript code.
 * @param expression Whether or not this tag is intended for evaluation single expressions or full scales producing arrays of {@link Interval} instances.
 * @param includePrelude Whether or not to include the extended standard library. Passing in `false` results in a faster start-up time.
 * @param extraBuiltins Custom builtins callable inside the SonicWeave program.
 * @param escapeStrings If `true` all escape sequences are evaluated before interpreting the literal as a SonicWeave program.
 * @returns A tag that can be attached to template literals in order to evaluate them.
 */
export function createTag(
  expression = true,
  includePrelude = true,
  extraBuiltins?: Record<string, SonicWeaveValue>,
  escapeStrings = false
) {
  function tag(strings: TemplateStringsArray, ...args: any[]) {
    const fragments = escapeStrings ? strings : strings.raw;
    const visitor = getSourceVisitor(includePrelude, extraBuiltins);
    if (!visitor.rootContext) {
      throw new Error('Root context required for storing template arguments.');
    }
    let source = fragments[0];
    for (let i = 0; i < args.length; ++i) {
      visitor.rootContext.templateArguments[i] = convert(args[i]);
      source += `¥${i}` + fragments[i + 1];
    }
    const program = parseAST(source);
    if (expression) {
      for (const statement of program.body.slice(0, -1)) {
        const interrupt = visitor.visit(statement);
        if (interrupt) {
          throw new Error(`Illegal ${interrupt.type}.`);
        }
      }
      if (visitor.deferred.length) {
        throw new Error(
          'Deferred actions not allowed when evaluating tagged templates.'
        );
      }
      const finalStatement = program.body[program.body.length - 1];
      if (finalStatement.type !== 'ExpressionStatement') {
        throw new Error(`Expected expression. Got ${finalStatement.type}.`);
      }
      const subVisitor = visitor.createExpressionVisitor();
      return subVisitor.visit(finalStatement.expression);
    } else {
      visitor.executeProgram(program);
      return visitor.currentScale;
    }
  }
  return tag;
}

/**
 * Tag for evaluating [templates literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) as SonicWeave expressions.
 * Has raw (unescaped) semantics.
 *
 * Example:
 * ```ts
 * const interval = swr`7\12` as Interval;
 * console.log(interval.totalCents()); // 700
 * ```
 */
export const swr = createTag();
Object.defineProperty(swr, 'name', {
  value: 'swr',
  enumerable: false,
});

/**
 * Tag for evaluating [templates literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) as SonicWeave scales.
 * Has raw (unescaped) semantics.
 *
 * Example:
 * ```ts
 * const pentatonic = sw$r`rank2(7\12, 4)`;
 * console.log(pentatonic.map(interval => interval.totalCents())); // [200, 400, 700, 900, 1200]
 * ```
 */
export const sw$r = createTag(false) as (
  strings: TemplateStringsArray,
  ...args: any[]
) => Interval[];
Object.defineProperty(swr, 'name', {
  value: 'sw$r',
  enumerable: false,
});

/**
 * Tag for evaluating [templates literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) as SonicWeave expressions.
 * Evaluates escapes before interpreting the program so e.g. a double backslash means only a single backslash within the program.
 *
 * Example:
 * ```ts
 * const interval = sw`7\\12` as Interval;
 * console.log(interval.totalCents()); // 700
 * ```
 */
export const sw = createTag(true, true, undefined, true);
Object.defineProperty(sw, 'name', {
  value: 'sw',
  enumerable: false,
});

/**
 * Tag for evaluating [templates literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) as SonicWeave scales.
 * Evaluates escapes before interpreting the program so e.g. a double backslash means only a single backslash within the program.
 *
 * Example:
 * ```ts
 * const pentatonic = sw$`rank2(7\\12, 4)`;
 * console.log(pentatonic.map(interval => interval.totalCents())); // [200, 400, 700, 900, 1200]
 * ```
 */
export const sw$ = createTag(false, true, undefined, true) as (
  strings: TemplateStringsArray,
  ...args: any[]
) => Interval[];
Object.defineProperty(swr, 'name', {
  value: 'sw$',
  enumerable: false,
});
