import { fnv1a } from "./hash"

/**
 * A single variant within an experiment.
 *
 * @template T - shape of the arbitrary payload carried by this variant
 *   (e.g. feature flags, copy strings, config values). Unlike the prototype
 *   this was extracted from, `payload` is intentionally generic rather than
 *   a hardcoded `headline: string` field — callers decide what a variant
 *   carries.
 */
export type Variant<T = unknown> = {
  /** Stable identifier for this variant within its experiment, e.g. "control" | "treatment". */
  id: string;
  /**
   * Relative weight used for bucket allocation. Weights are relative to the
   * sum of all variant weights in the experiment (they need not sum to 100
   * or 1) — e.g. two variants with weights 1 and 3 split traffic 25/75.
   */
  weight: number;
  /** Arbitrary data associated with this variant, returned to the caller on assignment. */
  payload?: T;
};

/**
 * A named experiment: an id plus the set of variants traffic may be split
 * across.
 *
 * @template T - payload type shared by this experiment's variants
 */
export type Experiment<T = unknown> = {
  /** Stable identifier for this experiment, e.g. "checkout-button-color". */
  id: string;
  /** The variants users may be assigned to. Must be non-empty. */
  variants: Variant<T>[];
};

/**
 * Deterministically assigns a user to one of an experiment's variants.
 *
 * The real implementation hashes `userId` (typically combined with the
 * experiment id, so the same user gets independent assignments across
 * different experiments) via {@link fnv1a} and maps the resulting number
 * into a weighted bucket derived from `experiment.variants[].weight`.
 *
 * Because assignment is a pure function of `(userId, experiment)`, it is:
 * - Stateless — no database or cookie is required to know a user's bucket.
 * - Reproducible — calling it again with the same inputs yields the same
 *   variant, which is what makes exposure/conversion tracking consistent.
 * - Resilient — logged-in ids survive cookie loss, unlike
 *   `Math.random()`-at-first-visit plus a cookie to remember it.
 *
 * @param userId - stable identifier for the user (cookie-backed uuid, logged-in user id, etc.)
 * @param experiment - the experiment to assign a variant from
 * @returns the {@link Variant} the user is assigned to
 */
export function assignVariant<T>(userId: string, experiment: Experiment<T>): Variant<T> {
  let HASH = fnv1a(`${experiment.id}:${userId}`);
  const SCALE = 10000;
  let bucket = HASH % SCALE;
  const totalWeight = experiment.variants.reduce((sum, variant) => sum + variant.weight, 0);
  let cumulativeWeight = 0;
  for (const variant of experiment.variants) {
    cumulativeWeight += variant.weight;
    if (bucket < (cumulativeWeight / totalWeight) * SCALE) {
      return variant;
    }
  }
  throw new Error("No variant found");
}
