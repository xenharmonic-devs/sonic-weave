# SonicWeave template tag
This document describes the `sw` and `swr` tags used for writing SonicWeave inside JavaScript using [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates).

## Basic example
```ts
import {sw} from 'sonic-weave';

const myFifth = sw`3/2`;
console.log(myFifth.totalCents())  // 701.9550008653875

const myOctave = sw`${2}`;
console.log(myOctave.totalCents())  // 1200
```

TODO: Actual description
