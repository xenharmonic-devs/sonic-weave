import {describe, it, expect} from 'vitest';
import {evaluateExpression, evaluateSource} from '../parser';
import {Interval, Val} from '../../interval';

function evaluate(source: string) {
  return evaluateExpression(source, false);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function parseSource(source: string) {
  const visitor = evaluateSource(source);
  return visitor.get('$') as Interval[];
}

function parseSingle(source: string) {
  const value = evaluateExpression(source);
  expect(value).toBeInstanceOf(Interval);
  return value as Interval;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function expand(source: string) {
  const visitor = evaluateSource(source);
  return visitor.expand(visitor.rootContext!).split('\n');
}

describe('Features related to tempering', () => {
  it('measures the zero val to be quite bad indeed', () => {
    const error = evaluate('errorTE(0@)') as Interval;
    expect(error.totalCents()).toBe(1200);
  });

  it('measures the 1@ val to be fairly bad', () => {
    const error = evaluate('errorTE(1@)') as Interval;
    expect(error.totalCents()).toBeCloseTo(145.13);
  });

  it('generates the GPV sequence for 5-limit', () => {
    const seq = evaluate(`
      const result = [1@2.3.5];
      for (let i of [0..110]) {
        push(warts(nextGPV(result[-1])), result);
      }
      str(result);
    `) as string;
    expect(seq.replace(/@2.3.5/g, '')).toBe(
      '[1, 1c, 2bbccc, 2ccc, 2c, 2, 2b, 3bccc, 3bc, 3c, 3, 3cc, 4bbcc, 4cc, 4, 4c, 4bc, 5bccc, 5bc, 5c, 5, 5cc, 6bbbc, 6bc, 6b, 6, 6cc, 7bbcc, 7cc, 7, 7c, 7bc, 8bccc, 8bc, 8c, 8, 8cc, 9bbc, 9c, 9, 9b, 9bcc, 10bcc, 10cc, 10, 10c, 10ccc, 11bbc, 11c, 11, 11b, 11bcc, 12bbc, 12c, 12, 12cc, 12bcc, 13bcc, 13b, 13, 13c, 13ccc, 14bbc, 14c, 14, 14b, 14bcc, 15bc, 15c, 15, 15cc, 15bbcc, 16cc, 16, 16b, 16bc, 17bcc, 17b, 17, 17c, 17ccc, 17bbccc, 18bc, 18b, 18, 18cc, 19bbcc, 19cc, 19, 19c, 19bc, 20bcc, 20b, 20, 20c, 20ccc, 21bbc, 21c, 21, 21b, 21bcc, 22bcc, 22cc, 22, 22c, 22bbc, 23cc, 23, 23c, 23bc, 23bccc, 24bbc]'
    );
  });

  it('can combine two vals to approach the JIP', () => {
    const thirtyOne = evaluate('tune([12@.5, 19@.5])') as Val;
    expect(thirtyOne.value.toIntegerMonzo()).toEqual([31, 49, 72]);
  });

  it('can combine two vals to approach the JIP (Wilson metric)', () => {
    const eighty = evaluate(
      'tune([12@.5, 22@.5], 5, [1 % 2, 3 /_ 2 % 3, 5 /_ 2 % 5])'
    ) as Val;
    expect(eighty.value.toIntegerMonzo()).toEqual([126, 200, 293]);
  });

  it('can combine three vals to approach the JIP', () => {
    const fourtyOne = evaluate('tune([5@.7, 17@.7, 19@.7])') as Val;
    expect(fourtyOne.value.toIntegerMonzo()).toEqual([41, 65, 95, 115]);
  });

  it('can combine four vals to approach the JIP', () => {
    const val = evaluate('tune([5@.11, 17@.11, 19@.11, 31@.11])') as Val;
    expect(val.value.toIntegerMonzo()).toEqual([72, 114, 167, 202, 249]);
  });

  it("doesn't move from 31p when tuned with 5p", () => {
    const p31 = evaluate('str(tune([31@.5, 5@.5]))');
    expect(p31).toBe('<31 49 72]');
  });

  it('moves from 31p when tuned with 5p if given a large enough radius', () => {
    const p31 = evaluateExpression('str(tune([31@.5, 5@.5], 6))');
    expect(p31).toBe('<191 302 444]');
  });

  it('tunes close to CTE meantone if given a large enough radius', () => {
    const cents = evaluate('str(cents(3/2 tmpr tune([5@.5, 7@.5], 200), 4))');
    expect(cents).toEqual('697.2143');
  });

  it('support the tempering operator with temperaments (left)', () => {
    const cents = evaluate('str(cents(3/2 tmpr commaList(81/80), 4))');
    expect(cents).toEqual('697.0491');
  });

  it('support the tempering operator with temperaments (right)', () => {
    const cents = evaluate(
      'str(cents(Temperament([12@, 19@] @.5) tmpr 3/2, 4))'
    );
    expect(cents).toEqual('697.0491');
  });

  it('has a working 13p@2.9.11', () => {
    const dots = evaluate('vstr(13p@2.9.11 dot [2, 9, 7, 11])');
    expect(dots).toEqual(['13', '41', '0', '45']);
  });

  it('measures the error of TE meantone', () => {
    const error = evaluate('errorTE(commaList(81/80))') as Interval;
    expect(error.totalCents()).toBeCloseTo(1.58222);
  });

  it('has consistent domain semantics between vals and temperaments in tempering', () => {
    const fif = parseSingle('3/2 tmpr 12@');
    expect(fif.domain).toBe('logarithmic');
    const tildeFif = parseSingle('3/2 ~tmpr 12@');
    expect(tildeFif.domain).toBe('linear');
    const fifTilde = parseSingle('12@ tmpr~ 3/2');
    expect(fifTilde.domain).toBe('linear');
    const fifImplicit = parseSource('3/2;12@')[0];
    expect(fifImplicit.domain).toBe('logarithmic');

    const fof = parseSingle('4/3 tmpr Temperament(12@.5)');
    expect(fof.domain).toBe('logarithmic');
    const tildeFof = parseSingle('4/3 ~tmpr Temperament(12@.5)');
    expect(tildeFof.domain).toBe('linear');
    const fofTilde = parseSingle('Temperament(12@.5) tmpr~ 4/3');
    expect(fofTilde.domain).toBe('linear');
    const fofImplicit = parseSource('4/3;Temperament(12@.5)')[0];
    expect(fofImplicit.domain).toBe('logarithmic');
  });

  it('has consistent dot semantics between vals and temperament vs. intervals', () => {
    const seven = parseSingle('12@ dot 3/2');
    expect(seven.domain).toBe('linear');
    expect(seven.valueOf()).toBe(7);
    expect(() => parseSingle('3/2 dot 12@')).toThrow();
    const tildeSeven = parseSingle('3/2 ~·~ 12@');
    expect(tildeSeven.domain).toBe('linear');
    expect(tildeSeven.valueOf()).toBe(7);

    const five = parseSingle('(Temperament(12@.5)·4/3)[0]');
    expect(five.domain).toBe('linear');
    expect(five.valueOf()).toBe(5);
    expect(() => parseSingle('(4/3 · Temperament(12@.5))[0]')).toThrow();
    const tildeFive = parseSingle('(4/3 ~dot Temperament(12@.5))[0]');
    expect(tildeFive.domain).toBe('linear');
    expect(tildeFive.valueOf()).toBe(5);
  });

  it('preserves FJS when respelling', () => {
    const major3rdUpFive = evaluate('str(respell(S9)(M3))');
    expect(major3rdUpFive).toBe('M3^5');

    const major6thUpFive = evaluate('str(respell(commaList(S9))(M6))');
    expect(major6thUpFive).toBe('M6^5');
  });

  it('computes a BP preimage', () => {
    const scale = expand('tet(13, 3);respell(13@3.5.7);fraction');
    expect(scale).toEqual([
      '27/25',
      '25/21',
      '9/7',
      '7/5',
      '75/49',
      '5/3',
      '9/5',
      '49/25',
      '15/7',
      '7/3',
      '63/25',
      '25/9',
      '3/1',
    ]);
  });

  it('makes a preimage for 12p', () => {
    const scale = expand(`
      1\\12 * [1..12]
      respell(12@)
      fraction
    `);
    expect(scale).toEqual([
      '15/14',
      '10/9',
      '6/5',
      '5/4',
      '4/3',
      '7/5',
      '3/2',
      '8/5',
      '5/3',
      '7/4',
      '11/6',
      '2/1',
    ]);
  });

  it('makes sengic using mapping basis monzos', () => {
    const scale = expand(`
      defer cents(£, 3)
      const sengic = commaList(686/675)
      defer sengic
      const M = mappingBasis(sengic)
      defer @M
      [0 0 1>
      [0 0 2>
      [0 0 3>
      [2 -1 0>
      [-1 1 0>
      [1 0 -3>
      [1 0 -2>
      [1 0 -1>
      [1 0 0>
    `);
    expect(scale).toEqual([
      'const sengic = Temperament([⟨1 0 2 1], ⟨0 1 0 1], ⟨0 0 3 2]])',
      'const M = @2.3.15/14',
      '129.798',
      '259.597',
      '389.395',
      '495.746',
      '704.013',
      '810.364',
      '940.162',
      '1069.961',
      '1199.759',
    ]);
  });

  it('Unimarvs double duodene', () => {
    const scale = expand(
      'eulerGenus(675*7, 9);respell([225/224, 385/384], 2);organize()'
    );
    expect(scale).toEqual([
      '45/44',
      '25/24',
      '12/11',
      '10/9',
      '7/6',
      '40/33',
      '5/4',
      '21/16',
      '4/3',
      '15/11',
      '25/18',
      '16/11',
      '3/2',
      '14/9',
      '18/11',
      '5/3',
      '7/4',
      '16/9',
      '20/11',
      '15/8',
      '35/18',
      '2',
    ]);
  });

  it('discovers GPVs supporting meantone', () => {
    const seq = evaluateExpression(
      'str(warts(supportingGPVs(5@2.3.5, S9, 12)))'
    );
    expect(seq).toBe(
      '[5@2.3.5, 7@2.3.5, 8cc@2.3.5, 9c@2.3.5, 10c@2.3.5, 12@2.3.5, 13ccc@2.3.5, 14c@2.3.5, 15cc@2.3.5, 16cc@2.3.5, 17c@2.3.5, 19@2.3.5]'
    );
  });

  it('discovers GPVs supporting lemba', () => {
    const seq = evaluateExpression(
      'str(warts(supportingGPVs(1@2.3.5.7, [50/49, 525/512])))'
    );
    expect(seq).toBe(
      '[6b@2.3.5.7, 10@2.3.5.7, 16@2.3.5.7, 20@2.3.5.7, 26@2.3.5.7]'
    );
  });

  it('makes standard POTE blackwood', () => {
    const scale = expand(`{
      const blackwood = POTE(256/243, 5);
      const [period, gen] = generatorsOf(blackwood);
      const numPeriods = periodsOf(blackwood);
      rank2(gen, numPeriods, 0, period, numPeriods);
      cents(£, 3);
    }`);
    expect(scale).toEqual([
      '159.594',
      '240.',
      '399.594',
      '480.',
      '639.594',
      '720.',
      '879.594',
      '960.',
      '1119.594',
      '1200.',
    ]);
  });

  it('makes standard CTE augmented', () => {
    const scale = expand(`{
      const augmented = CTE(128/125);
      const [period, gen] = generatorsOf(augmented);
      const numPeriods = periodsOf(augmented);
      rank2(gen, numPeriods, numPeriods, period, numPeriods);
      cents(£, 3);
    }`);
    expect(scale).toEqual([
      '98.045',
      '301.955',
      '400.',
      '498.045',
      '701.955',
      '800.',
      '898.045',
      '1101.955',
      '1200.',
    ]);
  });

  it('makes standard TE mirkwai', () => {
    const scale = expand(`{
      const mirkwai = TE(16875/16807)
      const [period, gen1, gen2] = mappingBasis(mirkwai)
      gen1;gen2;period
      vstr($)
      mirkwai
      cents(£, 3)
    }`);
    expect(scale).toEqual(['1901.783 "3"', '583.905 "7/5"', '1200. "2"']);
  });

  it('knows miracle is miracle', () => {
    const yup = evaluate(
      'Temperament([10@.7, 21@.7]) == commaList([S15, S7-S8])'
    );
    expect(yup).toBe(true);
  });

  it('knows miracle is not rodan', () => {
    const nah = evaluate(
      'Temperament([10@.7, 21@.7]) == commaList([245/243, 1029/1024])'
    );
    expect(nah).toBe(false);
  });
});
