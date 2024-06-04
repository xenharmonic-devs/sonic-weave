# SonicWeave DSL (intermediate)
This document describes the SonicWeave domain-specific language in detail.

Make sure to read [basic DSL](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/dsl.md) documentation to get a feel for the language first.

## Basic operation
SonicWeave is intended for designing musical scales so a fundamental concept is the current scale (accessible through `$`). It is an ordered array of intervals.

### Pushing
The current scale starts empty (`$ = []`) and the basic action is to push intervals onto the scale.

Statements can be separated with semicolons `;` or newlines. After these instructions ...
```ocaml
5/4
3/2
2/1
```
...the scale consists of `$ = [5/4, 3/2, 2/1]`. Pushing respects order; see the [Function calls section](#function-calls) for an example of how to sort by pitch.

### Unrolling
Sub-scales are automatically unrolled onto the current scale.
```ocaml
4\12
[7\12, 12\12]
```
Results in the scale `$ = [4\12, 7\12, 12\12]`. (Unrolling of a sub-scale essentially concatenates the interval list to that of the current scale (`$`). Compare with [record unrolling](#record-unrolling).)

### Coloring
If an expression evaluates to a color it is applied to all the intervals in the scale that don't have a color yet.
```ocaml
5/4
3/2
green
2/1
red
```
Results in a scale equivalent to `$ = [5/4 #008000, 3/2 #008000, 2/1 #FF0000]`.

#### Inline colors
```ocaml
5/4
3/2 green
2/1 red
```
Results in `$ = [5/4 green, 2/1 red]`.

It is up to a user interface to interprete colors. The original intent is to color notes in an on-screen keyboard.

### Scale title
If an expression evaluates to a string it is used as the scale title.
```ocaml
"My fourth and octave"
4/3
2/1
```
Results in the scale `$ = [4/3, 2/1]`.

The title is included in the `.scl` export.

#### Inline labels
```ocaml
4/3 "My perfect fourth"
2/1 'octave'
```
Results in the scale `$ = [4/3 'My perfect fourth', 2/1 'octave']`.

Labels are included in the `.scl` export of the [CLI](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/cli.md).

It is up to a user interface to interprete labels. Scale Workshop displays labels in a tuning table next to the scale data and in an on-screen keyboard.

Scales are intended to repeat from the last interval in the scale (a.k.a. *equave*), so a user interface would use the label of `2/1` for `1/1`, `1/2` or `4/1` too.

### Function calls
Functions have access to the current scale and may modify it. E.g. a call to `sort()` puts everything in ascending order.

```ocaml
3/2
2/1
7/6
sort()
```
Results in the scale `$ = [7/6, 3/2, 2/1]`.

### Implicit mapping
Some functions like `simplify` operate on individual intervals instead of full scales of them. E.g. `simplify(6/4)` evaluates to `3/2`.

Such functions can be mapped over every interval in the current scale replacing the contents.

```ocaml
10/8
12/8
16/8
simplify
```
Results in `$ = [5/4, 3/2, 2]`.

### Vectorized functions
Inspired by [NumPy](https://numpy.org/), most functions that accept intervals map (or vectorize) over arrays of intervals too.

The previous example is equivalent to `$ = simplify([10/8, 12/8, 16/8])`.

### Popped scale
Using the current scale `$` as a variable often leads to duplicated data. There's a magic variable `£` (or the ASCII variant `pop$`) that obtains a copy of the current scale and clears the existing scale when used. Very handy with [vector broadcasting](#vector-broadcasting).

```ocaml
10/9
4/3
16/9
£ * 9/8
```
Results in `$ = [5/4, 3/2, 2]`.

### Implicit tempering
In addition to musical intervals SonicWeave features something known as *vals* which are mainly used for converting scales in just intonation to equally tempered scales.

Upon encountering a *val* like `12@` the current scale is converted with no effect on subsequent intervals.

```ocaml
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

```ocaml
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

```ocaml
const myComma = 81/80
myComma = 250/243 (** WRONG! Throws an error. **)
```

```ocaml
let myComma = 81/80
myComma = 250/243 (* Valid: myComma now has the value 250/243 *)
```

**Constancy is shallow** (skin-deep): the elements of a `const` array may be re-assigned at will.

```ocaml
const myCommas = [81/80, 128/125];
myCommas[1] = 250/243 (* Valid: myCommas now contains [81/80, 250/243] *)
```

Un-initialized `let` variables default to `niente`.

### Destructuring
Variables may be declared from an array.

```ocaml
const [x, y] = [1, 2]
y
x
```
Results in `$ = [2, 1]`.

Variables may be re-assigned from an array.
```ocaml
let x, y
[x, y] = [1, 2]
y
x
```
Results in `$ = [2, 1]`.

### Rest parameter

Rest declaration:
```ocaml
const [x, ...r] = [1, 2, 3, 4]
(**
 * x has value 1
 * r has value [2, 3, 4]
 *)
```

Rest assignment:
```ocaml
let x, r
[x, ...r] = [1, 2, 3, 4]
(**
 * x has value 1
 * r has value [2, 3, 4]
 *)
```

### Reassignment operator
Variables can be reassigned after declaration e.g. with `let i = 2` the statement `i += 3` sets `i` to `5`.

## Statements / line endings
Statements in SonicWeave end in a semicolon. Newlines use automatic semicolon insertion where applicable.

```ocaml
6/5
3/2
2
```

Is actually interpreted as `6/5;3/2;2;`.

## Type system
Values in SonicWeave fall into these categories

| Type     | Example                  | Notes                                                                |
| -------- | ------------------------ | -------------------------------------------------------------------- |
| None     | `niente`                 | _Niente_ is used in music notation and means _nothing_ in Italian.   |
| String   | `'hello'`                | Both single and double quoted strings are supported. Used for note labels.                  |
| Color    | `#ff00ff`                | CSS colors, short hexadecimal, and long hexadecimal colors supported. Used for note colors. |
| Boolean  | `true` or `false`        | Converted to `1` or `0` inside scales. Used in boolean indexing.     |
| Interval | `7/5`                    | There are many kinds of intervals with their own operator semantics. |
| Val      | `12@`                    | Used to convert scales in just intonation to equal temperaments.     |
| Array    | `[5/4, P5, 9\9]`         | Musical scales are represented using arrays of intervals.            |
| Record   | `{fif: 3/2, "p/e": 2}`   | Associative data indexed by strings.                                 |
| Function | `riff f(x){ x+1 }`       | _Riff_ is a music term for a short repeated phrase.                  |

## Interval domains

As explained in [basic DSL](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/dsl.md#domains) documentation. We need two distinct domains, *linear* and *logarithmic*, if we wish to capture the informal notion where `1 + 1/8` is `9/8` but also where `500. + 500.` is `1000.`.

Especially scalar multiplication and division can be hard to wrap your head around. An expression like `3 * x` is always equal to `x + x + x` no matter the domain of `x`. Similarly `const y = x / 3` results in an `y` such that `y + y + y` is equal to `x`.

This means that multiplication between linear and logarithmic quantities is the same as raising the underlying value of the logarithmic quantity to the underlying value of the linear quantity. Under the hood `P4 * 3` is actually doing `FJS( (4/3) ^ 3 )`.

Similarly a logarithmic quantity divided by a linear quantity is equivalent to taking an nth root. `P5 / 2` is doing `FJS( (3/2) ^ (1/2) )` or equivalently `FJS( 3/2 /^ 2)` or `FJS( 3/2 ^/ 2 )`. (The latter two examples take advantage of (two spellings of) the exotic *recipropower* operator.)

Division of logarithmic quantities is a true mind-bender: `m7` is `2 * P4` so correspondingly `m7 / P4` evaluates to `2`, a linear scalar! The underlying operation is that of *logdivision* or log-in-the-base-of in conventional mathematical notation. You may verify for yourself that the logarithm of 16/9 in the base of 4/3 is indeed 2, written as `16/9 /_ 4/3` in SonicWeave. Looking at cents may offer a more natural perspective. It's hopefully less surprising that `1000. / 500.` is `2`.

## Interval echelons

There are two *echelons* in SonicWeave: *absolute* and *relative*. Relative intervals are also called scalars and absolute intervals non-scalars.

Frequencies are the most common non-scalars. They're required for declaring the reference frequency and we can use them as is:
```ocaml
1 = 256 Hz
320 Hz
384 Hz
512 Hz
```

Re-declaring the reference is not recommended as it involves an implicit relative-to-absolute conversion.

```ocaml
1 = 256 Hz
(* Every scalar is henceforth interpreted as multiples of 256 hertz. *)
5/4 (* 320 Hz *)
3/2 (* 384 Hz *)
2   (* 512 Hz *)

(* Upon unison frequency re-declaration the existing content is converted to frequencies. *)
1 = 440 Hz
(* From now on scalars are multiples of 440 hertz instead. *)
16/11 (* 640 Hz *)
9/5   (* 792 Hz *)
2     (* 880 Hz *)
```

Durations like seconds or milliseconds are also supported. They're interpreted as periods of oscillation i.e. inverse frequencies.

```ocaml
"Upwards sounding minor chord /6:5:4:3"
1 = 6 ms
5 ms
4 ms
3 ms
```

Beware that the unison reference is always a frequency even if declared as a duration.
```ocaml
1 = 1 ms (* 1 = 1000 Hz *)
3/2      (* 1500 Hz *)
2        (* 2000 Hz *)
```

### Operations on absolute intervals

Addition of frequencies and scalar multiplication works as you'd expect:
```ocaml
1 = 100 Hz
100 Hz + 50 Hz (* 150 Hz *)
2 * 100 Hz     (* 200 Hz *)
```

Division of frequencies produces scalars:
```ocaml
1 = 100 Hz
4000 Hz / 2000 Hz (* Same as plain 2 *)
```

The produced scalars are in turn interpreted against the reference. In the end `4000 Hz / 2000 Hz` results in 200 Hz above.

Squaring a frequency does seemingly nothing:
```ocaml
1 = 200 Hz
(300 Hz)^2 (* Sounds just like 300 Hz *)
400 Hz
```

This is because absolute intervals are by their nature *projective* i.e. they're normalized to frequencies by tools like Scale Workshop.

This causes an absolute pitch reference to behave in two distinct ways:

```ocaml
"Relative reference for absolute FJS"
C4 = 1 = 200 Hz
E4^5 + Eb4_5 (* Same as 5/4 * 6/5 i.e. 3/2 *)
C5           (* Same as 2/1 *)
```

...or with an absolute reference:

```ocaml
"Absolute reference for absolute FJS"
C4 = 200 Hz = 1
E4^5 + Eb4_5 (* Same as 250 Hz * 240 Hz *)
C5           (* Same as 400 Hz *)
```
That 250 Hz * 240 Hz is normalized to `sqrt(60000) Hz` i.e. a neutral third above 200 Hz. Addition means averaging with projective quantities. Scalar multiplication merely biases the weights.

```ocaml
"Absolute reference for absolute FJS"
C4 = 200 Hz = 1
2 * E4^5 + Eb4_5 (* Same as (250 Hz)^2 * 240 Hz *)
C5               (* Same as 400 Hz *)
```

The normalized frequency is now `cbrt(15000000) Hz` ≈ 246.62 Hz i.e. something between a neutral and a major third above 200 Hz.

## Interval types

| Type         | Examples                | Domain        | Echelon   | Notes |
| ------------ | ----------------------- | ------------- | --------- | ----- |
| Integer      | `2`, `5`                | Linear        | Relative  | Same as `2/1` or `5/1`. |
| Decimal      | `1.2e`, `1.4e0`         | Linear        | Relative  | Decimal commas (`1,2`) only work on isolated lines. |
| Fraction     | `4/3`, `10/7`           | Linear        | Relative  | The fraction slash binds stronger than exponentiation |
| N-of-EDO     | `1\5`, `7\12`           | Logarithmic   | Relative  | `n\m` means `n` steps of `m` equal divisions of the octave `2/1`. |
| N-of-EDJI    | `9\13<3>`, `2\5<3/2>`   | Logarithmic   | Relative  | `n\m<p/q>` means `n` steps of `m` equal divisions of the ratio `p/q`. |
| Step         | `7°`, `13 edosteps`     | Logarithmic   | Relative  | Correspond to edo-steps when tempering is applied. |
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

*) The echelon of absolute FJS depends on whether or not the reference pitch declaration is relative or absolute.

### Numeric separators
It is possible to separate numbers into groups using underscores for readability e.g. `1_000_000` is one million as an integer and `123_201/123_200` is the [chalmerisia](https://en.xen.wiki/w/Chalmersia) as a fraction.

### Formatting
In addition to the value, domain and echelon there's also formatting information attached to intervals. A decimal like `12e-1` is not automatically simplified to `6/5` and neither is `6/4` fractionally reduced to `3/2` (remember that plain `reduce()` refers to octave-reduction in SonicWeave).

Formatting tries to be smart to make relationships between intervals easier to see. A harmonic segment like `6::12` formats as
```ocaml
7/6
8/6
9/6
10/6
11/6
12/6
```
instead of
```ocaml
7/6
4/3
3/2
5/3
11/6
2
```
to make it clear that the fractions all came from a shared segment.

Same goes for equal temperaments `tet(6)` formats as
```ocaml
1\6
2\6
3\6
4\6
5\6
6\6
```
instead of
```ocaml
1\6
1\3
1\2
2\3
5\6
1\1
```
but as far as the values, domains and echelons go, the above scales are equivalent.

## Operators

Operations can be applied to intervals to create new intervals.

### Unary operators

| Name           | Linear     | Result      | Logarithmic | Result        |
| -------------- | ---------- | ----------- | ----------- | ------------- |
| Identity       | `+2`       | `2`         | `+P8`       | `P8`          |
| Negation       | `-2`       | `-2`        | _N/A_       |               |
| Inversion      | `%2`       | `1/2`       | `-P8`       | `P-8`         |
| Inversion      | `÷3/2`     | `2/3`       | `-P5`       | `P-5`         |
| Geom. inverse  | _N/A_      |             | `%P8`       | `<1 0 0 ...]` |
| Square root    | `√4`       | `2`         | `√P15`      | `P8`          |
| Logical NOT    | `not 2`    | `false`     | `not P8`    | `false`       |
| Up             | `^2`       | *           | `^P8`       | `P8 + 1°`     |
| Down           | `v{2}`     | *           | `vP8`       | `P8 - 1°`     |
| Lift           | `/2`       | *           | `/P8`       | `P8 + 5°`     |
| Drop           | `\2`       | *           | `\P8`       | `P8 - 5°`     |
| Increment      | `++i`      | `3`         | _N/A_       |               |
| Decrement      | `--i`      | `1`         | _N/A_       |               |
| Absolute value | `abs -2`   | `2`         | `abs(-P8)`  | `P8`          |
| Geometric abs  | `labs 1/2` | `2`         | _N/A_       |               |

Square root uses the same operator in both domains because the square of a logarithmic quantity is undefined so there's no ambiguity.

*) If you enter `^2` it will renders as `linear([1 1>@1°.2)` (a linearized universal monzo). The operators inspired by [ups-and-downs notation](https://en.xen.wiki/w/Ups_and_downs_notation) are intended to be used with absolute pitches and relative (extended Pythagorean) intervals. These operators have no effect on the value of the operand and are only activated during [tempering](#implicit-tempering).

The down operator sometimes requires curly brackets due to `v` colliding with the Latin alphabet. Unicode `∨` is available but not recommended because it makes the source code harder to interprete for humans.

Drop `\` can be spelled `drop` to avoid using the backslash inside template literals. Lift `/` may be spelled `lift` for minor grammatical reasons.

Geometric (i.e. logarithmic) absolute value takes the normal absolute value and further inverts the result if it's below 1/1.

#### Vectorized unary operators

All of the unary operators are vectorized over arrays so `-[1, 2, 3]` results in `[-1, -2, -3]`.

The only exception to this rule is `not` as it checks for emptiness of arrays. `not []` evaluates to `true` while `not [0, 1, 2]` evaluates to `false`.

The vectorized boolean NOT is called `vnot` so `vnot [0, 1, 2]` evaluates to `[true, false, false]`.

Vectorized increment/decrement creates a new copy of the affected array.

```ocaml
let i = [1, 2];
const j = i;
++i; (* Changes i to [2, 3] and pushes 2 and 3 onto the scale *)
j    (* Still [1, 2] *)
```

### Binary operators
There are many operators that take two operands.

#### Fallback
The expression `foo() lest bar()` executes `foo()` and returns the result if it succeeds. If `foo()` throws an error `bar()` is tried instead.

In `foo() lest bar() lest baz()` execution proceeds from left to right until an operand evaluates successfully. If all fail, the exception from `baz()` is thrown.

It's the inline version of `try..catch`.
```ocaml
fraction(P5) lest P5 (* Successfully evaluates to 3/2 *)
fraction(PI) lest PI (* Falls back to 3.141592653589793r *)
```

#### Coalescing
| Name               | Example       | Result |
| ------------------ | ------------- | ------ |
| Logical AND        | `2 and 0`     | `0`    |
| Logical OR         | `0 or 2`      | `2`    |
| Niente coalescing  | `niente al 2` | `2`    |

Logical operators check for *truthiness*. The falsy values are `false`, `niente`, `0`, `""` and `[]` while everything else is truthy. Note that this means that `0.0` representing zero cents or `1/1` as a linear frequency ratio is truthy.

Coalescing operators short-circuit. Execution stops once the value of the expression is known.

```ocaml
1 and print('This executes')
0 and print("This won't execute")

false or print('This executes too')
true  or print("This won't execute")

niente al print('This executes as well')
0      al print("This won't execute")
```

The `al` operator is the same as `??` in JavaScript. It's main use is to provide default values for uninitialized variables. The musical inspiration is to read `foo al bar` as *"foo in the style of bar"*.

#### Array
| Name             | Operator  |
| ---------------- | --------- |
| Strict inclusion | `of`      |
| Strict exclusion | `not of`  |
| Inclusion        | `~of`     |
| Exclusion        | `not ~of` |
| Key inclusion    | `in`      |
| Key exclusion    | `not in`  |
| Index inclusion  | `~in`     |
| Index exclusion  | `not ~in` |
| Outer product    | `tns`     |
| Outer product    | `⊗`       |

Inclusion is similar to Python's `in` operator e.g. `2 of [1, 2, 3]` evaluates to `true`.

Key inclusion is similar to JavaScript's `in` operator e.g. `"foo" in {foo: 1, bar: 2}` evaluates to `true`.

Index inclusion allows for negative indices `-1 in [0]` evaluates to `false` while `-1 ~in [0]` evaluates to `true`.

Outer product a.k.a. tensoring expands all possible products in two arrays into an array of arrays e.g. `[2, 3, 5] tns [7, 11]` evaluates to
```ocaml
[
  [14, 22],
  [21, 33],
  [35, 55]
]
```

Beware that the product is domain-aware! Most of the time you want all possible stacks of intervals regardless of the domain. Use `~tns` to achieve this e.g. `[9/8, m2, M3] ~tns [P5, 8/7]` evaluates to
```ocaml
[
  [27/16, 9/7],
  [m6, m3_7],
  [M7, a4_7]
]
```

#### Matrix
| Name                  | Operator |
| --------------------- | -------- |
| Vector dot product    | `vdot`   |
| Matrix multiplication | `mdot`   |

Vector dot product reduces two arrays into a single interval. The domain ignoring `u ~vdot v` always evaluates to a linear scalar.

Matrix multiplication performs `vdot` between rows and columns of two arrays of arrays according to the usual mathematical definition.

#### Vectorized logical
| Name                   | Operator |
| ---------------------- | -------- |
| Vectorized logical AND | `vand`   |
| Vectorized logical OR  | `vor`    |

Binary operation is vectorized elementwise:

`[0, 1] vand [2, 3]` evaluates to `[0, 3]`.

`[0, 1] vor [2, 3]` evaluates to `[2, 1]`.

Vectorized versions of logical operators work on plain values too and do not short-circuit. `P8 white vor pop()` is a handy expression to swap out the last interval for a white-colored octave because the `pop()` command executes without further effects.

#### Boolean
| Name                   | Operator |
| ---------------------- | -------- |
| Strict equality        | `==`     |
| Strict inequality      | `<>`     |
| Size equality          | `~=`     |
| Greater than           | `>`      |
| Greater than or equal  | `>=`     |
| Less than              | `<`      |
| Less than or equal     | `<=`     |

All boolean operators vectorize over arrays. `[1, 2] == [1, 3]` evaluates to `[true, false]`.

Absolute quantities are converted to relative before comparison so `440 Hz > 1` evaluates to `true` if `1 = 432Hz` was declared as the unison frequency. This conversion has no impact on the relative ordering between absolute quantities `1 ms > 440 Hz` always evaluates to `true` because `1 ms` represents `1000 Hz` as a frequency.

#### Arithmetic
| Name                   | Linear         | Result   | Logarithmic      | Result     |
| ---------------------- | -------------- | -------- | ---------------- | ---------- |
| Addition               | `3 + 5`        | `8`      | _N/A_            |            |
| Subtraction            | `5 - 3`        | `2`      | _N/A_            |            |
| Multiplication         | `2 * 3`        | `6`      | `P8 + P12`       | `P19`      |
| Multiplication         | `110 Hz × 5`   | `550 Hz` | `A♮2 + M17^5`    | `C♯5^5`    |
| Division               | `6 % 2`        | `3`      | `P19 - P8`       | `P12`      |
| Division               | `220 hz ÷ 2`   | `110 Hz` | `A_3 - P8`       | `A_2`      |
| Fractions              | `(1+2)/2`      | `3/2`    | `P12 - P8`       | `P5`       |
| Exponentiation         | `3 ^ 2`        | `9`      | `P12 * 2`        | `M23`      |

Arithmetic operators follow *PEMDAS* order of operations (parenthesis, exponentiation, multiplication/division, addition/subtraction), but only if you use `%` or `÷` as the division operator. Fractions are so common in music that they deserve the highest precedence. The neutral third `sqrt(3/2)` may simply be spelled `3/2 ^ 1/2`. Think of fractions as being vertically stacked to get the right idea.

#### Rounding
| Name                   | Linear         | Result   | Logarithmic      | Result     |
| ---------------------- | -------------- | -------- | ---------------- | ---------- |
| Round (to multiple of) | `5 to 3`       | `6`      | _N/A_            |            |
| Round (to power of)    | `5 by 2`       | `4`      | `M17^5 to P8`    | `P15`      |

The linear rounding operator (`to`) measures closeness linearly `distance(x, y)` = `abs(linear(x) - linear(y))`.

The logarithmic rounding operator (`by`) measures closeness geometrically `distance(x, y)` = `abs(log(abs(logarithmic(x) - logarithmic(y))))` or more intuitively just considering the size in cents of the expression `abs(cents(x) - cents(y))`.

#### Modulo
| Name                   | Linear         | Result   | Logarithmic      | Result     |
| ---------------------- | -------------- | -------- | ---------------- | ---------- |
| Modulo                 | `5 mod 3`      | `2`      | _N/A_            |            |
| Ceiling modulo         | `0 modc 3`     | `3`      | _N/A_            |            |
| Reduction              | `5 rd 2`       | `5/4`    | `M17^5 mod P8`   | `M3^5`     |
| Ceiling reduction      | `2 rdc 2`      | `2`      | `P8 modc P8`     | `P8`       |

The non-ceiling a.k.a floor variants of modulo behave as they commonly do in mathematics where `x mod x` evaluates to `0` while the ceiling variants are more useful in a musical context.

Just as the clockface starts from 12 `12 modc 12` evaluates to `12`. The fact that `P1 modc P8` evaluates to `P8` and that the unison is implicit in SonicWeave environments like Scale Workshop means that the major pentatonic scale becomes a simple oneliner `sort([-1..3] * P5 modc P8)` evaluating to:
```ocaml
M2
P4
P5
M6
P8
```

The broadcasting of `[-1..3] * P5` into `[-P5, 0 * P5, P5, 2 * P5, 3 * P5]` will be explained [below](#vector-broadcasting).

#### Extrema
| Name                   | Linear         | Result   | Logarithmic      | Result     |
| ---------------------- | -------------- | -------- | ---------------- | ---------- |
| Minimum                | `2 min 1`      | `1`      | `P8 min P1`      | `P1`       |
| Maximum                | `2 max 1`      | `2`      | `P8 max P1`      | `P8`       |

`x min y` picks the smaller operand when both are interpreted as a relative intervals against the reference frequency while `x max y` picks the larger.

#### Extended arithmetic
| Name                   | Linear         | Result   | Logarithmic      | Result     |
| ---------------------- | -------------- | -------- | ---------------- | ---------- |
| Recipropower           | `9 /^ 2`       | `3`      | `M23 % 2`        | `P12`      |
| Root taking            | `9 ^/ 2`       | `3`      | `M23 ÷ 2`        | `P12`      |
| Logarithm (in base of) | `9 /_ 3`       | `2`      | `M23 % P12`      | `2`        |

The rationale behind the two flavors of anti-exponentiation `/^` and `/_` is explained in Douglas Blumeyer's [forum post](https://forum.sagittal.org/viewtopic.php?t=575).

They have the same precedence and associativity as exponentiation does:
- `x ^ y ^ z` = `x ^ (y ^ z)`
- `x /^ y /^ z` = `x /^ (y /^ z)`
- `x /_ y /_ z` = `x /_ (y /_ z)`

Again, fractions bind stronger so the neutral third `sqrt(3/2)` may be expressed as `3/2 /^ 2`.

A natural way to think about logdivision is to compare the sizes of intervals measured in cents. `M3` is always twice as wide as `M2` regardless of temperament so `M3 ÷ M2` always evaluates to `2`. The result of logdivisions is always a linear scalar so `M3 ~/_ 9/8` is still `2` despite appearing to prefer logarithmic formatting.

#### N of EDO
| Name                   | Linear         | Result   | Logarithmic      | Result     |
| ---------------------- | -------------- | -------- | ---------------- | ---------- |
| N of EDO               | `7 \ 12`       | `7\12`   | _N/A_            |            |
| N steps of M-TET       | `7 sof 12`     | `7\12`   | _N/A_            |            |
| Octave projection      | `sqrt(2) ed 3` | `1\2<3>` | `2\3 ed S3`      | `2\3<9/8>` |

Octave projection takes the exponent of two of the left operand and raises the right operand to it. It mainly exists to work around grammar issues related to the `<` comparison operator. Using variables the expression `foo\bar<baz>` is illegal but `foo\bar ed baz` works.

The steps-of (`sof`) operator mainly exists to work around backslash escapes inside `sw` [tagged template literals](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/tag.md). The expression `foo sof bar` may be read aloud as "*foo* steps of *bar*-tone equal temperament" while `foo sof bar ed baz` reads "*foo* steps of *bar* equal divisions of *baz*".

#### Dot product and tempering

| Name                   | Linear         | Result   | Logarithmic       | Result     |
| ---------------------- | -------------- | -------- | ----------------- | ---------- |
| Val-interval product   | `12@ · 3/2`    | `7`      | `<12 19] dot P5`  | `7`        |
| Interval dot product   | `4 ~dot 8`     | `6`      | `[2> ~· [3>`      | `6`        |
| Explicit tempering     | `12@ tmpr 3/2` | `7\12`   | `<12 19] tmpr P5` | `7\12`     |

The dot product ignores domain and the result is always a linear scalar. It is suggestive of the bra-ket between covectors and vectors <12 19 28 | -4 4 -1> gets rendered `<12 19 28] · [-4 4 -1>` in legal syntax (evaluating to `0`).

The dot product is meaningful only between a val and an interval and the operands must be given in the correct order. Use `~dot~` for hacking and monzo/val component extraction.

Beware that the dot product between cologarithmic quantities is unweighted. The value of `5@ ~dot 7@` depends on the default number of components in the runtime. When restricted to a prime limit like 5 here the result is well-defined `5@.5 ~dot 7@.5` is the same as `<5 8 12] ~· <7 11 16]` and evaluates to `5*7 + 8*11 + 12*16` or `315`.

Explicit tempering is basically the dot product multipled with one step of the equal temperament associated with the val if we ignore the [technicalities](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/tempering.md).

#### Vector broadcasting
All binary operators vectorize over arrays starting from vectorized logical operators above. They also broadcast their operands together to the largest shape involved in the operation.

E.g. `2 * [3, 4, 5]` broadcasts to `[2, 2, 2] * [3, 4, 5]` evaluating to `[2*3, 2*4, 2*5]` or `[6, 8, 10]`.

Broadcasting descends one level at a time so the meaning is reversed from that of NumPy where shapes are matched from tail to head instead. E.g.
```ocaml
[
  [1, 2],
  [3, 4],
  [5, 6],
] + [10, 100, 1000]
```
proceeds to
```ocaml
[
  [1, 2] + 10,
  [3, 4] + 100,
  [5, 6] + 1000,
]
```
resulting in
```ocaml
[
  [11, 12],
  [103, 104],
  [1005, 1006],
]
```

However this allows us to use non-uniform shapes. `[[1, 2], [3, [4, 5]]] + [10, [100, 1000]]` is legal and equal to `[[11, 12], [103, [1004, 1005]]]`.

#### Universal operation and preference
Domain-aware operators can be instructed to ignore domain using tildes.

An expression like `x ~op y` is value-equivalent to
```ocaml
domainOf(x)(linear(x) op linear(y))
```
while `x op~ y` prefers y
```ocaml
domainOf(y)(linear(x) op linear(y))
```

With tilde wings on both sides `x ~op~ y` evaluates to a linear quantity unless both operands are logarithmic.

The *wings of preference* also tries to format the result similar to the preferred operand. `P5 ~+ 3/2` formats as `P12` while `P5 +~ 3/2` formats as `6/2` trying to preserve the denominator between 3/2 and 6/2.

The formatting rules of SonicWeave are too complicated to summarize here and there's no way to express them all in the language itself. Just know that the runtime is trying to be smart about the formatting of tilde'd operations.

## Arrays

### Literals
Array literals are formed by enclosing expressions inside square brackets e.g. `[1, 2, 1+2]` evaluates to `[1, 2, 3]`.

### Ranges
Ranges of integers are generated by giving the start and end points e.g. `[1..5]` evaluates to `[1, 2, 3, 4, 5]`.

To skip over values you can specify the second element `[1,3..10]` evaluates to `[1, 3, 5, 7, 9]` (the iteration stops and rejects after reaching `11`).

Reversed ranges require the second element `[5..1]` evaluates to the empty array `[]` but `[5,4..1]` equals `[5, 4, 3, 2, 1]` as expected.

Some times it's practical to exclude the end point e.g. `[0 .. < 3]` evaluates to `[0, 1, 2]`.

### Harmonic segments
Segments of the (musical) harmonic series can be obtained by specifying the root and the harmonic of equivalence e.g. `4::8` evaluates to `[5/4, 6/4, 7/4, 8/4]`.

Reversed ranges work too e.g. `8::4` evaluates to `[7/8, 6/8, 5/8, 4/8]` and as a scale sounds exactly the same as `4::8` but the sounding directions is changed such that higher frequencies would be towards the left if arranged on a piano.

#### Subharmonic segments
Segments of the subharmonic series can be obtained by prefixing the segment with `/`, specifying the root and the subharmonic of equivalence e.g. `/8::4` evaluates to (frequency ratios) `[8/7, 8/6, 8/5, 8/4]`. Recall that larger subharmonics sound lower so the largest/lowest root pitch should come first if you wish the resulting scale to sound upwards.

### Enumerated chords
Chord enumerations take the first interval and use it as the implied root in a scale e.g. `2:3:5` evaluates to `[3/2, 5/2]`.

#### Reflected enumerations
By default enumeration assumes that we're dealing with frequency ratios. If you wish to specify ratios of wavelengths, prefix the enumeration with `/` e.g. `/6:5:4:3` evaluates to (frequency ratios) `[6/5, 6/4, 6/3]`.

In effect `/a:b:c` is shorthand for `1/a:1/b:1/c`. The stdlib `u()` helper offers an alternative spelling e.g. `u(6:5:4:3)` and pairs nicely with the overtonal `o()` e.g. `o(3:4:5:6)`.

#### Mixed enumerations
Plain enumerals and harmonic segments may be freely mixed e.g. `8::10:12:14::16` is the same as `8:9:10:12:14:15:16` i.e.
```ocaml
9/8
10/8 (* 5/4 *)
12/8 (* 3/2 *)
14/8 (* 7/4 *)
15/8
16/8 (* 2 *)
```

### Array access
Use square brackets to access array elements. Indexing starts from zero. Negative indices count back from the end. `$[-1]` is a handy shorthand for the last element in the current scale.

#### Nullish access
Accessing an array out of bounds raises an exception. Javascript-like behavior is available using `~[]` e.g. `arr~[777]` evaluates to `niente` if the array doesn't have at least 778 elements.

#### Using an array of indices
To obtain a subset of an array use an array of indices e.g. `[1, 2, 3, 4][[0, 2]]` evaluates to `[1, 3]`.

#### Using an array of booleans
Another way to obtain a subset is to use an array of booleans. This works especially well with vectorized operators like `>` here:
```ocaml
const smallPrimes = [2, 3, 5, 7, 11]
smallPrimes[smallPrimes > 4]
```
results in `$ = [5, 7, 11]`

### Slices
Range syntax inside array access gets a copy of a subset of the array e.g. `[1, 2, 3, 4, 5][2..4]` evaluates to `[3, 4, 5]`.

In slice syntax the end points are optional e.g. `[1, 2, 3][..]` evaluates to `[1, 2, 3]` (a new copy).

Excluding the end point can be handy to get the first n elements. `"Greetings!"[..<5]` evaluates to `"Greet"`.

## Records
Record literals are constructed using `key: value` pairs inside curly brackets e.g. `{fif: 3/2, "my octave": 2/1}`.

### Record access
Records are accessed with the same syntax as arrays but using string indices e.g. `{fif: 3/2}["fif"]` evaluates to `3/2`.

Nullish access is supported e.g. `{}~["nothing here"]` evaluates to `niente`.

## Metric prefixes
Frequency literals support [metric prefixes](https://en.wikipedia.org/wiki/Metric_prefix) e.g. `1.2 kHz` is the same as `1200 Hz`. [Binary prefixes](https://en.wikipedia.org/wiki/Binary_prefix) are also supported for no particular reason.

## Numeric frequency flavor
The Hertz unit may be spelled with a lowercase 'h' and without spaces `123hz` but there is also a numeric *flavor* 'z' for even quicker input i.e. `123z`.

## S-expressions
SonicWeave uses the logarithmic domain for [S-expressions](https://en.xen.wiki/w/Square_superparticular) in order to make them compatible with FJS.

So a linear fact like S9 = S6/S8 is expressed as `S9 == S6-S8` in SonicWeave.

Sums of consecutive S-expressions use the range syntax. E.g. `logarithmic(10/9)` is equivalent to `S5..8` i.e. `logarithmic(25/24 * 36/35 * 49/48 * 64/63)`

In combination with FJS we can now spell `10/7` as `linear(a4+S8-S9)` or `12/11` as `linear(M2-S9..11)`.

First few of these square superparticulars are:
| Sn   | Fraction | Size in cents |
| ---- | -------- | ------------- |
| `S2` | `4/3`    | `498.045`     |
| `S3` | `9/8`    | `203.910`     |
| `S4` | `16/15`  | `111.731`     |
| `S5` | `25/24`  | `70.672`      |
| `S6` | `36/35`  | `48.770`      |
| `S7` | `49/48`  | `35.697`      |
| `S8` | `64/63`  | `27.264`      |
| `S9` | `81/80`  | `21.506`      |

## Pythagorean notation revisited
In addition to the various intervals between the unison and the octave there are negative intervals like this major negative second `M-2` representing the frequency ratio `8/9`, and intervals above the octave like this major ninth `M9` representing the frequency ratio `9/4`.

## Neutral Pythagorean
You may have noticed that the gap between an augmented third and a diminished third is wider than between an augmented fourth and a diminished fourth: `cents(a3 - d3, 3)` is `341.055` while `cents(a4 - d4, 3)` is mere `227.370`.

The central interval between the fourths `(dim4 + Aug4) / 2` is just `P4` but the central third lands between minor and major:
```ocaml
(dim3 + Aug3) / 2 (* n3, the neutral third *)
```

Another way to think about the neutral third is as the split fifth `n3` = `P5 / 2`. (The ordinal notation obscures the fact that the *stepspan* of `P5` is four which evenly divides into two.)

| Name            | Logarithmic      | Linear       | Size in cents |
| --------------- | ---------------- | ------------ | ------------- |
| Neutral third   | `n3`, `P5 ÷ 2`   | `sqrt(3/2)`  | `350.978`     |
| Neutral sixth   | `n6`, `P11 % 2`  | `sqrt(8/3)`  | `849.022`     |
| Neutral seventh | `n7`, `P5 * 3/2` | `sqrt(27/8)` | `1052.933`    |

We need a new interval quality to describe the difference between major and neutral. If there's an augmented unison between minor and major then the midpoint must be a semiaugmented unison: `m3 + sa1` = `n3` or spelling "semi" as "½" `n3 + ½Aug1` = `M3`. The width is `cents(sa1, 3)` or `56.843`. The opposite of semiaugmented is naturally semidiminished.

A semiaugmented non-perfectable interval is semiaugmented w.r.t to major e.g. `sa6` is `M6 + sa1` while semidiminished starts from minor e.g. `sd7` is `m7 + sd1`.

Perfectable intervals are more straightforward e.g. `sa4` is simply `P4 + sa1` or `32/27 ^ 3/2` if expressed linearly.

### Semisharps and semiflats
The accidental associated with `sa1` is the semisharp (`s#`, `½♯`, `𝄲`, `‡` or plain ASCII `t`) while the accidental corresponding to `sd1` is the semiflat (`sb`, `½♭`, `𝄳` or plain ASCII `d`). (The unicode `𝄲` tries to be clever by combining `4` with the sharp sign to say "one quarter-tone sharp".)

For example the neutral third above `C4` is `Ed4`.

| Accidental                            | Monzo         | Size in cents |
| ------------------------------------- | ------------- | ------------- |
| `s#`, `½#`, `s♯`, `½♯`, `𝄲`, `‡`, `t` | `[-11/2 7/2>` | `+56.843`     |
| `sb`, `½b` `s♭`, `½♭`, `𝄳`, `d`       | `[11/2 -7/2>` | `-56.843`     |

### Mids
Another way to conceptualize *neutralness* is to investigate the diatonic scale. Not counting the octave, it has exactly two sizes per interval class. The midpoint between the narrower and wider sixths `n6` agrees with the concept of centralness w.r.t. diminished and augmented, but the midpoint between the narrow and wide fourths `(P4 + a4) / 2` is lopsided at `sa4`. SonicWeave still accepts it as the neutral fourth `n4` or *mid fourth* from [ups-and-downs](https://en.xen.wiki/w/Ups_and_downs_notation). The midpoint between the narrow and wide fifths `(d5 + P5)/2` or `sd5` has the alias `n5`. The mids are octave complements of each other `n5 == P8 - n4`. There is no mid unison or mid octave.

#### Neutral FJS
[NFJS](https://en.xen.wiki/w/User:M-yac/Neutral_Intervals_and_the_FJS) notation for just intonation originally applied to neutral sounding primes such as 11, 13, 29, 31 etc. In SonicWeave you must be explicit about the comma set you wish to use in order to spell `11/9` as `n3^11n` or `27/22` as `n3_11n`.

The first few NFJS commas are. To bridge from irrational to rational the commas must be irrational themselves.
| Prime  | Comma                   | Monzo                             | Size in cents |
| ------ | ----------------------- | --------------------------------- | ------------- |
| `11n`  | `sqrt(242/243)`         | `[1/2 -5/2 0 0 1>`                | `-3.570`      |
| `13n`  | `sqrt(507/512)`         | `[-9/2 1/2 0 0 0 1>`              | `-8.495`      |
| `29n`  | `sqrt(864/841)`         | `[-5/2 -3/2 0 0 0 0 0 0 0 1>`     | `-23.355`     |
| `31n`  | `sqrt(2101707/2097152)` | `[-21/2 7/2 0 0 0 0 0 0 0 0 1>`   | `+1.878`      |
| `37n`  | `sqrt(175232/177147)`   | `[7/2 -11/2 0 0 0 0 0 0 0 0 0 1>` | `-9.408`      |

In addition to NFJS commas SonicWeave has a neutral bridging comma associated with every prime.
| Prime  | Comma                   | Monzo                             | Size in cents |
| ------ | ----------------------- | --------------------------------- | ------------- |
| `5n`   | `sqrt(25/24)`           | `[-3/2 -1/2 1>`                   | `+35.336`     |
| `7n`   | `sqrt(54/49)`           | `[-1/2 -3/2 0 1>`                 | `-84.107`     |
| `17n`  | `sqrt(8192/7803)`       | `[-13/2 3/2 0 0 0 0 1>`           | `-42.112`     |
| `19n`  | `sqrt(384/361)`         | `[-7/2 -1/2 0 0 0 0 0 1>`         | `-53.464`     |
| `23n`  | `sqrt(529/486)`         | `[-1/2 -5/2 0 0 0 0 0 0 1>`       | `73.387`      |

Some of these can be handy for using neutral intervals as the center of just major and minor intervals e.g. `n3^5n` corresponds to `5/4` while `n3_5n` corresponds to `6/5`. See [commas.md](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/commas.md#lumis-irrational-bridges) to learn more about irrational bridging.

## Up/lift declaration
Usually you would declare ups and lifts in terms of edosteps, but nothing is preventing you from co-opting the system for notating just intonation and skipping the tempering step altogether.

```ocaml
^ = 81/80  (* Ups are syntonic now *)

C4 = 263z = 1/1
vE4      (* 5/4 *)
G4       (* 3/2 *)
^Bb4     (* 9/5 *)
C5       (* 2/1 *)
```

## MOS declaration
[Moment of symmetry scales](https://en.xen.wiki/w/MOS_scale) are generalizations of the usual diatonic scale where instead of a perfect fifth the scale is generated by stacking some other interval. The scale might also repeat at a fraction of the octave or some other interval.

While the intervals of such scales are readily obtained using the `mos(countL, countS)` or `rank2(generator)` helpers there's a complete system for generating relative and absolute notation for these scales.

MOS can be declared in many ways.
```ocaml
"Brightest mode (Ryonian) of basic octave-equivalent Archeotonic"
MOS 6L 1s
```

```ocaml
"Specific mode (Nightmare) of basic octave-equivalent Ekic"
MOS LLsLLLsL
```

```ocaml
"Specific mode (Anti-phrygian) of specific hardness of octave-equivalent Antidiatonic"
MOS 4333433
```

```ocaml
"Specific mode (Salmon) of specific hardness of octave-equivalent Pine"
MOS 43, 43, 10, 43, 43, 43, 43, 43
```

```ocaml
"Brightest mode of the tritave-equivalent Lambda scale"
MOS 4L 5s <3>
```

```ocaml
"Gil mode of octave-equivalent Mosh with large step equal to 9/8"
MOS {
  3L 4s 5|1
  L = 9/8
}
```
### MOS declaration syntax
The syntax for MOS declarations withing the curly brackets after `MOS` is as follows:

Below `n` is an integer, `x` and `y` are integers in the range from 1 to 9, and `expr` is any SonicWeave expression that evaluates to an interval. Syntax followed by a question mark is optional.
| Name                 | Pattern                              |
| -------------------- | ------------------------------------ |
| Counts with UDP      | `nL ns up\|down(period)? <equave>?`  |
| Small integers       | `[x\|y]+ <equave>?`                  |
| Large integers       | *(comma-separated list of integers)* |
| Abstract             | `[L\|s]+ <equave>?`                  |
| Hardness declaration | `hardness = expr`                    |
| Equave declaration   | `equave = expr`                      |
| Large declaration    | `L = expr`                           |
| Small declaration    | `s = expr`                           |

It's also legal to set `hardness = inf` implying `s = 0.0c`.

### Diamond-mos notation
Once `MOS` has been declared [Diamond-mos notation](https://en.xen.wiki/w/Diamond-mos_notation) becomes available.

The absolute pitch `J4` always corresponds to `C4` and nominals K, L, M, N, etc. follow according to the declared mode. `J5` is an equave above `J4`.

Diamond-mos nominals are second-class syntax so you'll need to dodge previous syntax: `M_3` instead of `M3` (major third), `P_4` instead of `P4` (perfect fourth) and `S_9` instead of `S9` (square superparticular). The recommendation is to always use a natural sign (`_` or `♮`) with Diamond-mos pitches.

```ocaml
"Brightest mode (Ryonian) of basic octave-equivalent Archeotonic"
MOS 6L 1s

J_4 = 263 Hz
K_4 (* 2\13 *)
L_4 (* 4\13 *)
M_4 (* 6\13 *)
N_4 (* 8\13 *)
O_4 (* 10\13 *)
P_4 (* 12\13 *)
J_5 (* 13\13 *)
```

The accidental `&` (read "am") raises pitch by `L - s` while its opposite `@` (read "at") correspondingly lowers pitch by the same amount.

The accidental `e` (read "semiam") raises pitch by a half *am* while `a` (read "semiat") corresponingly lowest pitch by a half *at*.

#### Auto-MOS
The easiest way to generate Diamond-mos notation for one equave is to call the `automos()` helper.
```ocaml
"Specific mode (Anti-phrygian) of specific hardness of octave-equivalent Antidiatonic"
MOS 4333433
J4 = 263 Hz
automos()
```

Calling `automos()` doesn't do anything if the scale isn't empty or if `MOS` is undeclared. (It's possible to use `MOS niente` to undeclare an existing `MOS`.)

### TAMNAMS relative intervals
You can also [name relative intervals](https://en.xen.wiki/w/TAMNAMS#Naming_mos_intervals) after declaring `MOS`.

The indexing starts from 0 instead of 1.

```ocaml
"Specific mode (Nightmare) of basic octave-equivalent Ekic"
MOS LLsLLLsL

P0ms = 333 Hz (* Same as 1 = 333 Hz *)
P1ms (* 2\14 *)
M2ms (* 4\14 *)
P3ms (* 5\14 *)
P4ms (* 7\14 *)
P5ms (* 9\14 *)
M6ms (* 11\14 *)
P7ms (* 12\14 *)
P8ms (* 14\14 *)
```

Neutral (e.g. `n2ms`) and mid intervals (e.g. `n1ms`) are also available. (Semi-)augmented intervals have similar logic to their diatonic counterparts: Augmentation is counted from major upwards and diminishment from minor downwards unless the central interval has perfect quality.

#### Exception for nL ns
When there's only one other interval per period the bright (wide) variant is designated major while the dark (narrow) variant is designated minor.
```ocaml
"A scale spelled using relative Triwood intervals"
MOS 3L 3s

P0ms = 333 Hz
M1ms (* 2\9 *)
P2ms (* 3\9 *)
m3ms (* 4\9 *)
P4ms (* 6\9 *)
P6ms (* 9\9 *)
```

## Next steps

[Advanced DSL](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/advanced-dsl.md)
