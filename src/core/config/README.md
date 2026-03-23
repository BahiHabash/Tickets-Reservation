# Config Sub-module

Centralises all environment variable management for the application.

## Responsibilities

- **Validation**: Uses Joi to validate all env vars at startup (fail-fast).
- **Namespaced configs**: Each domain (app, database, redis) has its own `registerAs` config factory.
- **Global**: `AppConfigModule` registers `ConfigModule` as global — inject `ConfigService` anywhere without re-importing.

## Adding a new config namespace

1. Create `src/core/config/configurations/<name>.config.ts` using `registerAs`.
2. Re-export it from `configurations/index.ts`.
3. Add the new config to the `load` array in `config.module.ts`.
4. Add the corresponding env vars to `env-validation.schema.ts`.
