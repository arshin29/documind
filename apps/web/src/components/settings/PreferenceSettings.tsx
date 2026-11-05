'use client';

import React, { useState } from 'react';
import { Check, Sun, Moon, Laptop, Table, LayoutGrid, Bell, Sparkles } from 'lucide-react';
import { UserPreferences, updatePreferences } from '@/data/settings-store';

interface PreferenceSettingsProps {
  preferences: UserPreferences;
  onPreferencesUpdated?: (updated: UserPreferences) => void;
}

export function PreferenceSettings({
  preferences,
  onPreferencesUpdated,
}: PreferenceSettingsProps) {
  const [currentPrefs, setCurrentPrefs] = useState<UserPreferences>(preferences);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const handleUpdate = (updates: Partial<UserPreferences>) => {
    const next = { ...currentPrefs, ...updates };
    setCurrentPrefs(next);
    const saved = updatePreferences(next);
    if (onPreferencesUpdated) {
      onPreferencesUpdated(saved);
    }
    setSavedFeedback('Preferences saved');
    setTimeout(() => {
      setSavedFeedback(null);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-6 sm:p-8 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E9EAF0]">
        <div>
          <h2 className="text-base font-bold text-[#242633] tracking-tight">
            Preferences
          </h2>
          <p className="text-xs text-[#858A99] mt-0.5">
            Configure appearance, layout defaults and automated notification routing.
          </p>
        </div>
        {savedFeedback && (
          <span className="text-xs text-[#29A36A] font-semibold flex items-center gap-1.5 bg-[#EDF8F2] px-3 py-1 rounded-full border border-[#D4EEDB]">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            {savedFeedback}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Appearance Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start pb-6 border-b border-[#E9EAF0]">
          <div>
            <h3 className="text-xs font-bold text-[#242633]">Appearance</h3>
            <p className="text-[11px] text-[#858A99] mt-0.5">
              Select interface color theme
            </p>
          </div>
          <div className="sm:col-span-2">
            <div className="inline-flex p-1 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] gap-1">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Laptop },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = currentPrefs.appearance === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleUpdate({ appearance: mode.id as any })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-[#7185E8] shadow-xs border border-[#E0E4FA]'
                        : 'text-[#858A99] hover:text-[#242633]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Default View Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start pb-6 border-b border-[#E9EAF0]">
          <div>
            <h3 className="text-xs font-bold text-[#242633]">Default Document View</h3>
            <p className="text-[11px] text-[#858A99] mt-0.5">
              Preferred layout in My Documents
            </p>
          </div>
          <div className="sm:col-span-2">
            <div className="inline-flex p-1 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] gap-1">
              {[
                { id: 'list', label: 'Table View', icon: Table },
                { id: 'grid', label: 'Grid Cards', icon: LayoutGrid },
              ].map((view) => {
                const Icon = view.icon;
                const isSelected = currentPrefs.defaultDocumentView === view.id;
                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => handleUpdate({ defaultDocumentView: view.id as any })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-[#7185E8] shadow-xs border border-[#E0E4FA]'
                        : 'text-[#858A99] hover:text-[#242633]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{view.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-3 pb-6 border-b border-[#E9EAF0]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#7185E8]" />
            <h3 className="text-xs font-bold text-[#242633]">Notification Routing</h3>
          </div>
          <div className="divide-y divide-[#E9EAF0]">
            {/* Email Notifications */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#242633]">Email Notifications</p>
                <p className="text-[11px] text-[#858A99] mt-0.5">
                  Send critical security alerts, team invitations and workspace digests
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={currentPrefs.emailNotifications}
                  onChange={(e) => handleUpdate({ emailNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#E9EAF0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7185E8] shadow-xs" />
              </label>
            </div>

            {/* Document Processing Notifications */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#242633]">Processing Notifications</p>
                <p className="text-[11px] text-[#858A99] mt-0.5">
                  Real-time alerts when uploaded documents complete OCR and vector chunking
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={currentPrefs.documentProcessingNotifications}
                  onChange={(e) => handleUpdate({ documentProcessingNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#E9EAF0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7185E8] shadow-xs" />
              </label>
            </div>

            {/* Weekly Digest */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#242633]">Weekly Knowledge Digest</p>
                <p className="text-[11px] text-[#858A99] mt-0.5">
                  Receive a summary email of newly indexed insights and questions
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={currentPrefs.weeklyDigest}
                  onChange={(e) => handleUpdate({ weeklyDigest: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#E9EAF0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7185E8] shadow-xs" />
              </label>
            </div>
          </div>
        </div>

        {/* AI Pipeline Automation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7185E8]" />
            <h3 className="text-xs font-bold text-[#242633]">AI Automation Preferences</h3>
          </div>
          <div className="divide-y divide-[#E9EAF0]">
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#242633]">Auto-Generate Summaries</p>
                <p className="text-[11px] text-[#858A99] mt-0.5">
                  Automatically synthesize executive abstracts upon ingestion
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={currentPrefs.autoSummarize}
                  onChange={(e) => handleUpdate({ autoSummarize: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#E9EAF0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7185E8] shadow-xs" />
              </label>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#242633]">Hybrid Semantic Search</p>
                <p className="text-[11px] text-[#858A99] mt-0.5">
                  Combine dense neural vector embeddings with exact keyword matching
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={currentPrefs.semanticSearch}
                  onChange={(e) => handleUpdate({ semanticSearch: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#E9EAF0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7185E8] shadow-xs" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
