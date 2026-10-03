import type { Experiment } from "./assign";

/**
 * Holds a set of experiments for a single consuming application.
 *
 * There is intentionally no shared/global singleton — each app instantiates
 * its own `ExperimentRegistry` and registers the experiments it owns. This
 * keeps the SDK safe to use in multi-tenant processes (e.g. a server
 * handling several apps) and in tests, where a fresh registry per test avoids
 * cross-test leakage.
 */
export class ExperimentRegistry {
  private experiments = new Map<string, Experiment<unknown>>();

  /**
   * Registers an experiment.
   *
   * @throws {Error} if an experiment with the same `id` is already registered
   */
  register<T>(experiment: Experiment<T>): void {
    if (this.experiments.has(experiment.id)) {
      throw new Error(
        `ExperimentRegistry: an experiment with id "${experiment.id}" is already registered`
      );
    }
    this.experiments.set(experiment.id, experiment as Experiment<unknown>);
  }

  /**
   * Looks up a registered experiment by id.
   *
   * @throws {Error} if no experiment with `id` has been registered
   */
  get<T = unknown>(id: string): Experiment<T> {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`ExperimentRegistry: no experiment registered with id "${id}"`);
    }
    return experiment as Experiment<T>;
  }

  /**
   * Returns all registered experiments, in registration order.
   */
  list(): Experiment<unknown>[] {
    return Array.from(this.experiments.values());
  }
}
