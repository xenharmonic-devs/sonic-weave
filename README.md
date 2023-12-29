# sonic-weave
The SonicWeave DSL for manipulating musical frequencies, ratios and equal temperaments

## Type system
SonicWeave comes with some basic types.

| Type     | Example                  | Notes |
| -------- | ------------------------ | ----- |
| None     | `niente`                 | _Niente_ is used in music notation and means _nothing_ in Italian. |
| String   | `'hello'`                | Both single and double quoted strings are supported. Used for note labels. |
| Color    | `#ff00ff`                | CSS colors, short hexadecimal, and long hexadecimal colors supported. Used for note colors. |
| Interval | `7/5`                    | There are many types of intervals with their own operator semantics. |
| Scale    | `[5/4, P5, 9\9]`         | Musical scales are represented using arrays of intervals. |
| Function | `riff plusOne x {x + 1}` | _Riff_ is a music term for a short repeated phrase. |

### Basic interval types
You can read more about domains and echelons [below](#interval-type-system).

| Type         | Examples                | Domain        | Echelon  | Notes |
| ------------ | ----------------------- | ------------- | -------- | ----- |
| Boolean      | `true` or `false`       | Linear        | Relative | Basically the same as `1` or `0`. |
| Integer      | `2`, `5`                | Linear        | Relative | Same as `2/1` or `5/1`. |
| Decimal      | `1,2`, `1.4e0`          | Linear        | Relative | Decimal commas only work in isolation. |
| Fraction     | `4/3`, `10/7`           | Linear        | Relative | |
| N-of-EDO     | `1\5`, `7\12`           | Logarithmic   | Relative | `n/m` means `n` steps of `m` equal divisions of the octave `2/1`. |
| N-of-EDJI    | `9\13<3>`, `2\5<3/2>`   | Logarithmic   | Relative | `n/m<p/q>` means `n` steps of `m` equal divisions of the ratio `p/q`. |
| Cents        | `701.955`, `100c`       | Logarithmic   | Relative | One centisemitone `1.0` is equal to `1\1200`. |
| Monzo        | `[-4 4 -1>`, `[1 -1/2>` | Logarithmic   | Relative | Also known as prime count vectors. Each component is an exponent of a prime number factor. |
| FJS          | `P5`, `M3^5`            | Logarithmic   | Relative | [Functional Just System](https://en.xen.wiki/w/Functional_Just_System) |
| Frequency    | `440Hz`, `2.2 kHz`      | Linear        | Absolute | Absolute frequency of oscillation. |
| Absolute FJS | `C4`, `Eb_5`            | Logarithmic   | Absolute | Absolute version of [FJS](https://en.xen.wiki/w/Functional_Just_System).
| Val          | `<12, 19, 28]`          | Cologarithmic | Relative | Used to temper scales. |
| Warts        | `12@`, `29@2.3.13/5`    | Cologarithmic | Relative | [Shorthand](https://en.xen.wiki/w/Val#Shorthand_notation) for vals. |

## Basic operation
SonicWeave is intended for designing musical scales so a fundamental concept is the current scale (accessible through `$`).

### Pushing
The current scale starts empty (`$ = []`) and the basic action is to push intervals onto the scale.

Statements can be separated with semicolons `;` or newlines. After these instructions ...
```sw
5/4
3/2
2/1
```
...the scale consists of `$ = [5/4, 3/2, 2/1]`.

### Unrolling
Sub-scales are automatically unrolled onto the current scale.
```sw
4\12
[7\12, 12\12]
```
Results in the scale `$ = [4\12, 7\12, 12\12]`.

### Coloring
If an expression evaluates to a color it is attached to the last interval in the scale.
```sw
3/2
green
2/1
red_
```
Results in the scale `$ = [3/2 #008000, 2/1 #FF0000]`. (`red` is a reserved keyword so the CSS color is called `red_`.)

It is up to a user interface to interprete colors. The original intent is to color notes in an on-screen keyboard.

### Labeling
If an expression evaluates to a string it is attached to the last interval in the scale.
```sw
4/3
"My P4"
2/1
'Unison / octave'
```
Results in the scale `$ = [4/3 'My P4', 2/1 'Unison / octave']`.

Labels are included in the `.scl` export.

It is up to a user interface to interprete labels. The original intent is to label notes in an on-screen keyboard.

## Operators
SonicWeave comes with some operators.

### Unary
| Name          | Linear | Result      | Logarithmic | Result     |
| ------------- | ------ | ----------- | ----------- | ---------- |
| Identity      | `+2`   | `2`         | `+P8`       | `P8`       |
| Negation      | `-2`   | `-2`        | _N/A_       |            |
| Inversion     | `%2`   | `1/2`       | `-P8`       | `P-8`      |
| Inversion     | `÷3/2` | `2/3`       | `-P5`       | `P-5`      |
| Geom. inverse | _N/A_  |             | `%P8`       | `v<1]`     |
| Logical NOT   | `!2`   | `false`     | `!P8`       | `false`    |
| Up-shimmer*   | `^2`   | `2*1.0006!` | `^P8`       | `P8 + 1!c` |
| Down-shimmer* | `v{2}` | `2*0.9994!` | `vP8`       | `P8 - 1!c` |
| Increment     | `++i`  | `3`         | _N/A_       |            |
| Increment     | `i++`  | `2`         | _N/A_       |            |
| Decrement     | `--i`  | `1`         | _N/A_       |            |
| Decrement     | `i--`  | `2`         | _N/A_       |            |

*) Shimmer is meant to be used with tempering and always corresponds to one edji-step.

Increment/decrement assumes that `i = 2` originally.
### Coalescing
| Name               | Example       | Result |
| ------------------ | ------------- | ------ |
| Logical AND        | `2 && 0`      | `0`    |
| Logical OR         | `0 \|\| 2`    | `2`    |
| Nullish coalescing | `niente ?? 2` | `2`    |

### Boolean
| Name                  | Operator |
| --------------------- | -------- |
| Strict equality       | `===`    |
| Strict inequality     | `!==`    |
| Equality              | `==`     |
| Inequality            | `!=`     |
| Greater than          | `>`      |
| Greater than or equal | `>=`     |
| Less than             | `<`      |
| Less than or equal    | `<=`     |

### Array
| Name             | Operator |
| ---------------- | -------- |
| Strict inclusion | `of`     |
| Strict exclusion | `!of`    |
| Inclusion        | `~of`    |
| Exclusion        | `!~of`   |
| Outer product    | `tns`    |
| Outer product    | `⊗`     |

Inclusion is similar to Python's `in` operator e.g. `2 of [1, 2, 3]` evaluates to `true`.

Outer product a.k.a. tensoring expands all possible products in two arrays into an array of arrays e.g. `[2, 3, 5] tns [7, 11]` evaluates to
```sw
[
  [14, 22],
  [21, 33],
  [35, 55]
]
```
### Interval
| Name                   | Linear       | Result   | Logarithmic      | Result  |
| ---------------------- | ------------ | -------- | ---------------- | ------- |
| Addition               | `3 + 5`      | `8`      | _N/A_            |         |
| Subtration             | `5 - 3`      | `2`      | _N/A_            |         |
| Modulo                 | `5 mod 3`    | `2`      | _N/A_            |         |
| Round (to multiple of) | `5 to 3`     | `6`      | _N/A_            |         |
| Multiplication         | `2 * 3`      | `6`      | `P8 + P12`       | `P19`   |
| Multiplication         | `110Hz × 5`  | `550 Hz` | `A♮2 + M17^5`    | `C♯5^5` |
| Division               | `6 % 2`      | `3`      | `P19 - P8`       | `P12`   |
| Division               | `220Hz ÷ 2`  | `110 Hz` | `A=3 - P8`       | `A=2`   |
| Reduction              | `5 red 2`    | `5/4`    | `M17^5 mod P8`   | `M3^5`  |
| Exponentiation         | `3^2`        | `9`      | `P12 * 2`        | `M23`   |
| Root taking            | `9^1/2`      | `3`      | `M23 % 2`        | `P12`   |
| Logarithm (in base of) | `9 log 3`    | `2`      | `M23 % P12`      | `2`     |
| Round (to power of)    | `5 by 2`     | `4`      | `M17^5 to P8`    | `P15`   |
| N of EDO               | `(5+2)\12`   | `7\12`   | _N/A_            |         |
| NEDJI Projection       | `sqrt(2)<3>` | `1\2<3>` | _N/A_            |         |
| Val product            | `12@ · 3/2`  | `7`      | `<12 19] dot P5` | `7`     |

#### Universal operators and preference

To ignore the domain and always operate as if the operands were linear you can use *universal wings* around the operator e.g. `P8 ~+~ P12` evaluates to `M17^5`.

To prefer one format over the other you can indicate the preferred domain with a single wing e.g. `P8 +~ 3` evaluates to `5` while `P8 ~+ 3` evaluates to `M17^5`.

## Arrays

### Literals
Array literals are formed by enclosing expressions inside square brackets e.g. `[1, 2, 1+2]` evaluates to `[1, 2, 3]`.

### Ranges
Ranges of integers are generated by giving the start and end points e.g. `[1..5]` evaluates to `[1, 2, 3, 4, 5]`.

To skip over values you can specify the second element `[1,3..10]` evaluates to `[1, 3, 5, 7, 9]` (the iteration stops and rejects after reaching `11`).

### Harmonic segments
Segments of the (musical) harmonic series can be obtained by specifying the root and the harmonic of equivalence e.g. `4::8` evaluates to `[5/4, 6/4, 7/4, 8/4]`.

### Enumerated chords
Chord enumerations take the first interval and use it as the implied root in a scale e.g. `2:3:5` evaluates to `[3/2, 5/2]`.

### Array access
Use square brackets to access array elements. Indexing starts from zero. Negative indices count back from the end. `$[-1]` is a handy shorthand for the last element in the current scale.

### Slices
Range syntax inside array access gets a copy of a subset the array e.g. `[1, 2, 3, 4][2..3]` evaluates to `[3, 4]`.

In slice syntax the end points are optional e.g. `[1, 2, 3][..]` evaluates to `[1, 2, 3]` (a new copy).

## Metric prefixes
Frequency literals support [metric prefixes](https://en.wikipedia.org/wiki/Metric_prefix) e.g. `1.2 kHz` is the same as `1200 Hz`.

## Truth values
Unlike Javascript the empty array `[]` is *falsy* similar to Python.

## Comments
Everything after two slashes (`//`) is ignored until the end of the line.

Everything after a slash and an asterisk (`/*`) is ignored until an asterisk and a slash (`*/`) is encountered.

## Functional Just System
[FJS](https://en.xen.wiki/w/Functional_Just_System) uses Pythagorean relative interval notation for powers of 2 and 3 e.g. `P5` is (logarithmic) `3/2` or `M6` corresponds to `27/16`.

The octave `2/1` is divided into 7 degrees.

| Name(s)             | Literal(s) | Value(s)          |
| ------------------- | ---------- | ----------------- |
| (Perfect) unison    | `P1`       | `1/1`             |
| Minor/major second  | `m2`, `M2` | `256/243`, `9/8`  |
| Minor/major third   | `m3`, `M3` | `32/27`, `81/64`  |
| Perfect fourth      | `P4`       | `4/3`             |
| Perfect fifth       | `P5`       | `3/2`             |
| Minor/major sixth   | `m6`, `M6` | `128/81`, `27/16` |
| Minor/major seventh | `m7`, `M7` | `16/9`, `243/128` |

The cycle repeats at the perfect octave `P8` e.g. `9/4` is a major ninth `M9`.

Augmented intervals are `2187/2048` higher than their perfect/major counterparts e.g. `A4` is `729/512`. Diminished intervals are correspondingly lower than their perfect/minor counterparts e.g. `d3` is `65536/59049`.

Each prime number is associated with a comma which is chosen based on simplicity rather than direction. The comma for `5` is `80/81` so `M6^5` is lower in pitch than plain `M6`. `M6^5` is the same as (logarithmic) `27/16 * 80/81` or `5/3`. To go in the opposite direction use a subscript (underscore) e.g. `m3_5` corresponds to `6/5`.

The first few commas are:
| Prime `p` | `P1^p`      | Reduced harmonic | Value   |
| --------- | ----------- | ---------------- | ------- |
| `5`       | `80/81`     | `M3^5`           | `5/4`   |
| `7`       | `63/64`     | `m7^7`           | `7/4`   |
| `11`      | `33/32`     | `P4^11`          | `11/8`  |
| `13`      | `1053/1024` | `m6^13`          | `13/8`  |
| `17`      | `4131/4096` | `m2^17`          | `17/16` |
| `19`      | `513/512`   | `m3^19`          | `19/16` |
| `23`      | `736/729`   | `A4^23`          | `23/16` |

### Absolute FJS
The absolute version of FJS is rooted on (relative) `C4 = 1/1` by default, but it is recommended that you set an absolute frequency like `C4 = mtof(60)` or `C4 = 261.6 Hz`.

The Pythagorean nominals from unison to the first octave are.
| Nominal | Meaning   |
| ------- | --------- |
| `C4`    | `C4 + P1` |
| `D4`    | `C4 + M2` |
| `E4`    | `C4 + M3` |
| `F4`    | `C4 + P4` |
| `G4`    | `C4 + P5` |
| `a4`    | `C4 + M6` |
| `B4`    | `C4 + M7` |
| `C5`    | `C4 + P8` |

The `a` nominal must be in lowercase or combined with a neutral sign (`=` or  `♮`) to distinguish it from the *augmented* inflection.

The sharp signs (`#` and `♯`) correspond to the augmented unison e.g. `F#4` is `F4 + A1` or `729/512` relative to `C4`.

The flat signs (`b` and `♭`) correspond to the diminished unison e.g. `Eb4` is `E4 + d1` or `32/27` relative to `C4`.

FJS accidentals come after the octave number e.g. the fifth harmonic relative to `C4` is `E6^5`.

## Interval type system
The interval type system is fairly complex in order to accomodate all types of quantities that can refer to musical pitch or frequency.

There are three domains, multiple tiers and two echelons which can combine to a plethora of distinct types.

### Domains
Quantities can be *linear* or *logarithmic*. Linear quantities denote multiplication using `*` or `×` while logarithmic quantities achieve the same effect using `+`. This is a reflection of how the logarithm converts multiplication into addition.

In just intonation you might denote `16/9` as `4/3 * 4/3` if you wish to work in the linear domain or indicate the same frequency ratio as `m7` and split it into `P4 + P4` if logarithmic thinking suits you better.

The *cologarithmic* domain mostly comes up in tempering. An expression like `12@ · P4` evaluating to `5` indicates that the perfect fourth is tempered to 5 steps of 12-tone equal temperament. In cologarithmic vector form (a.k.a. *val*) `12@` corresponds to `<12 19]` while `P4` corresponds to the prime exponents `[2 -1>` (a.k.a. *monzo*) so the expression `12@ · P4` reads `<12 19] · [2 -1>` = `12 * 2 + 19 * (-1)` = `5`.

### Tiers
 * boolean (`true` or `false`)
 * natural (`1`, `-3`, `7`, `P8`, etc.)
 * decimal (`1,2`, `3.14e0`, `5/4`, etc.)
 * rational (`5/3`, `P4`, `M2_7`, etc.)
 * radical (`sqrt(2)`, `9\13<3>`, `n3`, etc.)
 * real (`2.718281828459045!`, `3.141592653589793!`, etc.)

The `!` at the end of real literals just means that they're not cents or associated with the octave in any way.

### Echelons
Quantities can be absolute such as `440 Hz` and `C♮4`, or relative like `M2` and `7/5`.

Multiplication of absolute quantities is interpreted as their geometric average: `361 Hz * 529 Hz` corresponds to `437 Hz` in the scale.

Same goes for logarithmic absolute quantities: `C♮4 + E♮4` corresponds to `D♮4` in the scale.

### Variable declaration
Variables can be declared using a single *equals* sign e.g. `k = relog(5120/5103)` defines a handy inflection such that `7/5` can be spelled `d5-k` while `A4+k` now corresponds to `10/7`.

#### Re-assignment
Variables can be reassigned for example after `i = 2` declaring `i += 3` sets `i` to `5`.

### Pitch declaration
Pitch declaration can be relative e.g. `C0 = 1/1` or absolute e.g. `a4 = 440 Hz` or both e.g. `a4 = 440 Hz = 27/16`.

The unison frequency is set implicitly when declaring pitch, but can be set explicitly too e.g. `1/1 = 420 Hz`.

### Blocks
Blocks start with a curly bracket `{`, have their own instance of a current scale `$` and end with `}`. The current scale is unrolled onto the parent scale at the end of the block.

#### Parent scale
The current scale of the parent block can be accessed using `$$`.

### While
While loops repeat a statement until the test becames *falsy* e.g.
```sw
i = 5
while (--i) {
  i
}
```
results in `$ = [4, 3, 2, 1]`.

### For...of
For loops iterate over array contents e.g.
```sw
for (i of [1..5]) {
  2 ^ (i % 5)
}
```
results in `$ = [2^1/5, 2^2/5, 2^3/5, 2^4/5, 2]`.

### If...else
Conditional statements are evaluated if the test expression evaluates to `true` otherwise the `else` branch is taken.
```sw
if (3/2 > 700.) {
  print("The Pythagorean fifth is larger than the perfect fifth of 12-TET")
} else {
  print("This won't print")
}
```
#### Ternary expressions
Conditional expressions look similar but work inline e.g. `3 if true else 5` evaluates to `3` while `3 if false else 5` evaluates to `5`.

### Function declaration
Functions are declared using the `riff` keyword followed by the name of the function followed by the parameters of the function.
```sw
riff subharmonics start end {
  return inverted(start::end)
}
```
Above the `return` statement is suprefluous. We could've left it out and let the result unroll out of the block.

#### Calling functions
Once declared, functions can be called:`subharmonics(4, 8)` evaluates to `[8/7, 8/6, 8/5, 8/4]`.

#### Lambda expressions
Functions can be defined inline using the arrow (`=>`). e.g. `subharmonics = (start, end => inverted(start::end))`.

### Throwing
To interupt execution you can throw string messages.
```sw
if (2 < 1) {
  print("This won't print")
} else {
  throw "This will be thrown"
}
```

### Implicit mapping
The default action when encountering a function is to remap the current scale using it.
```sw
primes(3, 17)
prime => prime red 2
2
sort()
```
First results in `$ = [3, 5, 7, 11, 13, 17]` which gets reduced to `$ = [3/2, 5/4, 7/4, 11/8, 13/8, 17/16]`. Adding the octave and sorting gives the final result `$ = [17/16, 5/4, 11/8, 3/2, 13/8, 7/4, 2]`.

### Tempering
In SonicWeave tempering refers to measuring the prime counts of intervals and replacing the primes with close (or at least consistent) approximations.

Let's say we have this major chord as our scale `$ = [5/4, 3/2, 2]` and we wish to convert it to 12-tone equal temperament.

First we'll measure out the primes:
```sw
2^-2 * 3^0 * 5^1
2^-1 * 3^1 * 5^0
2^+1 * 3^0 * 5^0
```

Then we replace every prime with their closest approximation:
```sw
st = 2^1/12 // One semitone

(2 by st)^-2 * (3 by st)^0 * (5 by st)^1
(2 by st)^-1 * (3 by st)^1 * (5 by st)^0
(2 by st)^+1 * (3 by st)^0 * (5 by st)^0
```
Which results in `$ = [2^4/12, 2^7/12, 2^12/12]`.

#### Implicit tempering
The above could've been achieved by
```sw
[5/4, 3/2, 2]
i => 12@ dot i \ 12
```
The only difference is the logarithmic format `$ = [4\12, 7\12, 12\12]`.

The default action when encountering a val (`12@` is shorthand for `<12 19 28]`) is to temper the current scale with it.

The above reduces to
```sw
[5/4, 3/2, 2]
12@
```

#### Using ups and downs
By default the up inflection (`^`) corresponds to one step upwards irregardless of the equal temperament while the down inflection (`v`) corresponds to one step downwards.

This can make notation shorter. The 5-limit major scale in 22-tone equal temperament is:
```sw
M2
M3^5
P4
P5
M6^5
M7^5
P8
22@
```

Using downs the direction of inflection is more clear:
```sw
M2
vM3
P4
P5
vM6
vM7
P8
22@
```

#### Tweaking ups and downs
To control what ups and downs correspond to, you can use the `upsAs` built-in function:
```sw
M2
vM3
P4
P5
vM6
vM7
P8

upsAs(81/80)
311@
```

Or simply increase to _"upness"_ of `311@` by five:
```sw
M2
vM3
P4
P5
vM6
vM7
P8

^^^^^311@
```

### Stdlib
SonicWeave comes with batteries included.

#### Constants

| Name  | Value                | Meaning                   |
| ----- | -------------------- | ------------------------- |
| `E`   | `2.718281828459045!` | Base of natural logarithm |
| `PI`  | `3.141592653589793!` | Ratio of circles circumference to its diameter |
| `TAU` | `6.283185307179586!` | The [superior circle constant](https://tauday.com/tau-manifesto) |

#### Built-in functions
See [BUILTIN.md](BUILTIN.md#built-in-functions).

#### Prelude functions
See [BUILTIN.md](BUILTIN.md#prelude-functions).

## Odds and ends
Most of these features were implemented for their own sake.

#### Neutral Pythagorean notation
TODO

### Neutral FJS
[NFJS](https://en.xen.wiki/w/User:M-yac/Neutral_Intervals_and_the_FJS) notation for just intonation only applies to neutral sounding primes such as 11, 13, 29, 31 etc. e.g. you can spell `11/9` as `n3^11` or `27/11` as `n3_11`.

#### Quarter-augmented Pythagorean notation
TODO

#### Mids
TODO

### True tone-splitters
TODO

### Absolute semioctave dodecanominal notation
TODO

### The interordinal semifourth
TODO

### Absolute semifourth pentanominal notation
The split fourth spans a pentatonic (4L 1s "manual") scale:
```sw
C4 = mtof(60)
φ4
F4
G4
ψ4
C5
```

The accidental *em* (`&`) denotes the difference between a semifourth and a whole tone: `C&4` is `C4 + (P4%2 - M2)`. The accidental *at* (`@`) is the opposite.

As with semioctave nominals `φ` can be spelled in ASCII as `phi` and `ψ` as `psi`. *Phi* was chosen due to similarity to *F* and *psi* comes from the full enneatonic (5L 4s "semiquartal") scale:
```sw
C4 = mtof(60)
φ4
χ4
F4
G4
ψ4
ω4
C5
```
`χ` or `chi` is equal to `F@` while `ω` or `omega` is equal to `C@` of the next octave.

### Obscure types

| Type   | Literal | Meaning |
| ------ | ------- | ------- |
| Second | `s`     | Inverse of `Hz` i.e. `s * Hz` evaluates to `1` |
| Jorp   | `€`     | Geometric inverse of `c` i.e. `€` is equal to `v<1200]` |

## Acknowledgments / inspiration

SonicWeave looks like Javascript with Python semantics, has Haskell ranges and operates similar to xen-calc.

* ECMAScript - Brendan Eich et. al.
* Python - Guido van Rossum et. al.
* Haskell - Lennart Augustsson et. al.
* Scala - Manuel Op de Coul
* Scale Workshop 1 - Sean Archibald et. al.
* FJS - "misotanni"
* NFJS - Matthew Yacavone
* Xen-calc - Matthew Yacavone
* Xenpaper - Damien Clarke
* Peg.js - David Majda et. al.
* Peggy - Joe Hildebrand et. al.
* Xenharmonic Wiki - (community project)
* Xenharmonic Alliance - (community Discord / Facebook)
