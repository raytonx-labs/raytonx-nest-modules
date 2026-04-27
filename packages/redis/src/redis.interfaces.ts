import type { AsyncModuleOptions } from "@raytonx/core";
import type { RedisOptions } from "ioredis";

export interface RedisConnectionOptions {
  name?: string;
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
  keyPrefix?: string;
  tls?: RedisOptions["tls"];
  options?: RedisOptions;
}

export interface RedisLockModuleOptions {
  connectionName?: string;
  keyPrefix?: string;
  defaultTtl?: number;
  retryDelay?: number;
  retryJitter?: number;
  retryAttempts?: number;
  autoExtend?: boolean;
  extendInterval?: number;
}

export interface RedisModuleOptions {
  global?: boolean;
  isGlobal?: boolean;
  connections: RedisConnectionOptions[];
  lock?: RedisLockModuleOptions;
}

export interface RedisAcquireLockOptions {
  connectionName?: string;
  ttl?: number;
  retryDelay?: number;
  retryJitter?: number;
  retryAttempts?: number;
}

export interface RedisRunWithLockOptions extends RedisAcquireLockOptions {
  autoExtend?: boolean;
  extendInterval?: number;
}

export interface RedisLockHandle {
  key: string;
  token: string;
  ttl: number;
  connectionName: string;
  acquiredAt: number;
  release(): Promise<void>;
  extend(ttl?: number): Promise<boolean>;
}

export type RedisModuleAsyncOptions = AsyncModuleOptions<RedisModuleOptions> &
  Pick<RedisModuleOptions, "global" | "isGlobal"> & {
    connectionNames?: string[];
  };
