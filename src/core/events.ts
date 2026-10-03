/**
 * Fired when a user is exposed to (assigned into) an experiment variant.
 */
export type ExposureEvent<T = unknown> = {
  type: "exposure";
  experimentId: string;
  variantId: string;
  userId: string;
  /** epoch milliseconds */
  ts: number;
  /** optional arbitrary payload, e.g. the variant's payload or request context */
  payload?: T;
};

/**
 * Fired when a user assigned to an experiment variant completes a tracked
 * conversion goal.
 */
export type ConversionEvent<T = unknown> = {
  type: "conversion";
  experimentId: string;
  variantId: string;
  userId: string;
  /** epoch milliseconds */
  ts: number;
  /** optional arbitrary payload, e.g. conversion metadata (order id, value, etc.) */
  payload?: T;
};

/**
 * A sink that receives exposure and conversion events. Implementations may
 * write to memory (tests/demos), a JSON file (see `launch-light/node`), an
 * analytics API, a database, etc. Sinks may be synchronous or async.
 */
export type EventSink<T = unknown> = (
  event: ExposureEvent<T> | ConversionEvent<T>
) => void | Promise<void>;

/**
 * Builds and sends an {@link ExposureEvent} to `sink`.
 *
 * @param sink - the event sink to send to
 * @param event - the exposure event fields, excluding `type` (added automatically)
 */
export function trackExposure<T = unknown>(
  sink: EventSink<T>,
  event: Omit<ExposureEvent<T>, "type">
): void | Promise<void> {
  return sink({ type: "exposure", ...event });
}

/**
 * Builds and sends a {@link ConversionEvent} to `sink`.
 *
 * @param sink - the event sink to send to
 * @param event - the conversion event fields, excluding `type` (added automatically)
 */
export function trackConversion<T = unknown>(
  sink: EventSink<T>,
  event: Omit<ConversionEvent<T>, "type">
): void | Promise<void> {
  return sink({ type: "conversion", ...event });
}

/**
 * Creates an in-memory {@link EventSink}, primarily useful for tests and
 * local demos. Every event sent through the returned `sink` is captured and
 * retrievable via `getEvents()`.
 */
export function createInMemorySink<T = unknown>(): {
  sink: EventSink<T>;
  getEvents: () => Array<ExposureEvent<T> | ConversionEvent<T>>;
} {
  const events: Array<ExposureEvent<T> | ConversionEvent<T>> = [];
  const sink: EventSink<T> = (event) => {
    events.push(event);
  };
  return {
    sink,
    getEvents: () => events.slice(),
  };
}
