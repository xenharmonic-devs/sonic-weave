# SonicWeave DSL
This document describes the SonicWeave domain-specific language for manipulating musical frequencies, ratios and equal temperaments.

## Basic example

SonicWeave is related to [Scala .scl](https://www.huygens-fokker.org/scala/scl_format.html) and a successor of Scale Workshop 2. It is intended for constructing microtonal scales that repeat at the octave (or some other period).

Let's start with a basic major scale in just intonation:
```c
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
```c
9/8  "D"
5/4  "E"
4/3  "F"
3/2  "G"
5/3  "A"
15/8 "B"
2/1  "C"
```

Notice again how the root and its label come last in the list.

Our scale is still pretty abstract in the sense that the notes do not correspond to any specific frequencies. A tool like Scale Workshop 3 sets the reference frequency automatically but let's set it manually here:

```c
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

```c
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
```c
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

Decimal ratios are less commonly used in music, but can be as useful as cents for comparing the sizes of intervals. E.g. the frequency ratio of `11/9` is around `1.2222e` while `27/22` is a smidge wider around `1.227272e`. The final `e` differentiates `1.2e` (just minor third) from `1.2` (an unnoticeably small interval, basically a chorus tone near 1/1). The `e` may be followed with a ten's exponent. E.g. `14e-1` is unnecessarily obfuscated notation for `14/10` i.e. `7/5`.

### Equal temperaments

In addition to just intonation and cents SonicWeave has notation for equal divisions of the octave like 12-tone equal temperament commonly used around the world.

The notation `n \ m` denotes n steps of m-tone equal temperament.

Let's update our example and use the common A440 pitch standard:
```c
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

```c
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

```c
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

### Relative pitch notation

[FJS](https://en.xen.wiki/w/Functional_Just_System) also has notation for relative intervals like the perfect fifth `P5` between C and G or the major second `M2` between G and A. The microtonal inflections that come after the ordinal number work the same as in absolute FJS. Going back to just intonation our little major scale becomes:

```c
P1 = 262 Hz
M2
M3^5
P4
P5
M6^5
M7^5
P8
```

## Domains

So far we've only used one interval per line corresponding to a single note repeated every octave.

SonicWeave supports many operations between intervals but their meaning varies depending on the *domain* the operands inhabit.

On the equally tempered piano it is natural that two steps combined with two steps makes four steps in total. This is reflected in the language by the fact that `2\12 + 2\12` equals `4\12`. This makes sense notationally: the numerators of fractions of the octave with common denominators add together: `2\12 + 2\12` equals `(2 + 2)\12`.

The same goes for cents: `200. + 200.` equals `400.` as expected.

Let's see what happens when we add two whole-tones together in just intonation `9/8 + 9/8` equals `(9 + 9)/8` or `18/8` i.e. `9/4`, an interval larger than the octave `8/4`! How unexpected! On the other hand it would be weirder if addition of fractions didn't follow the usual rules of mathematics.

The difference of what the operator `+` means is indicated by the *domain* of the interval. Steps of equal temperaments and cents are *logarithmic* quantities so their underlying frequency ratios multiply together: `200. + 200.` actually means around `1.122e * 1.122e` ≈ `1.26e` under the hood.

On the other hand fractions like `9/8` are in the *linear* domain. The musically correct way of combining them is multiplication so `9/8 * 9/8` equal to `81/64` is the (Pythagorean) major third we expect from stacking two whole-tones.

Relative FJS intervals can be especially confusing because they represent fractions but add like cents do. Our whole-tone stack becomes `M2 + M2` equal to `M3`. This is notationally expected even if obscured by the ordinal nature of traditional Western music notation. Remember that the perfect unison `P1` represents no change and `P1 + P1` is equal to `P1` i.e. 1st + 1st = 1st. Therefore 2nd + 2nd must be a (2+2-1)rd = 3rd.

For the most part you cannot combine intervals across domains so `9/8 + M2` is not a valid operation. Use tildes (`~`) to always operate as if in the linear domain (meaning that, for example, `+` and `*` will always work as in maths). E.g. `9/8 ~* M2` is a valid expression and evaluates to `81/64` while `9/8 *~ M2` evaluates to `M3`. The direction of the "wing" determines which domain and formatting to prefer.

Conversely the minus operator `-` represent divisions of the underlying values in the logarithmic domain and the usual kind of subraction in the linear domain e.g. `1.2e - 0.1e` equals `1.1e` owing to decimal ratios inhabiting the linear domain.

### Breaking change compared to Scale Workshop 2

Scale Workshop 2 didn't have domains, everything was logarithmic, so `81/64 - 81/80` was valid notation for `5/4`. In SonicWeave this expression must be spelled `(81/64) / (81/80)` or `81/64 ÷ 81/80` using the handy division operator that binds more loosely than the fractional slash (`/`).

Another breaking change is that *comma decimals* are no longer allowed in complex expressions `1,2 + 1,2` equal to `1,44` in Scale Workshop 2 must be spelled `1.2e * 1.2e` in SonicWeave. Users are strongly advised **not** to use comma decimals anymore even if a single `1,2` is still legal syntax for backwards compatibility. The decimal comma is deprecated and will be removed in SonicWeave v2.0.

## Adding colors to notes

Microtonal scales can get complicated pretty fast so in addition to string labels we saw before SonicWeave has built-in support for CSS colors.

Let's spell out all the notes of 12-tone equal temperament with labels and the usual colors you would find on a piano keyboard, and let's also introduce a handy helper function (`mtof`) from the standard library for converting MIDI note number to a frequency in the A440 pitch standard:
```c
0\12 = mtof(60)

1\12  "C# / Db" black
2\12  "D"       white
3\12  "D# / Eb" black
4\12  "E"       white
5\12  "F"       white
6\12  "F# / Gb" black
7\12  "G"       white
8\12  "G# / Ab" black
9\12  "A"       white
10\12 "A# / Bb" black
11\12 "B"       white
12\12 "C"       white
```

Now a tool like Scale Workshop can show you the colors so that you can differentiatiate notes with accidentals from notes without.

Colors may be specified using
- [Keywords](https://www.w3.org/wiki/CSS/Properties/color/keywords) like `red`, `white` or `black`
- Short hexadecimal colors like `#d13` for crimson red
- Long hexadecimal colors like `#e6e6fa` for lavender
- RGB values like `rgb(160, 82, 45)` for sienna brown
- HSL values like `hsl(120, 60, 70)` for pastel green

SonicWeave doesn't have percentages so the CSS color `hsl(120, 60%, 70%)` is spelled without the percent signs.

## Code comments

Anything after two slashes (`//`) is ignored until the end of the line. Everything after a slash and an asterisk (`/*`) is ignored until a corresponding pair (`*/`) is encountered. (This means you cannot nest multi-line comments, as in C and JavaScript.)

```c
1 = 432 Hz  // Good vibes only... Wait what are you doing?!
11/8
/**
 * The undecimal superfourth 11/8 of about 551.3¢ is the simplest superfourth in just intonation,
 * and as it falls about halfway between 12edo's perfect fourth and tritone, it is very xenharmonic.
 *
 * The YouTuber mannfishh has made a video revealing the terrifying truths of the 11th harmonic.
 */

// Did you know you can repeat scales at the fifth too?
3/2
```

## Accidentals

Above we gave `1\12` the name "C# / Db" because it doesn't really matter if it's a C sharp or a D flat, they sound the same anyway.

However in [Pythagorean tuning](https://en.wikipedia.org/wiki/Pythagorean_tuning), which is the default in SonicWeave, C sharp and D flat correspond to distinct frequencies.

By default[^1] adding a sharp sign (`#` or `♯`) to an absolute pitch multiplies the underlying frequency by `2187/2048` ≈ `1.06787e` or equivalently shifts the pitch up by about `113.685 ¢`. (Yes that fancy unicode cent is legal syntax in SonicWeave when attached to a numeric literal; A plain `c` also works.)

[^1]: *By default* is too soft an expression here. The sharp sign widens an interval by an apotome, *period*. Tempering applies to values as they are specified and only makes it seem that `#` narrows from `113.685 c` down to `100.0 c` when a scale is tempered to 12-tone equal using `12@` at the bottom.

Conversely a flat sign (`b` or `♭`) on an absolute pitch shifts its pitch down by around `113.685 c` corresponding to a multiplication by `2048/2187` ≈ `0.93644e` of the underlying frequency.

Let's play around with these a bit to get a feel for them:
```c
C4 = 262 Hz

/*
Pitch // Frequency |    Cents | Ratio
*/
Db4   // 276.016Hz |   90.225 | 1.053
C#4   // 279.782Hz |  113.685 | 1.068
D4    // 294.750Hz |  203.910 | 1.125
G4    // 393.000Hz |  701.955 | 1.500
C5    // 524.000Hz | 1200.000 | 2.000
```

Looking at the frequencies or the width of the interval against the root note we can see that D flat is lower in pitch than C sharp. They differ by a [Pythagorean comma](https://en.xen.wiki/w/Pythagorean_comma) of around `23.460 c`. The art and science of musical tuning often deals with small intervals like this. One approach is to make it go away i.e. temper it out which leads to 12-tone equal temperament a.k.a. 12ed2.

```c
C4 = 262 Hz

// Merge sharps together with the flat of the note above.
defer 12@

/*
Pitch // Frequency |    Cents | Ratio
*/
Db4   // 277.579Hz |  100.000 | 1.059
C#4   // 277.579Hz |  100.000 | 1.059
D4    // 294.085Hz |  200.000 | 1.122
G4    // 392.556Hz |  700.000 | 1.498
C5    // 524.000Hz | 1200.000 | 2.000

// Tempering using 12@ was deferred here.
```

Another thing we might notice is that the fifth at `700.0` is only about two cents flat of the frequency ratio `1.5e` of the justly intoned fifth. The major third at `200.0` on the other hand is almost four cents flat of `1.125e`. Small tuning error like these tend to compound the further you go along the chain of fifths.

Let's do one final comparison in 19-tone equal temperament:
```c
C4 = 262 Hz

// Temper to 19ed2
defer 19@

/*
Pitch // Frequency |    Cents | Ratio
*/
C#4   // 271.735Hz |   63.158 | 1.037
Db4   // 281.831Hz |  126.316 | 1.076
D4    // 292.302Hz |  189.474 | 1.116
G4    // 391.365Hz |  694.737 | 1.494
C5    // 524.000Hz | 1200.000 | 2.000
```

I've switched around C# and Db because now the effect of the sharp is much more mellow. It's only worth `1\19` or around `63.158 c` here. Systems where the fifth is flatter than in 12ed2 are often nicer to notate and perform because the sharps and flats are close to the corresponding natural pitches and don't cross over like they do in Pythagorean tuning or even sharper systems.

### Double accidentals

Double accidentals are straightforward enough. `C##4` is twice as far from `C4` as `C#4` is. In Pythagorean tuning that's a pitch distance of about 227.370 cents. Another spelling for `##` is `x` standing in for `𝄪` which is also valid in SonicWeave.

Correspondingly `Cbb4` is twice as flat as `Cb4`. There's no single ASCII character standing in for `𝄫` in this case.

The formal definition of the sharp is seven steps along the chain of fifths reduced by octaves. Mathematically this corresponds to a factor of three to the power of seven divided by two to the power of eleven. There's a handy [monzo](https://en.xen.wiki/w/Monzo) notation for this quantity 2⁻¹¹ ⋅ 3⁷ in `[-11 7>`. The double sharp is just two of these `[-11 7> + [-11 7>` = `[-22 14>`.

The basic accidentals are summarized below:

| Accidental | Monzo      | Size in cents |
| ---------- | ---------- | ------------- |
| `=`, `♮`   | `[0 0>`    | `0.000`       |
| `#`, `♯`   | `[-11 7>`  | `+113.685`    |
| `x`, `𝄪`   | `[-22 14>` | `+227.370`    |
| `b`, `♭`   | `[11 -7>`  | `-113.685`    |
| `bb`, `𝄫`  | `[22 -14>` | `-227.370`    |

## Relative Pythagorean notation

Pythagorean notation is build around the chain of fifths centered on the perfect unison. In SonicWeave we can use scalar multiplication to compress a sum like `P5 + P5 + P5` into `3 * P5` so the chain looks like this:

..., `-3*P5`, `-2*P5`, `-P5`, `P1`, `P5`, `2*P5`, `3*P5`, ...

An interval like `3 * P5` is already quite wide so we add or subtract octaves as needed to stay within a single octave:

| Fifths + octaves | Literal  | Name             |
| ---------------- | -------- | ---------------- |
| `-6*P5 + 4*P8`   | `dim5`   | diminished fifth |
| `-5*P5 + 3*P8`   | `m2`     | minor second     |
| `-4*P5 + 3*P8`   | `m6`     | minor sixth      |
| `-3*P5 + 2*P8`   | `m3`     | minor third      |
| `-2*P5 + 2*P8`   | `m7`     | minor seventh    |
| `-P5 + P8`       | `P4`     | perfect fourth   |
| `0*P5`           | `P1`     | perfect unison   |
| `P5`             | `P5`     | perfect fifth    |
| `2*P5 - P8`      | `M2`     | major second     |
| `3*P5 - P8`      | `M6`     | major sixth      |
| `4*P5 - 2*P8`    | `M3`     | major third      |
| `5*P5 - 2*P8`    | `M7`     | major seventh    |
| `6*P5 - 3*P8`    | `Aug4`   | augmented fourth |

Or paired up based on interval class:

| Literals     | Fractions         | Sizes in cents        |
| -------------| ----------------- | --------------------- |
| `P1`, `P8`   | `1/1`, `2/1`      | `0.000`, `1200.0`     |
| `m2`, `M2`   | `256/243`, `9/8`  | `90.225`, `203.910`   |
| `m3`, `M3`   | `32/27`, `81/64`  | `294.135`, `407.820`  |
| `P4`, `Aug4` | `4/3`, `729/512`  | `498.045`, `611.730`  |
| `dim5`, `P5` | `1024/729`, `3/2` | `588.27`, `701.955`   |
| `m6`, `M6`   | `128/81`, `27/16` | `792.180`, `905.865`  |
| `m7`, `M7`   | `16/9`, `243/128` | `996.090`, `1109.775` |

The chain is infinite so after `Aug4` comes `Aug1` representing `2187/2048` which is the same as the sharp sign when attached to an absolute pitch nominal. You can't attach accidentals to relative intervals so the doubly augmented unison must be spelled `AugAug1`.

Another spelling for `dim` is `d` and for `Aug` we have both `a` and `Â`, so `aa1` is the doubly augmented unison. During the development of SonicWeave there was some debate about if all pitch nominals should be upper-case or if `A4` was allowed to stand in for the augmented fourth. In the end consistency in absolute notation won and `Â4` got its circumflex to visually distinguish it[^2].

[^2]: The Greek Alpha `Α` would've been a free machine-readable codepoint, but it's not visually distinguishable by humans.

### Pythagorean absolute notation

Under the hood SonicWeave computes a value for `C4` based on your pitch declaration and the rest of the nominals are defined in terms of it and perfect or major intervals:

| Literal | Meaning   |
| ------- | --------- |
| `C4`    | `C4 + P1` |
| `D4`    | `C4 + M2` |
| `E4`    | `C4 + M3` |
| `F4`    | `C4 + P4` |
| `G4`    | `C4 + P5` |
| `A4`    | `C4 + M6` |
| `B4`    | `C4 + M7` |
| `C5`    | `C4 + P8` |

## FJS inflections

The Pythagorean part of FJS notation is powerful enough to represent any multiple of powers of two and powers of three, be the powers negative or positive.

Each higher prime number is associated with a comma which is chosen based on simplicity and the prime being in the numerator (i.e. otonality) rather than direction of the inflection. We already saw the `^5` inflection earlier when we re-spelled our just intonation fractions using absolute FJS. The comma for `5` is `80/81` so `M6^5` is lower in pitch than plain `M6`. The (logarithmic) `M6^5` is the same as (linear) `27/16 * 80/81` or `5/3`. To go in the opposite direction use a subscript (underscore) e.g. `m3_5` corresponds to `6/5`. You can also use a vee, which looks like a downwards-pointing caret, so `m3v5` is the same `logarithmic(6/5)`.

The inflections stack so `m2v5v5` represents `256/243 * 81/80 * 81/80` or `27/25`. Other spellings understood by the parser are `m2_5,5` and `m2v25`.

The inflections work the same on both relative and absolute notation e.g. `Db4_25` represents the frequency of middle C multiplied by `27/25`.

The first few commas are:
| Prime `p` | `P1^p`      | Monzo                  | Size in cents  |
| --------- | ----------- | ---------------------- | -------------- |
| `5`       | `80/81`     | `[4 -4 1>`             | `-21.506`      |
| `7`       | `63/64`     | `[-6 2 0 1>`           | `-27.264`      |
| `11`      | `33/32`     | `[-5 1 0 0 1>`         | `+53.273`      |
| `13`      | `1053/1024` | `[-10 4 0 0 0 1>`      | `+48.348`      |
| `17`      | `4131/4096` | `[-12 5 0 0 0 0 1>`    | `+14.73`       |
| `19`      | `513/512`   | `[-9 3 0 0 0 0 0 1>`   | `+3.378`       |
| `23`      | `736/729`   | `[5 -6 0 0 0 0 0 0 1>` | `+16.544`      |
| `29`      | `261/256`   | `[-8 2 1>@2.3.29`      | `+33.487`      |

The first few prime harmonics in FJS are:
|  Reduced harmonic | FJS     | Absolute FJS |
| ----------------- | ------- | ------------ |
| `5/4`             | `M3^5`  | `E♮4^5`      |
| `7/4`             | `m7^7`  | `B♭4^7`      |
| `11/8`            | `P4^11` | `F♮4^11`     |
| `13/8`            | `m6^13` | `A♭4^13`     |
| `17/16`           | `m2^17` | `D♭4^17`     |
| `19/16`           | `m3^19` | `E♭4^19`     |
| `23/16`           | `a4^23` | `F♯4^23`     |
| `29/16`           | `m7^29` | `B♭4^29`     |

SonicWeave agrees with [FloraC's critique](https://en.xen.wiki/w/User:FloraC/Critique_on_Functional_Just_System) and assigns `31/32` to `P1^31`. The classic inflection may be accessed using the `c` *flavor* i.e. `P1^31c` for `248/243`.

There is a well-known tension between visual similarity with fractions and the direction of inflection. `m7^7` looks like it has a seven in the numerator which it indeed does, but it also looks like it should be wider than plain `m7` which it isn't. [HEJI](https://en.xen.wiki/w/Helmholtz-Ellis_notation) inflections focus on the latter aspect. They're indicated by the `h` flavor at the end of the inflection `m7_7h` (or `m7v7h` if you prefer) is the septimal minor seventh and narrower than its Pythagorean counterpart. You can learn more about various other [comma flavors](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/commas.md) by clicking the link.

## Enumerated chords

Listing out all of the fractions in a scale can get tedious so there's a shorthand for harmonic (a.k.a. overtonal or otonal) chords where the intervals have simple relationships with each other.

Let's take a look at a subset of our major scale:
```c
1/1 = 262 Hz

9/8
5/4
3/2
15/8
2/1
```

Expanding the factors for a common denominator gives:
```c
8/8 = 262 Hz

9/8
10/8
12/8
15/8
16/8
```

So it's clear that they're in a 8:9:10:12:15:16 relationship. This makes our scale fragment a two liner.

```c
1 = 262 Hz
8:9:10:12:15:16
```

The missing 4/3 and 5/3 are in a 3:4:5 relationship with the root. With a final call to `sort()` our full major scale becomes.

```c
1 = 262 Hz
8:9:10:12:15:16
3:4:5
sort()
```

Just as in scales, the unison is implicit in enumerated chords.

Enumerations can span multiple lines so something like this is valid syntax:

```c
1 = 262 Hz

8  "C" : // Implicit
9  "D" :
10 "E" :
12 "G" :
15 "B"

3 "C"  : // Implicit
4 "F"  :
5 "A"  :
6 "C"    // Octave, interval of repetition

sort()
```

### Harmonic segments

Simple consecutive harmonics often sound consonant or at least fuse together so there's syntax for segments of the harmonic series.

```c
1 = 262 Hz

// Same as 8:9:10:11:12:13:14:15:16
8::16
```

Harmonic segments can be mixed in with chord enumerations `7:11::14` is the same as `7:11:12:13:14`.

### Reflected enumerations

A simple major triad is given by `4:5:6` in terms of frequency ratios. However from a luthier's perspective the lengths of the strings of an instrument should be in a 15:12:10 relationship to produce a major chord.

The difference between the perspectives is that of inversion i.e. reflection about the unison: `4:5:6` = `(1/15):(1/12):(1/10)`. This is a bit tedious to write so a simple slash at the beginning of the enumeration suffices `4:5:6` = `/15:12:10`.

## Scale title

A string of characters that is not attached to an interval becomes the title of the scale visible on export.

```c
"Subharmonics 10 through 5"

1 = 262 Hz
/10::5
```

## Ups and downs notation

The primes span a vast musical universe to explore so just intonation can get very complex very fast which is reflected in the notation.

Equal temperaments simplify this complexity to a finite collection of distinct pitches within an octave and many of them offer passable approximations to most of the consonances we care about as musicians.

[https://en.xen.wiki/w/Ups_and_downs_notation](https://en.xen.wiki/w/Ups_and_downs_notation) is designed for working with equal temperaments a.k.a. edos. By default the up inflection (`^`) indicates a positive pitch shift by one edostep while the down inflection (`v`) indicates a negative pitch shift. The conversion from abstract steps to concrete pitch happens during tempering.

Let's demonstrate with an approximation of the 5-limit major scale in 22edo:

```c
C4 = 262 Hz

D4
vE4
F4
G4
vA4
vB4
C5

22@
```

Normally `E4` would temper to `8\22` but using the down inflection we made it a more mellow `7\22`.

### Lifts and drops

Larger edos are more accurate while still being simpler to work with than pure just intonation. One downside is that a single edosteps becomes almost unnoticeably small so we need a new symbol for groups of them. By default the lift inflection (`/`) is worth 5 positive edosteps while the corresponding drop inflection (`\`) is worth 5 negative edosteps.

We can change this using a *lift declaration* `/ = (newLiftAmount)`. The syntax for an edosteps is `1°` or `1 edostep`.

Declaring a lift to be worth 6 degrees of 311edo we arrive at this version of our major scale:

```c
defer 311@
/ = 6°
C4 = 262 Hz

D4
\E4
F4
G4
\A4
\B4
C5
```

## Helper functions

We already saw `mtof(60)` and `sort()` above. There are plenty more, but here's a table of commonly used ones.

| Helper         | Description                                        |
| -------------- | -------------------------------------------------- |
| clear()        | Replace the scale with an empty one.               |
| keepUnique()   | Remove duplicate intervals from the scale.         |
| mtof(midiNote) | Get the frequency corresponding to the MIDI note.  |
| FJS            | Convert fractions to Functional Just Systems.      |
| absoluteFJS    | Convert fractions to absolute pitch notation with FJS inflections.                    |
| reduce         | Reduce pitches in the scale to lie between unison and the octave (or generic equave). |
| relin          | Convert FJS to fractions. Converts anything to relative linear format.                |
| rotate(degree) | Rotate the scale to start on the given degree.     |
| simplify       | Simplify fractions by reducing common factors.     |
| sort()         | Sort the scale in ascending order.                 |
| stack()        | Stack intervals in the scale on top of each other. |
| tet(N)         | Generate one octave of N-tone equal temperament.   |

Some helpers need to be called like `sort()` while other's like `simplify` are implicitly mapped over the current scale. Let's demonstrate with our major that has been code-golfed to obscurity:

```c
1=262z
24:27:30:32:36:40:45:48
```

The intervals will format as `27/24`, `30/24`, etc. but those are just `9/8` and `5/4` with a complicated denominator. Tagging a `simplify` at the end reduces the fractions:

```c
1 = 262 Hz
24:27:30:32:36:40:45:48
simplify
```

The result will format as `9/8`, `5/4`, `4/3`, etc. .

With `FJS` tagged at the end

```c
1 = 262 Hz
24:27:30:32:36:40:45:48
FJS
```

we obtain `M2`, `M3^5`, `P4`, etc. .

To go from (absolute) FJS to fractions we can use `relin`:

```c
A4 = 440 Hz

B4
C5_5
D5
E5
F5_5
G5_5
A5

relin
```

The result is the same as if we had entered:
```c
1/1 = 440 Hz

9/8
6/5
4/3
3/2
8/5
9/5
2/1
```

The `reduce` helper allows us to be imprecise with octaves. The above spelled sloppily is:

```c
defer reduce
1 = 440 Hz

9
3/5
1/3
3
1/5
9/5
2
```

These helpers can be freely combined. A common task is to reduce the scale and sort it only keeping unique intervals. The handy `organize()` helper does just that.

It is often convenient to defer all such *"housekeeping"* actions so that they don't dangle at the end of the scale as you edit it.

There are plenty more helpers in SonicWeave: See [BUILTIN.md](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/BUILTIN.md).

## Next steps

I hope these examples gave you a feeling for this language. Check out [intermediate DSL](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/intermediate-dsl.md) documentation for a deeper understanding of what each line of code does, and to learn about variables and basic programming.
