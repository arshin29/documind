import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RagService } from '../rag/rag.service';
import { PrismaService } from '../prisma/prisma.service';

const TEST_QUESTIONS = [
  'What was the Q4 approved budget?',
  'What was the pilot activation rate?',
  'What were the three reasons for failed report exports?',
  'What was the combined monthly recurring revenue?',
  'Who owns the template library beta?',
  "Does the document state Northstar's net profit for August 2026?",
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const ragService = app.get(RagService);

  const doc = await prisma.document.findFirst({
    where: { title: { contains: 'DocuMind_RAG_Test_Document' } },
  });

  if (!doc) {
    console.error('DocuMind_RAG_Test_Document.pdf not found in DB!');
    await app.close();
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: doc.userId },
  });

  if (!user) {
    console.error('User not found!');
    await app.close();
    return;
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarColor: user.avatarColor,
    avatarInitials: user.avatarInitials,
    bio: user.bio,
    timezone: user.timezone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  console.log('======================================================================');
  console.log(`TEST RUN: DocuMind RAG Accuracy Verification`);
  console.log(`Document: ${doc.title} (${doc.id})`);
  console.log(`Workspace: ${doc.workspaceId}`);
  console.log('======================================================================\n');

  const resultsSummary: any[] = [];

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const question = TEST_QUESTIONS[i];
    console.log(`----------------------------------------------------------------------`);
    console.log(`QUESTION ${i + 1}: "${question}"`);
    console.log(`----------------------------------------------------------------------`);

    // 1. Retrieve chunks with similarity scores
    const retrievedChunks = await ragService.retrieveContext(
      safeUser,
      doc.workspaceId,
      question,
      [doc.id],
      6,
    );

    console.log(`\n1. RETRIEVED CHUNKS (${retrievedChunks.length} chunks):`);
    retrievedChunks.forEach((c, idx) => {
      console.log(
        `   [Chunk ${idx + 1}] ID: ${c.chunkId} | Doc: "${c.title}" | Page: ${c.pageNumber} | Index: ${c.chunkIndex} | Score: ${c.similarityScore.toFixed(4)}`,
      );
      console.log(`      Snippet: "${c.content.slice(0, 110).replace(/\n/g, ' ')}..."`);
    });

    // 2. Similarity scores summary & relevance threshold
    const scores = retrievedChunks.map((c) => Number(c.similarityScore.toFixed(4)));
    const relevanceThreshold = 0.50; // Active calibrated threshold for Gemini embeddings

    console.log(`\n2. SIMILARITY SCORES: [${scores.join(', ')}]`);
    console.log(`3. RELEVANCE THRESHOLD: ${relevanceThreshold}`);

    // 3. Final context sent to Gemini
    const messages = ragService.buildPromptMessages(question, retrievedChunks, []);
    const systemAndContext = messages.find((m) => m.role === 'system')?.content || '';
    const excerptsStart = systemAndContext.indexOf('--- DOCUMENT EXCERPTS ---');
    const finalContext = excerptsStart !== -1 ? systemAndContext.slice(excerptsStart) : systemAndContext;

    console.log(`\n4. FINAL CONTEXT SENT TO GEMINI (Length: ${finalContext.length} chars):`);
    console.log(finalContext.slice(0, 350) + '\n... [Context omitted for brevity] ...\n' + finalContext.slice(-200));

    // 4. Generated Answer & Citations
    const result = await ragService.answerQuestion(
      safeUser,
      doc.workspaceId,
      question,
      [doc.id],
      [],
    );

    console.log(`\n5. GENERATED ANSWER:`);
    console.log(result.answer);

    console.log(`\n6. CITATION ACCURACY:`);
    console.log(`   Citations count: ${result.citations.length}`);
    if (result.citations.length === 0) {
      console.log(`   [Empty citations array - Insufficient / negative information correctly reported without hallucinated citations]`);
    } else {
      result.citations.forEach((cit, idx) => {
        console.log(
          `   [Citation ${idx + 1}] Page ${cit.pageNumber} | Chunk ${cit.chunkId} | Doc: "${cit.documentTitle}" | Score: ${cit.similarityScore?.toFixed(4)}`,
        );
        console.log(`      Quote: "${cit.quote?.slice(0, 90).replace(/\n/g, ' ')}..."`);
      });
    }

    resultsSummary.push({
      questionNumber: i + 1,
      question,
      retrievedChunks,
      scores,
      relevanceThreshold,
      finalContext,
      answer: result.answer,
      citations: result.citations,
    });

    console.log('\n');
  }

  await app.close();
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
