import { describe, expect, it } from "vitest";
import {
  createInMemorySink,
  trackConversion,
  trackExposure,
  type ConversionEvent,
  type ExposureEvent,
} from "../src/core/events";

describe("createInMemorySink", () => {
  it("captures exposure events sent through the sink", () => {
    const { sink, getEvents } = createInMemorySink();

    sink({
      type: "exposure",
      experimentId: "exp-1",
      variantId: "control",
      userId: "user-1",
      ts: 1000,
    });

    expect(getEvents()).toEqual([
      {
        type: "exposure",
        experimentId: "exp-1",
        variantId: "control",
        userId: "user-1",
        ts: 1000,
      },
    ]);
  });

  it("captures conversion events sent through the sink", () => {
    const { sink, getEvents } = createInMemorySink();

    sink({
      type: "conversion",
      experimentId: "exp-1",
      variantId: "treatment",
      userId: "user-2",
      ts: 2000,
    });

    expect(getEvents()).toEqual([
      {
        type: "conversion",
        experimentId: "exp-1",
        variantId: "treatment",
        userId: "user-2",
        ts: 2000,
      },
    ]);
  });

  it("accumulates multiple events in order", () => {
    const { sink, getEvents } = createInMemorySink();

    sink({ type: "exposure", experimentId: "e", variantId: "v1", userId: "u", ts: 1 });
    sink({ type: "conversion", experimentId: "e", variantId: "v1", userId: "u", ts: 2 });

    expect(getEvents().map((e) => e.type)).toEqual(["exposure", "conversion"]);
  });

  it("returns a defensive copy from getEvents", () => {
    const { sink, getEvents } = createInMemorySink();
    sink({ type: "exposure", experimentId: "e", variantId: "v1", userId: "u", ts: 1 });

    const events = getEvents();
    events.pop();

    expect(getEvents()).toHaveLength(1);
  });
});

describe("trackExposure", () => {
  it("calls the sink with a correctly-shaped ExposureEvent", () => {
    const received: Array<ExposureEvent | ConversionEvent> = [];
    trackExposure((event) => {
      received.push(event);
    }, { experimentId: "exp-1", variantId: "control", userId: "user-1", ts: 42 });

    expect(received).toEqual([
      { type: "exposure", experimentId: "exp-1", variantId: "control", userId: "user-1", ts: 42 },
    ]);
  });

  it("supports an optional payload", () => {
    const received: Array<ExposureEvent | ConversionEvent> = [];
    trackExposure((event) => {
      received.push(event);
    }, {
      experimentId: "exp-1",
      variantId: "control",
      userId: "user-1",
      ts: 42,
      payload: { source: "middleware" },
    });

    expect(received[0]).toMatchObject({ payload: { source: "middleware" } });
  });
});

describe("trackConversion", () => {
  it("calls the sink with a correctly-shaped ConversionEvent", () => {
    const received: Array<ExposureEvent | ConversionEvent> = [];
    trackConversion((event) => {
      received.push(event);
    }, { experimentId: "exp-1", variantId: "treatment", userId: "user-2", ts: 99 });

    expect(received).toEqual([
      {
        type: "conversion",
        experimentId: "exp-1",
        variantId: "treatment",
        userId: "user-2",
        ts: 99,
      },
    ]);
  });
});
