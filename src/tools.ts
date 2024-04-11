/** Tools published as part of the package. */

import {TimeMonzo} from './monzo';

/**
 * Result from {@link subtensions} consisting of a relative interval and all of the spans it subtends (a set of 0-indexed interval classes).
 */
export type Subtender = {
  monzo: TimeMonzo;
  subtensions: Set<number>;
};

/**
 * Calculate all subtensions i.e 0-indexed interval classes associated with relative intervals.
 * @param monzos Musical intervals given as relative monzos not including the implicit unison at the start, but including the interval of repetition at the end.
 * @returns An array of subtensions associated with each interval found in the scale.
 */
export function subtensions(monzos: TimeMonzo[]): Subtender[] {
  const n = monzos.length;
  if (!n) {
    return [];
  }
  const numComponents = Math.max(...monzos.map(m => m.numberOfComponents));
  const scale = monzos.map(m => m.clone());
  for (const monzo of scale) {
    monzo.numberOfComponents = numComponents;
  }
  const period = scale[n - 1];
  for (const monzo of [...scale]) {
    scale.push(period.mul(monzo));
  }

  const result: Subtender[] = [];

  // Against 1/1
  for (let i = 0; i < n; ++i) {
    for (const {monzo, subtensions} of result) {
      if (monzo.strictEquals(scale[i])) {
        subtensions.add(i + 1);
      }
    }
    result.push({monzo: scale[i], subtensions: new Set([i + 1])});
  }

  // Against each other
  for (let i = 0; i < n - 1; ++i) {
    for (let j = 1; j < n; ++j) {
      const width = scale[i + j].div(scale[i]);
      let unique = true;
      for (const {monzo, subtensions} of result) {
        if (width.strictEquals(monzo)) {
          subtensions.add(j);
          unique = false;
        }
      }
      if (unique) {
        result.push({monzo: width, subtensions: new Set([j])});
      }
    }
  }
  return result;
}

/**
 * Determine if a scale has constant structure i.e. you can tell the interval class from the size of an interval.
 * @param monzos Musical intervals given as relative monzos not including the implicit unison at the start, but including the interval of repetition at the end.
 * @returns `true` if the scale has constant structure.
 */
export function hasConstantStructure(monzos: TimeMonzo[]) {
  const n = monzos.length;
  if (!n) {
    return true;
  }
  const numComponents = Math.max(...monzos.map(m => m.numberOfComponents));
  const scale = monzos.map(m => m.clone());
  for (const monzo of scale) {
    monzo.numberOfComponents = numComponents;
  }
  const period = scale[n - 1];
  for (const monzo of [...scale]) {
    scale.push(period.mul(monzo));
  }

  const subtensions: [TimeMonzo, number][] = [];

  // Against 1/1
  for (let i = 0; i < n; ++i) {
    for (const [existing] of subtensions) {
      if (existing.strictEquals(scale[i])) {
        return false;
      }
    }
    subtensions.push([scale[i], i + 1]);
  }

  // Against each other
  for (let i = 0; i < n - 1; ++i) {
    for (let j = 1; j < n; ++j) {
      const width = scale[i + j].div(scale[i]);
      let unique = true;
      for (const [existing, subtension] of subtensions) {
        if (width.strictEquals(existing)) {
          if (subtension !== j) {
            return false;
          }
          unique = false;
        }
      }
      if (unique) {
        subtensions.push([width, j]);
      }
    }
  }
  return true;
}
