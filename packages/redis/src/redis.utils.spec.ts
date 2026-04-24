import { describe, expect, it, vi } from "vitest";

import { RedisModuleOptionsError } from "./redis.errors";
import {
  getAsyncConnectionNames,
  getRedisToken,
  normalizeRedisLockOptions,
  normalizeRedisModuleOptions,
} from "./redis.utils";

const mockVirtual = vi.mock as unknown as (
  path: string,
  factory: () => unknown,
  options: {
    virtual: boolean;
  },
) => void;

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

describe("redis utils", () => {
  it("normalizes module options and connection names", () => {
    const options = normalizeRedisModuleOptions({
      connections: [
        {
          host: "localhost",
        },
      ],
    });

    expect(options.connections[0]?.name).toBe("default");
    expect(options.lock.connectionName).toBe("default");
  });

  it("throws for duplicate connection names", () => {
    expect(() =>
      normalizeRedisModuleOptions({
        connections: [
          {
            host: "localhost",
          },
          {
            host: "localhost",
            name: "default",
          },
        ],
      }),
    ).toThrow(RedisModuleOptionsError);
  });

  it("creates a namespaced redis token", () => {
    expect(getRedisToken()).toBe("@raytonx/nest-redis:client:default");
    expect(getRedisToken("analytics")).toBe("@raytonx/nest-redis:client:analytics");
  });

  it("normalizes async connection names", () => {
    expect(getAsyncConnectionNames()).toEqual(["default"]);
    expect(getAsyncConnectionNames(["default", "analytics"])).toEqual(["default", "analytics"]);
  });

  it("applies lock defaults", () => {
    expect(normalizeRedisLockOptions()).toEqual(
      expect.objectContaining({
        autoExtend: true,
        connectionName: "default",
        defaultTtl: 30_000,
        extendInterval: 10_000,
        keyPrefix: "lock:",
      }),
    );
  });
});
