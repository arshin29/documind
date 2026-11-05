import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmbeddingService } from '../embeddings/embedding.service';

async function bootstrap() {
  console.log('DocuMind — Embeddings Backfill CLI Starting...');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let batchSize = 25;
  let workspaceId: string | undefined;
  let maxChunks: number | undefined;

  for (const arg of args) {
    if (arg.startsWith('--batch-size=')) {
      batchSize = parseInt(arg.split('=')[1], 10) || 25;
    } else if (arg.startsWith('--workspace=')) {
      workspaceId = arg.split('=')[1];
    } else if (arg.startsWith('--max=')) {
      maxChunks = parseInt(arg.split('=')[1], 10);
    }
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const embeddingService = app.get(EmbeddingService);
    console.log(
      `Using Provider: ${embeddingService.providerInfo.provider} (${embeddingService.providerInfo.model}, dimension: ${embeddingService.providerInfo.dimension})`,
    );

    const startTime = Date.now();
    const report = await embeddingService.backfillExistingChunks({
      batchSize,
      workspaceId,
      maxChunksToProcess: maxChunks,
    });

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n=============================================');
    console.log('       Backfill Summary Report               ');
    console.log('=============================================');
    console.log(`Total Chunks:           ${report.totalChunks}`);
    console.log(`Chunks Needing Vector:  ${report.totalNeedingEmbedding}`);
    console.log(`Successfully Processed: ${report.processedChunks}`);
    console.log(`Failed Chunks:          ${report.failedChunks}`);
    console.log(`Remaining Chunks:       ${report.remainingChunks}`);
    console.log(`Affected Documents:     ${report.affectedDocuments}`);
    console.log(`Completed in:           ${elapsedSec}s`);
    console.log(`Status:                 ${report.isComplete ? 'COMPLETE' : 'INCOMPLETE (re-run to resume)'}`);
    console.log('=============================================\n');

    await app.close();
    if (report.failedChunks > 0) {
      process.exitCode = 1;
    }
  } catch (error: any) {
    console.error('Fatal backfill error:', error.message);
    await app.close();
    process.exitCode = 1;
  }
}

bootstrap();
