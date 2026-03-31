import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { EventStatus } from '../enums/event-status.enum';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}
