import { describe, expect, it, vi } from "vitest";

import { REDIS_LOCK_OPTIONS, REDIS_MODULE_OPTIONS } from "./redis.constants";
import { RedisModule } from "./redis.module";
import { getRedisToken } from "./redis.utils";

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
    Module: () => () => undefined,
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

describe("RedisModule", () => {
  it("maps isGlobal to the Nest dynamic module global option", () => {
    const dynamicModule = RedisModule.forRoot({
      connections: [
        {
          host: "localhost",
        },
      ],
      isGlobal: true,
    });

    expect(dynamicModule.global).toBe(true);
  });

  it("provides normalized redis module options", () => {
    const dynamicModule = RedisModule.forRoot({
      connections: [
        {
          host: "localhost",
        },
      ],
    });

    expect(dynamicModule.providers).toContainEqual({
      provide: REDIS_MODULE_OPTIONS,
      useValue: expect.objectContaining({
        connections: [
          expect.objectContaining({
            host: "localhost",
            name: "default",
          }),
        ],
      }),
    });

    expect(dynamicModule.providers).toContainEqual({
      provide: REDIS_LOCK_OPTIONS,
      useValue: expect.objectContaining({
        connectionName: "default",
        defaultTtl: 30_000,
        keyPrefix: "lock:",
      }),
    });
  });

  it("exports redis client tokens for all configured connections", () => {
    const dynamicModule = RedisModule.forRoot({
      connections: [
        {
          host: "localhost",
        },
        {
          host: "localhost",
          name: "analytics",
        },
      ],
    });

    expect(dynamicModule.exports).toContain(getRedisToken());
    expect(dynamicModule.exports).toContain(getRedisToken("analytics"));
  });
});
