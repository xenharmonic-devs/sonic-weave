# SonicWeave npm package
This document describes the `sonic-weave` npm package.

## Type reference
The auto-generated TypeScript documentation is hosted on the project [Github pages](https://xenharmonic-devs.github.io/sonic-weave/).

## Value types
The two main value types in sonic-weave are [TimeMonzo](https://xenharmonic-devs.github.io/sonic-weave/classes/TimeMonzo.html) and [TimeReal](https://xenharmonic-devs.github.io/sonic-weave/classes/TimeReal.html), representing radical and real values respectively. The "time" prefix refers to the fact that the values are associated with units of time, usually Hz = s⁻¹.

The exponent of the second's unit is accessible as `timeMonzo.timeExponent`. In `TimeMonzo` instances the time exponent is a `Fraction` while in `TimeReal` instances it is a plain `number`.

### Radical values
As a mathematical tier radical numbers are between rational and algebraic: They are solutions to the equation x^n = p/q where n, p and q are integers. Musically such a number corresponds to one step of n-tone equal temperament with [equave](https://en.xen.wiki/w/Equave) p/q.

Rational numbers also musically known as [just intonation](https://en.xen.wiki/w/Just_intonation) correspond to cases where n = 1.

Few examples from equal temperaments:
- One step of 12-tone equal temperament or 100¢ has n = 12, p = 2 and q = 1
- Two steps or 200¢ has n = 6, p = 2, q = 1
- Three steps or 300¢ has n = 4, p = 2, q = 1
- Four steps or 400¢ has n = 3, p = 2, q = 1
- Five steps or 500¢ has n = 12, p = 32, q = 1
- Six steps of 13 equal divisions of the [tritave](https://en.xen.wiki/w/3/1) around 877.825 cents has n = 13, p = 3, q = 1
- One step of 9 [equal divisions of the fifth](https://en.xen.wiki/w/EDF) has n = 9, p = 3, q = 2

In practice the runtime doesn't store n, p or q, but instead uses an array of prime exponents called (fractional) monzos. The gamut of representable values is the same, but the memory layout suits computers better.

Some examples of prime exponent arrays corresponding to SonicWeave literals:
| Literal  | Monzo         |
| -------- | ------------- |
| 1        | `[0]` or `[]` |
| 2        | `[1]`         |
| 3        | `[0, 1]`      |
| 3/2      | `[-1, 1]`     |
| 1.5e     | `[-1, 1]`     |
| 1\12     | `[1/12]`      |
| 100.     | `[1/12]`      |
| 6\13<3>  | `[0, 6/13]`   |
| 1\9<3/2> | `[-1/9, 1/9]` |

These arrays of `Fraction` instances are accessible through `timeMonzo.primeExponents`.

Memory constraints also mean that we cannot store an exponent for every prime number. The final `.residual` property of `TimeMonzo` corresponds to a multiplicative residue that didn't fit into the array of exponents of small primes.

A value like `101/82` is likely to be stored as `[-2]` for the monzo and `101/41` as the residual. Zero is not prime number so `0` is stored as `[]` for the monzo and `0/1` as the residual. Negative numbers hold their sign in the residual part as well.

### Real values
Anything that cannot be represented as a radical is coerced to a `TimeReal` instance by the runtime. The value is stored as a floating-point `number` in `timeReal.value`.

### Full examples

A value such as `1004/303 Hz` would be constructed as follows:
```ts
import {Fraction} from 'xen-dev-utils';
import {TimeMonzo} from 'sonic-weave';

new TimeMonzo(
  new Fraction(-1),      // Units of Hz = s⁻¹
  [
    new Fraction(2),     // Factors 2 × 2
    new Fraction(-1)     // Factor 3⁻¹
  ],
  new Fraction(251, 101) // Factor 251/101
);
```

A value such as `3.141592653589793r s` would be constructed as follows:
```ts
import {TimeReal} from 'sonic-weave';

new TimeReal(
  1, // Units of s = s¹
  Math.PI
);
```

## Interval type
The value types take care of the echelon of an interval i.e. wether or not it represents an absolute frequency or a relative frequency ratio.

The [Interval](https://xenharmonic-devs.github.io/sonic-weave/classes/Interval.html) class takes care of the domain i.e. if `x + y` means to add the underlying `TimeMonzo` or `TimeReal` values or to multiply them together.

The properties of `Interval` are as follows:

- `.value: TimeMonzo | TimeReal` the underlying value/size of the interval
- `.domain: 'linear' | 'logarithmic'` the domain of operations
- `.steps: number` the number of edosteps to apply when tempering this interval
- `.node: IntervalLiteral | undefined` a virtual node in the abstract syntax tree used for string representation
- `.color: Color | undefined` a CSS color as a [Color](https://xenharmonic-devs.github.io/sonic-weave/classes/Color.html) instance
- `.label: string` the label of the interval
- `.trackingIds: Set<number>` a set of identifiers used to track the order of intervals during e.g. octave reduction and sorting

## Val type
The cologarithmic domain housing equal temperament mappings uses the [Val](https://xenharmonic-devs.github.io/sonic-weave/classes/Val.html) class.

The properties of `Val` are as follows:

- `.value: TimeMonzo` the mapping entries as `.value.primeExponents`
- `.equave: TimeMonzo` the equave of the equal temperament
- `.node: IntervalLiteral | undefined` as virtual AST node used for string representation
