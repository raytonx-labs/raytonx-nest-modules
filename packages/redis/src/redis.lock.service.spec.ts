import { beforeEach, describe, expect, it, vi } from "vitest";

import { RedisLockAcquireError, RedisLockExtendError, RedisLockReleaseError } from "./redis.errors";
import { RedisLockService } from "./redis.lock.service";
import { type RedisService } from "./redis.service";

const mockVirtual = vi.mock as unknown as (
  path: string,
  factory: () => unknown,
  options: {
    virtual: boolean;
  },
) => void;

mockVirtual(
  "@nestjs/common",
  () => ({
    Inject: () => () => undefined,
    Injectable: () => () => undefined,
    Optional: () => () => undefined,
  }),
  {
    virtual: true,
  },
);

mockVirtual(
  "@raytonx/core",
  () => ({
    createInjectionToken: (packageName: string, tokenName: string) => `${packageName}:${tokenName}`,
  }),
  {
    virtual: true,
  },
);

mockVirtual(
  "ioredis",
  () => ({
    default: class RedisMock {
      constructor(..._args: unknown[]) {}
    },
  }),
  {
    virtual: true,
  },
);

function createRedisService(client: {
  eval: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
}) {
  return {
    getClient: vi.fn(() => client),
  } as unknown as RedisService;
}

describe("RedisLockService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("acquires and releases a lock", async () => {
    const client = {
      eval: vi.fn().mockResolvedValue(1),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const service = new RedisLockService(createRedisService(client));
    const handle = await service.acquire("jobs:sync", {
      retryAttempts: 0,
      ttl: 1_000,
    });

    expect(handle.connectionName).toBe("default");
    expect(handle.key).toBe("jobs:sync");
    await expect(service.release(handle)).resolves.toBeUndefined();
    expect(client.set).toHaveBeenCalledWith(
      "lock:jobs:sync",
      expect.any(String),
      "PX",
      1_000,
      "NX",
    );
    expect(client.eval).toHaveBeenCalled();
  });

  it("throws when a lock cannot be acquired", async () => {
    const client = {
      eval: vi.fn(),
      set: vi.fn().mockResolvedValue(null),
    };
    const service = new RedisLockService(createRedisService(client));

    await expect(
      service.acquire("jobs:sync", {
        retryAttempts: 0,
        ttl: 1_000,
      }),
    ).rejects.toThrow(RedisLockAcquireError);
  });

  it("returns false when extend loses ownership", async () => {
    const client = {
      eval: vi.fn().mockResolvedValueOnce(0),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const service = new RedisLockService(createRedisService(client));
    const handle = await service.acquire("jobs:sync", {
      retryAttempts: 0,
      ttl: 1_000,
    });

    await expect(service.extend(handle)).resolves.toBe(false);
  });

  it("throws when release loses ownership", async () => {
    const client = {
      eval: vi.fn().mockResolvedValueOnce(0),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const service = new RedisLockService(createRedisService(client));
    const handle = await service.acquire("jobs:sync", {
      retryAttempts: 0,
      ttl: 1_000,
    });

    await expect(service.release(handle)).rejects.toThrow(RedisLockReleaseError);
  });

  it("runs a task with automatic lock extension", async () => {
    vi.useFakeTimers();

    const client = {
      eval: vi.fn().mockResolvedValue(1),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const service = new RedisLockService(createRedisService(client), {
      autoExtend: true,
      defaultTtl: 90,
      extendInterval: 30,
      retryAttempts: 0,
    });
    const task = vi.fn(
      async () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("ok"), 100);
        }),
    );
    const resultPromise = service.runWithLock("jobs:sync", task);

    await vi.advanceTimersByTimeAsync(100);

    await expect(resultPromise).resolves.toBe("ok");
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining("pexpire"),
      1,
      "lock:jobs:sync",
      expect.any(String),
      "90",
    );

    vi.useRealTimers();
  });

  it("surfaces automatic extension failures", async () => {
    vi.useFakeTimers();

    const client = {
      eval: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const service = new RedisLockService(createRedisService(client), {
      autoExtend: true,
      defaultTtl: 90,
      extendInterval: 30,
      retryAttempts: 0,
    });
    const resultPromise = service.runWithLock(
      "jobs:sync",
      () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("ok"), 100);
        }),
    );
    const assertion = expect(resultPromise).rejects.toThrow(RedisLockExtendError);

    await vi.advanceTimersByTimeAsync(30);

    await assertion;

    vi.useRealTimers();
  });
});
