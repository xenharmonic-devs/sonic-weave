"Decanominal 2L 8s Pajara scale in 22edo"

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

// Store nominals by stripping the octaves and accidentals
const labels = map(note => str(note)[0]);

// Temper to 22 equal tones
22@

// Apply labels
label(labels)
