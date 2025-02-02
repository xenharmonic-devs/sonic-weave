# SonicWeave DSL (advanced)
This document describes programming in the SonicWeave domain-specific language.

# Table of Contents
1. [Record broadcasting](#record-broadcasting)
2. [Tiers](#tiers)
3. [Deleting container contents](#deleting-container-contents)
4. [Blocks](#blocks)
    1. [Block expressions](#block-expressions)
        1. [Block expression return value](#block-expression-return-value)
    2. [Parent scale](#parent-scale)
    3. [Popped parent scale](#popped-parent-scale)
5. [Defer](#defer)
6. [While](#while)
7. [For...of](#forof)
8. [For...in](#forin)
9. [Break](#break)
10. [Continue](#continue)
11. [While..else and for..else](#whileelse-and-forofelse)
    1. [Array comprehensions](#array-comprehensions)
        1. [If clause](#if-clause)
12. [If...else](#ifelse)
13. [Ternary expressions](#ternary-expressions)
    1. [Vectorized where...else](#vectorizing-whereelse)
14. [Function declaration](#function-declaration)
    1. [Calling functions](#calling-functions)
    2. [Stdlib conventions](#stdlib-conventions)
    3. [Lambda expressions](#lambda-expressions)
15. [Throwing](#throwing)
16. [Exception handling](#exception-handling)
17. [Implicit mapping](#implicit-mapping)
18. [Stdlib](#stdlib)
    1. [Constants](#constants)
    2. [Built-in functions](#built-in-functions)
    3. [Prelude functions](#prelude-functions)
    4. [Highlights](#highlights)
19. [Issues with the decimal separator](#issues-with-the-decimal-separator)
    1. [Dot cents](#dot-cents)
    2. [Comma decimals](#comma-decimals)
    3. [Recommendations](#recommendations)
20. [Fractional just intonation subgroups](#fractional-just-intonation-subgroups)
21. [Universal monzos](#universal-monzos)
22. [The interordinal semioctave](#the-interordinal-semioctave)
    1. [Interordinal intervals](#interordinal-intervals)
    2. [Absolute semioctave notation](#absolute-semioctave-notation)
        1. [Alternative semioctave notation](#alternative-semioctave-notation)
    3. [Splitting the fourth](#splitting-the-fourth)
        1. [Nicknames](#nicknames)
23. [Quarter-augmented Pythagorean notation](#quarter-augmented-pythagorean-notation)
    1. [Further splits](#further-splits)
    2. [Extra comma flavors](#extra-comma-flavors)
    3. [Non-standard pitch declaration](#non-standard-pitch-declaration)
24. [Syntonic accidentals](#syntonic-accidentals)
25. [Rebasing](#rebasing)
26. [Implicit intrinsic calls](#implicit-intrinsic-calls)
27. [Obscure types](#obscure-types)
28. [Obscure operations](#obscure-operations)
29. [Future work](#future-work)
30. [Next steps](#next-steps)
    1. [Examples](https://github.com/xenharmonic-devs/sonic-weave/tree/main/examples)
    2. [Technical documentation](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/technical.md)
    3. [Tempering](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/tempering.md)

## Record broadcasting
Records behave like arrays in that operations are broadcast over their values e.g. `#{a: 1, b: 2, c:3} * 5` evaluates to
```ocaml
#{
  a: 1*5,
  b: 2*5,
  c: 3*5,
}
```
or `#{a: 5, b: 10, c: 15}`.

## Tiers
 * natural (`1`, `-3`, `7`, `P8`, etc.)
 * decimal (`1,2`, `3.14e0`, `5/4`, etc.)
 * rational (`5/3`, `P4`, `M2_7`, etc.)
 * radical (`sqrt(2)`, `9\13<3>`, `n3`, etc.)
 * real (`2.718281828459045r`, `3.141592653589793r`, `123.4rc` etc.)

The `r` at the end of real literals just means that they're not cents or associated with the octave in any way. Real cent literals like `600rc` have the same size as their radical counterparts but `linear(2 * 600rc)` won't simplify to `2` like `linear(2 * 600.0)` does.

## Deleting container contents
Record or array entries can be removed using the `del` keyword. Access using individual keys, arrays of indices, boolean arrays and slices are valid targets for removal. The specified entries are popped from the array and subsequent entries are shifted back similar to how `del` works in Python.

```ocaml
"Sieve of Eratosthenes using boolean indexing with del"
const primes = [2..100]
let i = -1
while (++i < length(primes))
  del primes[primes > primes[i] vand vnot primes mod primes[i]]
primes
```

Deleting a non-existent entry throws an error unless the access was nullish i.e. `del arr~[idx]`.

## Blocks
Blocks start with a curly bracket `{`, have their own instance of a current scale `$` and end with `}`. The current scale is unrolled onto the parent scale at the end of the block.

### Block expressions
Blocks are valid expressions and evaluate to arrays. They have the lowest precedence and usually need to be wrapped in parenthesis.
```ocaml
10 * ({
  defer sort()
  2
  1
  3
})
(* $ = [10, 20, 30] *)
```

#### Block expression return value
Use a `return` statement inside a block expression to evaluate to the returned value.
```ocaml
const foo = {
  const bar = 2
  const baz = 3
  return bar + baz
}
(* const foo = 5 *)
```

### Parent scale
The current scale of the parent block can be accessed using `$$`.

### Popped parent scale
A copy of the current scale of the parent block can be obtained using `££` (or the ASCII variant `pop$$`) while simultaneously clearing the original.

## Defer
Defer is used to execute a statement while exiting the current block.

```ocaml
let x = 5;
{
    defer x += 2;
    assert(x == 5);
}
assert(x == 7);
```

When there are multiple defers in a single block, they are executed in reverse order.

```ocaml
let x = 5;
{
    defer x += 2;
    defer x /= 2;
}
assert(x == 4.5e);
```

Defer is useful for pushing implicit tempering and general housekeeping to the top of the source instead of having to dangle everything at the end while editing the scale.

## While
"While" loops repeat a statement until the test becomes *falsy* e.g.
```ocaml
let i = 5
while (--i) {
  i
}
```
results in `$ = [4, 3, 2, 1]`.

## For...of
"For..of" loops iterate over array contents or record values e.g.
```ocaml
for (const i of [1..5]) {
  2 ^ (i % 5)
}
```
results in `$ = [2^1/5, 2^2/5, 2^3/5, 2^4/5, 2]`.

## For..in
"For..in" loops iterate over array indices or record keys e.g.
```ocaml
for (const k in {a: 123, b: 456}) {
  1 k
}
```
results in `$ = [1 "b", 1 "a"]`. With records the order of iteration is indeterministic.

## Break
"While" and "for" loops can be broken out of using the `break` keyword.
```ocaml
for (const i of [1..10]) {
  i \ 6
  if (i >= 6)
    break
}
```
results in `$ = [1\6, 2\6, 3\6, 4\6, 5\6, 6\6]`.

## Continue
The `continue` keyword terminates the execution of the current iteration of a "while" or "for" loop and continues with the next iteration.
```ocaml
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
```ocaml
for (const i of [2..12]) {
  for (const j of [2..i-1]) {
    if (i mod j == 0) break
  } else {
    i
  }
}
```
result is `$ = [2, 3, 5, 7, 11]`.

### Array comprehensions
"For" loops have an inline counterpart in array comprehensions e.g.
```ocaml
[2 ^ i/7 for i of [1..7]]
```
results in `$ = [2^1/7, 2^2/7, 2^3/7, 2^4/7, 2^5/7, 2^6/7, 2]`.

#### If clause
To conditionally include elements use an `if` clause e.g.
```ocaml
[i for i of [1..9] if i mod 3 <> 0]
```
results in `$ = [1, 2, 4, 5, 7, 8]` i.e. all [throdd](https://en.xen.wiki/w/Threeven) numbers below 10.

Above the `<> 0` part is unnecessary. `[i for i of [1..9] if i mod 3]` works the same because `0` is falsy while `1` and `2` are truthy.

## If...else
Conditional statements are evaluated if the test expression evaluates to `true` otherwise the `else` branch is taken.
```ocaml
if (3/2 > 700.) {
  print("The Pythagorean fifth is larger than the perfect fifth of 12-TET")
} else {
  print("This won't print")
}
```
### Ternary expressions
Conditional expressions look similar but work inline e.g. `3 if true else 5` evaluates to `3` while `3 if false else 5` evaluates to `5`.

#### Vectorized where...else
Ternary expressions short-circuit i.e. only the test expression and the chosen result are ever evaluated. The vectorized/broadcasting variant evaluates everything but works on arrays: `[1, 2] where [true false] else 10` evaluates to `[1, 10]`.

## Function declaration
Functions are declared using the `riff` keyword followed by the name of the function followed by the parameters of the function.
```ocaml
riff subharmonics(start, end) {
  return /end::start
}
```
Above the `return` statement is superfluous. We could've left it out and let the result unroll out of the block.

Default values for function parameters may be given using `param = value` syntax.

Due to popular demand there's also the `fn` alias for function declaration.
```ocaml
fn pythagoras(up, down = 0) {
  sort([3^i rdc 2 for i of [-down..up]])
}
```

### Calling functions
Once declared, functions can be called: `subharmonics(4, 8)` evaluates to `[8/7, 8/6, 8/5, 8/4]`,

while `pythagoras(4)` evaluates to `[9/8, 81/64, 3/2, 27/16, 2]`. The missing `down` argument defaulted to `0`.

### Stdlib conventions
You may have noticed that we passed an argument to `sort` in the body of `fn pythagoras`. We could've achieved the same with.
```ocaml
fn pythagoras(up, down = 0) {
  [3^i rdc 2 for i of [-down..up]]
  return sort()
}
```

This is because by convention built-in and standard library functions use the popped parent scale `££` (i.e. `pop$$`) as a default argument. If an argument is passed in, the pop doesn't happen and anything the riff/function produces is concatenated onto the current scale instead of replacing its contents.

Some functions like `sort` and `reverse` have in-place variants (`sortInPlace` and `reverseInplace`) that return nothing but modify the contents of the input array instead.

### Lambda expressions
Functions can be defined inline using the arrow (`=>`). e.g. `const subharmonics = ((start, end) => retrovert(start::end))`.

## Throwing
To interrupt execution you can throw a string message.
```ocaml
throw "Something wrong here!"
```

## Exception handling
To resume execution after an error use `try`, `catch` and `finally`.
```ocaml
try {
  fraction(PI) (* This throws because PI is irrational. *)
  print("This won't print");
} catch (e) {
  print("Caught an exception!");
  print(e); (* Prints: "Input is irrational and no tolerance given." *)
} finally {
  print("This will print regardless.");
}
```

## Implicit mapping
Recall that the default action when encountering a function is to remap the current scale using it. Arrow functions are very handy here:
```ocaml
primes(3, 17)
prime => prime rd 2
2
sort()
```
This first results in `$ = [3, 5, 7, 11, 13, 17]` which gets reduced to `$ = [3/2, 5/4, 7/4, 11/8, 13/8, 17/16]`. Adding the octave and sorting gives the final result `$ = [17/16, 5/4, 11/8, 3/2, 13/8, 7/4, 2]`.

Or the same with a one-liner `sort(primes(17) rdc 2)` demonstrating the utility of broadcasting and *ceiling reduction* in a context where the unison is implicit and coincides with repeated octaves.

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
| Array of deltas  | `diff(arr)`      | `geodiff(arr)` | `unstackPeriodic(arr)`        |
| Cumulative sum   | `cumsum(arr)`    | `cumprod(arr)` | `stackPeriodic(guideGen, arr)`|
| Stacking         | `stackLinear()`  | `stack()`      | `stackPeriodic(guideGen)`     |
| Repeating        | `repeatFlat()`   | `repeatFlat()` | `repeat()`                    |

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

## Fractional just intonation subgroups
By default monzos are vectors of prime exponents and vals are maps of primes, but sometimes you may wish to use other rational numbers as the basis.

Let's take a look at [Barbados temperament](https://en.xen.wiki/w/The_Archipelago#Barbados). We can treat `13/5` like a prime alongside `2` and `3` and map it to `7\5`. The syntax is `5@2.3.13/5` or `<5 8 7]@2.3.13/5`. Now `<5 8 7]@2.3.13/5 dot 15/13` evaluates to 1 step, exactly half of the 2 steps that an approximate `4/3` spans, as desired.

An explicit subgroup may be given with monzos as well e.g. `[0 1 -1>@2.3.13/5` for `logarithmic(15/13)`.

You can even use square roots in the basis e.g. `[-1 1>@√2.√3` is monzo representation for the neutral third `n3`.

## Universal monzos
The monzo basis also supports the special symbols `s`, `Hz`, `-1`, `0`, `rc`, `1°` and `deg`. A conversion like `monzo(-440Hz)` evaluates to
```ocaml
(* Hz, -1, 2, 3, 5, 7, 11 *)
[   1,  1, 3, 0, 1, 0, 1 >@Hz.-1.2..
```
or `1Hz * (-1) * 2^3 * 5^1 * 11^1` if you break it down linearly.

Two dots after a prime number indicate that exponents of successive primes follow.

## The interordinal semioctave
The stepspan of the octave is odd so the semioctave `P8 / 2` doesn't have an obvious ordinal associated with it like how the semififth `P5 / 2` is obviously a third.

The semioctave is between a fourth and a fifth therefore SonicWeave designates it as a 4½th. It is the period of [10L 4s](https://en.xen.wiki/w/10L_4s) (with the semififth as the generator) therefore the designated quality is *perfect*.
```ocaml
"These two are the same"
P8 / 2 "Split octave"
P4½    "The perfect fourth-and-a-halfth"
```

Another valid spelling for this perfect fourth-and-a-halfth is `P4.5`.

### Interordinal intervals
Adding or subtracting a period from an interval doesn't change its quality so we obtain the following central intervals.

| Name                         | Logarithmic        | Linear            | Size in cents |
| ---------------------------- | ------------------ | ----------------- | ------------- |
| Perfect sesquith             | `P1.5`, `M2 / 2`   | `sqrt(9/8)`       | `101.955`     |
| Neutral second-and-a-halfth  | `n2.5`, `P4 / 2`   | `sqrt(4/3)`       | `249.022`     |
| Neutral third-and-a-halfth   | `n3.5`, `M6 / 2`   | `sqrt(27/16)`     | `452.933`     |
| Perfect fourth-and-a-halfth  | `P4.5`, `P8 / 2`   | `sqrt(2)`         | `600.000`     |
| Neutral fifth-and-a-halfth   | `n5.5`, `P4 * 3/2` | `(4/3) ^ (3/2)`   | `747.067`     |
| Neutral sixth-and-a-halfth   | `n6.5`, `P12 / 2`  | `sqrt(3)`         | `950.978`     |
| Perfect seventh-and-a-halfth | `P7.5`, `m14 / 2`  | `sqrt(32/9)`      | `1098.045`    |

Technically the term _semitone_ is a misnomer because the diatonic semitone `m2` doesn't split the tone `M2` in half with mathematical precision (and neither does the chromatic semitone `a1`). The the perfect sesquith `P1½` is the true semiwholetone `M2 / 2`.

The central intervals can be semiaugmented to reach other intervals in the √2.√3 subgroup e.g. `m6 / 2` = `(M6 + d1) / 2` = `n3½ + ½d1` = `m3.5` ~ `sqrt(128/81)`.

### Absolute semioctave notation
Absolute notation follows the ordinals. A scale starting at A has A 1st, B 2nd, C 3rd and so on alphabetically. What's the sesquith nominal in this sequence?

SonicWeave designates Greek counterparts to each of the seven diatonic Latin nominals separated by a semioctave. The octave numbers must still tick at C by convention. Greek capital letters like Alpha are visually indistinguishable from their Latin counterparts so we use lowercase Greek nominals as follows:

| Greek | Greek ASCII | Definition  | Cents from C4 |
| ----- | ----------- | ----------- | ------------- |
| `η4`  | `eta4`      | `G4 - P4.5` | `101.955`     |
| `α4`  | `alp4`      | `A4 - P4.5` | `305.865`     |
| `β4`  | `bet4`      | `B4 - P4.5` | `509.775`     |
| `γ4`  | `gam4`      | `C4 + P4.5` | `600.000`     |
| `δ4`  | `del4`      | `D4 + P4.5` | `803.910`     |
| `ε4`  | `eps4`      | `E4 + P4.5` | `1007.82`     |
| `ζ4`  | `zet4`      | `F4 + P4.5` | `1098.045`    |

By their construction these nominals are all found in 12-tone equal temperament and are also well-suited for notating 22-TET which is connected to 12-TET along the diaschismic axis.

```ocaml
"Srutal[12] a.k.a. Diaschismic[12] tuned to 22-TET"
defer 22@

(* First period: Latin-Greek-Latin *)
C4 = mtof(60)
η4
D4
α4
E4
β4

(* Second period: Greek-Latin-Greek *)
γ4
G4
δ4
A4
ε4
B4

(* Third period: (implicit repetition) *)
C5
```

Informally you may think of "α" as just the name of the black key between the white "D" and "E" keys on the 12-TET piano. Most equal temperaments with an even number of divisions of the octave can make good use of these new Greek notes.

#### Alternative semioctave notation
You can also declare ups to transport notes between the two periods if you wish to avoid using more than 7 nominals while still retaining notational compatibility with most even edos.

The labels indicate the equivalent Greek nominal.

```ocaml
"Semioctave heptanominal alternative I"
^ = Aug4 - 1\2

C4 = 1/1
vC#4 "eta"
D4
vD#4 "alpha"
E4
F4
vF#4 "gamma"
G4
vG#4 "delta"
A4
vA#4 "epsilon"
vB4  "zeta"
C5
```

Note how it's vB instead of vB♯ like everything else in order to have zeta to be a perfect fourth above gamma. This way we get two identical periods one semioctave apart.

Here the up inflection is mere 11.730 cents. You can also check out the [other alternative](https://github.com/xenharmonic-devs/sonic-weave/blob/main/examples/semioctave-alternative-2.sw) where γ = ^F instead resulting in more compact notation.

### Splitting the fourth
The perfect intervals `2`, `3/2` and `4/3` are connected by `4/3 == 2 / (3/2)` so splitting any two of these implies the third.

In terms of interordinals `n2.5 == P4.5 - n3` so we already have relative notation for the split fourth.

Absolute semiquartal notation is obtained by mixing Greek nominals with half-sharps.
```ocaml
"Semiquartal 5L 4s notation"
C♮4 = mtof(60)
D♮4 "Octave-reduced doubled 5th"
αd4 "Split 4th"
βd4
F♮4 "Perfect 4th"
G♮4 "Perfect 5th"
δd4
εd4 "Octave-complemented split 4th"
B♭4 "Doubled 4th"
C♮5 "Octave"
```

#### Nicknames
The semifourth against C has a nickname "φ" or "phi". Other nicknames include:

| Expression    | Standard | Nickname | ASCII  |
| ------------- | -------- | -------- | ------ |
| `C4 + P4 / 2` | `αd4`    | `φ4`     | `phi4` |
| `C5 - P4 / 2` | `εd4`    | `ψ4`     | `psi4` |
| `φ4 + M2`     | `βd4`    | `χ4`     | `chi4` |
| `ψ4 + M2`     | `ζt4`    | `ω4`     | `ome4` |

The scale C, D, φ, χ, F, G, A, ψ, ω, (C) is the 6|2 (*Stellerian*) mode of [5L 4s](https://en.xen.wiki/w/5L_4s) spellable without accidentals.

## Quarter-augmented Pythagorean notation
As previously mentioned the fifth spans 4 degrees so we can split it again without breaking the ordinal notation.

It does require an intermediary quality between major and neutral called _semimajor_ and correspondingly between neutral and minor called _semiminor_.

The quarter fifth `P5 / 4` is a semimajor second `sM2` (or `½M2`).

The new augmented qualities are quarter-augmented (`qa`, `¼a`) and quarter-diminished (`qd`, `¼d`). Quarter-augmented plus semiaugmented is sesqui-semiaugmented (`Qa`, `¾a`) and correspondingly sesqui-semidiminished (`Qd`, `¾d`).

| Accidental             | Monzo          | Size in cents |
| ---------------------- | -------------- | ------------- |
| `q#`, `¼#`, `q♯`, `¼♯` | `[-11/4 7/4>`  | `+28.421`     |
| `qb`, `¼b`, `q♭`, `¼♭` | `[11/4 -7/4>`  | `-28.421`     |
| `Q#`, `¾#`, `Q♯`, `¾♯` | `[-33/4 21/4>` | `+85.264`     |
| `Qb`, `¾b`, `Q♭`, `¾♭` | `[33/4 -21/4>` | `-85.264`     |


### Further splits
Vulgar fraction modifiers like `⅓` or `⅔` can be applied to augmented, major, minor and diminished interval qualities and the accidentals.

You may encounter them when splitting Pythagorean intervals like the *third-major second* `⅓M2` resulting from splitting the fourth into three parts `P4 / 3`.

You can even make interordinals like the *eighth-diminished sesquith* `⅛d1½` by splitting the fifth eight ways `P5 / 8`.

Absolute notation works too `C4 + M6 / 5` happens to be *D fifth-flat four* `D⅕♭4`.

## Syntonic accidentals
Basic accidentals with a single syntonic (81/80) arrow are supported.

| Accidental | Monzo         | Size in cents |
| ---------- | ------------- | ------------- |
| `𝄮`        | `[-4 4 -1>`   | `+21.506`     |
| `𝄯`        | `[4 -4 1>`    | `-21.506`     |
| `𝄱`        | `[-7 3 1>`    | `+92.179`     |
| `𝄬`        | `[7 -3 -1>`   | `-92.179`     |
| `𝄰`        | `[-15 11 -1>` | `+135.191`    |
| `𝄭`        | `[15 -11 1>`  | `-135.191`    |

### Extra comma flavors
Extra commas include extended Helmholtz-Ellis inflections and additional bridges from above irrationals to just intonation.

See [commas.md](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/commas.md).

### Non-standard pitch declaration
Pitch can be declared as a period of oscillation, but it's coerced to Hz to preserve the meaning of relative notation as ratios of frequencies.

E.g. `C4 = 10ms` has the same effect as `C4 = 100 Hz`.

## Rebasing
Repeating the basis of a subgroup monzo can be avoided using the rebasing action associated with the basis type.

```ocaml
(* Labels reflect the final result. *)
[0 1>  "10/9"
[0 2>  "100/81"
[0 3>  "1000/729"
[1 -3> "729/500"
[1 -2> "81/50"
[1 -1> "9/5"
[1>    "2/1"

(* Project intervals from the standard prime basis to powers of 2/1 and 10/9. *)
@2.10/9
```

The limitation is that non-radical reals like `PI` are not supported in basis primitives.
## Implicit intrinsic calls
Associating two values like `3/2 "fif"` invokes intrinsic behavior between the interval `3/2` and the string `"fif"` resulting in an interval with the value 3/2 and the label "fif".

Semantics of the expression `left right` follow this matrix depending on the types of the operands. Booleans are converted to `0` or `1` and follow interval semantics. Question marks indicate undefined behavior. Exclamation marks indicate that previous behavior has been deprecated.
| left↓ right→ | Niente        | String        | Color         | Interval       | Val            | Basis         | Function      |
| ------------ | ------------- | ------------- | ------------- | -------------- | -------------- | ------------- | ------------- |
| **Niente**   | ?             | ?             | ?             | bleach         | ?              | ?             | `right(left)` |
| **String**   | ?             | concatenate   | ?             | label          | ?              | ?             | `right(left)` |
| **Color**    | ?             | ?             | ?             | paint          | ?              | ?             | `right(left)` |
| **Interval** | bleach        | label         | paint         | ?!             | ?!             | rebase        | `right(left)` |
| **Val**      | ?             | ?             | ?             | ?!             | ?              | rebase        | `right(left)` |
| **Basis**    | ?             | ?             | ?             | rebase         | rebase         | ?             | `right(left)` |
| **Function** | `left(right)` | `left(right)` | `left(right)` | `left(right)`  | `left(right)`  | `left(right)` | `left(right)` |

Intrinsic behavior vectorizes and broadcasts like other binary operations.

Intrinsic behavior may be evoked explicitly by simply calling a value e.g. `3/2("fif")` and `"fif"(3/2)` both work.

Some expressions like `440Hz` or `440 Hz` appear similar to intrinsic calls and would correspond to `440 × (1 Hz)` but `600.0 Hz` is actually `600.0e × (1 Hz)`.
It's legal to declare `let Hz = 'whatever'`, but the grammar prevents the `Hz` variable from invoking intrinsic behavior of integer literals from the right.

## Obscure types
| Type              | Literal    | Meaning                                                    |
| ----------------- | ---------- | ---------------------------------------------------------- |
| Infinity          | `inf`      | Linear relative infinity                                   |
| Not-a-number      | `nan`      | Generic invalid real value                                 |
| Second            | `1s`       | Inverse of `1Hz` i.e. `1s * 1Hz` evaluates to `1`          |
| Jorp              | `€`        | Geometric inverse of `c` i.e. `€` is equal to `<1200]`     |
| Pilcrowspoob      | `¶`        | Geometric inverse of `logarithmic(1Hz)`                    |
| Basis             | `@√2.√3`   | Basis of a fractional just intonation subgroup             |
| Temperament       | ...        | Higher rank temperament                                    |
| Template argument | `¥0`, `¥1` | Arguments passed to the `sw` tag in JS                     |

## Obscure operations
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

## Next steps
Check out the [examples](https://github.com/xenharmonic-devs/sonic-weave/tree/main/examples) and [technical documentation](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/technical.md). Also make sure you've read up on [tempering](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/tempering.md) to make TE and CTE optimized tunings.
