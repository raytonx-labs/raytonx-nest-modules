# RaytonX Nest Packages

RaytonX NestJS infrastructure packages monorepo. Each package is independently installable, buildable, and publishable.

Chinese version: [README.md](README.md)

## Packages

- `@raytonx/core` - shared types and utilities. [packages/core/README.en.md](packages/core/README.en.md)
- `@raytonx/config` - configuration module (env loading + Zod validation). [packages/config/README.en.md](packages/config/README.en.md)
- `@raytonx/nest-cache` - cache module built on the official Nest cache-manager integration, with `CacheModule`, `CacheService`, and Redis URL setup. [packages/cache/README.en.md](packages/cache/README.en.md)
- `@raytonx/nest-logger` - structured logging with Pino, requestId/traceId, standard fields, and sensitive data redaction. [packages/logger/README.en.md](packages/logger/README.en.md)
- `@raytonx/nest-notification` - notification module with built-in Resend email delivery, exposing `NotificationModule` and `NotificationService`. [packages/notification/README.en.md](packages/notification/README.en.md)
- `@raytonx/nest-response` - response envelope module with `TransformInterceptor`, `ResponseExceptionFilter`, `ResponseModule`, and `ResponseBuilder`. [packages/response/README.en.md](packages/response/README.en.md)
- `@raytonx/nest-redis` - Redis connection management, client reuse, and distributed locking without caching features. [packages/redis/README.en.md](packages/redis/README.en.md)
- `@raytonx/nest-scheduler` - safe scheduler helpers on top of `@nestjs/schedule`, with single-process overlap protection and optional Redis locks. [packages/scheduler/README.en.md](packages/scheduler/README.en.md)

## Development Docs

- Chinese: [docs/development.md](docs/development.md)
- English: [docs/development.en.md](docs/development.en.md)

## License

[MIT](./LICENSE)
