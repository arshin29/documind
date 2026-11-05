import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class QueryConversationsDto {
  @IsUUID('4', { message: 'workspaceId must be a valid UUID' })
  @IsNotEmpty({ message: 'workspaceId is required' })
  workspaceId: string;

  @IsOptional()
  @IsUUID('4', { message: 'documentId must be a valid UUID' })
  documentId?: string;
}

