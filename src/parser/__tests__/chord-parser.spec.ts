import {describe, it, expect} from 'vitest';
import {
  parseBasis,
  parseChord,
  parseVals,
  rank2FromCommas,
  temperamentFromCommas,
  temperamentFromVals,
} from '../chord-parser';
import {MonzoLiteral} from '../../expression';
import {TimeMonzo} from '../../monzo';
import {modc} from 'xen-dev-utils';

describe('Chord input parser', () => {
  it.each(['1 2 3', '1|2|3', '1&2&3', '1;2;3', '1,2,3', '1:2:3'])(
    'parses integers %s',
    (input: string) => {
      const result = parseChord(input);
      expect(result).toHaveLength(3);
      expect(result[0].node?.type).toBe('IntegerLiteral');
      expect(result.map(i => i.toString())).toEqual(['1', '2', '3']);
    }
  );
  it('parses comma-separated monzos', () => {
    const result = parseChord('[-4 4 -1>, [0, 1/2>,[0,-1,1>');
    expect(result).toHaveLength(3);
    expect(result[0].node?.type).toBe('MonzoLiteral');
    expect(result.map(i => i.toString())).toEqual([
      '[-4 4 -1>',
      '[0 1/2>',
      '[0 -1 1>',
    ]);
  });
  it('parses a lifted monzo', () => {
    const result = parseChord('/[2 -1>');
    expect(result).toHaveLength(1);
    expect((result[0].node as MonzoLiteral).lifts).toBe(1);
  });
  it('parses nested array-like expressions', () => {
    const result = parseChord('9,(4:5:6),[2,3],geodiff(7:8:9)');
    expect(result.map(i => i.toString())).toEqual([
      '9',
      '5/4',
      '6/4',
      '2',
      '3',
      '8/7',
      '9/8',
    ]);
  });

  it('has the Konami code', () => {
    const start = parseChord('^^vv/\\/\\[2, 1>');
    const value = start[0].value as TimeMonzo;
    expect(value.primeExponents.map(pe => pe.toFraction())).toEqual(['2', '1']);
  });

  it('has subgroup monzos', () => {
    const result = parseChord('[5, -1>@3/2.7');
    const value = result[0].value as TimeMonzo;
    expect(value.primeExponents.slice(0, 4).map(pe => pe.toFraction())).toEqual(
      ['-5', '5', '0', '-1']
    );
  });

  it('has the monzo of logarithmic zero', () => {
    const result = parseChord('[1>@0')[0];
    expect(result.valueOf()).toBe(0);
  });

  it('has the monzo of logarithmic negative unity', () => {
    const result = parseChord('[1>@-1')[0];
    expect(result.valueOf()).toBe(-1);
  });
});

describe('Subgroup basis parser', () => {
  it('rejects nonsense', () => {
    expect(() => parseBasis('asdf')).toThrow();
  });

  it('creates prime limits', () => {
    const elevenLimit = parseBasis('11');
    expect(elevenLimit?.toString()).toBe('@2.3.5.7.11');
  });

  it('rejects composite limits', () => {
    expect(() => parseBasis('10')).toThrow();
  });

  it('accepts composite basis literals', () => {
    const ten = parseBasis('@10');
    expect(ten?.toString()).toBe('@10');
  });

  it('accepts fractional subgroups', () => {
    const island = parseBasis('2.3.13/5');
    expect(island?.toString()).toBe('@2.3.13/5');
  });

  it('accepts limit literals', () => {
    const sevenLimit = parseBasis('.7');
    expect(sevenLimit?.size).toBe(4);
    expect(sevenLimit?.toString()).toBe('@.7');
  });

  it('accepts range literals', () => {
    const tri = parseBasis('3..23');
    expect(tri?.size).toBe(8);
    expect(tri?.toString()).toBe('@3..23');
  });
});

function valParse(valInput: string, subgroupInput: string) {
  const vals = parseVals(valInput, parseBasis(subgroupInput));
  return vals.map(v => v.sval.map(f => f.valueOf()));
}

describe('Val input parser', () => {
  it('parses space-separated vals', () => {
    const result = valParse('<12 19]   <5 8]', '2.3');
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      [12, 19],
      [5, 8],
    ]);
  });
  it('parses &-separated warts', () => {
    const result = valParse('12&17c', '5');
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      [12, 19, 28],
      [17, 27, 40],
    ]);
  });
  it('parses comma-separated SOVs', () => {
    const result = valParse('24,67[^7]', '2.3.7');
    expect(result).toEqual([
      [24, 38, 67],
      [67, 106, 189],
    ]);
  });
  it('parses fractional subgroup vals', () => {
    const result = valParse('5;<9 14,  12]', '2.3.13/5');
    expect(result).toEqual([
      [5, 8, 7],
      [9, 14, 12],
    ]);
  });
  it('parses free vals', () => {
    const result = valParse('12', '');
    expect(result).toEqual([[12, 19, 28, 34, 42, 44, 49, 51, 54]]);
  });
  it('rejects explicit sub-subgroup vals', () => {
    expect(() => valParse('<1 2]@3.5', '7')).toThrow();
  });
  it('lets you put @ at the end (wartless warts)', () => {
    const val = valParse('13@', '2.9')[0];
    expect(val).toEqual([13, 41]);
  });
  it('lets you put @ at the end (covectors)', () => {
    const val = valParse('<13 41]@', '2.9')[0];
    expect(val).toEqual([13, 41]);
  });
});

describe('Temperament tools', () => {
  it('can make meantone out a comma', () => {
    const meantone = temperamentFromCommas('81/80', '', 'TE');
    expect(meantone.canonicalMapping).toEqual([
      [1, 0, -4],
      [0, 1, 4],
    ]);
    expect(meantone.rank).toBe(2);
    expect(meantone.preimage.toString()).toBe('@2.3');
    expect(meantone.generators.map(g => g.toFixed(3))).toEqual([
      '1201.397',
      '1898.446',
    ]);
  });
  it('can figure out a rank-2 for whitewood', () => {
    const whitewood = rank2FromCommas('2187/2048', '', 'POTE');
    expect(whitewood.canonicalMapping).toEqual([
      [7, 11, 0],
      [0, 0, 1],
    ]);
    expect(whitewood.basis.toString()).toBe('@2.3.5');
    expect(whitewood.generators.map(g => g.toFixed(3))).toEqual([
      '171.429',
      '2774.469',
    ]);
  });
  it('can figure out a rank-2 for cloudy', () => {
    const cloudy = rank2FromCommas('16807/16384', '', 'CTE');
    expect(cloudy.canonicalMapping).toEqual([
      [5, 0, 14],
      [0, 1, 0],
    ]);
    expect(cloudy.basis.toString()).toBe('@2.3.7');
    expect(cloudy.generators.map(g => g.toFixed(3))).toEqual([
      '240.000',
      '1901.955',
    ]);
  });
  it('can figure out the subgroup for 12 & 24', () => {
    const catler = temperamentFromVals('12 & 24', '', 'TE', [2]);
    expect(catler.canonicalMapping).toEqual([
      [12, 19, 28, 0],
      [0, 0, 0, 1],
    ]);
    expect(catler.basis.toString()).toBe('@2.3.5.7');
    expect(catler.generators.map(g => g.toFixed(3))).toEqual([
      '99.935',
      '3368.826',
    ]);
  });
  it('can make porwell from the comma', () => {
    const porwell = temperamentFromCommas('6144/6125', '', 'POTE');
    expect(porwell.canonicalMapping).toEqual([
      [1, 0, 1, 4],
      [0, 1, 1, -1],
      [-0, -0, -2, 3],
    ]);
    expect(porwell.preimage.toString()).toBe('@2.3.35/32');
    expect(porwell.generators.map(g => modc(g, 1200).toFixed(4))).toEqual([
      '1200.0000',
      '702.3482',
      '157.4677',
    ]);
  });
});
