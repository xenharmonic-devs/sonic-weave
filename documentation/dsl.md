# SonicWeave DSL
This document describes the SonicWeave domain-specific language for manipulating musical frequencies, ratios and equal temperaments.

## Basic example

SonicWeave is a relative of [Scala .scl](https://www.huygens-fokker.org/scala/scl_format.html) and a successor to Scale Workshop 2 syntax. It is intended for constructing microtonal scales that repeat at the octave (or some other period).

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

Notice again how the root and its label comes last in the list.

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

Decimal ratios are less commonly used in music, but can be as useful as cents for comparing the sizes of intervals. E.g. the frequency ratio of `11/9` is around `1.2222e` while `27/22` is a smidge wider around `1.227272e`. The final `e` differentiates `1.2e` (just minor third) from `1.2` (an unnoticeably small interval, basically a chorus tone near 1/1). The `e` may be followed with a ten's exponent. E.g. `14e-1` is unnecessarily obfuscated notation for `7/5`.

### Equal temperaments

In addition to just intonation and cents SonicWeave has notation for equal divisions of the octave like 12-tone equal temperament commonly used around the world.

The notation `n \ m` denotes n steps of m equal logarithmic divisions of the octave.

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

Let's see what happens when we add two whole tones together in just intonation `9/8 + 9/8` is `(9 + 9)/8` is `18/8` is `9/4`, an interval larger than the octave `8/4`! How unexpected! On the other hand it would be weirder if addition of fractions didn't follow the usual rules of mathematics.

The difference of what the operator `+` means is indicated by the *domain* of the interval. Steps of equal temperaments and cents are *logarithmic* quantities so their underlying frequency ratios multiply together: `200. + 200.` actually means around `1.122e * 1.122e` ≈ `1.26e` under the hood.

On the other hand fractions like `9/8` are in the *linear* domain. The musically correct way of combining them is multiplication so `9/8 * 9/8` equal to `81/64` is the (Pythagorean) major third we expect from stacking two whole tones.

Relative FJS intervals can be especially confusing because they represent fractions but add like cents do. Our whole tone stack becomes `M2 + M2` equal to `M3`. This is notationally expected even if obscured by the ordinal nature of traditional Western music notation. Remember that the perfect unison `P1` represents no change and `P1 + P1` is equal to `P1` i.e. 1st + 1st = 1st. Therefore 2nd + 2nd must be (2+2-1)rd = 3rd.

For the most part you cannot combine intervals across domains so `9/8 + M2` is not a valid operation. Use tildes (`~`) to always operate as if in the linear domain. E.g. `9/8 ~* M2` is a valid expression and evaluates to `81/64` while `9/8 *~ M2` evaluates to `M3`. The direction of the "wing" determines which domain and formatting to prefer.

Conversely the minus operator `-` represent divisions of the underlying values in the logarithmic domain and the usual kind of subraction in the linear domain e.g. `1.2e - 0.1e` equals `1.1e` owing to decimal ratios inhabiting the linear domain.

### Breaking change compared to Scale Workshop 2

Scale Workshop 2 didn't have domains, everything was logarithmic, so `81/64 - 81/80` was valid notation for `5/4`. In SonicWeave this expression must be spelled `(81/64) / (81/80)` or `81/64 ÷ 81/80` using the handy division operator that binds more loosely than the fractional slash (`/`).

Another breaking change is that *comma decimals* are no longer allowed in complex expressions `1,2 + 1,2` equal to `1,44` in Scale Workshop 2 must be spelled `1.2e * 1.2e` in SonicWeave. Users are strongly advised **not** to use comma decimals anymore even if a single `1,2` is still legal syntax for backwards compatibility. The decimal comma is deprecated and will be removed in SonicWeave 2.0.

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

Anything after two slashes (`//`) is ignored until the end of the line. Everything after a slash and an asterisk (`/*`) is ignored until a corresponding pair (`*/`) is encountered.

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

By default[^1] adding a sharp sign (`#` or `♯`) to an absolute pitch multiplies the underlying frequency by `2187/2048` ≈ `1.06787e` or equivalently shifts the pitch up by about `113.685 ¢`. (Yes that fancy unicode cent is legal syntax in SonicWeave; A plain `c` also works, but only when attached to a numeric value.)

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

Looking at the frequencies or the width of the interval against the root note we can see that D flat is lower in pitch than C sharp. They differ by a [Pythagorean comma](https://en.xen.wiki/w/Pythagorean_comma) of around `23.460 c`. The art and science of musical tuning often deals with small intervals like this. One approach is to make it go away i.e. temper it out which leads to the 12-tone equal temperament a.k.a. 12ed2.

```c
C4 = 262 Hz

/*
Pitch // Frequency |    Cents | Ratio
*/
Db4   // 277.579Hz |  100.000 | 1.059
C#4   // 277.579Hz |  100.000 | 1.059
D4    // 294.085Hz |  200.000 | 1.122
G4    // 392.556Hz |  700.000 | 1.498
C5    // 524.000Hz | 1200.000 | 2.000

12@   // Merge sharps together with the flat of the note above.
```

Another thing we might notice is that the fifth at `700.0` is only about two cents flat of the frequency ratio `1.5e` of the justly intoned fifth. The major third at `200.0` on the other hand is almost four cents flat of `1.125e`. Small tuning error like these tend to compound the further you go along the chain of fifths.

Let's do one final comparison in 19-tone equal temperament:
```c
C4 = 262 Hz

/*
Pitch // Frequency |    Cents | Ratio
*/
C#4   // 271.735Hz |   63.158 | 1.037
Db4   // 281.831Hz |  126.316 | 1.076
D4    // 292.302Hz |  189.474 | 1.116
G4    // 391.365Hz |  694.737 | 1.494
C5    // 524.000Hz | 1200.000 | 2.000

19@   // Temper to 19ed2
```

I've switched around C# and Db because now the effect of the sharp is much more mellow. It's only worth `1\19` or around `63.158 c` here. Systems where the fifth is flatter than in 12ed2 are often nicer to notate and perform because the sharps and flats are close to the corresponding natural pitches and don't cross over like they do in Pythagorean tuning or even sharper systems.

[^1]: *By default* is too soft an expression here. That's what the sharp sign does, *period*. Tempering applies to values as they are specified and only makes it seem that `#` narrows from `113.685 c` down to `100.0 c` when a scale is tempered to 12-tone equal using `12@` at the bottom.

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
