import {describe, it, expect} from 'vitest';
import {evaluateExpression, evaluateSource} from '../../parser';
import {Interval} from '../../interval';

function parseSource(source: string) {
  const visitor = evaluateSource(source);
  return visitor.context.get('$') as Interval[];
}

describe('SonicWeave standard library', () => {
  it('converts MIDI note number to frequency', () => {
    const scale = parseSource('mtof(60);');
    expect(scale).toHaveLength(1);
    const interval = scale[0];
    expect(interval.toString()).toBe('4685120000^1/4 * Hz');
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
    const scale = parseSource('rank2(707.048, 2, 2, 600.0, 2);');
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
      '92.17871646099638383!c;193.15685693241744048!c;294.13499740383849712!c;391.6902862640135936!c;498.04499913461268079!c;590.22371559560951937!c;696.5784284662087202!c;794.1337173263841578!c;889.7352853986262744!c;996.08999826922536158!c;1093.6452871294009128!c;1200.'
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

  it('inverts scales', () => {
    const scale = parseSource('1\\6;2\\6;3\\6;6\\6;invert();');
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

  it('clears the scale', () => {
    const scale = parseSource('2;clear();');
    expect(scale).toHaveLength(0);
  });

  it('clears the scale (repeat(0))', () => {
    const scale = parseSource('2;repeat(0);');
    expect(scale).toHaveLength(0);
  });

  it('can round to nearest subharmonic', () => {
    const scale = parseSource('1\\3;2\\3;3\\3;toSubharmonics(16);');
    expect(scale).toHaveLength(3);
    expect(scale.map(i => i.toString()).join(';')).toBe('16/13;16/10;16/8');
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
    const scale = parseSource('2:3:4; mergeOffset(4:5:7, "wrap");');
    expect(scale).toHaveLength(6);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '5/4;21/16;3/2;7/4;15/8;2'
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
    const scale = parseSource('ags([8/7, 7/6]);');
    expect(scale).toHaveLength(4);
    expect(scale.map(i => i.toString()).join(';')).toBe('8/7;8/6;32/21;2');
  });

  it('can generate alternating generator sequences (diasem #2)', () => {
    const scale = parseSource('ags([8/7, 7/6], 2);');
    expect(scale).toHaveLength(5);
    expect(scale.map(i => i.toString()).join(';')).toBe('8/7;8/6;32/21;16/9;2');
  });

  it('can generate alternating generator sequences (diasem #3)', () => {
    const scale = parseSource('ags([8/7, 7/6], 3);');
    expect(scale).toHaveLength(9);
    expect(scale.map(i => i.toString()).join(';')).toBe(
      '64/63;8/7;32/27;8/6;256/189;32/21;128/81;16/9;2'
    );
  });

  it('throws for ags with no constant structure', () => {
    expect(() => parseSource('ags([8/7, 7/6, 8/7], 3);')).toThrow();
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
});
