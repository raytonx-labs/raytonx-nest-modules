import type { AsyncModuleOptions, MaybePromise } from "@raytonx/core";

export type SchedulerDriverType = "auto" | "redis" | "memory";
export type ResolvedSchedulerDriverType = Exclude<SchedulerDriverType, "auto">;
export type DistributedTaskKind = "cron" | "interval" | "timeout";
export type SchedulerLoggingMode = "default" | "verbose";
export type SchedulerTaskStatus = "failed" | "skipped" | "success";
export type SchedulerLogEvent =
  | "lock_acquired"
  | "lock_extend_failed"
  | "lock_extended"
  | "lock_expired_before_finish"
  | "lock_released"
  | "task_failed"
  | "task_finished"
  | "task_skipped"
  | "task_started"
  | "task_succeeded";

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
  logging?: false | SchedulerLoggingMode;
}

export type SchedulerModuleAsyncOptions = AsyncModuleOptions<SchedulerModuleOptions> &
  Pick<SchedulerModuleOptions, "global" | "isGlobal">;

export interface DistributedTaskOptions extends SchedulerModuleLockOptions {
  name?: string;
  lockKey?: string;
  driver?: SchedulerDriverType;
  skipIfLocked?: boolean;
  enabled?: boolean;
  logging?: false | SchedulerLoggingMode;
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

export interface NormalizedSchedulerLoggingOptions {
  enabled: boolean;
  mode: SchedulerLoggingMode;
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
  logging: NormalizedSchedulerLoggingOptions;
}

export interface NormalizedDistributedTaskOptions {
  autoExtend: boolean;
  connectionName: string | undefined;
  driver: SchedulerDriverType;
  enabled: boolean;
  extendInterval: number;
  keyPrefix: string;
  lockKey: string | undefined;
  name: string | undefined;
  retryAttempts: number;
  retryDelay: number;
  retryJitter: number;
  skipIfLocked: boolean;
  ttl: number;
  logging: NormalizedSchedulerLoggingOptions;
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

export interface ExecutionLockEvent {
  driver: ResolvedSchedulerDriverType;
  error: Error | undefined;
  event: Extract<
    SchedulerLogEvent,
    | "lock_acquired"
    | "lock_extend_failed"
    | "lock_extended"
    | "lock_expired_before_finish"
    | "lock_released"
  >;
  lockKey: string;
}

export interface ExecutionLockHooks {
  onEvent?: (event: ExecutionLockEvent) => void;
}

export interface ExecutionLockDriver {
  readonly type: ResolvedSchedulerDriverType;
  runWithLock<T>(
    key: string,
    task: () => Promise<T> | T,
    options: NormalizedDistributedTaskOptions,
    hooks?: ExecutionLockHooks,
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

export interface SchedulerLogEntry {
  className: string;
  connectionName: string | undefined;
  driver: ResolvedSchedulerDriverType;
  durationMs: number | undefined;
  errorMessage: string | undefined;
  errorName: string | undefined;
  event: SchedulerLogEvent;
  executionId: string;
  kind: DistributedTaskKind;
  lockKey: string;
  methodName: string;
  scheduleValue: number | string;
  status: SchedulerTaskStatus | undefined;
  taskName: string;
  timestamp: string;
  ttl: number | undefined;
}

export type SchedulerLogBaseEntry = Omit<SchedulerLogEntry, "event" | "timestamp">;
