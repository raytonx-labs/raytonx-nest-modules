import { describe, expect, it, vi } from "vitest";

import type { DistributedTaskMetadata } from "./scheduler.interfaces";

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
});

function createTaskMetadata(): DistributedTaskMetadata {
  return {
    kind: "cron",
    options: {},
    propertyKey: "run",
    scheduleValue: "* * * * *",
  };
}
