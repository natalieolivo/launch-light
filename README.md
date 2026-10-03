# launch-light

A lightweight, dependency-free A/B testing SDK. Framework-agnostic core —
register experiments, deterministically assign users to variants, and track
exposure/conversion events — with optional adapters for Next.js and Node.

## Why

Most A/B testing setups reach for `Math.random()` on first visit plus a
cookie to remember the outcome. That works until the cookie is lost (private
browsing, cache clear, a different device) — at which point the user gets
reassigned, and your experiment data gets noisier. `launch-light`'s core
assignment is a pure function of `(userId, experiment)`:

- **Stateless** — no database row or session needed to know which bucket a
  user falls into.
- **Reproducible** — call it again with the same inputs, get the same
  variant. That's what makes exposure/conversion tracking trustworthy.
- **Resilient** — if `userId` is a logged-in user id rather than a
  cookie-only anonymous id, assignment survives cookie loss entirely, and
  even for anonymous ids, the cookie becomes a cache of the answer rather
  than the source of truth.

The mechanism is a hash function (FNV-1a) over `` `${experimentId}:${userId}` ``,
collapsed into a weighted bucket.

## Install

```bash
npm install launch-light
```

## Quickstart

```ts
import { ExperimentRegistry, assignVariant, createInMemorySink, trackExposure } from "launch-light";

const registry = new ExperimentRegistry();

registry.register({
  id: "checkout-button-color",
  variants: [
    { id: "control", weight: 1, payload: { color: "blue" } },
    { id: "treatment", weight: 1, payload: { color: "green" } },
  ],
});

const experiment = registry.get("checkout-button-color");
const variant = assignVariant(userId, experiment); // deterministic per userId + experiment

const { sink, getEvents } = createInMemorySink();
trackExposure(sink, {
  experimentId: experiment.id,
  variantId: variant.id,
  userId,
  ts: Date.now(),
});
```

Each consuming app creates its own `ExperimentRegistry` instance — there is
no shared/global registry, so the SDK is safe to use across multiple apps or
tests in the same process.

## Adapters (optional subpaths)

The core (`launch-light`) has zero runtime dependencies and no knowledge of
any specific framework. Adapters are separate subpath exports so you only
pull in what you use:

### `launch-light/next`

A Next.js middleware helper. Reads (or creates) a persistent anonymous user
id cookie, assigns/reuses a variant per experiment in your registry, forwards
`x-ab-<experimentId>` and `x-ab-uid` request headers, and sets response
cookies.

```ts
// middleware.ts
import { createAbMiddleware } from "launch-light/next";
import { registry } from "./experiments";

export const middleware = createAbMiddleware({ registry });
export const config = { matcher: "/" };
```

### `launch-light/node`

A JSON-file-backed event sink — useful for local demos or small deployments
without a real analytics pipeline.

```ts
import { createJsonFileSink } from "launch-light/node";

const sink = createJsonFileSink("./data/events.json");
```

Both adapters are optional: if you're not on Next.js, or you're sending
events somewhere other than a flat file, you never import them, and their
code (and `next` as a peer dependency) never enters your bundle.

## Status

Fully implemented and tested: `fnv1a` (`src/core/hash.ts`), `assignVariant`
(`src/core/assign.ts`), `ExperimentRegistry`, event tracking, and the Next.js
and Node adapters.

## Development

```bash
npm install
npm run build   # tsup — dual ESM/CJS + .d.ts, one entry per subpath export
npm test        # vitest run
npm run dev      # tsup --watch
```
