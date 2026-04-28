import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { OPTIONAL_REDIS_LOCK_SERVICE_TOKEN, SCHEDULER_MODULE_OPTIONS } from "./scheduler.constants";
import {
  SchedulerRedisDriverUnavailableError,
  SchedulerRuntimeUnavailableError,
} from "./scheduler.errors";
import {
  type DistributedTaskExecutionContext,
  type DistributedTaskMetadata,
  type ExecutionLockEvent,
  type NormalizedSchedulerLoggingOptions,
  type NormalizedSchedulerModuleOptions,
  type RedisLockServiceLike,
  type ResolvedSchedulerDriverType,
  type SchedulerLogBaseEntry,
  type SchedulerLogEntry,
  type SchedulerLogEvent,
} from "./scheduler.interfaces";
import { MemoryExecutionLockDriver, RedisExecutionLockDriver } from "./scheduler.lock-driver";
import { createSchedulerLockKey, normalizeDistributedTaskMetadata } from "./scheduler.utils";

@Injectable()
export class SchedulerExecutionService {
  private static runtime: SchedulerExecutionService | undefined;
  private readonly logger = new Logger("SchedulerModule");
  private readonly memoryDriver = new MemoryExecutionLockDriver();
  private readonly redisDriver: RedisExecutionLockDriver;

  constructor(
    @Inject(SCHEDULER_MODULE_OPTIONS)
    private readonly moduleOptions: NormalizedSchedulerModuleOptions,
    @Optional()
    @Inject(OPTIONAL_REDIS_LOCK_SERVICE_TOKEN)
    private readonly redisLockService?: RedisLockServiceLike,
  ) {
    this.redisDriver = new RedisExecutionLockDriver(redisLockService);
  }

  registerRuntime(): void {
    SchedulerExecutionService.runtime = this;
  }

  unregisterRuntime(): void {
    if (SchedulerExecutionService.runtime === this) {
      SchedulerExecutionService.runtime = undefined;
    }
  }

  validateRegisteredTasks(tasks: DistributedTaskMetadata[]): void {
    const moduleDriver = this.moduleOptions.driver;

    if (moduleDriver === "redis" && !this.redisLockService) {
      throw new SchedulerRedisDriverUnavailableError();
    }

    for (const task of tasks) {
      if ((task.options.driver ?? moduleDriver) === "redis" && !this.redisLockService) {
        throw new SchedulerRedisDriverUnavailableError();
      }
    }
  }

  async executeTask(context: DistributedTaskExecutionContext): Promise<unknown> {
    const metadata = normalizeDistributedTaskMetadata(
      context.metadata,
      this.moduleOptions,
      context.className,
    );

    if (!metadata.options.enabled) {
      return context.originalMethod.apply(context.instance, context.args);
    }

    const lockKey = createSchedulerLockKey(
      metadata.className,
      metadata.propertyKey,
      metadata.options,
    );
    const driver = this.resolveDriver(metadata.options.driver);
    const executionId = randomUUID();
    const startedAt = Date.now();
    const baseEntry = {
      className: metadata.className,
      connectionName: metadata.options.connectionName,
      durationMs: undefined,
      driver: driver.type,
      errorMessage: undefined,
      errorName: undefined,
      executionId,
      kind: metadata.kind,
      lockKey,
      methodName: metadata.propertyKey,
      scheduleValue: metadata.scheduleValue,
      status: undefined,
      taskName: metadata.options.name ?? `${metadata.className}.${metadata.propertyKey}`,
      ttl: metadata.options.ttl,
    } satisfies SchedulerLogBaseEntry;

    this.logEvent("task_started", baseEntry, metadata.options.logging);

    try {
      const result = await driver.runWithLock(
        lockKey,
        () => context.originalMethod.apply(context.instance, context.args),
        metadata.options,
        {
          onEvent: (event) => this.handleLockEvent(event, baseEntry, metadata.options.logging),
        },
      );

      if (!result.executed) {
        this.logEvent("task_skipped", baseEntry, metadata.options.logging, {
          durationMs: Date.now() - startedAt,
          status: "skipped",
        });
        this.logEvent("task_finished", baseEntry, metadata.options.logging, {
          durationMs: Date.now() - startedAt,
          status: "skipped",
        });

        return undefined;
      }

      this.logEvent("task_succeeded", baseEntry, metadata.options.logging, {
        durationMs: Date.now() - startedAt,
        status: "success",
      });
      this.logEvent("task_finished", baseEntry, metadata.options.logging, {
        durationMs: Date.now() - startedAt,
        status: "success",
      });

      return result.result;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error("Unknown scheduler error");

      this.logEvent("task_failed", baseEntry, metadata.options.logging, {
        durationMs: Date.now() - startedAt,
        errorMessage: normalizedError.message,
        errorName: normalizedError.name,
        status: "failed",
      });
      this.logEvent("task_finished", baseEntry, metadata.options.logging, {
        durationMs: Date.now() - startedAt,
        errorMessage: normalizedError.message,
        errorName: normalizedError.name,
        status: "failed",
      });
      throw error;
    }
  }

  static async run(context: DistributedTaskExecutionContext): Promise<unknown> {
    if (!SchedulerExecutionService.runtime) {
      throw new SchedulerRuntimeUnavailableError();
    }

    return SchedulerExecutionService.runtime.executeTask(context);
  }

  private resolveDriver(driver: ResolvedSchedulerDriverType | "auto") {
    const resolvedDriver: ResolvedSchedulerDriverType =
      driver === "auto" ? (this.redisLockService ? "redis" : "memory") : driver;

    if (resolvedDriver === "redis") {
      if (!this.redisLockService) {
        throw new SchedulerRedisDriverUnavailableError();
      }

      return this.redisDriver;
    }

    return this.memoryDriver;
  }

  private handleLockEvent(
    event: ExecutionLockEvent,
    baseEntry: SchedulerLogBaseEntry,
    logging: NormalizedSchedulerLoggingOptions,
  ): void {
    this.logEvent(event.event, baseEntry, logging, {
      errorMessage: event.error?.message,
      errorName: event.error?.name,
    });
  }

  private logEvent(
    event: SchedulerLogEvent,
    baseEntry: SchedulerLogBaseEntry,
    logging: NormalizedSchedulerLoggingOptions,
    extra: Partial<SchedulerLogBaseEntry> = {},
  ): void {
    if (!this.shouldLog(event, logging)) {
      return;
    }

    const entry: SchedulerLogEntry = {
      ...baseEntry,
      ...extra,
      event,
      timestamp: new Date().toISOString(),
    };
    const message = JSON.stringify(entry);

    if (
      event === "task_failed" ||
      event === "lock_extend_failed" ||
      event === "lock_expired_before_finish"
    ) {
      this.logger.error(message);
      return;
    }

    this.logger.log(message);
  }

  private shouldLog(
    event: SchedulerLogEvent,
    logging: NormalizedSchedulerModuleOptions["logging"],
  ): boolean {
    if (!logging.enabled) {
      return false;
    }

    switch (event) {
      case "task_started":
      case "task_finished":
      case "task_succeeded":
      case "task_failed":
      case "task_skipped":
      case "lock_extend_failed":
      case "lock_expired_before_finish":
        return true;
      case "lock_acquired":
      case "lock_extended":
      case "lock_released":
        return logging.mode === "verbose";
    }
  }
}
