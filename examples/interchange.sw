"Various values to test the .swi interchange format"

// Need more components for that sqrt(29/16)
numComponents(20)

// MOS declaration and this comment should be ignored in .swi output
MOS 5L 2s

/*
Constants should also be ignored.
*/
const fif = P4ms
let foo = 123.4rc

C4 = 222 Hz

0 "rational zero" black
0r "real zero" rgb(1 1 1)
1 "rational unity" hsl(0deg 0% 100%)
1r "real unity" #aaa
-1 "negative rational unity"
-1r "negative real unity"
9007199254740991/9007199254740990
59049/57344 "Harrison's comma.\nIt is tempered out in \"septimal meantone\""
7^(1/9007199254740991)
11^9007199254740991
foo + foo
fif '12-TET "fifth"'
10\13<3>
23/16
sqrt(23/16)
29/16
sqrt(29/16)
2 "rational octave" red
2r "real octave" #ff0000
PI "pi"
PI * 1Hz "pi Hz"
10ms
440Hz
^G4
\gam5
inf "infinity"
-inf "negative infinity"
nan "not-a-number"
