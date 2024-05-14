# SonicWeave CLI
This document describes the command-line interface of the sonic-weave package.

## REPL
The read-eval-print-loop is engaged by running `npx sonic-weave` if you have the package installed as a dependency or simply `sonic-weave` if installed globally.

After loading the standard library you will be greeted with a prompt.
```bash
$ npx sonic-weave
𝄞 █
```

### Input
The REPL works the same as normal SonicWeave programs with the exception that everything echoed is back.

Here's a simple major chord that would repeat every octave in a tool like Scale Workshop:
```js
𝄞 5/4
5/4
𝄞 3/2
3/2
𝄞 2
2
𝄞 █
```

To print the current scale use `print($)`:
```js
𝄞 print($)
[5/4, 3/2, 2]
niente
𝄞 █
```

The print command doesn't return anything which is represented by the `niente` value which does nothing to the scale.

If you had just evaluated the current scale with `$` it would double the contents so be careful:
```js
𝄞 $
[5/4, 3/2, 2, 5/4, 3/2, 2]
𝄞 █
```

To start over clear the scale:
```js
𝄞 clear()
niente
𝄞 print($)
[]
niente
𝄞 █
```

### Interval calculator
One way to use the REPL is as a handy calculator for adding together intervals. Here's a perfect fifth plus a major third:
```js
𝄞 P5 + M3
M7
𝄞 █
```
A major seventh as expected.

Here's the absolute pitch that's one major sixth above F4:
```js
𝄞 F4 + m6
D♭5
𝄞 █
```
The D-flat in octave 5.

What's the difference between A4 and E4?
```js
𝄞 A4 - E4
P4
𝄞 █
```
A perfect fourth.

## Conversion to other formats
You can convert a scale written in SonicWeave to [Scala .scl](https://www.huygens-fokker.org/scala/scl_format.html) by passing the filename as an argument to `sonic-weave`.
```bash
$ npx sonic-weave examples/harm8.sw
!Created using SonicWeave 0.0.20
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

The program prints the result to standard output so if you're on Linux use standard rerouting to produce an output file.
```bash
$ npx sonic-weave examples/barbados9.sw > /tmp/desert-island-rain.scl
$ cat /tmp/desert-island-rain.scl 
!Created using SonicWeave 0.0.33
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
 950.798722 Otave-complemented split 4th
 996.805112 Doubled 4th
 2 Octave
```

### SonicWeave Interchange format
The [.swi format](https://github.com/xenharmonic-devs/sonic-weave/blob/main/documentation/interchange.md) is suitable for data interchange between programs. It preserves the internal precision of the SonicWeave runtime.
```bash
$ npx sonic-weave examples/pajara10.sw --format swi
// Created using SonicWeave 0.0.33

"Decanominal 2L 8s Pajara scale in 22edo"

[1/11> "η"
[2/11> "D"
[3/11> "α"
[4/11> "E"
[1/2> "γ"
[13/22> "G"
[15/22> "δ"
[17/22> "A"
[19/22> "ε"
[1> "C"
```
