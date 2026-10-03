import { describe, expect, it } from "vitest";
import { ExperimentRegistry } from "../src/core/registry";
import type { Experiment } from "../src/core/assign";

function makeExperiment(id: string): Experiment<{ headline: string }> {
  return {
    id,
    variants: [
      { id: "control", weight: 1, payload: { headline: "A" } },
      { id: "treatment", weight: 1, payload: { headline: "B" } },
    ],
  };
}

describe("ExperimentRegistry", () => {
  it("registers and retrieves an experiment by id", () => {
    const registry = new ExperimentRegistry();
    const experiment = makeExperiment("exp-1");

    registry.register(experiment);

    expect(registry.get("exp-1")).toBe(experiment);
  });

  it("lists all registered experiments", () => {
    const registry = new ExperimentRegistry();
    const a = makeExperiment("exp-a");
    const b = makeExperiment("exp-b");

    registry.register(a);
    registry.register(b);

    expect(registry.list()).toEqual([a, b]);
  });

  it("returns an empty list when nothing is registered", () => {
    const registry = new ExperimentRegistry();
    expect(registry.list()).toEqual([]);
  });

  it("throws a clear error when registering a duplicate id", () => {
    const registry = new ExperimentRegistry();
    registry.register(makeExperiment("dup"));

    expect(() => registry.register(makeExperiment("dup"))).toThrowError(/dup/);
  });

  it("throws a clear error when looking up an unregistered id", () => {
    const registry = new ExperimentRegistry();
    expect(() => registry.get("missing")).toThrowError(/missing/);
  });
});
