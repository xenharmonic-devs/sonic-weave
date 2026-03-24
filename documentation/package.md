# SonicWeave npm package

This document describes the `sonic-weave` npm package and its main runtime types.

# Table of Contents
1. [Type reference](#type-reference)
2. [Value types](#value-types)
    1. [Radical values](#radical-values)
    2. [Real values](#real-values)
    3. [Full examples](#full-examples)
3. [Interval type](#interval-type)
4. [Basis type](#basis-type)
5. [Val type](#val-type)
6. [Embedding SonicWeave](#embedding-sonicweave)
    1. [Parsing](#parsing)
    2. [Execution](#execution)

## Type reference

The auto-generated TypeScript API documentation is published on the project's [GitHub Pages site](https://xenharmonic-devs.github.io/sonic-weave/).

## Value types

The two main numeric value types in SonicWeave are [TimeMonzo](https://xenharmonic-devs.github.io/sonic-weave/classes/TimeMonzo.html) and [TimeReal](https://xenharmonic-devs.github.io/sonic-weave/classes/TimeReal.html). They represent radical and real values respectively. The `time` prefix refers to the fact that these values carry a time dimension, usually `Hz = s⁻¹`.

The exponent of the second unit is available as `timeMonzo.timeExponent`. In `TimeMonzo` instances the exponent is a `Fraction`; in `TimeReal` instances it is a plain `number`.

### Radical values

As a mathematical tier, radical numbers sit between rational and algebraic numbers: they are solutions to equations of the form `x^n = p/q`, where `n`, `p`, and `q` are integers. Musically, this corresponds to one step of an `n`-tone equal temperament with [equave](https://en.xen.wiki/w/Equave) `p/q`.

Rational numbers, also known musically as [just intonation](https://en.xen.wiki/w/Just_intonation), are the special case where `n = 1`.

Examples from equal temperaments:

- One step of 12-tone equal temperament, or 100¢, has `n = 12`, `p = 2`, and `q = 1`.
- Two steps, or 200¢, has `n = 6`, `p = 2`, and `q = 1`.
- Three steps, or 300¢, has `n = 4`, `p = 2`, and `q = 1`.
- Four steps, or 400¢, has `n = 3`, `p = 2`, and `q = 1`.
- Five steps, or 500¢, has `n = 12`, `p = 32`, and `q = 1`.
- Six steps of 13 equal divisions of the [tritave](https://en.xen.wiki/w/3/1), around 877.825 cents, has `n = 13`, `p = 3`, and `q = 1`.
- One step of 9 [equal divisions of the fifth](https://en.xen.wiki/w/EDF) has `n = 9`, `p = 3`, and `q = 2`.

Internally, the runtime does not store `n`, `p`, and `q` directly. Instead, it uses arrays of prime exponents called fractional monzos. The range of values is the same, but the representation is better suited to exact computation.

Examples of prime-exponent arrays corresponding to SonicWeave literals:

| Literal  | Monzo         |
| -------- | ------------- |
| `1`      | `[0]` or `[]` |
| `2`      | `[1]`         |
| `3`      | `[0, 1]`      |
| `3/2`    | `[-1, 1]`     |
| `1.5e`   | `[-1, 1]`     |
| `1\12`   | `[1/12]`      |
| `100.`   | `[1/12]`      |
| `6\13<3>`  | `[0, 6/13]`   |
| `1\9<3/2>` | `[-1/9, 1/9]` |

These arrays of `Fraction` instances are available through `timeMonzo.primeExponents`.

Because the runtime cannot store an exponent for every prime number, `TimeMonzo` also carries a multiplicative `.residual` for factors that do not fit into the prime-exponent array.

For example, `101/82` is likely to be stored as `[-2]` for the monzo and `101/41` as the residual. Zero is not a prime number, so `0` is stored as `[]` for the monzo and `0/1` as the residual. Negative numbers keep their sign in the residual as well.

### Real values

Anything that cannot be represented as a radical is coerced into a `TimeReal` instance. The numeric value is stored in `timeReal.value` as a floating-point `number`.

### Full examples

A value such as `1004/303 Hz` would be constructed like this:

```ts
import {Fraction} from 'xen-dev-utils';
import {TimeMonzo} from 'sonic-weave';

new TimeMonzo(
  new Fraction(-1),      // Units of Hz = s⁻¹
  [
    new Fraction(2),     // Factors 2 × 2
    new Fraction(-1),    // Factor 3⁻¹
  ],
  new Fraction(251, 101) // Factor 251/101
);
```

A value such as `3.141592653589793r s` would be constructed like this:

```ts
import {TimeReal} from 'sonic-weave';

new TimeReal(
  1, // Units of s = s¹
  Math.PI
);
```

## Interval type

The value types determine the echelon of an interval: whether it represents an absolute quantity such as a frequency, or a relative quantity such as a ratio.

The [Interval](https://xenharmonic-devs.github.io/sonic-weave/classes/Interval.html) class handles the domain semantics: for example, whether `x + y` adds the underlying `TimeMonzo` or `TimeReal` values directly, or combines them multiplicatively.

The main `Interval` properties are:

- `.value: TimeMonzo | TimeReal` — the underlying value or size of the interval.
- `.domain: 'linear' | 'logarithmic'` — the domain used by arithmetic operations.
- `.steps: number` — the number of edo-steps to apply when tempering the interval.
- `.node: IntervalLiteral | undefined` — a virtual AST node used for string representation.
- `.color: Color | undefined` — a CSS color stored as a [Color](https://xenharmonic-devs.github.io/sonic-weave/classes/Color.html) instance.
- `.label: string` — the interval label.
- `.trackingIds: Set<number>` — identifiers used to preserve ordering during operations such as octave reduction and sorting.

## Basis type

Fractional just intonation subgroup bases such as `2.3.13/5` use the [ValBasis](https://xenharmonic-devs.github.io/sonic-weave/classes/ValBasis.html) class.

The main `ValBasis` properties are:

- `.value: TimeMonzo[]` — the basis elements.
- `.ortho: TimeMonzo[]` — the unnormalized Gram-Schmidt basis elements.
- `.dual: TimeMonzo[]` — geometric duals of the basis elements.
- `.node: ValBasisLiteral | undefined` — a virtual AST node used for string representation.

## Val type

Equal-temperament mappings in the cologarithmic domain use the [Val](https://xenharmonic-devs.github.io/sonic-weave/classes/Val.html) class.

The main `Val` properties are:

- `.value: TimeMonzo` — the mapping entries, stored in `.value.primeExponents` when expressed in the standard prime basis.
- `.basis: ValBasis` — the subgroup basis that the val maps from. `.basis.equave` is the interval of equivalence for the temperament.
- `.node: CoIntervalLiteral | undefined` — a virtual AST node used for string representation.

## Embedding SonicWeave

Scale Workshop 3 embeds the `sonic-weave` package to execute SonicWeave source code. You can do the same in your own application.

### Parsing

The first step is to parse source text into an abstract syntax tree:

```ts
import {parseAST} from 'sonic-weave';

const source = '5/4;P4 + P4;2';

const program = parseAST(source);
/*
{
  type: "Program",
  body: [
    {
      type: "ExpressionStatement",
      expression: [Object ...],
    }, {
      type: "ExpressionStatement",
      expression: [Object ...],
    }, {
      type: "ExpressionStatement",
      expression: [Object ...],
    }
  ],
}
*/
```

### Execution

Next, execute the program, collect the resulting scale of `Interval` instances, and convert it into whatever representation your application needs:

```ts
import {parseAST, getSourceVisitor} from 'sonic-weave';

const source = '5/4;P4 + P4;2';
const program = parseAST(source);

const visitor = getSourceVisitor();
visitor.executeProgram(program);

const scale = visitor.currentScale;
const scaleCents = scale.map(interval => interval.totalCents());
// [386.3137138648349, 996.0899982692249, 1200]
```
