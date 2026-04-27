import { Inject } from "@nestjs/common";

import { getRedisToken } from "./redis.utils";

export function InjectRedis(name?: string): ParameterDecorator & PropertyDecorator {
  return Inject(getRedisToken(name));
}
