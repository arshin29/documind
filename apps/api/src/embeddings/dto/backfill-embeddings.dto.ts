import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BackfillEmbeddingsDto {
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  batchSize?: number = 25;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxChunksToProcess?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  @Type(() => Number)
  delayBetweenBatchesMs?: number = 100;
}

