# SonicWeave - Technical overview
This documentation describes the SonicWeave DSL as it relates to other programming languages.

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

Array and record types are recursive i.e. arrays may contain other arrays or records and the values of records can be anything.

SonicWeave does not have classes and there's no `value.property` syntax.

The language is weakly typed and weakly valued. Logdivision is particularly leaky: `16 /_ 8` is rational `4/3` but `16 /_ 3` evaluates to a real (floating point) number. However most expressions that can be expressed as a radical (nth root) are exact.

## Operator precedence

The following table summarizes the operator precedence in SonicWeave, from highest precedence (most binding) to lowest precedence (least binding). Operators in the same box have the same precedence.

All operations are left-associative except exponentiation, recipropower, logdivision and fallback (marked with an asterisk *).

| Operator                                         | Description                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `(expression)`                                   | Parenthesized expression                                                |
| `[expressions...]`                               | Array display                                                           |
| `{x, key: value, "third key": value, ...}`       | Record display                                                          |
| `x[index]`, `x[start..end]`, `x[s,next..end]`    | Access, slice                                                           |
| `x(arguments...)`                                | Call                                                                    |
| `interval color label`                           | Labeling                                                                |
| `++x`, `--x`, `+x`, `^x`, `∧x`, `∨x`, `/x`, `\x` | Increment, decrement, no-op, up, down, lift, drop                       |
| `/`                                              | Fraction                                                                |
| `^`, `^/`, `/^`, `/_`                            | Exponentiation, recipropower, logdivision*                              |
| `-x`, `%x`, `÷x`                                 | Negation, inversion                                                     |
| `*`, `×`, `%`, `÷`, `\`, `°`, `dot`, `·`, `tns`, `⊗`, `tmpr` | Multiplication, division, N-of-EDO, monzo/val dot product, array tensoring, tempering |
| `mod`, `modc`, `rd`, `rdc`, `ed`                 | Modulo, ceiling modulo, reduction, ceiling reduction, octave projection |
| `+`, `-`, `/+`, `⊕`, `/-`, `⊖`                   | Addition, subtraction, lens addition, lens subtraction                  |
| `max`, `min`                                     | Maximum, minimum                                                        |
| `x:y::z`, `/x::y:x`                              | Chord enumeration, reflected chord enumeration                          |
| `to`, `by`                                       | Linear rounding, logarithmic rounding                                   |
| `===`, `!==`, `==`, `!=`, `<=`, `>=`, `<`, `>`, `of`, `not of`, `~of`, `not ~of`, `in`, `not in`, `~in`, `not ~in` | Strict equality, size equality, comparisons, strict/non-strict value inclusion, strict/non-strict index/key inclusion |
| `not x`                                          | Boolean not                                                             |
| `and`                                            | Boolean and                                                             |
| `or`, `??`                                       | Boolean or, niente coalescing                                           |
| `x if y else z`                                  | Ternary conditional                                                     |
| `lest`                                           | Fallback*                                                               |

Parenthesis, `^`, `×`, `÷`, `+`, `-` follow [PEMDAS](https://en.wikipedia.org/wiki/Order_of_operations). The fraction slash `/` represents vertically aligned fractions similar to `$\frac{3}{2}^\frac{1}{2}$` in LaTeX e.g. `3/2 ^ 1/2` evaluates to `sqrt(3 ÷ 2)`.

## Interval subtypes

TODO: List all interval subtypes

## Domains

TODO: List domains of literals and domains of operations

## Echelons

TODO: List echelons of literals and echelons of operations.

## Ranges of values

TODO: Explain the limits of radical values and reals.

## Control flow

TODO: For and while loops

## TODO

TODO: Other technical notes
