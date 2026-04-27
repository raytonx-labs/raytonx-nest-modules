import { createInjectionToken } from "@raytonx/core";

export const REDIS_PACKAGE_NAME = "@raytonx/nest-redis";
export const DEFAULT_REDIS_CONNECTION_NAME = "default";

export const REDIS_MODULE_OPTIONS = createInjectionToken(REDIS_PACKAGE_NAME, "module-options");
export const REDIS_CLIENTS = createInjectionToken(REDIS_PACKAGE_NAME, "clients");
export const REDIS_LOCK_OPTIONS = createInjectionToken(REDIS_PACKAGE_NAME, "lock-options");
