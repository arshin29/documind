import { DocumentItem } from '@/data/mock-data';
import { resetAllSettings } from '@/data/settings-store';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const TOKEN_STORAGE_KEY = 'documind_access_token';
const WORKSPACE_STORAGE_KEY = 'documind_workspace_id';

export class ApiConnectionError extends Error {
  public readonly isApiConnectionError = true;
  constructor(message: string) {
    super(message);
    this.name = 'ApiConnectionError';
  }
}

export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  avatarColor: string | null;
  avatarInitials: string | null;
  bio: string | null;
  timezone: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceMembership {
  id: string;
  role: string;
  status: string;
  joinedAt: string;
  workspace: {
    id: string;
    name: string;
    description: string | null;
    plan: string;
    storageLimitBytes: number;
  };
}

export interface MeResponse {
  user: SafeUser;
  memberships: WorkspaceMembership[];
}

export interface LoginResponse {
  accessToken: string;
  user: SafeUser;
}

export interface RegisterResponse {
  accessToken: string;
  user: SafeUser;
  workspace: {
    id: string;
    name: string;
    description: string | null;
    plan: string;
    storageLimitBytes: number;
    role: string;
  };
}

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
  timezone?: string;
  avatarColor?: string;
}

export interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiDocument {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  originalName: string;
  fileType: 'PDF' | 'DOCX' | 'TXT';
  fileSize: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  embeddingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  embeddedChunksCount?: number;
  embeddingError?: string | null;
  pages: number | null;
  chunksCount: number;
  summary: string | null;
  keyTopics: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiDocumentListing {
  data: ApiDocument[];
  pagination: ApiPagination;
}

export interface ApiDocumentChunk {
  id: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  metadata?: any;
}

export interface ApiDocumentContent {
  document: ApiDocument;
  fullText: string;
  chunks: ApiDocumentChunk[];
}

/**
 * Format raw byte size into human readable string (KB or MB)
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * Map API response to the DocumentItem interface used in UI components
 */
export function mapApiDocumentToItem(doc: ApiDocument): DocumentItem {
  const statusMap: Record<string, 'Ready' | 'Processing' | 'Failed'> = {
    READY: 'Ready',
    PROCESSING: 'Processing',
    PENDING: 'Processing',
    FAILED: 'Failed',
  };

  const parsedDate = new Date(doc.createdAt);
  const formattedDate = isNaN(parsedDate.getTime())
    ? 'Just now'
    : parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    title: doc.title,
    type: doc.fileType,
    size: formatBytes(doc.fileSize),
    dateAdded: formattedDate,
    status: statusMap[doc.status] || 'Ready',
    embeddingStatus: doc.embeddingStatus,
    embeddedChunksCount: doc.embeddedChunksCount,
    pages: doc.pages ?? 1,
    chunksCount: doc.chunksCount ?? 0,
    summary: doc.summary || 'Summary pending processing.',
    keyTopics:
      doc.keyTopics && doc.keyTopics.length > 0
        ? doc.keyTopics
        : ['Extracted Text'],
    author: 'Current User',
  };
}

/**
 * Get stored JWT auth token
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Store JWT auth token
 */
export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

/**
 * Get stored workspace ID
 */
export function getStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WORKSPACE_STORAGE_KEY);
}

/**
 * Store workspace ID
 */
export function setStoredWorkspaceId(workspaceId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
}

/**
 * Ensure user has a valid authenticated session from stored credentials
 */
export async function ensureAuthenticated(): Promise<string> {
  const token = getStoredToken();

  if (!token) {
    throw new Error('No authentication session found. Please sign in.');
  }

  try {
    const session = await checkSessionApi();
    if (session?.user) {
      return token;
    }
    throw new Error('Existing session is invalid or expired. Please sign in again.');
  } catch (error: any) {
    if (
      error?.isApiConnectionError ||
      error?.message?.includes('unreachable') ||
      error?.message?.includes('timed out')
    ) {
      // Network or temporary server offline error with valid local token
      return token;
    }
    throw error;
  }
}

/**
 * Authenticated API fetch wrapper
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await ensureAuthenticated();

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const workspaceId = getStoredWorkspaceId();
  if (workspaceId && !headers.has('x-workspace-id')) {
    headers.set('x-workspace-id', workspaceId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        logoutApi();
        throw new Error(
          'Authentication session is invalid or expired. Please sign in again.',
        );
      }
      let errorMsg = `API request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.message || errorMsg;
      } catch {
        // Non-JSON response
      }
      throw new Error(errorMsg);
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out after 15 seconds.`);
    }
    throw err;
  }
}

/**
 * Fetch document listing from backend
 */
export async function fetchDocumentsApi(params?: {
  workspaceId?: string;
  search?: string;
  fileType?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}): Promise<ApiDocumentListing> {
  const query = new URLSearchParams();
  if (params?.workspaceId) query.append('workspaceId', params.workspaceId);
  if (params?.search) query.append('search', params.search);
  if (params?.fileType && params.fileType !== 'ALL')
    query.append('fileType', params.fileType);
  if (params?.status && params.status !== 'ALL') {
    const statusMap: Record<string, string> = {
      Ready: 'READY',
      Processing: 'PROCESSING',
      Failed: 'FAILED',
    };
    query.append('status', statusMap[params.status] || params.status);
  }
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  const qs = query.toString();
  return apiFetch<ApiDocumentListing>(`/documents${qs ? `?${qs}` : ''}`);
}

/**
 * Upload document to backend
 */
export async function uploadDocumentApi(
  file: File,
  options?: { title?: string; workspaceId?: string },
): Promise<ApiDocument> {
  const token = await ensureAuthenticated();
  const formData = new FormData();
  formData.append('file', file);

  if (options?.title) {
    formData.append('title', options.title);
  }

  const workspaceId = options?.workspaceId || getStoredWorkspaceId();
  if (workspaceId) {
    formData.append('workspaceId', workspaceId);
  }

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Upload failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Rename document
 */
export async function renameDocumentApi(
  id: string,
  title: string,
): Promise<ApiDocument> {
  return apiFetch<ApiDocument>(`/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
}

/**
 * Delete document
 */
export async function deleteDocumentApi(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/documents/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get single document metadata
 */
export async function getDocumentApi(id: string): Promise<ApiDocument> {
  return apiFetch<ApiDocument>(`/documents/${id}`);
}

/**
 * Get document full text and structured chunks
 */
export async function getDocumentContentApi(
  id: string,
): Promise<ApiDocumentContent> {
  return apiFetch<ApiDocumentContent>(`/documents/${id}/content`);
}

/**
 * Fetch current authenticated user's profile and memberships
 */
export async function getCurrentUserApi(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me');
}

/**
 * Update authenticated user's editable profile information
 */
export async function updateProfileApi(
  data: UpdateProfileInput,
): Promise<SafeUser> {
  return apiFetch<SafeUser>('/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Authenticate existing user with email and password
 */
export async function loginApi(credentials: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    let message = 'Invalid email or password';
    try {
      const err = await response.json();
      message = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || message;
    } catch { }
    throw new Error(message);
  }

  const data: LoginResponse = await response.json();
  setStoredToken(data.accessToken);

  // Retrieve memberships to configure default active workspace
  try {
    const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (meRes.ok) {
      const meData: MeResponse = await meRes.json();
      if (meData.memberships && meData.memberships.length > 0) {
        setStoredWorkspaceId(meData.memberships[0].workspace.id);
      }
    }
  } catch (err) {
    console.warn('Could not populate active workspace id upon login:', err);
  }

  return data;
}

/**
 * Register a new user and establish an authenticated workspace session
 */
export async function registerApi(dto: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    let message = 'Failed to register account';
    try {
      const err = await response.json();
      message = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || message;
    } catch { }
    throw new Error(message);
  }

  const data: RegisterResponse = await response.json();
  setStoredToken(data.accessToken);
  if (data.workspace?.id) {
    setStoredWorkspaceId(data.workspace.id);
  }

  return data;
}

let inFlightSessionCheck: Promise<MeResponse | null> | null = null;
const SESSION_CHECK_TIMEOUT_MS = 6000;

/**
 * Check whether there is a valid active session with the backend.
 * - Returns MeResponse if authenticated.
 * - Returns null if explicitly unauthenticated (no token or 401).
 * - Throws ApiConnectionError if server is unreachable, timed out, or returning 5xx.
 * - Deduplicates in-flight calls to avoid competing/duplicate checks.
 */
export async function checkSessionApi(forceRefresh = false): Promise<MeResponse | null> {
  const token = getStoredToken();
  if (!token) return null;

  if (inFlightSessionCheck && !forceRefresh) {
    return inFlightSessionCheck;
  }

  const checkPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const data: MeResponse = await res.json();
        if (data.memberships && data.memberships.length > 0) {
          setStoredWorkspaceId(data.memberships[0].workspace.id);
        }
        return data;
      }

      if (res.status === 401) {
        // Stale or invalid JWT in localStorage: clear auth data immediately
        logoutApi();
        return null;
      }

      if (res.status >= 500) {
        throw new ApiConnectionError(
          `DocuMind API service returned an internal error (HTTP ${res.status}).`,
        );
      }

      return null;
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof ApiConnectionError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new ApiConnectionError(
          'Connection to DocuMind API timed out. Please check that the server is running.',
        );
      }
      if (
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('ECONNREFUSED') ||
        err.name === 'TypeError'
      ) {
        throw new ApiConnectionError(
          'DocuMind API service is unreachable (http://localhost:4000). Please verify that the backend is running.',
        );
      }
      throw err;
    }
  })();

  inFlightSessionCheck = checkPromise.finally(() => {
    inFlightSessionCheck = null;
  });

  return inFlightSessionCheck;
}

/**
 * Log out user by clearing stored credentials, workspace ID, and client settings
 */
export function logoutApi(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  resetAllSettings();
}

export interface SemanticSearchResultItem {
  chunkId: string;
  id: string;
  documentId: string;
  title: string;
  originalFilename: string;
  originalName: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
  metadata?: any;
  similarityScore: number;
  score: number;
}

export interface SemanticSearchParams {
  workspaceId: string;
  query: string;
  documentId?: string;
  limit?: number;
}

/**
 * Perform semantic vector search across document chunks
 */
export async function searchSemanticApi(
  params: SemanticSearchParams,
): Promise<SemanticSearchResultItem[]> {
  return apiFetch<SemanticSearchResultItem[]>('/search/semantic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

// ----------------------------------------------------
// Conversations & AI Assistant APIs
// ----------------------------------------------------

export interface ApiConversation {
  id: string;
  workspaceId: string;
  documentId: string | null;
  documentIds: string[];
  userId: string;
  title: string;
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
  document?: {
    id: string;
    title: string;
    originalName: string;
    fileType: string;
    pages: number | null;
  } | null;
  messages?: ApiMessage[];
  _count?: {
    messages: number;
  };
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  sender: 'USER' | 'ASSISTANT';
  content: string;
  citations?: any;
  createdAt: string;
}

/**
 * Fetch list of conversations in workspace
 */
export async function fetchConversationsApi(
  workspaceId: string,
  documentId?: string,
): Promise<ApiConversation[]> {
  const query = new URLSearchParams();
  query.append('workspaceId', workspaceId);
  if (documentId) query.append('documentId', documentId);

  return apiFetch<ApiConversation[]>(`/conversations?${query.toString()}`);
}

/**
 * Get conversation details and full message history
 */
export async function getConversationApi(
  conversationId: string,
): Promise<ApiConversation> {
  return apiFetch<ApiConversation>(`/conversations/${conversationId}`);
}

/**
 * Create a new conversation thread
 */
export async function createConversationApi(data: {
  workspaceId: string;
  title?: string;
  documentId?: string;
  documentIds?: string[];
}): Promise<ApiConversation> {
  return apiFetch<ApiConversation>('/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Delete a conversation thread
 */
export async function deleteConversationApi(
  conversationId: string,
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(
    `/conversations/${conversationId}`,
    {
      method: 'DELETE',
    },
  );
}

/**
 * Send question and stream AI response via Server-Sent Events (SSE)
 */
export async function streamMessageSse(
  conversationId: string,
  content: string,
  callbacks: {
    onToken: (token: string) => void;
    onCitations?: (citations: any[]) => void;
    onDone?: (fullAnswer: string, citations: any[], messageId?: string) => void;
    onError?: (error: string) => void;
  },
  options?: { signal?: AbortSignal },
): Promise<void> {
  const token = await ensureAuthenticated();

  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ content, stream: true }),
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    let errorMsg = `Streaming failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errorMsg;
    } catch {
      // non-json
    }
    callbacks.onError?.(errorMsg);
    throw new Error(errorMsg);
  }

  if (!response.body) {
    const err = 'No response body received from assistant';
    callbacks.onError?.(err);
    throw new Error(err);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulatedAnswer = '';
  let accumulatedCitations: any[] = [];
  let isCompleted = false;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data: ')) return;

    const jsonStr = trimmed.slice(6).trim();
    try {
      const event = JSON.parse(jsonStr);
      if (event.type === 'token' && typeof event.token === 'string') {
        accumulatedAnswer += event.token;
        callbacks.onToken(event.token);
      } else if (event.type === 'citations' && Array.isArray(event.citations)) {
        accumulatedCitations = event.citations;
        callbacks.onCitations?.(event.citations);
      } else if (event.type === 'done') {
        isCompleted = true;
        callbacks.onDone?.(
          event.answer || accumulatedAnswer,
          event.citations || accumulatedCitations,
          event.messageId,
        );
      } else if (event.type === 'error') {
        isCompleted = true;
        callbacks.onError?.(
          event.error || 'An error occurred during response generation.',
        );
      }
    } catch {
      // ignore malformed SSE line
    }
  };

  try {
    while (true) {
      if (options?.signal?.aborted) {
        await reader.cancel();
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        processLine(line);
      }
    }

    // Flush any remaining decoder buffer after reading ends
    const remainder = decoder.decode();
    if (remainder) buffer += remainder;
    if (buffer.trim()) {
      const remainingLines = buffer.split(/\r?\n/);
      for (const line of remainingLines) {
        processLine(line);
      }
    }

    // Fallback: If the stream closed without an explicit 'done' event, invoke onDone or onError
    if (!isCompleted) {
      if (accumulatedAnswer.trim()) {
        callbacks.onDone?.(accumulatedAnswer, accumulatedCitations);
      } else {
        callbacks.onError?.('Connection closed before an assistant response was received.');
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore cleanup errors
    }
  }
}



