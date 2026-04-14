#!/usr/bin/env node

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {start} from 'node:repl';
import {createRequire} from 'node:module';
import {
  toScalaKbm,
  toScalaScl,
  toSonicWeaveInterchange,
  repl,
} from '../dist/index.js';

const require = createRequire(import.meta.url);
const {version} = require('../package.json');

function loadCommander() {
  const searchPaths = require.resolve.paths('commander') ?? [];
  for (const searchPath of searchPaths) {
    const candidateDir = join(searchPath, 'commander');
    if (existsSync(join(candidateDir, 'package.json'))) {
      return require(candidateDir);
    }
  }
  return null;
}

const commander = loadCommander();
if (!commander) {
  process.stderr.write(
    'Missing optional dependency "commander". Install dependencies with "npm install" to use the CLI.\n',
  );
  process.exitCode = 1;
} else {
  const {program} = commander;
  program
    .name('sonic-weave')
    .description(
      'CLI for the SonicWeave DSL for manipulating musical frequencies, ratios and equal temperaments',
    )
    .version(version)
    .argument(
      '[file]',
      'File containing source code for a musical scale written in SonicWeave',
    )
    .option('-f, --format <format>', 'output format', 'scl');

  program.parse();
  const options = program.opts();
  if (!program.args.length) {
    repl(start);
  } else {
    const data = readFileSync(program.args[0]);
    if (options.format === 'scl') {
      process.stdout.write(toScalaScl(data.toString()));
    } else if (options.format === 'kbm') {
      process.stdout.write(toScalaKbm(data.toString()));
    } else if (options.format === 'swi') {
      process.stdout.write(toSonicWeaveInterchange(data.toString()));
    } else {
      process.stderr.write(`Unrecognized output format ${options.format}\n`);
      process.exitCode = 1;
    }
  }
}
