export const PRELUDE_VOLATILES = `
(* XXX: This is only here to bypass scope optimization so that Scale Workshop can hook warn(). *)
riff reduce(scale = ££) {
  "Obtain a copy of the popped/given scale reduced by its equave. Issue a warning if the scale was already reduced.";
  if (not scale)
    return [];
  if (every(scale >= 1 vand scale <= scale[-1])) {
    warn("The scale was already reduced by its equave. Did you mean 'simplify'?");
    return scale[..];
  }
  return equaveReduce(scale);
}
`;

export const PRELUDE_SOURCE = `
(** Root context dependents **)

(**
 * Note that this could be golfed to:
 * const ablin = i => i linear absolute,
 * but it would lead to weird behavior if i is a function.
 *)
riff ablin(interval) {
  "Convert interval to absolute linear representation.";
  return absolute(linear interval);
}

riff ablog(interval) {
  "Convert interval to absolute logarithmic representation.";
  return absolute(logarithmic interval);
}

riff relin(interval) {
  "Convert interval to relative linear representation.";
  return relative(linear interval);
}

riff relog(interval) {
  "Convert interval to relative logarithmic representation.";
  return relative(logarithmic interval);
}

riff NFJS(interval) {
  "Convert interval to (relative) FJS using neutral comma flavors.";
  return FJS(interval, 'n');
}

riff absoluteNFJS(interval) {
  "Convert interval to absolute FJS using neutral comma flavors.";
  return absoluteFJS(interval, 'n');
}

riff HEJI(interval) {
  "Convert interval to (relative) FJS using HEJI comma flavors.";
  return FJS(interval, 'h');
}

riff absoluteHEJI(interval) {
  "Convert interval to absolute FJS using HEJI comma flavors.";
  return absoluteFJS(interval, 'h');
}

(** Functions **)
riff vbool(value) {
  "Convert value to a boolean. Vectorizes over arrays.";
  return vnot vnot value;
}

riff keys(record) {
  "Obtain an array of keys of the record.";
  return map([key] => key, entries record);
}

riff values(record) {
  "Obtain an array of values of the record.";
  return map([_, value] => value, entries record);
}

riff range(start, stop = niente, step = 1) {
  "Obtain an array of integers from \`start\` to \`stop - 1\`. When only a single parameter is given \`range(0, n)\` is returned.";
  if (stop == niente) {
    stop = start;
    start = 0;
  }
  return [start, start+step .. < stop];
}

riff sanitize(interval) {
  "Get rid of interval formatting, color and label.";
  return bleach(simplify interval);
}

riff fail(message) {
  "Throw the given message as an error.";
  throw message;
}

riff trap(message) {
  "Produce a function that fails with the given message when called.";
  return () => fail(message);
}

riff assert(test, message = "Assertion failed.") {
  "Assert that the test expression is true or fail with the given message.";
  if (not test)
    fail(message);
}

riff domainOf(interval) {
  "Return the domain of the given interval as a callable converter.";
  return linear where isLinear(interval)
    else logarithmic where isLogarithmic(interval)
      else trap("An interval is required.");
}

riff sqrt(x) {
  "Calculate the square root of the input.";
  return √x;
}

riff cbrt(x) {
  "Calculate the cube root of the input.";
  return x ~/^ 3;
}
riff exp(x) {
  "Calculate e raised to the power of x.";
  return E ~^ x;
}
riff log(x, y = E) {
  "Calculate the logarithm of x base y. Base defaults to E.";
  return x ~/_ y;
}
riff log10(x) {
  "Calculate the logarithm of x base 10.";
  return x ~/_ 10;
}
riff log2(x) {
  "Calculate the logarithm of x base 2.";
  return x ~/_ 2;
}
riff acosh(x) {
  "Calculate the inverse hyperbolic cosine of x.";
  return log(x ~+ sqrt(x ~^ 2 ~- 1));
}
riff asinh(x) {
  "Calculate the inverse hyperbolic sine of x.";
  return log(x ~+ sqrt(x ~^ 2 ~+ 1));
}
riff atanh(x) {
  "Calculate the inverse hyperbolic tangent of x.";
  return log((1 +~ x) ~% (1 -~ x)) ~% 2;
}
riff cosh(x) {
  "Calculate the hyperbolic cosine of x.";
  return (exp(x) ~+ exp(-~x)) ~% 2;
}
riff sinh(x) {
  "Calculate the hyperbolic sine of x.";
  return (exp(x) ~- exp(-~x)) ~% 2;
}
riff tanh(x) {
  "Calculate the hyperbolic tangent of x.";
  return (exp(x) ~- exp(-~x)) ~% (exp(x) ~+ exp(-~x));
}
riff pow(x, y) {
  "Calculate x to the power of y.";
  return x ~^ y;
}
riff numerator(x) {
  "Calculate the numerator of x in reduced form.";
  return lcm(1, x);
}
riff denominator(x) {
  "Calculate the denominator of x in reduced form.";
  return %gcd(1, x);
}
riff sign(x) {
  "Calculate the sign of x.";
  return 1 where x > 0 else -1 where x < 0 else 0 where x == 0 else nan;
}
riff oddLimitOf(x, equave = 2) {
  "Calculate the odd limit of x. Here 'odd' means not divisible by the equave.";
  const noEquaves = x ~% equave^(%logarithmic(equave) dot x);
  return numerator(noEquaves) max denominator(noEquaves);
}
riff weilHeight(x) {
  "Calculate the Weil height of the interval. Natural logarithm of the maximum of numerator or denominator.";
  return (tenneyHeight x ~+ log(labs~x)) ~/ 2;
}
riff hypot(...args) {
  "Calculate the square root of the sum of squares of the arguments.";
  return sum(map(a => a ~^ 2, args)) ~/^ 2;
}

riff bpm(beats) {
  "Calculate the frequency corresponding to the given number of beats per minute.";
  return beats % 60s;
}

riff avg(...terms) {
  "Calculate the arithmetic mean of the terms.";
  return arrayReduce((a, b) => a ~+ b, terms) ~% length(terms);
}

riff havg(...terms) {
  "Calculate the harmonic mean of the terms.";
  return arrayReduce((a, b) => a ~/+ b, terms) ~* length(terms);
}

riff geoavg(...factors) {
  "Calculate the geometric mean of the factors.";
  return arrayReduce((a, b) => a ~* b, factors) ~/^ length(factors);
}

riff circleDifference(a, b, equave = 2) {
  "Calculate the geometric difference of two intervals on a circle.";
  const half = equave ~/^ 2;
  return logarithmic((a ~% b ~* half) ~rd equave ~% half);
}

riff circleDistance(a, b, equave = 2) {
  "Calculate the geometric distance of two intervals on a circle.";
  return labs~circleDifference(a, b, equave);
}

riff mtof(index) {
  "Convert MIDI note number to absolute frequency.";
  return 440 Hz * 2 ^ (index - 69)/12;
}
riff ftom(freq) {
  "Convert absolute frequency to MIDI note number / MTS value (fractional semitones with A440 = 69).";
  return freq/440Hz /_ 2 * 12 + 69;
}

riff void() {
  "Get rid of expression results. \`void(++i)\` increments the value but doesn't push anything onto the scale.";
  return;
}

riff sum(terms = $$) {
  "Calculate the (linear) sum of the terms or the current scale.";
  return arrayReduce((total, element) => total +~ element, terms);
}

riff add(...terms) {
  "Calculate the (linear) sum of the arguments.";
  return sum terms;
}

riff prod(factors = $$) {
  "Calculate the (linear) product of the factors or the current scale i.e. the logarithmic sum.";
  return arrayReduce((total, element) => total *~ element, factors);
}

riff mul(...factors) {
  "Calculate the (linear) product of the arguments i.e. the logarithmic sum.";
  return prod factors;
}

riff stackLinear(array = ££) {
  "Cumulatively sum the numbers of the popped/given array.";
  array;
  let i = 0r;
  const len = real(length($));
  while (++i < len)
    $[i] ~+= $[i-1r];
}

riff cumsum(array) {
  "Calculate the cumulative sums of the terms in the array.";
  return stackLinear(array);
}

riff stack(array = ££) {
  "Cumulatively stack the popped/given intervals on top of each other.";
  array;
  let i = 0r;
  const len = real(length($));
  while (++i < len)
    $[i] ~*= $[i-1r];
}

riff cumprod(array) {
  "Calculate the cumulative products of the factors in the array i.e. logarithmic cumulative sums.";
  return stack(array);
}

riff diff(array) {
  "Calculate the (linear) differences between the terms.";
  array;
  let i = real(length($));
  while (--i)
    $[i] ~-= $[i - 1r];
}

riff unstack(array = ££) {
  "Unstack the popped/given scale into steps.";
  array;
  let i = real(length($));
  while (--i)
    $[i] ~%= $[i - 1r];
}

riff geodiff(array) {
  "Calculate the geometric differences between the factors.";
  return unstack(array);
}

riff unperiostack(array = ££) {
  "Convert the popped/given periodic sequence of steps into inflections of the last interval as the guide generator.";
  array;
  const first = $[0] ~% $[-1];
  let i = real(length($));
  while (--i)
    $[i] ~%= $[i - 1r];
  $[0] = first;
}

riff periodiff(array) {
  "Calculate the geometric differences of the periodic interval pattern.";
  return unperiostack(array);
}

riff periostack(guideGenerator, array = ££) {
  "Stack the popped/given inflections along with the guide generator into a periodic sequence of steps.";
  if (not isInterval(guideGenerator))
    throw "Guide generator must be an interval.";
  array;
  $[0] ~*= guideGenerator;
  let i = 0r;
  const len = real(length($));
  while (++i < len)
    $[i] ~*= $[i-1r];
}

riff antiperiodiff(constantOfIntegration, array) {
  "Calculate the cumulative geometric sums of a periodic difference pattern. Undoes what periodiff does.";
  return periostack(constantOfIntegration, array);
}

riff enumerate(array = $$) {
  "Produce an array of [index, element] pairs from the given current/given array.";
  return [[i, array[i]] for i in array];
}

riff tune(a, b, numIter = 1, weighting = 'tenney') {
  "Find a combination of two vals that is closer to just intonation.";
  numIter = real(numIter) + 1r;
  while (--numIter) {
    const x = 2 * a - b;
    const y = a + b;
    const z = 2 * b - a;

    [a, b] = sort([a, b, x, y, z], (u, v) => cosJIP(v, weighting) - cosJIP(u, weighting));
  }
  return a;
}

riff tune3(a, b, c, numIter = 1, weighting = 'tenney') {
  "Find a combination of three vals that is closer to just intonation.";
  numIter = real(numIter) + 1r;
  while (--numIter) {
    const combos = [
      a,
      b,
      c,
      a + b,
      a + c,
      b + c,
      2 * a - b,
      2 * a - c,
      2 * b - a,
      2 * b - c,
      2 * c - a,
      2 * c - b,
      a + b + c,
      a + b - c,
      a + c - b,
      b + c - a,
    ];

    [a, b, c] = sort(combos, (u, v) => cosJIP(v, weighting) - cosJIP(u, weighting));
  }
  return a;
}

riff colorsOf(scale = $$) {
  "Obtain an array of colors of the current/given scale.";
  return map(colorOf, scale);
}

riff labelsOf(scale = $$) {
  "Obtain an array of labels of the current/given scale.";
  return map(labelOf, scale);
}

riff edColors(divisions = 12, offset = 0, equave = 2) {
  "Color every interval in the scale with hue repeating every step of an equal division of \`equave\`. \`offset\` rotates the hue wheel.";

  const base = (equave ~/^ divisions) ~/^ 360;
  riff edColor(interval) {
    "Color an interval wih hue repeating every step of an equal divisions.";
    return interval hsl((offset ~+ interval ~/_ base) ~mod 360, 100, 50);
  }
  return edColor;
}

(** Scale generation **)
riff tet(divisions, equave = 2) {
  "Generate an equal temperament with the given number of divisions of the given equave/octave.";
  if (equave == 2)
    [1..divisions] \\ divisions;
  else
    [1..divisions] \\ divisions ed equave;
}

riff subharmonics(start, end) {
  "Generate a subharmonic segment including the given start and end points.";
  /end::start;
}

riff mos(numberOfLargeSteps, numberOfSmallSteps, sizeOfLargeStep = 2, sizeOfSmallStep = 1, up = niente, down = niente, equave = 2) {
  "Generate a Moment-Of-Symmetry scale with the given number number of large and small steps. \\
  \`up\` defines the brightness of the mode i.e. the number of major intervals from the root. \\
  Alternatively \`down\` defines the darkness of the mode i.e. the number of minor intervals from the root. \\
  The default \`equave\` is the octave \`2/1\`.";
  mosSubset(numberOfLargeSteps, numberOfSmallSteps, sizeOfLargeStep, sizeOfSmallStep, up, down);
  const divisions = abs $[-1];
  if (equave == 2)
    return $ \\ divisions;
  else
    return $ \\ divisions ed equave;
}

riff rank2(generator, up, down = 0, period = 2, numPeriods = 1, generatorSizeHint = niente, periodSizeHint = niente) {
  "Create a finite segment of a Rank-2 scale by stacking the given generator against the given period (or the octave \`2/1\` by default).\\
  \`up\` and \`down\` must be multiples of \`numPeriods\`. The size hints are used to get the correct period reduction when generating a preimage.";
  if (up ~mod numPeriods)
    throw "Up must be a multiple of the number of periods.";
  if (down ~mod numPeriods)
    throw "Down must be a multiple of the number of periods.";
  up ~%= numPeriods
  down ~%= numPeriods
  if (generatorSizeHint == niente and periodSizeHint == niente) {
    generator ~^ [-down..-1] ~rd period;
    generator ~^ [1..up] ~rd period;
    period;
    sort();
    repeat(numPeriods);
    return $;
  }
  generatorSizeHint al= generator;
  periodSizeHint al= period;
  const hint = generatorSizeHint ~^ [-down..up];
  const periods = ceil(hint ~/_ periodSizeHint) - 1;
  const scale = generator ~^ [-down..up] ~% period ~^ periods;
  const scales = zip(scale, hint ~rdc periodSizeHint);
  sortInPlace(scales, (a, b) => compare(a[1], b[1]));
  [a for [a, b] of scales];
  period vor pop();
  return repeat(numPeriods);
}

riff cps(factors, count, equave = 2, withUnity = false) {
  "Generate a combination product set from the given factors and combination size.";
  for (const combination of kCombinations(factors, count))
    prod(combination);
  sort();
  if (not withUnity)
    ground();
  equave;
  equaveReduce();
  return sort();
}

riff wellTemperament(commaFractions, comma = 81/80, down = 0, generator = 3/2, period = 2) {
  "Generate a well-temperament by cumulatively modifying the pure fifth \`3/2\` (or a given generator) by fractions of the syntonic/given comma.";
  1;
  generator ~* comma ~^ commaFractions;
  stack();
  £ ~/ £[down] rdc period;
  sort();
  period vor pop();
}

riff parallelotope(basis, ups = niente, downs = niente, equave = 2, basisSizeHints = niente, equaveSizeHint = niente) {
  "Span a parallelotope by extending a basis combinatorically. \`ups\` defaults to all ones while \`downs\` defaults to all zeros.\\
  The size hints are used to get the correct period reduction when generating a preimage.";
  const basis_ = basis[..];
  const ups_ = ups[..] if ups else [];
  const downs_ = downs[..] if downs else [];
  while (length(ups_) < length(basis_)) push(1, ups_);
  while (length(downs_) < length(basis_)) push(0, downs_);
  basis = basis_[..];
  ups = ups_[..];
  downs = downs_[..];

  equave ~^ 0;

  while (basis) {
    const generator = pop(basis);
    const up = pop(ups);
    const down = pop(downs);

    (* Don't impose color on unity. *)
    const axis = generator ~^ [-down..up];
    axis[down] = bleach(axis[down]);

    axis ~tns~ ££;
  }

  (* It's too hard to keep track of good formatting during tensoring. Simplify non-unison linears. *)
  const l = isLinear($)
  if (l)
    l[0] = false
  $[l] = simplify $[l]

  if (basisSizeHints == niente and equaveSizeHint == niente)
    return sort($ ~rdc equave);

  const scale = £;
  basis = basis_;
  ups = ups_;
  downs = downs_;

  basisSizeHints al= [];
  equaveSizeHint al= equave;
  while (length(basisSizeHints) < length(basis))
    push(basis[length(basisSizeHints)], basisSizeHints);

  equaveSizeHint ~^ 0;

  while (basisSizeHints) {
    const generator = pop(basisSizeHints);
    const up = pop(ups);
    const down = pop(downs);

    generator ~^ [-down..up] ~tns~ ££;
  }

  const hint = £;
  const equaves = ceil(hint ~/_ equaveSizeHint) - 1;

  const scales = zip(scale ~% equave ~^ equaves, hint ~rdc equaveSizeHint);
  [a for [a, b] of sort(scales, (a, b) => compare(a[1], b[1]))];
}

riff eulerGenus(guide, root = 1, equave = 2) {
  "Span a lattice from all divisors of the guide-tone rotated to the root-tone.";
  if (guide ~mod root) {
    throw "Root must divide the guide tone.";
  }
  while (not (guide ~mod equave))
    guide /= equave;

  (divisors(guide) ~% root ~rdc equave) colorOf(guide) labelOf(guide);
  sort();
  equave vor pop();
}

riff octaplex(b0, b1, b2, b3, equave = 2, withUnity = false) {
  "Generate a 4-dimensional octaplex a.k.a. 20-cell from the given basis intervals.";
  const s1 = [-1, -1, 1, 1];
  const s2 = [-1, 1, -1, 1];

  b0 ~^ s1 ~* b1 ~^ s2;
  b0 ~^ s1 ~* b2 ~^ s2;
  b0 ~^ s1 ~* b3 ~^ s2;
  b1 ~^ s1 ~* b3 ~^ s2;
  b2 ~^ s1 ~* b3 ~^ s2;
  b1 ~^ s1 ~* b2 ~^ s2;

  sort();
  if (not withUnity)
    ground();
  equave;
  equaveReduce();
  return sort();
}

riff gs(generators, size, period = 2, numPeriods = 1) {
  "Stack a periodic array of generators up to the given size which must be a multiple of the number of periods.";
  size = round(size % numPeriods);
  generators[[0..size-2] mod length(generators)];
  stack();
  period;
  equaveReduce();
  sort();
  return repeat(numPeriods);
}

riff csgs(generators, ordinal = 1, period = 2, numPeriods = 1, maxSize = 100) {
  "Generate a constant structure generator sequence. Zero ordinal corresponds to the (trivial) stack of all generators while positive ordinals denote scales with constant structure ordered by increasing size.";
  cumprod(map(simplify, generators));
  let accumulator = $[-1];
  period;
  equaveReduce();
  sort();
  let i = -1r;
  const len = real(length(generators));
  ordinal = real(ordinal);
  while (ordinal) {
    accumulator *~= generators[++i mod len];
    push(accumulator ~rd period, $$);
    if (length($$) > maxSize) {
      throw "No constant structure found before reaching maximum size.";
    }
    sortInPlace($$);
    if (hasConstantStructure($$)) {
      void(--ordinal);
    }
  }
  return repeat(numPeriods);
}

riff vao(denominator, maxNumerator, divisions = 12, tolerance = 5.0, equave = 2) {
  "Generate a vertically aligned object i.e. a subset of the harmonic series that sounds like the given equal temperament (default \`12\`) within the given tolerance (default \`5c\`). Harmonics equated by the \`equave\` (default \`2/1\`) are only included once. The returned segment begins at unison.";
  const step = equave /^ divisions;
  const witnesses = [];
  for (const numerator of [denominator .. maxNumerator]) {
    const candidate = numerator % denominator;
    if (labs~((candidate ~by step) %~ candidate) < tolerance) {
      const witness = candidate ~rd equave;
      if (witness not of witnesses) {
        candidate;
        push(witness, witnesses);
      }
    }
  }
}

riff concordanceShell(denominator, maxNumerator, divisions = 12, tolerance = 5.0, equave = 2) {
  "Generate a concordance shell i.e. a vertically aligned object reduced to an equal temperament. Intervals are labeled by their harmonics.";
  let step = 1 \\ divisions ed equave;
  if (equave == 2) {
    step = 1 \\ divisions;
  }
  const result = [];
  for (const harmonic of vao(denominator, maxNumerator, divisions, tolerance, equave)) {
    const candidate = (harmonic by~ step) ~rdc equave;
    const label = (harmonic ~* denominator) simplify str;
    if (candidate of result) {
      const existing = dislodge(candidate, result);
      push(existing concat(labelOf existing, ' & ', label), result);
    } else {
      push(candidate label, result);
    }
  }
  equave = divisions * step;
  if (equave not of result)
    equave;
  result;
  return sort();
}

riff oddLimit(limit, equave = 2) {
  "Generate all fractions with odd limit <= \`limit\` reduced to between 1 (exclusive) and \`equave\` (inclusive).";
  let remainder = 0;
  while (++remainder < equave) {
    [remainder, remainder ~+ equave .. limit];
  }
  [n % d for n of £ for d of £ if gcd(n, d) == 1];
  return sort($ rdc equave);
}

riff realizeWord(word, sizes, equave = niente) {
  'Realize a scale word like "LLsLLLs" as a concrete scale with the given step sizes. One step size may be omitted and inferred based on the size of the \`equave\` (default \`2\`).';
  const signature = stepSignature(word);
  let numMissing = 0;
  let missingLetter = niente;
  for (const letter in signature) {
    if (letter not in sizes) {
      numMissing += 1;
      missingLetter = letter;
    }
  }
  if (numMissing > 1) {
    throw "Only a single step size may be omitted.";
  }
  if (numMissing == 1) {
    equave al= 2;
    let total = 1;
    for (const [letter, count] of entries(signature)) {
      if (letter == missingLetter)
        continue;
      total = total *~ sizes[letter] ~^ count;
    }
    sizes = #{...sizes};
    sizes[missingLetter] = (equave %~ total) ~/^ signature[missingLetter];
  } else if (equave <> niente) {
    let total = 1;
    for (const [letter, count] of entries(signature)) {
      total = total *~ sizes[letter] ~^ count;
    }
    if (total <> equave) {
      throw "Given sizes must be compatible with an explicit equave.";
    }
  }
  for (const letter of word) {
    sizes[letter];
  }
  return stack();
}

(** Scale modification **)
riff equaveReduce(scale = ££) {
  "Obtain a copy of the popped/given scale reduced by its equave.";
  return scale ~rdc scale[-1];
}

riff revpose(scale = ££) {
  "Obtain a copy of the popped/given scale that sounds in the opposite direction."
  scale;
  const equave = pop();
  £ ~% equave;
  reverse();
  %equave;
}

riff retrovert(scale = ££) {
  "Obtain an retroverted copy of the popped/given scale (negative harmony i.e. reflect and transpose).";
  scale;
  const equave = pop();
  equave %~ £;
  reverse();
  equave;
}

riff reflect(scale = ££) {
  "Obtain a copy of the popped/given scale reflected about unison.";
  return %~scale;
}

riff u(scale = ££) {
  "Obtain a undertonal reflection of the popped/given overtonal scale.";
  return reflect(scale);
};

riff o(scale = ££) {
  "Obtain a copy of the popped/given scale in the default overtonal interpretation.";
  scale;
}

riff rotate(onto = 1, scale = ££) {
  "Obtain a copy of the popped/given scale rotated onto the given degree.";
  scale;
  onto = real(onto mod length($));
  if (not onto)
    return $;
  const equave = $[-1];
  while (--onto)
    equave *~ shift();
  const root = shift();
  £ ~% root;
  equave colorOf(root) labelOf(root);
}

riff repeat(times = 2, scale = ££) {
  "Stack the popped/given scale on top of itself.";
  if (not times)
    return [];
  scale;
  const equave = scale[-1];
  for (const level of equave ~^ [1.. < times])
    scale ~* level;
}

riff repeatLinear(times = 2, scale = ££) {
  "Repeat the popped/given scale shifted linearly each time.";
  if (not times)
    return [];
  scale;
  const total = (scale[-1] ~- 1);
  for (const level of total ~* [1.. < times])
    (scale ~- 1) ~+ level ~+ 1;
}

riff flatRepeat(times = 2, scale = ££) {
  "Repeat the popped/given intervals as-is without accumulating equaves.";
  return arrayRepeat(times, scale);
}

riff ground(scale = ££) {
  "Obtain a copy of the popped/given scale that uses the first interval as the implicit unison.";
  scale;
  const root = shift();
  return $ ~% root;
}

riff elevate(scale = ££) {
  "Obtain a copy of the popped/given scale with denominators removed and the root made explicit.";
  scale;
  unshift(sanitize($[-1]~^0));
  const root = sanitize(%~gcd());
  return $ ~* root;
}

riff subset(degrees, scale = ££) {
  "Obtain a copy of the popped/given scale with only the given degrees kept. Omitting the zero degree rotates the scale.";
  scale = scale[..];
  const equave = pop(scale);
  unshift(equave ~^ 0, scale);
  scale[degrees];
  ground();
  equave;
}

riff toHarmonics(fundamental, scale = ££) {
  "Obtain a copy of the popped/given scale quantized to harmonics of the given fundamental.";
  return scale to~ %~fundamental colorOf(scale) labelOf(scale);
}

riff toSubharmonics(overtone, scale = ££) {
  "Obtain a copy of the current/given scale quantized to subharmonics of the given overtone.";
  return %~(%~scale to~ %~overtone) colorOf(scale) labelOf(scale);
}

riff equalize(divisions, scale = ££) {
  "Obtain a copy of the popped/given scale quantized to given equal divisions of its equave.";
  scale;
  let step = 1 \\ divisions;
  if ($[-1] <> 2)
    step ed= $[-1];
  return $ by~ step colorOf($) labelOf($);
}

riff mergeOffset(offsets, overflow = 'drop', scale = ££) {
  "Obtain a copy of the popped/given scale with the given offset or polyoffset merged into it. \`overflow\` is one of 'keep', 'drop' or 'wrap' and controls what to do with offset intervals outside of current bounds.";
  if (not isArray(offsets))
    offsets = [offsets];
  scale;
  const equave = pop();

  unshift(equave ~^ 0);
  const copies = $ tns~ offsets;
  void(shift());

  if (overflow == 'drop') {
    remap(copy => copy[copy > 1 vand copy < equave], copies);
  } else if (overflow == 'wrap') {
    remap(copy => copy ~rdc equave, copies);
  } else {
    equave;
  }

  copies;
  sort();
  if (overflow <> 'keep') {
    equave;
  }
  return keepUnique();
}

riff stretch(amount, scale = ££) {
  "Obtain a copy of the popped/given scale streched by the given amount. A value of \`1\` corresponds to no change.";
  return scale ~^ amount;
}

riff randomVariance(amount, varyEquave = false, scale = ££) {
  "Obtain a copy of the popped/given scale with random variance added.";
  scale;
  let equave;
  if (not varyEquave)
    equave = pop();
  i => i ~* (amount ~^ (2 * random() - 1));
  if (not varyEquave)
    equave;
}

riff coalesce(tolerance = 3.5, action = 'simplest', preserveBoundary = false, scale = ££) {
  "Obtain a copy of the popped/given scale where groups of intervals separated by \`tolerance\` are coalesced into one.\\
  \`action\` is one of 'simplest', 'wilson', 'lowest', 'highest', 'avg', 'havg' or 'geoavg'.\\
  If \`preserveBoundary\` is \`true\` intervals close to unison and the equave are not eliminated.";
  if (not scale)
    return [];

  let last;
  let group = [];
  for (const [i, interval] of enumerate(scale)) {
    if (group and (labs~(last %~ interval) > tolerance or i == length(scale)-1)) {
      if (action == 'lowest') {
        group[0];
      } else if (action == 'highest') {
        group[-1];
      } else if (action == 'avg') {
        avg(...group);
      } else if (action == 'havg') {
        havg(...group);
      } else if (action == 'geoavg') {
        geoavg(...group);
      } else if (action == 'wilson') {
        sort(group, (a, b) => wilsonHeight(a) - wilsonHeight(b))[0];
      } else {
        sort(group, (a, b) => tenneyHeight(a) - tenneyHeight(b))[0];
      }
      group = [];
    }
    last = interval;
    push(interval, group);
  }
  if (not preserveBoundary) {
    while ($$ and labs~$$[0] <= tolerance)
      void(shift($$));
    while ($$ and labs~($$[-1] %~ scale[-1]) <= tolerance)
      void(pop($$));
  }
  scale[-1];
  if (length($) <= 1)
    return $;
  while (length($) > 1 and $[-1] ~= $[-2])
    void(pop($, -2));
}

riff replace(interval, replacement, scale = ££) {
  "Obtain a copy of the popped/given scale with occurences of \`interval\` replaced by \`replacement\`.";
  for (const existing of scale) {
    if (existing == interval) {
      replacement;
    } else {
      existing;
    }
  }
}

riff replaceStep(step, replacement, scale = ££) {
  "Obtain a copy of the popped/given scale with relative occurences of \`step\` replaced by \`replacement\`.";
  unstack(scale);
  replace(step, replacement);
  return stack();
}

riff organize(tolerance = niente, action = 'simplest', preserveBoundary = false, scale = ££) {
  "Obtain a copy of the popped/given scale reduced by its last interval, sorted and with duplicates filtered out.\\
  If \`tolerance\` is given near-duplicates are coalesced instead using the given \`action\`.\\
  If \`preserveBoundary\` is \`true\` intervals close to unison and the equave are not eliminated.";
  equaveReduce(scale);
  if (tolerance == niente)
    keepUnique();
  sort();
  if (tolerance <> niente)
    coalesce(tolerance, action, preserveBoundary);
}
`;
