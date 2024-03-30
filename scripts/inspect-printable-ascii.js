const {parse} = require('../src/sonic-weave-ast');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

function logResult(source) {
  let result = '*Empty program*';
  try {
    const ast = parse(source);
    if (ast.body.length) {
      result = ast.body[0].type;
      if (ast.body.length > 1) {
        result += '+';
      }
      if (result === 'ExpressionStatement') {
        result += '->' + ast.body[0].expression.type;
      }
    }
  } catch {
    result = '*Rejects*';
  }
  console.log(JSON.stringify(source) + '\t' + result);
}

console.log(
  'Iterating over all printable ASCII character to see which are accepted by the parser.'
);

const ASCII = ['\t', '\n', '\r'];

for (let i = 32; i < 127; ++i) {
  ASCII.push(String.fromCharCode(i));
}

for (const source of ASCII) {
  logResult(source);
}

let i = 0;

function nextPage() {
  for (const b of ASCII) {
    logResult(ASCII[i] + b);
  }
  if (++i < ASCII.length) {
    readline.question('(next page)', nextPage);
  } else {
    readline.close();
  }
}

readline.question('Confirm to continue with strings of length 2.', nextPage);
