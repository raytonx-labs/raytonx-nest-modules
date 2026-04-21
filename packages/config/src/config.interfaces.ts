import type { AsyncModuleOptions } from "@raytonx/core";

export type ConfigValues = Record<string, unknown>;
export type ConfigEnvFilePath = "auto" | string | string[] | false;

export interface ConfigModuleOptions<TValues extends ConfigValues = ConfigValues> {
  global?: boolean;
  isGlobal?: boolean;
  cwd?: string;
  envFilePath?: ConfigEnvFilePath;
  expandVariables?: boolean;
  overrideProcessEnv?: boolean;
  values?: TValues;
}

export type ConfigModuleAsyncOptions<TValues extends ConfigValues = ConfigValues> =
  AsyncModuleOptions<ConfigModuleOptions<TValues>> &
    Pick<ConfigModuleOptions<TValues>, "global" | "isGlobal">;
