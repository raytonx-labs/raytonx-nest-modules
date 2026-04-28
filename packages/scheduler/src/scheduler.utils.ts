import { SchedulerModuleOptionsError } from "./scheduler.errors";
import {
  type DistributedTaskMetadata,
  type DistributedTaskOptions,
  type NormalizedDistributedTaskMetadata,
  type NormalizedDistributedTaskOptions,
  type NormalizedSchedulerLoggingOptions,
  type NormalizedSchedulerModuleLockOptions,
  type NormalizedSchedulerModuleOptions,
  type SchedulerDriverType,
  type SchedulerLoggingMode,
  type SchedulerModuleLockOptions,
  type SchedulerModuleOptions,
} from "./scheduler.interfaces";

export function normalizeSchedulerModuleOptions(
  options: SchedulerModuleOptions = {},
): NormalizedSchedulerModuleOptions {
  const normalized = {
    global: options.global ?? false,
    isGlobal: options.isGlobal ?? false,
    driver: normalizeDriver(options.driver),
    lock: normalizeSchedulerModuleLockOptions(options.lock),
    logging: normalizeSchedulerLoggingOptions(options.logging),
  };

  return normalized;
}

export function normalizeDistributedTaskMetadata(
  metadata: DistributedTaskMetadata,
  moduleOptions: NormalizedSchedulerModuleOptions,
  className: string,
): NormalizedDistributedTaskMetadata {
  return {
    ...metadata,
    className,
    options: normalizeDistributedTaskOptions(metadata.options, moduleOptions),
  };
}

export function normalizeDistributedTaskOptions(
  options: DistributedTaskOptions = {},
  moduleOptions: NormalizedSchedulerModuleOptions,
): NormalizedDistributedTaskOptions {
  const lock = moduleOptions.lock;
  const extendInterval = options.extendInterval ?? lock.extendInterval;
  const normalized = {
    autoExtend: options.autoExtend ?? lock.autoExtend,
    connectionName: normalizeOptionalString(options.connectionName ?? lock.connectionName),
    driver: normalizeDriver(options.driver ?? moduleOptions.driver),
    enabled: options.enabled ?? true,
    extendInterval,
    keyPrefix: lock.keyPrefix,
    lockKey: normalizeOptionalString(options.lockKey),
    name: normalizeOptionalString(options.name),
    logging: normalizeSchedulerLoggingOptions(options.logging, moduleOptions.logging),
    retryAttempts: options.retryAttempts ?? lock.retryAttempts,
    retryDelay: options.retryDelay ?? lock.retryDelay,
    retryJitter: options.retryJitter ?? lock.retryJitter,
    skipIfLocked: options.skipIfLocked ?? true,
    ttl: options.ttl ?? lock.ttl,
  };

  assertPositiveInteger("task.ttl", normalized.ttl);
  assertNonNegativeInteger("task.retryAttempts", normalized.retryAttempts);
  assertNonNegativeInteger("task.retryDelay", normalized.retryDelay);
  assertNonNegativeInteger("task.retryJitter", normalized.retryJitter);

  if (normalized.autoExtend) {
    assertPositiveInteger("task.extendInterval", normalized.extendInterval);
  }

  return normalized;
}

function normalizeSchedulerLoggingOptions(
  options?: false | SchedulerLoggingMode,
  base?: NormalizedSchedulerLoggingOptions,
): NormalizedSchedulerLoggingOptions {
  if (options === false) {
    return {
      enabled: false,
      mode: base?.mode ?? "default",
    };
  }

  if (options === undefined) {
    return {
      enabled: base?.enabled ?? true,
      mode: base?.mode ?? "default",
    };
  }

  return {
    enabled: true,
    mode: normalizeLoggingMode(options),
  };
}

function normalizeLoggingMode(mode: SchedulerLoggingMode): SchedulerLoggingMode {
  if (mode !== "default" && mode !== "verbose") {
    throw new SchedulerModuleOptionsError('logging must be "default", "verbose", or false.');
  }

  return mode;
}

export function createSchedulerLockKey(
  className: string,
  methodName: string,
  options: Pick<NormalizedDistributedTaskOptions, "keyPrefix" | "lockKey">,
): string {
  return options.lockKey ?? `${options.keyPrefix}${className}:${methodName}`;
}

export function normalizeMethodName(propertyKey: string | symbol): string {
  return typeof propertyKey === "string" ? propertyKey : propertyKey.toString();
}

function normalizeSchedulerModuleLockOptions(
  options?: SchedulerModuleLockOptions,
): NormalizedSchedulerModuleLockOptions {
  const normalized = {
    autoExtend: options?.autoExtend ?? true,
    connectionName: normalizeOptionalString(options?.connectionName),
    extendInterval: options?.extendInterval ?? 10_000,
    keyPrefix: options?.keyPrefix ?? "scheduler:",
    retryAttempts: options?.retryAttempts ?? 0,
    retryDelay: options?.retryDelay ?? 200,
    retryJitter: options?.retryJitter ?? 50,
    ttl: options?.ttl ?? 30_000,
  };

  assertPositiveInteger("lock.ttl", normalized.ttl);
  assertNonNegativeInteger("lock.retryAttempts", normalized.retryAttempts);
  assertNonNegativeInteger("lock.retryDelay", normalized.retryDelay);
  assertNonNegativeInteger("lock.retryJitter", normalized.retryJitter);
  assertPositiveInteger("lock.extendInterval", normalized.extendInterval);

  return normalized;
}

function normalizeDriver(driver?: SchedulerDriverType): SchedulerDriverType {
  const normalized = driver ?? "auto";

  if (normalized !== "auto" && normalized !== "redis" && normalized !== "memory") {
    throw new SchedulerModuleOptionsError('driver must be one of "auto", "redis", or "memory".');
  }

  return normalized;
}

function normalizeOptionalString(value?: string): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new SchedulerModuleOptionsError(`${name} must be a positive integer.`);
  }
}

function assertNonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new SchedulerModuleOptionsError(`${name} must be a non-negative integer.`);
  }
}
