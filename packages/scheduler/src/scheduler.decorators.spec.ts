import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cronSpy = vi.fn(() => () => undefined);
const intervalSpy = vi.fn(() => () => undefined);
const timeoutSpy = vi.fn(() => () => undefined);
(
  vi.mock as unknown as (
    path: string,
    factory: () => unknown,
    options: {
      virtual: boolean;
    },
  ) => void
)(
  "@nestjs/schedule",
  () => ({
    Cron: cronSpy,
    Interval: intervalSpy,
    Timeout: timeoutSpy,
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
  "@nestjs/common",
  () => ({
    Inject: () => () => undefined,
    Injectable: () => () => undefined,
    Logger: class LoggerMock {
      error(): void {}
      log(): void {}
      warn(): void {}
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

const { DISTRIBUTED_TASK_METADATA } = await import("./scheduler.constants");
const { clearRegisteredDistributedTasks } = await import("./scheduler.discovery");
const { SchedulerExecutionService } = await import("./scheduler.execution.service");
const { DistributedCron, DistributedInterval, DistributedTimeout } =
  await import("./scheduler.decorators");

describe("scheduler decorators", () => {
  beforeEach(() => {
    clearRegisteredDistributedTasks();
    cronSpy.mockClear();
    intervalSpy.mockClear();
    timeoutSpy.mockClear();
    vi.spyOn(SchedulerExecutionService, "run").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes cron metadata and applies the Nest cron decorator", async () => {
    class JobService {
      run(): string {
        return "ok";
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      JobService.prototype,
      "run",
    ) as PropertyDescriptor;

    DistributedCron("0 * * * *", {
      name: "report-job",
    })(JobService.prototype, "run", descriptor);
    Object.defineProperty(JobService.prototype, "run", descriptor);

    const nextDescriptor = Object.getOwnPropertyDescriptor(
      JobService.prototype,
      "run",
    ) as PropertyDescriptor;
    const metadata = Reflect.getMetadata(DISTRIBUTED_TASK_METADATA, JobService.prototype, "run");
    const instance = new JobService();

    expect(metadata).toEqual(
      expect.objectContaining({
        kind: "cron",
        options: expect.objectContaining({
          name: "report-job",
        }),
        propertyKey: "run",
        scheduleValue: "0 * * * *",
      }),
    );
    expect(cronSpy).toHaveBeenCalledWith("0 * * * *", {
      name: "report-job",
    });

    await nextDescriptor.value.call(instance);

    expect(SchedulerExecutionService.run).toHaveBeenCalled();
  });

  it("writes interval metadata and preserves the native interval registration", () => {
    class JobService {
      run(): void {
        return undefined;
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      JobService.prototype,
      "run",
    ) as PropertyDescriptor;

    DistributedInterval(5_000, {
      name: "sync-job",
    })(JobService.prototype, "run", descriptor);
    Object.defineProperty(JobService.prototype, "run", descriptor);

    expect(intervalSpy).toHaveBeenCalledWith("sync-job", 5_000);
    expect(Reflect.getMetadata(DISTRIBUTED_TASK_METADATA, JobService.prototype, "run")).toEqual(
      expect.objectContaining({
        kind: "interval",
        scheduleValue: 5_000,
      }),
    );
  });

  it("writes timeout metadata and preserves the native timeout registration", () => {
    class JobService {
      run(): void {
        return undefined;
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      JobService.prototype,
      "run",
    ) as PropertyDescriptor;

    DistributedTimeout(2_000)(JobService.prototype, "run", descriptor);
    Object.defineProperty(JobService.prototype, "run", descriptor);

    expect(timeoutSpy).toHaveBeenCalledWith(2_000);
    expect(Reflect.getMetadata(DISTRIBUTED_TASK_METADATA, JobService.prototype, "run")).toEqual(
      expect.objectContaining({
        kind: "timeout",
        scheduleValue: 2_000,
      }),
    );
  });
});
