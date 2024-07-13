import {describe, it, expect} from 'vitest';
import {getSourceVisitor, parseAST} from '..';
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
