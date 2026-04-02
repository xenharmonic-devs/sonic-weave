import {describe, it, expect} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import {join, resolve} from 'path';
import {spawnSync} from 'child_process';
import {toSonicWeaveInterchange, repl} from '../cli';
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
});

describe('CLI REPL error handling', () => {
  it('accepts nested function calls with fractional arguments', () => {
    let options: ReplOptions | undefined;
    repl(opts => {
      options = opts as ReplOptions;
      return {} as any;
    });

    const evaluate = options?.eval;
    expect(evaluate).toBeTypeOf('function');

    const fakeRepl = {
      setPrompt() {},
      displayPrompt() {},
    } as any;

    let err: Error | null = null;
    let value: unknown;
    evaluate!.call(fakeRepl, 'print(str(4/3))\n', {} as any, 'repl', (e, v) => {
      err = e;
      value = v;
    });

    expect(err).toBeNull();
    expect(value).toBeUndefined();
  });

  it('recovers after parser errors from malformed input', () => {
    let options: ReplOptions | undefined;
    repl(opts => {
      options = opts as ReplOptions;
      return {} as any;
    });

    const evaluate = options?.eval;
    expect(evaluate).toBeTypeOf('function');

    const fakeRepl = {
      setPrompt() {},
      displayPrompt() {},
    } as any;

    let firstErr: Error | null = null;
    evaluate!.call(
      fakeRepl,
      'print("unterminated)\n',
      {} as any,
      'repl',
      (err: Error | null) => {
        firstErr = err;
      },
    );
    expect(firstErr).toBeInstanceOf(Error);

    let secondErr: Error | null = null;
    let secondValue: unknown;
    evaluate!.call(fakeRepl, '1\n', {} as any, 'repl', (err, value) => {
      secondErr = err;
      secondValue = value;
    });
    expect(secondErr).toBeNull();
    expect(secondValue).toBeDefined();
  });
});
