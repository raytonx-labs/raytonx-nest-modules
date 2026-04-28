import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DistributedTaskMetadata } from "./scheduler.interfaces";

const logSpy = vi.fn();
const errorSpy = vi.fn();

(
  vi.mock as unknown as (
    path: string,
    factory: () => unknown,
    options: {
      virtual: boolean;
    },
  ) => void
)(
  "@nestjs/common",
  () => ({
    Inject: () => () => undefined,
    Injectable: () => () => undefined,
    Logger: class LoggerMock {
      error = errorSpy;
      log = logSpy;
      warn = vi.fn();
    },
    Optional: () => () => undefined,
  }),
  {
    virtual: true,
  },
);

(
  vi.mock as unknown as (
    path: string,
    factory: () => unknown,
    options: {
      virtual: boolean;
    },
  ) => void
)(
  "@raytonx/core",
  () => ({
    createInjectionToken: (packageName: string, tokenName: string) => `${packageName}:${tokenName}`,
  }),
  {
    virtual: true,
  },
);

const { SchedulerRedisDriverUnavailableError } = await import("./scheduler.errors");
const { SchedulerExecutionService } = await import("./scheduler.execution.service");
const { normalizeSchedulerModuleOptions } = await import("./scheduler.utils");

describe("SchedulerExecutionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to memory driver when Redis is unavailable in auto mode", async () => {
    const service = new SchedulerExecutionService(normalizeSchedulerModuleOptions());
    const task = vi.fn().mockResolvedValue("ok");

    await expect(
      service.executeTask({
        args: [],
        className: "JobService",
        instance: {},
        metadata: createTaskMetadata(),
        originalMethod: task,
      }),
    ).resolves.toBe("ok");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"event":"task_started"'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"event":"task_succeeded"'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"event":"task_finished"'));
  });

  it("throws at startup validation when Redis is explicitly required but unavailable", () => {
    const service = new SchedulerExecutionService(
      normalizeSchedulerModuleOptions({
        driver: "redis",
      }),
    );

    expect(() => service.validateRegisteredTasks([])).toThrow(SchedulerRedisDriverUnavailableError);
  });

  it("uses the Redis driver when a Redis lock service is available", async () => {
    const acquire = vi.fn().mockResolvedValue({
      extend: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
    });
    const service = new SchedulerExecutionService(normalizeSchedulerModuleOptions(), {
      acquire,
    });
    const task = vi.fn().mockResolvedValue("ok");

    await expect(
      service.executeTask({
        args: [],
        className: "JobService",
        instance: {},
        metadata: createTaskMetadata(),
        originalMethod: task,
      }),
    ).resolves.toBe("ok");
    expect(acquire).toHaveBeenCalled();
  });

  it("logs skipped executions", async () => {
    const service = new SchedulerExecutionService(normalizeSchedulerModuleOptions());
    let resolveFirstTask: (() => void) | undefined;
    const firstRun = service.executeTask({
      args: [],
      className: "JobService",
      instance: {},
      metadata: createTaskMetadata(),
      originalMethod: () =>
        new Promise<void>((resolve) => {
          resolveFirstTask = resolve;
        }),
    });

    await expect(
      service.executeTask({
        args: [],
        className: "JobService",
        instance: {},
        metadata: createTaskMetadata(),
        originalMethod: vi.fn(),
      }),
    ).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"event":"task_skipped"'));
    resolveFirstTask?.();
    await firstRun;
  });

  it("logs lock extension failures as errors", async () => {
    vi.useFakeTimers();

    const acquire = vi.fn().mockResolvedValue({
      extend: vi.fn().mockResolvedValue(false),
      release: vi.fn().mockResolvedValue(undefined),
    });
    const service = new SchedulerExecutionService(normalizeSchedulerModuleOptions(), {
      acquire,
    });
    const runPromise = service.executeTask({
      args: [],
      className: "JobService",
      instance: {},
      metadata: createTaskMetadata({
        extendInterval: 10,
        ttl: 30,
      }),
      originalMethod: () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("ok"), 100);
        }),
    });
    const assertion = expect(runPromise).rejects.toThrow();

    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"event":"lock_extend_failed"'));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"event":"lock_expired_before_finish"'),
    );

    vi.useRealTimers();
  });
});

function createTaskMetadata(
  options: DistributedTaskMetadata["options"] = {},
): DistributedTaskMetadata {
  return {
    kind: "cron",
    options,
    propertyKey: "run",
    scheduleValue: "* * * * *",
  };
}
