'use client';

import { useState } from 'react';
import {
  X,
  Keyboard,
  ExternalLink,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [apiStatus, setApiStatus] = useState<'unchecked' | 'checking' | 'healthy' | 'error'>('unchecked');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const testApiHealth = async () => {
    setApiStatus('checking');
    try {
      const res = await fetch('http://localhost:4000/api/health');
      if (res.ok) {
        const data = await res.json();
        setApiStatus('healthy');
        setStatusMsg(`API online (Uptime: ${data.uptime}s)`);
      } else {
        setApiStatus('error');
        setStatusMsg(`Status ${res.status}`);
      }
    } catch {
      setApiStatus('error');
      setStatusMsg('API server unreachable on :4000');
    }
  };

  const shortcuts = [
    { key: '⌘ + K', desc: 'Open Command Palette & Document Search' },
    { key: '⌘ + U', desc: 'Quick Upload Document' },
    { key: 'Esc', desc: 'Dismiss active dialog or drawer' },
    { key: '⌘ + /', desc: 'Focus AI conversation input' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-[#E9EAF0] p-6 z-10 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E9EAF0]">
          <h3 className="text-sm font-bold text-[#242633]">Help &amp; Shortcuts</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#858A99]">
            <Keyboard className="w-3.5 h-3.5 text-[#7185E8]" />
            <span>Keyboard shortcuts</span>
          </div>
          <div className="divide-y divide-[#E9EAF0] border border-[#E9EAF0] rounded-xl text-xs overflow-hidden">
            {shortcuts.map((sc) => (
              <div key={sc.key} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-[#F7F8FA] transition-colors">
                <span className="text-[#858A99]">{sc.desc}</span>
                <kbd className="px-2 py-0.5 rounded-md bg-[#F7F8FA] border border-[#E9EAF0] text-[#242633] font-mono text-[10px] font-medium">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Backend Connectivity Status */}
        <div className="p-3.5 rounded-xl border border-[#E9EAF0] bg-[#F7F8FA] space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#242633] font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#7185E8]" />
              API Service Status
            </span>
            <button
              onClick={testApiHealth}
              disabled={apiStatus === 'checking'}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#E9EAF0] hover:bg-[#F7F8FA] text-[11px] font-medium text-[#858A99] hover:text-[#242633] transition-colors shadow-2xs"
            >
              {apiStatus === 'checking' ? 'Pinging...' : 'Check API'}
            </button>
          </div>
          {apiStatus !== 'unchecked' && (
            <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
              {apiStatus === 'healthy' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#29A36A]" />
                  <span className="text-[#29A36A] font-medium">{statusMsg}</span>
                </>
              ) : (
                <span className="text-red-600 font-medium">{statusMsg}</span>
              )}
            </div>
          )}
        </div>

        {/* Documentation Links */}
        <div className="pt-2 border-t border-[#E9EAF0] flex items-center justify-between text-xs text-[#858A99]">
          <span className="font-mono text-[11px]">DocuMind v0.1.0</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-medium hover:text-[#7185E8] transition-colors"
          >
            Guides
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
