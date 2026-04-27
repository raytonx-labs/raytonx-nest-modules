import Redis, { type RedisOptions } from "ioredis";
import { randomUUID } from "node:crypto";

import { DEFAULT_REDIS_CONNECTION_NAME } from "./redis.constants";
import { RedisConnectionNotFoundError, RedisModuleOptionsError } from "./redis.errors";
import type {
  RedisConnectionOptions,
  RedisLockModuleOptions,
  RedisModuleOptions,
} from "./redis.interfaces";

export function normalizeRedisConnectionName(name?: string): string {
  return name?.trim() || DEFAULT_REDIS_CONNECTION_NAME;
}

export function getRedisToken(name?: string): string {
  return `@raytonx/nest-redis:client:${normalizeRedisConnectionName(name)}`;
}

export function normalizeRedisModuleOptions(
  options: RedisModuleOptions,
): Required<RedisModuleOptions> {
  if (options.connections.length === 0) {
    throw new RedisModuleOptionsError("RedisModule requires at least one connection.");
  }

  const names = new Set<string>();
  const normalizedConnections = options.connections.map((connection) => {
    const name = normalizeRedisConnectionName(connection.name);

    if (names.has(name)) {
      throw new RedisModuleOptionsError(`Duplicate Redis connection name: "${name}".`);
    }

    names.add(name);

    return {
      ...connection,
      name,
    };
  });

  return {
    ...options,
    global: options.global ?? false,
    isGlobal: options.isGlobal ?? false,
    connections: normalizedConnections,
    lock: normalizeRedisLockOptions(options.lock),
  };
}

export function normalizeRedisLockOptions(
  options?: RedisLockModuleOptions,
): Required<RedisLockModuleOptions> {
  const normalized = {
    connectionName: normalizeRedisConnectionName(options?.connectionName),
    keyPrefix: options?.keyPrefix ?? "lock:",
    defaultTtl: options?.defaultTtl ?? 30_000,
    retryDelay: options?.retryDelay ?? 200,
    retryJitter: options?.retryJitter ?? 50,
    retryAttempts: options?.retryAttempts ?? 20,
    autoExtend: options?.autoExtend ?? true,
    extendInterval: options?.extendInterval,
  };

  assertPositiveInteger("lock.defaultTtl", normalized.defaultTtl);
  assertNonNegativeInteger("lock.retryDelay", normalized.retryDelay);
  assertNonNegativeInteger("lock.retryJitter", normalized.retryJitter);
  assertNonNegativeInteger("lock.retryAttempts", normalized.retryAttempts);

  if (normalized.extendInterval !== undefined) {
    assertPositiveInteger("lock.extendInterval", normalized.extendInterval);
  }

  return {
    ...normalized,
    extendInterval:
      normalized.extendInterval ?? Math.max(1_000, Math.floor(normalized.defaultTtl / 3)),
  };
}

export function createRedisClients(options: RedisModuleOptions): Map<string, Redis> {
  const normalizedOptions = normalizeRedisModuleOptions(options);
  const clients = new Map<string, Redis>();

  for (const connection of normalizedOptions.connections) {
    clients.set(normalizeRedisConnectionName(connection.name), createRedisClient(connection));
  }

  return clients;
}

export function getRedisClientFromMap(clients: Map<string, Redis>, name?: string): Redis {
  const connectionName = normalizeRedisConnectionName(name);
  const client = clients.get(connectionName);

  if (!client) {
    throw new RedisConnectionNotFoundError(connectionName);
  }

  return client;
}

export function createRedisClient(connection: RedisConnectionOptions): Redis {
  const options = buildRedisOptions(connection);

  if (connection.url) {
    return new Redis(connection.url, options);
  }

  return new Redis(options);
}

export function buildRedisOptions(connection: RedisConnectionOptions): RedisOptions {
  const options: RedisOptions = {
    ...connection.options,
  };

  const host = connection.host ?? connection.options?.host;
  const port = connection.port ?? connection.options?.port;
  const username = connection.username ?? connection.options?.username;
  const password = connection.password ?? connection.options?.password;
  const db = connection.db ?? connection.options?.db;
  const keyPrefix = connection.keyPrefix ?? connection.options?.keyPrefix;
  const tls = connection.tls ?? connection.options?.tls;

  if (host !== undefined) {
    options.host = host;
  }

  if (port !== undefined) {
    options.port = port;
  }

  if (username !== undefined) {
    options.username = username;
  }

  if (password !== undefined) {
    options.password = password;
  }

  if (db !== undefined) {
    options.db = db;
  }

  if (keyPrefix !== undefined) {
    options.keyPrefix = keyPrefix;
  }

  if (tls !== undefined) {
    options.tls = tls;
  }

  return options;
}

export function createLockKey(prefix: string, key: string): string {
  return `${prefix}${key}`;
}

export function createLockToken(): string {
  return randomUUID();
}

export function getAsyncConnectionNames(connectionNames?: string[]): string[] {
  if (connectionNames === undefined || connectionNames.length === 0) {
    return [DEFAULT_REDIS_CONNECTION_NAME];
  }

  const names = new Set<string>();

  for (const name of connectionNames.map((item) => normalizeRedisConnectionName(item))) {
    if (names.has(name)) {
      throw new RedisModuleOptionsError(
        `Duplicate Redis connection name in forRootAsync: "${name}".`,
      );
    }

    names.add(name);
  }

  return [...names];
}

export function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RedisModuleOptionsError(`${name} must be a positive integer.`);
  }
}

export function assertNonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RedisModuleOptionsError(`${name} must be a non-negative integer.`);
  }
}
