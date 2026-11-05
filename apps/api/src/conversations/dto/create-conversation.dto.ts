import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateConversationDto {
  @IsUUID('4', { message: 'workspaceId must be a valid UUID' })
  @IsNotEmpty({ message: 'workspaceId is required' })
  workspaceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'title cannot exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsUUID('4', { message: 'documentId must be a valid UUID' })
  documentId?: string;

  @IsOptional()
  @IsArray({ message: 'documentIds must be an array' })
  @IsUUID('4', { each: true, message: 'Each documentId must be a valid UUID' })
  documentIds?: string[];
}

