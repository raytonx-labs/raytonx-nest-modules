import { createInjectionToken } from "@raytonx/core";

export const SCHEDULER_PACKAGE_NAME = "@raytonx/nest-scheduler";
export const SCHEDULER_MODULE_OPTIONS = createInjectionToken(
  SCHEDULER_PACKAGE_NAME,
  "module-options",
);
export const DISTRIBUTED_TASK_METADATA = `${SCHEDULER_PACKAGE_NAME}:distributed-task`;
export const OPTIONAL_REDIS_LOCK_SERVICE_TOKEN = "@raytonx/nest-redis:lock-service";
