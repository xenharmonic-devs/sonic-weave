# sonic-weave

SonicWeave is a domain-specific language for working with musical frequencies, ratios, and equal temperaments.

It powers the Scale Workshop 3 language, ships with a command-line interface, exposes a TypeScript-friendly npm package, and includes template tags for embedding SonicWeave programs inside JavaScript and TypeScript.

> Not to be confused with Sweave, the framework for mixing text and R code in literate programming workflows.

## Package overview

The `sonic-weave` package includes:

- The SonicWeave language used by Scale Workshop 3.
  - [Basic DSL guide](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/dsl.md)
  - [Intermediate DSL guide](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/intermediate-dsl.md)
  - [Advanced DSL guide](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/advanced-dsl.md)
  - [Built-in reference](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/BUILTIN.md)
- A [command-line interface](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/cli.md) for evaluating SonicWeave programs and exporting scales.
- A [TypeScript/npm package guide](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/package.md).
- A [template-tag guide](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/tag.md) for running SonicWeave programs inside JavaScript.
- A [SonicWeave Interchange format reference](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/interchange.md) for `.swi` files.
- A [technical overview](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/technical.md) that explains the language design and semantics.
- Additional reference material for [tempering](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/tempering.md) and [extra comma flavors](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/commas.md).

## Quick examples

### Harmonic segment from the 8th harmonic to the 16th

```ocaml
8::16
```

### 10-tone equal temperament

```ocaml
tet(10)
```

### The major scale in Pythagorean tuning

```ocaml
sort(3^[-1..5] rdc 2)
```

### Scale title, colors, and labels

```ocaml
"Japanese pentatonic koto scale, theoretical. Helmholtz/Ellis p.519, nr.110"

9/8 white "Major 2nd"
6/5 green "Minor 3rd"
3/2 white "Perfect 5th"
8/5 green "Minor 6th"
2   gray  "Root & Octave"
```

## Getting started

Install dependencies:

```sh
npm install
```

Run the test suite:

```sh
npm test
```

Start the CLI REPL:

```sh
npx sonic-weave
```

To exit the REPL, type `.exit` or press <kbd>Ctrl</kbd>+<kbd>C</kbd> twice.

## Additional resources

- [Xenharmonic Wiki](https://en.xen.wiki/)

## Special thanks

- Arsenii 0.5° - Co-developer / language feedback
- Inthar - Co-developer / language feedback
- Akselai - Quality assurance
- Godtone - Notation adviser / language feedback
- Joe Hildebrand - Grammar review
- Marc Sabat - Notation adviser

## Acknowledgments and inspiration

SonicWeave looks a bit like JavaScript with Python-style semantics, borrows Haskell-like ranges, and shares some goals with xen-calc, with a little Zig sprinkled on top.

- ECMAScript - Brendan Eich et al.
- Python - Guido van Rossum et al.
- Haskell - Lennart Augustsson et al.
- Zig - Andrew Kelley et al.
- OCaml - Xavier Leroy et al.
- NumPy - Travis Oliphant et al.
- Scala - Manuel Op de Coul
- Scale Workshop 1 - Sean Archibald et al.
- SQL - Donald D. Chamberlin et al.
- FJS - "misotanni"
- NFJS - Matthew Yacavone
- xen-calc - Matthew Yacavone
- Xenpaper - Damien Clarke
- Ups and downs notation - Kite Giedraitis
- S-expressions - "Godtone"
- Peg.js - David Majda et al.
- Peggy - Joe Hildebrand et al.
- Xenharmonic Wiki - community project
- Xenharmonic Alliance - community Discord / Facebook
