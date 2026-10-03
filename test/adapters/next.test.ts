import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createAbMiddleware } from "../../src/adapters/next";
import { ExperimentRegistry } from "../../src/core/registry";
import type { Experiment } from "../../src/core/assign";

function makeRegistry(experiments: Experiment<unknown>[]): ExperimentRegistry {
  const registry = new ExperimentRegistry();
  for (const experiment of experiments) {
    registry.register(experiment);
  }
  return registry;
}

function makeRequest(cookieHeader?: string): NextRequest {
  return new NextRequest("https://example.com/", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

const EXPERIMENT: Experiment<unknown> = {
  id: "checkout-button-color",
  variants: [
    { id: "control", weight: 1 },
    { id: "treatment", weight: 1 },
  ],
};

describe("createAbMiddleware", () => {
  it("assigns a new userId cookie when none exists", () => {
    const middleware = createAbMiddleware({ registry: makeRegistry([EXPERIMENT]) });

    const response = middleware(makeRequest());

    const uidCookie = response.cookies.get("ab_uid");
    expect(uidCookie?.value).toBeTruthy();
  });

  it("reuses an existing userId cookie instead of generating a new one", () => {
    const middleware = createAbMiddleware({ registry: makeRegistry([EXPERIMENT]) });

    const response = middleware(makeRequest("ab_uid=existing-user"));

    expect(response.cookies.get("ab_uid")?.value).toBe("existing-user");
  });

  it("sets a variant assignment cookie for each registered experiment", () => {
    const middleware = createAbMiddleware({ registry: makeRegistry([EXPERIMENT]) });

    const response = middleware(makeRequest());

    const variantCookie = response.cookies.get("ab_checkout-button-color");
    expect(["control", "treatment"]).toContain(variantCookie?.value);
  });

  it("reuses a valid existing variant cookie instead of reassigning", () => {
    const middleware = createAbMiddleware({ registry: makeRegistry([EXPERIMENT]) });

    const response = middleware(
      makeRequest("ab_uid=existing-user; ab_checkout-button-color=treatment")
    );

    expect(response.cookies.get("ab_checkout-button-color")?.value).toBe("treatment");
  });

  it("ignores an invalid existing variant cookie and reassigns", () => {
    const middleware = createAbMiddleware({ registry: makeRegistry([EXPERIMENT]) });

    const response = middleware(
      makeRequest("ab_uid=existing-user; ab_checkout-button-color=not-a-real-variant")
    );

    const variantCookie = response.cookies.get("ab_checkout-button-color");
    expect(["control", "treatment"]).toContain(variantCookie?.value);
    expect(variantCookie?.value).not.toBe("not-a-real-variant");
  });

  it("is deterministic: the same userId and experiment always assign the same variant", () => {
    const middleware = createAbMiddleware({ registry: makeRegistry([EXPERIMENT]) });

    const first = middleware(makeRequest("ab_uid=same-user"));
    const second = middleware(makeRequest("ab_uid=same-user"));

    expect(first.cookies.get("ab_checkout-button-color")?.value).toBe(
      second.cookies.get("ab_checkout-button-color")?.value
    );
  });

  it("sets an independent cookie per registered experiment", () => {
    const second: Experiment<unknown> = {
      id: "pricing-cta",
      variants: [
        { id: "control", weight: 1 },
        { id: "treatment", weight: 1 },
      ],
    };
    const middleware = createAbMiddleware({ registry: makeRegistry([EXPERIMENT, second]) });

    const response = middleware(makeRequest());

    expect(["control", "treatment"]).toContain(
      response.cookies.get("ab_checkout-button-color")?.value
    );
    expect(["control", "treatment"]).toContain(response.cookies.get("ab_pricing-cta")?.value);
  });

  it("respects a custom userCookieName", () => {
    const middleware = createAbMiddleware({
      registry: makeRegistry([EXPERIMENT]),
      userCookieName: "custom_uid",
    });

    const response = middleware(makeRequest("custom_uid=existing-user"));

    expect(response.cookies.get("custom_uid")?.value).toBe("existing-user");
    expect(response.cookies.get("ab_uid")).toBeUndefined();
  });

  it("respects a custom experimentCookieName", () => {
    const middleware = createAbMiddleware({
      registry: makeRegistry([EXPERIMENT]),
      experimentCookieName: (experimentId) => `exp_${experimentId}`,
    });

    const response = middleware(makeRequest());

    expect(["control", "treatment"]).toContain(
      response.cookies.get("exp_checkout-button-color")?.value
    );
    expect(response.cookies.get("ab_checkout-button-color")).toBeUndefined();
  });

  it("respects a custom maxAgeSeconds and path", () => {
    const middleware = createAbMiddleware({
      registry: makeRegistry([EXPERIMENT]),
      maxAgeSeconds: 60,
      path: "/custom",
    });

    const response = middleware(makeRequest());

    const uidCookie = response.cookies.get("ab_uid");
    expect(uidCookie?.maxAge).toBe(60);
    expect(uidCookie?.path).toBe("/custom");
  });
});
