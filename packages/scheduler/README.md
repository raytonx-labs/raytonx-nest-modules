# @raytonx/nest-scheduler

用于 NestJS 应用的安全定时任务模块。

English version: [README.en.md](README.en.md)

## 安装

```bash
pnpm add @raytonx/nest-scheduler @nestjs/schedule
```

如需多实例分布式互斥，再额外安装：

```bash
pnpm add @raytonx/nest-redis ioredis
```

## 功能边界

- 基于 `@nestjs/schedule` 的任务装饰器封装
- 单进程下的任务重入跳过
- 可选的 Redis 分布式锁执行保护
- 标准化任务与锁生命周期日志

## 快速开始

```ts
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulerModule } from "@raytonx/nest-scheduler";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SchedulerModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

## Cron / Interval / Timeout

```ts
import { Injectable } from "@nestjs/common";
import { DistributedCron, DistributedInterval, DistributedTimeout } from "@raytonx/nest-scheduler";

@Injectable()
export class JobsService {
  @DistributedCron("0 * * * *")
  async syncReport(): Promise<void> {
    // do work
  }

  @DistributedInterval(10_000)
  async syncMetrics(): Promise<void> {
    // do work
  }

  @DistributedTimeout(5_000)
  async warmup(): Promise<void> {
    // do work
  }
}
```

默认行为：

- 同一任务上次未结束时，本次触发直接跳过
- 未安装或未接入 Redis 时，自动使用进程内锁
- 接入 Redis 时，默认优先使用 Redis 分布式锁
- 长任务默认会自动续期 Redis 锁
- 默认记录任务开始、结束、成功、失败、跳过日志
- Redis 锁续期失败或任务执行期间失去锁所有权时，会单独输出错误日志

## Redis 分布式模式

```ts
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RedisModule } from "@raytonx/nest-redis";
import { SchedulerModule } from "@raytonx/nest-scheduler";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedisModule.forRoot({
      isGlobal: true,
      connections: [
        {
          host: "127.0.0.1",
          port: 6379,
        },
      ],
    }),
    SchedulerModule.forRoot({
      isGlobal: true,
      driver: "auto",
    }),
  ],
})
export class AppModule {}
```

`driver` 规则：

- `auto`：优先 Redis，不可用时回退到 `memory`
- `redis`：强制要求 Redis 锁服务存在
- `memory`：始终只使用单进程内锁

## 配置

```ts
SchedulerModule.forRoot({
  lock: {
    keyPrefix: "scheduler:",
    ttl: 30_000,
    retryAttempts: 0,
    retryDelay: 200,
    retryJitter: 50,
    autoExtend: true,
    extendInterval: 10_000,
  },
  logging: "default",
});
```

## 标准化日志

默认会输出结构化 JSON 日志，事件分为两类：

- 任务事件：`task_started`、`task_succeeded`、`task_failed`、`task_skipped`、`task_finished`
- 锁事件：`lock_acquired`、`lock_extended`、`lock_extend_failed`、`lock_expired_before_finish`、`lock_released`

默认开启的事件：

- `task_started`
- `task_succeeded`
- `task_failed`
- `task_skipped`
- `task_finished`
- `lock_extend_failed`
- `lock_expired_before_finish`

`logging: "verbose"` 会额外开启完整锁日志：

- `lock_acquired`
- `lock_extended`
- `lock_released`

日志字段固定包含：

- `event`
- `executionId`
- `taskName`
- `className`
- `methodName`
- `kind`
- `driver`
- `lockKey`
- `scheduleValue`
- `timestamp`

按场景补充字段：

- `status`
- `durationMs`
- `connectionName`
- `ttl`
- `errorName`
- `errorMessage`

当 Redis 锁 TTL 到期且任务尚未结束时，通常会看到：

- `lock_extend_failed`
- `lock_expired_before_finish`
- 随后的 `task_failed`
- 最终的 `task_finished`

## 装饰器选项

```ts
@DistributedCron("0 * * * *", {
  name: "report-job",
  lockKey: "jobs:report",
  driver: "redis",
  ttl: 60_000,
  skipIfLocked: true,
  logging: "verbose",
})
```

支持：

- `name`
- `lockKey`
- `driver`
- `connectionName`
- `ttl`
- `retryAttempts`
- `retryDelay`
- `retryJitter`
- `autoExtend`
- `extendInterval`
- `skipIfLocked`
- `enabled`
- `logging`

`logging` 支持：

- `"default"`：只输出默认开启的任务日志和关键锁异常日志
- `"verbose"`：额外输出锁获取、续期、释放日志
- `false`：关闭日志

## 导出内容

- `SchedulerModule`
- `DistributedCron`
- `DistributedInterval`
- `DistributedTimeout`
- 调度相关 options、错误类型与常量
