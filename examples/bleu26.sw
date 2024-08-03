(* Prepare subgroup and temperament *)
const noFives = @2.3.7.11.13
const svalMapping =  [
  ⟨1 1 2 3 3],
  ⟨0 5 7 4 6]
]

(* Use CTE(svalMapping @noFives) if you want pure octaves *)
const bleu = Temperament(svalMapping @noFives)

(* Cannot use mappingBasis(bleu) here because untempered 12/11 is too wide for enneatonic MOS *)
const [period, generator] = generatorsOf(bleu)

(* Prepare notation based on the brightest mode of bleu[9] *)
MOS {
  8L 1s
  L = generator
  equave = period
}

(* Set root pitch *)
J_4 = 263 Hz

(* Notate bleu[26] *)
J&4
K@4
K_4
K&4
L@4
L_4
L&4
M@4
M_4
M&4
N@4
N_4
N&4
O@4
O_4
O&4
P@4
P_4
P&4
Q@4
Q_4
Q&4
R@4
R_4
R&4
J_5

(* No need to temper here because we used the actual generators instead of a (mapping) preimage. *)
