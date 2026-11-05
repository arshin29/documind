'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell, useApp } from '@/components/layout/AppShell';
import { WorkspaceMessage } from '@/data/mock-data';
import { WorkspaceConversation } from '@/data/workspace-data';
import { DocumentViewer } from '@/components/workspace/DocumentViewer';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { DocumentEmptyState } from '@/components/documents/DocumentEmptyState';
import {
  fetchConversationsApi,
  getConversationApi,
  createConversationApi,
  deleteConversationApi,
  streamMessageSse,
  getStoredWorkspaceId,
  ApiConversation,
} from '@/lib/api';

function mapApiToWorkspaceConversation(c: ApiConversation, fallbackDocId: string): WorkspaceConversation {
  return {
    id: c.id,
    docId: c.documentId || fallbackDocId,
    title: c.title,
    createdAt: new Date(c.createdAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    updatedAt: new Date(c.updatedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    totalQuestions: c.totalQuestions,
    messages: (c.messages || []).map((m) => ({
      id: m.id,
      sender: m.sender.toLowerCase() as 'user' | 'assistant',
      content: m.content,
      timestamp: new Date(m.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      citations: Array.isArray(m.citations) ? m.citations : undefined,
    })),
  };
}

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { documents, openUploadModal } = useApp();

  // 1. Document Selection & URL Synchronization
  const docIdParam = searchParams.get('doc');
  const activeDoc = useMemo(() => {
    if (docIdParam) {
      const match = documents.find((d) => d.id === docIdParam);
      if (match) return match;
    }
    const firstReady = documents.find((d) => d.status === 'Ready');
    return firstReady || documents[0] || null;
  }, [docIdParam, documents]);

  const handleSelectDocument = (newDocId: string) => {
    router.push(`/workspace?doc=${newDocId}`);
    setCurrentPage(1);
    setHighlightSection(null);
  };

  // 2. Viewer State (Current Page, Zoom, Collapse, Highlight)
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewerCollapsed, setIsViewerCollapsed] = useState(false);
  const [highlightSection, setHighlightSection] = useState<string | null>(null);

  // 3. Mobile View Tab (Document vs Chat)
  const [mobileActiveTab, setMobileActiveTab] = useState<'document' | 'chat'>('chat');

  // 4. Conversation Threads State (Loaded from Backend PostgreSQL)
  const [conversations, setConversations] = useState<WorkspaceConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const isGeneratingRef = useRef(false);
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  const loadedConvIdsRef = useRef<Set<string>>(new Set());

  const activeDocId = activeDoc?.id || '';
  const currentWorkspaceId = activeDoc?.workspaceId || getStoredWorkspaceId() || '';

  // Load conversations from backend for current document / workspace
  const loadConversations = useCallback(async () => {
    if (!currentWorkspaceId) return;

    setIsLoadingConversations(true);
    try {
      const data = await fetchConversationsApi(currentWorkspaceId, activeDocId || undefined);
      const mapped = data.map((c) => mapApiToWorkspaceConversation(c, activeDocId));
      setConversations(mapped);

      if (mapped.length > 0) {
        // If no active conv or active conv is not in list, select the first one
        setActiveConvId((prev) => {
          const exists = mapped.some((c) => c.id === prev);
          return exists ? prev : mapped[0].id;
        });
      } else {
        setActiveConvId('');
      }
    } catch {
      // Graceful fallback on network or fresh workspace
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentWorkspaceId, activeDocId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // When activeConvId changes, fetch full conversation details if messages not loaded
  useEffect(() => {
    if (!activeConvId) return;
    if (isGeneratingRef.current) return;
    if (loadedConvIdsRef.current.has(activeConvId)) return;

    const currentConv = conversations.find((c) => c.id === activeConvId);
    if (currentConv && currentConv.messages.length === 0) {
      loadedConvIdsRef.current.add(activeConvId);
      getConversationApi(activeConvId)
        .then((fullData) => {
          if (isGeneratingRef.current) return;
          const mapped = mapApiToWorkspaceConversation(fullData, activeDocId);
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConvId ? mapped : c)),
          );
        })
        .catch((err) => {
          loadedConvIdsRef.current.delete(activeConvId);
          console.error('Failed to load conversation details:', err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, activeDocId]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || null;
  }, [conversations, activeConvId]);

  // Navigate to Page and/or Document (from Source Citation click or manual)
  const handleNavigateToPage = (page: number, citationDocId?: string) => {
    if (citationDocId && activeDoc && citationDocId !== activeDoc.id) {
      handleSelectDocument(citationDocId);
    }
    const maxPages = activeDoc?.pages || 100;
    const targetPage = Math.min(Math.max(1, page), maxPages);
    setCurrentPage(targetPage);
    setMobileActiveTab('document');
  };

  // Start a fresh conversation
  const handleNewConversation = async () => {
    if (!currentWorkspaceId || isGenerating || isGeneratingRef.current) return;

    try {
      const newConv = await createConversationApi({
        workspaceId: currentWorkspaceId,
        documentId: activeDocId || undefined,
        title: 'New Conversation',
      });

      const mapped = mapApiToWorkspaceConversation(newConv, activeDocId);
      loadedConvIdsRef.current.add(mapped.id);
      setConversations((prev) => [mapped, ...prev]);
      setActiveConvId(mapped.id);
    } catch (err: any) {
      console.error('Failed to create new conversation:', err);
    }
  };

  // Delete a conversation thread
  const handleDeleteConversation = async (convId: string) => {
    try {
      await deleteConversationApi(convId);
      loadedConvIdsRef.current.delete(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));

      if (activeConvId === convId) {
        const remaining = conversations.filter((c) => c.id !== convId);
        if (remaining.length > 0) {
          setActiveConvId(remaining[0].id);
        } else {
          setActiveConvId('');
        }
      }
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Send a user question & stream real AI response with Server-Sent Events
  const handleSendMessage = async (text: string) => {
    if (!activeDoc || !text.trim() || isGenerating || isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);

    let targetConvId = activeConvId;

    // Create a new conversation if none exists yet
    if (!targetConvId) {
      try {
        const newConv = await createConversationApi({
          workspaceId: currentWorkspaceId,
          documentId: activeDocId || undefined,
          title: text.length > 35 ? `${text.slice(0, 35)}...` : text,
        });
        const mapped = mapApiToWorkspaceConversation(newConv, activeDocId);
        loadedConvIdsRef.current.add(mapped.id);
        setConversations((prev) => [mapped, ...prev]);
        setActiveConvId(mapped.id);
        targetConvId = mapped.id;
      } catch (err: any) {
        console.error('Failed to create conversation for message:', err);
        isGeneratingRef.current = false;
        setIsGenerating(false);
        return;
      }
    } else {
      loadedConvIdsRef.current.add(targetConvId);
    }

    const tempUserId = `user-${Date.now()}`;
    const tempAsstId = `asst-${Date.now()}`;

    const userMessage: WorkspaceMessage = {
      id: tempUserId,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const initialAsstMessage: WorkspaceMessage = {
      id: tempAsstId,
      sender: 'assistant',
      content: '',
      timestamp: 'Thinking...',
      citations: [],
    };

    // Optimistically update conversation state
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === targetConvId) {
          const isFirstMessage = c.messages.length === 0;
          return {
            ...c,
            title: isFirstMessage
              ? text.length > 35
                ? `${text.slice(0, 35)}...`
                : text
              : c.title,
            messages: [...c.messages, userMessage, initialAsstMessage],
          };
        }
        return c;
      }),
    );

    try {
      await streamMessageSse(targetConvId, text, {
        onToken: (token: string) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === targetConvId) {
                const hasAsst = c.messages.some((m) => m.id === tempAsstId);
                let nextMessages: WorkspaceMessage[];

                if (hasAsst) {
                  nextMessages = c.messages.map((m) => {
                    if (m.id === tempAsstId) {
                      return {
                        ...m,
                        content: m.content + token,
                        timestamp: 'Just now',
                      };
                    }
                    return m;
                  });
                } else {
                  nextMessages = [
                    ...c.messages,
                    {
                      id: tempAsstId,
                      sender: 'assistant',
                      content: token,
                      timestamp: 'Just now',
                      citations: [],
                    },
                  ];
                }
                return { ...c, messages: nextMessages };
              }
              return c;
            }),
          );
        },
        onCitations: (citations: any[]) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === targetConvId) {
                const nextMessages = c.messages.map((m) => {
                  if (m.id === tempAsstId) {
                    return {
                      ...m,
                      citations,
                    };
                  }
                  return m;
                });
                return { ...c, messages: nextMessages };
              }
              return c;
            }),
          );
        },
        onDone: (fullAnswer: string, citations: any[], messageId?: string) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === targetConvId) {
                const hasAsst = c.messages.some((m) => m.id === tempAsstId);
                let nextMessages: WorkspaceMessage[];

                if (hasAsst) {
                  nextMessages = c.messages.map((m) => {
                    if (m.id === tempAsstId) {
                      return {
                        ...m,
                        id: messageId || m.id,
                        content: fullAnswer,
                        citations,
                        timestamp: new Date().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                      };
                    }
                    return m;
                  });
                } else {
                  nextMessages = [
                    ...c.messages,
                    {
                      id: messageId || tempAsstId,
                      sender: 'assistant',
                      content: fullAnswer,
                      citations,
                      timestamp: new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    },
                  ];
                }
                return {
                  ...c,
                  totalQuestions: (c.totalQuestions || 0) + 1,
                  messages: nextMessages,
                };
              }
              return c;
            }),
          );
          isGeneratingRef.current = false;
          setIsGenerating(false);
        },
        onError: (error: string) => {
          console.error('SSE Stream error:', error);
          const errorContent = `An error occurred while generating the response: ${error}. Please check your AI configuration or retry.`;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === targetConvId) {
                const hasAsst = c.messages.some((m) => m.id === tempAsstId);
                let nextMessages: WorkspaceMessage[];

                if (hasAsst) {
                  nextMessages = c.messages.map((m) => {
                    if (m.id === tempAsstId) {
                      return {
                        ...m,
                        content: m.content || errorContent,
                        timestamp: 'Failed',
                      };
                    }
                    return m;
                  });
                } else {
                  nextMessages = [
                    ...c.messages,
                    {
                      id: tempAsstId,
                      sender: 'assistant',
                      content: errorContent,
                      timestamp: 'Failed',
                      citations: [],
                    },
                  ];
                }
                return { ...c, messages: nextMessages };
              }
              return c;
            }),
          );
          isGeneratingRef.current = false;
          setIsGenerating(false);
        },
      });
    } catch (err: any) {
      console.error('Stream failure:', err);
      const errorContent = `Error: ${err?.message || 'Failed to communicate with AI assistant.'}. Please retry.`;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === targetConvId) {
            const hasAsst = c.messages.some((m) => m.id === tempAsstId);
            let nextMessages: WorkspaceMessage[];

            if (hasAsst) {
              nextMessages = c.messages.map((m) => {
                if (m.id === tempAsstId) {
                  return {
                    ...m,
                    content: m.content || errorContent,
                    timestamp: 'Failed',
                  };
                }
                return m;
              });
            } else {
              nextMessages = [
                ...c.messages,
                {
                  id: tempAsstId,
                  sender: 'assistant',
                  content: errorContent,
                  timestamp: 'Failed',
                  citations: [],
                },
              ];
            }
            return { ...c, messages: nextMessages };
          }
          return c;
        }),
      );
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  };

  // Regenerate last response
  const handleRegenerateMessage = (msgId: string) => {
    if (!activeDoc || !activeConversation || isGenerating) return;

    const msgIndex = activeConversation.messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    const previousUserMsg = activeConversation.messages
      .slice(0, msgIndex)
      .reverse()
      .find((m) => m.sender === 'user');

    const query = previousUserMsg?.content;
    if (query) {
      handleSendMessage(query);
    }
  };

  if (!activeDoc) {
    return (
      <div className="py-12">
        <DocumentEmptyState
          type="no-documents"
          onUpload={openUploadModal}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-125px)] sm:h-[calc(100vh-135px)] flex flex-col min-w-0">
      {/* Compact Workspace Header */}
      <WorkspaceHeader
        document={activeDoc}
        allDocuments={documents}
        onSelectDocument={handleSelectDocument}
        mobileActiveTab={mobileActiveTab}
        onMobileTabChange={setMobileActiveTab}
        onNewConversation={handleNewConversation}
        conversationCount={conversations.length}
      />

      {/* Main Split Screen Area: 55% / 45% on Desktop with distinct vertical separator */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0 overflow-hidden rounded-2xl border border-[#DDE1EB] shadow-card bg-white">
        {/* Left Panel: Document Viewer (~55% width on desktop) */}
        <div
          className={`h-full min-w-0 transition-all duration-200 bg-[#F0F2F8] ${mobileActiveTab === 'document' ? 'flex flex-1' : 'hidden lg:flex'
            } ${isViewerCollapsed
              ? 'lg:w-12 lg:flex-none'
              : 'lg:w-[55%] lg:flex-none'
            } lg:border-r lg:border-[#DDE1EB]`}
        >
          <DocumentViewer
            document={activeDoc}
            allDocuments={documents}
            onSelectDocument={handleSelectDocument}
            currentPage={currentPage}
            onPageChange={(page) => handleNavigateToPage(page)}
            isCollapsed={isViewerCollapsed}
            onToggleCollapse={() => setIsViewerCollapsed(!isViewerCollapsed)}
            highlightSection={highlightSection}
          />
        </div>

        {/* Right Panel: AI Assistant (~45% width on desktop) */}
        <div
          className={`h-full min-w-0 transition-all duration-200 bg-white ${mobileActiveTab === 'chat' ? 'flex flex-1' : 'hidden lg:flex'
            } ${isViewerCollapsed ? 'lg:flex-1' : 'lg:w-[45%] lg:flex-1'
            }`}
        >
          <ChatPanel
            document={activeDoc}
            conversation={activeConversation}
            conversations={conversations}
            isGenerating={isGenerating}
            onSendMessage={handleSendMessage}
            onRegenerateMessage={handleRegenerateMessage}
            onNavigateToPage={handleNavigateToPage}
            onSelectConversation={setActiveConvId}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <AppShell>
      <div className="h-full">
        <Suspense
          fallback={
            <div className="p-8 text-xs text-[#858A99] flex items-center justify-center">
              Loading AI Workspace...
            </div>
          }
        >
          <WorkspaceContent />
        </Suspense>
      </div>
    </AppShell>
  );
}
