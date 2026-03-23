# Rule: Common Pitfalls

**Impact: HIGH**

## Description

Avoid these common mistakes that lead to security vulnerabilities, performance issues, or unreadable logs.

## Best Practices

- **Never Log PII**: Do not include emails, physical addresses, or full names unless absolutely necessary and permitted by compliance (PII: Personally Identifiable Information).
- **No Secrets**: Never log API keys, passwords, bearer tokens, or database credentials.
- **Avoid Tight Loops**: Do not log inside loops that execute hundreds or thousands of times. This can cause severe performance bottlenecks.
- **No Large Blobs**: Avoid logging base64 images, large XML strings, or entire file contents.
- **Synchronous Logging**: Ensure your logging doesn't block the main thread (WideEventLoggerService handles this correctly).
