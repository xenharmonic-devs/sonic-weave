// This is a manual re-construction of cps([1, 3, 5, 7], 2)

"Canonical 1-3-5-7 Hexany"

factors = [1, 3, 5, 7]

// These two 'for' loops could be replaced with map(prod, kCombinations(factors, 2))
for (i of [0 .. length(factors)-1]) {
  for (j of [i+1 .. length(factors)-1]) {
    // Push a combination product onto this scale
    factors[i] * factors[j]
  }
  // Unload the combination onto this scale
}
// Unload everything onto the root scale

// Now we have a scale with combinations {3, 5, 7, 15, 21, 35} (in some order)

// Make 3 the root
combo => combo % 3

// Reduce each by the octave
combo => combo red 2

// Sort in ascending order
sort();

// Shift out the 3/3 because the unison should be implicit
// Voiding is required to avoid pushing the first element on top instead
void(shift())

// Add the octave to finish off
2
