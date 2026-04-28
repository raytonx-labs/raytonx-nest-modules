import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SchedulerRedisDriverUnavailableError,
  SchedulerTaskConflictError,
  SchedulerTaskExtendError,
} from "./scheduler.errors";
import type { ExecutionLockEvent, NormalizedDistributedTaskOptions } from "./scheduler.interfaces";
import { MemoryExecutionLockDriver, RedisExecutionLockDriver } from "./scheduler.lock-driver";

const baseOptions: NormalizedDistributedTaskOptions = {
  autoExtend: true,
  connectionName: "default",
  driver: "auto",
  enabled: true,
  extendInterval: 30,
  keyPrefix: "scheduler:",
  lockKey: undefined,
  logging: {
    enabled: true,
    mode: "default",
  },
  name: undefined,
  retryAttempts: 0,
  retryDelay: 0,
  retryJitter: 0,
  skipIfLocked: true,
  ttl: 90,
};

describe("MemoryExecutionLockDriver", () => {
  it("executes the first task and skips re-entry for the same key", async () => {
    const driver = new MemoryExecutionLockDriver();
    let resolveFirstTask: (() => void) | undefined;
    const firstTask = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstTask = resolve;
        }),
    );
    const firstRun = driver.runWithLock("jobs:sync", firstTask, baseOptions);
    const secondRun = await driver.runWithLock("jobs:sync", vi.fn(), baseOptions);

    expect(secondRun).toEqual({
      executed: false,
    });

    resolveFirstTask?.();

    await expect(firstRun).resolves.toEqual({
      executed: true,
      result: undefined,
    });
  });

  it("releases a key after task failure", async () => {
    const driver = new MemoryExecutionLockDriver();

    await expect(
      driver.runWithLock(
        "jobs:sync",
        () => {
          throw new Error("boom");
        },
        baseOptions,
      ),
    ).rejects.toThrow("boom");

    await expect(driver.runWithLock("jobs:sync", () => "ok", baseOptions)).resolves.toEqual({
      executed: true,
      result: "ok",
    });
  });

  it("throws when skipIfLocked is disabled", async () => {
    const driver = new MemoryExecutionLockDriver();
    let resolveFirstTask: (() => void) | undefined;
    const firstRun = driver.runWithLock(
      "jobs:sync",
      () =>
        new Promise<void>((resolve) => {
          resolveFirstTask = resolve;
        }),
      {
        ...baseOptions,
        skipIfLocked: false,
      },
    );
    const secondRun = driver.runWithLock("jobs:sync", () => undefined, {
      ...baseOptions,
      skipIfLocked: false,
    });

    await expect(secondRun).rejects.toThrow(SchedulerTaskConflictError);
    resolveFirstTask?.();
    await firstRun;
  });
});

describe("RedisExecutionLockDriver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("executes a task when the lock is acquired", async () => {
    const handle = {
      extend: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
    };
    const driver = new RedisExecutionLockDriver({
      acquire: vi.fn().mockResolvedValue(handle),
    });

    await expect(driver.runWithLock("jobs:sync", () => "ok", baseOptions)).resolves.toEqual({
      executed: true,
      result: "ok",
    });
    expect(handle.release).toHaveBeenCalled();
  });

  it("emits lock lifecycle events", async () => {
    const events: ExecutionLockEvent[] = [];
    const handle = {
      extend: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
    };
    const driver = new RedisExecutionLockDriver({
      acquire: vi.fn().mockResolvedValue(handle),
    });

    await driver.runWithLock(
      "jobs:sync",
      () => "ok",
      {
        ...baseOptions,
        autoExtend: false,
      },
      {
        onEvent: (event) => events.push(event),
      },
    );

    expect(events).toEqual([
      expect.objectContaining({
        event: "lock_acquired",
      }),
      expect.objectContaining({
        event: "lock_released",
      }),
    ]);
  });

  it("skips when Redis reports a lock conflict", async () => {
    const driver = new RedisExecutionLockDriver({
      acquire: vi.fn().mockRejectedValue(
        Object.assign(new Error("locked"), {
          name: "RedisLockConflictError",
        }),
      ),
    });

    await expect(driver.runWithLock("jobs:sync", () => "ok", baseOptions)).resolves.toEqual({
      executed: false,
    });
  });

  it("throws when the Redis driver is unavailable", async () => {
    const driver = new RedisExecutionLockDriver();

    await expect(driver.runWithLock("jobs:sync", () => "ok", baseOptions)).rejects.toThrow(
      SchedulerRedisDriverUnavailableError,
    );
  });

  it("surfaces automatic extension failures", async () => {
    vi.useFakeTimers();

    const handle = {
      extend: vi.fn().mockResolvedValue(false),
      release: vi.fn().mockResolvedValue(undefined),
    };
    const driver = new RedisExecutionLockDriver({
      acquire: vi.fn().mockResolvedValue(handle),
    });
    const runPromise = driver.runWithLock(
      "jobs:sync",
      () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("ok"), 100);
        }),
      baseOptions,
    );
    const assertion = expect(runPromise).rejects.toThrow(SchedulerTaskExtendError);

    await vi.advanceTimersByTimeAsync(30);
    await assertion;

    vi.useRealTimers();
  });
});
