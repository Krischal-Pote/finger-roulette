/**
 * Uniformly picks an index in `[0, count)`.
 *
 * Every finger has exactly the same chance, and the result does not depend on
 * where on the screen a finger is resting - position is only used for drawing.
 * Kept in one place so it is easy to swap for a hardware RNG later.
 */
export function pickRandomIndex(count: number): number {
  if (count <= 1) {
    return 0;
  }
  return Math.floor(Math.random() * count);
}
