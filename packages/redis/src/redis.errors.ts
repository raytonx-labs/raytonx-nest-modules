export class RedisModuleOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisModuleOptionsError";
  }
}

export class RedisConnectionNotFoundError extends Error {
  constructor(connectionName: string) {
    super(`Redis connection "${connectionName}" was not found.`);
    this.name = "RedisConnectionNotFoundError";
  }
}

export class RedisLockAcquireError extends Error {
  constructor(key: string, message = `Failed to acquire Redis lock for key "${key}".`) {
    super(message);
    this.name = "RedisLockAcquireError";
  }
}

export class RedisLockReleaseError extends Error {
  constructor(key: string, message = `Failed to release Redis lock for key "${key}".`) {
    super(message);
    this.name = "RedisLockReleaseError";
  }
}

export class RedisLockExtendError extends Error {
  constructor(key: string, message = `Failed to extend Redis lock for key "${key}".`) {
    super(message);
    this.name = "RedisLockExtendError";
  }
}
