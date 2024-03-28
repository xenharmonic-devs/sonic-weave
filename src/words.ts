import {mmod} from 'xen-dev-utils';

type StepVector = Record<string, number>;

function sum(array: number[]) {
  let sum = 0;
  array.forEach(x => {
    sum += x;
  });
  return sum;
}

/* Zero vector
*/
export function zeroVector(): StepVector {
  return {};
}

/* Add two `StepVector`s
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

/* Scalar multiplication on `StepVector`
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

/* Additive inverse of a `StepVector`
*/
export function neg(v: StepVector): StepVector {
  return scalarMult(v, -1);
}

/* Subtract two `StepVector`s
*/
export function sub(v1: StepVector, v2: StepVector): StepVector {
  return add(v1, neg(v2));
}

/* Rotate a string, moving it left by `offset`.
*/
export function rotate(str: string, offset: number): string {
  return [...Array(str.length).keys()]
    .map(i => str[mmod(i + offset, str.length)])
    .join('');
}

/* Elements in the resulting StepVector have the order given by `orderedLetterList`.
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

/* Step signature for the entire scale word
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

/* Interval matrix a.k.a. the modes of a scale, but with step vectors.
  Return the step vector for the j-step on mode i.
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

/* Return the number of distinct letters in a word.
*/
export function wordArity(word: string): number {
  return new Set(word).size;
}

/* Return the number of distinct letters in a step vector.
*/
export function stepVectorArity(sv: StepVector): number {
  return Object.keys(sv).length;
}

/* Return the set of letters, sorted in ASCII order.
*/
export function letters(sv: StepVector): string[] {
  return Object.keys(sv).sort();
}

/* Return the taxicab norm of a step vector, the sum of the absolute values of the components.
*/
export function norm(sv: StepVector): number {
  return sum(Object.values(sv).map(x => Math.abs(x)));
}
