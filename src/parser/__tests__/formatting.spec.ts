import {describe, it, expect} from 'vitest';
import {evaluateExpression, getSourceVisitor, parseAST} from '..';
import {repr} from '../../stdlib';

function evaluate(source: string) {
  const visitor = getSourceVisitor(false);
  const program = parseAST(source);
  for (const statement of program.body.slice(0, -1)) {
    const interrupt = visitor.visit(statement);
    if (interrupt) {
      throw new Error(`Illegal ${interrupt.type}.`);
    }
  }
  if (visitor.deferred.length) {
    throw new Error(
      'Deferred actions not allowed when evaluating expressions.'
    );
  }
  const finalStatement = program.body[program.body.length - 1];
  if (finalStatement.type !== 'ExpressionStatement') {
    throw new Error(`Expected expression. Got ${finalStatement.type}`);
  }
  const subVisitor = visitor.createExpressionVisitor();
  const result = subVisitor.visit(finalStatement.expression);
  return repr.bind(subVisitor)(result);
}

describe('SonicWeave formatting semantics', () => {
  it('can format the half eleventh', () => {
    const n6 = evaluate('P11 % 2');
    expect(n6).toBe('n6');
  });

  it('can format the double tone', () => {
    const M3 = evaluate('M2 * 2');
    expect(M3).toBe('M3');
  });

  it('can format the half twelfth', () => {
    const semi12 = evaluate('P12 % 2');
    expect(semi12).toBe('n6.5');
  });

  it("bails out when there's no Pythagorean to match", () => {
    const thirdFif = evaluate('P5 % 3');
    expect(thirdFif).toBe('1\\3<3/2>');
  });

  it('can format a decimal', () => {
    const eFlavor = evaluate('1,2');
    expect(eFlavor).toBe('1.2e');
  });

  it('has a plain formatting operator (fraction)', () => {
    const twoOverOne = evaluate('2 al~ 3/2');
    expect(twoOverOne).toBe('2/1');
  });

  it('has a plain formatting operator (nedo)', () => {
    const full12 = evaluate('2 al~ 7\\12');
    expect(full12).toBe('12\\12');
  });

  it('has a plain formatting operator (FJS)', () => {
    const P8 = evaluate('2 al~ M3');
    expect(P8).toBe('P8');
  });

  it('formats nedo unison', () => {
    const zeroOfFive = evaluate('5\\5 ~^ 0');
    expect(zeroOfFive).toBe('0\\5');
  });
});

describe('Short label formatting', () => {
  it('leaves short FJS alone', () => {
    const min7 = evaluateExpression('lstr(min7, 9)');
    expect(min7).toBe('min7');
  });

  it('turns long FJS into cents', () => {
    const turboAugmented = evaluateExpression('lstr(Aug1 * 20, 9)');
    expect(turboAugmented).toBe('2273.7001');
  });

  it('leaves short absoluteFJS alone', () => {
    const Fsharp = evaluateExpression('C4 = 263Hz;lstr(F#4, 9)');
    expect(Fsharp).toBe('F#4');
  });

  it('tries its best with long absoluteFJS', () => {
    const cursed = evaluateExpression('C4 = 263z;lstr(C4 + Aug1 * 20, 9)');
    expect(cursed).toBe('[1 1 -220 140>@Hz.263.2..');
  });

  it('turns long Hz into shorter Hz', () => {
    const freq = evaluateExpression(
      'C4 = 263z;lstr(linear(C4 + Aug1 * 20), 9)'
    );
    expect(freq).toBe('977.985Hz');
  });

  it('serves PI', () => {
    const pie = evaluateExpression('lstr(PI, 9)');
    expect(pie).toBe('3.141593r');
  });

  it('serves PI seconds', () => {
    const pies = evaluateExpression('lstr(PI * 1s, 9)');
    expect(pies).toBe('3.14159rs');
  });

  it('gives up on silly time exponents', () => {
    const eeh = evaluateExpression('lstr(E * 1s^1.23456789e, 9)');
    expect(eeh).toBe('2.718rs^*');
  });

  it('works with small values (linear)', () => {
    const smol = evaluateExpression('lstr(-0.000000000000000123456789e, 9)');
    expect(smol).toBe('-1.23e-16');
  });

  it('works with small values (logarithmic)', () => {
    const smol = evaluateExpression('lstr(-0.000000123456, 9)');
    expect(smol).toBe('-1.23e-7¢');
  });

  it('vectorizes', () => {
    const three = evaluateExpression('lstr([3/2/^2, nan, -inf * 1z], 9)');
    expect(three).toEqual(['3/2^1/2', 'nan', '-inf * 1Hz']);
  });

  it('formats F𝄱4 as is', () => {
    const FsharpSyndown = evaluateExpression('str(F𝄱4)');
    expect(FsharpSyndown).toBe('F𝄱4');
  });
});
