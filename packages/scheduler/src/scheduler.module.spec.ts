import { describe, expect, it, vi } from "vitest";

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
    Module: () => () => undefined,
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

const { SCHEDULER_MODULE_OPTIONS } = await import("./scheduler.constants");
const { SchedulerModule } = await import("./scheduler.module");

describe("SchedulerModule", () => {
  it("maps isGlobal to the Nest dynamic module global option", () => {
    const dynamicModule = SchedulerModule.forRoot({
      isGlobal: true,
    });

    expect(dynamicModule.global).toBe(true);
  });

  it("provides normalized scheduler module options", () => {
    const dynamicModule = SchedulerModule.forRoot();

    expect(dynamicModule.providers).toContainEqual({
      provide: SCHEDULER_MODULE_OPTIONS,
      useValue: expect.objectContaining({
        driver: "auto",
        logging: expect.objectContaining({
          enabled: true,
          mode: "default",
        }),
        lock: expect.objectContaining({
          autoExtend: true,
          extendInterval: 10_000,
          keyPrefix: "scheduler:",
          retryAttempts: 0,
          retryDelay: 200,
          retryJitter: 50,
          ttl: 30_000,
        }),
      }),
    });
  });

  it("creates an async options provider for useFactory", async () => {
    const dynamicModule = SchedulerModule.forRootAsync({
      useFactory: async () => ({
        driver: "memory",
      }),
    });
    const asyncProvider = dynamicModule.providers?.find(
      (provider: unknown) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === SCHEDULER_MODULE_OPTIONS,
    ) as {
      useFactory: () => Promise<unknown>;
    };
    const options = await asyncProvider.useFactory();

    expect(options).toEqual(
      expect.objectContaining({
        driver: "memory",
        logging: expect.objectContaining({
          enabled: true,
          mode: "default",
        }),
      }),
    );
  });
});
