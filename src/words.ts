import {mmod} from 'xen-dev-utils';
import {TimeMonzo} from './monzo';
import {ZERO} from './utils';

/**
 * Step count vector indexed by strings representing distinct step sizes.
 */
export type StepVector = Record<string, number>;

/**
 * Standard letters representing steps of positive size, arranged from smallest to largest indexed by variety.
 */
const POSITIVE_STEP_LETTERS_BY_VARIETY = [
  [],
  ['x'], // There's special handling for P if there are zero-sized or negative steps.
  ['s', 'L'],
  ['s', 'M', 'L'],
  ['s', 'n', 'M', 'L'],
  ['s', 'n', 'M', 'L', 'H'],
  ['t', 's', 'n', 'M', 'L', 'H'],
  ['t', 's', 'n', 'M', 'L', 'H', 'B'],
  ['u', 't', 's', 'n', 'M', 'L', 'H', 'B'],
  ['u', 't', 's', 'n', 'M', 'L', 'H', 'C', 'B'],
  ['u', 't', 's', 'p', 'n', 'M', 'L', 'H', 'C', 'B'],
  ['u', 't', 's', 'p', 'n', 'M', 'L', 'H', 'C', 'G', 'B'],
  ['u', 't', 's', 'p', 'n', 'm', 'M', 'L', 'H', 'G', 'C', 'B'],
  ['u', 't', 's', 'p', 'n', 'm', 'M', 'L', 'H', 'G', 'E', 'C', 'B'],
  ['w', 'u', 't', 's', 'p', 'n', 'm', 'M', 'L', 'H', 'G', 'E', 'C', 'B'],
  ['w', 'u', 't', 's', 'p', 'n', 'm', 'N', 'M', 'L', 'H', 'G', 'E', 'C', 'B'],
];

// Note it's important to get the codepoints correct here w.r.t. µ vs. μ
/**
 * Standard letters representing steps of negative size, arranged from most negative to least negative.
 */
const NEGATIVE_STEP_LETTERS_BY_VARIETY = [
  [],
  ['\u03bc'], // Greek mu
  ['\u03bc', '\u03b5'], // Greek mu and epsilon
];

const ONE_MONZO = new TimeMonzo(ZERO, []);

function sum(array: number[]) {
  let sum = 0;
  array.forEach(x => {
    sum += x;
  });
  return sum;
}

/**
 * Create a new empty step vector with all counts implicitly zero.
 * @returns The additive identity element.
 */
export function zeroVector(): StepVector {
  return {};
}

/**
 * Add two {@link StepVector} instances.
 * @param v1 Fist step vector.
 * @param v2 Second step vector.
 * @returns The sum of the step vectors.
 */
export function add(v1: StepVector, v2: StepVector): StepVector {
  // Clone because we don't want to mutate the input.
  const result = {...v1};
  for (const [letter, value] of Object.entries(v2)) {
    // For each entry,
    // if `result` does not have the entry then add the component from v2 as an entry.
    if (!(letter in v1)) {
      result[letter] = value;
    }
    // If `result` has a nonzero coefficient for that entry:
    else {
      // If the sum at the component is 0, then delete the entry.
      if (value + v1[letter] === 0) {
        delete result[letter];
      } else {
        // Otherwise update the component to the sum.
        result[letter] += value;
      }
    }
  }
  return result;
}

/**
 * Multiply a step vector by a scalar.
 * @param v Step vector to scale.
 * @param scalar A scalar to scale by.
 * @returns The vector multiplied by the given scalar.
 */
export function scalarMult(v: StepVector, scalar: number): StepVector {
  if (scalar === 0) {
    return zeroVector();
  } else {
    // Clone because we don't want to mutate the input.
    const result = {...v};
    for (const letter of Object.keys(result)) {
      result[letter] *= scalar;
    }
    return result;
  }
}

/**
 * Obtain the additive inverse of a {@link StepVector} instance.
 * @param v Step vector to negate.
 * @returns The negated step vector.
 */
export function neg(v: StepVector): StepVector {
  return scalarMult(v, -1);
}

/**
 * Subtract two {@link StepVector} instances.
 * @param v1 Step vector to subtract from.
 * @param v2 Step vector to subtract.
 * @returns Difference of the step vectors.
 */
export function sub(v1: StepVector, v2: StepVector): StepVector {
  return add(v1, neg(v2));
}

/**
 * Rotate a string by moving it by the given offset.
 * @param str String to rotate.
 * @param offset Offset to rotate by.
 * @returns The rotated string.
 */
export function rotate(str: string, offset: number): string {
  return [...Array(str.length).keys()]
    .map(i => str[mmod(i + offset, str.length)])
    .join('');
}

/* Elements in the resulting StepVector have the order given by `orderedLetterList`.
 */

/**
 * Obtain the step vector associated it the given interval class of the given word.
 * @param word A mode of a (periodic) scale given as a string where each character represents a (geometric) step.
 * @param intervalClass Which subtension from root position to calculate.
 * @returns A {@link StepVector} instance representing the interval class in terms of the word characters.
 */
export function getStepVector(word: string, intervalClass: number): StepVector {
  if (word.length === 0) {
    // Always return the zero vector if `word` is empty
    return zeroVector();
  } else if (intervalClass % word.length === 0) {
    return scalarMult(
      stepSignature(word),
      Math.floor(intervalClass / word.length)
    );
  } else {
    // Initialize `result` to a prefix with `intervalClass / word.length` letters
    const result = scalarMult(
      stepSignature(word),
      Math.floor(intervalClass / word.length)
    );
    const slice = String(word).slice(0, intervalClass % word.length);
    // Do it the intuitive way:
    // For each letter encountered, if `letter` is not already in `result`,
    // then create a new entry for key `letter`; otherwise increment existing value for `letter`.
    Array.from(slice).forEach(letter => {
      if (!(letter in result)) {
        result[letter] = 1;
      } else {
        result[letter]++;
      }
    });
    return result;
  }
}

/**
 * Calculate the step signature of an entire scale word.
 * @param word A (periodic) scale given as a string where each character represents a (geometric) step.
 * @returns A {@link StepVector} instance representing the size of the entire scale.
 */
export function stepSignature(word: string): StepVector {
  if (word === '') {
    return zeroVector();
  }
  const result = zeroVector();
  Array.from(word).forEach(letter => {
    if (!(letter in result)) {
      result[letter] = 1;
    } else {
      result[letter]++;
    }
  });
  return result;
}

/**
 * Compute the interval matrix a.k.a. the modes of a scale in terms of {@link StepVector} instances.
 * @param word A (periodic) scale given as a string where each character represents a (geometric) step.
 * @returns An array of arrays of {@link StepVector} instances representing the modes of the scale (j-step on mode i).
 */
export function stepVectorMatrix(word: string): StepVector[][] {
  const result = [];
  const columns = [...Array(word.length + 1).keys()];
  for (let i = 0; i < word.length; ++i) {
    const mode: string = rotate(word, i);
    result.push(columns.map(j => getStepVector(mode, j)));
  }
  return result;
}

/**
 * Return the number of distinct letters in a word.
 * @param word A word usually representing a scale where each character represents a step.
 * @returns The number of distinct steps in the scale.
 */
export function wordArity(word: string): number {
  return new Set(word).size;
}

/**
 * Return the number of distinct letters in a step vector.
 * @param sv Step vector to measure.
 * @returns Arity of the step vector.
 */
export function stepVectorArity(sv: StepVector): number {
  return Object.keys(sv).length;
}

/**
 * Return the set of letters representing scale steps, sorted in ASCII order.
 * @param sv Step vector to extract letters from.
 * @returns Letters with non-zero count in the step vector.
 */
export function letters(sv: StepVector): string[] {
  return Object.keys(sv).sort();
}

/**
 * Return the taxicab norm of a step vector, the sum of the absolute values of the components.
 * @param sv Step vector to measure.
 * @returns Size of the step vector.
 */
export function norm(sv: StepVector): number {
  return sum(Object.values(sv).map(x => Math.abs(x)));
}

/**
 * Break a scale with implicit unison into an implicitly repeating scale word.
 * @param monzos Relative monzos representing intervals of the scale.
 * @returns A scale word where each character represents a step of distinct size.
 */
export function stepString(monzos: TimeMonzo[]) {
  if (!monzos.length) {
    return '';
  }
  const steps = [monzos[0].clone()];
  for (let i = 1; i < monzos.length; ++i) {
    steps.push(monzos[i].div(monzos[i - 1]));
  }
  const orderedSteps = [...steps];
  orderedSteps.sort((a, b) => a.compare(b));
  const uniqueSteps = [orderedSteps.shift()!];
  for (const step of orderedSteps) {
    if (!step.equals(uniqueSteps[uniqueSteps.length - 1])) {
      uniqueSteps.push(step);
    }
  }
  let numNegative = 0;
  let numZero = 0;
  let numPositive = 0;
  for (const step of uniqueSteps) {
    const c = step.compare(ONE_MONZO);
    if (c < 0) {
      numNegative++;
    } else if (c > 0) {
      numPositive++;
    } else {
      numZero++;
    }
  }
  const letters: string[] = [];
  if (numNegative < NEGATIVE_STEP_LETTERS_BY_VARIETY.length) {
    letters.push(...NEGATIVE_STEP_LETTERS_BY_VARIETY[numNegative]);
  } else {
    // Too many steps, use fillers.
    while (numNegative > 25) {
      letters.push('¿');
      numNegative--;
    }
    for (let i = 0; i < numNegative; ++i) {
      letters.unshift(String.fromCharCode(945 + i));
    }
  }

  if (numZero) {
    letters.push('z');
  }

  if (numPositive < POSITIVE_STEP_LETTERS_BY_VARIETY.length) {
    if (numPositive === 1 && letters.length) {
      letters.push('P');
    } else {
      letters.push(...POSITIVE_STEP_LETTERS_BY_VARIETY[numPositive]);
    }
  } else {
    // Too many steps, use fillers.
    // Not 52 because lowercase z is reserved. Uppercase Z can still be used.
    while (numPositive > 51) {
      letters.push('?');
      numPositive--;
    }

    const numLower = Math.floor(numPositive / 2);
    for (let i = numLower - 1; i >= 0; --i) {
      letters.push(String.fromCharCode(97 + i));
    }
    const numUpper = Math.ceil(numPositive / 2);
    for (let i = numUpper - 1; i >= 0; --i) {
      letters.push(String.fromCharCode(65 + i));
    }
  }
  let result = '';
  for (const step of steps) {
    for (let i = 0; i < uniqueSteps.length; ++i) {
      if (step.strictEquals(uniqueSteps[i])) {
        result += letters[i];
      }
    }
  }
  return result;
}
