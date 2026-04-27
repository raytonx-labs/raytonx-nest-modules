import { Inject, Injectable, Optional } from "@nestjs/common";

import { OPTIONAL_REDIS_LOCK_SERVICE_TOKEN, SCHEDULER_MODULE_OPTIONS } from "./scheduler.constants";
import {
  SchedulerRedisDriverUnavailableError,
  SchedulerRuntimeUnavailableError,
} from "./scheduler.errors";
import {
  type DistributedTaskExecutionContext,
  type DistributedTaskMetadata,
  type NormalizedSchedulerModuleOptions,
  type RedisLockServiceLike,
  type ResolvedSchedulerDriverType,
} from "./scheduler.interfaces";
import { MemoryExecutionLockDriver, RedisExecutionLockDriver } from "./scheduler.lock-driver";
import { createSchedulerLockKey, normalizeDistributedTaskMetadata } from "./scheduler.utils";

@Injectable()
export class SchedulerExecutionService {
  private static runtime: SchedulerExecutionService | undefined;
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
    const result = await driver.runWithLock(
      lockKey,
      () => context.originalMethod.apply(context.instance, context.args),
      metadata.options,
    );

    return result.executed ? result.result : undefined;
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
}
