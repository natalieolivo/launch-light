import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ConversionEvent, EventSink, ExposureEvent } from "../core/events";

/**
 * Creates an {@link EventSink} that appends events to a JSON array file on
 * disk. Useful for local demos, scripts, or small deployments that don't
 * warrant a real analytics pipeline.
 *
 * The file (and any missing parent directories) are created on first write
 * if they don't already exist. Each call reads the current array, appends
 * the new event, and rewrites the file — writes for a given file path are
 * serialized so concurrent calls don't race and clobber each other.
 *
 * @param filePath - path to the JSON file to append events to
 */
export function createJsonFileSink<T = unknown>(filePath: string): EventSink<T> {
  // Serializes writes to this sink so concurrent trackExposure/trackConversion
  // calls don't interleave read-modify-write cycles and drop events.
  let queue: Promise<unknown> = Promise.resolve();

  async function appendEvent(event: ExposureEvent<T> | ConversionEvent<T>): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });

    let events: Array<ExposureEvent<T> | ConversionEvent<T>> = [];
    try {
      const raw = await readFile(filePath, "utf-8");
      events = raw.trim().length > 0 ? JSON.parse(raw) : [];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
      // file doesn't exist yet — start with an empty array
      events = [];
    }

    events.push(event);
    await writeFile(filePath, JSON.stringify(events, null, 2), "utf-8");
  }

  const sink: EventSink<T> = (event) => {
    queue = queue.then(() => appendEvent(event));
    return queue as Promise<void>;
  };

  return sink;
}
