import { createInjectionToken } from "@raytonx/core";

const PACKAGE_NAME = "@raytonx/nest-notification";

export const NOTIFICATION_MODULE_OPTIONS = createInjectionToken(
  PACKAGE_NAME,
  "NOTIFICATION_MODULE_OPTIONS",
);
export const NOTIFICATION_CLIENT = createInjectionToken(PACKAGE_NAME, "NOTIFICATION_CLIENT");
