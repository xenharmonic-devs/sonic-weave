/** Tools published as part of the package. */

import {TimeMonzo} from './monzo.js';

/**
 * One of the metric prefixes listed here: https://en.wikipedia.org/wiki/Metric_prefix
 * Goes from quecto = 10^-30 to Quetta = 10^30.
 */
export type MetricPrefix =
  | 'Q'
  | 'R'
  | 'Y'
  | 'Z'
  | 'E'
  | 'P'
  | 'T'
  | 'G'
  | 'M'
  | 'k'
  | 'h'
  | 'da'
  | ''
  | 'd'
  | 'c'
  | 'm'
  | 'µ'
  | 'n'
  | 'p'
  | 'f'
  | 'a'
  | 'z'
  | 'y'
  | 'r'
  | 'q';

/**
 * Obtain the ten's exponent associated with the given prefix.
 * @param prefix Prefix to find exponent for.
 * @returns The ten's exponent associated with the prefix.
 */
export function metricExponent(prefix: MetricPrefix): number {
  switch (prefix) {
    case 'Q':
      return 30;
    case 'R':
      return 27;
    case 'Y':
      return 24;
    case 'Z':
      return 21;
    case 'E':
      return 18;
    case 'P':
      return 15;
    case 'T':
      return 12;
    case 'G':
      return 9;
    case 'M':
      return 6;
    case 'k':
      return 3;
    case 'h':
      return 2;
    case 'da':
      return 1;
    case '':
      return 0;
    case 'd':
      return -1;
    case 'c':
      return -2;
    case 'm':
      return -3;
    case '\u00B5':
      return -6;
    case 'n':
      return -9;
    case 'p':
      return -12;
    case 'f':
      return -15;
    case 'a':
      return -18;
    case 'z':
      return -21;
    case 'y':
      return -24;
    case 'r':
      return -27;
    case 'q':
      return -30;
    default:
      throw new Error(`Unrecognized prefix ${prefix}.`);
  }
}

/**
 * One of the binary prefixes listed here: https://en.wikipedia.org/wiki/Binary_prefix
 * Goes from kibi = 1024 to quebi = 1024^10.
 */
export type BinaryPrefix =
  | 'Ki'
  | 'Mi'
  | 'Gi'
  | 'Ti'
  | 'Pi'
  | 'Ei'
  | 'Zi'
  | 'Yi'
  | 'Ri'
  | 'Qi';

/**
 * Obtain the exponent of 1024 associated with the given prefix.
 * @param prefix Prefix to find exponent for.
 * @returns The exponent of 1024 associated with the prefix.
 */
export function binaryExponent(prefix: BinaryPrefix): number {
  switch (prefix) {
    case 'Ki':
      return 1;
    case 'Mi':
      return 2;
    case 'Gi':
      return 3;
    case 'Ti':
      return 4;
    case 'Pi':
      return 5;
    case 'Ei':
      return 6;
    case 'Zi':
      return 7;
    case 'Yi':
      return 8;
    case 'Ri':
      return 9;
    case 'Qi':
      return 10;
    default:
      throw new Error(`Unrecognized prefix ${prefix}.`);
  }
}

/**
 * Polyfill for `Set.union()`.
 * @param a First set.
 * @param b Second set.
 * @returns New set that contains elements of both sets (without duplicates).
 */
function setUnionPolyfill<T>(a: Set<T>, b: Set<T>) {
  const result = new Set<T>();
  for (const value of a) {
    result.add(value);
  }
  for (const value of b) {
    result.add(value);
  }
  return result;
}

/**
 * Wrapper around `Set.union()` because TypeScript or something.
 * @param a First set.
 * @param b Second set.
 * @returns New set that contains elements of both sets (without duplicates).
 */
function setUnionNative<T>(a: Set<T>, b: Set<T>): Set<T> {
  return (a as any).union(b);
}

export const setUnion =
  'union' in Set.prototype ? setUnionNative : setUnionPolyfill;

/**
 * Returns `true` if the specified object has the indicated property as its own property. If the property is inherited, or does not exist, the function returns `false`.
 * @param object The JavaScript object instance to test.
 * @param property The `String` name or `Symbol` of the property to test.
 * @returns `true` if the specified object has directly defined the specified property. Otherwise `false`
 */
export function hasOwn(object: object, property: PropertyKey) {
  if ('hasOwn' in Object) {
    return (Object as any).hasOwn(object, property);
  }
  return Object.prototype.hasOwnProperty.call(object, property);
}

/**
 * Result from {@link subtensions} consisting of a relative interval and all of the span sizes that subtend it.
 */
export type Subtender = {
  /**
   * The relative interval shared by the listed subtensions.
   */
  monzo: TimeMonzo;
  /**
   * All 1-indexed subtensions / span sizes in the scale that realize `monzo`.
   */
  subtensions: Set<number>;
};

/**
 * Calculate all subtensions i.e. 1-indexed span sizes associated with relative intervals.
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
    scale.push(period.mul(monzo) as TimeMonzo);
  }

  const result: Subtender[] = [];

  // Against 1/1
  for (let i = 0; i < n; ++i) {
    for (const {monzo, subtensions} of result) {
      if (monzo.strictEquals(scale[i])) {
        subtensions.add(i + 1);
        break;
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
          break;
        }
      }
      if (unique) {
        result.push({monzo: width as TimeMonzo, subtensions: new Set([j])});
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
    scale.push(period.mul(monzo) as TimeMonzo);
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
          break;
        }
      }
      if (unique) {
        subtensions.push([width as TimeMonzo, j]);
      }
    }
  }
  return true;
}
