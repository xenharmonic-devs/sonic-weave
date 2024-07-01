"Orgone rank-2 scale (4L 3s, POTE optimized)"

(* https://en.xen.wiki/w/Orgonia#Orgone *)
(* POTE generator: ~77/64 = 323.372 *)
const generator = 323.372

const up = 3
const down = 3
rank2(generator, up, down);

(* https://en.xen.wiki/w/4L_3s#Note_names *)
(* Diamond-MOS labels based on the symmetric mode *)
["K", "L", "M", "N", "O", "P", "J"]

(* P.S. You could also obtain the generator like this:
 * const generator = generatorsOf(POTE(65536/65219, @2.7.11))[1]
*)
