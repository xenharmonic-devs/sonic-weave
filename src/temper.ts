import {inv, matmul, transpose} from 'xen-dev-utils/matrix';
import {gcd} from 'xen-dev-utils/fraction';
import {Monzo, add, scale, sub} from 'xen-dev-utils/monzo';
import {norm} from 'xen-dev-utils/number-array';

/**
 * Real-valued tuning map expressed as a vector of prime or subgroup mappings.
 *
 * The coordinates are expected to live in the same weighted/co-weighted space as the
 * corresponding just intonation point or commas passed to the helper functions below.
 */
export type TuningMap = number[];

/**
 * Combine tuning maps to minimize the distance to the JIP.
 * @param jip Just Intonation Point in (co-)weighted coordinates.
 * @param maps Maps to combine in (co-)weighted coordinates.
 * @returns The least-squares combination of `maps` closest to `jip` in the same coordinate system.
 */
export function combineTuningMaps(jip: TuningMap, maps: TuningMap[]) {
  // error = |sum_i w_i map_i - jip|^2 = (m - j) · (m  - j)

  const T = transpose(maps);
  const pinv = matmul(T, inv(matmul(maps, T)));
  return matmul(matmul(pinv, maps), jip);
}

/**
 * Obtain the tuning map that minimizes the distance to the JIP while also mapping the commas listed to the zero monzo.
 * @param jip Just Intonation Point in co-weighted coordinates.
 * @param commas Commas to vanish in weighted coordinates.
 * @returns The orthogonal projection of `jip` into the null space defined by `commas`.
 */
export function vanishCommas(jip: TuningMap, commas: Monzo[]): TuningMap {
  const T = transpose(commas);
  const pinv = matmul(T, inv(matmul(commas, T)));
  const nullProjector = matmul(pinv, commas);
  return sub(jip, matmul(nullProjector, jip));
}

/**
 * Combine tuning maps to minimize the distance to the JIP.
 * @param jip Just Intonation Point in (co-)weighted coordinates.
 * @param vals Vals to combine in (co-)weighted coordinates.
 * @param searchRadius Width of the integer search space explored in each coefficient dimension.
 * @returns Integer coefficients of the primitive linear combination closest to the JIP.
 */
export function intCombineTuningMaps(
  jip: TuningMap,
  vals: Monzo[],
  searchRadius: number,
): number[] {
  if (!vals.length) {
    return [];
  }
  if (vals.length === 1) {
    return [1];
  }
  let leastError = Infinity;
  let result: number[] = [];
  function combine(coeffs: number[]) {
    if (coeffs.length < vals.length) {
      for (let i = -searchRadius; i <= searchRadius; ++i) {
        const newCoeffs = [...coeffs];
        newCoeffs.push(i);
        combine(newCoeffs);
      }
    } else {
      if (Math.abs(coeffs.reduce(gcd)) !== 1) {
        return;
      }
      let val = scale(vals[0], coeffs[0]);
      for (let i = 1; i < coeffs.length; ++i) {
        val = add(val, scale(vals[i], coeffs[i]));
      }
      if (!val[0]) {
        return;
      }
      const map = val.map(v => (v / val[0]) * jip[0]);
      const error = norm(sub(jip, map), 'L2');
      if (error < leastError) {
        leastError = error;
        result = coeffs;
      }
    }
  }
  // The search space is projective so we only need to search half of it compared to euclidean space.
  for (let i = 0; i <= searchRadius; ++i) {
    combine([i]);
  }
  return result;
}
