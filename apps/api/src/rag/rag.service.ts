import { Injectable, Inject, Logger } from '@nestjs/common';
import { SearchService, SemanticSearchResultItem } from '../search/search.service';
import {
  LLMProvider,
  LLM_PROVIDER_TOKEN,
  ChatMessage,
} from '../llm/interfaces/llm-provider.interface';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { DocumentCitation, RagAnswerResult, RagStreamEvent } from './rag.interface';

const INSUFFICIENT_INFO_RESPONSE =
  'The available documents do not contain sufficient information to answer this question.';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly searchService: SearchService,
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: LLMProvider,
  ) {}

  /**
   * Retrieve relevant document chunks using existing semantic search
   */
  async retrieveContext(
    user: SafeUser,
    workspaceId: string,
    question: string,
    documentIds?: string[],
    limit: number = 6,
    threshold?: number,
  ): Promise<SemanticSearchResultItem[]> {
    const rawIds = documentIds?.filter(Boolean) || [];
    const uniqueDocIds = Array.from(new Set(rawIds));

    return this.searchService.searchSemantic(user, {
      workspaceId,
      query: question,
      documentIds: uniqueDocIds.length > 0 ? uniqueDocIds : undefined,
      limit,
      threshold,
    });
  }

  /**
   * Helper to determine whether an LLM answer indicates that requested information
   * is absent or insufficient in the document excerpts
   */
  isInsufficientInformation(answer: string): boolean {
    const lower = (answer || '').toLowerCase().trim();
    if (!lower) return true;
    return (
      lower.includes('not contain sufficient information') ||
      lower.includes('insufficient information') ||
      lower.includes('does not state') ||
      lower.includes('is not stated') ||
      lower.includes('not mentioned in the') ||
      lower.includes('no information is provided') ||
      lower.includes('does not mention') ||
      lower.includes('cannot be determined from the provided')
    );
  }

  /**
   * Build structured citations strictly mapping to retrieved chunks
   */
  buildCitations(chunks: SemanticSearchResultItem[]): DocumentCitation[] {
    return chunks.map((chunk) => {
      // Extract a representative quote snippet from chunk content
      const content = chunk.content.trim();
      let quote = content;
      if (content.length > 200) {
        // Attempt to find sentence boundary
        const sentenceEnd = content.indexOf('. ', 80);
        if (sentenceEnd !== -1 && sentenceEnd < 220) {
          quote = content.slice(0, sentenceEnd + 1);
        } else {
          quote = content.slice(0, 197) + '...';
        }
      }

      return {
        documentId: chunk.documentId,
        documentTitle: chunk.title,
        originalFilename: chunk.originalFilename,
        originalName: chunk.originalFilename,
        chunkId: chunk.chunkId,
        pageNumber: chunk.pageNumber,
        page: chunk.pageNumber ?? 1,
        section: chunk.title,
        quote,
        snippet: quote,
        similarityScore: chunk.similarityScore,
      };
    });
  }

  /**
   * Construct system & context messages for the LLM
   */
  buildPromptMessages(
    question: string,
    chunks: SemanticSearchResultItem[],
    history: ChatMessage[] = [],
  ): ChatMessage[] {
    const systemPrompt = `You are DocuMind, an intelligent and precise AI document assistant.
Your purpose is to answer the user's questions truthfully and accurately, grounded EXCLUSIVELY in the provided document excerpts.

CRITICAL INSTRUCTIONS:
1. Grounding & Evidence: Answer ONLY using facts directly stated or clearly supported by the [DOCUMENT EXCERPTS] below. Do NOT extrapolate, speculate, or bring outside knowledge.
2. Missing Information: If the provided excerpts do not contain sufficient information to answer the question, or if asked whether the document states or contains something that is absent, you MUST clearly state: "${INSUFFICIENT_INFO_RESPONSE}"
3. Partial Information: If the excerpts contain partial evidence relevant to the question, state what is known based strictly on the excerpts, and clearly indicate what information is missing or not stated.
4. Multi-Chunk Synthesis: Synthesize facts across multiple document excerpts when the answer is supported by different sections, tables, or pages.
5. Hallucination Prevention: Do NOT invent or hallucinate document titles, page numbers, statistics, or facts not present in the excerpts.
6. Objectivity & Formatting: Present answers clearly and concisely using Markdown (bullet points, bold text, or tables where appropriate). Always remain objective, professional, and helpful.
7. Independent Turn Evaluation: Evaluate each question against the provided [DOCUMENT EXCERPTS]. Do not let previous turns in the conversation history override or suppress document evidence when relevant excerpts are provided.`;

    let contextSection = '';
    if (chunks.length === 0) {
      contextSection = '[No relevant document excerpts were found for this query in the authorized documents.]';
    } else {
      contextSection = chunks
        .map((c, index) => {
          return `[Source ${index + 1}] Document: "${c.title}" (File: "${c.originalFilename}"), Page: ${c.pageNumber ?? 'N/A'}, Chunk ID: ${c.chunkId}\nExcerpt:\n"""\n${c.content}\n"""`;
        })
        .join('\n\n');
    }

    const contextMessage: ChatMessage = {
      role: 'system',
      content: `${systemPrompt}\n\n--- DOCUMENT EXCERPTS ---\n${contextSection}`,
    };

    // Filter and append conversation history (up to last 6 messages)
    const recentHistory = history.slice(-6);

    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
    };

    return [contextMessage, ...recentHistory, userMessage];
  }

  /**
   * Non-streaming question answering with RAG
   */
  async answerQuestion(
    user: SafeUser,
    workspaceId: string,
    question: string,
    documentIds?: string[],
    history: ChatMessage[] = [],
  ): Promise<RagAnswerResult> {
    const trimmedQuestion = question.trim();
    const chunks = await this.retrieveContext(
      user,
      workspaceId,
      trimmedQuestion,
      documentIds,
    );

    // If no chunks were found at all, return insufficient info response directly
    if (chunks.length === 0) {
      return {
        answer: INSUFFICIENT_INFO_RESPONSE,
        citations: [],
        retrievedChunksCount: 0,
      };
    }

    const messages = this.buildPromptMessages(trimmedQuestion, chunks, history);
    const answer = await this.llmProvider.generateChatCompletion(messages, {
      temperature: 0.1,
    });

    // Check if the answer concluded that documents don't have information
    const isInsufficient = this.isInsufficientInformation(answer);
    const citations = isInsufficient ? [] : this.buildCitations(chunks);

    return {
      answer,
      citations,
      retrievedChunksCount: chunks.length,
    };
  }

  /**
   * Streaming question answering with RAG
   */
  async *streamAnswer(
    user: SafeUser,
    workspaceId: string,
    question: string,
    documentIds?: string[],
    history: ChatMessage[] = [],
    options?: { signal?: AbortSignal },
  ): AsyncIterable<RagStreamEvent> {
    const trimmedQuestion = question.trim();
    const chunks = await this.retrieveContext(
      user,
      workspaceId,
      trimmedQuestion,
      documentIds,
    );

    if (chunks.length === 0) {
      yield { type: 'token', token: INSUFFICIENT_INFO_RESPONSE };
      yield { type: 'citations', citations: [] };
      yield {
        type: 'done',
        answer: INSUFFICIENT_INFO_RESPONSE,
        citations: [],
      };
      return;
    }

    const messages = this.buildPromptMessages(trimmedQuestion, chunks, history);
    let fullAnswer = '';

    for await (const token of this.llmProvider.streamChatCompletion(messages, {
      temperature: 0.1,
      signal: options?.signal,
    })) {
      fullAnswer += token;
      yield { type: 'token', token };
    }

    const isInsufficient = this.isInsufficientInformation(fullAnswer);
    const citations = isInsufficient ? [] : this.buildCitations(chunks);

    yield { type: 'citations', citations };
    yield {
      type: 'done',
      answer: fullAnswer,
      citations,
    };
  }
}

