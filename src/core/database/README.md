# Database Sub-module

Manages the MongoDB connection and provides the Data Access Layer (DAL).

## Responsibilities

- **Connection**: `MongooseModule.forRootAsync()` connects to MongoDB using the URI from `ConfigService`.
- **DAL**: `AbstractRepository<T>` is the generic base class for all domain repositories.

## Architectural Constraint

> **Services must NEVER import Mongoose models or operators directly.**
> They interact only through typed repositories that extend `AbstractRepository`.

## Creating a new repository

```typescript
@Injectable()
export class TicketRepository extends AbstractRepository<TicketDocument> {
  protected readonly logger = new Logger(TicketRepository.name);

  constructor(
    @InjectModel(Ticket.name) ticketModel: Model<TicketDocument>,
    @InjectConnection() connection: Connection,
  ) {
    super(ticketModel, connection);
  }
}
```
