# SonicWeave template tag
This document describes the `sw` and `swr` tags used for writing SonicWeave inside JavaScript using [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates).


# Table of Contents
1. [Basic eample](#basic-example)
2. [Raison d'être](#raison-dêtre)
3. [The sw tag](#the-sw-tag)
4. [The swr tag](#the-swr-tag)
5. [The sw$ and sw$r tags](#the-sw-and-swr-tags)

## Basic example
```ts
import {sw} from 'sonic-weave';

const myFifth = sw`3/2`;
console.log(myFifth.totalCents());  // 701.9550008653875

const myOctave = sw`${2}`;
console.log(myOctave.totalCents());  // 1200
```

## Raison d'être
Constructing intervals using the [JavaScript API](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/package.md) is somewhat tedious so you can use [SonicWeave DSL](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/dsl.md) instead when writing JS scripts for generating and analysing microtonal scales.

## The sw tag
The `sw` tag evaluates escapes such as `\n` for a newline inside the tag:
```ts
import {sw} from 'sonic-weave';

const ratio = sw`const fif = 3/2\nconst third = 6/5\nthird * fif`;
ratio.toFraction(); // new Fraction(9, 5)
ratio.toFraction().toFraction(); // "9/5"
```

This means that backslashes must be entered doubled (`\\`). Luckily the binary operator `sof` and the unary operator `drop` exist to make the meaning of your code more clear at a glance.
```ts
import {sw} from 'sonic-weave';

const minorSeventh = sw`
  const fif = 7 sof 12;
  const third = 3 sof 12;
  third + fif;
`;
minorSeventh.totalCents(); // 1000
```

## The swr tag
The `swr` tag uses `String.raw` semantics which makes backslash fractions a.k.a. NEDO easier to enter:
```ts
import {swr} from 'sonic-weave';

const minorSeventh = swr`
  const fif = 7\12;
  const third = 3\12;
  third + fif;
`;
minorSeventh.totalCents(); // 1000
```

## The sw$ and sw$r tags
The `sw$` tag and it's raw `sw$r` counterpart produce arrays of intervals.
```ts
const tet5 = sw$`tet(5)`;
console.log(tet5.map(interval => interval.totalCents())); // [240, 480, 720, 960, 1200]
```
