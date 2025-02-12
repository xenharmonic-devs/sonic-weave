# sonic-weave
SonicWeave is a Domain Specific Language for manipulating musical frequencies, ratios and equal temperaments.

Not to be confused with the Sweave flexible framework for mixing text and R code for automatic document generation.

## Package overview
The `sonic-weave` package is many things.

- The [language](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/dsl.md) of Scale Workshop 3
  - [Basic level](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/dsl.md)
  - [Intermediate level](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/intermediate-dsl.md)
  - [Advanced level](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/advanced-dsl.md)
  - [Built-in reference](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/BUILTIN.md)
- A [command-line interface](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/cli.md) for calculating musical quantities
- A TypeScript compatible [npm package](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/package.md)
- A [template language](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/tag.md) for running SonicWeave programs inside JavaScript
- An [interchange format](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/interchange.md) (extension `.swi`)

You may also be interested in the [technical overview](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/technical.md) of SonicWeave as a programming language.

Appendix: [tempering](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/tempering.md), [commas](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/commas.md)

## Highlights
Harmonic segment from the 8th harmonic to the 16th (repeating at the octave).
```ocaml
8::16
```

10-tone equal temperament
```ocaml
tet(10)
```

The major scale in Pythagorean tuning i.e. 3-limit just intonation.
```ocaml
sort(3^[-1..5] rdc 2)
```

Scale title, colors and labels.
```ocaml
"Japanese pentatonic koto scale, theoretical. Helmholz/Ellis p.519, nr.110"

9/8 white "Major 2nd"
6/5 green "Minor 3rd"
3/2 white "Perfect 5th"
8/5 green "Minor 6th"
2   gray  "Root & Octave"
```

## Additional resources
* [Xenharmonic Wiki](https://en.xen.wiki/)

## Development and Project Setup

Install project.
```sh
npm install
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm test
```

### Run the CLI

```sh
npx sonic-weave
```

To exit, type `.exit` or press Ctrl-C twice.


## Special thanks
* Arsenii A. - Co-developer / Language feedback
* Inthar - Co-developer / Language feedback
* Akselai - Quality assurance
* Godtone - Notation adviser / Language feedback
* Joe Hildebrand - Grammar review
* Marc Sabat - Notation adviser

## Acknowledgments / inspiration
SonicWeave looks like Javascript with Python semantics, has Haskell ranges and operates similar to xen-calc with some Zig sprinkled on top.

* ECMAScript - Brendan Eich et. al.
* Python - Guido van Rossum et. al.
* Haskell - Lennart Augustsson et. al.
* Zig - Andrew Kelley et. al.
* OCaml - Xavier Leroy et. al.
* NumPy - Travis Oliphant et. al.
* Scala - Manuel Op de Coul
* Scale Workshop 1 - Sean Archibald et. al.
* SQL - Donald D. Chamberlin et. al.
* FJS - "misotanni"
* NFJS - Matthew Yacavone
* Xen-calc - Matthew Yacavone
* Xenpaper - Damien Clarke
* Ups and downs notation - Kite Giedraitis
* S-expressions - "Godtone"
* Peg.js - David Majda et. al.
* Peggy - Joe Hildebrand et. al.
* Xenharmonic Wiki - (community project)
* Xenharmonic Alliance - (community Discord / Facebook)
