import { describe, expect, it, vi } from "vitest";

import { RedisConnectionNotFoundError } from "./redis.errors";
import { RedisService } from "./redis.service";

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

describe("RedisService", () => {
  it("returns configured clients", () => {
    const defaultClient = {
      quit: vi.fn(),
    };
    const analyticsClient = {
      quit: vi.fn(),
    };
    const service = new RedisService(
      new Map([
        ["default", defaultClient as never],
        ["analytics", analyticsClient as never],
      ]),
    );

    expect(service.getClient()).toBe(defaultClient);
    expect(service.getClient("analytics")).toBe(analyticsClient);
    expect(service.getConnectionNames()).toEqual(["default", "analytics"]);
  });

  it("throws when the requested connection does not exist", () => {
    const service = new RedisService(new Map());

    expect(() => service.getClient("missing")).toThrow(RedisConnectionNotFoundError);
  });
});
