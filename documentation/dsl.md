# SonicWeave DSL
This document describes the SonicWeave domain-specific language for manipulating musical frequencies, ratios and equal temperaments.

## Basic example

SonicWeave is a relative of [Scala .scl](https://www.huygens-fokker.org/scala/scl_format.html) and a successor to Scale Workshop 2 syntax. It is intended for constructing microtonal scales that repeat at the octave (or some other period).

Let's start with a basic major scale in just intonation:
```js
9/8
5/4
4/3
3/2
5/3
15/8
2/1
```

Note that there's no `1/1` to mark the root. The octave `2/1` does double duty as the root note and the interval of repetition.

Let's give labels to the notes with the root on "C".
```js
9/8  "D"
5/4  "E"
4/3  "F"
3/2  "G"
5/3  "A"
15/8 "B"
2/1  "C"
```

Notice again how the root and its label comes last in the list.

Our scale is still pretty abstract in the sense that the notes do not correspond to any specific frequencies. A tool like Scale Workshop 3 sets the reference frequency automatically but let's set it manually here:

```js
1/1 = 262 Hz
9/8  "D"
5/4  "E"
4/3  "F"
3/2  "G"
5/3  "A"
15/8 "B"
2/1  "C"
```

Now the first note has the frequency of 262 oscillations per second and the note G has a frequency of 393 Hz (262 times 3/2). The scale repeats at 524 Hz so E in the next octave corresponds to 655 Hz (262 times 5/4 times 2/1).

### Absolute pitch notation

SonicWeave is a major upgrade compared to Scale Workshop 2. One of the new features is support for an extended version of the [Functional Just System](https://en.xen.wiki/w/Functional_Just_System) which allows us to spell our scale as follows:

```js
C4 = 262 Hz
D4
E4^5
F4
G4
A4^5
B4^5
C5
```

### Cents

Another common way to notate pitch is using [cents](https://en.wikipedia.org/wiki/Cent_(music)). The octave is worth 1200 cents and following Scala's convention SonicWeave dedicates the decimal dot (`.`) for representing relative musical intervals measured in cents.

Using cents up to one decimal of precision our major scale becomes:
```js
1/1 = 262 Hz
203.9  "D"
386.3  "E"
498.   "F"
702.   "G"
884.4  "A"
1088.3 "B"
1200.  "C"
```

Note how the last dot in `1200.` is required. Without it `1200` denotes the frequency ratio between 1 Hz and 1200 Hz, a huge interval!

Decimal ratios are less commonly used in music, but can be as useful as cents for comparing the sizes of intervals. E.g. the frequency ratio of `11/9` is around `1.2222e` while `27/22` is a smidge wider around `1.227272e`. The final `e` differentiates `1.2e` (just minor third) from `1.2` (an unnoticeably small interval, basically a chorus tone near 1/1). The `e` may be followed with a ten's exponent. E.g. `14e-1` is unnecessarily obfuscated notation for `7/5`.

### Equal temperaments

In addition to just intonation and cents SonicWeave has notation for equal divisions of the octave like 12-tone equal temperament commonly used around the world.

The notation `n \ m` denotes n steps of m equal logarithmic divisions of the octave.

Let's update our example and use the common A440 pitch standard:
```js
A4 = 440 Hz = 9\12

2\12  "D"
4\12  "E"
5\12  "F"
7\12  "G"
9\12  "A"
11\12 "B"
12\12 "C"
```

The expression `440 Hz = 9\12` implicitly sets the reference frequency for 1/1 at around `261.626 Hz`. For now the `A4 = 440 Hz` part is just for show.

To get a taste of the powerful tempering features in SonicWeave we'll spell our scale using (absolute) FJS but add `12@` at the end to tell the runtime to interprete everything in 12-TET.

```js
A4 = 440 Hz = 9\12

D4
E4
F4
G4
A4
B4
C5

12@
```

We could drop the FJS inflection `^5` from `E4` because in 12-tone equal `E4` and `E4^5` are tempered together.

To highlight the power of tempering we can convert our major scale to 31-tone equal temperament simply by switching out the reference interval and the final `12@` with `31@`.

```js
A4 = 440 Hz = 23\31

D4
E4
F4
G4
A4
B4
C5

31@
```

## Domains

So far we've only used one interval per line corresponding to a single note repeated every octave.

SonicWeave supports many operations between intervals but their meaning varies depending on the *domain* the operands inhabit.

On the equally tempered piano it is natural that two steps combined with two steps makes four steps in total. This is reflected in the language by the fact that `2\12 + 2\12` equals `4\12`. This makes sense notationally: the numerators of fractions of the octave with common denominators add together: `2\12 + 2\12` equals `(2 + 2)\12`.

The same goes for cents: `200. + 200.` equals `400.` as expected.

Let's see what happens when we add two whole tones together in just intonation `9/8 + 9/8` is `(9 + 9)/8` is `18/8` is `9/4`, an interval larger than the octave `8/4`! How unexpected! On the other hand it would be weirder if addition of fractions didn't follow the usual rules of mathematics.

The difference of what the operator `+` means is indicated by the *domain* of the interval. Steps of equal temperaments and cents are *logarithmic* quantities so their underlying frequency ratios multiply together: `200. + 200.` actually means around `1.122e * 1.122e` ≈ `1.26e` under the hood.

On the other hand fractions like `9/8` are in the *linear* domain. The musically correct way of combining them is multiplication so `9/8 * 9/8` equal to `81/64` is the major third we expect from stacking two whole tones.

Relative FJS intervals can be especially confusing because they represent fractions but add like cents do. Our whole tone stack becomes `M2 + M2` equal to `M3`. This is notationally expected even if obscured by the ordinal nature of traditional Western music notation. Remember that the perfect unison `P1` represents no change and `P1 + P1` is equal to `P1` i.e. 1st + 1st = 1st. Therefore 2nd + 2nd must be (2+2-1)rd = 3rd.

For the most part you cannot combine intervals across domains so `9/8 * M2` is not a valid operation. Use tildes (`~`) to always operate as if in the linear domain. E.g. `9/8 ~* M2` is a valid expression and evaluates to `81/64` while `9/8 *~ M2` evaluates to `M3`. The direction of the "wing" tells which domain and formatting to prefer.

Conversely the minus operator `-` represent divisions of the underlying values in the logarithmic domain and the usual kind of subraction in the linear domain e.g. `1.2e - 0.1e` equals `1.1e` owing to decimal ratios inhabiting the linear domain.

### Breaking change compared to Scale Workshop 2

Scale Workshop 2 didn't have domains, everything was logarithmic, so `81/64 - 81/80` was valid notation for `5/4`. In SonicWeave this expression must be spelled `(81/64) / (81/80)` or `81/64 ÷ 81/80` using the handy division operator that binds more loosely than the fractional slash (`/`).

Another breaking change is that *comma decimals* are no longer allowed in complex expressions `1,2 + 1,2` equal to `1,44` in Scale Workshop 2 must be spelled `1.2e * 1.2e` in SonicWeave. Users are strongly advised **not** to use comma decimals anymore even if a single `1,2` is still legal syntax for backwards compatibility. The decimal comma is deprecated and will be removed in SonicWeave 2.0.

## To be continued...

TODO: More DSL docs.
