/**
 * FNV-1a (Fowler–Noll–Vo) hash function.
 *
 * Produces a deterministic 32-bit unsigned integer hash for a given string
 * input. This is the foundation of stateless variant assignment: hashing
 * `${experimentId}:${userId}` (or similar) yields a reproducible number that
 * can be mapped into a variant's weighted bucket without needing to persist
 * an assignment anywhere.
 *
 * Properties required of the real implementation:
 * - Deterministic: same input always produces the same output.
 * - Well-distributed: small changes in input should produce large, uniformly
 *   distributed changes in output (avalanche effect) so that variant
 *   assignment appears random across a user population.
 * - Fast and allocation-free: this may run on every request in middleware.
 *
 * @param input - the string to hash (e.g. `${experimentId}:${userId}`)
 * @returns an unsigned 32-bit integer hash of the input
 */
export function fnv1a(input: string): number {
  let HASH = 0x811C9DC5; // FNV-1a initial hash value
  const PRIME = 0x1000193;
  for (let i = 0; i < input.length; i++) {
    HASH ^= input.charCodeAt(i);
    HASH = Math.imul(HASH, PRIME);
  }
  return HASH >>> 0; // Ensure positive 32-bit integer
}
