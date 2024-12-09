# SonicWeave - Technical overview
This documentation describes the SonicWeave DSL as it relates to other programming languages.

# Table of Contents
1. [Purpose](#purpose)
    1. [Other pitfals](#other-pitfals)
2. [Type system](#type-system)
3. [Operator precedence](#operator-precedence)
4. [Control flow](#control-flow)
    1. [For..of](#forof)
    2. [For..in](#forin)
    3. [While](#while)
    4. [Break, continue](#break-continue)
    5. [For/while...else](#forwhileelse)
5. [Functions](#functions)
6. [Exceptions](#exceptions)
7. [Conditional execution](#conditional-execution)
8. [Deferred execution](#deferred-execution)
9. [Interval subtypes](#interval-subtypes)
10. [Domains](#domains)
11. [Echelons](#echelons)
12. [Ranges of values](#ranges-of-values)
13. [List of used characters](#list-of-used-characters)
14. [Next steps](#next-steps)
    1. [prelude](https://github.com/xenharmonic-devs/sonic-weave/blob/main/src/stdlib/prelude.ts)

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
| Basis    | `@`, `basis(cbrt(2), 9)` | Fractional just intonation subgroup basis for vals.             |
| Temperament | ...                   | Higher rank temperament |
| Array    | `[5/4, P5, 9\9]`         | Musical scales are represented using arrays of intervals.            |
| Record   | `#{fif: 3/2, "p/e": 2}`  | Associative data indexed by strings.                                 |
| Function | `riff plusOne(x) {x+1}`  | _Riff_ is a music term for a short repeated phrase.                  |

Array and record types are recursive i.e. arrays may contain other arrays or records and the values of records can be anything.

SonicWeave does not have classes and there's no `value.property` syntax.

The language is weakly typed and weakly valued. Logdivision is particularly leaky: `16 /_ 8` is rational `4/3` but `16 /_ 3` evaluates to a real (floating point) number. However most expressions that can be expressed as a radical (nth root) are exact.

## Operator precedence

The following table summarizes the operator precedence in SonicWeave, from highest precedence (most binding) to lowest precedence (least binding). Operators in the same box have the same precedence.

All operations are left-associative except exponentiation, recipropower, and logdivision (marked with an asterisk *).

Equality/inclusion operators are non-associative. Two cannot be used in a row. Comparison operators check for range inclusion if two are used and their directions agree. Using three or more comparison operators in a row is a syntax error (marked with a double asterisk **).

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
| `==`, `<>`, `~=`, `~<>`, `<=`, `>=`, `<`, `>`, `of`, `not of`, `~of`, `not ~of`, `in`, `not in`, `~in`, `not ~in` | Strict equality, size equality, comparisons, strict/non-strict value inclusion, strict/non-strict index/key inclusion** |
| `not x`, `vnot x`                                | Boolean not, vector not                                                 |
| `and`, `vand`                                    | Boolean and, vector and                                                 |
| `or`, `vor`, `al`, `al~`                         | Boolean or, vector or, niente coalescing, plain formatting              |
| `x if y else z`, `x where y else z`              | Ternary conditional, vector ternary conditional                         |
| `lest`                                           | Fallback[^1]                                                            |

Parenthesis, `^`, `×`, `÷`, `+`, `-` follow [PEMDAS](https://en.wikipedia.org/wiki/Order_of_operations). The fraction slash `/` represents vertically aligned fractions similar to `$\frac{3}{2}^\frac{1}{2}$` in LaTeX e.g. `3/2 ^ 1/2` evaluates to `sqrt(3 ÷ 2)`.

[^1]: `lest` is a fully associative operation, thus `a() lest b() lest c()` = `(a() lest b()) lest c()` = `a() lest (b() lest c())`. This means that one can always treat a sequence `a() lest b() lest ... lest c()` as if the evaluations occurred from left to right. Any possible parenthesis may be ignored in such a sequence.

## Control flow

### For..of
The contents of arrays and records can be iterated over using
```ocaml
for (const element of container) {
  (* body of the loop utilizing element *)
}
```

### For..in
The indices of arrays or keys of records can be iterated over using
```ocaml
for (const element in container) {
  (* body of the loop utilizing element *)
}
```

### While
The body of a while loop is executed until the condition becomes falsy.
```ocaml
let i = 10;
while (--i)
  i;
(* Result is numbers from 9 to 1 pushed onto the implicit array $. *)
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
| Step         | `7°`, `13 deg`          | Logarithmic   | Relative  | Correspond to edo-steps when tempering is applied. |
| Cents        | `701.955`, `100c`       | Logarithmic   | Relative  | One centisemitone `1.0` is equal to `1\1200`. |
| Monzo        | `[-4 4 -1>`, `[1,-1/2>` | Logarithmic   | Relative  | Also known as prime count vectors. Each component is an exponent of a prime number factor. |
| FJS          | `P5`, `M3^5`            | Logarithmic   | Relative  | [Functional Just System](https://en.xen.wiki/w/Functional_Just_System) |
| TAMNAMS      | `P0ms`, `m4ms`          | Logarithmic   | Relative  | Requires a `MOS` declaration. |
| Frequency    | `440 Hz`, `2.2 kHz`     | Linear        | Absolute  | Absolute frequency of oscillation. |
| Duration     | `1 ms`                  | Linear        | Absolute  | Absolute period of oscillation. |
| Absolute FJS | `C4`, `Eb_5`            | Logarithmic   | Absolute* | Absolute version of [FJS](https://en.xen.wiki/w/Functional_Just_System). |
| Diamond-mos  | `J&4`, `M@3`            | Logarithmic   | Absolute* | Absolute counterpart to TAMNAMS. Requires `MOS` declaration. |
| S-expression | `S8`, `S5..8`           | Logarithmic   | Relative  | Additive spelling of [square superparticulars](https://en.xen.wiki/w/Square_superparticular). |

## Co-inverval subtypes
| Type         | Examples                | Domain        | Echelon   | Notes |
| ------------ | ----------------------- | ------------- | --------- | ----- |
| Val          | `<12, 19, 28]`          | Cologarithmic | Relative  | Used to temper scales. |
| Warts        | `17c@`, `29@2.3.13/5`   | Cologarithmic | Relative  | [Shorthand](https://en.xen.wiki/w/Val#Shorthand_notation) for vals. |
| SOV          | `17[^5]@`               | Cologarithmic | Relative  | [Shorthand](https://en.xen.wiki/w/Val#Sparse_Offset_Val_notationn) for vals. |
| Jorp         | `€`                     | Cologarithmic | Relative  | `<1200]` |
| Pilcrowspoob | `¶`                     | Cologarithmic | Absolute  | `<1]@Hz` |

## Domains

Linear domain values add as in mathematics. Logarithmic domain values add by multiplying the underlying values. Modulo (`mod`) can be implemented using repeated subtraction so it turns into repeated division in the logarithmic domain. This applies to most other operators that can be reduced to addition and negation.

The cologarithmic domain has the semantics of the co-domain of the logarithmic as a vector space where the exponents of prime numbers form the basis.

## Echelons

Anything that can be normalized to a frequency by inverting and negating its time exponent is in the absolute echelon the exponent of the Hertz unit works as a weighting factor in addition. Scalars with a zero time exponent are in the relative echelon with no hidden weights or projection.

## Ranges of values

The number of prime components is set by calling `numComponents(n)`. Any value with a lower nth prime limit will then support exact square roots and other radicals. The maximum exponent of a prime number is `9007199254740991` and the same `2^53 - 1` limit applies to the denominator of the exponent. The multiplicative higher prime residue has the same range but the `Number.MAX_SAFE_INTEGER` limit applies directly to the numerator and denominator of the residual and no square root of a higher prime is representable as a radical.

Real values are double precision floating point numbers.

## List of used characters

The Basic Latin block is listed in full. Other blocks only where used.

| Character code | Text  | Usage |
| -------------- | ----- | ----- |
| U+0000         | *NUL* | *N/A* |
| U+0001         | *SOH* | *N/A* |
| U+0002         | *STX* | *N/A* |
| U+0003         | *ETX* | *N/A* |
| U+0004         | *EOT* | *N/A* |
| U+0005         | *ENQ* | *N/A* |
| U+0006         | *ACK* | *N/A* |
| U+0007         | *BEL* | *N/A* |
| U+0008         | *BS*  | Whitespace |
| U+0009         | *HT*  | Whitespace |
| U+000A         | *LF*  | Whitespace |
| U+000B         | *VT*  | Whitespace |
| U+000C         | *FF*  | Whitespace |
| U+000D         | *CR*  | Whitespace |
| U+000E         | *SO*  | *N/A* |
| U+000F         | *SI*  | *N/A* |
| U+0010         | *DLE* | *N/A* |
| U+0011         | *DC1* | *N/A* |
| U+0012         | *DC2* | *N/A* |
| U+0013         | *DC3* | *N/A* |
| U+0014         | *DC4* | *N/A* |
| U+0015         | *NAK* | *N/A* |
| U+0016         | *SYN* | *N/A* |
| U+0017         | *ETB* | *N/A* |
| U+0018         | *CAN* | *N/A* |
| U+0019         | *EOM* | *N/A* |
| U+001A         | *SUB* | *N/A* |
| U+001B         | *ESC* | *N/A* |
| U+001C         | *FS*  | *N/A* |
| U+001D         | *GS*  | *N/A* |
| U+001E         | *RS*  | *N/A* |
| U+001F         | *US*  | *N/A* |
| U+0020         | *SP*  | Whitespace |
| U+0021         | !     | *Reserved for future use* |
| U+0022         | "     | String literals |
| U+0023         | #     | Sharp accidental, record literals |
| U+0024         | $     | Current scale |
| U+0025         | %     | Unary inversion, binary division (loose binding) |
| U+0026         | &     | MOS chroma up accidental |
| U+0027         | '     | String literals |
| U+0028         | (     | Parameters start |
| U+0029         | )     | Parameters end |
| U+002A         | *     | Binary multiplication, import/export all, comments using `(* ... *)` |
| U+002B         | +     | Unary no-op, unary increment, binary addition, SOV prime widening |
| U+002C         | ,     | List separator, decimal separator (limited context) |
| U+002D         | -     | Unary negation, unary decrement, binary subtraction, SOV prime narrowing |
| U+002E         | .     | Subgroup prime separator, decimal separator (generic context) |
| U+002F         | /     | Unary lift, binary fraction (tight binding), enumeration reflection, exotic operators: `/+`, `/-`, `/^`, `^/`, `/_` |
| U+0030         | 0     | Numeric literals |
| U+0031         | 1     | Numeric literals |
| U+0032         | 2     | Numeric literals |
| U+0033         | 3     | Numeric literals |
| U+0034         | 4     | Numeric literals |
| U+0035         | 5     | Numeric literals |
| U+0036         | 6     | Numeric literals |
| U+0037         | 7     | Numeric literals |
| U+0038         | 8     | Numeric literals |
| U+0039         | 9     | Numeric literals |
| U+003A         | :     | Enumeration separator, record separator |
| U+003B         | ;     | End-of-statement |
| U+003C         | <     | Less-than, range penultimate flag, NEDJI equave, val bracket |
| U+003D         | =     | Assignment, equality, arrow functions using `=>` |
| U+003E         | >     | Greater-than, NEDJI equave, monzo bracket, arrow functions using `=>` |
| U+003F         | ?     | *Reserved for future use* |
| U+0040         | @     | MOS chroma down accidental, subgroup separator |
| U+0041         | A     | Absolute pitch A, identifiers |
| U+0042         | B     | Absolute pitch B, identifiers |
| U+0043         | C     | Absolute pitch C, identifiers |
| U+0044         | D     | Absolute pitch D, identifiers |
| U+0045         | E     | Absolute pitch E, decimal exponent separator, identifiers |
| U+0046         | F     | Absolute pitch F, identifiers |
| U+0047         | G     | Absolute pitch G, identifiers |
| U+0048         | H     | Hertz unit with `Hz`, identifiers |
| U+0049         | I     | Identifiers |
| U+004A         | J     | Diamond-mos pitch J, identifiers |
| U+004B         | K     | Diamond-mos pitch K, identifiers |
| U+004C         | L     | Diamond-mos pitch L, identifiers |
| U+004D         | M     | Diamond-mos pitch M, major interval, identifiers |
| U+004E         | N     | Diamond-mos pitch N, identifiers |
| U+004F         | O     | Diamond-mos pitch O, identifiers |
| U+0050         | P     | Diamond-mos pitch P, perfect interval, identifiers |
| U+0051         | Q     | Diamond-mos pitch Q, three-quarters accidental prefix, identifiers |
| U+0052         | R     | Diamond-mos pitch R, identifiers |
| U+0053         | S     | Diamond-mos pitch S, identifiers |
| U+0054         | T     | Diamond-mos pitch T, identifiers |
| U+0055         | U     | Diamond-mos pitch U, identifiers |
| U+0056         | V     | Diamond-mos pitch V, identifiers |
| U+0057         | W     | Diamond-mos pitch W, identifiers |
| U+0058         | X     | Diamond-mos pitch X, identifiers |
| U+0059         | Y     | Diamond-mos pitch Y, identifiers |
| U+005A         | Z     | Diamond-mos pitch Z, identifiers |
| U+005B         | [     | Array (access) start, monzo bracket, SOV equave start, SOV prime tweaks start |
| U+005C         | \     | Unary drop, binary steps-of-equal-temperament |
| U+005D         | ]     | Array (access) end, monzo bracket, SOV equave end, SOV prime tweaks end |
| U+005E         | ^     | Unary up, binary exponentiation, SOV prime widening |
| U+005F         | _     | Natural accidental, identifiers |
| U+0060         | `     | *N/A* |
| U+0061         | a     | MOS half chroma down accidental, augmented interval, identifiers |
| U+0062         | b     | Flat accidental, identifiers |
| U+0063         | c     | Cents unit, classic inflection flavor, identifiers |
| U+0064         | d     | Semiflat accidental, identifiers |
| U+0065         | e     | MOS half chroma up accidental, decimal exponent separator, identifiers |
| U+0066         | f     | FloraC inflection flavor, identifiers |
| U+0067         | g     | Identifiers |
| U+0068         | h     | Hertz unit with `hz`, HEJI inflection flavor, identifiers |
| U+0069         | i     | Identifiers |
| U+006A         | j     | Identifiers |
| U+006B         | k     | Identifiers |
| U+006C         | l     | Lumi inflection flavor, Identifiers |
| U+006D         | m     | Minor interval, HEWM inflection flavor, identifiers |
| U+006E         | n     | Neutral interval, neutral inflection flavor, identifiers |
| U+006F         | o     | Identifiers |
| U+0070         | p     | Identifiers |
| U+0071         | q     | One-quarter accidental prefix, semiquartal inflection flavor, identifiers |
| U+0072         | r     | Real numeric flavor, identifiers |
| U+0073         | s     | Semi accidental prefix, seconds unit, syntonic-rastmic inflection flavor, identifiers |
| U+0074         | t     | Semisharp accidental, tone-splitter inflection flavor, identifiers |
| U+0075         | u     | Identifiers |
| U+0076         | v     | Pseudo-unary down, SOV prime narrowing, identifiers |
| U+0077         | w     | Identifiers |
| U+0078         | x     | Double-sharp accidental, identifiers |
| U+0079         | y     | Identifiers |
| U+007A         | z     | Frequency literals, identifiers |
| U+007B         | {     | Block start, record start |
| U+007C         | |     | MOS UDP separator |
| U+007D         | }     | Block end, record end |
| U+007E         | ~     | Universal operator preference wing |
| U+007F         | *DEL* | *N/A* |
| U+00A2         | ¢     | Cents unit |
| U+00A3         | £     | Popped scale |
| U+00A5         | ¥     | Template argument |
| U+00B0         | °     | Edosteps unit |
| U+00B6         | ¶     | Pilcrowspoob (meme) |
| U+00BC         | ¼     | One-quarter accidental prefix |
| U+00BD         | ½     | Semi accidental prefix, interordinal interval |
| U+00BE         | ¾     | Three-quarters accidental prefix |
| U+00C2         | Â     | Augmented interval |
| U+00D7         | ×     | Multiplication |
| U+00F7         | ÷     | Unary inversion, binary division (loose binding) |
| U+03B1         | α     | Semioctave pitch alpha |
| U+03B2         | β     | Semioctave pitch beta |
| U+03B3         | γ     | Semioctave pitch gamma |
| U+03B4         | δ     | Semioctave pitch delta |
| U+03B5         | ε     | Semioctave pitch epsilon |
| U+03B6         | ζ     | Semioctave pitch zeta |
| U+03B7         | η     | Semioctave pitch eta |
| U+03B8         | θ     | *Reserved pitch theta* |
| U+03B9         | ι     | *Reserved pitch iota* |
| U+03BA         | κ     | *Reserved pitch kappa* |
| U+03BB         | λ     | *Reserved pitch lambda* |
| U+03BC         | μ     | *Reserved pitch mu* |
| U+03BD         | ν     | *Reserved pitch nu* |
| U+03BE         | ξ     | *Reserved pitch xi* |
| U+03BF         | ο     | *Reserved pitch omicron* |
| U+03C0         | π     | *Reserved pitch pi* |
| U+03C1         | ρ     | *Reserved pitch rho* |
| U+03C2         | ς     | *Reserved pitch final sigma* |
| U+03C3         | σ     | *Reserved pitch sigma* |
| U+03C4         | τ     | *Reserved pitch tau* |
| U+03C5         | υ     | *Reserved pitch upsilon* |
| U+03C6         | φ     | Semiquartal pitch phi |
| U+03C7         | χ     | Semiquartal pitch chi |
| U+03C8         | ψ     | Semiquartal pitch psi |
| U+03C9         | ω     | Semiquartal pitch omega |
| U+2021         | ‡     | Semisharp accidental |
| U+20AC         | €     | Jorp (meme) |
| U+2150         | ⅐     | One-seventh accidental prefix |
| U+2151         | ⅑     | One-ninth accidental prefix |
| U+2152         | ⅒     | One-tenth accidental prefix |
| U+2153         | ⅓     | One-third accidental prefix |
| U+2154         | ⅔     | Two-thirds accidental prefix |
| U+2155         | ⅕     | One-fifth accidental prefix |
| U+2156         | ⅖     | Two-fifths accidental prefix |
| U+2157         | ⅗     | Three-fifths accidental prefix |
| U+2158         | ⅘     | Four-fifths accidental prefix |
| U+2159         | ⅙     | One-sixth accidental prefix |
| U+215A         | ⅚     | Five-sixths accidental prefix |
| U+215B         | ⅛     | One-eighth accidental prefix |
| U+215C         | ⅜     | Three-eighths accidental prefix |
| U+215D         | ⅝     | Five-eighths accidental prefix |
| U+215E         | ⅞     | Seven-eighths accidental prefix |
| U+221A         | √     | Unary square root |
| U+2227         | ∧     | Unary up |
| U+2228         | ∨     | Unary down |
| U+226F         | ♯     | Sharp accidental |
| U+2295         | ⊕     | Lens-addition |
| U+2296         | ⊖     | Lens-subtraction |
| U+2297         | ⊗     | Tensor product |
| U+266E         | ♮     | Natural accidental |
| U+266D         | ♭     | Flat accidental |
| U+27E8         | ⟨     | Val angle bracket |
| U+27E9         | ⟩     | Monzo angle bracket |
| U+1D12A        | 𝄪     | Double-sharp accidental |
| U+1D12B        | 𝄫     | Double-flat accidental |
| U+1D133        | 𝄳     | Semiflat accidental |
| U+1D132        | 𝄲     | Semisharp accidental |

## Next steps

The standard library of SonicWeave is written in SonicWeave. Check out the [prelude](https://github.com/xenharmonic-devs/sonic-weave/blob/main/src/stdlib/prelude.ts).