import {describe, expect, it} from 'vitest';
import {TuningMap, combineTuningMaps, vanishCommas} from '../temper';
import {LOG_PRIMES, applyWeights, dot, unapplyWeights} from 'xen-dev-utils';

describe('Val combination optimizer', () => {
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
