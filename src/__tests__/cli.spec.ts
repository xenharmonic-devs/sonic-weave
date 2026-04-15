import {describe, it, expect} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import {join, resolve} from 'path';
import {spawnSync} from 'child_process';
import {toScalaKbm, toSonicWeaveInterchange, repl} from '../cli.js';
import type {ReplOptions} from 'repl';

describe('Interchange format', () => {
  it('uses plain monzos up to 23-limit', () => {
    const result = toSonicWeaveInterchange('23/16 "test"');
    expect(result).toContain('[-4 0 0 0 0 0 0 0 1> "test"');
  });

  it('has representation for infinity', () => {
    const result = toSonicWeaveInterchange('inf');
    expect(result).toContain('inf');
  });

  it('has representation for nan', () => {
    const result = toSonicWeaveInterchange('nan');
    expect(result).toContain('[1 1>@0.inf');
  });

  it('has representation for negative infinity Hz', () => {
    const result = toSonicWeaveInterchange('-inf * 1 Hz');
    expect(result).toContain('[1. 1 1>@Hz.-1.inf');
  });

  it('has representation for nan Hz (normalizes)', () => {
    const result = toSonicWeaveInterchange('nan * 1 Hz');
    expect(result).toContain('[1 1>@0.inf');
  });
});

describe('CLI format option', () => {
  const cliPath = resolve(__dirname, '../../bin/sonic-weave.js');

  function runCli(format: string) {
    const tempDir = mkdtempSync(join(tmpdir(), 'sonic-weave-cli-'));
    const inputPath = join(tempDir, 'input.sw');
    writeFileSync(inputPath, '3/2');

    try {
      return spawnSync(
        process.execPath,
        [cliPath, inputPath, '--format', format],
        {
          encoding: 'utf-8',
        },
      );
    } finally {
      rmSync(tempDir, {recursive: true, force: true});
    }
  }

  it('prints a helpful message and exits non-zero for unsupported format', () => {
    const result = runCli('bogus');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unrecognized output format bogus');
  });

  it('exits successfully for scl format', () => {
    const result = runCli('scl');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('exits successfully for swi format', () => {
    const result = runCli('swi');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('exits successfully for kbm format', () => {
    const result = runCli('kbm');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});

describe('Scala KBM format', () => {
  it('creates a linear keyboard map for the current scale', () => {
    const result = toScalaKbm('3/2\n2');
    expect(result).toContain('\n2\n! First MIDI note number to retune:\n0');
    expect(result).toContain(
      '\n69\n! Frequency to tune the above note to:\n440.0\n',
    );
    expect(result).toContain('\n2\n! Mapping.\n0\n1\n');
  });

  it('supports empty scales with a formal octave fallback', () => {
    const result = toScalaKbm('clear()');
    expect(result).toContain('\n0\n! First MIDI note number to retune:\n0');
    expect(result).toContain('\n1\n! Mapping.\n');
  });

  it('uses root context unison frequency as the kbm reference frequency', () => {
    const result = toScalaKbm('1/1 = 432 Hz\n3/2\n2');
    expect(result).toContain(
      '\n60\n! Frequency to tune the above note to:\n432.0\n',
    );
  });

  it('normalizes non-Hz absolute unison values to Hz', () => {
    const result = toScalaKbm('1/1 = 2 s\n3/2\n2');
    expect(result).toContain(
      '\n60\n! Frequency to tune the above note to:\n0.5\n',
    );
  });
});

describe('CLI REPL error handling', () => {
  it('accepts nested function calls with fractional arguments', () => {
    let options: ReplOptions | undefined;
    repl(opts => {
      options = opts as ReplOptions;
      return {} as unknown;
    });

    const evaluate = options?.eval;
    expect(evaluate).toBeTypeOf('function');

    const fakeRepl = {
      setPrompt() {},
      displayPrompt() {},
    } as unknown;

    let err: Error | null = null;
    let value: unknown;
    evaluate!.call(
      fakeRepl,
      'print(str(4/3))\n',
      {} as unknown,
      'repl',
      (e, v) => {
        err = e;
        value = v;
      },
    );

    expect(err).toBeNull();
    expect(value).toBeUndefined();
  });

  it('recovers after parser errors from malformed input', () => {
    let options: ReplOptions | undefined;
    repl(opts => {
      options = opts as ReplOptions;
      return {} as unknown;
    });

    const evaluate = options?.eval;
    expect(evaluate).toBeTypeOf('function');

    const fakeRepl = {
      setPrompt() {},
      displayPrompt() {},
    } as unknown;

    let firstErr: Error | null = null;
    evaluate!.call(
      fakeRepl,
      'print("unterminated)\n',
      {} as unknown,
      'repl',
      (err: Error | null) => {
        firstErr = err;
      },
    );
    expect(firstErr).toBeInstanceOf(Error);

    let secondErr: Error | null = null;
    let secondValue: unknown;
    evaluate!.call(fakeRepl, '1\n', {} as unknown, 'repl', (err, value) => {
      secondErr = err;
      secondValue = value;
    });
    expect(secondErr).toBeNull();
    expect(secondValue).toBeDefined();
  });
});
