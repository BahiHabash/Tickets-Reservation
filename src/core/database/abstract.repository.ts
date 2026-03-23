import {
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  Model,
  FilterQuery,
  UpdateQuery,
  QueryOptions,
  Document,
  ClientSession,
  Connection,
} from 'mongoose';

/**
 * Abstract repository providing generic Mongoose operations.
 * Services must NEVER import Mongoose models or operators directly —
 * they interact only through typed repositories extending this class.
 */
export abstract class AbstractRepository<T extends Document> {
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly model: Model<T>,
    private readonly connection: Connection,
  ) {}

  async create(data: Partial<T>, session?: ClientSession): Promise<T> {
    try {
      const [document] = await this.model.create([data], { session });
      return document;
    } catch (error) {
      this.logger.error('Failed to create document', error);
      throw new InternalServerErrorException('Failed to create document');
    }
  }

  async findOne(
    filterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
  ): Promise<T> {
    const document = await this.model
      .findOne(filterQuery, projection)
      .lean<T>(true);

    if (!document) {
      this.logger.warn('Document not found with filter', filterQuery);
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async findOneOrNull(
    filterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
  ): Promise<T | null> {
    return this.model.findOne(filterQuery, projection).lean<T>(true);
  }

  async find(
    filterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
  ): Promise<T[]> {
    return this.model.find(filterQuery, projection).lean<T[]>(true);
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>,
  ): Promise<T> {
    const document = await this.model
      .findOneAndUpdate(filterQuery, update, {
        new: true,
        ...options,
      })
      .lean<T>(true);

    if (!document) {
      this.logger.warn(
        'Document not found for update with filter',
        filterQuery,
      );
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async deleteOne(filterQuery: FilterQuery<T>): Promise<void> {
    const result = await this.model.deleteOne(filterQuery);

    if (result.deletedCount === 0) {
      this.logger.warn(
        'Document not found for deletion with filter',
        filterQuery,
      );
      throw new NotFoundException('Document not found');
    }
  }

  async insertMany(docs: Partial<T>[], session?: ClientSession): Promise<T[]> {
    try {
      const documents = await this.model.insertMany(docs, { session });
      return documents as unknown as T[];
    } catch (error) {
      this.logger.error('Failed to insert many documents', error);
      throw new InternalServerErrorException('Failed to insert many documents');
    }
  }

  async startTransaction(): Promise<ClientSession> {
    const session = await this.connection.startSession();
    session.startTransaction();
    return session;
  }
}
