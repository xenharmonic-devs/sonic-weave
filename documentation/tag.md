# SonicWeave template tags

This document describes the `sw`, `swr`, `sw$`, and `sw$r` tags for writing SonicWeave inside JavaScript or TypeScript with [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates).

# Table of Contents
1. [Basic example](#basic-example)
2. [Raison d'être](#raison-dêtre)
3. [The `sw` tag](#the-sw-tag)
4. [The `swr` tag](#the-swr-tag)
5. [The `sw$` and `sw$r` tags](#the-sw-and-swr-tags)

## Basic example

```ts
import {sw} from 'sonic-weave';

const myFifth = sw`3/2`;
console.log(myFifth.totalCents()); // 701.9550008653875

const myOctave = sw`${2}`;
console.log(myOctave.totalCents()); // 1200
```

## Raison d'être

Constructing intervals directly through the [JavaScript API](package.md) can be verbose. These template tags let you write [SonicWeave DSL](dsl.md) inline when generating or analyzing microtonal material from JavaScript or TypeScript.

## The `sw` tag

The `sw` tag evaluates JavaScript escape sequences such as `\n` before SonicWeave parses the template:

```ts
import {sw} from 'sonic-weave';

const ratio = sw`const fif = 3/2\nconst third = 6/5\nthird * fif`;
ratio.toFraction(); // new Fraction(9, 5)
ratio.toFraction().toFraction(); // "9/5"
```

Because JavaScript consumes backslashes first, SonicWeave backslash notation must be escaped as `\\` when you use `sw`. The `sof` operator and `drop` unary operator can make this easier to read:

```ts
import {sw} from 'sonic-weave';

const minorSeventh = sw`
  const fif = 7 sof 12;
  const third = 3 sof 12;
  third + fif;
`;
minorSeventh.totalCents(); // 1000
```

## The `swr` tag

The `swr` tag uses `String.raw` semantics, so backslash fractions (NEDO notation) can be written directly:

```ts
import {swr} from 'sonic-weave';

const minorSeventh = swr`
  const fif = 7\12;
  const third = 3\12;
  third + fif;
`;
minorSeventh.totalCents(); // 1000
```

## The `sw$` and `sw$r` tags

Use `sw$` when you want a full SonicWeave scale rather than a single expression result. `sw$r` is the raw-string counterpart.

```ts
import {sw$} from 'sonic-weave';

const tet5 = sw$`tet(5)`;
console.log(tet5.map(interval => interval.totalCents()));
// [240, 480, 720, 960, 1200]
```
