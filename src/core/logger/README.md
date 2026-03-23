# Logger Sub-module

Implements structured **Wide-Event** logging persisted to MongoDB with a hierarchical schema.

## Responsibilities

- **`WideEventLog` schema**: Mongoose model stored in the `logs` collection.
- **Hierarchical Context**: captures `user`, `client`, and `error` details in nested objects.
- **`WideEventLoggerService`**: Implements NestJS `LoggerService`. Every log is written to MongoDB as a structured Wide Event (fire-and-forget) and printed to stdout/stderr.

## Usage

The logger uses `AsyncLocalStorage` to maintain context throughout a request. Use `this.logger.assign()` to add data to the current Wide Event.

### In Controllers (Business Action)
Controllers define the high-level action and primary user context.

```typescript
@Post('login')
async login(@Body() loginDto: LoginUserDto) {
  this.logger.assign({
    action: LogAction.LOGIN,
    user: { email: loginDto.email },
    messages: [`Login attempt for ${loginDto.email}`],
  });
  return this.userService.login(loginDto);
}
```

### In Services (Technical Traces)
Services add granular execution steps to the `messages` array.

```typescript
async hashPassword(password: string): Promise<string> {
  this.logger.assign({
    messages: [`Hashing password Attempt`],
  });
  return bcrypt.hash(password, 10);
}
```

### Capturing Auth Context
Once a user is authenticated, populate the full user object.

```typescript
this.logger.assign({
  user: {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  },
});
```

## ⚠️ Mandatory Usage

The `WideEventLoggerService` is the **exclusive** logging mechanism for this project.

- **Do NOT** use `console.log`.
- **Use `LogAction` enums** for the `action` field to ensure consistency.
- **Controllers** should set the `action` and high-level `user` context.
- **Services** should use `messages` for technical "breadcrumbs" within the operation.

