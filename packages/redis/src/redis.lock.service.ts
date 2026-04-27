import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleDestroy,
  Optional,
} from "@nestjs/common";

import { REDIS_LOCK_OPTIONS } from "./redis.constants";
import {
  RedisLockConflictError,
  RedisLockExtendError,
  RedisLockReleaseError,
  RedisModuleOptionsError,
} from "./redis.errors";
import type {
  RedisAcquireLockOptions,
  RedisLockHandle,
  RedisLockModuleOptions,
  RedisRunWithLockOptions,
} from "./redis.interfaces";
import { type RedisService } from "./redis.service";
import {
  assertNonNegativeInteger,
  assertPositiveInteger,
  createLockKey,
  createLockToken,
  normalizeRedisConnectionName,
  normalizeRedisLockOptions,
} from "./redis.utils";

const RELEASE_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) end return 0';
const EXTEND_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) end return 0';

interface ManagedRedisLockHandle extends RedisLockHandle {
  readonly lockKey: string;
}

@Injectable()
export class RedisLockService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly lockOptions: Required<RedisLockModuleOptions>;
  private readonly activeIntervals = new Set<NodeJS.Timeout>();

  constructor(
    private readonly redisService: RedisService,
    @Optional() @Inject(REDIS_LOCK_OPTIONS) options?: RedisLockModuleOptions,
  ) {
    this.lockOptions = normalizeRedisLockOptions(options);
  }

  async acquire(key: string, options: RedisAcquireLockOptions = {}): Promise<RedisLockHandle> {
    const resolvedOptions = this.resolveAcquireOptions(options);
    const client = this.redisService.getClient(resolvedOptions.connectionName);
    const lockKey = createLockKey(this.lockOptions.keyPrefix, key);
    const token = createLockToken();

    for (let attempt = 0; attempt <= resolvedOptions.retryAttempts; attempt += 1) {
      const result = await client.set(lockKey, token, "PX", resolvedOptions.ttl, "NX");

      if (result === "OK") {
        return this.createHandle({
          acquiredAt: Date.now(),
          connectionName: resolvedOptions.connectionName,
          key,
          lockKey,
          token,
          ttl: resolvedOptions.ttl,
        });
      }

      if (attempt === resolvedOptions.retryAttempts) {
        break;
      }

      await this.delay(resolvedOptions.retryDelay + this.randomInt(resolvedOptions.retryJitter));
    }

    throw new RedisLockConflictError(
      key,
      `Failed to acquire Redis lock for key "${key}" after ${resolvedOptions.retryAttempts + 1} attempts.`,
    );
  }

  async release(handle: RedisLockHandle): Promise<void> {
    const managedHandle = this.toManagedHandle(handle);
    const client = this.redisService.getClient(managedHandle.connectionName);
    const result = await client.eval(
      RELEASE_LOCK_SCRIPT,
      1,
      managedHandle.lockKey,
      managedHandle.token,
    );

    if (result !== 1) {
      throw new RedisLockReleaseError(
        managedHandle.key,
        `Redis lock "${managedHandle.key}" could not be released because ownership no longer matched.`,
      );
    }
  }

  async extend(handle: RedisLockHandle, ttl?: number): Promise<boolean> {
    const managedHandle = this.toManagedHandle(handle);
    const client = this.redisService.getClient(managedHandle.connectionName);
    const nextTtl = ttl ?? managedHandle.ttl;

    assertPositiveInteger("lock.ttl", nextTtl);

    const result = await client.eval(
      EXTEND_LOCK_SCRIPT,
      1,
      managedHandle.lockKey,
      managedHandle.token,
      nextTtl.toString(),
    );

    return result === 1;
  }

  async runWithLock<T>(
    key: string,
    task: (handle: RedisLockHandle) => Promise<T> | T,
    options: RedisRunWithLockOptions = {},
  ): Promise<T> {
    const handle = await this.acquire(key, options);
    const autoExtend = options.autoExtend ?? this.lockOptions.autoExtend;
    const extendInterval = options.extendInterval ?? this.lockOptions.extendInterval;
    let extensionError: Error | undefined;
    let releaseError: unknown;
    let stopAutoExtend: () => void = () => undefined;
    let extensionFailurePromise: Promise<never> | undefined;
    let taskError: unknown;
    let result: T | undefined;

    if (autoExtend) {
      assertPositiveInteger("lock.extendInterval", extendInterval);
      extensionFailurePromise = new Promise<never>((_, reject) => {
        stopAutoExtend = this.startAutoExtend(handle, extendInterval, (error) => {
          extensionError = error;
          reject(error);
        });
      });
    }

    try {
      const taskPromise = Promise.resolve(task(handle));

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
      await this.release(handle);
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

    return result as T;
  }

  async onModuleDestroy(): Promise<void> {
    this.clearActiveIntervals();
  }

  async onApplicationShutdown(): Promise<void> {
    this.clearActiveIntervals();
  }

  private resolveAcquireOptions(options: RedisAcquireLockOptions) {
    const connectionName = normalizeRedisConnectionName(
      options.connectionName ?? this.lockOptions.connectionName,
    );
    const ttl = options.ttl ?? this.lockOptions.defaultTtl;
    const retryDelay = options.retryDelay ?? this.lockOptions.retryDelay;
    const retryJitter = options.retryJitter ?? this.lockOptions.retryJitter;
    const retryAttempts = options.retryAttempts ?? this.lockOptions.retryAttempts;

    assertPositiveInteger("lock.ttl", ttl);
    assertNonNegativeInteger("lock.retryDelay", retryDelay);
    assertNonNegativeInteger("lock.retryJitter", retryJitter);
    assertNonNegativeInteger("lock.retryAttempts", retryAttempts);

    return {
      connectionName,
      retryAttempts,
      retryDelay,
      retryJitter,
      ttl,
    };
  }

  private createHandle(params: {
    acquiredAt: number;
    connectionName: string;
    key: string;
    lockKey: string;
    token: string;
    ttl: number;
  }): ManagedRedisLockHandle {
    return {
      acquiredAt: params.acquiredAt,
      connectionName: params.connectionName,
      key: params.key,
      lockKey: params.lockKey,
      token: params.token,
      ttl: params.ttl,
      extend: async (ttl?: number) => this.extend(this.createPublicHandle(params), ttl),
      release: async () => this.release(this.createPublicHandle(params)),
    };
  }

  private createPublicHandle(params: {
    acquiredAt: number;
    connectionName: string;
    key: string;
    lockKey: string;
    token: string;
    ttl: number;
  }): ManagedRedisLockHandle {
    return {
      acquiredAt: params.acquiredAt,
      connectionName: params.connectionName,
      key: params.key,
      lockKey: params.lockKey,
      token: params.token,
      ttl: params.ttl,
      extend: async (ttl?: number) => this.extend(this.createPublicHandle(params), ttl),
      release: async () => this.release(this.createPublicHandle(params)),
    };
  }

  private startAutoExtend(
    handle: RedisLockHandle,
    extendInterval: number,
    onError: (error: Error) => void,
  ): () => void {
    let active = true;
    const timer = setInterval(async () => {
      if (!active) {
        return;
      }

      try {
        const extended = await this.extend(handle);

        if (!extended) {
          throw new RedisLockExtendError(
            handle.key,
            `Redis lock "${handle.key}" could not be extended because ownership no longer matched.`,
          );
        }
      } catch (error) {
        active = false;
        clearInterval(timer);
        this.activeIntervals.delete(timer);
        onError(error instanceof Error ? error : new RedisLockExtendError(handle.key));
      }
    }, extendInterval);

    this.activeIntervals.add(timer);

    return () => {
      active = false;
      clearInterval(timer);
      this.activeIntervals.delete(timer);
    };
  }

  private clearActiveIntervals(): void {
    for (const timer of this.activeIntervals) {
      clearInterval(timer);
    }

    this.activeIntervals.clear();
  }

  private toManagedHandle(handle: RedisLockHandle): ManagedRedisLockHandle {
    if (!("lockKey" in handle) || typeof handle.lockKey !== "string") {
      throw new RedisModuleOptionsError(
        "The provided Redis lock handle was not created by RedisLockService.",
      );
    }

    return handle as ManagedRedisLockHandle;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private randomInt(max: number): number {
    if (max === 0) {
      return 0;
    }

    return Math.floor(Math.random() * (max + 1));
  }
}
