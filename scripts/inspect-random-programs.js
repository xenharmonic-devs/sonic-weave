import {parse} from '../src/parser/sonic-weave-ast.js';
import {createInterface} from 'node:readline';

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const CHARS = [
  '\n',
  '⊕',
  '⊖',
  '×',
  '÷',
  '¢',
  '€',
  '⅛',
  '¼',
  '⅜',
  '½',
  '⅝',
  '¾',
  '⅞',
  '𝄪',
  '𝄫',
  '𝄲',
  '𝄳',
  ...'♯‡♮♭¤£',
  'µ',
  'α',
  'β',
  'γ',
  'δ',
  'ε',
  'ζ',
  'η',
  'φ',
  'χ',
  'ψ',
  'ω',
];

for (let i = 32; i < 127; ++i) {
  CHARS.push(String.fromCharCode(i));
}

function spam() {
  let source = '';
  const l = 12 * Math.random() + 3;
  for (let i = 0; i < l; ++i) {
    source += CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  let result = '*Empty program*';
  try {
    const ast = parse(source);
    if (ast.body.length) {
      result = ast.body[0].type;
      if (ast.body.length > 1) {
        result += '+';
      }
      if (result === 'ExpressionStatement') {
        const exp = ast.body[0].expression;
        result += '->' + exp.type;
        if (exp.type === 'BinaryExpression') {
          result += `(${exp.left.type}, ${exp.right.type})`;
        }
      }
    }
  } catch (e) {
    result = '*Rejects*';
    if (e.name !== 'SyntaxError') {
      result += String(e);
    }
  }
  console.log(JSON.stringify(source).padEnd(20) + result);
  if (result === '*Rejects*') {
    spam();
  } else {
    readline.question('', spam);
  }
}

spam();
