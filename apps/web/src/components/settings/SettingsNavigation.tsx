'use client';

import React from 'react';
import {
  User,
  Sliders,
  Building2,
  HardDrive,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export type SettingsSection = 'profile' | 'preferences' | 'workspace' | 'storage' | 'security';

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface SettingsNavigationProps {
  activeSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
  storageUsagePercent?: number;
}

export function SettingsNavigation({
  activeSection,
  onSelectSection,
}: SettingsNavigationProps) {
  const items: NavItem[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Personal info & avatar',
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: Sliders,
      description: 'Theme & notifications',
    },
    {
      id: 'workspace',
      label: 'Workspace',
      icon: Building2,
      description: 'Team & pipeline',
    },
    {
      id: 'storage',
      label: 'Storage',
      icon: HardDrive,
      description: 'Quota & usage',
    },
    {
      id: 'security',
      label: 'Security',
      icon: ShieldCheck,
      description: 'Password & safety',
    },
  ];

  return (
    <nav className="w-full" aria-label="Settings navigation">
      {/* Mobile Horizontal Bar */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 mb-4 p-1 rounded-xl bg-white border border-[#E9EAF0] shadow-card">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#EEF0FF] text-[#7185E8] shadow-xs'
                  : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Vertical Nav Panel */}
      <div className="hidden md:flex flex-col gap-1 bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-2.5">
        <div className="px-3 py-2 border-b border-[#E9EAF0] mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#858A99]">
            Settings Menu
          </span>
        </div>

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer group ${
                isActive
                  ? 'bg-[#EEF0FF] text-[#7185E8] font-semibold border border-[#E0E4FA] shadow-xs'
                  : 'text-[#525666] hover:text-[#242633] hover:bg-[#F7F8FA] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white text-[#7185E8] shadow-xs'
                      : 'text-[#858A99] group-hover:text-[#242633]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate">{item.label}</span>
                  <span
                    className={`block text-[10px] truncate ${
                      isActive ? 'text-[#7185E8]/80 font-normal' : 'text-[#858A99]'
                    }`}
                  >
                    {item.description}
                  </span>
                </div>
              </div>

              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                  isActive
                    ? 'text-[#7185E8] translate-x-0.5'
                    : 'text-[#858A99] opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
