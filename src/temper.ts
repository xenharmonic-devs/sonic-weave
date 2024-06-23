import {Monzo, inv, matmul, sub, transpose} from 'xen-dev-utils';

export type TuningMap = number[];

/**
 * Combine tuning maps to minimize the distance to the JIP.
 * @param jip Just Intonation Point in (co-)weighted coordinates.
 * @param maps Maps to combine in (co-)weighted coordinates.
 * @returns The closest combination of the maps to the JIP in (co-)weighted coordinates.
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
 * @returns The optimal tuning map in co-weighted coordinates.
 */
export function vanishCommas(jip: TuningMap, commas: Monzo[]): TuningMap {
  const T = transpose(commas);
  const pinv = matmul(T, inv(matmul(commas, T)));
  const nullProjector = matmul(pinv, commas);
  return sub(jip, matmul(nullProjector, jip));
}
