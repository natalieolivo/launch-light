import { NextResponse, type NextRequest } from "next/server";
import { assignVariant } from "../core/assign";
import type { ExperimentRegistry } from "../core/registry";

/**
 * Options for {@link createAbMiddleware}.
 */
export type AbMiddlewareOptions = {
  /** Registry of experiments to assign variants for on every matched request. */
  registry: ExperimentRegistry;
  /**
   * Name of the cookie used to persist the anonymous user id.
   * Defaults to `"ab_uid"`.
   */
  userCookieName?: string;
  /**
   * Given an experiment id, returns the name of the cookie used to persist
   * that experiment's variant assignment. Defaults to `` `ab_${experimentId}` ``.
   */
  experimentCookieName?: (experimentId: string) => string;
  /** Cookie max-age in seconds, applied to both the user cookie and experiment cookies. Defaults to one year. */
  maxAgeSeconds?: number;
  /** Cookie path. Defaults to `"/"`. */
  path?: string;
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Creates a Next.js middleware function that, for every matched request:
 *
 * 1. Reads (or creates, via `crypto.randomUUID()`) a persistent anonymous
 *    `userId` cookie.
 * 2. For each experiment in `options.registry`, reuses a valid existing
 *    variant-assignment cookie if present, otherwise calls
 *    {@link assignVariant} to pick one.
 * 3. Forwards `x-ab-<experimentId>` request headers (one per experiment)
 *    plus `x-ab-uid`, so downstream Server Components/route handlers can
 *    read the assignment without re-deriving it.
 * 4. Sets response cookies for the user id and every experiment assignment.
 *
 * The registry and cookie names are all parameters — nothing is hardcoded —
 * so a single consuming app can run this against whatever experiments and
 * cookie naming convention it wants.
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { createAbMiddleware } from "launch-light/next";
 * import { registry } from "./experiments";
 *
 * export const middleware = createAbMiddleware({ registry });
 * export const config = { matcher: "/" };
 * ```
 */
export function createAbMiddleware(options: AbMiddlewareOptions) {
  const {
    registry,
    userCookieName = "ab_uid",
    experimentCookieName = (experimentId: string) => `ab_${experimentId}`,
    maxAgeSeconds = ONE_YEAR_SECONDS,
    path = "/",
  } = options;

  return function middleware(request: NextRequest) {
    let userId = request.cookies.get(userCookieName)?.value;
    if (!userId) {
      userId = crypto.randomUUID();
    }

    const requestHeaders = new Headers(request.headers);
    const cookiesToSet: Array<{ name: string; value: string }> = [];

    for (const experiment of registry.list()) {
      const cookieName = experimentCookieName(experiment.id);
      const existing = request.cookies.get(cookieName)?.value;
      const isValidExisting = experiment.variants.some((v) => v.id === existing);

      const variant = isValidExisting
        ? experiment.variants.find((v) => v.id === existing)!
        : assignVariant(userId, experiment);

      requestHeaders.set(`x-ab-${experiment.id}`, variant.id);
      cookiesToSet.push({ name: cookieName, value: variant.id });
    }

    requestHeaders.set("x-ab-uid", userId);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set(userCookieName, userId, { maxAge: maxAgeSeconds, path });
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, { maxAge: maxAgeSeconds, path });
    }
    return response;
  };
}
