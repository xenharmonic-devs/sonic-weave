import {describe, expect, it} from 'vitest';
import {
  TuningMap,
  combineTuningMaps,
  intCombineTuningMaps,
  vanishCommas,
} from '../temper';
import {LOG_PRIMES, applyWeights, dot, unapplyWeights} from 'xen-dev-utils';

describe('Mapping combination optimizer', () => {
  it('computes TE meantone', () => {
    const p12: TuningMap = [12, 19, 28].map(c => (c / 12) * LOG_PRIMES[0]);
    const p19: TuningMap = [19, 30, 44].map(c => (c / 19) * LOG_PRIMES[0]);
    const meantone = combineTuningMaps(
      [1, 1, 1],
      [unapplyWeights(p12, LOG_PRIMES), unapplyWeights(p19, LOG_PRIMES)]
    );
    const map = applyWeights(meantone, LOG_PRIMES);
    expect(Math.abs(dot(map, [-4, 4, -1]))).toBeCloseTo(0, 9);
    expect(dot(map, [1, 0, 0])).toBeCloseTo(LOG_PRIMES[0], 2);
    expect(dot(map, [-1, 1, 0])).toBeCloseTo(LOG_PRIMES[1] - LOG_PRIMES[0], 2);
    expect(dot(map, [0, 0, 1])).toBeCloseTo(LOG_PRIMES[2], 2);
    expect((((map[1] - map[0]) / map[0]) * 1200).toFixed(3)).toBe('696.239');
    expect(map.map(c => ((c / LOG_PRIMES[0]) * 1200).toFixed(3))).toEqual([
      '1201.397',
      '1898.446',
      '2788.196',
    ]);
  });

  it('almost computes CTE meantone', () => {
    const p5 = [5, 8, 12];
    const p7 = [7, 11, 16];
    const jip = LOG_PRIMES.slice(0, 3);
    const weights = LOG_PRIMES.slice(0, 3);
    weights[0] *= 0.005;
    const meantone = combineTuningMaps(unapplyWeights(jip, weights), [
      unapplyWeights(p5, weights),
      unapplyWeights(p7, weights),
    ]);
    const map = applyWeights(meantone, weights);
    expect(Math.abs(dot(map, [-4, 4, -1]))).toBeCloseTo(0, 7);
    expect(dot(map, [1, 0, 0])).toBeCloseTo(LOG_PRIMES[0], 7);
    expect(dot(map, [-1, 1, 0])).toBeCloseTo(LOG_PRIMES[1] - LOG_PRIMES[0], 2);
    expect(dot(map, [0, 0, 1])).toBeCloseTo(LOG_PRIMES[2], 2);
    expect((((map[1] - map[0]) / map[0]) * 1200).toFixed(4)).toBe('697.2143');
    expect(map.map(c => ((c / LOG_PRIMES[0]) * 1200).toFixed(4))).toEqual([
      '1200.0000',
      '1897.2144',
      '2788.8572',
    ]);
  });
});

describe('Val combination search', () => {
  it('combines 12p and 19p into 31p', () => {
    const p12: TuningMap = [12, 19 / Math.log2(3), 28 / Math.log2(5)];
    const p19: TuningMap = [19, 30 / Math.log2(3), 44 / Math.log2(5)];
    const coeffs = intCombineTuningMaps([1, 1, 1], [p12, p19], 1);
    expect(coeffs).toEqual([1, 1]);
  });

  it('combines 5p and 7p into 31p', () => {
    const p5: TuningMap = [5, 8 / Math.log2(3), 12 / Math.log2(5)];
    const p7: TuningMap = [7, 11 / Math.log2(3), 16 / Math.log2(5)];
    const coeffs = intCombineTuningMaps([1, 1, 1], [p5, p7], 3);
    expect(coeffs).toEqual([2, 3]);
  });
});

describe('Comma vanisher', () => {
  it('computes TE meantone', () => {
    const syntonic = [-4, 4, -1];
    const meantone = vanishCommas(
      [1, 1, 1],
      [applyWeights(syntonic, LOG_PRIMES)]
    );
    const map = applyWeights(meantone, LOG_PRIMES);
    expect(Math.abs(dot(map, [-4, 4, -1]))).toBeCloseTo(0, 9);
    expect(dot(map, [1, 0, 0])).toBeCloseTo(LOG_PRIMES[0], 2);
    expect(dot(map, [-1, 1, 0])).toBeCloseTo(LOG_PRIMES[1] - LOG_PRIMES[0], 2);
    expect(dot(map, [0, 0, 1])).toBeCloseTo(LOG_PRIMES[2], 2);
    expect((((map[1] - map[0]) / map[0]) * 1200).toFixed(3)).toBe('696.239');
    expect(map.map(c => ((c / LOG_PRIMES[0]) * 1200).toFixed(3))).toEqual([
      '1201.397',
      '1898.446',
      '2788.196',
    ]);
  });

  it('almost computes CTE meantone', () => {
    const syntonic = [-4, 4, -1];
    const jip = LOG_PRIMES.slice(0, 3);
    const weights = LOG_PRIMES.slice(0, 3);
    weights[0] *= 0.005;
    const meantone = vanishCommas(unapplyWeights(jip, weights), [
      applyWeights(syntonic, weights),
    ]);
    const map = applyWeights(meantone, weights);
    expect(Math.abs(dot(map, [-4, 4, -1]))).toBeCloseTo(0, 7);
    expect(dot(map, [1, 0, 0])).toBeCloseTo(LOG_PRIMES[0], 7);
    expect(dot(map, [-1, 1, 0])).toBeCloseTo(LOG_PRIMES[1] - LOG_PRIMES[0], 2);
    expect(dot(map, [0, 0, 1])).toBeCloseTo(LOG_PRIMES[2], 2);
    expect((((map[1] - map[0]) / map[0]) * 1200).toFixed(4)).toBe('697.2143');
    expect(map.map(c => ((c / LOG_PRIMES[0]) * 1200).toFixed(4))).toEqual([
      '1200.0000',
      '1897.2144',
      '2788.8572',
    ]);
  });
});
