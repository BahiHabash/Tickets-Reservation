# Rule: Context, Cardinality, and Dimensionality

**Impact: CRITICAL**

## Description

Logs without context are useless. Logs with low cardinality are hard to filter. Logs with low dimensionality lack detail.

## Best Practices

- **High Cardinality**: Include unique identifiers that allow you to pinpoint single executions (e.g., `user.id`, `traceId`, `requestId`).
- **High Dimensionality**: Add many fields (dimensions) to your logs. Don't be afraid of long JSON objects; they are for machines, not just human eyes.
- **Mandatory Fields**:
    - `service` (from config)
    - `env` (production, staging, development)
    - `action` (from `LogAction` enum)
    - `requestId` / `traceId`
    - `user` object (id, email, role)
    - `client` object (ip, userAgent)
    - `durationMs`
    - `statusCode`
    - `outcome` (success/error)

## Why it matters
High cardinality allows you to answer questions like "Why did ONLY user #556 encounter this error?" instead of just seeing that "Some users had errors."
