# SonicWeave CLI

This document describes the command-line interface provided by the `sonic-weave` package.

## Requirements

- Node.js 20.0.0 or newer

# Table of Contents
1. [REPL](#repl)
    1. [Input](#input)
    2. [Interval calculator](#interval-calculator)
2. [Converting files](#converting-files)
    1. [Scala `.scl`](#scala-scl)
    2. [SonicWeave Interchange `.swi`](#sonicweave-interchange-swi)

## REPL

Start the read-eval-print loop with `npx sonic-weave` when the package is installed locally, or with `sonic-weave` when it is installed globally.

If your install skips optional dependencies and `commander` is unavailable, the CLI exits with a clear error message describing how to install dependencies.

After the standard library loads, you will see the prompt:

```bash
$ npx sonic-weave
𝄞 █
```

### Input

The REPL evaluates SonicWeave statements the same way a source file does, but it also prints the result of the final expression you enter.

Here is a simple major chord that would repeat at the octave in a tool like Scale Workshop:

```js
𝄞 5/4
5/4
𝄞 3/2
3/2
𝄞 2
2
𝄞 █
```

To print the current scale, use `print($)`:

```js
𝄞 print($)
[5/4, 3/2, 2]
niente
𝄞 █
```

`print()` does not return a musical value, so the REPL shows `niente`.

If you evaluate `$` directly, the current scale is pushed back onto itself, so you will duplicate its contents:

```js
𝄞 $
[5/4, 3/2, 2, 5/4, 3/2, 2]
𝄞 █
```

To start over, clear the scale:

```js
𝄞 clear()
niente
𝄞 print($)
[]
niente
𝄞 █
```

### Interval calculator

The REPL also works well as a quick calculator for interval arithmetic.

A perfect fifth plus a major third gives a major seventh:

```js
𝄞 P5 + M3
M7
𝄞 █
```

An absolute pitch one minor sixth above `F4` is `D♭5`:

```js
𝄞 F4 + m6
D♭5
𝄞 █
```

The difference between `A4` and `E4` is a perfect fourth:

```js
𝄞 A4 - E4
P4
𝄞 █
```

## Converting files

You can also pass a SonicWeave source file to the CLI and convert the resulting scale to another format.

Use `--help` to see the currently supported options:

```bash
$ sonic-weave --help
Usage: sonic-weave [options] [file]

CLI for the SonicWeave DSL for manipulating musical frequencies, ratios and
 equal temperaments

Arguments:
  file                   File containing source code for a musical scale
                         written in SonicWeave

Options:
  -V, --version          output the version number
  -f, --format <format>  output format (default: "scl")
  -h, --help             display help for command
```

### Scala `.scl`

By default, the CLI writes Scala `.scl` output to standard output:

```bash
$ npx sonic-weave examples/harm8.sw
!Created using SonicWeave 0.11.0
!
Untitled tuning
 8
!
 9/8
 5/4
 11/8
 3/2
 13/8
 7/4
 15/8
 2
```

Because the result is printed to standard output, you can redirect it into a file:

```bash
$ npx sonic-weave examples/barbados9.sw > /tmp/desert-island-rain.scl
$ cat /tmp/desert-island-rain.scl
!Created using SonicWeave 0.11.0
!
Enneatonic 5L 4s subset of 313edo used in Sevish's track Desert Island Rain
 9
!
 203.194888 Octave-reduced doubled 5th
 249.201278 Split 4th
 452.396166
 498.402556 Perfect 4th
 701.597444 Perfect 5th
 747.603834
 950.798722 Octave-complemented split 4th
 996.805112 Doubled 4th
 2 Octave
```

### SonicWeave Interchange `.swi`

Use `--format swi` to export the [SonicWeave Interchange format](interchange.md), which preserves the runtime's internal precision:

```bash
$ npx sonic-weave examples/pajara10.sw --format swi
(* Created using SonicWeave 0.11.0 *)

"Decanominal 2L 8s Pajara scale in 22edo"

[1/11> "η" niente
[2/11> "D" niente
[3/11> "α" niente
[4/11> "E" niente
[1/2> "γ" niente
[13/22> "G" niente
[15/22> "δ" niente
[17/22> "A" niente
[19/22> "ε" niente
[1> "C" niente
```
