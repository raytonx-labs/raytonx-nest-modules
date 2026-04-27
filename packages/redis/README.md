# @raytonx/nest-redis

用于 NestJS 应用的 Redis 基础设施模块。

English version: [README.en.md](README.en.md)

## 安装

```bash
pnpm add @raytonx/nest-redis ioredis
```

```bash
npm i @raytonx/nest-redis ioredis
```

```bash
yarn add @raytonx/nest-redis ioredis
```

## 功能边界

本包只提供：

- Redis 连接管理
- Redis 客户端注入与复用
- Redis 分布式锁

## 快速开始

```ts
import { Module } from "@nestjs/common";
import { RedisModule } from "@raytonx/nest-redis";

@Module({
  imports: [
    RedisModule.forRoot({
      isGlobal: true,
      connections: [
        {
          host: "127.0.0.1",
          port: 6379,
        },
      ],
    }),
  ],
})
export class AppModule {}
```

## 多连接

```ts
RedisModule.forRoot({
  connections: [
    {
      host: "127.0.0.1",
      name: "default",
      port: 6379,
    },
    {
      host: "127.0.0.1",
      name: "analytics",
      port: 6380,
    },
  ],
});
```

未传 `name` 时默认视为 `default`。连接名不能重复。

## 注入 Redis 客户端

直接注入默认连接：

```ts
import { Injectable } from "@nestjs/common";
import { InjectRedis } from "@raytonx/nest-redis";
import type Redis from "ioredis";

@Injectable()
export class AppService {
  constructor(@InjectRedis() private readonly redis: Redis) {}
}
```

注入具名连接：

```ts
import { Injectable } from "@nestjs/common";
import { InjectRedis } from "@raytonx/nest-redis";
import type Redis from "ioredis";

@Injectable()
export class AnalyticsService {
  constructor(@InjectRedis("analytics") private readonly redis: Redis) {}
}
```

也可以通过 `RedisService` 获取客户端：

```ts
import { Injectable } from "@nestjs/common";
import { RedisService } from "@raytonx/nest-redis";

@Injectable()
export class QueueService {
  constructor(private readonly redisService: RedisService) {}

  async ping(): Promise<string> {
    return this.redisService.getClient().ping();
  }
}
```

## forRootAsync

```ts
import { RedisModule } from "@raytonx/nest-redis";

RedisModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connections: [
      {
        host: config.getOrThrow("REDIS_HOST"),
        port: Number(config.getOrThrow("REDIS_PORT")),
      },
      {
        host: config.getOrThrow("ANALYTICS_REDIS_HOST"),
        name: "analytics",
        port: Number(config.getOrThrow("ANALYTICS_REDIS_PORT")),
      },
    ],
  }),
  connectionNames: ["default", "analytics"],
});
```

当使用 `forRootAsync` 且希望通过 `@InjectRedis("name")` 直接注入具名连接时，需要显式提供 `connectionNames`，以便 Nest 在模块初始化时导出对应 token。`RedisService.getClient(name)` 不受此限制。

## 分布式锁

```ts
import { Injectable } from "@nestjs/common";
import { RedisLockService } from "@raytonx/nest-redis";

@Injectable()
export class JobsService {
  constructor(private readonly redisLockService: RedisLockService) {}

  runDailyJob(): Promise<void> {
    return this.redisLockService.runWithLock("jobs:daily-report", async () => {
      // do work
    });
  }
}
```

默认行为：

- 加锁使用 `SET key token NX PX ttl`
- 锁冲突时会抛出 `RedisLockConflictError`
- 解锁会校验 token，避免误删别人的锁
- `runWithLock` 默认开启自动续期
- 默认锁 key 前缀为 `lock:`

## 锁配置

```ts
RedisModule.forRoot({
  connections: [
    {
      host: "127.0.0.1",
      port: 6379,
    },
  ],
  lock: {
    connectionName: "default",
    defaultTtl: 30_000,
    retryAttempts: 20,
    retryDelay: 200,
    retryJitter: 50,
    autoExtend: true,
    extendInterval: 10_000,
  },
});
```

## 锁 API

```ts
const handle = await redisLockService.acquire("jobs:sync");

await handle.extend(60_000);
await handle.release();
```

`RedisLockHandle` 包含：

- `key`
- `token`
- `ttl`
- `connectionName`
- `acquiredAt`
- `release()`
- `extend(ttl?)`

## 导出内容

- `RedisModule`
- `RedisService`
- `RedisLockService`
- `REDIS_LOCK_SERVICE`
- `InjectRedis(name?)`
- `getRedisToken(name?)`
- 锁相关错误类型与 options 类型

## 总结

- 通过 `connections` 支持 `default` 和具名多连接
- 通过 `@InjectRedis()` 或 `RedisService` 复用客户端
- 通过 `RedisLockService` 提供带自动续期能力的 Redis 分布式锁
- 不包含缓存功能
