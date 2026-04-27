import {
  SchedulerRedisDriverUnavailableError,
  SchedulerTaskConflictError,
  SchedulerTaskExtendError,
} from "./scheduler.errors";
import {
  type ExecutionLockDriver,
  type ExecutionLockResult,
  type NormalizedDistributedTaskOptions,
  type RedisLockServiceLike,
  type ResolvedSchedulerDriverType,
} from "./scheduler.interfaces";

export class MemoryExecutionLockDriver implements ExecutionLockDriver {
  readonly type: ResolvedSchedulerDriverType = "memory";
  private readonly activeLocks = new Set<string>();

  async runWithLock<T>(
    key: string,
    task: () => Promise<T> | T,
    options: NormalizedDistributedTaskOptions,
  ): Promise<ExecutionLockResult<T>> {
    if (this.activeLocks.has(key)) {
      if (options.skipIfLocked) {
        return {
          executed: false,
        };
      }

      throw new SchedulerTaskConflictError(key);
    }

    this.activeLocks.add(key);

    try {
      return {
        executed: true,
        result: await task(),
      };
    } finally {
      this.activeLocks.delete(key);
    }
  }
}

export class RedisExecutionLockDriver implements ExecutionLockDriver {
  readonly type: ResolvedSchedulerDriverType = "redis";

  constructor(private readonly redisLockService?: RedisLockServiceLike) {}

  async runWithLock<T>(
    key: string,
    task: () => Promise<T> | T,
    options: NormalizedDistributedTaskOptions,
  ): Promise<ExecutionLockResult<T>> {
    if (!this.redisLockService) {
      throw new SchedulerRedisDriverUnavailableError();
    }

    try {
      const acquireOptions = {
        retryAttempts: options.retryAttempts,
        retryDelay: options.retryDelay,
        retryJitter: options.retryJitter,
        ttl: options.ttl,
        ...(options.connectionName ? { connectionName: options.connectionName } : {}),
      };
      const handle = await this.redisLockService.acquire(key, acquireOptions);
      let result: T | undefined;
      let taskError: unknown;
      let extensionError: Error | undefined;
      let releaseError: unknown;
      let stopAutoExtend: () => void = () => undefined;
      let extensionFailurePromise: Promise<never> | undefined;

      if (options.autoExtend) {
        extensionFailurePromise = new Promise<never>((_, reject) => {
          stopAutoExtend = this.startAutoExtend(handle, key, options.extendInterval, (error) => {
            extensionError = error;
            reject(error);
          });
        });
      }

      try {
        const taskPromise = Promise.resolve(task());

        if (extensionFailurePromise) {
          result = await Promise.race([taskPromise, extensionFailurePromise]);
        } else {
          result = await taskPromise;
        }
      } catch (error) {
        taskError = error;
      }

      try {
        stopAutoExtend();
        await handle.release();
      } catch (error) {
        releaseError = error;
      }

      if (extensionError) {
        throw extensionError;
      }

      if (releaseError) {
        throw releaseError;
      }

      if (taskError) {
        throw taskError;
      }

      return {
        executed: true,
        result: result as T,
      };
    } catch (error) {
      if (isRedisLockConflictError(error)) {
        if (options.skipIfLocked) {
          return {
            executed: false,
          };
        }

        throw new SchedulerTaskConflictError(key);
      }

      throw error;
    }
  }

  private startAutoExtend(
    handle: {
      extend(ttl?: number): Promise<boolean>;
    },
    key: string,
    extendInterval: number,
    onError: (error: Error) => void,
  ): () => void {
    let active = true;
    const timer = setInterval(async () => {
      if (!active) {
        return;
      }

      try {
        const extended = await handle.extend();

        if (!extended) {
          throw new SchedulerTaskExtendError(key);
        }
      } catch (error) {
        active = false;
        clearInterval(timer);
        onError(error instanceof Error ? error : new SchedulerTaskExtendError(key));
      }
    }, extendInterval);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }
}

function isRedisLockConflictError(error: unknown): boolean {
  return error instanceof Error && error.name === "RedisLockConflictError";
}
