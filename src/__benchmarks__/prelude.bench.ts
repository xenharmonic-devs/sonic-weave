import {describe, bench, beforeAll} from 'vitest';
import {StatementVisitor, getSourceVisitor, parseAST, sw} from '../parser';
import {BUILTIN_CONTEXT} from '../stdlib';
import {PRELUDE_SOURCE, PRELUDE_VOLATILES} from '../stdlib/prelude';
import {RootContext} from '../context';
import {CSS_COLOR_CONTEXT} from '../css-colors';

// NOTE: Most of these are not comparitive benchmarks.
// Mainly useful for making sure tweaks to the parser won't destroy all performance.
beforeAll(() => {
  getSourceVisitor();
});

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
    const visitor = new StatementVisitor();
    visitor.rootContext = rootContext;
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

describe('Prelude riffs', () => {
  bench('Euler genus (stdlib)', () => {
    for (let n = 5; n < 100; ++n) {
      sw`eulerGenus(${n})`;
    }
  });

  const oldVisitor = getSourceVisitor();
  const ast = parseAST(`
    riff eulerGenusOld(guide, root = 1, equave = 2) {
      "Span a lattice from all divisors of the guide-tone rotated to the root-tone.";
      if (guide ~mod root) {
        throw "Root must divide the guide tone.";
      }
      let remainder = guide ~* 0;
      while (++remainder < equave) {
        let n = remainder;
        while (n <= guide) {
          if (not (guide ~mod n)) n;
          n ~+= equave;
        }
      }
      i => i ~% root ~rdc equave;
      sort();
      pop() colorOf(equave) labelOf(equave);
    }
  `);
  for (const s of ast.body) {
    oldVisitor.visit(s);
  }

  bench('Euler genus (old)', () => {
    const v = oldVisitor.clone();
    for (let n = 5; n < 100; ++n) {
      const ast = parseAST(`eulerGenusOld(${n})`);
      for (const s of ast.body) {
        v.visit(s);
      }
    }
  });
});
