#!/usr/bin/env node

'use strict';

const {existsSync, readFileSync} = require('fs');
const {join} = require('path');
const {start} = require('repl');
const {version} = require('../package.json');
const {toScalaScl, toSonicWeaveInterchange, repl} = require('../dist');

function loadCommander() {
  for (const searchPath of module.paths) {
    const candidateDir = join(searchPath, 'commander');
    if (existsSync(join(candidateDir, 'package.json'))) {
      return require(candidateDir);
    }
  }
  return null;
}

if (require.main === module) {
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
      } else if (options.format === 'swi') {
        process.stdout.write(toSonicWeaveInterchange(data.toString()));
      } else {
        process.stderr.write(`Unrecognized output format ${options.format}\n`);
        process.exitCode = 1;
      }
    }
  }
}
