# SonicWeave extra comma flavors

These inflections always go in the direction of the arrow so `6/5` ~ `m3^5h` instead of `m3_5` as in plain FJS.

# Table of Contents
1. [Helmholtz-Ellis 2020 + Richie's extension](#helmholtz-ellis-2020--richies-extension)
2. [Syntonic rastmic subchroma notation](#syntonic-rastmic-subchroma-notation)
3. [HEWM-53](#hewm-53)
4. [Semifourth bridges](#semifourth-bridges)
5. [Tone-splitter bridges](#tone-splitter-bridges)
6. [Lumi's irrational bridges](#lumis-irrational-bridges)
7. [Neutral bridges revisited](#neutral-bridges-revisited)
8. [Bridging highlights](#bridging-highlights)
9. [FJS revisited](#fjs-revisited)

## Helmholtz-Ellis 2020 + Richie's extension

Updated 2020 version by Marc Sabat and Thomas Nicholson as defined on [XenWiki](https://en.xen.wiki/w/Helmholtz-Ellis_notation) including [Richie's extension](https://en.xen.wiki/w/Richie%27s_HEJI_extensions).

| Prime | Comma       | Size in cents |
| ----- | ----------- | ------------- |
| `5h`  | `81/80`     | `+21.506`     |
| `7h`  | `64/63`     | `+27.264`     |
| `11h` | `33/32`     | `+53.273`     |
| `13h` | `27/26`     | `+65.337`     |
| `17h` | `2187/2176` | `+8.730`      |
| `19h` | `513/512`   | `+3.378`      |
| `23h` | `736/729`   | `+16.544`     |
| `29h` | `261/256`   | `+33.487`     |
| `31h` | `32/31`     | `+54.964`     |
| `37h` | `37/36`     | `+47.434`     |
| `41h` | `82/81`     | `+21.242`     |
| `43h` | `129/128`   | `+13.473`     |
| `47h` | `752/729`   | `+53.777`     |
| `53h` | `54/53`     | `+32.360`     |
| `59h` | `243/236`   | `+50.603`     |
| `61h` | `243/244`   | `+7.110`      |
| `67h` | `2187/2144` | `+34.378`     |
| `71h` | `72/71`     | `+24.213`     |
| `73h` | `73/72`     | `+23.879`     |
| `79h` | `79/81`     | `+43.283`     |
| `83h` | `256/249`   | `+47.998`     |
| `89h` | `729/712`   | `+40.850`     |

## Syntonic rastmic subchroma notation

These inflections follow [Aura's definitions](https://en.xen.wiki/w/Syntonic-rastmic_subchroma_notation) and combine nicely with implicit tempering for easy notation of many equal temperaments.

| Identifier | Name              | Comma           | Size in cents |
| ---------- | ----------------- | --------------- | ------------- |
| `1s`       | Demirasharp*      | `sqrt(243/242)` | `+3.570`      |
| `2s`       | Rasharp           | `243/242`       | `+7.139`      |
| `3s`       | Demisynsharp      | `sqrt(81/80)`   | `+10.753`     |
| `4s`       | Double rasharp    | `243/242 ^ 2`   | `+14.278`     |
| `6s`       | Synsharp          | `81/80`         | `+21.506`     |
| `8s`       | Quadruple rasharp | `243/242 ^ 4`   | `+28.556`     |
| `9s`       | Sesquisynsharp    | `81/80 ^ 3/2`   | `+32.259`     |

\*) Aura uses the *demi-* prefix while the rest of SonicWeave prefers *semi-* but this has no effect on the syntax.

The identifiers stack using concatenation. `C4^12s` is the same as `C4^1s^2s`.

These inflections are designed to be combined with the semisharp `t` and the semiflat `d` A.K.A. demisharp and demiflat to reach rationals. E.g. The tendodemisharp C4 is notated `Ct4^1s` while the artodemisharp C4 is notated `Ct4_1s`.

Remember that the relative counterparts of demisharp intervals are notated using `½d`, `n` and `½a`. E.g. the infra-augmented prime (`729/704`) is notated `½a1^1s` while the artoneutral third (`11/9`) is notated `n3_1s`.

Note that `^1s` coincides with `_11n` from FJS, while `^3s` is a novel inflection not found anywhere else.

Note that in general SonicWeave prefers to call `d1` a "diminished unison", but "diminished prime" should be used in this context. You can learn more about the associated nomenclature in the article on [Alpharabian tuning](https://en.xen.wiki/w/Alpharabian_tuning).

The use of the prefixes "semidiminished" (`sd`) and "semiaugmented" (`sa`) are discouraged when using Syntonic rastmic subchroma inflections.

## HEWM-53

A [variant](http://www.tonalsoft.com/enc/h/hewm.aspx) of Helmholtz-Ellis by Joseph Monzo and Daniel Wolf.

| Prime | Comma       | Size in cents |
| ----- | ----------- | ------------- |
| `5m`  | `81/80`     | `+21.506`     |
| `7m`  | `64/63`     | `+27.264`     |
| `11m` | `33/32`     | `+53.273`     |
| `13m` | `27/26`     | `+65.337`     |
| `17m` | `18/17`     | `+98.955`     |
| `19m` | `19/18`     | `+93.603`     |
| `23m` | `24/23`     | `+73.681`     |
| `29m` | `261/256`   | `+33.487`     |
| `31m` | `32/31`     | `+54.964`     |
| `37m` | `37/36`     | `+47.434`     |
| `41m` | `82/81`     | `+21.242`     |
| `43m` | `129/128`   | `+13.473`     |
| `47m` | `48/47`     | `+36.448`     |
| `53m` | `54/53`     | `+32.360`     |

## Semifourth bridges

The neutral FJS master algorithm can be generalized to semiquartals. Semifourths fill the spectrum unevenly and align poorly with primes so the inflections end up large in terms of size in cents. (A smaller radius of tolerance would make everything much more complex.)

| Prime  | Comma                 | Monzo                          | Size in cents |
| ------ | --------------------- | ------------------------------ | ------------- |
| `5q`   | `sqrt(25/27)`         | `[0 -3/2 1>`                   | `-66.619`     |
| `7q`   | `sqrt(49/48)`         | `[-2 -1/2 0 1>`                | `+17.848`     |
| `11q`  | `sqrt(121/108)`       | `[-1 -3/2 0 0 1>`              | `+98.385`     |
| `13q`  | `sqrt(169/192)`       | `[-3 -1/2 0 0 0 1>`            | `-110.45`     |
| `17q`  | `sqrt(70227/6553)`    | `[-8 5/2 0 0 0 0 1>`           | `+59.843`     |
| `19q`  | `sqrt(1083/1024)`     | `[-5 1/2 0 0 0 0 0 1>`         | `+48.491`     |
| `23q`  | `sqrt(14283/16384)`   | `[-7 3/2 0 0 0 0 0 0 1>`       | `-118.793`    |
| `29q`  | `sqrt(841/768)`       | `[-4 -1/2 1>@2.3.29`           | `+78.6`       |
| `31q`  | `sqrt(233523/262144)` | `[-9 5/2 1>@2.3.31`            | `-100.077`    |
| `37q`  | `sqrt(4107/4096)`     | `[-6 1/2 1>@2.3.37`            | `+2.322`      |

## Tone-splitter bridges

Tone-splitter master algorithm is basically the plain FJS master shifted by a semioctave (with the semiapotome as the radius of tolerance).

| Prime  | Comma               | Monzo                    | Size in cents |
| ------ | ------------------- | -------------------------| ------------- |
| `5t`   | `sqrt(2025/2048)`   | `[-11/2 2 1>`            | `-9.776`      |
| `7t`   | `sqrt(441/512)`     | `[-9/2 1 0 1>`           | `-129.219`    |
| `11t`  | `sqrt(121/128)`     | `[-7/2 0 0 0 1>`         | `-48.682`     |
| `13t`  | `sqrt(169/162)`     | `[-1/2 -2 0 0 0 1>`      | `+36.618`     |
| `17t`  | `sqrt(289/288)`     | `[-5/2 -1 0 0 0 0 1>`    | `+3.000`      |
| `19t`  | `sqrt(29241/32768)` | `[-15/2 2 0 0 0 0 0 1>`  | `-98.577`     |
| `23t`  | `sqrt(529/512)`     | `[-9/2 0 0 0 0 0 0 0 1>` | `+84.823`     |
| `29t`  | `sqrt(7569/8192)`   | `[-13/2 1 1>@2.3.29`     | `-68.468`     |
| `31t`  | `sqrt(8649/8192)`   | `[-13/2 1 1>@2.3.31`     | `+46.991`     |
| `37t`  | `sqrt(1369/1458)`   | `[-1/2 -3 1>@2.3.37`     | `-54.521`     |

## Lumi's irrational bridges

A random collection of inflections to bridge from irrationals to just intonation by Lumi Pakkanen.

Reasons for existence assume `C4 = 1/1`.

| Identifier | Name                                                        | Comma             | Size in cents | Raison d'être      |
| ---------- | ------------------------------------------------------------| ----------------- | ------------- | -------------------|
| `0l`       | ?                                                           | *                 | `+0.797`      | `15/14` ~ `sm2^0l` |
| `1l`       | ?                                                           | *                 | `+10.485`     | `11/10` ~ `sM2_1l` |
| `2l`       | [apotomic](https://en.xen.wiki/w/2187/2048)                 | `sqrt(2187/2048)` | `+56.843`     |   `9/8` ~ `n2^2l`  |
| `3l`       | [island](https://en.xen.wiki/w/676/675)                     | `sqrt(676/675)`   | `+1.281`      | `15/13` ~ `αd4_3l` |
| `4l`       | [varunismic](https://en.xen.wiki/w/Varunismic_temperaments) | `[-9/2 4 -2 1>`   | `+4.018`      | `25/14` ~ `ε4_4l`  |
| `5l`       | [jubilismic](https://en.xen.wiki/w/50/49)                   | `sqrt(50/49)`     | `+17.488`     |   `7/5` ~ `γ4_5l`  |
| `6l`       | [porcupine](https://en.xen.wiki/w/250/243)                  | `cbrt(250/243)`   | `+16.389`     |   `6/5` ~ `⅓m3_6l` |
| `7l`       | [pine](https://en.xen.wiki/w/4000/3993)                     | `cbrt(4000/3993)` | `+1.011`      | `11/10` ~ `⅓M2_7l` |
| `8l`       | ?                                                           | *                 | `+26.343`     |  `13/7` ~ `ζ4_8l`  |
| `9l`       | [amity](https://en.xen.wiki/w/Amity_comma)                  | `[9/5 -13/5 1>`   | `1.231`       |  `10/9` ~ `⅗M2^9l` |

The unnamed inflections are filler curiosities which should be revised by someone who is willing to do more research into irrational bridging.

The semiapotome `2l` is a handy companion of the neutral inflections. It's equivalent to a half-sharp, but allows for spellings that bring prime 3 more in line with the higher primes. For comparison with prime 5 we get these pairs of small and large intervals centered on the neutrals.

| Small   | Fraction   | Large   | Fraction  |
| ------- | ---------- | ------- | --------- |
| `n2_2l` | `256/243`  | `n2^2l` | `9/8`     |
| `n2_5n` | `16/15`    | `n2^5n` | `10/9`    |
|         |            |         |           |
| `n3_2l` | `32/27`    | `n3^2l` | `81/64`   |
| `n3_5n` | `6/5`      | `n3^5n` | `5/4`     |
|         |            |         |           |
| `n4_2l` | `4/3`      | `n4^2l` | `729/512` |
| `n4_5n` | `27/20`    | `n4^5n` | `45/32`   |
|         |            |         |           |
| `n5_2l` | `1024/729` | `n5^2l` | `3/2`     |
| `n5_5n` | `64/45`    | `n5^5n` | `40/27`   |
|         |            |         |           |
| `n6_2l` | `128/81`   | `n6^2l` | `27/16`   |
| `n6_5n` | `8/5`      | `n6^5n` | `5/3`     |
|         |            |         |           |
| `n7_2l` | `16/9`     | `n7^2l` | `243/128` |
| `n7_5n` | `9/5`      | `n7^5n` | `15/8`    |

If for some reason you find this concept appealing the vocalized names of intervals should follow [Color notation](https://en.xen.wiki/w/Color_notation) but in place of *white* we have *microwave* for the smaller intervals and *x-ray* for the larger ones. So `4/3` is a *'microwave-fourth'*, *'mu-fourth'* or *'µ4'* while `3/2` is an *'x-ray-fifth'*, *'ex-fifth'* or *'x5'*.

## Neutral bridges revisited

Neutral commas are repeat here for your convenience.

| Prime  | Comma                   | Monzo                       | Size in cents |
| ------ | ----------------------- | ----------------------------| ------------- |
| `5n`   | `sqrt(25/24)`           | `[-3/2 -1/2 1>`             | `+35.336`     |
| `7n`   | `sqrt(54/49)`           | `[-1/2 -3/2 0 1>`           | `-84.107`     |
| `11n`  | `sqrt(242/243)`         | `[1/2 -5/2 0 0 1>`          | `-3.570`      |
| `13n`  | `sqrt(507/512)`         | `[-9/2 1/2 0 0 0 1>`        | `-8.495`      |
| `17n`  | `sqrt(8192/7803)`       | `[-13/2 3/2 0 0 0 0 1>`     | `-42.112`     |
| `19n`  | `sqrt(384/361)`         | `[-7/2 -1/2 0 0 0 0 0 1>`   | `-53.464`     |
| `23n`  | `sqrt(529/486)`         | `[-1/2 -5/2 0 0 0 0 0 0 1>` | `73.387`      |
| `29n`  | `sqrt(864/841)`         | `[-5/2 -3/2 1>@2.3.29`      | `-23.355`     |
| `31n`  | `sqrt(2101707/2097152)` | `[-21/2 7/2 1>@2.3.31`      | `+1.878`      |
| `37n`  | `sqrt(175232/177147)`   | `[7/2 -11/2 1>@2.3.37`      | `-9.408`      |

## Bridging highlights

[Cole](https://en.xen.wiki/w/User:2%5E67-1) recommends the following set of bridging commas:

| Prime | Comma        | Cents     | Reduced harmonic | Spelling   | Against C4 |
| ----- | ------------ | --------- | ---------------- | ---------- | ---------- |
| `5n`  | `√25/24`     | `+35.336` | `5/4`            | `n3^5n`    | `Ed4^5n`   |
| `7q`  | `√49/48`     | `+17.848` | `7/4`            | `n6.5^7q`  | `εd4^7q`   |
| `11t` | `√121/128`   | `-48.682` | `11/8`           | `P4.5^11t` | `γ♮4^11t`  |
| `13n` | `√507/512`   | `-8.495`  | `13/8`           | `n6^13n`   | `Ad4^13n`  |
| `17t` | `√289/288`   | `+3.000`  | `17/16`          | `P1.5^17t` | `η♮4^17t`  |
| `19n` | `√361/384`   | `-53.464` | `19/16`          | `n3^19n`   | `Ed4^19n`  |
| `23t` | `√529/512`   | `+28.274` | `23/16`          | `P4.5^23t` | `γ♮4^23t`  |
| `29q` | `√841/768`   | `+78.600` | `29/16`          | `n6.5^29q` | `εd4^29q`  |
| `31f` | `31/32`*     | `-54.964` | `31/16`          | `P8^31f`   | `C5^31f`   |
| `37q` | `√4107/4096` | `+2.322`  | `37/32`          | `n2.5^37q` | `αd4^37q`  |

These choices are based on [hemipyth](https://en.xen.wiki/w/Hemipyth)[10] 4|4(2). A comma is constructed from nearest note to the harmonic.

*) This means that 31 is not associated with an irrational bridge. The simplest irrational choice would be `√8649/8192` for `31/16` = `P7.5^31t` (`ζ♮4^31t`).

## FJS revisited

Rational commas are repeated here for your convenience.

| Prime       | Comma       | Monzo                  | Size in cents  |
| ----------- | ----------- | ---------------------- | -------------- |
| `5`         | `80/81`     | `[4 -4 1>`             | `-21.506`      |
| `7`         | `63/64`     | `[-6 2 0 1>`           | `-27.264`      |
| `11`        | `33/32`     | `[-5 1 0 0 1>`         | `+53.273`      |
| `13`        | `1053/1024` | `[-10 4 0 0 0 1>`      | `+48.348`      |
| `17`        | `4131/4096` | `[-12 5 0 0 0 0 1>`    | `+14.73`       |
| `19`        | `513/512`   | `[-9 3 0 0 0 0 0 1>`   | `+3.378`       |
| `23`        | `736/729`   | `[5 -6 0 0 0 0 0 0 1>` | `+16.544`      |
| `29`        | `261/256`   | `[-8 2 1>@2.3.29`      | `+33.487`      |
| `31`, `31f` | `31/32`     | `[-5 0 1>@2.3.31`      | `-54.964`      |
| `31c`       | `248/243`   | `[3 -5 1>@2.3.31`      | `+35.261`      |
| `37`        | `37/36`     | `[-2 -2 1>@2.3.37`     | `+47.434`      |
