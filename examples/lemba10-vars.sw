"Lemba[10] notated using variables"

// Generate justly intoned nominals
// Prefer stacking 8/7, but stack one down to make M = 7/4
const nominals = rank2(8/7, 3, 1)

// Destructure nominals into individual variables
const [J, K, L, M, N] = nominals

// The period is a semioctave notated using ^K
^ = sqrt(2) / K

// Work around limitations of the grammar
const [vJ, vK, vL, vM, vN] = v{nominals}

vJ
J
^J
K
^K
L
^L
M
vN
N

// Temper to 26-tone equal temperament (with minimal loss in accuracy)
26@
