import type { AsyncModuleOptions } from "@raytonx/core";

export type ConfigValues = Record<string, unknown>;

export interface ConfigModuleOptions<TValues extends ConfigValues = ConfigValues> {
  global?: boolean;
  values?: TValues;
}

export type ConfigModuleAsyncOptions<TValues extends ConfigValues = ConfigValues> =
  AsyncModuleOptions<ConfigModuleOptions<TValues>>;
