# SonicWeave DSL (advanced)
This document describes programming in the SonicWeave domain-specific language.

## Record broadcasting
Records behave like arrays in that operations are broadcast over their values e.g. `{a: 1, b: 2, c:3} * 5` evaluates to
```c
{
  a: 1*5,
  b: 2*5,
  c: 3*5,
}
```
or `{a: 5, b: 10, c: 15}`.

## Tiers
 * natural (`1`, `-3`, `7`, `P8`, etc.)
 * decimal (`1,2`, `3.14e0`, `5/4`, etc.)
 * rational (`5/3`, `P4`, `M2_7`, etc.)
 * radical (`sqrt(2)`, `9\13<3>`, `n3`, etc.)
 * real (`2.718281828459045r`, `3.141592653589793r`, `123.4rc` etc.)

The `r` at the end of real literals just means that they're not cents or associated with the octave in any way. Real cent literals like `600rc` have the same size as their radical counterparts but `linear(2 * 600rc)` won't simplify to `2` like `linear(2 * 600.0)` does.

## Blocks
Blocks start with a curly bracket `{`, have their own instance of a current scale `$` and end with `}`. The current scale is unrolled onto the parent scale at the end of the block.

### Parent scale
The current scale of the parent block can be accessed using `$$`.

## Defer
Defer is used to execute a statement while exiting the current block.

```c
let x = 5;
{
    defer x += 2;
    assert(x === 5);
}
assert(x === 7);
```

When there are multiple defers in a single block, they are executed in reverse order.

```c
let x = 5;
{
    defer x += 2;
    defer x /= 2;
}
assert(x === 4.5e);
```

Defer is useful for pushing implicit tempering and general housekeeping to the top of the source instead of having to dangle everything at the end while editing the scale.

## While
"While" loops repeat a statement until the test becames *falsy* e.g.
```c
let i = 5
while (--i) {
  i
}
```
results in `$ = [4, 3, 2, 1]`.

## For...of
"For..of" loops iterate over array contents or record values e.g.
```c
for (const i of [1..5]) {
  2 ^ (i % 5)
}
```
results in `$ = [2^1/5, 2^2/5, 2^3/5, 2^4/5, 2]`.

## For..in
"For..in" loops iterate over array indices or record keys e.g.
```c
for (const k in {a: 123, b: 456}) {
  1 k
}
```
results in `$ = [1 "b", 1 "a"]`. With records the order is indeterministic.

## Break
"While" and "for" loops can be broken out of using the `break` keyword.
```c
for (const i of [1..10]) {
  i \ 6
  if (i >= 6)
    break
}
```
results in `$ = [1\6, 2\6, 3\6, 4\6, 5\6, 6\6]`.

## Continue
The `continue` keyword terminates the execution of the current iteration of a "while" or "for" loop and continues with the next iteration.
```c
let i = 8
while (++i <= 16) {
  if (i > 12 and i mod 2) {
    continue
  }
  i % 8
}
```
results in `$ = [9/8, 10/8, 11/8, 12/8, 14/8, 16/8]`.

## While..else and for..of..else
The `else` branch of a "while" or "for" loop is executed if no `break` statement was encountered e.g. this computes all primes below 12:
```c
for (const i of [2..12]) {
  for (const j of [2..i-1]) {
    if (i mod j === 0) break
  } else {
    i
  }
}
```
result is `$ = [2, 3, 5, 7, 11]`.

### Array comprehensions
"For" loops have an inline counterpart in array comprehensions e.g.
```c
[2 ^ i /^7 for i of [1..7]]
```
results in `$ = [2^1/7, 2^2/7, 2^3/7, 2^4/7, 2^5/7, 2^6/7, 2]`.

#### If clause
To conditionally include elements use an `if` clause e.g.
```c
[i for i of [1..9] if i mod 3 !== 0]
```
results in `$ = [1, 2, 4, 5, 7, 8]` i.e. all [throdd](https://en.xen.wiki/w/Threeven) numbers below 10.

Above the `!== 0` part is unnecessary. `[i for i of [1..9] if i mod 3]` works the same because `0` is falsy while `1` and `2` are truthy.

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

#### Vectorizing ternary
Ternary expressions short-circuit i.e. only the test expression and the chosen result are ever evaluated. The vectorizing/broadcasting variant evaluates everything but works on arrays: `[1, 2] where [true false] else 10` evaluates to `[1, 10]`.

## Function declaration
Functions are declared using the `riff` keyword followed by the name of the function followed by the parameters of the function.
```javascript
riff subharmonics(start, end) {
  return retroverted(start::end)
}
```
Above the `return` statement is suprefluous. We could've left it out and let the result unroll out of the block.

Default values for function parameters may be given using `param = value` syntax.

Due to popular demand there's also the `fn` alias for function declaration.
```javascript
fn pythagoras(up, down = 0) {
  sorted([3^i rdc 2 for i of [-down..up]])
}
```

### Calling functions
Once declared, functions can be called: `subharmonics(4, 8)` evaluates to `[8/7, 8/6, 8/5, 8/4]`,

while `pythagoras(4)` evaluates to `[9/8, 81/64, 3/2, 27/16, 2]`. The missing `down` argument defaulted to `0`.

### Lambda expressions
Functions can be defined inline using the arrow (`=>`). e.g. `const subharmonics = ((start, end) => retroverted(start::end))`.

## Throwing
To interupt execution you can throw a string message.
```javascript
throw "Something wrong here!"
```

## Exception handling
To resume execution after an error use `try`, `catch` and `finally`.
```javascript
try {
  fraction(PI) // This throws because PI is irrational.
  print("This won't print");
} catch (e) {
  print("Caught an exception!");
  print(e); // Prints: "Input is irrational and no tolerance given."
} finally {
  print("This will print regardless.");
}
```

## Lest expressions
The inline version of `try..catch` is called `lest`. The former expression is tried and replaced by the latter on failure.
```javascript
fraction(P5) lest P5 // Successfully evaluates to 3/2
fraction(PI) lest PI // Falls back to 3.141592653589793r
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

Or the same with a oneliner `sorted(primes(17) rdc 2)` demonstrating the utility of broadcasting and *ceiling reduction* in a context where the unison is implicit and coincides with repeated octaves.

## Stdlib
SonicWeave comes with batteries included.

### Constants

| Name  | Value                | Meaning                   |
| ----- | -------------------- | ------------------------- |
| `E`   | `2.718281828459045r` | Base of natural logarithm |
| `PI`  | `3.141592653589793r` | Ratio of a circle's circumference to its diameter |
| `TAU` | `6.283185307179586r` | The [superior circle constant](https://tauday.com/tau-manifesto) |

### Built-in functions
See [BUILTIN.md](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/BUILTIN.md#built-in-functions).

### Prelude functions
See [BUILTIN.md](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/BUILTIN.md#prelude-functions).

### Highlights

Many helper functions have arithmetic and geometric variants.

| Action           | Linear           | Logarithmic    | Logarithmic (accumulative)    |
| ---------------- | ---------------- | -------------- | ----------------------------- |
| Averaging        | `avg(x, y)`      | `geoavg(x, y)` | *N/A*                         |
| Array of deltas  | `diff(arr)`      | `geodiff(arr)` | `periodiff(arr)`              |
| Cumulative sum   | `cumsum(arr)`    | `cumprod(arr)` | `antiperiodif(guideGen, arr)` |
| Stacking         | `stackLinear()`  | `stack()`      | *N/A*                         |
| Repeating        | `flatRepeat()`   | `flatRepeat()` | `repeat()`                    |

There's also the linearly accumulating `repeatLinear()` for repeating harmonic segments arithmetically.

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

### Fractional Just Intonation Subgroups
By default monzos are vectors of prime exponents and vals are maps of primes, but sometimes you may wish to use other rational numbers as the basis.

Let's take a look at [Barbados temperament](https://en.xen.wiki/w/The_Archipelago#Barbados). We can treat `13/5` like a prime alongside `2` and `3` and map it to `7\5`. The syntax is `5@2.3.13/5` or `<5 8 7]@2.3.13/5`. Now `15/13 dot <5 8 7]@2.3.13/5` evaluates to 1 step, exactly half of the 2 steps that an approximate `4/3` spans, as desired.

An explicit subgroup may be given with monzos as well e.g. `[0 1 -1>@2.3.13/5` for `logarithmic(15/13)`.

### True tone-splitters
Technically the term _semitone_ is a misnomer because the diatonic semitone `m2` doesn't split the tone `M2` in half with mathematical precission (and neither does the chromatic semitone `a1`). The true semiwholetone `M2 % 2` is notated using interordinals as `n1.5` (or `n1½`).

The difference `n1.5 - m2` is only `11.730c` so true tone-splitters are not very useful in their untempered form, but they do provide the notation `n4.5` for the semioctave `P8 % 2` which is stable in all even equal divisions of the octave.

The basic tone-splitters are as follows:
| Name                         | Logarithmic        | Linear            | Size in cents |
| ---------------------------- | ------------------ | ----------------- | ------------- |
| Neutral sesquith             | `n1.5`, `M2 % 2`   | `sqrt(9/8)`       | `101.955`     |
| Neutral second-and-a-halfth  | `n2.5`, `M2 * 3/2` | `sqrt(729/512)`   | `305.865`     |
| Neutral third-and-a-halfth   | `n3.5`, `M2 * 5/2` | `9/8 ^ 5/2`       | `509.775`     |
| Neutral fourth-and-a-halfth  | `n4.5`, `P8 % 2`   | `sqrt(2)`         | `600.000`     |
| Neutral fifth-and-a-halfth   | `n5.5`, `M10 % 2`  | `sqrt(81/32)`     | `803.910`     |
| Neutral sixth-and-a-halfth   | `n6.5`, `a12 % 2`  | `sqrt(6561/2048)` | `1007.82`     |
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

Tone-splitter and decanominals are associated with the `t` flavor of commas e.g. `17/12` may be spelled `ζ4^17t` (assuming `C4 = 1/1`).

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

Due to technical reasons the accidentals for the 5L 4s scale, *scarab* (`¤`) and *pound* (`£`), must also be defined despite their large size.

| Accidental  | Monzo      | Size in cents |
| ----------- | ---------- | ------------- |
| `&`         | `[4 -5/2>` | `+45.112`     |
| `@`         | `[-4 5/2>` | `-45.112`     |
| `¤`         | `[-7 9/2>` | `+158.798`    |
| `£`         | `[7 -9/2>` | `-158.798`    |

Semiquartals are associated with the `q` comma flavor e.g. `7/6` can be spelled `φ4^7q` (assuming `C4 = 1/1`).

#### Quarter-augmented Pythagorean notation
As previously mentioned the fifth spans 4 degrees so we can split it again without breaking the ordinal notation.

It does require an intermediary quality between major and neutral called _semimajor_ and correspondingly between neutral and minor called _semiminor_.

The quarter fifth `P5 % 4` is a semimajor second `sM2` (or `½M2`).

The new augmented qualities are quarter-augmented (`qa`, `¼A`) and quarter-diminished (`qd`, `¼d`). Quarter-augmented plus semiaugmented is sesqui-semiaugmented (`Qa`, `¾A`) and correspondingly sesqui-semidiminished (`Qd`, `¾d`).

| Accidental             | Monzo          | Size in cents |
| ---------------------- | -------------- | ------------- |
| `q#`, `¼#`, `q♯`, `¼♯` | `[-11/4 7/4>`  | `+28.421`     |
| `qb`, `¼b`, `q♭`, `¼♭` | `[11/4 -7/4>`  | `-28.421`     |
| `Q#`, `¾#`, `Q♯`, `¾♯` | `[-33/4 21/4>` | `+85.264`     |
| `Qb`, `¾b`, `Q♭`, `¾♭` | `[33/4 -21/4>` | `-85.264`     |


### Further splits
Vulgar fraction modifiers like `⅓` or `⅔` can be applied to augmented, major, minor and diminished interval qualities and the accidentals.

You may encounter them when splitting Pythagorean intervals like the *third-major second* `⅓M2` resulting from splitting the fourth into three parts `P4 / 3`.

You can even make interordinals like the *quarter-minor sesquith* `qm1.5` by splitting the fifth eight ways `P5 / 8`.

Absolute notation works too `C4 + M6 / 5` happens to be *Dee fifth-flat four* `D⅕♭4`.
### Extra comma flavors
Extra commas include extended Helmholtz-Ellis inflections and additional bridges from above irrationals to just intonation.

See [commas.md](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/commas.md).

### Non-standard pitch declaration
Pitch can be declared as a period of oscillation, but it's coearced to Hz to preserve the meaning of relative notation as ratios of frequencies.

E.g. `C4 = 10ms` has the same effect as `C4 = 100 Hz`.

### Obscure types
| Type   | Literal | Meaning |
| ------ | ------- | ------- |
| Second | `1s`    | Inverse of `1Hz` i.e. `1s * 1Hz` evaluates to `1` |
| Jorp   | `€`     | Geometric inverse of `c` i.e. `€` is equal to `<1200]` |

### Obscure operations
| Name                      | Linear       | Result   | Logarithmic      | Result     |
| ------------------------- | ------------ | -------- | ---------------- | ---------- |
| Harmonic/lens addition    | `3 /+ 5`     | `15/8`   | _N/A_            |            |
| Harmonic/lens addition    | `3 ⊕ 5`      | `15/8`   | _N/A_            |            |
| Harmonic/lens subtraction | `3 /- 5`     | `15/2`   | _N/A_            |            |
| Harmonic/lens subtraction | `3 ⊖ 5`      | `15/2`   | _N/A_            |            |
| _N/A_                     | _N/A_        | _N/A_    | `P8 /+ P12`      | `1\2<6>`   |
| _N/A_                     | _N/A_        | _N/A_    | `P12 /- P8`      | `1\2<3/2>` |

The [thin lens equation](https://en.wikipedia.org/wiki/Thin_lens) f⁻¹ = u⁻¹ + v⁻¹ motivates the definition of *lens addition* f = u ⊕ v and the corresponding *lens subtraction* u = f ⊖ v.

Although the real *raison d'être* is to complete the [Triangle of Power](https://www.youtube.com/watch?v=sULa9Lc4pck):
| Equation                          | Name                         |
| --------------------------------- | ---------------------------- |
| `x ^ y = z`                       | Exponentiation               |
| `z /^ y = x`                      | Recipropower                 |
| `z /_ x = y`                      | Logdivision                  |
| `a ^ x * a ^ y = a ^ (x + y)`     | Distribution of exponents    |
| `(x * y) /_ a = x /_ a + y /_ a`  | Distribution of logdividends |
| `x ^ a * y ^ a = (x * y) ^ a`     | Factoring of bases I         |
| `x /^ a * y /^ a = (x * y) /^ a`  | Factoring of bases II        |
| `a /_ (x * y) = a /_ x /+ a /_ y` | Lensing of logarithmands     |
| `a /^ x * a /^ y = a /^ (x /+ y)` | Lensing of roots             |

## Future work
The syntax could be extended to cover movement in time i.e. to become a full textual music notation vis-à-vis Xenpaper.
