"(A)GS(7/6, 8/7) over 2^1/2 (Semitonismic POTE)"

csgs([7/6, 8/7], 3, 2^1/2, 2)
(* Temper out the semitonisma. TE optimal. *)
TE([289/288])
(* De-stretch the octave. (Pure Octaves TE) *)
£ ~^ (2 ~/_ £[-1])
