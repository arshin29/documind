import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RenameDocumentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Document title cannot be empty' })
  @MaxLength(255, { message: 'Document title must not exceed 255 characters' })
  title: string;
}

