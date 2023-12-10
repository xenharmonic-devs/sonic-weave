/**
 * Greatest common divisor of two integers.
 * @param a The first integer.
 * @param b The second integer.
 * @returns The largest integer that divides a and b.
 */
export function bigGcd(a: bigint, b: bigint): bigint {
  if (!a) return b;
  if (!b) return a;
  while (true) {
    a %= b;
    if (!a) return b;
    b %= a;
    if (!b) return a;
  }
}

export function bigAbs(x: bigint) {
  return x < 0n ? -x : x;
}

/**
 * Least common multiple of two integers.
 * @param a The first integer.
 * @param b The second integer.
 * @returns The smallest integer that both a and b divide.
 */
export function bigLcm(a: bigint, b: bigint): bigint {
  return (bigAbs(a) / bigGcd(a, b)) * bigAbs(b);
}
