import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SemanticSearchDto {
  @IsUUID('4', { message: 'workspaceId must be a valid UUID' })
  @IsNotEmpty({ message: 'workspaceId is required' })
  workspaceId: string;

  @IsString({ message: 'query must be a string' })
  @IsNotEmpty({ message: 'query cannot be empty' })
  @MaxLength(4000, { message: 'query cannot exceed 4000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  query: string;

  @IsOptional()
  @IsUUID('4', { message: 'documentId must be a valid UUID' })
  documentId?: string;

  @IsOptional()
  @IsArray({ message: 'documentIds must be an array' })
  @IsUUID('4', { each: true, message: 'Each documentId must be a valid UUID' })
  documentIds?: string[];

  @IsOptional()
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @Min(0, { message: 'threshold must be at least 0' })
  @Max(1, { message: 'threshold cannot exceed 1' })
  @Type(() => Number)
  threshold?: number;
}

