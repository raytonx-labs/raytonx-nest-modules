export class SchedulerModuleOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulerModuleOptionsError";
  }
}

export class SchedulerRuntimeUnavailableError extends Error {
  constructor() {
    super(
      "Scheduler runtime is not available. Ensure SchedulerModule is imported before distributed tasks run.",
    );
    this.name = "SchedulerRuntimeUnavailableError";
  }
}

export class SchedulerRedisDriverUnavailableError extends Error {
  constructor() {
    super(
      'Redis driver was requested for @raytonx/nest-scheduler, but "@raytonx/nest-redis" is not available in the current Nest application.',
    );
    this.name = "SchedulerRedisDriverUnavailableError";
  }
}

export class SchedulerTaskConflictError extends Error {
  constructor(key: string) {
    super(`Scheduled task lock "${key}" is already held by another execution.`);
    this.name = "SchedulerTaskConflictError";
  }
}

export class SchedulerTaskExtendError extends Error {
  constructor(key: string) {
    super(
      `Scheduled task lock "${key}" could not be extended because ownership no longer matched.`,
    );
    this.name = "SchedulerTaskExtendError";
  }
}
