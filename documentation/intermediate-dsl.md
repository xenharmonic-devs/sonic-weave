# SonicWeave DSL (intermediate)
This document describes the SonicWeave domain-specific language in detail.

Make sure to read [basic DSL](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/dsl.md) documentation to get a feel for the language first.

## Basic operation
SonicWeave is intended for designing musical scales so a fundamental concept is the current scale (accessible through `$`).

### Pushing
The current scale starts empty (`$ = []`) and the basic action is to push intervals onto the scale.

Statements can be separated with semicolons `;` or newlines. After these instructions ...
```c
5/4
3/2
2/1
```
...the scale consists of `$ = [5/4, 3/2, 2/1]`.

### Unrolling
Sub-scales are automatically unrolled onto the current scale.
```c
4\12
[7\12, 12\12]
```
Results in the scale `$ = [4\12, 7\12, 12\12]`.

### Coloring
If an expression evaluates to a color it is applied to all the intervals in the scale that don't have a color yet.
```javascript
5/4
3/2
green
2/1
red
```
Results in a scale equivalent to `$ = [5/4 #008000, 3/2 #008000, 2/1 #FF0000]`.

#### Inline colors
```javascript
5/4
3/2 green
2/1 red
```
Results in `$ = [5/4 green, 2/1 red]`.

It is up to a user interface to interprete colors. The original intent is to color notes in an on-screen keyboard.

### Scale title
If an expression evaluates to a string it is used as the scale title.
```javascript
"My fourth and octave"
4/3
2/1
```
Results in the scale `$ = [4/3, 2/1]`.

The title is included in the `.scl` export.

#### Inline labels
```javascript
4/3 "My perfect fourth"
2/1 'octave'
```
Results in the scale `$ = [4/3 'My perfect fourth', 2/1 'octave']`.

Labels are included in the `.scl` export of the [CLI](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/cli.md).

It is up to a user interface to interprete labels. Scale Workshop displays labels in a tuning table next to the scale data and in an on-screen keyboard.

Scales are intended to repeat from the last interval in the scale (a.k.a. *equave*), so a user interface would use the label of `2/1` for `1/1` or `4/1` too.

### Function calls
Functions have access to the current scale and may modify it. E.g. a call to `sort()` puts everything in ascending order.

```c
3/2
2/1
7/6
sort()
```
Results in the scale `$ = [7/6, 3/2, 2/1]`.

### Implicit mapping
Some functions like `simplify` operate on individual intervals instead of full scales of them. E.g. `simplify(6/4)` evaluates to `3/2`.

Such functions can be mapped over every interval in the current scale replacing the contents.

```c
10/8
12/8
16/8
simplify
```
Results in `$ = [5/4, 3/2, 2]`.

### Vectorized functions
Inspired by [NumPy](https://numpy.org/), most functions that accept intervals map (or vectorize) over arrays of intervals too.

The previous example is equivalent to `$ = simplify([10/8, 12/8, 16/8])`.

### Implicit tempering
In addition to musical intervals SonicWeave features something known as *vals* which are mainly used for converting scales in just intonation to equally tempered scales.

Upon encountering a *val* like `12@` the current scale is converted with no effect on subsequent intervals.

```c
4/3
3/2

12@

15/8
2/1
```
Results in `$ = [5\12, 7\12, 15/8, 2/1]`, so only the first two intervals were converted to 12-tone equal temperament.

To learn more see [tempering.md](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/tempering.md) for details.

### Record unrolling
When a record is encountered its values are sorted by size and the keys are used for labels.

```c
4/3
{
  fif: 3/2,
  octave: 2,
  "my third": 5/4,
}
```
Results in `$ = [4/3, 5/4 "my third", 3/2 "fif", 2 "octave"]`. Notice how 4/3 was left untouched even though 5/4 is smaller in size.

### Boolean conversion
`true` is converted to `1` and `false` to `0` before pushing them onto the current scale.

## Variables
Variables in SonicWeave can hold any type of value. They must be declared before use. Variables declared `const` cannot be re-assigned while `let` variables may change what value they refer to.

```c
const myComma = 81/80
myComma = 250/243 // WRONG! Throws an error.
```

```c
let myComma = 81/80
myComma = 250/243 // Valid: myComma now has the value 250/243
```

Constancy is skin-deep. The elements of a `const` array may be re-assigned at will.

```c
const myCommas = [81/80, 128/125];
myCommas[1] = 250/243 // Valid: myCommas now contains [81/80, 250/243]
```

Un-initialized `let` variables default to `niente`.

### Destructuring
Variables may be declared from an array.

```c
const [x, y] = [1, 2]
y
x
```
Results in `$ = [2, 1]`.

Variables may be re-assigned from an array.
```c
let x, y
[x, y] = [1, 2]
y
x
```
Results in `$ = [2, 1]`.

### Rest parameter

Rest declaration:
```c
const [x, ...r] = [1, 2, 3, 4]
// x has value 1
// r has value [2, 3, 4]
```

Rest assignment:
```c
let x, r
[x, ...r] = [1, 2, 3, 4]
// x has value 1
// r has value [2, 3, 4]
```

## Type system
Values in SonicWeave fall into these categories

| Type     | Example                  | Notes                                                                |
| -------- | ------------------------ | -------------------------------------------------------------------- |
| None     | `niente`                 | _Niente_ is used in music notation and means _nothing_ in Italian.   |
| String   | `'hello'`                | Both single and double quoted strings are supported. Used for note labels.                  |
| Color    | `#ff00ff`                | CSS colors, short hexadecimal, and long hexadecimal colors supported. Used for note colors. |
| Boolean  | `true` or `false`        | Converted to `1` or `0` inside scales.                               |
| Interval | `7/5`                    | There are many kinds of intervals with their own operator semantics. |
| Val      | `12@`                    | Used to convert scales in just intonation to equal temperaments.     |
| Array    | `[5/4, P5, 9\9]`         | Musical scales are represented using arrays of intervals.            |
| Record   | `{fif: 3/2, "p/e": 2}`   | Associative data indexed by strings.                                 |
| Function | `riff plusOne(x) {x+1}`  | _Riff_ is a music term for a short repeated phrase.                  |

## Interval domains

As explained in [basic DSL](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/dsl.md#domains) documentation. We need two distinct domains, *linear* and *logarithmic*, if we wish to capture the informal notion where `1 + 1/8` is `9/8` but also where `500. + 500.` is `1000.`.

Especially scalar multiplication and division can be hard to wrap your head around. An expression like `3 * x` is always equal to `x + x + x` no matter the domain of `x`. Similarly `const y = x / 3` results in an `y` such that `y + y + y` is equal to `x`.

This means that multiplication between linear and logarithmic quantities is the same as raising the underlying value of the logarithmic quantity to the underlying value of the linear quantity. Under the hood `P4 * 3` is actually doing `FJS( (4/3) ^ 3 )`.

Similarly a logarithmic quantity divided by a linear quantity is equivalent to taking an nth root. `P5 / 2` is doing `FJS( (3/2) ^ (1/2) )` or taking advantage of the exotic *recipropower* operator and operator precedence of fractions in SonicWeave `FJS( 3/2 /^ 2)`

Division of logarithmic quantities is a true mind-bender: `m7` is `2 * P4` so correspondingly `m7 / P4` evaluates to `2`, a linear scalar! The underlying operation is that of *logdivision* or log-in-the-base-of in conventional mathematical notation. You may verify for yourself that the logarithm of 16/9 in the base of 4/3 is indeed 2, written as `16/9 /_ 4/3` in SonicWeave. Looking at cents may offer a more natural perspective. It's hopefully less surprising that `1000. / 500.` is `2`.

## Interval echelons

There are two *echelons* in SonicWeave: *absolute* and *relative*. Relative intervals are also called scalars and absolute intervals non-scalars.

Frequencies are the most common non-scalars. They're required for declaring the reference frequency and we can use them as is:
```c
1 = 256 Hz
320 Hz
384 Hz
512 Hz
```

Re-declaring the reference is not recommended as it involves an implicit relative-to-absolute conversion.

```c
1 = 256 Hz
// Every scalar is henceforth interpreted as multiples of 256 hertz.
5/4 // 320 Hz
3/2 // 384 Hz
2   // 512 Hz

// Upon unison frequency re-declaration the existing content is converted to frequencies.
1 = 440 Hz
// From now on scalars are multiples of 440 hertz instead.
16/11 // 640 Hz
9/5   // 792 Hz
2     // 880 Hz
```

Durations like seconds or milliseconds are also supported. They're interpreted as periods of oscillation i.e. inverse frequencies.

```c
"Upwards sounding minor chord /6:5:4:3"
1 = 6 ms
5 ms
4 ms
3 ms
```

Beware that the unison reference is always a frequency even if declared as a duration.
```c
1 = 1 ms // 1 = 1000 Hz
3/2      // 1500 Hz
2        // 2000 Hz
```

### Operations on absolute intervals

Addition of frequencies and scalar multiplication works as you'd expect:
```c
1 = 100 Hz
100 Hz + 50 Hz // 150 Hz
2 * 100 Hz     // 200 Hz
```

Division of frequencies produces scalars:
```c
1 = 100 Hz
4000 Hz / 2000 Hz // Same as plain 2
```

The produced scalars are in turn interpreted against the reference. In the end `4000 Hz / 2000 Hz` results in 200 Hz above.

Squaring a frequency does seemingly nothing:
```c
1 = 200 Hz
(300 Hz)^2 // Sounds just like 300 Hz
400 Hz
```

This is because absolute intervals are by their nature *projective* i.e. they're normalized to frequencies by tools like Scale Workshop.

This causes an absolute pitch reference to behave in two distinct ways:

```c
"Relative reference for absolute FJS"
C4 = 1 = 200 Hz
E4^5 + Eb4_5 // Same as 5/4 * 6/5 i.e. 3/2
C5           // Same as 2/1
```

...or with an absolute reference:

```c
"Absolute reference for absolute FJS"
C4 = 200 Hz = 1
E4^5 + Eb4_5 // Same as 250 Hz * 240 Hz
C5           // Same as 400 Hz
```
That 250 Hz * 240 Hz is normalized to `sqrt(60000) Hz` i.e. a neutral third above 200 Hz. Addition means averaging with projective quantities. Scalar multiplication merely biases the weights.

```c
"Absolute reference for absolute FJS"
C4 = 200 Hz = 1
2 * E4^5 + Eb4_5 // Same as (250 Hz)^2 * 240 Hz
C5               // Same as 400 Hz
```

The normalized frequency is now `cbrt(15000000) Hz` ≈ 246.62 Hz i.e. something between neutral and major thirds above 200 Hz.

## Interval types

| Type         | Examples                | Domain        | Echelon   | Notes |
| ------------ | ----------------------- | ------------- | --------- | ----- |
| Integer      | `2`, `5`                | Linear        | Relative  | Same as `2/1` or `5/1`. |
| Decimal      | `1,2`, `1.4e0`          | Linear        | Relative  | Decimal commas only work in isolation. |
| Fraction     | `4/3`, `10/7`           | Linear        | Relative  | The fraction slash binds stronger than exponentiation |
| N-of-EDO     | `1\5`, `7\12`           | Logarithmic   | Relative  | `n\m` means `n` steps of `m` equal divisions of the octave `2/1`. |
| N-of-EDJI    | `9\13<3>`, `2\5<3/2>`   | Logarithmic   | Relative  | `n\m<p/q>` means `n` steps of `m` equal divisions of the ratio `p/q`. |
| Step         | `7°`, `13 edosteps`     | Logarithmic   | Relative  | Correspond to edo-steps after tempering is applied. |
| Cents        | `701.955`, `100c`       | Logarithmic   | Relative  | One centisemitone `1.0` is equal to `1\1200`. |
| Monzo        | `[-4 4 -1>`, `[1,-1/2>` | Logarithmic   | Relative  | Also known as prime count vectors. Each component is an exponent of a prime number factor. |
| FJS          | `P5`, `M3^5`            | Logarithmic   | Relative  | [Functional Just System](https://en.xen.wiki/w/Functional_Just_System) |
| Frequency    | `440 Hz`, `2.2 kHz`     | Linear        | Absolute  | Absolute frequency of oscillation. |
| Duration     | `1 ms`                  | Linear        | Absolute  | Absolute period of oscillation. |
| Absolute FJS | `C4`, `Eb_5`            | Logarithmic   | Absolute* | Absolute version of [FJS](https://en.xen.wiki/w/Functional_Just_System). |
| S-expression | `S8`, `S5..8`           | Logarithmic   | Relative  | Additive spelling of [square superparticulars](https://en.xen.wiki/w/Square_superparticular). |
| Val          | `<12, 19, 28]`          | Cologarithmic | Relative  | Used to temper scales. |
| Warts        | `17c@`, `29@2.3.13/5`   | Cologarithmic | Relative  | [Shorthand](https://en.xen.wiki/w/Val#Shorthand_notation) for vals. |
| SOV          | `17[^5]@`               | Cologarithmic | Relative  | [Shorthand](https://en.xen.wiki/w/Val#Sparse_Offset_Val_notationn) for vals. |

*) The echelon of absolute FJS depends on whether or not the reference pitch declaration was relative or absolute.

### Numeric separators
It is possible to separate numbers into groups using underscores for readability e.g. `1_000_000` is one million as an integer and `123_201/123_200` is the [chalmerisia](https://en.xen.wiki/w/Chalmersia) as a fraction.

## Operators

Operations can be applied to intervals to create new intervals.

### Unary operators

| Name          | Linear  | Result      | Logarithmic | Result        |
| ------------- | ------- | ----------- | ----------- | ------------- |
| Identity      | `+2`    | `2`         | `+P8`       | `P8`          |
| Negation      | `-2`    | `-2`        | _N/A_       |               |
| Inversion     | `%2`    | `1/2`       | `-P8`       | `P-8`         |
| Inversion     | `÷3/2`  | `2/3`       | `-P5`       | `P-5`         |
| Geom. inverse | _N/A_   |             | `%P8`       | `<1 0 0 ...]` |
| Logical NOT   | `not 2` | `false`     | `not P8`    | `false`       |
| Up            | `^2`    | *           | `^P8`       | `P8 + 1°`     |
| Down          | `v{2}`  | *           | `vP8`       | `P8 - 1°`     |
| Lift          | `/2`    | *           | `/P8`       | `P8 + 5°`     |
| Drop          | `\2`    | *           | `\P8`       | `P8 - 5°`     |
| Increment     | `++i`   | `3`         | _N/A_       |               |
| Decrement     | `--i`   | `1`         | _N/A_       |               |

*) If you enter `^2` it will renders as `linear([1 1>@1°.2)` (a linearized universal monzo). The operators inspired by [ups-and-downs notation](https://en.xen.wiki/w/Ups_and_downs_notation) are intended to be used with absolute pitches and relative (extended Pythagorean) intervals. These operators have no effect on the value of the operand and are only activated during [tempering](#implicit-tempering).

The down operator sometimes requires curly brackets due to `v` colliding with the Latin alphabet. Unicode `∨` is available but not recommended because it makes the source code harder to interprete for humans.

Drop `\` can be spelled `drop` to avoid using the backslash inside template literals. Lift `/` may be spelled `lift` for minor grammatical reasons.

#### Unary broadcasting

TODO: `vnot`