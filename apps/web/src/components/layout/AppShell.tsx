'use client';

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, DocuMindLogo } from './Sidebar';
import { Header } from './Header';
import { UploadModal } from '@/components/modals/UploadModal';
import { CommandPalette } from '@/components/modals/CommandPalette';
import { HelpModal } from '@/components/modals/HelpModal';
import { DocumentDrawer } from '@/components/documents/DocumentDrawer';
import { DocumentItem } from '@/data/mock-data';
import {
  fetchDocumentsApi,
  deleteDocumentApi,
  renameDocumentApi,
  mapApiDocumentToItem,
  checkSessionApi,
  updateProfileApi,
  logoutApi,
  SafeUser,
  WorkspaceMembership,
  UpdateProfileInput,
} from '@/lib/api';
import {
  syncUserProfileWithBackend,
  syncWorkspaceWithBackend,
} from '@/data/settings-store';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface AppContextType {
  user: SafeUser | null;
  workspace: WorkspaceMembership['workspace'] | null;
  isUserLoading: boolean;
  userError: string | null;
  refreshUserProfile: () => Promise<SafeUser | null>;
  updateUserProfile: (data: UpdateProfileInput) => Promise<SafeUser>;
  logout: () => void;
  documents: DocumentItem[];
  isLoading: boolean;
  error: string | null;
  refreshDocuments: () => Promise<void>;
  openUploadModal: () => void;
  openSearchModal: () => void;
  openHelpModal: () => void;
  openDocumentDrawer: (doc: DocumentItem) => void;
  deleteDocument: (id: string) => Promise<void>;
  renameDocument: (id: string, newTitle: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppShell');
  }
  return context;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // Authenticated user & workspace state
  const [user, setUser] = useState<SafeUser | null>(null);
  const [workspace, setWorkspace] = useState<
    WorkspaceMembership['workspace'] | null
  >(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Documents state - initialized to empty array (never mock data for auth users)
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    logoutApi();
    setUser(null);
    setWorkspace(null);
    setDocuments([]);
    router.replace('/login');
  }, [router]);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchDocumentsApi({ limit: 100 });
      if (res && Array.isArray(res.data)) {
        const liveDocs = res.data.map(mapApiDocumentToItem);
        setDocuments(liveDocs);
        setError(null);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      const message = (err as Error).message || '';
      console.warn('Could not load documents from API:', message);
      if (
        message.includes('session is invalid') ||
        message.includes('No authentication')
      ) {
        handleLogout();
        return;
      }
      setError(message);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [handleLogout]);

  const loadUserProfile = useCallback(async (forceRefresh = false) => {
    setIsUserLoading(true);
    setApiError(null);
    try {
      const me = await checkSessionApi(forceRefresh);
      if (me?.user) {
        setUser(me.user);
        syncUserProfileWithBackend(me.user);

        if (me.memberships && me.memberships.length > 0) {
          const primaryWorkspace = me.memberships[0].workspace;
          setWorkspace(primaryWorkspace);
          syncWorkspaceWithBackend(primaryWorkspace, me.user);
        }

        setUserError(null);
        setApiError(null);
        return me.user;
      }

      // Explicitly unauthenticated (no token or 401 cleared)
      setUser(null);
      setWorkspace(null);
      setDocuments([]);
      setUserError(null);
      setApiError(null);
      return null;
    } catch (err: any) {
      console.warn('Authentication check failed:', err);
      const isConnectionError =
        err?.isApiConnectionError ||
        err?.name === 'ApiConnectionError' ||
        err?.message?.includes('unreachable') ||
        err?.message?.includes('timed out') ||
        err?.message?.includes('Failed to fetch');

      if (isConnectionError) {
        setApiError(
          err.message ||
            'Unable to connect to DocuMind API service (http://localhost:4000). Please verify that the server is running.',
        );
      } else {
        setUser(null);
        setWorkspace(null);
        setDocuments([]);
        setUserError(err?.message || 'Authentication error');
      }
      return null;
    } finally {
      setIsUserLoading(false);
    }
  }, []);

  const handleUpdateUserProfile = useCallback(
    async (data: UpdateProfileInput) => {
      const updatedUser = await updateProfileApi(data);
      setUser(updatedUser);
      syncUserProfileWithBackend(updatedUser);
      return updatedUser;
    },
    [],
  );

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user, loadDocuments]);

  // Route protection: If auth check is done, no user session, and no API connection error, redirect to login
  useEffect(() => {
    if (!isUserLoading && !user && !apiError) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${returnUrl}`);
    }
  }, [isUserLoading, user, apiError, pathname, router]);

  const handleUploadSuccess = async () => {
    await loadDocuments();
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocumentApi(id);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to delete document from API:', err);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleRenameDocument = async (id: string, newTitle: string) => {
    try {
      await renameDocumentApi(id, newTitle);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to rename document via API:', err);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d)),
      );
    }
  };

  // 1. Initial Authentication Checking State
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-200">
          <DocuMindLogo className="w-12 h-12 text-[#7185E8] animate-pulse" />
          <div className="flex items-center gap-2 text-xs font-semibold text-[#858A99]">
            <Loader2 className="w-4 h-4 animate-spin text-[#7185E8]" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. API Unavailable / Connection Failure State with Retry Action
  if (apiError) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-6 sm:p-8 animate-in fade-in duration-200 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#242633]">
              API Service Unavailable
            </h3>
            <p className="text-xs text-[#858A99] mt-1.5 leading-relaxed">
              {apiError}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => loadUserProfile(true)}
              className="flex-1 h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-subtle transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
            <button
              type="button"
              onClick={() => {
                logoutApi();
                router.replace('/login');
              }}
              className="px-4 h-9 rounded-xl border border-[#E9EAF0] hover:bg-[#F7F8FA] text-[#858A99] hover:text-[#242633] text-xs font-medium transition-all"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated State (prevent flashing protected interface before redirect completes)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <DocuMindLogo className="w-10 h-10 text-[#7185E8]" />
          <p className="text-xs font-medium text-[#858A99]">
            Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        user,
        workspace,
        isUserLoading,
        userError,
        refreshUserProfile: loadUserProfile,
        updateUserProfile: handleUpdateUserProfile,
        logout: handleLogout,
        documents,
        isLoading,
        error,
        refreshDocuments: loadDocuments,
        openUploadModal: () => setUploadOpen(true),
        openSearchModal: () => setSearchOpen(true),
        openHelpModal: () => setHelpOpen(true),
        openDocumentDrawer: (doc) => setSelectedDoc(doc),
        deleteDocument: handleDeleteDocument,
        renameDocument: handleRenameDocument,
      }}
    >
      <div className="min-h-screen bg-[#F7F8FA] flex w-full">
        {/* Full-Height Sticky White Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenUpload={() => setUploadOpen(true)}
          documentCount={documents.length}
          user={user}
        />

        {/* Main Content Workspace Column */}
        <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen bg-[#F7F8FA]">
          <Header
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenUpload={() => setUploadOpen(true)}
            user={user}
            workspaceName={workspace?.name}
            onLogout={handleLogout}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto overflow-y-auto">
            {children}
          </main>
        </div>

        {/* Global Modals & Drawers */}
        <UploadModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />

        <CommandPalette
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onOpenUpload={() => {
            setSearchOpen(false);
            setUploadOpen(true);
          }}
          documents={documents}
        />

        <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

        <DocumentDrawer
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      </div>
    </AppContext.Provider>
  );
}
