# SonicWeave - Technical overview
This documentation describes the SonicWeave DSL as it relates to other programming languages.

## Purpose
SonicWeave is designed for notating microtonal scales as an extension of Scala .scl syntax. Programming is secondary so you'll have to dodge around reserved patterns such as `C4` which look like identifiers but correspond to musical literals.

### Other pitfals
Fraction slash `/` binds stronger than exponentiation. Use `÷` or `%` if you need division that follows [PEMDAS](https://en.wikipedia.org/wiki/Order_of_operations).

The exponent is required in decimal literals. `1.23e0` instead of `1.23` which is instead interpreted a musical interval 1.23 cents wide.

The meaning of `*` changes depending on the operands. Use `~*` to mean musical stacking of relative intervals i.e. mathematic multiplication.

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

All operations are left-associative except exponentiation, recipropower, and logdivision (marked with an asterisk *).

| Operator                                         | Description                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `(expression)`                                   | Parenthesized expression                                                |
| `[expressions...]`                               | Array display                                                           |
| `{x, key: value, "third key": value, ...}`       | Record display                                                          |
| `x[index]`, `x[start..end]`, `x[s,next..end]`    | Access, slice                                                           |
| `x(arguments...)`                                | Call                                                                    |
| `interval color label`                           | Intrinsic call e.g. painting or labeling                                |
| `++x`, `--x`, `+x`, `^x`, `∧x`, `∨x`, `/x`, `\x` | Increment, decrement, no-op, up, down, lift, drop                       |
| `/`                                              | Fraction                                                                |
| `^`, `^/`, `/^`, `/_`                            | Exponentiation, recipropower, logdivision*                              |
| `-x`, `%x`, `÷x`, `abs x`, `labs x`, `√x`        | Negation, inversion, absolute value, geometric absolute value, square root |
| `*`, `×`, `%`, `÷`, `\`, `dot`, `·`, `tns`, `⊗`, `tmpr` | Multiplication, division, N-of-EDO, val-monzo product, array tensoring, tempering |
| `mod`, `modc`, `rd`, `rdc`, `ed`                 | Modulo, ceiling modulo, reduction, ceiling reduction, octave projection |
| `+`, `-`, `/+`, `⊕`, `/-`, `⊖`                   | Addition, subtraction, lens addition, lens subtraction                  |
| `max`, `min`                                     | Maximum, minimum                                                        |
| `x:y::z`, `/x::y:x`                              | Chord enumeration, reflected chord enumeration                          |
| `to`, `by`                                       | Linear rounding, logarithmic rounding                                   |
| `==`, `<>`, `~=`, `<=`, `>=`, `<`, `>`, `of`, `not of`, `~of`, `not ~of`, `in`, `not in`, `~in`, `not ~in` | Strict equality, size equality, comparisons, strict/non-strict value inclusion, strict/non-strict index/key inclusion |
| `not x`, `vnot x`                                | Boolean not, vector not                                                 |
| `and`, `vand`                                    | Boolean and, vector and                                                 |
| `or`, `vor`, `al`                                | Boolean or, vector or, niente coalescing                                |
| `x if y else z`, `x where y else z`              | Ternary conditional, vector ternary conditional                         |
| `lest`                                           | Fallback[^1]                                                            |

Parenthesis, `^`, `×`, `÷`, `+`, `-` follow [PEMDAS](https://en.wikipedia.org/wiki/Order_of_operations). The fraction slash `/` represents vertically aligned fractions similar to `$\frac{3}{2}^\frac{1}{2}$` in LaTeX e.g. `3/2 ^ 1/2` evaluates to `sqrt(3 ÷ 2)`.

[^1]: `lest` is a fully associative operation, thus `a() lest b() lest c()` = `(a() lest b()) lest c()` = `a() lest (b() lest c())`. This means that one can always treat a sequence `a() lest b() lest ... lest c()` as if the evaluations occurred from left to right. Any possible parenthesis may be ignored in such a sequence.

## Control flow

### For..of
The contents of arrays and records can be iterated over using
```c
for (const element of container) {
  /* body of the loop utilizing element */
}
```

### For..in
The indices of arrays or keys of records can be iterated over using
```c
for (const element in container) {
  /* body of the loop utilizing element */
}
```

### While
The body of a while loop is executed until the condition becomes falsy.
```c
let i = 10;
while (--i)
  i;
// Result is numbers from 9 to 1 pushed onto the implicit array $.
```

### Break, continue
Loops terminate on `break` and continue with the next iteration on `continue`.

### For/while...else
The `else` branch of a for or while loop is executed unless a `break` statement was encountered.

## Functions
Functions are constructed using either the `riff` keyword or the `fn` alias. The return value is indicated using the `return` keyword. If the end of the function body is encountered the return value is the array of intervals pushed onto the current scale i.e. `return $`.

## Exceptions
Exceptions (strings) are raised using `throw` and handled inside `try..catch` blocks or inline using `x() lest y()`.

## Conditional execution
Use chained `if..else`. There is no `elif`.

## Deferred execution
To defer execution to the end of the current block prefix the statement with `defer`. Multiple statements with `defer` inside a single block are executed in reverse order.

## Interval subtypes

| Type         | Examples                | Domain        | Echelon   | Notes |
| ------------ | ----------------------- | ------------- | --------- | ----- |
| Integer      | `2`, `5`                | Linear        | Relative  | Same as `2/1` or `5/1`. |
| Decimal      | `1.2e`, `14e-1`         | Linear        | Relative  | Decimal commas (`1,2`) only work on isolated lines. |
| Fraction     | `4/3`, `10/7`           | Linear        | Relative  | The fraction slash binds stronger than exponentiation |
| N-of-EDO     | `1\5`, `7\12`           | Logarithmic   | Relative  | `n\m` means `n` steps of `m` equal divisions of the octave `2/1`. |
| N-of-EDJI    | `9\13<3>`, `2\5<3/2>`   | Logarithmic   | Relative  | `n\m<p/q>` means `n` steps of `m` equal divisions of the ratio `p/q`. |
| Step         | `7°`                    | Logarithmic   | Relative  | Correspond to edo-steps when tempering is applied. |
| Cents        | `701.955`, `100c`       | Logarithmic   | Relative  | One centisemitone `1.0` is equal to `1\1200`. |
| Monzo        | `[-4 4 -1>`, `[1,-1/2>` | Logarithmic   | Relative  | Also known as prime count vectors. Each component is an exponent of a prime number factor. |
| FJS          | `P5`, `M3^5`            | Logarithmic   | Relative  | [Functional Just System](https://en.xen.wiki/w/Functional_Just_System) |
| TAMNAMS      | `P0ms`, `m4ms`          | Logarithmic   | Relative  | Requires a `MOS` declaration. |
| Frequency    | `440 Hz`, `2.2 kHz`     | Linear        | Absolute  | Absolute frequency of oscillation. |
| Duration     | `1 ms`                  | Linear        | Absolute  | Absolute period of oscillation. |
| Absolute FJS | `C4`, `Eb_5`            | Logarithmic   | Absolute* | Absolute version of [FJS](https://en.xen.wiki/w/Functional_Just_System). |
| Diamond-mos  | `J&4`, `M@3`            | Logarithmic   | Absolute* | Absolute counterpart to TAMNAMS. Requires `MOS` declaration. |
| S-expression | `S8`, `S5..8`           | Logarithmic   | Relative  | Additive spelling of [square superparticulars](https://en.xen.wiki/w/Square_superparticular). |
| Val          | `<12, 19, 28]`          | Cologarithmic | Relative  | Used to temper scales. |
| Warts        | `17c@`, `29@2.3.13/5`   | Cologarithmic | Relative  | [Shorthand](https://en.xen.wiki/w/Val#Shorthand_notation) for vals. |
| SOV          | `17[^5]@`               | Cologarithmic | Relative  | [Shorthand](https://en.xen.wiki/w/Val#Sparse_Offset_Val_notationn) for vals. |
| Jorp         | `€`                     | Cologarithmic | Relative  | `<1200]` |
| Pilcrowspoob | `¶`                     | Cologarithmic | Absolute  | `withEquave(<1]@Hz, 1 Hz)` |

## Domains

Linear domain values add as in mathematics. Logarithmic domain values add by multiplying the underlying values. Modulo (`mod`) can be implemented using repeated subtraction so it turns into repeated division in the logarithmic domain. This applies to most other operators that can be reduced to addition and negation.

The cologarithmic domain has the semantics of the co-domain of the logarithmic as a vector space where the exponents of prime numbers form the basis.

## Echelons

Anything that can be normalized to a frequency by inverting and negating its time exponent is in the absolute echelon the exponent of the Hertz unit works as a weighting factor in addition. Scalars with a zero time exponent are in the relative echelon with no hidden weights or projection.

## Ranges of values

The number of prime components is set by calling `numComponents(n)`. Any value with a lower nth prime limit will then support exact square roots and other radicals. The maximum exponent of a prime number is `9007199254740991` and the same `2^53 - 1` limit applies to the denominator of the exponent. The multiplicative higher prime residue has the same range but the `Number.MAX_SAFE_INTEGER` limit applies directly to the numerator and denominator of the residual and no square root of a higher prime is representable as a radical.

Real values are double precision floating point numbers.

## Next steps

The standard library of SonicWeave is written in SonicWeave. Check out the [prelude](https://github.com/xenharmonic-devs/sonic-weave/blob/main/src/stdlib/prelude.ts).