/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@nestjs/common" {
  export type Type<T = unknown> = new (...args: any[]) => T;
  export type InjectionToken = string | symbol | Type<unknown>;

  export interface DynamicModule {
    exports?: unknown[];
    global?: boolean;
    imports?: Array<Type<unknown> | DynamicModule>;
    module: Type<unknown>;
    providers?: Provider[];
  }

  export interface ClassProvider<T = unknown> {
    provide: InjectionToken;
    useClass: Type<T>;
  }

  export interface FactoryProvider<T = unknown> {
    inject?: InjectionToken[];
    provide: InjectionToken;
    useFactory: (...args: any[]) => T | Promise<T>;
  }

  export interface ValueProvider<T = unknown> {
    provide: InjectionToken;
    useValue: T;
  }

  export interface ExistingProvider {
    provide: InjectionToken;
    useExisting: InjectionToken;
  }

  export type Provider<T = unknown> =
    | Type<T>
    | ClassProvider<T>
    | FactoryProvider<T>
    | ValueProvider<T>
    | ExistingProvider;

  export interface OnModuleInit {
    onModuleInit(): unknown;
  }

  export interface OnApplicationShutdown {
    onApplicationShutdown(signal?: string): unknown;
  }

  export class Logger {
    constructor(context?: string);
    error(message: string): void;
    log(message: string): void;
    warn(message: string): void;
  }

  export function Inject(token?: InjectionToken): ParameterDecorator & PropertyDecorator;
  export function Injectable(): ClassDecorator;
  export function Module(metadata?: {
    exports?: unknown[];
    imports?: Array<Type<unknown> | DynamicModule>;
    providers?: Provider[];
  }): ClassDecorator;
  export function Optional(): ParameterDecorator & PropertyDecorator;
}
