import {describe, it, expect} from 'vitest';
import {evaluateSource} from '../../parser';
import {Interval} from '../../interval';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function parseSource(source: string) {
  const visitor = evaluateSource(source, false);
  return visitor.mutables.get('$') as Interval[];
}

function expand(source: string) {
  const visitor = evaluateSource(source, false);
  return visitor.expand(visitor.rootContext!).split('\n');
}

describe('SonicWeave module system', () => {
  it('declares modules and imports from them', () => {
    const scale = expand(`
      module foo {
        "This is a module docstring.";

        export const bar = 1;
        export riff baz(qux) {
          return qux + bar;
        }

        3/2 "module scale should be ignored";
      }

      {
        import * from foo;
        bar; // 1

        module corge {
          2/1 "block-scope modules make little sense, but banning them is more work."
          export * from foo;
        }

        import baz as grault from corge;

        grault(10); // 11
      }

      import bar, baz as quux from foo;
      quux(100);  // 101
      bar + 1000; // 1001
    `);
    expect(scale).toEqual(['1', '11', '101', '1001']);
  });
});
