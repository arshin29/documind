import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

