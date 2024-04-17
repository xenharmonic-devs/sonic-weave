#!/usr/bin/env node

'use strict';

const {readFileSync} = require('fs');
const {start} = require('repl');
const {program} = require('commander');
const {version} = require('../package.json');
const {toScalaScl, toSonicWeaveInterchange, repl} = require('../dist');

program
  .name('sonic-weave')
  .description(
    'CLI for the SonicWeave DSL for manipulating musical frequencies, ratios and equal temperaments'
  )
  .version(version)
  .argument(
    '[file]',
    'File containing source code for a musical scale written in SonicWeave'
  )
  .option('-f, --format <format>', 'output format', 'scl');

if (require.main === module) {
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
    }
  }
}
