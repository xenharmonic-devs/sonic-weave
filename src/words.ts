type StepVector = [string, number][];

export function add(v1: StepVector, v2: StepVector): StepVector {
  const result = v1;
  v2.forEach(cpt => {
    // For each component `cpt`,
    const where = result.findIndex(x => x[0] === cpt[0]);
    // if `result` does not have the entry then add the component from v2 as an entry.
    if (where === -1) {
      result.push(cpt);
    }
    // If `result` has a nonzero coefficient for that entry:
    else {
      // If the sum at the component is 0, then delete the entry.
      if (result[where][1] + cpt[1] === 0) {
        result.splice(where, 1);
      } else {
        // Otherwise change the component to the sum.
        result[where][1] = result[where][1] + cpt[1];
      }
    }
  });
  // Remember to sort after an operation that adds or deletes components!
  result.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0]));
  return result;
}

export function scalarMult(scalar: number, v: stepVector): StepVector {
  if (scalar === 0) {
    return [];
  } else {
    return v.map(component => [component[0], scalar * component[1]]);
  }
}

export function neg(v: stepVector): StepVector {
  return scalarMult(-1, v);
}

export function sub(v1: StepVector, v2: StepVector): StepVector {
  return add(v1, neg(v2));
}

export function rotate(str: string, offset: number): string {
  return [...Array(str.length).keys()]
    .map(i => str[(((i + offset) % str.length) + str.length) % str.length])
    .join('');
}

// Elements in the resulting StepVector have the order given by `orderedLetterList`.
export function getStepVector(word: string, intervalClass: number): StepVector {
  if (intervalClass % word.length === 0) {
    // [] represents the unison. If anything else is returned it's a bug.
    return scalarMult(
      Math.floor(intervalClass / word.length),
      stepSignature(word)
    );
  } else {
    const result = scalarMult(
      Math.floor(intervalClass / word.length),
      stepSignature(word)
    );
    const slice = String(word).substring(0, intervalClass % word.length);
    // Do it the intuitive way:
    // For each letter of `slice`, if `letter` is not already in `result`,
    // then append `[letter, 1]`, otherwise increment existing value for `letter`.
    Array.from(slice).forEach(letter => {
      const where = result.findIndex(x => x[0] === letter);
      if (where === -1) {
        result.push([letter, 1]);
      } else {
        result[where][1]++;
      }
    });
    // Sort by alphabetical order of the letters; we will always match size with alphabetical order.
    result.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0]));
    return result;
  }
}

// Step signature for the entire scale word
export function stepSignature(word: string): StepVector {
  if (word === '') {
    return [];
  }
  const result = [];
  Array.from(word).forEach(letter => {
    const where = result.findIndex(x => x[0] === letter);
    if (where === -1) {
      result.push([letter, 1]);
    } else {
      result[where][1]++;
    }
  });
  // Sort by alphabetical order of the letters; we will always match size with alphabetical order.
  result.sort((x, y) => x[0] < y[0]);
  return result;
}

// Interval matrix a.k.a. the modes of a scale, but with step vectors.
// Return the step vector for the j-step on mode i.
export function stepVectorMatrix(word: string): StepVector[][] {
  const result = [];
  const columns = [...Array(word.length + 1).keys()];
  for (let i = 0; i < word.length; ++i) {
    const mode: string = rotate(word, i);
    result.push(columns.map(j => getStepVector(mode, j)));
  }
  return result;
}

// Return the number of distinct letters in a word.
export function wordArity(word: string): number {
  return stepSignature(word).length;
}

// Return the number of distinct letters in a step vector.
export function stepVectorArity(sv: StepVector): number {
  return sv.length;
}

// Return the taxicab norm of a step vector, the sum of the absolute values of the components.
export function norm(sv: StepVector): number {
  let result = 0;
  sv.forEach(cpt => (result += Math.abs(cpt[1])));
  return result;
}
