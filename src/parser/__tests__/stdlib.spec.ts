import {describe, it, expect} from 'vitest';
import {
  ExpressionVisitor,
  evaluateExpression,
  evaluateSource,
  getSourceVisitor,
  parseAST,
} from '../../parser';
import {Interval, Val} from '../../interval';
import {builtinNode, track} from '../../stdlib';
import {Fraction} from 'xen-dev-utils';

function parseSource(source: string) {
  const visitor = evaluateSource(source);
  return visitor.get('$') as Interval[];
}

function parseSingle(source: string) {
  const value = evaluateExpression(source);
  expect(value).toBeInstanceOf(Interval);
  return value as Interval;
}

function expand(source: string) {
  const visitor = evaluateSource(source);
  return visitor.expand(visitor.rootContext!).split('\n');
}

describe('SonicWeave standard library', () => {
  it('converts MIDI note number to frequency', () => {
    const scale = parseSource('mtof(60);');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('4685120000^1/4 * 1Hz');
  });

  it('converts frequency to MIDI note number / MTS value', () => {
    const scale = parseSource('ftom(261.6 Hz);');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.value.valueOf()).toBeCloseTo(60);
  });

  it('generates equal temperaments', () => {
    const scale = parseSource('tet(6);');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\6;2\\6;3\\6;4\\6;5\\6;6\\6'
    );
  });

  it('generates tritave equivalent equal temperaments', () => {
    const scale = parseSource('tet(3,3);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\3<3>;2\\3<3>;3\\3<3>'
    );
  });

  it('generates MOS scales', () => {
    const scale = parseSource('mos(5, 2, niente, niente, 5);');
    expect(scale).toHaveLength(7);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '2\\12;4\\12;5\\12;7\\12;9\\12;11\\12;12\\12'
    );
  });

  it('generates subharmonic segments', () => {
    const scale = parseSource('subharmonics(4, 8);');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('8/7;8/6;8/5;8/4');
  });

  it('generates rank-2 scales', () => {
    const scale = parseSource('rank2(707.048, 4, 4, 600.0, 2);');
    expect(scale).toHaveLength(10);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '107.048;214.096;385.904;492.952;600.0;707.048;814.096;985.904;1092.952;1200.'
    );
  });

  it('generates combination product sets (default params)', () => {
    const scale = parseSource('cps([3, 5, 7], 2);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('7/6;7/5;2');
  });

  it('generates combination product sets (custom)', () => {
    const scale = parseSource('cps([2, 5, 7], 2, 3, true);');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('10/9;35/27;14/9;3');
  });

  it('generates well-temperaments', () => {
    const werckmeister3 = parseSource(
      'wellTemperament([0, 0, 0, -1/4, -1/4, -1/4, 0, 0, -1/4, 0, 0], 81/80, 3);cents;'
    );
    expect(werckmeister3).toHaveLength(12);
    expect(werckmeister3.map(i => i.toString()).join(';')).toBe(
      '92.17871646099634r¢;193.1568569324175r¢;294.1349974038386r¢;391.6902862640137r¢;498.0449991346128r¢;590.2237155956096r¢;696.5784284662086r¢;794.1337173263842r¢;889.7352853986264r¢;996.0899982692256r¢;1093.645287129401r¢;1200.'
    );
  });

  it('generates a cube', () => {
    const scale = parseSource('parallelotope([3, 5, 7]);');
    expect(scale).toHaveLength(8);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '35/32;5/4;21/16;3/2;105/64;7/4;15/8;2'
    );
  });

  it('generates Euler-Fokker genera', () => {
    const scale = parseSource('eulerGenus(45);');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '9/8;5/4;45/32;3/2;15/8;2'
    );
  });

  it('generates Euler-Fokker genera with colors', () => {
    const scale = expand('eulerGenus(15 white, 1, 2 gray)');
    expect(scale).toEqual(['5/4 white', '3/2 white', '15/8 white', '2 gray']);
  });

  it('generates the Easter egg', () => {
    const scale = parseSource('octaplex(3, 5, 7, 11);');
    expect(scale).toHaveLength(24);
  });

  it('can take edo subsets', () => {
    const scale = parseSource('tet(7);subset([0, 1, 2]);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('1\\7;2\\7;7\\7');
  });

  it('can take relative edo subsets', () => {
    const scale = parseSource('tet(12);subset(cumsum([0, 2, 2, 1, 2, 2, 2]));');
    expect(scale).toHaveLength(7);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '2\\12;4\\12;5\\12;7\\12;9\\12;11\\12;12\\12'
    );
  });

  it('can take out the unison rotating the result', () => {
    const scale = expand('3\\100;10\\100;75\\100;100\\100;subset([1, 2])');
    expect(scale).toEqual(['7\\100', '100\\100']);
  });

  it('reduces scales by their equave', () => {
    const scale = parseSource('3;5;7;11;13;2;reduce();');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '3/2;5/4;7/4;11/8;13/8;2'
    );
  });

  it('has a nothing', () => {
    const scale = parseSource('niente;');
    expect(scale).toHaveLength(0);
  });

  it('retroverts scales', () => {
    const scale = parseSource('1\\6;2\\6;3\\6;6\\6;retrovert();');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('3\\6;4\\6;5\\6;6\\6');
  });

  it('rotates scales one step', () => {
    const scale = parseSource('1\\6;2\\6;6\\6;rotate();');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('1\\6;5\\6;6\\6');
  });

  it('rotates scales two steps', () => {
    const scale = parseSource('1\\6;2\\6;6\\6;rotate 2;');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('4\\6;5\\6;6\\6');
  });

  it('rotates scales zero steps', () => {
    const scale = parseSource('1\\6;2\\6;6\\6;rotate(0);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('1\\6;2\\6;6\\6');
  });

  it('rotates scales negative one steps', () => {
    const scale = parseSource('1\\6;2\\6;6\\6;rotate(-1);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('4\\6;5\\6;6\\6');
  });

  it('clears the scale', () => {
    const scale = parseSource('2;clear();');
    expect(scale).toHaveLength(0);
  });

  it('clears the scale (repeat(0))', () => {
    const scale = parseSource('2;repeat(0);');
    expect(scale).toHaveLength(0);
  });

  it('can round to nearest harmonic', () => {
    const scale = parseSource('1\\3 "alice";2\\3 green;3\\3;toHarmonics(16);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '(20/16 "alice");(25/16 green);32/16'
    );
  });

  it('can round to nearest subharmonic', () => {
    const scale = parseSource('1\\3 "bob";2\\3 green;3\\3;toSubharmonics(16);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '(16/13 "bob");(16/10 green);16/8'
    );
  });

  it('can round to nearest equal division', () => {
    const scale = parseSource('4/3 "charlie";5/3 red;6/3;equalize(7);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '(3\\7 "charlie");(5\\7 red);7\\7'
    );
  });

  it('can merge offset copies', () => {
    const zarlino = parseSource(
      'rank2(3/2, 3); mergeOffset(5/4); rotate(4); simplify;'
    );
    expect(zarlino).toHaveLength(7);
    expect(zarlino.map(i => i.toString()).join(';')).toBe(
      '9/8;5/4;4/3;3/2;5/3;15/8;2'
    );
  });

  it('can merge offset copies with overflow preferences', () => {
    const scale = parseSource(
      'rank2(3/2, 3); mergeOffset(5/4, "wrap"); rotate(2); simplify;'
    );
    expect(scale).toHaveLength(8);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '10/9;5/4;4/3;3/2;5/3;16/9;15/8;2'
    );
  });

  it('makes sense of negative offsets', () => {
    const drop = parseSource('2;mergeOffset(1/3, "drop");');
    expect(drop.map(i => i.toString()).join(';')).toBe('2');
    const wrap = parseSource('2;mergeOffset(1/3, "wrap");');
    expect(wrap.map(i => i.toString()).join(';')).toBe('4/3;2');
    const keep = parseSource('2;mergeOffset(1/3, "keep");');
    expect(keep.map(i => i.toString()).join(';')).toBe('1/3;2');
  });

  it('can merge polyoffsets', () => {
    const scale = parseSource('2:3:4; mergeOffset(4:5:7, "wrap"); simplify');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '5/4;21/16;3/2;7/4;15/8;2'
    );
  });

  it('modifies the equave when merging an offset with "keep"', () => {
    const scale = parseSource(
      '4/3;3/2;2/1; mergeOffset(11/8, "keep"); simplify'
    );
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '4/3;11/8;3/2;11/6;2;33/16'
    );
  });

  it('can compress a scale', () => {
    const scale = parseSource('3/2;2;stretch(99e-2);');
    expect(scale).toHaveLength(2);
    expect(scale[0].value.valueOf()).toBeCloseTo(1.494);
    expect(scale[1].value.valueOf()).toBeCloseTo(1.986);
  });

  it('can randomize a scale (stable equave)', () => {
    const scale = parseSource('4/3;2;randomVariance(10.0);');
    expect(scale).toHaveLength(2);
    expect(scale[0].value.valueOf()).greaterThan(1.32);
    expect(scale[0].value.valueOf()).lessThan(1.342);
    expect(scale[1].value.valueOf()).toBe(2);
  });

  it('can randomize a scale (unstable equave)', () => {
    const scale = parseSource('4/3;2;randomVariance(10.0, true);');
    expect(scale).toHaveLength(2);
    expect(scale[0].value.valueOf()).greaterThan(1.32);
    expect(scale[0].value.valueOf()).lessThan(1.342);
    expect(scale[1].value.valueOf()).not.toBe(2); // There's like a one in a quadrillion chance that this fails.
    expect(scale[1].value.valueOf()).greaterThan(1.98);
    expect(scale[1].value.valueOf()).lessThan(2.02);
  });

  it('can generate alternating generator sequences (diasem #1)', () => {
    const scale = parseSource('csgs([8/7, 7/6]);');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('8/7;4/3;32/21;2');
  });

  it('can generate alternating generator sequences (diasem #2)', () => {
    const scale = parseSource('csgs([8/7, 7/6], 2);');
    expect(scale).toHaveLength(5);
    expect(scale.map(i => i.toString()).join(';')).toBe('8/7;4/3;32/21;16/9;2');
  });

  it('can generate generator sequences (diasem #3)', () => {
    const scale = parseSource('csgs([8/7, 7/6], 3);');
    expect(scale).toHaveLength(9);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '64/63;8/7;32/27;4/3;256/189;32/21;128/81;16/9;2'
    );
  });

  it('throws for gs with no constant structure', () => {
    expect(() => parseSource('csgs([8/7, 7/6, 8/7], 3);')).toThrow();
  });

  it('can generate generator sequences (zil[5])', () => {
    const scale = expand(
      'gs([8/7, 7/6, 8/7, 7/6, 8/7, 7/6, 8/7, 189/160, 8/7, 7/6], 5)'
    );
    expect(scale).toEqual(['8/7', '4/3', '32/21', '16/9', '2']);
  });

  it('can generate generator sequences (zil[14])', () => {
    const scale = expand(
      'gs([8/7, 7/6, 8/7, 7/6, 8/7, 7/6, 8/7, 189/160, 8/7, 7/6], 14)'
    );
    expect(scale).toEqual([
      '64/63',
      '16/15',
      '8/7',
      '32/27',
      '128/105',
      '4/3',
      '256/189',
      '64/45',
      '32/21',
      '8/5',
      '512/315',
      '16/9',
      '64/35',
      '2',
    ]);
  });

  it('can access docstrings', () => {
    const doc = evaluateExpression('doc(void)');
    expect(doc).toBe(
      "Get rid of expression results. `void(++i)` increments the value but doesn't push anything onto the scale."
    );
  });

  it('can generate the marveldene without irrational stretching', () => {
    const scale = parseSource(`
      eulerGenus(675, 15)
      166@
      stretch(10005e-4)
    `);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '2001\\20750;14007\\83000;22011\\83000;106053\\332000;138069\\332000;162081\\332000;194097\\332000;226113\\332000;122061\\166000;282141\\332000;6003\\6640;2001\\2000'
    );
  });

  it('can combine two vals to approach the JIP', () => {
    const thirtyOne = evaluateExpression('tune(12@.5, 19@.5)') as Val;
    expect(thirtyOne.value.toIntegerMonzo()).toEqual([31, 49, 72]);
  });

  it('can combine two vals to approach the JIP (Wilson metric)', () => {
    const fiftyTwo = evaluateExpression(
      'tune(12@.5, 22@.5, 3, "wilson")'
    ) as Val;
    // Pretty bad TBH
    expect(fiftyTwo.value.toIntegerMonzo()).toEqual([52, 83, 120]);
  });

  it('can combine three vals to approach the JIP', () => {
    const fourtyOne = evaluateExpression('tune3(5@.7, 17@.7, 19@.7)') as Val;
    expect(fourtyOne.value.toIntegerMonzo()).toEqual([41, 65, 95, 115]);
  });

  // Remember that unison (0.0 c) is implicit in SonicWeave

  it('has harmonic segments sounding downwards', () => {
    const harmonicSeventhChord = parseSource('7::4');
    expect(harmonicSeventhChord[0].totalCents()).toBeCloseTo(-266.870905); // subminor third
    expect(harmonicSeventhChord[1].totalCents()).toBeCloseTo(-582.512193); // lesser septimal tritone
    expect(harmonicSeventhChord[2].totalCents()).toBeCloseTo(-968.825906); // harmonic seventh
  });

  // Four natural ways of spelling the just major chord in root position
  it('can spell the just major chord super-overtonally', () => {
    const superOvertone = parseSource('o(4:5:6)');
    expect(superOvertone[0].totalCents()).toBeCloseTo(386.313714); // major third
    expect(superOvertone[1].totalCents()).toBeCloseTo(701.955001); // perfect fifth
  });

  it('can spell the just major chord sub-overtonally', () => {
    const subOvertone = parseSource('revpose(6:5:4)');
    expect(subOvertone[0].totalCents()).toBeCloseTo(386.313714); // major third
    expect(subOvertone[1].totalCents()).toBeCloseTo(701.955001); // perfect fifth
  });

  it('can spell the just major chord retroverted', () => {
    const retroversion = parseSource('retrovert(10:12:15)');
    expect(retroversion[0].totalCents()).toBeCloseTo(386.313714); // major third
    expect(retroversion[1].totalCents()).toBeCloseTo(701.955001); // perfect fifth
  });

  it('can spell the just major chord reflected', () => {
    const reflection = parseSource('reflect(15:12:10)');
    expect(reflection[0].totalCents()).toBeCloseTo(386.313714); // major third
    expect(reflection[1].totalCents()).toBeCloseTo(701.955001); // perfect fifth
  });

  // Major inversions
  it('can spell the just major chord in first inversion with root on 1/1', () => {
    const firstInversion = parseSource('8:5:6');
    expect(firstInversion[0].totalCents()).toBeCloseTo(-813.686286); // minor sixth
    expect(firstInversion[1].totalCents()).toBeCloseTo(-498.044999); // perfect fourth
  });

  it('can spell the just major chord in second inversion with root on 1/1', () => {
    const secondInversion = parseSource('4:5:3');
    expect(secondInversion[0].totalCents()).toBeCloseTo(386.313714); // major third
    expect(secondInversion[1].totalCents()).toBeCloseTo(-498.044999); // perfect fourth
  });

  // Minor inversions
  it('can spell the just minor chord in root position', () => {
    const rootPosition = parseSource('u(6:5:4)');
    expect(rootPosition[0].totalCents()).toBeCloseTo(315.641287); // minor third
    expect(rootPosition[1].totalCents()).toBeCloseTo(701.955001); // perfect fifth
  });

  it('can spell the just minor chord in first inversion with root on 1/1', () => {
    const firstInversion = parseSource('reflect(3:5:4)');
    expect(firstInversion[0].totalCents()).toBeCloseTo(-884.358713); // major sixth
    expect(firstInversion[1].totalCents()).toBeCloseTo(-498.044999); // perfect fourth
  });

  it('can spell the just minor chord in second inversion with root on 1/1', () => {
    const secondInversion = parseSource('reflect(6:5:8)');
    expect(secondInversion[0].totalCents()).toBeCloseTo(315.641287); // major sixth
    expect(secondInversion[1].totalCents()).toBeCloseTo(-498.044999); // perfect fourth
  });

  it('has the means to convert JI scales to enumerations', () => {
    const scale = expand('12/11;6/5;4/3;3/2;elevate();simplify');
    expect(scale.join(':')).toBe('330:360:396:440:495');
  });

  it('has the means to convert JI scales to retroverted enumerations', () => {
    const scale = expand('12/11;6/5;4/3;3/2;retrovert();elevate();simplify');
    expect(`retroverted(${scale.join(':')})`).toBe('retroverted(8:9:10:11:12)');
  });

  it('has the means to convert JI scales to reflected enumerations', () => {
    const scale = expand('12/11;6/5;4/3;3/2;reflect();elevate();simplify');
    expect(`reflected(${scale.join(':')})`).toBe('reflected(12:11:10:9:8)');
  });

  it('has the means to keep already enumerated scales enumerated', () => {
    const scale = expand('4:12:14:16;elevate();simplify');
    expect(scale.join(':')).toBe('2:6:7:8');
  });

  it("doesn't introduce extra denominators when elevating", () => {
    const scale = expand('5/3;10/3;elevate();simplify');
    expect(scale.join(':')).toBe('3:5:10');
  });

  it('has a constant structure calculator', () => {
    // 6\12 is ambiguous as a fourth and a fifth
    const no = evaluateExpression(
      'hasConstantStructure(mos(5, 2))'
    ) as Interval;
    expect(no.toString()).toBe('false');
    // Augmented fourth and diminished fifth are distinct in 19 edo
    const yes = evaluateExpression(
      'hasConstantStructure(mos(5, 2, 3, 2))'
    ) as Interval;
    expect(yes.toString()).toBe('true');
  });

  it('has a linear differentiator', () => {
    const steps = expand('diff([2, 3, 5, 8])');
    expect(steps).toEqual(['2', '1', '2', '3']);
  });

  it('has a geometric differentiator', () => {
    const steps = expand('geodiff(4::8);simplify');
    expect(steps).toEqual(['5/4', '6/5', '7/6', '8/7']);
  });

  it('has a copying repeater', () => {
    const bigScale = expand('repeat(2, 3::6)');
    // XXX: Would be cool if that last 4/1 was 12/3, but can't come up
    // with formatting rules that wouldn't mess up everything else.
    expect(bigScale).toEqual(['4/3', '5/3', '6/3', '8/3', '10/3', '4/1']);
  });

  it('preserves color upon reflection', () => {
    const scale = parseSource('4/3 green;3/2;2/1 red;reflect()');
    expect(scale).toHaveLength(3);
    expect(scale[0].color?.value).toBe('green');
    expect(scale[1].color?.value).toBe(undefined);
    expect(scale[2].color?.value).toBe('red');
  });

  it('can reduce Raga Bhairavi to a comma recipe (inline)', () => {
    const scale = expand(
      'unstackPeriodic(unstack([16/15, 9/8, 6/5, 27/20, 3/2, 8/5, 9/5, 2/1]))'
    );
    expect(scale).toEqual([
      '24/25',
      '2025/2048',
      '2048/2025',
      '135/128',
      '80/81',
      '24/25',
      '135/128',
      '80/81',
    ]);
  });

  it('can reduce Raga Bhairavi to a comma recipe (verbs)', () => {
    const scale = expand(
      '16/15;9/8;6/5;27/20;3/2;8/5;9/5;2/1;unstack();unstackPeriodic()'
    );
    expect(scale).toEqual([
      '24/25',
      '2025/2048',
      '2048/2025',
      '135/128',
      '80/81',
      '24/25',
      '135/128',
      '80/81',
    ]);
  });

  it('can recover Raga Bhairavi from its comma recipe (inline)', () => {
    const scale = expand(`
      cumprod(
        stackPeriodic(
          10/9,
          [
            24/25,
            2025/2048,
            2048/2025,
            135/128,
            80/81,
            24/25,
            135/128,
            80/81,
          ]
        )
      )
      simplify
    `);
    expect(scale).toEqual([
      '16/15',
      '9/8',
      '6/5',
      '27/20',
      '3/2',
      '8/5',
      '9/5',
      '2',
    ]);
  });

  it('can recover Raga Bhairavi from its comma recipe (verbs)', () => {
    const scale = expand(`
      24/25
      2025/2048
      2048/2025
      135/128
      80/81
      24/25
      135/128
      80/81
      stackPeriodic(10/9)
      stack()
      simplify
    `);
    expect(scale).toEqual([
      '16/15',
      '9/8',
      '6/5',
      '27/20',
      '3/2',
      '8/5',
      '9/5',
      '2',
    ]);
  });

  it('can calculate log pi', () => {
    const logPi = evaluateExpression('str(log(PI))');
    expect(logPi).toBe('1.1447298858494r');
  });

  it('can build a scale from self-referencing copies', () => {
    const scale = expand('3;2;2;[$, $];i => i \\ sum();stack()');
    expect(scale).toEqual([
      '3\\21',
      '5\\21',
      '7\\21',
      '10\\21',
      '12\\21',
      '14\\21',
      '17\\21',
      '19\\21',
      '21\\21',
    ]);
  });

  it.fails("doesn't blow up while typing out commands", () => {
    const ast = parseAST(`
      1485/1536
      21504/19602
      8910/9408
      448/450
      2970/3072
      384/363
      154/162
      810/784
      147/150
      30/49
      210/81
      96/150
      periostack // Didn't finish typing out the parenthesis
    `);
    const visitor = getSourceVisitor();
    visitor.rootContext!.gas = 1000;
    for (const statement of ast.body) {
      visitor.visit(statement);
    }
  });

  it('spans a lattice in cents', () => {
    const scale = expand(
      'parallelotope([123.4, 567.9], [2, 1], [1, 0], 1200.)'
    );
    expect(scale).toEqual([
      '123.4',
      '246.8',
      '444.5',
      '567.9',
      '691.3',
      '814.7',
      '1076.6',
      '1200.',
    ]);
  });

  it('calculates an arithmetic mean', () => {
    const mean = parseSingle('avg(5/4, 4/3, 3/2)');
    expect(mean.toString()).toBe('49/36');
  });

  it('calculates a harmonic mean', () => {
    const mean = parseSingle('havg(5/4, 4/3, 3/2)');
    expect(mean.toString()).toBe('180/133');
  });

  it('calculates a geometric mean', () => {
    const mean = parseSingle('geoavg(5/4, 4/3, 3/2)');
    expect(mean.toString()).toBe('5/2^1/3');
  });

  it('calculates the circle distance of 100/99 and 100/51', () => {
    const value = parseSingle('circleDistance(100/99, 100/51, 2/1)');
    expect(value.valueOf()).toBeCloseTo(34 / 33);
  });

  it('coalesces intervals that are close to each other', () => {
    const scale = expand('50/49;49/48;3/2;2/1;coalesce()');
    expect(scale).toEqual(['49/48', '3/2', '2/1']);
  });

  it('coalesces with zero tolerance', () => {
    const scale = expand('5/4;3/2;7/4;7/4;7/4;2/1;coalesce(0.)');
    expect(scale).toEqual(['5/4', '3/2', '7/4', '2/1']);
  });

  it('pops a specific index', () => {
    const scale = expand('6::12;void(pop($, 4))');
    expect(scale).toEqual(['7/6', '8/6', '9/6', '10/6', '12/6']);
  });

  it('preserves labels when rotating', () => {
    const scale = parseSource(
      '5/4 yellow "third";3/2 white "fifth";2/1 rgba(255, 255, 255, 0.5e) "octave";rotate()'
    );
    expect(scale).toHaveLength(3);
    expect(scale[0].valueOf()).toBeCloseTo(6 / 5);
    expect(scale[0].color?.value).toBe('white');
    expect(scale[0].label).toBe('fifth');
    expect(scale[1].valueOf()).toBeCloseTo(8 / 5);
    expect(scale[1].color?.value).toBe(
      'rgba(255.000 255.000 255.000 / 0.50000)'
    );
    expect(scale[1].label).toBe('octave');
    expect(scale[2].valueOf()).toBeCloseTo(2);
    expect(scale[2].color?.value).toBe('yellow');
    expect(scale[2].label).toBe('third');
  });

  it("doesn't eat colors across lines", () => {
    const scale = expand(`
      4/3 red
      3/2 "fifth"
      7/4
      2/1 "root" blue
      rotate(0)
    `);
    expect(scale).toEqual(['4/3 red', '3/2 "fifth"', '7/4', '2/1 "root" blue']);
  });

  it('coalesces cents geometrically', () => {
    const scale = expand(`
      100.
      200.
      202.
      1200.
      coalesce(3.5, 'geoavg')
    `);
    expect(scale).toEqual(['100.', '201.', '1200.']);
  });

  it('can store colors and labels for later', () => {
    const scale = expand(`{
      1 red "one"
      2 "two"
      3
      const cs = colorsOf()
      const ls = labelsOf()
      clear()
      3::6
      £ cs
      £ ls
    }`);
    expect(scale).toEqual(['4/3 "one" red', '5/3 "two"', '6/3']);
  });

  it('generates Raga Kafi with everything simplified', () => {
    const scale = expand('rank2(3/2 white, 2, 3)\ninsert(5/3 black)');
    expect(scale).toEqual([
      '9/8 white',
      '32/27 white',
      '4/3 white',
      '3/2 white',
      '5/3 black',
      '16/9 white',
      '2',
    ]);
  });

  it('generates 22 Shruti with the intended colors', () => {
    const scale = expand(
      "rank2(3/2 white, 4, 0, 2/1 gray)\nmergeOffset([10/9 yellow, 16/15 green, 256/243 white, 9/8 white], 'wrap')\nsimplify"
    );
    expect(scale).toEqual([
      '256/243 white',
      '16/15 green',
      '10/9 yellow',
      '9/8 white',
      '32/27 white',
      '6/5 green',
      '5/4 yellow',
      '81/64 white',
      '4/3 white',
      '27/20 green',
      '45/32 yellow',
      '729/512 white',
      '3/2 white',
      '128/81 white',
      '8/5 green',
      '5/3 yellow',
      '27/16 white',
      '16/9 white',
      '9/5 green',
      '15/8 yellow',
      '243/128 white',
      '2 gray',
    ]);
  });

  it('has inline labeling', () => {
    const pythagoras = expand(`
      ['F', 'C', 'G', 'D', 'A', 'E', 'B'] [3^i rdc 2 white for i of [-2..4]]
      ['Gb', 'Db', 'Ab', 'Eb', 'Bb'] [3^i rdc 2 black for i of [-7..-3]]
      sort()
    `);
    expect(pythagoras).toEqual([
      '256/243 "Ab" black',
      '9/8 "A" white',
      '32/27 "Bb" black',
      '81/64 "B" white',
      '4/3 "C" white',
      '1024/729 "Db" black',
      '3/2 "D" white',
      '128/81 "Eb" black',
      '27/16 "E" white',
      '16/9 "F" white',
      '4096/2187 "Gb" black',
      '2 "G" white',
    ]);
  });

  it('merges offsets without duplicating', () => {
    const scale = expand('4/3;3/2;2/1;mergeOffset(3/2, "wrap");simplify');
    expect(scale).toEqual(['9/8', '4/3', '3/2', '2']);
  });

  it('can generate vertically aligned objects', () => {
    const vao = expand('vao(16, 64)');
    expect(vao).toEqual(['16/16', '17/16', '18/16', '19/16', '24/16', '57/16']);
  });

  it('can generate concordance shells', () => {
    const shell = expand('concordanceShell(37, 255, 12, 5.0, 2/1)');
    expect(shell).toEqual([
      '1\\12 "157"',
      '2\\12 "83"',
      '3\\12 "44"',
      '4\\12 "93 & 187"',
      '5\\12 "99 & 197"',
      '6\\12 "209"',
      '7\\12 "111"',
      '8\\12 "235"',
      '9\\12 "249"',
      '10\\12 "66"',
      '11\\12 "70"',
      '12\\12 "37"',
    ]);
  });

  it('equalizes a wide harmonic segment', () => {
    const scale = expand('4::16;equalize(23)');
    expect(scale).toEqual([
      '8\\23',
      '14\\23',
      '18\\23',
      '24\\23',
      '26\\23',
      '30\\23',
      '34\\23',
      '36\\23',
      '40\\23',
      '42\\23',
      '44\\23',
      '2\\1',
    ]);
  });

  it('has reasonable formatting for geometric differences', () => {
    const scale = expand('geodiff(4:5:6:7)');
    expect(scale).toEqual(['5/4', '6/5', '7/6']);
  });

  it('can declare reference frequency at the same time as reference pitch', () => {
    const two = evaluateExpression('A_4 = 440z = 1/1; str(relin(A5))');
    expect(two).toBe('2');
  });

  it('can convert just intonation to NFJS', () => {
    const n3 = evaluateExpression('str(NFJS(11/9))');
    expect(n3).toBe('n3^11n');
  });

  it('can convert just intonation to absolute NFJS', () => {
    const semidimA = evaluateExpression('C4 = 1/1;str(absoluteNFJS(13/8))');
    expect(semidimA).toBe('Ad4^13n');
  });

  it('can convert just intonation to HEJI', () => {
    const m3 = evaluateExpression('str(HEJI(6/5))');
    expect(m3).toBe('m3^5h');
  });

  it('can convert just intonation to extended absolute HEJI', () => {
    const D4 = evaluateExpression('C4 = 1/1;str(absoluteHEJI(73/64))');
    expect(D4).toBe('D♮4^73h');
  });

  it('can replace all occurences of a relative step with others', () => {
    const splitCPS = expand(
      'cps([1, 3, 5, 7], 2);replaceStep(7/6, [11/10, 35/33])'
    );
    expect(splitCPS).toEqual([
      '11/10',
      '7/6',
      '5/4',
      '11/8',
      '35/24',
      '5/3',
      '7/4',
      '2',
    ]);
  });

  it('can detect domains (linear)', () => {
    const scale = expand(
      '10/8;12/10;7/6;stack();i => simplify(i) if isLinear(i) else i'
    );
    expect(scale).toEqual(['5/4', '3/2', '7/4']);
  });

  it('can detect domains (logarithmic)', () => {
    const scale = expand(
      '1\\12;3\\12;5\\12;stack();i => i if isLogarithmic(i) else simplify(i)'
    );
    expect(scale).toEqual(['1\\12', '4\\12', '9\\12']);
  });

  it('has a representation for a harmonic segment in FJS using HEJI flavors', () => {
    for (let i = 49; i <= 96; ++i) {
      const heji = parseSingle(`HEJI(${i}/48)`);
      expect(heji.valueOf()).toBeGreaterThan(1);
      expect(heji.valueOf()).toBeLessThanOrEqual(2);
      const retry = parseSingle(heji.toString());
      expect(heji.equals(retry)).toBe(true);
    }
  });

  it('can shadow immutable builtins', () => {
    const fifth = parseSingle('const simplify = "oops";sanitize(6/4)');
    expect(fifth.toString()).toBe('3/2');
  });

  it('can shadow immutable stdlib', () => {
    const scale = expand('const repeat = "Lost it!";rank2(3, 2, 0, 2 /^ 2, 2)');
    expect(scale).toEqual([
      'const repeat = "Lost it!"',
      '9/8^1/2',
      '2^1/2',
      '3/2',
      '2',
    ]);
  });

  it('can repeat unstacked steps', () => {
    const zarlino7 = expand('5;3/5;repeatFlat(3);stack();2;reduce();sort()');
    expect(zarlino7).toEqual([
      '9/8',
      '5/4',
      '45/32',
      '3/2',
      '27/16',
      '15/8',
      '2',
    ]);
  });

  it('has log10', () => {
    const three = parseSingle('log10(1000)');
    expect(three.toString()).toBe('3');
  });

  it('has sign', () => {
    const neg = parseSingle('sign(-1/12)');
    expect(neg.toString()).toBe('-1');
  });

  it('has hypot', () => {
    const spaceDiagonal = parseSingle('hypot(2, 3, 5)');
    expect(spaceDiagonal.toString()).toBe('38^1/2');
  });

  it('has domain-crossing acosh', () => {
    const whatever = parseSingle('acosh(1200.)');
    expect(whatever.toString()).toBe('1.3169578969248166r');
  });

  it('has tanh', () => {
    const budgetUnity = parseSingle('tanh(10)');
    expect(budgetUnity.toString()).toBe('0.9999999958776926r');
  });

  it('is stacked', () => {
    const scale = expand('stack([5/4, 6/5])');
    expect(scale).toEqual(['5/4', '3/2']);
  });

  it("isn't that stacked actually", () => {
    const scale = expand('unstack([5/4, 3/2])');
    expect(scale).toEqual(['5/4', '6/5']);
  });

  it('has BPM', () => {
    const twoHz = parseSingle('bpm(120)');
    expect(twoHz.toString()).toBe('2 Hz');
  });

  it('can calculate the numerator of 44/30 in reduced form', () => {
    const num = parseSingle('numerator(44/30)');
    expect(num.toInteger()).toBe(22);
  });

  it('can calculate the denominator of 44/30 in reduced form', () => {
    const num = parseSingle('denominator(44/30)');
    expect(num.toInteger()).toBe(15);
  });

  it('knows the odd limit of 10/7 is 7', () => {
    const seven = parseSingle('oddLimitOf(10/7)');
    expect(seven.toInteger()).toBe(7);
  });

  it('knows the throdd limit of 15/7 is 7', () => {
    const seven = parseSingle('oddLimitOf(15/7, 3)');
    expect(seven.toInteger()).toBe(7);
  });

  it('can generate the full 9-odd limit as a scale', () => {
    const nineOdd = expand('oddLimit(9)');
    expect(nineOdd).toEqual([
      '10/9',
      '9/8',
      '8/7',
      '7/6',
      '6/5',
      '5/4',
      '9/7',
      '4/3',
      '7/5',
      '10/7',
      '3/2',
      '14/9',
      '8/5',
      '5/3',
      '12/7',
      '7/4',
      '16/9',
      '9/5',
      '2',
    ]);
  });

  it('can generate the full 8-throdd limit as a scale', () => {
    const eightThrodd = expand('oddLimit(8, 3)');
    expect(eightThrodd).toEqual([
      '9/8',
      '8/7',
      '7/6',
      '6/5',
      '5/4',
      '9/7',
      '4/3',
      '7/5',
      '3/2',
      '8/5',
      '5/3',
      '12/7',
      '7/4',
      '9/5',
      '15/8',
      '2',
      '15/7',
      '9/4',
      '7/3',
      '12/5',
      '5/2',
      '18/7',
      '21/8',
      '8/3',
      '3',
    ]);
  });

  it('colors intervals based on deviation from 12ed2', () => {
    const scale = expand('5/4;3/2;7/4;2;edColors()');
    expect(scale).toEqual([
      '5/4 hsl(310.729deg 100.000% 50.000%)',
      '3/2 hsl(7.038deg 100.000% 50.000%)',
      '7/4 hsl(247.773deg 100.000% 50.000%)',
      '2 hsl(0.000deg 100.000% 50.000%)',
    ]);
  });

  it('stacks steps as plain numbers', () => {
    const scale = expand('2;2;1;2;2;2;1;stackLinear();i => i \\ $[-1]');
    expect(scale).toEqual([
      '2\\12',
      '4\\12',
      '5\\12',
      '7\\12',
      '9\\12',
      '11\\12',
      '12\\12',
    ]);
  });

  it('has support for custom builtins', () => {
    const view: number[][] = [];
    function latticeView(this: ExpressionVisitor) {
      view.length = 0;
      const scale = this.currentScale;
      for (let i = 0; i < scale.length; ++i) {
        scale[i] = track.bind(this)(scale[i]);
      }
      for (const interval of scale) {
        view.push(interval.value.toIntegerMonzo(true));
      }
    }
    latticeView.__doc__ =
      'Store the current order of intervals for lattice visualization.';
    latticeView.__node__ = builtinNode(latticeView);
    const visitor = evaluateSource(
      `
      1
      3
      3
      5/9
      3
      stack()
      i => i rdc 2
      latticeView()
      sort()
    `,
      true,
      {latticeView}
    );
    expect(view).toEqual([[1], [-1, 1], [-3, 2], [-2, 0, 1], [-3, 1, 1]]);
    expect(visitor.currentScale.map(i => i.toString())).toEqual([
      '9/8',
      '5/4',
      '3/2',
      '15/8',
      '2',
    ]);
    expect(visitor.currentScale.map(i => Array.from(i.trackingIds)[0])).toEqual(
      [3, 4, 2, 5, 1]
    );
  });

  it("throws if you don't pass arguments to sanitize", () => {
    expect(() => parseSingle('sanitize()')).toThrow(
      "Parameter 'interval' is required."
    );
  });

  it('can organize a scale with a single command', () => {
    const scale = expand('13;17;[1..12];13;2;organize()');
    expect(scale).toEqual([
      '17/16',
      '9/8',
      '5/4',
      '11/8',
      '3/2',
      '13/8',
      '7/4',
      '2',
    ]);
  });

  it('can organize a scale by coalescing near-duplicates', () => {
    const scale = expand(
      '4;[1, 3, 9] tns [1, 5, 25] tns [1, 7];2;organize(8.0)'
    );
    expect(scale).toEqual([
      '525/512',
      '35/32',
      '9/8',
      '75/64',
      '315/256',
      '5/4',
      '21/16',
      '175/128',
      '45/32',
      '3/2',
      '1575/1024',
      '25/16',
      '105/64',
      '7/4',
      '15/8',
      '63/32',
      '2',
    ]);
  });

  it('can get the keys of a record', () => {
    const keys = evaluateExpression('keys(#{foo: 1, bar: 2})') as string[];
    keys.sort();
    expect(keys).toEqual(['bar', 'foo']);
  });

  it('can get the values of a record', () => {
    const keys = evaluateExpression(
      'values(#{foo: "a", bar: "b"})'
    ) as string[];
    keys.sort();
    expect(keys).toEqual(['a', 'b']);
  });

  it('realizes a scale word', () => {
    const scale = expand('realizeWord("LLsLLLs", #{L: 9/8, s: 256/243})');
    expect(scale).toEqual([
      '9/8',
      '81/64',
      '4/3',
      '3/2',
      '27/16',
      '243/128',
      '2/1',
    ]);
  });

  it('realizes a scale word with a missing step', () => {
    const scale = expand('realizeWord("sLsLsLs", #{L: 2\\10})');
    expect(scale).toEqual([
      '1\\10',
      '3\\10',
      '4\\10',
      '6\\10',
      '7\\10',
      '9\\10',
      '10\\10',
    ]);
  });

  it('gracefully handles extra step sizes in the record', () => {
    const scale = expand(
      'realizeWord("LLsLLLs", #{L: 9/8, m: 16/15, s: 256/243, c: 81/80})'
    );
    expect(scale).toEqual([
      '9/8',
      '81/64',
      '4/3',
      '3/2',
      '27/16',
      '243/128',
      '2/1',
    ]);
  });

  it('realizes edge cases of `realizeWord`', () => {
    const emptiness = parseSource('realizeWord("", #{L: 2})');
    expect(emptiness).toEqual([]);
    const octave = expand('realizeWord("L", #{})');
    expect(octave).toEqual(['2']);
    const threeWholeTones = expand('realizeWord("LLL", #{L: 9/8})');
    expect(threeWholeTones).toEqual(['9/8', '81/64', '729/512']);
  });

  // XXX: This only works because reduce is in PRELUDE_VOLATILES
  it('lets you override builtins for hooking purposes', () => {
    let capturedWarning = '';
    function warn(message: string) {
      capturedWarning = message;
    }
    warn.__doc__ = 'Show a warning to the user.';
    warn.__node__ = builtinNode(warn);
    evaluateSource('6/4;6/3;reduce()', true, {warn});
    expect(capturedWarning).toBe(
      "The scale was already reduced by its equave. Did you mean 'simplify'?"
    );
  });

  it('throws an error if you use reduce as a mapper', () => {
    expect(() => parseSource('3/2;4/2;reduce')).toThrow(
      'Can only access bases, arrays, records or strings.'
    );
  });

  it('can access the application version', () => {
    const v = evaluateExpression('VERSION');
    expect(v).toContain('.');
  });

  it('supports guard rails against array manipulating stdlib', () => {
    const ast = parseAST('mos(50, 51)');

    const visitor = getSourceVisitor();
    visitor.rootContext!.gas = 200;
    expect(() => visitor.visit(ast.body[0])).toThrow();
  });

  it('coalesces schisminas by default', () => {
    const scale = expand('4096/4095;3/2;4095/2048;2/1;coalesce()');
    expect(scale).toEqual(['3/2', '2/1']);
  });

  it('preserves schisminas if asked to', () => {
    const scale = expand(
      "4096/4095;3/2;4095/2048;2/1;coalesce(3.5, 'simplest', true)"
    );
    expect(scale).toEqual(['4096/4095', '3/2', '4095/2048', '2/1']);
  });

  it('coalesces based on wilson height', () => {
    const scale = expand('70/69;37/36;P5;2;coalesce(23., "wilson")');
    expect(scale).toEqual(['70/69', 'P5', '2']);
  });

  it('calculates Euler-Fokker genus 444', () => {
    const scale = expand('eulerGenus(444)');
    expect(scale).toEqual(['37/32', '3/2', '111/64', '2']);
  });

  it('has a vectorized sinh', () => {
    const xs = evaluateExpression('sinh([0, 1, LN2])') as Interval[];
    expect(xs).toHaveLength(3);
    expect(xs[0].valueOf()).toBeCloseTo(0);
    expect(xs[1].valueOf()).toBeCloseTo(1.175);
    expect(xs[2].valueOf()).toBeCloseTo(0.75);
  });

  it('formats rotated smitonic somewhat reasonably', () => {
    const sothic = expand(`
      128/121
      324.341029rc
      421.705144rc
      16/11
      2048/1331
      973.023086rc
      2
      rotate()
    `);
    expect(sothic).toEqual([
      '226.97691372951408r¢',
      '324.3410287295142r¢',
      '11/8',
      '16/11',
      '875.658970729514r¢',
      '121/64',
      '2',
    ]);
  });

  it('formats stacked 5-limit major reasonably', () => {
    const major = expand(`
      9/8
      10/9
      16/15
      9/8
      10/9
      9/8
      16/15
      stack()
    `);
    expect(major).toEqual(['9/8', '5/4', '4/3', '3/2', '5/3', '15/8', '2/1']);
  });

  it('parses Rage Todi (golfed)', () => {
    const scale = expand(`
      rank2(3/2 white, 1, 5, 2/1 white)
      $[[2, 5]] *~= 135/128 black
    `);
    expect(scale).toEqual([
      '256/243 white',
      '32/27 white',
      '45/32 black',
      '3/2 white',
      '128/81 white',
      '15/8 black',
      '2/1 white',
    ]);
  });

  it('has vectorizing vbool', () => {
    const duckDuckGooseDuck = evaluateExpression('vbool(["", 0, 12, niente])');
    expect(duckDuckGooseDuck).toEqual([false, false, true, false]);
  });

  it('has a broadcasting domain extractor', () => {
    const scale = expand(`{
      const x = [2, P5]
      const y = [3, 6]
      domainOf(x)(linear(y) * linear(x))
    }`);
    expect(scale).toEqual(['6', '2\\1<3>']);
  });

  it('has a broadcasting domain extractor (trap)', () => {
    expect(() => evaluateExpression('domainOf([2, "fif"]) 1')).toThrow(
      'An interval is required.'
    );
  });

  it('can repeat harmonics linearly (fifth to octave)', () => {
    const scale = expand('6:7:9;repeatLinear()');
    expect(scale).toEqual(['7/6', '9/6', '10/6', '12/6']);
  });

  it('can repeat harmonics linearly (octave to double octave)', () => {
    const scale = expand('3:5:6;repeatLinear(3)');
    expect(scale).toEqual(['5/3', '6/3', '8/3', '9/3', '11/3', '12/3']);
  });

  it('can repeat JI linearly (fourth to octave)', () => {
    const scale = expand('10/9;7/6;4/3;repeatLinear(3)');
    expect(scale).toEqual([
      '10/9',
      '7/6',
      '4/3',
      '13/9',
      '9/6',
      '5/3',
      '16/9',
      '11/6',
      '6/3',
    ]);
  });

  it('has assert (success)', () => {
    evaluateSource(`
      let x = 5;
      {
          defer x += 2;
          assert(x == 5);
      }
      assert(x == 7);
    `);
  });

  it('has assert (failure)', () => {
    expect(() => evaluateSource('assert(1 == 2)')).toThrow('Assertion failed.');
  });

  it('executes deferred actions before interrupting', () => {
    const result = evaluateExpression(`
      let x = "Nothing happened...";
      riff doStuff() {
        defer x = "Deferred action triggered.";
        return 311;
        x = "Unreachable code executed!";
        throw "Execution shouldn't reach here!";
      }
      assert(doStuff() == 311);
      x;
    `);
    expect(result).toBe('Deferred action triggered.');
  });

  it('has Python 2 ranges (all params)', () => {
    const range = expand('range(3, 8, 2)');
    expect(range).toEqual(['3', '5', '7']);
  });

  it('has Python 2 ranges (start with end)', () => {
    const range = expand('range(-1, 3)');
    expect(range).toEqual(['-1', '0', '1', '2']);
  });

  it('has Python 2 ranges (end)', () => {
    const range = expand('range(3)');
    expect(range).toEqual(['0', '1', '2']);
  });

  it('has Python 2 ranges (negative step)', () => {
    const range = expand('range(3, 0, -1)');
    expect(range).toEqual(['3', '2', '1']);
  });

  it('produces the correct 5L 8s scale', () => {
    const scale = expand('mos(5, 8);stepString()');
    expect(scale).toEqual([
      '"LsLssLsLssLss"',
      '2\\18',
      '3\\18',
      '5\\18',
      '6\\18',
      '7\\18',
      '9\\18',
      '10\\18',
      '12\\18',
      '13\\18',
      '14\\18',
      '16\\18',
      '17\\18',
      '18\\18',
    ]);
  });

  it('produces MOS scales of negative hardness', () => {
    const scale = expand('mos(5, 2, 2, -1)');
    expect(scale).toEqual([
      '2\\8',
      '4\\8',
      '6\\8',
      '5\\8',
      '7\\8',
      '9\\8',
      '8\\8',
    ]);
  });

  it('produces descending MOS scales', () => {
    const scale = expand('mos(5, 2, -2, -1, 5)');
    expect(scale).toEqual([
      '-2\\12',
      '-4\\12',
      '-5\\12',
      '-7\\12',
      '-9\\12',
      '-11\\12',
      '-12\\12',
    ]);
  });

  it('supports size hints for rank-2 preimages', () => {
    const scale = expand(`
      rank2(10/9 red, 7, 0, 2/1 green, 1, 2\\15)
      i => i str(i)
      15@
    `);
    expect(scale).toEqual([
      '2\\15 "10/9" red',
      '4\\15 "100/81" red',
      '6\\15 "1000/729" red',
      '8\\15 "10000/6561" red',
      '10\\15 "100000/59049" red',
      '12\\15 "1000000/531441" red',
      '14\\15 "10000000/4782969" red',
      '15\\15 "2/1" green',
    ]);
  });

  it('supports size hints for rank-3 preimages', () => {
    const scale = expand(`
      parallelotope([3 red, 5 green], [2, 3], niente, 2 blue, [1892.986, 2795.938], 1196.430)
      i => i str(i)
      PrimeMapping(1196.430, 1892.986, 2795.938, 3382.895)
    `);
    expect(scale).toEqual([
      '12.804 "125/128" green',
      '196.682 "9/8" red',
      '209.486 "1125/1024" red',
      '306.282 "75/64" red',
      '403.078 "5/4" green',
      '599.76 "45/32" red',
      '696.556 "3/2" red',
      '709.36 "375/256" red',
      '806.156 "25/16" green',
      '1002.838 "225/128" red',
      '1099.634 "15/8" red',
      '1196.43 "2" blue',
    ]);
  });

  it('has sensible parallelotope coloring (without size hints)', () => {
    const scale = expand(
      'parallelotope([3 red, 5 green], [2, 3], niente, 2 blue)'
    );
    expect(scale).toEqual([
      '1125/1024 red',
      '9/8 red',
      '75/64 red',
      '5/4 green',
      '45/32 red',
      '375/256 red',
      '3/2 red',
      '25/16 green',
      '225/128 red',
      '15/8 red',
      '125/64 green',
      '2 blue',
    ]);
  });

  it('has reasonable default formatting for a parallellotope', () => {
    const scale = expand('parallelotope([3/2, 7/81], [5, 1], [0, 0], 2/1)');
    expect(scale).toEqual([
      '28/27',
      '9/8',
      '7/6',
      '81/64',
      '21/16',
      '112/81',
      '3/2',
      '14/9',
      '27/16',
      '7/4',
      '243/128',
      '2/1',
    ]);
  });

  it('preserves equave formatting in organize()', () => {
    const scale = expand('1;2/1;organize()');
    expect(scale).toEqual(['2/1']);
  });

  it('coalesces an empty scale', () => {
    const scale = parseSource('coalesce()');
    expect(scale).toEqual([]);
  });

  it('coalesces a scale of one element', () => {
    const scale = expand('4/3;coalesce()');
    expect(scale).toEqual(['4/3']);
  });

  it('coalesces a scale of two different elements', () => {
    const scale = expand('4/3;3/2;coalesce()');
    expect(scale).toEqual(['4/3', '3/2']);
  });

  it('coalesces a scale of two equivalent elements', () => {
    const scale = expand('1;2/1;coalesce()');
    expect(scale).toEqual(['2/1']);
  });

  it('coalesces a scale of three equivalent elements', () => {
    const scale = expand('2;2/1;P8;coalesce(3.5, "simplest", true)');
    expect(scale).toEqual(['P8']);
  });

  it('can stack edosteps', () => {
    const scale = expand('tetStack([1, 2, 3, 1, 2])');
    expect(scale).toEqual(['1\\9', '3\\9', '6\\9', '7\\9', '9\\9']);
  });

  it('can stack edfsteps', () => {
    const scale = expand('tetStack([2, 3, 2, 1], 3/2)');
    expect(scale).toEqual(['2\\8<3/2>', '5\\8<3/2>', '7\\8<3/2>', '8\\8<3/2>']);
  });

  it('generates 5afdo', () => {
    const scale = expand('afdo(5)');
    expect(scale).toEqual(['6/5', '7/5', '8/5', '9/5', '2']);
  });

  it('generates 5afdt', () => {
    const scale = expand('afdo(5, 3)');
    expect(scale).toEqual(['7/5', '9/5', '11/5', '13/5', '3']);
    // Verify that it's an arithmetic progression
    const fracs = scale.map(f => new Fraction(f));
    fracs.unshift(new Fraction(1));
    for (let i = 0; i < fracs.length - 1; ++i) {
      expect(fracs[i + 1].sub(fracs[i]).equals('2/5')).toBe(true);
    }
  });

  it('can stack afdosteps', () => {
    const scale = expand('afdoStack([2, 3, 1, 2, 3])');
    expect(scale).toEqual(['13/11', '16/11', '17/11', '19/11', '2']);
  });

  it('can stack afdfsteps', () => {
    const scale = expand('afdoStack([1, 3, 1, 2, 1], 3/2)');
    expect(scale).toEqual(['17/16', '5/4', '21/16', '23/16', '3/2']);
  });

  it('Unimarvs double duodene', () => {
    const scale = expand(
      'eulerGenus(675*7, 9);respell([225/224, 385/384]);organize()'
    );
    expect(scale).toEqual([
      '45/44',
      '25/24',
      '35/32',
      '10/9',
      '7/6',
      '40/33',
      '5/4',
      '21/16',
      '4/3',
      '15/11',
      '25/18',
      '35/24',
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
});
