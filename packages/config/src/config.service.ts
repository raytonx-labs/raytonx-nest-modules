import { Inject, Injectable, Optional } from "@nestjs/common";

import { CONFIG_MODULE_OPTIONS } from "./config.constants";
import type { ConfigModuleOptions, ConfigValues } from "./config.interfaces";

@Injectable()
export class ConfigService<TValues extends ConfigValues = ConfigValues> {
  private readonly values: TValues;

  constructor(@Optional() @Inject(CONFIG_MODULE_OPTIONS) options?: ConfigModuleOptions<TValues>) {
    this.values = (options?.values ?? {}) as TValues;
  }

  get<TKey extends keyof TValues>(key: TKey): TValues[TKey] | undefined {
    return this.values[key];
  }

  getOrThrow<TKey extends keyof TValues>(key: TKey): TValues[TKey] {
    const value = this.get(key);

    if (value === undefined) {
      throw new Error(`Missing required config value: ${String(key)}`);
    }

    return value;
  }

  all(): Readonly<TValues> {
    return this.values;
  }
}
