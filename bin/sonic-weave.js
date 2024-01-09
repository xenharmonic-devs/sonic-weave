#!/usr/bin/env node

'use strict';

const {readFileSync} = require('fs');
const {start} = require('repl');
const {toScalaScl, repl} = require('../dist');

if (require.main === module) {
  if (process.argv.length < 3) {
    throw new Error('No input files given');
  }
  if (process.argv[2] === 'repl') {
    repl(start);
  } else {
    const data = readFileSync(process.argv[2]);
    process.stdout.write(toScalaScl(data.toString()));
  }
}
