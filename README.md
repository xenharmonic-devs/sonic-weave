# sonic-weave
The SonicWeave DSL for manipulating musical frequencies, ratios and equal temperaments

## Type system
The type system is fairly complex in order to accomodate all types of quantities that can refer to musical pitch or frequency.

There are three domains, multiple tiers and two echelons which can combine to a plethora of distinct types.

### Domains
Quantities can be *linear* or *logarithmic*. Linear quantities denote multiplication using `*` or `×` while logarithmic quantities achieve the same effect using `+`. This is a reflection of how the logarithm converts multiplication into addition.

In just intonation you might denote `16/9` as `4/3 * 4/3` if you wish to work in the linear domain or indicate the same frequency ratio as `m7` and split it into `P4 + P4` if logarithmic thinking suits you better.

The *cologarithmic* domain mostly comes up in tempering. An expression like `12@ · P4` evaluating to `5` indicates that the perfect fourth is tempered to 5 steps of 12-tone equal temperament. In cologarithmic vector form (a.k.a. *val*) `12@` corresponds to `<12 19]` while `P4` corresponds to the prime exponents `[2 -1>` (a.k.a. *monzo*) so the expression `12@ · P4` reads `<12 19] · [2 -1>` = `12 * 2 + 19 * (-1)` = `5`.

### Tiers
 * boolean (`true` or `false`)
 * natural (`1`, `-3`, `7`, `P8`, etc.)
 * decimal (`1.2`, `3.14`, `5/4`, etc.)
 * rational (`5/3`, `P4`, `n3^11`, etc.)
 * radical (`sqrt(2)`, `9\13<3>`, `n3`, etc.)
 * real (`2.718281828459045!`, `3.141592653589793!`, etc.)

### Echelons
Quantities can be absolute such as `440 Hz` and `C♮4`, or relative like `M2` and `7/5`.

Multiplication of absolute quantities is interpreted as their geometric average: `361 Hz * 529 Hz` corresponds to `437 Hz` in the scale.

Same goes for logarithmic absolute quantities: `C♮4 + E♮4` corresponds to `D♮4` in the scale.
