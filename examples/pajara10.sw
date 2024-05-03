"Decanominal 2L 8s Pajara scale in 22edo"

// Temper to 22 equal tones
defer 22@

// First period
C4 = 1/1
γ4
D4
δ4
E4

// Second period
ζ4
G4
η4
A4
α4

// Repeat at the octave
C5

// Label using nominals by stripping the octaves and accidentals
map(note => str(note)[0])
