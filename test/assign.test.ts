import { describe, expect, it } from "vitest";
import { fnv1a } from "../src/core/hash";
import { assignVariant } from "../src/core/assign";
import type { Experiment } from "../src/core/assign";

function makeExperiment(id: string, weights: number[]): Experiment<unknown> {
  return {
    id,
    variants: weights.map((weight, i) => ({ id: `variant-${i}`, weight })),
  };
}

describe("fnv1a", () => {
  it("is deterministic for a given input", () => {
    expect(fnv1a("hello")).toBe(fnv1a("hello"));
  });

  it("is well-distributed across inputs", () => {
    const BUCKET_COUNT = 10;
    const SAMPLE_SIZE = 20000;
    const buckets = new Array(BUCKET_COUNT).fill(0);

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      buckets[fnv1a(`user-${i}`) % BUCKET_COUNT]++;
    }

    const expected = SAMPLE_SIZE / BUCKET_COUNT;
    for (const count of buckets) {
      expect(count).toBeGreaterThan(expected * 0.85);
      expect(count).toBeLessThan(expected * 1.15);
    }
  });
});

describe("assignVariant", () => {
  it("is deterministic for a given (userId, experiment)", () => {
    const experiment = makeExperiment("exp-1", [1, 1]);

    const first = assignVariant("user-42", experiment);
    const second = assignVariant("user-42", experiment);

    expect(first).toBe(second);
  });

  it("respects variant weights over a large sample", () => {
    const experiment = makeExperiment("weighted-exp", [1, 3]); // intended 25/75 split
    const counts = { "variant-0": 0, "variant-1": 0 };
    const SAMPLE_SIZE = 20000;

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const variant = assignVariant(`user-${i}`, experiment);
      counts[variant.id as "variant-0" | "variant-1"]++;
    }

    expect(counts["variant-0"] / SAMPLE_SIZE).toBeCloseTo(0.25, 1);
    expect(counts["variant-1"] / SAMPLE_SIZE).toBeCloseTo(0.75, 1);
  });

  it("assigns independently across different experiment ids", () => {
    const experimentA = makeExperiment("exp-a", [1, 1]);
    const experimentB = makeExperiment("exp-b", [1, 1]);
    const SAMPLE_SIZE = 500;
    let matches = 0;

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const userId = `user-${i}`;
      const a = assignVariant(userId, experimentA);
      const b = assignVariant(userId, experimentB);
      if (a.id === b.id) matches++;
    }

    // Independent 50/50 assignments should overlap ~50% of the time by
    // chance. A ratio near 100% would mean the experiment id isn't actually
    // influencing the hash input.
    expect(matches / SAMPLE_SIZE).toBeGreaterThan(0.3);
    expect(matches / SAMPLE_SIZE).toBeLessThan(0.7);
  });
});
