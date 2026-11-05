'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  Menu,
  Settings,
  LogOut,
  Files,
  Sparkles,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { SafeUser } from '@/lib/api';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenUpload: () => void;
  user?: SafeUser | null;
  workspaceName?: string | null;
  onLogout?: () => void;
}

export function Header({
  onToggleSidebar,
  onOpenSearch,
  user,
  workspaceName,
  onLogout,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials =
    user?.avatarInitials ||
    (user?.name
      ? user.name
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0].toUpperCase())
          .slice(0, 2)
          .join('')
      : 'U');
  const avatarBg = user?.avatarColor || '#7185E8';

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  return (
    <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#E9EAF0] flex items-center justify-between gap-4 select-none">
      {/* Left: Mobile Sidebar Toggle & Search Input Pill */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] rounded-lg transition-colors md:hidden cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Pill Input */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full max-w-[280px] sm:max-w-[340px] h-9 px-3.5 rounded-full bg-[#F7F8FA] border border-[#E9EAF0] hover:border-[#D8DAE5] hover:bg-white flex items-center justify-between text-xs text-[#858A99] transition-all group text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-[#858A99] group-hover:text-[#242633] transition-colors" />
            <span className="text-xs text-[#858A99] group-hover:text-[#242633]">
              Search documents...
            </span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#858A99] bg-white px-1.5 py-0.5 rounded border border-[#E9EAF0]">
            <span>⌘</span>
            <span>F</span>
          </kbd>
        </button>
      </div>

      {/* Right: Notifications & Account Dropdown or Sign In */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="relative w-9 h-9 rounded-full bg-white border border-[#E9EAF0] hover:border-[#D8DAE5] hover:bg-[#F7F8FA] flex items-center justify-center text-[#858A99] hover:text-[#242633] transition-all cursor-pointer"
          title="Notifications & Updates"
        >
          <Bell className="w-4 h-4 stroke-[1.75]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E55353] ring-2 ring-white" />
        </button>

        {user ? (
          /* Authenticated User Account Menu Dropdown */
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-[#F7F8FA] transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#7185E8]/20"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <div
                className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-semibold ring-2 ring-white shadow-subtle group-hover:scale-105 transition-transform"
                style={{ backgroundColor: avatarBg }}
              >
                {initials}
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#858A99] transition-transform duration-200 hidden sm:block ${
                  dropdownOpen ? 'rotate-180 text-[#242633]' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-[#E9EAF0] shadow-dropdown py-2 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Account Details Header */}
                <div className="px-4 py-3 border-b border-[#E9EAF0]">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs"
                      style={{ backgroundColor: avatarBg }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#242633] truncate">
                        {user.name || 'DocuMind User'}
                      </p>
                      <p className="text-[11px] text-[#858A99] truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Active Workspace Indicator */}
                  <div className="mt-2.5 pt-2.5 border-t border-[#F0F1F6] flex items-center gap-1.5 text-[11px] text-[#7185E8] bg-[#EEF0FF]/60 px-2.5 py-1.5 rounded-lg">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-medium">
                      {workspaceName || 'My Workspace'}
                    </span>
                  </div>
                </div>

                {/* Actions & Navigation Shortcuts */}
                <div className="p-1.5 space-y-0.5">
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#242633] hover:bg-[#F7F8FA] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#858A99]" />
                    <span>Account &amp; Workspace Settings</span>
                  </Link>

                  <Link
                    href="/documents"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#242633] hover:bg-[#F7F8FA] transition-colors"
                  >
                    <Files className="w-4 h-4 text-[#858A99]" />
                    <span>Document Library</span>
                  </Link>

                  <Link
                    href="/workspace"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#242633] hover:bg-[#F7F8FA] transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-[#7185E8]" />
                    <span>AI Assistant Workspace</span>
                  </Link>
                </div>

                {/* Logout Button */}
                <div className="pt-1.5 px-1.5 border-t border-[#E9EAF0]">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#E55353] hover:bg-[#FEF1F1] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-[#E55353]" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Signed Out State: Clear Sign In CTA */
          <Link
            href="/login"
            className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-xs font-semibold text-white shadow-subtle shadow-[#7185E8]/20 transition-all flex items-center justify-center cursor-pointer active:scale-98"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
