import {describe, it, expect} from 'vitest';
import {
  evaluateExpression,
  evaluateSource,
  getSourceVisitor,
  parseAST,
} from '../../parser';
import {Interval} from '../../interval';

function parseSource(source: string) {
  const visitor = evaluateSource(source);
  return visitor.get('$') as Interval[];
}

function parseSingle(source: string) {
  const value = evaluateExpression(source);
  expect(value).toBeInstanceOf(Interval);
  return value as Interval;
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
    const scale = parseSource('ed(6);');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '1\\6;2\\6;3\\6;4\\6;5\\6;6\\6'
    );
  });

  it('generates tritave equivalent equal temperaments', () => {
    const scale = parseSource('ed(3,3);');
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
      '107.048;214.096;385.904;492.952;600.;707.048;814.096;985.904;1092.952;1200.'
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
      '92.17871646099638383rc;193.15685693241744048rc;294.13499740383849712rc;391.6902862640135936rc;498.04499913461268079rc;590.22371559560951937rc;696.5784284662087202rc;794.1337173263841578rc;889.7352853986262744rc;996.08999826922536158rc;1093.6452871294009128rc;1200.'
    );
  });

  it('generates a cube', () => {
    const scale = parseSource('spanLattice([3, 5, 7]);');
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
    const scale = parseSource('eulerGenus(15 white, 1, 2 gray);repr');
    expect(scale).toEqual([
      '(5/4 white)',
      '(3/2 white)',
      '(15/8 white)',
      '(2 gray)',
    ]);
  });

  it('generates the Easter egg', () => {
    const scale = parseSource('octaplex(3, 5, 7, 11);');
    expect(scale).toHaveLength(24);
  });

  it('can take edo subsets', () => {
    const scale = parseSource('ed(7);subset([0, 1, 6]);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('1\\7;2\\7;7\\7');
  });

  it('can take relative edo subsets', () => {
    const scale = parseSource(
      'ed(12);subset(cumsum([2 - 1, 2, 1, 2, 2, 2, 1]));'
    );
    expect(scale).toHaveLength(7);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '2\\12;4\\12;5\\12;7\\12;9\\12;11\\12;12\\12'
    );
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
    const scale = parseSource('1\\6;2\\6;6\\6;rotate(2);');
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
    const scale = parseSource(
      'gs([8/7, 7/6, 8/7, 7/6, 8/7, 7/6, 8/7, 189/160, 8/7, 7/6], 5);str'
    );
    expect(scale).toEqual(['8/7', '4/3', '32/21', '16/9', '2']);
  });

  it('can generate generator sequences (zil[14])', () => {
    const scale = parseSource(
      'gs([8/7, 7/6, 8/7, 7/6, 8/7, 7/6, 8/7, 189/160, 8/7, 7/6], 14);str'
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
      "Get rid of expression results. `void(i++)` increments the value but doesn't push anything onto the scale."
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
    const thirtyOne = evaluateExpression('tune(12@5, 19@5)') as Interval;
    expect(thirtyOne.value.cents).toBe(0);
    expect(thirtyOne.value.toIntegerMonzo()).toEqual([31, 49, 72]);
  });

  it('can combine three vals to approach the JIP', () => {
    const fourtyOne = evaluateExpression('tune3(5@7, 17@7, 19@7)') as Interval;
    expect(fourtyOne.value.cents).toBe(0);
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
    const subOvertone = parseSource('revposed(6:5:4)');
    expect(subOvertone[0].totalCents()).toBeCloseTo(386.313714); // major third
    expect(subOvertone[1].totalCents()).toBeCloseTo(701.955001); // perfect fifth
  });

  it('can spell the just major chord retroverted', () => {
    const retroversion = parseSource('retroverted(10:12:15)');
    expect(retroversion[0].totalCents()).toBeCloseTo(386.313714); // major third
    expect(retroversion[1].totalCents()).toBeCloseTo(701.955001); // perfect fifth
  });

  it('can spell the just major chord reflected', () => {
    const reflection = parseSource('reflected(15:12:10)');
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
    const firstInversion = parseSource('reflected(3:5:4)');
    expect(firstInversion[0].totalCents()).toBeCloseTo(-884.358713); // major sixth
    expect(firstInversion[1].totalCents()).toBeCloseTo(-498.044999); // perfect fourth
  });

  it('can spell the just minor chord in second inversion with root on 1/1', () => {
    const secondInversion = parseSource('reflected(6:5:8)');
    expect(secondInversion[0].totalCents()).toBeCloseTo(315.641287); // major sixth
    expect(secondInversion[1].totalCents()).toBeCloseTo(-498.044999); // perfect fourth
  });

  it('has the means to convert JI scales to enumerations', () => {
    const scale = parseSource('12/11;6/5;4/3;3/2;elevate();simplify;str');
    expect(scale.join(':')).toBe('330:360:396:440:495');
  });

  it('has the means to convert JI scales to retroverted enumerations', () => {
    const scale = parseSource(
      '12/11;6/5;4/3;3/2;retrovert();elevate();simplify;str'
    );
    expect(`retroverted(${scale.join(':')})`).toBe('retroverted(8:9:10:11:12)');
  });

  it('has the means to convert JI scales to reflected enumerations', () => {
    const scale = parseSource(
      '12/11;6/5;4/3;3/2;reflect();elevate();simplify;str'
    );
    expect(`reflected(${scale.join(':')})`).toBe('reflected(12:11:10:9:8)');
  });

  it('has the means to keep already enumerated scales enumerated', () => {
    const scale = parseSource('4:12:14:16;elevate();simplify;str');
    expect(scale.join(':')).toBe('2:6:7:8');
  });

  it("doesn't introduce extra denominators when elevating", () => {
    const scale = parseSource('5/3;10/3;elevate();simplify;str');
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
    const steps = parseSource('diff([2, 3, 5, 8]);str');
    expect(steps).toEqual(['2', '1', '2', '3']);
  });

  it('has a geometric differentiator', () => {
    const steps = parseSource('geodiff(4::8);simplify;str');
    expect(steps).toEqual(['5/4', '6/5', '7/6', '8/7']);
  });

  it('has a copying repeater', () => {
    const bigScale = parseSource('repeated(2, 3::6);str');
    expect(bigScale).toEqual(['4/3', '5/3', '6/3', '8/3', '10/3', '12/3']);
  });

  it('can label intervals after generating', () => {
    const scale = parseSource(`
      4/3
      3/2
      2
      label(["fourth", "fifth", "octave"])
    `);
    expect(scale).toHaveLength(3);
    expect(scale[0].label).toBe('fourth');
    expect(scale[1].label).toBe('fifth');
    expect(scale[2].label).toBe('octave');
  });

  it('preserves color upon reflection', () => {
    const scale = parseSource('4/3 green;3/2;2/1 red;reflect()');
    expect(scale).toHaveLength(3);
    expect(scale[0].color?.value).toBe('green');
    expect(scale[1].color?.value).toBe(undefined);
    expect(scale[2].color?.value).toBe('red');
  });

  it('can reduce Raga Bhairavi to a comma recipe (inline)', () => {
    const scale = parseSource(
      'periodiff(geodiff([16/15, 9/8, 6/5, 27/20, 3/2, 8/5, 9/5, 2/1]));str'
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
    const scale = parseSource(
      '16/15;9/8;6/5;27/20;3/2;8/5;9/5;2/1;unstack();unperiostack();str'
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
    const scale = parseSource(`
      cumprod(
        antiperiodiff(
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
      str
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
    const scale = parseSource(`
      24/25
      2025/2048
      2048/2025
      135/128
      80/81
      24/25
      135/128
      80/81
      periostack(10/9)
      stack()
      simplify
      str
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
    const scale = parseSource('3;2;2;[$, $];i => i \\ sum();stack();str');
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
    visitor.rootContext.gas = 1000;
    for (const statement of ast.body) {
      visitor.visit(statement);
    }
  });

  it('spans a lattice in cents', () => {
    const scale = parseSource(
      'spanLattice([123.4, 567.9], [2, 1], [1, 0], 1200.);str'
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
    const scale = parseSource('50/49;49/48;3/2;2/1;coalesce();str');
    expect(scale).toEqual(['49/48', '3/2', '2/1']);
  });

  it('coalesces with zero tolerance', () => {
    const scale = parseSource('5/4;3/2;7/4;7/4;7/4;2/1;coalesce(0.);str');
    expect(scale).toEqual(['5/4', '3/2', '7/4', '2/1']);
  });

  it('pops a specific index', () => {
    const scale = parseSource('6::12;void(pop($, 4));str');
    expect(scale).toEqual(['7/6', '8/6', '9/6', '10/6', '12/6']);
  });

  it('preserves labels when rotating', () => {
    const scale = parseSource(
      '5/4 yellow "third";3/2 white "fifth";2/1 rgba(255, 255, 255, 0.5) "octave";rotate()'
    );
    expect(scale).toHaveLength(3);
    expect(scale[0].valueOf()).toBeCloseTo(6 / 5);
    expect(scale[0].color?.value).toBe('white');
    expect(scale[0].label).toBe('fifth');
    expect(scale[1].valueOf()).toBeCloseTo(8 / 5);
    expect(scale[1].color?.value).toBe(
      'rgba(255.000, 255.000, 255.000, 0.50000)'
    );
    expect(scale[1].label).toBe('octave');
    expect(scale[2].valueOf()).toBeCloseTo(2);
    expect(scale[2].color?.value).toBe('yellow');
    expect(scale[2].label).toBe('third');
  });

  it("doesn't eat colors across lines", () => {
    const scale = parseSource(`
      4/3 red
      3/2 "fifth"
      7/4
      2/1 "root" blue
      rotate(0)
      repr
    `);
    expect(scale).toEqual([
      '(4/3 red)',
      '(3/2 "fifth")',
      '7/4',
      '(2/1 blue "root")',
    ]);
  });

  it('coalesces cents geometrically', () => {
    const scale = parseSource(`
      100.
      200.
      202.
      1200.
      coalesce(3.5, 'geoavg')
      str
    `);
    expect(scale).toEqual(['100.', '201.', '1200.']);
  });

  it('can store colors and labels for later', () => {
    const scale = parseSource(`
      1 red "one"
      2 "two"
      3
      const cs = colorsOf()
      const ls = labelsOf()
      clear()
      3::6
      label(cs)
      label(ls)
      repr
    `);
    expect(scale).toEqual(['(4/3 red "one")', '(5/3 "two")', '6/3']);
  });

  it('generates Raga Kafi with everything simplified', () => {
    const scale = parseSource(
      'rank2(3/2 white, 2, 3)\ninsert(5/3 black)\nrepr'
    );
    expect(scale).toEqual([
      '(9/8 white)',
      '(32/27 white)',
      '(4/3 white)',
      '(3/2 white)',
      '(5/3 black)',
      '(16/9 white)',
      '2',
    ]);
  });

  it('generates 22 Shruti with the intended colors', () => {
    const scale = parseSource(
      "rank2(3/2 white, 4, 0, 2/1 gray)\nmergeOffset([10/9 yellow, 16/15 green, 256/243 white, 9/8 white], 'wrap')\nsimplify\nrepr"
    );
    expect(scale).toEqual([
      '(256/243 white)',
      '(16/15 green)',
      '(10/9 yellow)',
      '(9/8 white)',
      '(32/27 white)',
      '(6/5 green)',
      '(5/4 yellow)',
      '(81/64 white)',
      '(4/3 white)',
      '(27/20 green)',
      '(45/32 yellow)',
      '(729/512 white)',
      '(3/2 white)',
      '(128/81 white)',
      '(8/5 green)',
      '(5/3 yellow)',
      '(27/16 white)',
      '(16/9 white)',
      '(9/5 green)',
      '(15/8 yellow)',
      '(243/128 white)',
      '(2 gray)',
    ]);
  });

  it('has inline labeling', () => {
    const pythagoras = parseSource(`
      labeled(['F', 'C', 'G', 'D', 'A', 'E', 'B'], [3^i rdc 2 white for i of [-2..4]])
      labeled(['Gb', 'Db', 'Ab', 'Eb', 'Bb'], [3^i rdc 2 black for i of [-7..-3]])
      sort()
      repr
    `);
    expect(pythagoras).toEqual([
      '(256/243 black "Ab")',
      '(9/8 white "A")',
      '(32/27 black "Bb")',
      '(81/64 white "B")',
      '(4/3 white "C")',
      '(1024/729 black "Db")',
      '(3/2 white "D")',
      '(128/81 black "Eb")',
      '(27/16 white "E")',
      '(16/9 white "F")',
      '(4096/2187 black "Gb")',
      '(2 white "G")',
    ]);
  });

  it('merges offsets without duplicating', () => {
    const scale = parseSource(
      '4/3;3/2;2/1;mergeOffset(3/2, "wrap");simplify;str'
    );
    expect(scale).toEqual(['9/8', '4/3', '3/2', '2']);
  });
});
