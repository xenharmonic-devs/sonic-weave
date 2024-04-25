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
If an expression evaluates to a color it is attached to the last interval in the scale.
```c
3/2
green
2/1
red
```
Results in a scale equivalent to `$ = [3/2 #008000, 2/1 #FF0000]`.

It is up to a user interface to interprete colors. Scale Workshop uses colors in an on-screen keyboard.

### Labeling
If an expression evaluates to a string it is attached to the last interval in the scale.
```c
4/3
"My P4"
2/1
'Unison / octave'
```
Results in the scale `$ = [(4/3 "My P4"), (2/1 "Unison / octave")]`.

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

As explained in [basic DSL](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/dsl.md#domains) documentation. We need two distinct domains if we wish to capture the informal notion where `1 + 1/8` is `9/8` but also where `500. + 500.` is `1000.`.

Especially scalar multiplication and division can be hard to wrap your head around. An expression like `3 * x` is always equal to `x + x + x` no matter the domain of `x`. Similarly `const y = x / 3` results in an `y` such that `y + y + y` is equal to `x`.

This means that multiplication between linear and logarithmic quantities is the same as raising the underlying value of the logarithmic quantity to the underlying value of the linear quantity. Under the hood `P4 * 3` is actually doing `FJS( (4/3) ^ 3 )`.

Similarly a logarithmic quantity divided by a linear quantity is equivalent to taking an nth root. `P5 / 2` is doing `FJS( (3/2) ^ (1/2) )` or taking advantage of the exotic *recipropower* operator and operator precedence of fractions in SonicWeave `FJS( 3/2 /^ 2)`

Division of logarithmic quantities is a true mind-bender: `m7` is `2 * P4` so correspondingly `m7 / P4` evaluates to `2`, a linear scalar!