'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Files,
  Sparkles,
  BarChart3,
  Clock,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react';
import { SafeUser } from '@/lib/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp: () => void;
  onOpenUpload: () => void;
  documentCount?: number;
  user?: SafeUser | null;
}

export function DocuMindLogo({
  className = 'w-6 h-6',
  color = '#7185E8',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="16" cy="5.5" r="2.75" fill={color} />
      <circle cx="23.42" cy="8.58" r="2.75" fill={color} />
      <circle cx="26.5" cy="16" r="2.75" fill={color} />
      <circle cx="23.42" cy="23.42" r="2.75" fill={color} />
      <circle cx="16" cy="26.5" r="2.75" fill={color} />
      <circle cx="8.58" cy="23.42" r="2.75" fill={color} />
      <circle cx="5.5" cy="16" r="2.75" fill={color} />
      <circle cx="8.58" cy="8.58" r="2.75" fill={color} />
    </svg>
  );
}

export function Sidebar({
  isOpen,
  onClose,
  onOpenHelp,
  documentCount,
  user,
}: SidebarProps) {
  const pathname = usePathname();

  const displayName = user?.name?.trim() || 'User';
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

  const navItems = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    {
      name: 'Documents',
      href: '/documents',
      icon: Files,
      count: documentCount,
    },
    { name: 'AI Workspace', href: '/workspace', icon: Sparkles },
    { name: 'Insights', href: '/insights', icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#242633]/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Narrow Sticky Icon Sidebar */}
      <aside
        className={`fixed md:sticky top-0 bottom-0 left-0 md:h-screen z-50 w-[70px] bg-white border-r border-[#E9EAF0] flex flex-col items-center py-5 justify-between select-none shrink-0 transition-transform duration-200 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: DocuMind Logo & Mobile Close */}
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex items-center justify-center relative w-full px-2">
            <Link
              href="/"
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-[#F7F8FA] flex items-center justify-center transition-colors group"
              title="DocuMind Overview"
            >
              <DocuMindLogo className="w-6 h-6 group-hover:scale-105 transition-transform" />
            </Link>

            <button
              onClick={onClose}
              className="absolute right-2 p-1 text-[#858A99] hover:text-[#242633] md:hidden"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Icon Navigation items */}
          <nav className="flex flex-col items-center gap-2 w-full px-2">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : item.href.startsWith('/#')
                  ? false
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <div key={item.name} className="relative group flex justify-center w-full">
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[#7185E8] text-white shadow-sm shadow-[#7185E8]/20'
                        : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] stroke-[1.75]" />
                  </Link>

                  {/* Tooltip on hover */}
                  <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#242633] text-white text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                    {item.name}
                    {item.count !== undefined && ` (${item.count})`}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Settings & Help */}
        <div className="flex flex-col items-center gap-2.5 w-full px-2 pt-4 border-t border-[#E9EAF0]">
          {/* Settings link */}
          <div className="relative group flex justify-center w-full">
            <Link
              href="/settings"
              onClick={onClose}
              aria-label="Settings"
              title="Settings"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                pathname.startsWith('/settings')
                  ? 'bg-[#7185E8] text-white shadow-sm'
                  : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
              }`}
            >
              <Settings className="w-[18px] h-[18px] stroke-[1.75]" />
            </Link>
            <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#242633] text-white text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Settings
            </div>
          </div>

          {/* Help & Support */}
          <div className="relative group flex justify-center w-full">
            <button
              onClick={() => {
                onClose();
                onOpenHelp();
              }}
              aria-label="Help and Support"
              title="Help & Support"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-all cursor-pointer"
            >
              <HelpCircle className="w-[18px] h-[18px] stroke-[1.75]" />
            </button>
            <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#242633] text-white text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Help &amp; Support
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

