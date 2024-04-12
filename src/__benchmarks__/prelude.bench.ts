import {describe, bench} from 'vitest';
import {StatementVisitor, parseAST} from '../parser';
import {BUILTIN_CONTEXT} from '../stdlib';
import {PRELUDE_SOURCE, PRELUDE_VOLATILES} from '../stdlib/prelude';
import {RootContext} from '../context';
import {CSS_COLOR_CONTEXT} from '../css-colors';

describe('Prelude AST parsing', () => {
  bench('parse prelude source', () => {
    parseAST(PRELUDE_SOURCE);
  });
});

describe('Prelude AST visiting', () => {
  const prelude = parseAST(PRELUDE_SOURCE);
  const volatiles = parseAST(PRELUDE_VOLATILES);

  bench('visit prelude', () => {
    const rootContext = new RootContext();
    const visitor = new StatementVisitor(rootContext);
    for (const [name, color] of CSS_COLOR_CONTEXT) {
      visitor.immutables.set(name, color);
    }
    for (const name in BUILTIN_CONTEXT) {
      const value = BUILTIN_CONTEXT[name];
      visitor.immutables.set(name, value);
    }
    for (const statement of prelude.body) {
      visitor.visit(statement);
    }
    for (const statement of volatiles.body) {
      visitor.visit(statement);
    }
  });
});
