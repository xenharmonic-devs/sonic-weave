# Tempering scales in SonicWeave
This document describes the art and science of tempering from the perspective of [regular temperaments](https://en.xen.wiki/w/Regular_temperament).

# Table of Contents
1. [Preimages](#preimages)
    1. [Rank-2 temperaments](#rank-2-temperaments)
        1. [Size hints](#size-hints)
        2. [Multiple periods](#multiple-periods)
    2. [Parallelotopes](#parallelotopes)
    3. [Respelling](#respelling)
        1. [Multiple commas](#multiple-commas)
2. [Vals in detail](#vals-in-detail)
    1. [Val basis](#val-basis)
    2. [Warts shorthand notation](#warts-shorthand-notation)
    3. [Sparse offset vals](#sparse-offset-vals)
    4. [Named basis](#named-basis)
    5. [errorTE](#errorte)
    6. [tune](#tune)
    7. [tune3 and tune4](#tune3-and-tune4)
    8. [Discovering vals](#discovering-vals)
3. [Advanced tempering](#advanced-tempering)
    1. [Higher rank temperaments](#higher-rank-temperaments)
    2. [Tempering out a comma](#tempering-out-a-comma)
    3. [Maintaining pure octaves](#maintaining-pure-octaves)
    4. [CTE](#cte)
    5. [Explicit prime limit](#explicit-prime-limit)
    6. [Tempering out multiple commas](#tempering-out-multiple-commas)
    7. [Combining multiple cvals](#combining-multiple-vals)
    8. [Subgroup weights](#subgroup-weights)
    9. [Mapping generators](#mapping-generators)
    10. [Tempered generators](#tempered-generators)
    11. [Respelling using temperaments](#respelling-using-temperaments)
    12. [Testing temperament equality](#testing-temperament-equality)
1. [Technical details](#technical-details)
    1. [Prime count vectors](#prime-count-vectors)
        1. [Monzo dot product](#monzo-dot-product)
    2. [Co-vectors for mapping primes](#co-vectors-for-mapping-primes)
        1. [Val-monzo dot product](#val-monzo-dot-product)
        2. [Tempering operator](#tempering-operator)
        3. [Implicit tempering](#implicit-tempering)
    3. [Why temper in the first place?](#why-temper-in-the-first-place)
        1. [Round only once](#round-only-once)

## Preimages
[Preimage](https://en.xen.wiki/w/Preimage) is basically just a fancy word for just intonation when the intention is to slightly adjust the tuning to make some nearby intervals coincide.

A handy technique for preserving information from a preimage is by attaching string representation of intervals as their labels.
```ocaml
"Pentatonic scale with JI labels"
9/8
4/3
3/2
9/5
2/1
(* Attach strings as labels *)
i => i str(i)
12@
```

An alternative to `i => i str(i)` is `vstr($)` which produces an array of strings from the current scale that then get assigned as labels. The result is is the same:
```ocaml
"Pentatonic scale with JI labels"
2\12 "9/8"
5\12 "4/3"
7\12 "3/2"
10\12 "9/5"
12\12 "2/1"
```

Now we can more easily remember that `7\12` corresponds to `3/2` in this temperament when playing the scale in a tool like Scale Workshop.

### Rank-2 temperaments
Rank-2 temperaments have two independent intervals that completely define everything available in a specific tuning that supports the temperament. Xenharmonic Wiki lists many such temperaments. For example the details for [meantone](https://en.xen.wiki/w/Meantone_family#Meantone) tell us that the intervals for a CTE tuning are ~2 = 1\1, ~3/2 = 697.2143, in other words `2/1` spanning a whole octave `1\1` and `3/2` that's tuned a little flat of pure. We also learn that `81` is a suitable equal temperament from the associated optimal ET sequence.

We can generate a preimage using the `rank2` helper function and temper to 81-tone equal.
```ocaml
"Lydian meantone[7]"
rank2(3/2, 6)
81@
```

This gives us a Lydian scale as we only specified how many `3/2` *up* we wished to generate. To make a Dorian scale we also need to specify a *down* value.

```ocaml
"Dorian meantone[7]"
(* Parameters for generator, up, down, period and number of periods. *)
rank2(3/2, 3, 3, 2/1, 1)
81@
```

#### Size hints
Sometimes a tuning does so much damage to the generating intervals that octave reduction of the pure intervals no longer matches up with the tempered versions.

Let's look at [porcupine](https://en.xen.wiki/w/Porcupine_family#Porcupine) generated by ~2 = 1\1, ~10/9 = 164.1659. Trying to make an 8-note scale ends in disaster.

```ocaml
"Failed octopus"
rank2(10/9, 7)
15@
```

The first interval in the scale becomes a `-1\15` which is not what we want. By providing the latter part of "~10/9 = 164.1659" as a size hint, we can fix this. (Although strictly speaking we should provide `10/9 tmpr 15@` = `2\15` as the hint here.)

```ocaml
"Octopus (porcupine[8])"
rank2(10/9, 7, 0, 2/1, 1, 164.1659, 1\1)
15@
```

We could of course provide `164.1659` directly, but the lack of a preimage obscures our intentions with the temperament and we can't use the `vstr($)` trick to create informative labels.

```ocaml
"CTE tuned octopus"
rank2(164.1659, 7)
```

#### Multiple periods
The details for [diaschismic](https://en.xen.wiki/w/Diaschismic_family#Srutal_aka_diaschismic) tell us that ~45/32 = 1\2 only spans half an octave. We need to specify that we need two periods in our preimage.

```ocaml
"Diaschismic[12]"
rank2(3/2, 10, 0, 45/32, 2)
80@
```

The *up* value is spread between the two periods. We want 3/2 to go up 5 times per period i.e. 10 times in total.

### Parallelotopes
Higher rank temperament have more structure and more than 2 step sizes compared rank-2.

Looking at [gamelismic](https://en.xen.wiki/w/Gamelismic_family#Gamelismic) we learn that the generators are ~2, ~8/7, ~5. We can span a parallelotope that extends along these "directions".

```ocaml
"Gamelismic[10] along 8/7 and 5/1"
parallelotope([8/7, 5], [4, 1])
190@
```

### Respelling
If we actually look at the preimage for our porcupine scale:
```ocaml
10/9
100/81
1000/729
10000/6561
100000/59049
1000000/531441
10000000/4782969
2
```
We might be more reminded of a Christmas tree than skim any useful information off of it.

The porcupine comma is `250/243` and we can use the `respell` helper to make our ratios simpler through multiplication and divisions by the comma:
```ocaml
rank2(10/9, 7, 0, 2/1, 1, 164.1659)
respell(250/243)
```
results in
```ocaml
10/9
6/5
4/3
36/25
8/5
16/9
48/25
2
```
Much better! Now we learn that the scale has an approximate `6/5` minor third and a `4/3` fourth in there too.

Because the comma is tempered out, this scale sounds the same when a `15@` or a `22@` is appended to the end.

#### Multiple commas
[Miracle](https://en.xen.wiki/w/Gamelismic_clan#Miracle) is generated by ~15/14 and tempers out two commas 225/224 and 1029/1024 which we can pass to `respell` as an array.
```ocaml
"Miracle[10] preimage"
        15/14
       225/196
      3375/2744
     50625/38416
    759375/537824
   11390625/7529536
  170859375/105413504
 2562890625/1475789056
38443359375/20661046784
          2
respell([225/224, 1029/1024])
```
which gives us something more manageable:
```ocaml
"Miracle[10] preimage"
15/14
8/7
60/49
21/16
7/5
3/2
8/5
12/7
64/35
2
```
which we could temper by tagging a `72@` at the end.

Sometimes the simplest spelling is hard to find. You can increase the search radius by passing an integer larger than `1` as the second argument to `respell`. E.g. above `60/49` could be further simplified to `49/40` by using `respell([225/224, 1029/1024], 2)`.

## Vals in detail
If you look inside a val such as `12@` by doing `print(simplify(12@))` or `warn(simplify(12@))` inside Scale Workshop, you get `<12 19 28 34 42 44 49 51 54]` or
```ocaml
<12 19 28 34 42 44 49 51 54 58 59 63 64 65 67 69 71 71 73 74 74 76 77 78 79]
```
respectively. The length of the mapping depends on `numComponents()`.

When doing basic tempering within reasonable prime limits, this hardly matters, but affects how vals interact mutually so it's good to keep in mind.

### Val basis

Ranges of primes can be given as a basis e.g. `@5..13` is the same as `@5.7.11.13`. The first prime defaults to `2` e.g. `@..7` is the 7-limit `@2.3.5.7` or `@.7` if you wish to save on keystrokes.

With an explicit subgroup val components are given for each basis elements:

```ocaml
⟨2 3 4]@Hz.9/7.7/8
```

Defines a co-vector `v` such that `v dot (1 Hz)` evaluates to `2`, `v dot 9/7` evaluates to `3` and `v dot 7/8` evaluates to `4`. The first basis element defines the interval of equivalence, but here it's meaningless because `1 Hz` is not a relative interval so this particular val cannot be used for tempering.

All vals have an implicit `1` as the `1°`'s component and this cannot be changed.

Basis elements such as `0`, `-1` or `inf` don't map one-to-one so the dot product is undefined and thus these are not legal val basis elements even though with monzos they're perfectly reasonable. `rc` is also an illegal basis element due to real numbers being too dense to separate into unique prime factors.

### Warts shorthand notation
A val like `12@` is written in [Warts shorthand](https://en.xen.wiki/w/Val#Shorthand_notation). It could be written as `12p@` too to underline the fact that it's the patent val i.e. all prime harmonics are mapped to their closest approximations within the equal temperament.

We already saw that `simplify` converts warts to co-vectors. The converse can be achieved using the `warts` helper. E.g
```ocaml
print(warts(<5 8 12]))
```
prints `5@2.3.5` to the console. The basis is given explicitly because it differs from the ambient prime limit. Another syntax for this 5-limit basis is `@.5`.

The *warts* in wart notation are adjustments to primes where each prime is associated with a letter of the alphabet.
```ocaml
print(warts(5@.5 + 12@.5))
```
prints `17c@2.3.5` because the mapping for prime five (letter c) is the second most accurate: `<17 27 40]` vs. the patent val `<17 27 39]`.

The first basis element defines the equave of the equal temperament. E.g. the mapping corresponding to equalized Bohlen-Pierce tuning is given by `13@3.5.7` or `b13@`. (Underlying runtime values are `withBasis(<0 13 19 23], @3.5.7)` and `withBasis(<8 13 19 23 ...], @3.2.5.7..97)` respectively.)

If the basis contains non-primes they're referred using letters from `q` onwards in order of appearance e.g. the second-most accurate mapping for 8/7 in 6 equal divisions of 3/2 is notated `r6q@8/7.3/2`.

### Sparse offset vals
Warts are relatively easy for a computer to calculate, but introduce a cognitive load when you need remember which way the primes are tuned to figure out if the wart points in the wider or narrower direction.

[SOV shorthand](https://en.xen.wiki/w/Val#Sparse_Offset_Val_notation) makes the direction and the affected prime explicit. `SOV(17c@)` is `17[^5]@` making it clear that the mapping for prime 5 is made wider. (Conversely `v` indicates a narrower mapping.)

The equave can be specified in square brackets before the SOV literal `SOV(b13@)` is `[3]13[]@`.

Wart notation runs out of letters in huge prime limits, but SOV uses the primes themselves in notation be they actual primes or merely formal basis elements.

### Named basis
For vals to be comparable and compatible in addition the basis must agree. Typing out something like `@2.7.11` can get tiring so named variables are allowed after the `@` separator in val literals.

```ocaml
77/64
16/11
7/4
2/1

const S = @2.7.11
11@S + 26@S
```

### errorTE
In order to compare the quality of vals w.r.t. just intonation SonicWeave provides the `errorTE` helper that measures [RMS TE error](https://en.xen.wiki/w/Tenney-Euclidean_temperament_measures#TE_error) in cents. Providing explicit subgroups is highly recommended so that irrelevant higher primes do not interfere with the measure.

### tune
The helper `tune` takes an array of vals and tries to find a combination that's closer to just intonation, effectively performing constrained Tenney-Euclidean optimization (CTE). E.g. `tune([12@.5, 19@.5])` finds 31p. Given a large search radius `tune([5@.5, 7@.5], 200)` finds an equal temperament in the thousands that's virtually indistinguishable from the true meantone CTE tuning.

With more than two linearly independent vals the process corresponds to higher rank CTE optimization.

### Discovering vals
Every just intonation subgroup has a generalized patent val sequence that dances around approximations to the just intonation point i.e. the perfectly pure tuning.

The next entry in the sequence can be obtained using `nextGPV` e.g. `nextGPV(12@.7)` evaluates to 12dd.

To discover GPVs that support a temperament given in terms of the commas it tempers out you can use `supportingGPVs` e.g. `supportingGPVs(12@.5, 3125/3072)` gives an array of 13b, 16p, 19p, 22p and 25p. The initial val 12p doesn't need to support the the temperament (in this case [magic](https://en.xen.wiki/w/Magic_family#Magic)) and only serves as the low cutoff point.

Multiple commas may be given in an array e.g. `supportingGPVs(19@.7, [225/224, 245/243], 6)` gives an array of 6 vals instead of the default 5: 19p, 22p, 25d, 35dd, 38d and 41p supporting [septimal magic](https://en.xen.wiki/w/Magic_family#Septimal_magic). (The comma list comes from a factorization `225/224 ^ 2 * 245/243` of the magic comma.)

## Advanced tempering
Vals are technically powerful enough to describe any pure-octaves tuning to sufficient precision, but it's nice to have a tuning scheme that can stretch octaves too in order to get even closer to just intonation while still supporting a given temperament.

### Higher rank temperaments
The `Temperament` type combines of multiple vals into a specific optimal tuning. The syntax is:
```ocaml
Temperament(
  [
    valA,
    valB,
    valC,
  ] @subgroupBasis,
  subgroupWeights,
  pureOctavesFlag
)
```
where the weights and the boolean flag for normalizing octaves are optional. The resulting temperament only retains features shared by all of the equal temperaments passed in, giving it more wiggle room to be tuned closer to just intonation.

We can also approach tempering from the other direction by doing progressive damage to the pure tuning by equating commas with unison. The syntax is:
```ocaml
commaList(
  [
    commaA,
    commaB,
  ],
  @subgroupBasis,
  subgroupWeights,
  pureOctavesFlag,
  fullPrimeLimitFlag
)
```
where all the arguments after the array of commas are optional. If no subgroup is given, a minimal prime subgroup is inferred based on the commas. If the full prime limit flag is `true`, a `niente` basis is inferred to be the maximum prime limit of the list.

### Tempering out a comma
[Tenney-Euclidean tuning](https://en.xen.wiki/w/Tenney-Euclidean_tuning) is a commonly used scheme for adjusting intervals in such a way that some of them coincide. This can help tame the complexity of pure just intonation. It is desirable to make these tiny adjustments with minimal damage.

To make two intervals such as `9/8` and `10/9` coincide we *temper out* their geometric difference `81/80` using the `TE` helper.
```ocaml
(* Generate Pythagorean major scale *)
rank2(3/2, 5, 1)

(* Temper out the syntonic comma 81/80 *)
TE(9/8 ÷ 10/9)
```

Now the `81/64` major thirds sounds more like `5/4` and the major chord resembles `4:5:6`. Compared to just intonation the scale maintains the nice property that there are only two step sizes.

The downside is that the scale is now expressed in terms of real cents and all structural information such as the stack of pure fifths has been lost.

Here `TE(81/80)` is equivalent to `commaList([81/80])` because the syntonic comma features all 3 primes of the 5-limit, but in general `TE` always uses the full prime limit.


### Maintaining pure octaves
TE optimal tunings damage all primes including the octave which is often undesirable. The naïve solution is to stretch the tuning so that octaves are 1200 cents again.

```ocaml
"POTE meantone[7]"
rank2(3/2, 5, 1)
POTE(81/80)
```

### CTE
[Constrained tunings](https://en.xen.wiki/w/Constrained_tuning) have more finesse when it comes to maintaining the size of important intervals like the octave. While strictly speaking SonicWeave doesn't support CTE exactly it gets close enough by assigning a large weight to the octave.

```ocaml
"Near-CTE meantone[7]"
rank2(3/2, 5, 1)
(* Temper out the syntonic comma while making octaves 5000 times more important than anything else. *)
CTE(81/80)
```

### Explicit prime limit
The prime limit of the [limma](https://en.xen.wiki/w/256/243) is 3, but usually [blackwood](https://en.xen.wiki/w/Limmic_temperaments#5-limit_.28blackwood.29) is thought of as a 5-limit temperament. This cannot be inferred from the comma so it must be explicitly specified.
```ocaml
"TE blackwood[10]"
rank2(5, 5, 0, 1\5, 5)
TE(256/243, 5)
```

### Tempering out multiple commas
Multiple commas can be tempered out by passing in an array to `commaList`. Multiple primes can be weighted by passing in an array as the third argument.

```ocaml
"Unimarv[19] with a focus on near-pure octaves and undecimal harmony"

(* Unimarv[19] 5-limit transversal *)
25/24
16/15
9/8
75/64
6/5
5/4
32/25
4/3
45/32
64/45
3/2
25/16
8/5
5/3
128/75
16/9
15/8
48/25
2/1

commaList(
  (* Temper out the marvel comma and the keenanisma *)
  [225/224, 385/384],
  (* Explicit 11-limit *)
  @.11,
  (* Give 1000 times more weight to octaves and 10 times more weight to prime 11. *)
  [1000, 1, 1, 1, 10],
)
```

### Combining multiple vals
Linear combinations of vals share the same temperament. In the 11-limit unimarv can also be expressed as the 19 & 22 temperament. In SonicWeave we must be explicit about the subgroup `@2.3.5.7.11` or `@.11` for short and pass the vals as arguments to `TE`.

```ocaml
"Marveldene but using unimarv for no reason"

(* Generate duodene *)
eulerGenus(675)

(* TE unimarv 19 & 22 *)
TE([19@.11, 22@.11])
```

It is strongly advised to use an explicit subgroup when combining vals in `TE`. Depending on the runtime the ambient subgroup might contain tens of primes, most of little interest, only wasting compute and hurting the low prime accuracy of the tuning.

### Subgroup weights
Because vals always come with a subgroup basis the weights are associated with it instead of the actual primes when combining vals.
```ocaml
"Barbados[5]"
15/13
4/3
3/2
26/15
2/1
(** Importance weights:
 * 2/1: 200%
 * 3/1: 100%
 * 13/5: 300%
 *)
Temperament([5@2.3.13/5, 9@2.3.13/5], [2, 1, 3])
```

### Mapping generators
Temperaments are stored in a canonical form where the mapping is in [Hermite normal form](https://en.wikipedia.org/wiki/Hermite_normal_form) but rows that result in descending mapping generators are sign-flipped to tune the generators positive.

The mapping generator basis can be accessed using the `mappingBasis` helper and subsequently used to denote monzos in that basis e.g.
```ocaml
(* Convert final result to cents. *)
defer cents(£, 3)

(* Create TE sengic temperament and schedule the scale to be tempered using it. *)
const sengic = commaList(686/675)
defer sengic

(* Obtain the canonical mapping generators and re-interpret monzos in this basis. *)
const M = mappingBasis(sengic)
defer @M

(* These are all @2.3.15/14 *)
[0 0 1>
[0 0 2>
[0 0 3>
[2 -1 0>
[-1 1 0>
[1 0 -3>
[1 0 -2>
[1 0 -1>
[1 0 0>
```

Expands out to
```ocaml
const sengic = Temperament(
  [
    ⟨1 0 2 1],
    ⟨0 1 0 1],
    ⟨0 0 3 2],
  ]
)
const M = @2.3.15/14
129.798
259.597
389.395
495.746
704.013
810.364
940.162
1069.961
1199.759
```

### Tempered generators
If you don't care about the preimage, you can obtain the tempered generators directly.
```ocaml
(* Create temperament and obtain necessary data. *)
const augmented = Temperament([12@.5, 27@.5])
const [period, generator] = generatorsOf(augmented)
const numPeriods = periodsOf(augmented)
const [up, down] = [2 * numPeriods, numPeriods]

(* Generate TE optimized scale directly. *)
rank2(generator, up, down, period, numPeriods)
cents(£, 3)
```
Resulting in:
```ocaml
93.133
212.751
305.885
399.018
492.151
611.769
704.902
798.035
891.168
1010.787
1103.92
1197.053
```

### Respelling using temperaments
Passing a temperament to `respell` can be a handy way of generating preimages of equal temperaments.
```ocaml
(* Generate 13-tone equal scale. *)
tet(13)

(* Convert everything to just intonation according to the rank-1 13p@2.9.11 temperament. *)
respell(Temperament(13p@2.9.11))

(* Convert to linear domain. *)
fraction
```

This is the result:
```ocaml
128/121
9/8
144/121
11/9
128/99
11/8
16/11
99/64
18/11
121/72
16/9
121/64
2/1
```

### Testing temperament equality
You can test if two temperaments are the same using `==`. E.g.
```ocaml
(* Check if miracle from vals is the same as miracle from S-expressions. *)
Temperament([10@.7, 21@.7]) == commaList([S15, S7-S8])
```
evaluates to `true`.

# Technical details
This section describes intervals as *monzos* i.e. prime count vectors and their co-vectors known as *vals*. It also describes how implicit tempering works under the hood.

## Prime count vectors
Fractions are familiar but often impractical for advanced microtonal music theory. The syntonic comma might be somewhat simple at `81/80` but a stack of two commas already looks complicated `6561/6400` and stack of three is pretty much inscrutable at `531441/512000`.

Factored into prime numbers the comma is `(3^4)/(2^4 * 5^1)`or 2⁻⁴·3⁴·5⁻¹ which is notated as a vector or [ket](https://en.wikipedia.org/wiki/Bra%E2%80%93ket_notation) `[-4 4 -1>` known as a monzo in [regular temperament theory](https://en.xen.wiki/w/Regular_temperament).

Monzos are *logarithmic* quantities so a stack of two syntonic commas is `[-4 4 -1> + [-4 4 -1>` equal to `[-8 8 -2>` or simply `2 * [-4 4 -1>`.

### Monzo dot product
The dot product between two monzos multiplies each component pair-wise and adds them up producing a linear scalar as a result. E.g. `[-1 1> ~dot [-3 1 1>` evaluates to `(-1)*(-3) + 1*1 + 0*1` (missing components are implicitly zero) or `4` in total.

You can also use the `·` operator in place of ASCII `dot`.

The dot product is always linear scalar valued and works regardless of the the domain of the operands. `3/2 ~dot 15/8` also evaluates to `4`.

## Co-vectors for mapping primes
In some sense the dot product measures how well two vectors are aligned with each other. To be more precise we measure the prime content using geometric inverses of the prime vectors that inhabit a new *co-logarithmic* domain.

The linear unary inverse operator has no logarithmic analogue so `%logarithmic(2)` evaluates to a co-vector that measures two's content in monzos, i.e. it is the *geometric inverse* of the *ket* `[1>`. We notate it correspondingly as a *bra* `<1]` and call these new objects *vals*.

By default a geometric inverse is only associated with the monzo it's the inverse of. To change the association use the `withBasis(...)` built-in function. To obtain the associated basis use the `basisOf(...)` function.

By default co-vectors are associated with the octave so the basis of the co-logarithmic domain consists of `withBasis(%logarithmic(2), @)`, `withBasis(%logarithmic(3), @)`, `withBasis(%logarithmic(5), @)`, etc. so a val literal such as `<12 19 28]` means
```ocaml
12 * withBasis(%logarithmic(2), @2.3.5) + 19 * withBasis(%logarithmic(3), @2.3.5) + 28 * withBasis(%logarithmic(5), @2.3.5)
```
if spelled out in full.

### Val-monzo dot product
The dot product between a val and a monzo is straightforward enough: `<12 19 28] dot [-3 1 1>` evaluates to `12*(-3) + 19*1 + 28*1` or `11` in total.

### Tempering operator
The association with an equave is important in tempering to know which equal temperament we're targeting. The `tmpr` operator infers the number of divisions from `val dot basisOf(val)[0]`. It's also more graceful with a higher prime tail and leaves it alone.

The operation `v tmpr m` is equivalent to:
```ocaml
((v dot relative(m)) \ (v dot basisOf(v)[0]) ed basisOf(v)[0]) ~* tail(relative(m), complexityOf(v, true))
```
E.g. `<12 19 28] tmpr 7/5` evaluates to `[-28/12 0 0 1>`.

In practice the higher prime tail is usually irrelevant and the vals have enough components to map everything. `12@ tmpr 7/5` is simply `6\12`. The equave association does come into play though: `withBasis(12@, @3.2.5.7) tmpr 7/5` evaluates to `6\19<3>` owing to the three's component being 19 here.

### Implicit tempering
Implicit tempering refers to what SonicWeave does to the scale when it encounters a val.

```ocaml
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
```ocaml
2^-2 * 3^0 * 5^1
2^-1 * 3^1 * 5^0
2^+1 * 3^0 * 5^0
```

Then we replace each prime with their closest approximation:
```ocaml
const st = 2^1/12 (* One semitone *)

(2 by st)^-2 * (3 by st)^0 * (5 by st)^1
(2 by st)^-1 * (3 by st)^1 * (5 by st)^0
(2 by st)^+1 * (3 by st)^0 * (5 by st)^0
```
Which results in `$ = [2^4/12, 2^7/12, 2^12/12]`.

The the 5-limit val `12@2.3.5` = `<12 19 28]` can be obtained using this method as well:
```ocaml
valFromPrimeArray(([2, 3, 5] by st) /_ st)
```
