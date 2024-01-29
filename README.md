# sonic-weave
SonicWeave is a Domain Specific Language for manipulating musical frequencies, ratios and equal temperaments.

Not to be confused with the Sweave flexible framework for mixing text and R code for automatic document generation.

## Type system
SonicWeave comes with some basic types.

| Type     | Example                  | Notes |
| -------- | ------------------------ | ----- |
| None     | `niente`                 | _Niente_ is used in music notation and means _nothing_ in Italian. |
| String   | `'hello'`                | Both single and double quoted strings are supported. Used for note labels. |
| Color    | `#ff00ff`                | CSS colors, short hexadecimal, and long hexadecimal colors supported. Used for note colors. |
| Interval | `7/5`                    | There are many types of intervals with their own operator semantics. |
| Scale    | `[5/4, P5, 9\9]`         | Musical scales are represented using arrays of intervals. |
| Function | `riff plusOne x {x+1}` | _Riff_ is a music term for a short repeated phrase. |

### Basic interval types
You can read more about domains and echelons [below](#interval-type-system).

| Type         | Examples                | Domain        | Echelon  | Notes |
| ------------ | ----------------------- | ------------- | -------- | ----- |
| Boolean      | `true` or `false`       | Linear        | Relative | Basically the same as `1` or `0`. |
| Integer      | `2`, `5`                | Linear        | Relative | Same as `2/1` or `5/1`. |
| Decimal      | `1,2`, `1.4e0`          | Linear        | Relative | Decimal commas only work in isolation. |
| Fraction     | `4/3`, `10/7`           | Linear        | Relative | |
| N-of-EDO     | `1\5`, `7\12`           | Logarithmic   | Relative | `n\m` means `n` steps of `m` equal divisions of the octave `2/1`. |
| N-of-EDJI    | `9\13<3>`, `2\5<3/2>`   | Logarithmic   | Relative | `n\m<p/q>` means `n` steps of `m` equal divisions of the ratio `p/q`. |
| Step         | `7\`, `13\`             | Logarithmic   | Relative | Correspond to edo-steps after tempering is applied. |
| Cents        | `701.955`, `100c`       | Logarithmic   | Relative | One centisemitone `1.0` is equal to `1\1200`. |
| Monzo        | `[-4 4 -1>`, `[1,-1/2>` | Logarithmic   | Relative | Also known as prime count vectors. Each component is an exponent of a prime number factor. |
| FJS          | `P5`, `M3^5`            | Logarithmic   | Relative | [Functional Just System](https://en.xen.wiki/w/Functional_Just_System) |
| Frequency    | `440 Hz`, `2.2 kHz`     | Linear        | Absolute | Absolute frequency of oscillation. |
| Absolute FJS | `C4`, `Eb_5`            | Logarithmic   | Absolute | Absolute version of [FJS](https://en.xen.wiki/w/Functional_Just_System).
| Val          | `<12, 19, 28]`          | Cologarithmic | Relative | Used to temper scales. |
| Warts        | `12@`, `29@2.3.13/5`    | Cologarithmic | Relative | [Shorthand](https://en.xen.wiki/w/Val#Shorthand_notation) for vals. |

#### Numeric separators
It is possible to separate numbers into groups using underscores for readability e.g. `1_000_000` is one million as an integer and `123_201/123_200` is the [chalmerisia](https://en.xen.wiki/w/Chalmersia) as a fraction.

## Basic operation
SonicWeave is intended for designing musical scales so a fundamental concept is the current scale (accessible through `$`).

### Pushing
The current scale starts empty (`$ = []`) and the basic action is to push intervals onto the scale.

Statements can be separated with semicolons `;` or newlines. After these instructions ...
```javascript
5/4
3/2
2/1
```
...the scale consists of `$ = [5/4, 3/2, 2/1]`.

### Unrolling
Sub-scales are automatically unrolled onto the current scale.
```javascript
4\12
[7\12, 12\12]
```
Results in the scale `$ = [4\12, 7\12, 12\12]`.

### Coloring
If an expression evaluates to a color it is attached to the last interval in the scale.
```javascript
3/2
green
2/1
red
```
Results in a scale equivalent to `$ = [3/2 #008000, 2/1 #FF0000]`.

It is up to a user interface to interprete colors. The original intent is to color notes in an on-screen keyboard.

### Labeling
If an expression evaluates to a string it is attached to the last interval in the scale.
```javascript
4/3
"My P4"
2/1
'Unison / octave'
```
Results in the scale `$ = [(4/3 "My P4"), (2/1 "Unison / octave")]`.

Labels are included in the `.scl` export.

It is up to a user interface to interprete labels. The original intent is to label notes in an on-screen keyboard.

Scales are intended to repeat from the last interval in the scale (a.k.a. *equave*), so a user interface would use the label of `2/1` for `1/1` or `4/1` too.

## Operators
SonicWeave comes with some operators.

### Unary
| Name          | Linear  | Result      | Logarithmic | Result     |
| ------------- | ------- | ----------- | ----------- | ---------- |
| Identity      | `+2`    | `2`         | `+P8`       | `P8`       |
| Negation      | `-2`    | `-2`        | _N/A_       |            |
| Inversion     | `%2`    | `1/2`       | `-P8`       | `P-8`      |
| Inversion     | `÷3/2`  | `2/3`       | `-P5`       | `P-5`      |
| Geom. inverse | _N/A_   |             | `%P8`       | `v<1]`     |
| Logical NOT   | `not 2` | `false`     | `not P8`    | `false`    |
| Up-shimmer*   | `^2`    | `2*1.0006r` | `^P8`       | `P8 + 1\`  |
| Down-shimmer* | `v{2}`  | `2*0.9994r` | `vP8`       | `P8 - 1\`  |
| Lift-shimmer* | `/2`    | `2*1.0029r` | `/P8`       | `P8 + 5\`  |
| Drop-shimmer* | `\2`    | `2*0.9971r` | `\P8`       | `P8 - 5\`  |
| Increment     | `++i`   | `3`         | _N/A_       |            |
| Increment     | `i++`   | `2`         | _N/A_       |            |
| Decrement     | `--i`   | `1`         | _N/A_       |            |
| Decrement     | `i--`   | `2`         | _N/A_       |            |

*) Shimmer is meant to be used with tempering and corresponds to edo-steps unless otherwise declared.

Down-shimmer sometimes requires curly brackets due to `v` colliding with the Latin alphabet.

Increment/decrement assumes that you've declared `let i = 2` originally.
### Coalescing
| Name               | Example       | Result |
| ------------------ | ------------- | ------ |
| Logical AND        | `2 and 0`     | `0`    |
| Logical OR         | `0 or 2`      | `2`    |
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
| Name             | Operator  |
| ---------------- | --------- |
| Strict inclusion | `of`      |
| Strict exclusion | `not of`  |
| Inclusion        | `~of`     |
| Exclusion        | `not ~of` |
| Outer product    | `tns`     |
| Outer product    | `⊗`      |

Inclusion is similar to Python's `in` operator e.g. `2 of [1, 2, 3]` evaluates to `true`.

Outer product a.k.a. tensoring expands all possible products in two arrays into an array of arrays e.g. `[2, 3, 5] tns [7, 11]` evaluates to
```javascript
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
| Subtraction            | `5 - 3`      | `2`      | _N/A_            |         |
| Modulo                 | `5 mod 3`    | `2`      | _N/A_            |         |
| Ceiling modulo         | `0 modc 3`   | `3`      | _N/A_            |         |
| Round (to multiple of) | `5 to 3`     | `6`      | _N/A_            |         |
| Multiplication         | `2 * 3`      | `6`      | `P8 + P12`       | `P19`   |
| Multiplication         | `110 Hz × 5` | `550 Hz` | `A♮2 + M17^5`    | `C♯5^5` |
| Division               | `6 % 2`      | `3`      | `P19 - P8`       | `P12`   |
| Division               | `220 hz ÷ 2` | `110 Hz` | `A=3 - P8`       | `A=2`   |
| Reduction              | `5 rd 2`     | `5/4`    | `M17^5 mod P8`   | `M3^5`  |
| Ceiling reduction      | `2 rdc 2`    | `2`      | `P8 modc P8`     | `P8`  |
| Exponentiation         | `3 ^ 2`      | `9`      | `P12 * 2`        | `M23`   |
| Root taking            | `9 /^ 2`     | `3`      | `M23 % 2`        | `P12`   |
| Logarithm (in base of) | `9 /_ 3`     | `2`      | `M23 % P12`      | `2`     |
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

#### Subharmonic segments
Segments of the subharmonic series can be obtained by prefixing the segment with `/`, specifying the root and the subharmonic of equivalence e.g. `/8::4` evaluates to (frequency ratios) `[8/7, 8/6, 8/5, 8/4]`. Recall that larger subharmonics sound lower so the largest/lowest root pitch should come first if you wish the resulting scale to sound upwards.

### Enumerated chords
Chord enumerations take the first interval and use it as the implied root in a scale e.g. `2:3:5` evaluates to `[3/2, 5/2]`.

#### Reflected enumerations
By default enumeration assumes that we're dealing with frequency ratios. If you wish to specify ratios of wavelengths, prefix the enumeration with `/` e.g. `/6:5:4:3` evaluates to (frequency ratios) `[6/5, 6/4, 6/3]`.

In effect `/a:b:c` is shorthand for `1/a:1/b:1/c`. The stdlib `u()` is also an alternative e.g. `u(6:5:4:3)`. The undertonal `u()` riff pairs nicely with the overtonal `o()` riff e.g. `o(3:4:5:6)`.

### Array access
Use square brackets to access array elements. Indexing starts from zero. Negative indices count back from the end. `$[-1]` is a handy shorthand for the last element in the current scale.

### Slices
Range syntax inside array access gets a copy of a subset the array e.g. `[1, 2, 3, 4][2..3]` evaluates to `[3, 4]`.

In slice syntax the end points are optional e.g. `[1, 2, 3][..]` evaluates to `[1, 2, 3]` (a new copy).

## Metric prefixes
Frequency literals support [metric prefixes](https://en.wikipedia.org/wiki/Metric_prefix) e.g. `1.2 kHz` is the same as `1200 Hz`.

## Numeric frequency flavor
The space is mandatory in frequency literals like `123 hz` but there is a numeric *flavor* 'z' for quick input i.e. `123z`.

## Truth values
Unlike Javascript the empty array `[]` is *falsy* similar to Python.

## Comments
Everything after two slashes (`//`) is ignored until the end of the line.

Everything after a slash and an asterisk (`/*`) is ignored until an asterisk and a slash (`*/`) is encountered.

## Pythagorean notation
The octave `2/1` is divided into 7 degrees, some of which have two basic qualities.

| Name(s)             | Literal(s) | Value(s)          | Size(s) in cents      |
| ------------------- | ---------- | ----------------- | --------------------- |
| (Perfect) unison    | `P1`       | `1/1`             | `0.000`               |
| Minor/major second  | `m2`, `M2` | `256/243`, `9/8`  | `90.225`, `203.910`   |
| Minor/major third   | `m3`, `M3` | `32/27`, `81/64`  | `294.135`, `407.820`  |
| Perfect fourth      | `P4`       | `4/3`             | `498.045`             |
| Perfect fifth       | `P5`       | `3/2`             | `701.955`             |
| Minor/major sixth   | `m6`, `M6` | `128/81`, `27/16` | `792.180`, `905.865`  |
| Minor/major seventh | `m7`, `M7` | `16/9`, `243/128` | `996.090`, `1109.775` |

The cycle repeats at the perfect octave `P8` (exactly `1200.000` in size) e.g. `9/4` is a major ninth `M9` (or `1403.910`).

Augmented intervals are `2187/2048` (or `113.685`) higher than their perfect/major counterparts e.g. `A4` is `729/512` (or `611.730`). Diminished intervals are correspondingly lower than their perfect/minor counterparts e.g. `d3` is `65536/59049` (or `180.450`).

### Absolute notation
Absolute notation is rooted on (relative) `C4 = 1/1` by default, but it is recommended that you set an absolute frequency like `C4 = mtof(60)` or `C4 = 261.6 Hz`.

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

| Accidental | Monzo      | Size in cents |
| ---------- | ---------- | ------------- |
| `=`, `♮`   | `[0 0>`    | `0.000`       |
| `#`, `♯`   | `[-11 7>`  | `+113.685`    |
| `x`, `𝄪`   | `[-22 14>` | `+227.370`    |
| `b`, `♭`   | `[11 -7>`  | `-113.685`    |
| `𝄫`        | `[22 -14>` | `-227.370`    |

### Functional Just System
[FJS](https://en.xen.wiki/w/Functional_Just_System) uses Pythagorean notation for powers of 2 and 3.

Each higher prime number is associated with a comma which is chosen based on simplicity and otonality (the prime being in the numerator) rather than direction. The comma for `5` is `80/81` so `M6^5` is lower in pitch than plain `M6`. The (logarithmic) `M6^5` is the same as (linear) `27/16 * 80/81` or `5/3`. To go in the opposite direction use a subscript (underscore) e.g. `m3_5` corresponds to `6/5`.

In absolute notation FJS accidentals come after the octave number e.g. the fifth harmonic relative to `C4` is `E6^5`.

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

The first few prime harmonics in FJS are:
|  Reduced harmonic | FJS     | Absolute FJS |
| ----------------- | ------- | ------------ |
| `5/4`             | `M3^5`  | `E♮4^5`      |
| `7/4`             | `m7^7`  | `B♭4^7`      |
| `11/8`            | `P4^11` | `F♮4^11`     |
| `13/8`            | `m6^13` | `A♭4^13`     |
| `17/16`           | `m2^17` | `D♭4^17`     |
| `19/16`           | `m3^19` | `E♭4^19`     |
| `23/16`           | `A4^23` | `F♯4^23`     |

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
 * real (`2.718281828459045r`, `3.141592653589793r`, etc.)

The `r` at the end of real literals just means that they're not cents or associated with the octave in any way.

### Echelons
Quantities can be absolute such as `440 Hz` and `C♮4`, or relative like `M2` and `7/5`.

Multiplication of absolute quantities is interpreted as their geometric average: `361 Hz * 529 Hz` corresponds to `437 Hz` in the scale.

Same goes for logarithmic absolute quantities: `C♮4 + E♮4` corresponds to `D♮4` in the scale if you've declared `C♮4` as absolute quantity.

## Variable declaration
Variables can be declared using the keyword `let` or `const` and a single *equals* sign e.g. `const k = relog(5120/5103)` defines a handy inflection such that `7/5` can be spelled `d5-k` while `A4+k` now corresponds to `10/7`.

Only variables declared using `let` can be re-assigned later.

### Re-assignment
Variables can be reassigned for example after `let i = 2` declaring `i += 3` sets `i` to `5`.

## Pitch declaration
Pitch declaration can be relative e.g. `C0 = 1/1` or absolute e.g. `a4 = 440 Hz`.

When using both the middle value determines the nature of absolute notation e.g. `a4 = 440 Hz = 27/16` sets `a4` to `logarithmic(440 Hz)` while `a4 = 27/16 = 440 Hz` sets `a4` to `M6` (i.e. `logarithmic(27/16)`).

The unison frequency is set implicitly when declaring pitch, but can be set explicitly too e.g. `1/1 = 420 Hz`.

## Blocks
Blocks start with a curly bracket `{`, have their own instance of a current scale `$` and end with `}`. The current scale is unrolled onto the parent scale at the end of the block.

### Parent scale
The current scale of the parent block can be accessed using `$$`.

## While
"While" loops repeat a statement until the test becames *falsy* e.g.
```javascript
let i = 5
while (--i) {
  i
}
```
results in `$ = [4, 3, 2, 1]`.

## For...of
"For" loops iterate over array contents e.g.
```javascript
for (const i of [1..5]) {
  2 ^ (i % 5)
}
```
results in `$ = [2^1/5, 2^2/5, 2^3/5, 2^4/5, 2]`.

### Array comprehensions
"For" loops have an inline counterpart in array comprehensions e.g.
```javascript
[2 ^ i /^7 for i of [1..7]]
```
results in `$ = [2^1/7, 2^2/7, 2^3/7, 2^4/7, 2^5/7, 2^6/7, 2]`.

## If...else
Conditional statements are evaluated if the test expression evaluates to `true` otherwise the `else` branch is taken.
```javascript
if (3/2 > 700.) {
  print("The Pythagorean fifth is larger than the perfect fifth of 12-TET")
} else {
  print("This won't print")
}
```
### Ternary expressions
Conditional expressions look similar but work inline e.g. `3 if true else 5` evaluates to `3` while `3 if false else 5` evaluates to `5`.

## Function declaration
Functions are declared using the `riff` keyword followed by the name of the function followed by the parameters of the function.
```javascript
riff subharmonics start end {
  return retroverted(start::end)
}
```
Above the `return` statement is suprefluous. We could've left it out and let the result unroll out of the block.

### Calling functions
Once declared, functions can be called:`subharmonics(4, 8)` evaluates to `[8/7, 8/6, 8/5, 8/4]`.

### Lambda expressions
Functions can be defined inline using the arrow (`=>`). e.g. `subharmonics = (start, end => retroverted(start::end))`.

## Throwing
To interupt execution you can throw string messages.
```javascript
if (2 < 1) {
  print("This won't print")
} else {
  throw "This will be thrown"
}
```

## Implicit mapping
The default action when encountering a function is to remap the current scale using it.
```javascript
primes(3, 17)
prime => prime rd 2
2
sort()
```
First results in `$ = [3, 5, 7, 11, 13, 17]` which gets reduced to `$ = [3/2, 5/4, 7/4, 11/8, 13/8, 17/16]`. Adding the octave and sorting gives the final result `$ = [17/16, 5/4, 11/8, 3/2, 13/8, 7/4, 2]`.

Or the same with a oneliner `sorted(map(prime => prime rdc 2, primes(17)))` displaying the utility of *ceiling reduction* in a context where the unison is implicit and coincides with repeated octaves.

## Tempering
In SonicWeave tempering refers to measuring the prime counts of intervals and replacing the primes with close (or at least consistent) approximations.

Let's say we have this major chord as our scale `$ = [5/4, 3/2, 2]` and we wish to convert it to 12-tone equal temperament.

First we'll measure out the primes:
```javascript
2^-2 * 3^0 * 5^1
2^-1 * 3^1 * 5^0
2^+1 * 3^0 * 5^0
```

Then we replace each prime with their closest approximation:
```javascript
const st = 2^1/12 // One semitone

(2 by st)^-2 * (3 by st)^0 * (5 by st)^1
(2 by st)^-1 * (3 by st)^1 * (5 by st)^0
(2 by st)^+1 * (3 by st)^0 * (5 by st)^0
```
Which results in `$ = [2^4/12, 2^7/12, 2^12/12]`.

### Implicit tempering
The above could've been achieved by
```javascript
[5/4, 3/2, 2]
i => 12@ dot i \ 12
```
The only difference is the logarithmic format `$ = [4\12, 7\12, 12\12]`.

The default action when encountering a val such as `12@` is to temper the current scale with it.

The above reduces to
```javascript
[5/4, 3/2, 2]
12@
```

### Using ups and downs
By default the up inflection (`^`) corresponds to one step upwards irregardless of the equal temperament while the down inflection (`v`) corresponds to one step downwards.

This can make notation shorter. The 5-limit major scale in 22-tone equal temperament is:
```javascript
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
```javascript
M2
vM3
P4
P5
vM6
vM7
P8
22@
```

### Tweaking ups and downs
To control what ups and downs correspond to, you can use an up declaration:
```javascript
^ = 81/80

M2
vM3
P4
P5
vM6
vM7
P8

311@
```

In this case we could've also set lifts equal to six steps of 311edo to preserve `^` and `v` for small adjustments.
```javascript
/ = 6\

M2
\M3
P4
P5
\M6
\M7
P8

311@
```

## Issues with the decimal separator
To be backwards compatible with Scale Workshop versions 1 and 2, SonicWeave preserves the syntax for "dot cents" and "comma decimals".

Both of these are problematic for the language grammar.

### Dot cents
Compare the expressions `100.0` and `100.0 Hz`. The first one indicates one hundred cents and the second one is interpreted as one hundred hertz due to a special grammar rule.

To force the cents interpretation we can use parenthesis `(100.0) Hz` and produce an error because the domains and echelons are incompatible. This is just to say that the special grammar rule doesn't hide anything sensible.

### Comma decimals
The expression `1,2` for `6/5` is problematic when you consider the rest of the grammar. Would `[1,2,3,4]` be the same as `[6/5, 17/5]` or `[1, 2, 3, 4]`? SonicWeave takes the latter interpretation and bans comma decimals from most of the syntax.

### Recommendations
To avoid ambiguity use explicit cents i.e. `100.0c` or explicit scientific notation i.e. `1.2e0` or just `1.2e`.

## Stdlib
SonicWeave comes with batteries included.

### Constants

| Name  | Value                | Meaning                   |
| ----- | -------------------- | ------------------------- |
| `E`   | `2.718281828459045r` | Base of natural logarithm |
| `PI`  | `3.141592653589793r` | Ratio of a circle's circumference to its diameter |
| `TAU` | `6.283185307179586r` | The [superior circle constant](https://tauday.com/tau-manifesto) |

### Built-in functions
See [BUILTIN.md](BUILTIN.md#built-in-functions).

### Prelude functions
See [BUILTIN.md](BUILTIN.md#prelude-functions).

## Odds and ends
Most of these features were implemented for their own sake.

### Extended Pythagorean notation
The Pythagorean notation can be extended in many ways.

#### Neutral Pythagorean
Ordinal notation* hides the fact that the perfect fifth spans four steps. This means that it can be divided into two thirds without issue. Usually these are the minor and major thirds but we can introduce a neutral third between them that divides the fifth exactly: `n3` is exactly `P5 % 2` or `sqrt(3/2)` if expressed linearly.

*) `P1 + P1` evaluates to `P1` while `1 + 1` evaluates to `2`.

Notable neutral intervals include:
| Name            | Logarithmic      | Linear       | Size in cents |
| --------------- | ---------------- | ------------ | ------------- |
| Neutral third   | `n3`, `P5 % 2`   | `sqrt(3/2)`  | `350.978`     |
| Neutral sixth   | `n6`, `P11 % 2`  | `sqrt(8/3)`  | `849.022`     |
| Neutral seventh | `n7`, `P5 * 3/2` | `sqrt(27/8)` | `1052.933`    |

The major intervals are one semiaugmented unison (or `56.843`) above from their neutral center e.g. `M3` is `n3 + sA1` while minor intervals are semidiminished w.r.t. neutral e.g. `m3` is `n3 + sd1`. A semiaugmented non-perfectable interval is semiaugmented w.r.t to major e.g. `sA6` is `M6 + sA1` while semidiminished starts from minor e.g. `sd7` is `m7 + sd1`.

Perfect intervals are already at the center of their augmented and diminished variants so e.g. `sA4` is simply `P4 + sA1` or `32/27^3/2` if expressed linearly.

#### Semisharps and semiflats
The accidental associated with `sA1` is the semisharp (`s#`, `½♯`, `𝄲`, `‡` or plain ASCII `t`) while the accidental corresponding to `sd1` is the semiflat (`sb`, `½♭`, `𝄳` or plain ASCII `d`). (The unicode `𝄲` tries to be clever by combining `4` with the sharp sign to say "one quarter-tone sharp".)

For example the neutral third above `C4` is `Ed4`.

| Accidental                            | Monzo         | Size in cents |
| ------------------------------------- | ------------- | ------------- |
| `s#`, `½#`, `s♯`, `½♯`, `𝄲`, `‡`, `t` | `[-11/2 7/2>` | `+56.843`     |
| `sb`, `½b` `s♭`, `½♭`, `𝄳`, `d`       | `[11/2 -7/2>` | `-56.843`     |

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

Some of these can be handy for using neutral intervals as the center of just major and minor intervals e.g. `n3^5n` corresponds to `5/4` while `n3_5n` corresponds to `6/5`.

#### Quarter-augmented Pythagorean notation
As mentioned above the fifth spans 4 degrees so we can split it again without breaking the ordinal notation.

It does require an intermediary quality between major and neutral called _semimajor_ and correspondingly between neutral and minor called _semiminor_.

The quarter fifth `P5 % 4` is a semimajor second `sM2` (or `½M2`).

The new augmented qualities are quarter-augmented (`qA`, `¼A`) and quarter-diminished (`qd`, `¼d`). Quarter-augmented plus semiaugmented is sesqui-semiaugmented (`QA`, `¾A`) and correspondingly sesqui-semidiminished (`Qd`, `¾d`).

| Accidental             | Monzo          | Size in cents |
| ---------------------- | -------------- | ------------- |
| `q#`, `¼#`, `q♯`, `¼♯` | `[-11/4 7/4>`  | `+28.421`     |
| `qb`, `¼b`, `q♭`, `¼♭` | `[11/4 -7/4>`  | `-28.421`     |
| `Q#`, `¾#`, `Q♯`, `¾♯` | `[-33/4 21/4>` | `+85.264`     |
| `Qb`, `¾b`, `Q♭`, `¾♭` | `[33/4 -21/4>` | `-85.264`     |

#### Mids
[Ups and downs notation](https://en.xen.wiki/w/Ups_and_downs_notation) comes with a mid (~) quality that doesn't always fall in between augmented and diminished. These exceptions are as follows:

| Name           | Literal |  Recommended name    | Literal | Monzo        | Size in cents |
| -------------- | ------- | -------------------- | ------- | ------------ | ------------- |
| Neutral fourth | `n4`    | Semiaugmented fourth | `sA4`   | `[-7/2 5/2>` | `554.888`     |
| Neutral fifth  | `n5`    | Semidiminished fifth | `sd5`   | `[9/2 -5/2>` | `645.112`     |

They are octave complements of each other: `n4` is `P8 - n5`.

### True tone-splitters
Technically the term _semitone_ is a misnomer because the diatonic semitone `m2` doesn't split the tone `M2` in half with mathematical precission (and neither does the chromatic semitone `A1`). The true semiwholetone `M2 % 2` is notated using interordinals as `n1.5` (or `n1½`).

The difference `n1.5 - m2` is only `11.730c` so true tone-splitters are not very useful in their untempered form, but they do provide the notation `n4.5` for the semioctave `P8 % 2` which is stable in all even equal divisions of the octave.

The basic tone-splitters are as follows:
| Name                         | Logarithmic        | Linear            | Size in cents |
| ---------------------------- | ------------------ | ----------------- | ------------- |
| Neutral sesquith             | `n1.5`, `M2 % 2`   | `sqrt(9/8)`       | `101.955`     |
| Neutral second-and-a-halfth  | `n2.5`, `M2 * 3/2` | `sqrt(729/512)`   | `305.865`     |
| Neutral third-and-a-halfth   | `n3.5`, `M2 * 5/2` | `9/8 ^ 5/2`       | `509.775`     |
| Neutral fourth-and-a-halfth  | `n4.5`, `P8 % 2`   | `sqrt(2)`         | `600.000`     |
| Neutral fifth-and-a-halfth   | `n5.5`, `M10 % 2`  | `sqrt(81/32)`     | `803.910`     |
| Neutral sixth-and-a-halfth   | `n6.5`, `A12 % 2`  | `sqrt(6561/2048)` | `1007.82`     |
| Neutral seventh-and-a-halfth | `n7.5`, `m14 % 2`  | `sqrt(32/9)`      | `1098.045`    |

### Absolute semioctave dodecanominal notation
When stacked against the semioctave the fifth spans a dodecatonal scale inside the octave (10L 2s "soft-jaric" a.k.a. "jaramechromic").

The scale is nominated such that the Greek nominals form the Ionian mode starting from the semioctave.

| Nominal | ASCII    | Meaning     |
| ------- | -------- | ----------- |
| `C4`    |          | `C4 + P1`   |
| `γ4`    | `gamma4` | `C4 + n1½`  |
| `D4`    |          | `C4 + M2`   |
| `δ4`    | `delta4` | `C4 + n2½`  |
| `E4`    |          | `C4 + M3`   |
| `F4`    |          | `C4 + P4`   |
| `ζ4`    | `zeta4`  | `C4 + n4½`  |
| `G4`    |          | `C4 + P5`   |
| `η4`    | `eta4`   | `C4 + n5½`  |
| `a4`    |          | `C4 + M6`   |
| `α4`    | `alpha4` | `C4 + n6½`  |
| `β4`    | `beta4`  | `C4 + n7½`  |
| `C5`    |          | `C4 + P8`   |

Notice how the notation is half-way antisymmteric w.r.t. Latin and Greek nominals and how `B4` is missing. The final Greek nominal `ε4` (`epsilon4`) equal to `C4 + n3½` is also left out, but defined to complete the Ionian mode. Some temperaments stretch the scale to make room for both so e.g. 14-tone equal temperament can be fully notated with alternating Latin and Greek nominals.

The accidentals associated with this bihexatonic scale are `r` and `p`.

| Accidental | Monzo       | Size in cents | Mnemonics                   |
| ---------- | ----------- | ------------- | --------------------------- |
| `r`        | `[-19/2 6>` | `+11.730`     | **r**_aise_, _paja_**r**_a_ |
| `p`        | `[19/2 -6>` | `-11.730`     | (flipped `b`), **p**_ajara_ |

### The interordinal semifourth
When combined with neutral inflections the true tone-splitters induce the notation `m2.5` for the semifourth `P4 % 2` basically for free.

Notable semiquartal intervals include:
| Name                       | Logarithmic       | Linear         | Size in cents |
| -------------------------- | ----------------- | -------------- | ------------- |
| Minor second-and-a-halfth  | `m2½`, `P4 % 2`   | `sqrt(4/3)`    | `249.022`     |
| Minor third-and-a-halfth   | `m3½`, `M6 % 2`   | `sqrt(27/16)`  | `452.933`     |
| Minor fifth-and-a-halfth   | `m5½`, `P4 * 3/2` | `sqrt(64/27) ` | `747.067`     |
| Minor sixth-and-a-halfth   | `m6½`, `P12 % 2`  | `sqrt(3)`      | `950.978`     |
| Major seventh-and-a-halfth | `M7½`, `M14 % 2`  | `sqrt(243/64)` | `1154.888`    |

### Absolute semifourth pentanominal notation
The split fourth spans a pentatonic (4L 1s "manual") scale:
```javascript
C4 = mtof(60)
φ4
F4
G4
ψ4
C5
```

As with semioctave nominals `φ` can be spelled in ASCII as `phi` and `ψ` as `psi`. *Phi* was chosen due to similarity to *F* and *psi* comes from the full enneatonic (5L 4s "semiquartal") scale:
```javascript
C4 = mtof(60)
D4
φ4
χ4
F4
G4
a4
ψ4
ω4
C5
```

| Nominal | ASCII    | Meaning     |
| ------- | -------- | ----------- |
| `φ4`    | `phi4`   | `C4 + m2.5` |
| `χ4`    | `chi4`   | `C4 + m3.5` |
| `ψ4`    | `psi4`   | `C4 + m6.5` |
| `ω4`    | `omega4` | `C4 + M7.5` |

The accidentals are associated with the 4L 1s scale: *em* (`&`) denotes the difference between a semifourth and a whole tone: `C&4` is `C4 + (P4%2 - M2)`. The accidental *at* (`@`) is the opposite.

`χ` is equal to `F@` while `ω` is equal to `C@` of the next octave.

| Accidental  | Monzo      | Size in cents |
| ----------- | ---------- | ------------- |
| `&`         | `[4 -5/2>` | `+45.112`     |
| `@`         | `[-4 5/2>` | `-45.112`     |

### Obscure types
| Type   | Literal | Meaning |
| ------ | ------- | ------- |
| Second | `s`     | Inverse of `Hz` i.e. `s * Hz` evaluates to `1` |
| Jorp   | `€`     | Geometric inverse of `c` i.e. `€` is equal to `v<1200]` |

## Future work
The syntax could be extended to cover movement in time i.e. to become a full textual music notation vis-à-vis Xenpaper.

## Additional resources
* [Xenharmonic Wiki](https://en.xen.wiki/)
* [Rationale](https://forum.sagittal.org/viewtopic.php?t=575) behind the two flavors of anti-exponentiation `/^` and `/_`.

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
* Ups and downs notation - Kite Giedraitis
* Peg.js - David Majda et. al.
* Peggy - Joe Hildebrand et. al.
* Xenharmonic Wiki - (community project)
* Xenharmonic Alliance - (community Discord / Facebook)
