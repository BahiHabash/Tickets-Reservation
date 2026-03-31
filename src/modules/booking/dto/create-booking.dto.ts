import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
// import { Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'The provided ID is not a valid ObjectId' })
  // @Transform(({ value }) => {
  //   return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;
  // })
  eventId: Types.ObjectId;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
