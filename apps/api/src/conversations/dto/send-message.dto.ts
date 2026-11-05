import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SendMessageDto {
  @IsString({ message: 'content must be a string' })
  @IsNotEmpty({ message: 'content cannot be empty' })
  @MaxLength(4000, { message: 'content cannot exceed 4000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content: string;

  @IsOptional()
  @IsBoolean({ message: 'stream must be a boolean' })
  @Type(() => Boolean)
  stream?: boolean;
}

