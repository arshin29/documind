import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentStatus, DocumentType } from '@prisma/client';

export type DocumentSortBy = 'createdAt' | 'title' | 'fileSize';
export type SortOrder = 'asc' | 'desc';

export class QueryDocumentsDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  fileType?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  sortBy?: DocumentSortBy;

  @IsOptional()
  @IsString()
  sortOrder?: SortOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

