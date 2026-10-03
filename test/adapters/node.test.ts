import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createJsonFileSink } from "../../src/adapters/node";

describe("createJsonFileSink", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "launch-light-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates the file if it doesn't exist and writes the first event", async () => {
    const filePath = join(dir, "events.json");
    const sink = createJsonFileSink(filePath);

    await sink({ type: "exposure", experimentId: "e", variantId: "v", userId: "u", ts: 1 });

    const contents = JSON.parse(await readFile(filePath, "utf-8"));
    expect(contents).toEqual([
      { type: "exposure", experimentId: "e", variantId: "v", userId: "u", ts: 1 },
    ]);
  });

  it("creates missing parent directories", async () => {
    const filePath = join(dir, "nested", "deep", "events.json");
    const sink = createJsonFileSink(filePath);

    await sink({ type: "exposure", experimentId: "e", variantId: "v", userId: "u", ts: 1 });

    const contents = JSON.parse(await readFile(filePath, "utf-8"));
    expect(contents).toHaveLength(1);
  });

  it("appends events across multiple calls, persisting prior entries", async () => {
    const filePath = join(dir, "events.json");
    const sink = createJsonFileSink(filePath);

    await sink({ type: "exposure", experimentId: "e", variantId: "v1", userId: "u1", ts: 1 });
    await sink({ type: "conversion", experimentId: "e", variantId: "v1", userId: "u1", ts: 2 });
    await sink({ type: "exposure", experimentId: "e", variantId: "v2", userId: "u2", ts: 3 });

    const contents = JSON.parse(await readFile(filePath, "utf-8"));
    expect(contents).toHaveLength(3);
    expect(contents.map((e: { type: string }) => e.type)).toEqual([
      "exposure",
      "conversion",
      "exposure",
    ]);
  });

  it("serializes concurrent writes without dropping events", async () => {
    const filePath = join(dir, "events.json");
    const sink = createJsonFileSink(filePath);

    await Promise.all([
      sink({ type: "exposure", experimentId: "e", variantId: "v1", userId: "u1", ts: 1 }),
      sink({ type: "exposure", experimentId: "e", variantId: "v2", userId: "u2", ts: 2 }),
      sink({ type: "exposure", experimentId: "e", variantId: "v3", userId: "u3", ts: 3 }),
    ]);

    const contents = JSON.parse(await readFile(filePath, "utf-8"));
    expect(contents).toHaveLength(3);
  });
});
