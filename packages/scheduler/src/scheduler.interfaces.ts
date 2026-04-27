import type { AsyncModuleOptions, MaybePromise } from "@raytonx/core";

export type SchedulerDriverType = "auto" | "redis" | "memory";
export type ResolvedSchedulerDriverType = Exclude<SchedulerDriverType, "auto">;
export type DistributedTaskKind = "cron" | "interval" | "timeout";

export interface SchedulerModuleLockOptions {
  keyPrefix?: string;
  connectionName?: string;
  ttl?: number;
  retryAttempts?: number;
  retryDelay?: number;
  retryJitter?: number;
  autoExtend?: boolean;
  extendInterval?: number;
}

export interface SchedulerModuleOptions {
  global?: boolean;
  isGlobal?: boolean;
  driver?: SchedulerDriverType;
  lock?: SchedulerModuleLockOptions;
}

export type SchedulerModuleAsyncOptions = AsyncModuleOptions<SchedulerModuleOptions> &
  Pick<SchedulerModuleOptions, "global" | "isGlobal">;

export interface DistributedTaskOptions extends SchedulerModuleLockOptions {
  name?: string;
  lockKey?: string;
  driver?: SchedulerDriverType;
  skipIfLocked?: boolean;
  enabled?: boolean;
}

export interface NormalizedSchedulerModuleLockOptions {
  autoExtend: boolean;
  connectionName: string | undefined;
  extendInterval: number;
  keyPrefix: string;
  retryAttempts: number;
  retryDelay: number;
  retryJitter: number;
  ttl: number;
}

export interface DistributedTaskMetadata {
  kind: DistributedTaskKind;
  propertyKey: string;
  scheduleValue: number | string;
  options: DistributedTaskOptions;
}

export interface NormalizedSchedulerModuleOptions {
  global: boolean;
  isGlobal: boolean;
  driver: SchedulerDriverType;
  lock: NormalizedSchedulerModuleLockOptions;
}

export interface NormalizedDistributedTaskOptions {
  autoExtend: boolean;
  connectionName: string | undefined;
  driver: SchedulerDriverType;
  enabled: boolean;
  extendInterval: number;
  keyPrefix: string;
  lockKey: string | undefined;
  retryAttempts: number;
  retryDelay: number;
  retryJitter: number;
  skipIfLocked: boolean;
  ttl: number;
}

export interface NormalizedDistributedTaskMetadata extends Omit<
  DistributedTaskMetadata,
  "options"
> {
  className: string;
  options: NormalizedDistributedTaskOptions;
}

export interface DistributedTaskExecutionContext {
  args: unknown[];
  className: string;
  instance: object;
  metadata: DistributedTaskMetadata;
  originalMethod: (...args: unknown[]) => MaybePromise<unknown>;
}

export interface ExecutionLockResult<T> {
  executed: boolean;
  result?: T;
}

export interface ExecutionLockDriver {
  readonly type: ResolvedSchedulerDriverType;
  runWithLock<T>(
    key: string,
    task: () => Promise<T> | T,
    options: NormalizedDistributedTaskOptions,
  ): Promise<ExecutionLockResult<T>>;
}

export interface RedisLockHandleLike {
  extend(ttl?: number): Promise<boolean>;
  release(): Promise<void>;
}

export interface RedisLockServiceLike {
  acquire(
    key: string,
    options?: {
      connectionName?: string;
      retryAttempts?: number;
      retryDelay?: number;
      retryJitter?: number;
      ttl?: number;
    },
  ): Promise<RedisLockHandleLike>;
}
