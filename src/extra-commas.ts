import {Fraction, PRIMES} from 'xen-dev-utils';
import {TimeMonzo, getNumberOfComponents} from './monzo';
import {ZERO} from './utils';

// https://en.xen.wiki/w/Syntonic-rastmic_subchroma_notation
const SYNTONIC_RASTMIC = {
  // Note: x, t#, #, t, d, b, db and bb are already part of FJS.
  '1': ['-1/2', '5/2', '0', '0', '-1'], // Demirasharp ('^1s' for eleven)
  '2': ['-1', '5', '0', '0', '-2'], // Rasharp ('^2s' for twice '^1s')
  '4': ['-2', '10', '0', '0', '-4'], // Double rasharp ('^4s' for twice '^2s')
  '8': ['-4', '20', '0', '0', '-8'], // Quadruple rasharp ('^8s' for twice '^4s')
  '3': ['-2', '2', '-1/2'], // Demisynsharp ('^3s' for about thrice '^1s')
  '6': ['-4', '4', '-1'], // Synsharp ('^6s' for twice '^3s')
  '9': ['-6', '6', '-3/2'], // Sesqui-synsharp ('^9s' for thrice '^3s')

  // ^5s and ^7s left undefined on purpose due to ambiguity.

  // Combination rule: Identifiers stack.
  // '^12s' = Sesqui rasharp, equal to '^1s^2s'
};

// Lumi's irrational collection
const LUMIS_COMMAS = {
  // For 15/14 ~ sm2^0l
  '0': ['-25/4', '17/4', '1', '-1'],
  // For 11/10 ~ sM2_1l
  '1': ['3/4', '1/4', '1', '0', '-1'],
  // For 32/27 ~ n3_2l
  '2': ['-11/2', '7/2'],
  // For 15/13 ~ φ4_3l
  '3': ['1', '-3/2', '-1', '0', '0', '1'],
  // For 25/14 ~ α4^4l
  '4': ['-9/2', '4', '-2', '1'],
  // For 7/5 ~ ζ4_5l
  '5': ['1/2', '0', '1', '-1'],
  // For 6/5 ~ ⅓m3_6l
  '6': ['1/3', '-5/3', '1'],
  // For 11/10 ~ ⅓M2_7l
  '7': ['5/3', '-1/3', '1', '0', '-1'],
  // For 13/7 ~ β4_8l
  '8': ['5/2', '-1', '0', '1', '0', '-1'],
  // For 21/19 ~ sM2_9l
  '9': ['-1/4', '-3/4', '0', '-1', '0', '0', '0', '1'],
};

// https://en.xen.wiki/w/Helmholtz-Ellis_notation
const HELMHOLTZ_ELLIS = {
  '5': '81/80',
  '7': '64/63',
  '11': '33/32',
  '13': '27/26',
  '17': '2187/2176',
  '19': '513/512',
  '23': '736/729',
  '29': '261/256',
  '31': '32/31',
  '37': '37/36',
  '41': '82/81',
  '43': '129/128',
  '47': '752/729',
  // https://en.xen.wiki/w/Richie%27s_HEJI_extensions
  '53': '54/53',
  '59': '243/236',
  '61': '244/243',
  '67': '2187/2144',
  '71': '72/71',
  '73': '73/72',
  '79': '81/79',
  '83': '256/249',
  '89': '729/712',
};

// http://www.tonalsoft.com/enc/h/hewm.aspx
const HEWM53 = {
  '5': '81/80',
  '7': '64/63',
  '11': '33/32',
  '13': '27/26',
  '17': '18/17',
  '19': '19/18',
  '23': '24/23',
  '29': '261/256',
  '31': '32/31',
  '37': '37/36',
  '41': '82/81',
  '43': '129/128',
  '47': '48/47',
  '53': '54/53',
};

const UNITY = TimeMonzo.fromFraction(1);

const SYNTONIC_RASTMIC_MAP = new Map<string, TimeMonzo>();

for (const [key, value] of Object.entries(SYNTONIC_RASTMIC)) {
  const monzo = new TimeMonzo(
    ZERO,
    value.map(f => new Fraction(f))
  );
  monzo.numberOfComponents = getNumberOfComponents();
  SYNTONIC_RASTMIC_MAP.set(key, monzo);
}

export function getSyntonicRastmic(id: number) {
  let result = UNITY;
  for (const key of id.toString()) {
    if (SYNTONIC_RASTMIC_MAP.has(key)) {
      result = result.mul(SYNTONIC_RASTMIC_MAP.get(key)!) as TimeMonzo;
    }
  }
  return result;
}

const LUMIS_MAP = new Map<string, TimeMonzo>();

for (const [key, value] of Object.entries(LUMIS_COMMAS)) {
  const monzo = new TimeMonzo(
    ZERO,
    value.map(f => new Fraction(f))
  );
  monzo.numberOfComponents = getNumberOfComponents();
  LUMIS_MAP.set(key, monzo);
}

export function getLumisComma(id: number) {
  let result = UNITY;
  for (const key of id.toString()) {
    if (LUMIS_MAP.has(key)) {
      result = result.mul(LUMIS_MAP.get(key)!) as TimeMonzo;
    }
  }
  return result;
}

const HELMHOLTZ_ELLIS_ARRAY = [UNITY, UNITY];
export const HEJI_SWAPS = [false, false];

for (const [prime, fraction] of Object.entries(HELMHOLTZ_ELLIS)) {
  const index = PRIMES.indexOf(parseInt(prime, 10));
  const monzo = TimeMonzo.fromFraction(fraction);
  HELMHOLTZ_ELLIS_ARRAY[index] = monzo;
  const clone = monzo.clone();
  clone.numberOfComponents = index + 1;
  for (const pe of clone.primeExponents.slice(2)) {
    if (pe.s) {
      HEJI_SWAPS[index] = pe.s < 0;
      break;
    }
  }
}

export function getHelmholtzEllis(index: number) {
  if (index < HELMHOLTZ_ELLIS_ARRAY.length) {
    return HELMHOLTZ_ELLIS_ARRAY[index];
  }
  return UNITY;
}

const HEWM53_ARRAY = [UNITY, UNITY];
export const HEWM53_SWAPS = [false, false];

for (const [prime, fraction] of Object.entries(HEWM53)) {
  const index = PRIMES.indexOf(parseInt(prime, 10));
  const monzo = TimeMonzo.fromFraction(fraction);
  HEWM53_ARRAY[index] = monzo;
  const clone = monzo.clone();
  clone.numberOfComponents = index + 1;
  for (const pe of clone.primeExponents.slice(2)) {
    if (pe.s) {
      HEWM53_SWAPS[index] = pe.s < 0;
      break;
    }
  }
}

export function getHEWM53(index: number) {
  if (index < HEWM53_ARRAY.length) {
    return HEWM53_ARRAY[index];
  }
  return UNITY;
}
