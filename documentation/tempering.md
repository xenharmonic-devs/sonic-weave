# Tempering scales in SonicWeave
This document describes intervals as *monzos* i.e. prime count vectors and their co-vectors known as *vals*. It also describes how implicit tempering works under the hood.

## Prime count vectors
Fractions are familiar but often impractical for advanced microtonal music theory. The syntonic comma might be somewhat simple at `81/80` but a stack of two commas already looks complicated `6561/6400` and stack of three is pretty much inscrutable at `531441/512000`.

Factored into prime numbers the comma is `(3^4)/(2^4 * 5^1)`or 2⁻⁴·3⁴·5⁻¹ which is notated as a vector or [ket](https://en.wikipedia.org/wiki/Bra%E2%80%93ket_notation) `[-4 4 -1>` known as a monzo in [regular temperament theory](https://en.xen.wiki/w/Regular_temperament).

Monzos are *logarithmic* quantities so a stack of two syntonic commas is `[-4 4 -1> + [-4 4 -1>` equal to `[-8 8 -2>` or simply `2 * [-4 4 -1>`.

### Dot product
The dot product between two monzos multiplies each component pair-wise and adds them up producing a linear scalar as a result. E.g. `[-1 1> ~dot [-3 1 1>` evaluates to `(-1)*(-3) + 1*1 + 0*1` (missing components are implicitly zero) or `4` in total.

You can also use the `·` operator in place of ASCII `dot`.

The dot product is always linear scalar valued and works regardless of the the domain of the operands. `3/2 ~dot 15/8` also evaluates to `4`.

## Co-vectors for mapping primes
In some sense the dot product measures how well two vectors are aligned with each other. To be more precise we measure the prime content using geometric inverses of the prime vectors that inhabit a new *co-logarithmic* domain.

The linear unary inverse operator has no logarithmic analogue so `%logarithmic(2)` evaluates to a co-vector that measures two's content in monzos, i.e. it is the *geometric inverse* of the *ket* `[1>`. We notate it correspondingly as a *bra* `<1]` and call these new objects *vals*.

By default a geometric inverse is only associated with the monzo it's the inverse of. To change the association use the `withEquave(...)` built-in function. To obtain the associated equave (as a linear quantity) use the `equaveOf(...)` function.

By default co-vectors are associated with the octave so the basis of the co-logarithmic domain consists of `%logarithmic(2)`, `withEquave(%logarithmic(3), 2)`, `withEquave(%logarithmic(5), 2)`, etc. so a val literal such as `<12 19 28]` means
```c
12 * %logarithmic(2) + 19 * withEquave(%logarithmic(3), 2) + 28 * withEquave(%logarithmic(5), 2)
```
if spelled out in full.

### Dot product
The dot product between a val and a monzo is straighforward enough: `<12 19 28] dot [-3 1 1>` evaluates to `12*(-3) + 19*1 + 28*1` or `11` in total.

### Tempering operator
The association with an equave is important in tempering to know which equal temperament we're targetting. The `tmpr` operator infers the number of divisions from `val dot equaveOf(val)`. It's also more graceful with a higher prime tail and leaves it alone.

The operation `v tmpr m` is equivalent to:
```c
((v dot relative(m)) \ (v dot equaveOf(v)) ed equaveOf(v)) ~* tail(relative(m), complexityOf(v, true))
```
E.g. `<12 19 28] tmpr 7/5` evaluates to `[-28/12 0 0 1>`.

In practice the higher prime tail is usually irrelevant and the vals have enough components to map everything. `12@ tmpr 7/5` is simply `6\12`. The equave association does come into play though: `withEquave(12@, 3) tmpr 7/5` evaluates to `6\19<3>` owing to the three's component being 19 here.

### Implicit tempering
Implicit tempering refers to what SonicWeave does to the scale when it encounters a val.

```c
5/4
3/2
2/1
12@
```

is the same as `$ = map(i => 12@ tmpr i, [5/4, 3/2, 2/1])`. Aren't you glad that you don't have to expand the dot products and everything just for a tiny shift in pitch?

## Why temper in the first place?
All of this "co-logarithmic" machinery seems overengineered compared to a simple `i => i by~ 1\17` mapping. However such a naïve approach fails to preserve consistent relationships between the intervals. In the 5-limit major scale from our basic example there's a perfect fourth between 5/4 and 5/3 but if we do `24:27:30:32:36:40:45:48 by~ 1\17` we get a `8\17` between them while the other fourths are more reasonable at `7\17`.

Choosing between `<17 27 39]` and `<17 27 40]` lets us decide if *all* major thirds should be `5\17` or *all* major sixths should be `13\17` and avoid confusing situations where relative intervals jump all over the place even if they happen to be more accurate individually when measured against the root note.

### Round only once
While a simple `i => i by~ step` doesn't work consistently we can still think of tempering as rounding each prime `2 by~ step`, `3 by~ step`, `5 by~ step` etc. and using those in place of the original primes.

Let's say we have this major chord as our scale `$ = [5/4, 3/2, 2]` and we wish to convert it to 12-tone equal temperament.

First we'll measure out the primes:
```javascript
2^-2 * 3^0 * 5^1
2^-1 * 3^1 * 5^0
2^+1 * 3^0 * 5^0
```

Then we replace each prime with their closest approximation:
```javascript
const st = 2^1/12 // One semitone

(2 by st)^-2 * (3 by st)^0 * (5 by st)^1
(2 by st)^-1 * (3 by st)^1 * (5 by st)^0
(2 by st)^+1 * (3 by st)^0 * (5 by st)^0
```
Which results in `$ = [2^4/12, 2^7/12, 2^12/12]`.

The the 5-limit val `12@2.3.5` = `<12 19 28]` can be obtained using this method as well:
```c
valFromPrimeArray(([2, 3, 5] by st) /_ st)
```
