import type { DynamicModule, InjectionToken, Type } from "@nestjs/common";

export type MaybePromise<T> = T | Promise<T>;

export interface ModuleOptionsFactory<TOptions> {
  createModuleOptions(): MaybePromise<TOptions>;
}

export interface AsyncModuleOptions<TOptions> {
  imports?: Array<Type<unknown> | DynamicModule>;
  inject?: InjectionToken[];
  useFactory?: (...args: unknown[]) => MaybePromise<TOptions>;
  useClass?: Type<ModuleOptionsFactory<TOptions>>;
  useExisting?: Type<ModuleOptionsFactory<TOptions>>;
}
