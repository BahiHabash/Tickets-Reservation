---
name: logging-best-practices
description: Core principles for high-context, structured logging using "Wide Events" (Canonical Log Lines).
---

# Logging Best Practices

Master the art of high-context, structured logging using "Wide Events" (Canonical Log Lines) to make your applications observable and easy to debug.

## Core Principles

- **Wide Events**: One context-rich event per request per service.
- **Hierarchical Structure**: Use nested objects for core entities (`user`, `client`, `error`) to maintain a clean top-level namespace.
- **High Cardinality**: Include unique IDs (user_id, request_id) that allow you to pinpoint specific executions.
- **High Dimensionality**: Add as many relevant fields as possible to every log line.
- **Structured**: Mandatory JSON format for machine readability.

## Mandatory Context Essentials

Every log should ideally include:
- **Environment**: env, traceId, requestId
- **Context**: action (from `LogAction` enum), service, context
- **Business**: user (id, email, role), organization_id, projectId
- **Outcome**: durationMs, statusCode, outcome (success/error)
- **Technical**: messages (array of breadcrumbs), error (type, message, stack)

## Implementation Guide (Tickets Reservation Engine)

1.  **Controllers (Business Action)**: Set the high-level `action` using the `LogAction` enum and populate initial `user` context.
2.  **Services (Technical Breadcrumbs)**: Append technical milestones or "traces" to the `messages` array using `this.logger.assign()`.
3.  **Error Handling**: Let the `WideEventInterceptor` handle exceptions. It automatically populates the `error` object and sets the outcome to `"error"`.
4.  **Sampling**: 100% of errors and slow requests are kept; 3% of happy/fast requests are sampled.

## Anti-Patterns (Avoid)

- **Scattered Logs**: Logging multiple lines for one request. Use `messages` array instead.
- **Missing Context**: Logs without a `user` or `action`.
- **Unstructured Strings**: `log.info("User " + id + " logged in")`
- **Mutating Core Fields**: Manually overwriting `traceId` or `requestId` after initialization.
- **Flattened User/IP fields**: Putting `userId` or `ip` at the top level instead of in their respective nested objects.
