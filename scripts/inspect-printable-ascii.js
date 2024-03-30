const {parse} = require('../src/sonic-weave-ast');

console.log(
  'Iterating over all printable ASCII character to see which are accepted by the parser.'
);

const ASCII = ['\t', '\n', '\r'];

for (let i = 32; i < 127; ++i) {
  ASCII.push(String.fromCharCode(i));
}

for (const source of ASCII) {
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
