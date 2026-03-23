# Rule: Structure and Format

**Impact: HIGH**

## Description

All logs MUST be structured as JSON for machine readability and efficient searching in log aggregators (ELK, Datadog, Honeycomb).

## Best Practices

- **Hierarchical Structure**: Prefer nested objects for core entities (`user`, `client`, `error`) to maintain a clean top-level namespace.
  - `{ "user": { "id": "...", "email": "..." } }`
  - `{ "client": { "ip": "...", "userAgent": "..." } }`
- **Consistent Keys**: Always use the same keys for the same concepts (e.g., use `durationMs` everywhere, not `latency` in some places and `timeTaken` in others).
- **Log Actions**: Use the `LogAction` enum for the `action` field to ensure a searchable, finite set of business operations.
- **Log Levels**: Use standard levels from `logs.enum.ts`: `LOG`, `ERROR`, `WARN`, `DEBUG`, `VERBOSE`, `FATAL`.
- **Breadcrumbs**: Use the `messages` array to store a sequential list of technical steps ("breadcrumbs") instead of scattering multiple log lines for a single operation.
