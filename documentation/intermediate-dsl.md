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
