import {mmod} from 'xen-dev-utils';

/**
 * Step count vector indexed by strings representing distinct step sizes.
 */
export type StepVector = Record<string, number>;

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
