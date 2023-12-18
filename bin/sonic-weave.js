#!/usr/bin/env node

'use strict';

const {readFileSync} = require('fs');
const {toScalaScl} = require('../dist');

if (require.main === module) {
  if (process.argv.length < 3) {
    throw new Error('No input files given');
  }
  const data = readFileSync(process.argv[2]);
  process.stdout.write(toScalaScl(data.toString()));
}
