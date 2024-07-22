const {performance} = require('perf_hooks');
const {getSourceVisitor, parseAST} = require('../dist');

const GAS = 1e14;

const visitor = getSourceVisitor(false);
visitor.rootContext.gas = 100000;

function measure(ast, minDur = 1000) {
  let totalGas = 0;
  const then = performance.now();
  while (performance.now() - then < minDur) {
    const visitor = getSourceVisitor(false);
    visitor.rootContext.gas = GAS;
    visitor.executeProgram(ast);
    totalGas += GAS - visitor.rootContext.gas;
  }
  return totalGas / (performance.now() - then);
}

const REFERENCE_AST = parseAST(`
  let i = 10r
  while (--i) {
    5/4 * 7/3
  }
`);

// Wake up the runtime
measure(REFERENCE_AST, 5000);

// Get reference
const ref = measure(REFERENCE_AST);

console.log('Reference:', ref, 'gas/ms');

const PROGRAMS = [
  'divisors(360)',
  'divisors(1111)',
  'divisors(123456)',

  'arrayRepeat(5, [1, 2, 3])',
  'arrayRepeat(100, [1, 2, 3])',
  'arrayRepeat(5, "asdf")',
  'arrayRepeat(100, "asdf")',

  '12@.5',
  '12@.41',
  '313@.41',
  '313@2.3.13/5',

  '4:5:6:8;12@',
  '4:5:6:8;311@',

  'Temperament([22@.5, 36@.5])',
  'Temperament([22@.41, 36@.41])',
  'commaList([325/324, 625/624])',

  '4:5:6:8;Temperament([12@.5, 19@.5])',
  '4:5:6:8;Temperament([12@.41, 19@.41])',

  '4:5:6:8;respell(12@.5)',
  '4:5:6:8;respell(12@.41)',
  '4:5:6:8;respell(12@.5, 2)',
  '4:5:6:8;respell(12@.19, 2)',
];

for (const prog of PROGRAMS) {
  const perf = measure(parseAST(prog));
  console.log(prog, perf, 'gas/ms');
  if (perf < 0.75 * ref) {
    console.log('  Gas cost too low!');
  } else if (perf > 1.33 * ref) {
    console.log('  Gas cost too high!');
  } else {
    console.log('  PASS');
  }
}
