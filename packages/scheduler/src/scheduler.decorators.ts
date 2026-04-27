import { Cron, type CronOptions, Interval, Timeout } from "@nestjs/schedule";
import "reflect-metadata";

import { DISTRIBUTED_TASK_METADATA } from "./scheduler.constants";
import { registerDistributedTask } from "./scheduler.discovery";
import { SchedulerExecutionService } from "./scheduler.execution.service";
import {
  type DistributedTaskKind,
  type DistributedTaskMetadata,
  type DistributedTaskOptions,
} from "./scheduler.interfaces";
import { normalizeMethodName } from "./scheduler.utils";

export function DistributedCron(
  cronExpression: string,
  options: DistributedTaskOptions = {},
): MethodDecorator {
  return createDistributedTaskDecorator("cron", cronExpression, options, (descriptor) => {
    Cron(cronExpression, createCronOptions(options))(
      descriptor.target,
      descriptor.propertyKey,
      descriptor.value,
    );
  });
}

export function DistributedInterval(
  timeout: number,
  options: DistributedTaskOptions = {},
): MethodDecorator {
  return createDistributedTaskDecorator("interval", timeout, options, (descriptor) => {
    const decorator = options.name ? Interval(options.name, timeout) : Interval(timeout);

    decorator(descriptor.target, descriptor.propertyKey, descriptor.value);
  });
}

export function DistributedTimeout(
  timeout: number,
  options: DistributedTaskOptions = {},
): MethodDecorator {
  return createDistributedTaskDecorator("timeout", timeout, options, (descriptor) => {
    const decorator = options.name ? Timeout(options.name, timeout) : Timeout(timeout);

    decorator(descriptor.target, descriptor.propertyKey, descriptor.value);
  });
}

function createDistributedTaskDecorator(
  kind: DistributedTaskKind,
  scheduleValue: number | string,
  options: DistributedTaskOptions,
  applyNativeDecorator: (descriptor: DecoratorDescriptor) => void,
): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const methodName = normalizeMethodName(propertyKey);
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const metadata: DistributedTaskMetadata = {
      kind,
      options: {
        ...options,
      },
      propertyKey: methodName,
      scheduleValue,
    };
    const wrappedMethod = function (this: object, ...args: unknown[]) {
      return SchedulerExecutionService.run({
        args,
        className:
          (this as { constructor?: { name?: string } }).constructor?.name ?? "AnonymousTask",
        instance: this,
        metadata,
        originalMethod,
      });
    };

    descriptor.value = wrappedMethod;
    Reflect.defineMetadata(DISTRIBUTED_TASK_METADATA, metadata, descriptor.value);
    Reflect.defineMetadata(DISTRIBUTED_TASK_METADATA, metadata, target, propertyKey);
    registerDistributedTask(metadata);
    applyNativeDecorator({
      propertyKey,
      target,
      value: descriptor,
    });

    return descriptor;
  };
}

function createCronOptions(options: DistributedTaskOptions): CronOptions | undefined {
  if (!options.name) {
    return undefined;
  }

  return {
    name: options.name,
  };
}

interface DecoratorDescriptor {
  propertyKey: string | symbol;
  target: object;
  value: PropertyDescriptor;
}
