import { Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import { type SchedulerExecutionService } from "./scheduler.execution.service";
import { type DistributedTaskMetadata } from "./scheduler.interfaces";

const registeredTasks: DistributedTaskMetadata[] = [];

export function registerDistributedTask(metadata: DistributedTaskMetadata): void {
  registeredTasks.push(metadata);
}

export function clearRegisteredDistributedTasks(): void {
  registeredTasks.length = 0;
}

@Injectable()
export class SchedulerDiscoveryService implements OnModuleInit, OnApplicationShutdown {
  constructor(private readonly executionService: SchedulerExecutionService) {}

  onModuleInit(): void {
    this.executionService.registerRuntime();
    this.executionService.validateRegisteredTasks(registeredTasks);
  }

  onApplicationShutdown(): void {
    this.executionService.unregisterRuntime();
  }
}
