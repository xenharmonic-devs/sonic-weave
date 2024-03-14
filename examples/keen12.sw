"Keen[12] with semioctave note labels tuned to 56edo by interpolating between 12d and 22p."
// https://en.xen.wiki/w/Diaschismic_family#Keen

// Set root pitch for note labels.
C4 = mtof(60)

// Span one period of the rank-2 scale using an array comprehension.
// 2 /^ 2 is shorthand for sqrt(2).
[3^i rdc 2/^2 for i of [-2..3]]
sort()

// Stack to full octaves.
repeat()

// Use semioctave notation and pick the nominals for labels.
labelAbsoluteFJS

// See https://en.xen.wiki/w/Val#Sparse_Offset_Val_notation for the alternative notation for 12d.
// Doesn't actually matter here because we're stacking fifths, but communicates the intended interpretation.
// Same as 56@.
tune(12[v7]@, 22@, 2)
