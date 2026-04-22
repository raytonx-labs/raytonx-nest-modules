import type { AsyncModuleOptions } from "@raytonx/core";
import type { ZodType } from "zod";

export type ConfigValues = Record<string, unknown>;
export type ConfigEnvFilePath = "auto" | string | string[] | false;
export type ConfigSchema<TValues extends ConfigValues = ConfigValues> = ZodType<TValues>;

export interface ConfigModuleOptions<TValues extends ConfigValues = ConfigValues> {
  global?: boolean;
  isGlobal?: boolean;
  cwd?: string;
  envFilePath?: ConfigEnvFilePath;
  expandVariables?: boolean;
  overrideProcessEnv?: boolean;
  schema?: ConfigSchema<TValues>;
  values?: TValues;
}

export type ConfigModuleAsyncOptions<TValues extends ConfigValues = ConfigValues> =
  AsyncModuleOptions<ConfigModuleOptions<TValues>> &
    Pick<ConfigModuleOptions<TValues>, "global" | "isGlobal">;
