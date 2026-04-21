import { parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ConfigModuleOptions, ConfigValues } from "./config.interfaces";

export interface LoadedConfig<TValues extends ConfigValues = ConfigValues> {
  values: TValues;
  envFilePaths: string[];
}

export function loadConfig<TValues extends ConfigValues = ConfigValues>(
  options: ConfigModuleOptions<TValues> = {},
): LoadedConfig<TValues> {
  const cwd = options.cwd ?? process.cwd();
  const envFilePaths = resolveEnvFilePaths(options.envFilePath, cwd);
  const envFileValues = loadEnvFiles(envFilePaths, {
    expandVariables: options.expandVariables ?? true,
    overrideProcessEnv: options.overrideProcessEnv ?? false,
  });

  return {
    envFilePaths,
    values: {
      ...envFileValues,
      ...(options.values ?? {}),
      ...definedProcessEnv(),
    } as TValues,
  };
}

export function resolveEnvFilePaths(
  envFilePath: ConfigModuleOptions["envFilePath"],
  cwd = process.cwd(),
): string[] {
  if (envFilePath === false || envFilePath === undefined) {
    return [];
  }

  if (envFilePath === "auto") {
    const nodeEnv = process.env.NODE_ENV ?? "development";

    return [".env", ".env.local", `.env.${nodeEnv}`, `.env.${nodeEnv}.local`].map((filePath) =>
      resolve(cwd, filePath),
    );
  }

  return (Array.isArray(envFilePath) ? envFilePath : [envFilePath]).map((filePath) =>
    resolve(cwd, filePath),
  );
}

function loadEnvFiles(
  envFilePaths: string[],
  options: {
    expandVariables: boolean;
    overrideProcessEnv: boolean;
  },
): ConfigValues {
  const values: Record<string, string> = {};

  for (const envFilePath of envFilePaths) {
    if (!existsSync(envFilePath)) {
      continue;
    }

    const parsed = parse(readFileSync(envFilePath));

    for (const [key, value] of Object.entries(parsed)) {
      if (options.overrideProcessEnv || process.env[key] === undefined) {
        values[key] = value;
      }
    }
  }

  if (options.expandVariables) {
    return expandVariables(values);
  }

  return values;
}

function expandVariables(values: Record<string, string>): ConfigValues {
  const env = {
    ...values,
    ...definedProcessEnv(),
  };

  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value.replace(/\${([A-Z0-9_]+)}|\$([A-Z0-9_]+)/gi, (match, bracedKey, plainKey) => {
        const envKey = (bracedKey ?? plainKey) as string;

        return env[envKey] ?? match;
      }),
    ]),
  );
}

function definedProcessEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}
