# SonicWeave - Technical overview
This documentation describes the .swi interchange format for transferring microtonal scales between programs

## Comments
Comments work as in JavaScript. Everything after `//` is ignored until the end of the line. Everything after `/*` is ignored until `*/` is encountered. (This includes other `/*` i.e. no nested grammar for comments.)
```c
// single line comment
/*
Comment
spanning
multiple
lines.
*/
```

## Empty lines
Empty lines and lines containing only whitespace are ignored.

## Strings
Strings are JSON encoded. They start and end with `"`. A literal `"` inside a string must be escaped with a backslash, etc..

## CSS colors
Valid CSS colors include:
  - Special token `niente` indicating no color
  - Named color e.g. `red` or `white`
  - 4-bit hexadecimal RGB triplet e.g. `#f02`
  - 8-bit hexadecimal RGB triplet e.g. `#ff01ab`
  - RGB(A) literal e.g `rgba(255 50% 0 / 50%)`
  - HSL(A) literal e.g. `hsl(-40deg 25% 70% / .5)`

## Scale title
The first string in the file indicates the title of the scale.
```c
"The scale title"
```

A scale title is mandatory. Untitled scales must provide an empty string.

## Unison frequency
The reference frequency is given with the syntax `1 = expr` where expressions is a valid absolute interval (described below).
```c
// Set reference frequency to 256 Hz
1 = [1 8>@Hz.2
```

Unison frequency is an optional field.

## Intervals
The label (a JSON encoded string) and the color (a CSS color or the special token `niente` for no color) are mandatory fields given in that order after an interval literal separated by spaces.

### Relative intervals
Relative interval are to be interpreted against the reference frequency if it is given.

#### 23-limit monzos
Intervals with prime factors below 29 are given as ket-vectors a.k.a. monzos starting with `[` and ending with `>`.

Below the labels indicate the meaning of each monzo:
```c
[> "1/1" niente
[-4 4 -1> "81/80" niente
[7/12> "7 sof 12" niente
[0 10/13> "10 sof 13 ed 3" #0f0
[1> "P8" white
```

#### Higher primes
Prime factors above 23 require an explicit subgroup basis given after `@` separated by periods `.`. Subgroup basis elements must be integers. No check is made to ensure that basis elements are actually prime numbers.
```c
[-1 1>@29.31 "31/29" niente
[-9 1>@2.899 "899/512" rgb(90% 80% 70% / 70%)
```

#### Non-primes
The special symbols `-1` and `0` indicate negative numbers and zero respectively. Their vector component must be `1` if present.
```c
[1>@0 "0" niente
[1 1>@-1.2 "-2" niente
```

#### Real values
Scalars that cannot be expressed as fractional monzos are given as *real* cents `rc`. The corresponding vector component is a floating-point literal. The special basis element `inf` indicates floating-point infinity. A negative unity component of `inf` indicates real zero.
```c
[-1>@inf "0r" niente
[0.>@rc "1r" niente
[1 1200.>@-1.rc "-2r" niente
[1981.7953553667824>@rc "PI" niente
[1>@inf "inf" niente
```

### Absolute pitches
The special basis element `Hz` indicates frequencies.
```c
[1 3 1 1>@Hz.2.5.11 "440 Hz" niente
[-1 2 -2>@Hz.2.5 "10ms" niente
```

A tool such as Scale Workshop normalizes durations (periods of oscillation) to frequencies, but the interchange standard support unnormalized values.

#### Real absolute pitches
The Hz exponent of real frequencies is a floating-point literal.
```c
[1. 1981.7953553667824>@Hz.rc "PI * 1Hz" niente
```

### Edosteps
To support tempering after interchanging data, the special `1°` basis element is used.
```c
[5>@1° "/P1" niente
```

### Not-a-number
The special combination `[1 1>@0.inf` indicates a value that can't be interpreted as an interval.
```c
[1 1>@0.inf "asin(2)" niente
```

## Example
See [examples/interchange.sw](https://github.com/xenharmonic-devs/sonic-weave/blob/main/examples/interchange.sw) for various extreme values supported by the original SonicWeave runtime.

```c
// Created using SonicWeave 0.1.0

"Various values to test the .swi interchange format"

1 = [1 1 1 1>@Hz.2.3.37

[1>@0 "rational zero" black
[-1>@inf "real zero" rgb(1 1 1)
[> "rational unity" hsl(0deg 0% 100%)
[0.>@rc "real unity" #aaa
[1>@-1 "negative rational unity" niente
[1 0.>@-1.rc "negative real unity" niente
[-1 -1 -1 -1 -1 1>@2.3.5.53.5664905191661.9007199254740991 "" niente
[-13 10 0 -1> "Harrison's comma.\nIt is tempered out in \"septimal meantone\"" niente
[0 0 0 1/9007199254740991> "" niente
[0 0 0 0 9007199254740991> "" niente
[246.80000000000007>@rc "" niente
[7/12> "12-TET \"fifth\"" niente
[0 10/13> "" niente
[-4 0 0 0 0 0 0 0 1> "" niente
[-2 0 0 0 0 0 0 0 1/2> "" niente
[-4 1>@2.29 "" niente
[-2 1/2>@2.29 "" niente
[1> "rational octave" red
[1200.>@rc "real octave" #ff0000
[1981.7953553667824>@rc "pi" niente
[1. 1981.7953553667824>@Hz.rc "pi Hz" niente
[-1 -2 -2>@Hz.2.5 "" niente
[1 3 1 1>@Hz.2.5.11 "" niente
[1 1 2 1>@1°.Hz.3.37 "" niente
[-5 1 5/2 1 1>@1°.Hz.2.3.37 "" niente
[1>@inf "infinity" niente
[1 1>@-1.inf "negative infinity" niente
[1 1>@0.inf "not-a-number" niente
```
