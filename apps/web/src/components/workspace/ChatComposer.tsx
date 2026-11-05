'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatComposerProps {
  onSendMessage: (content: string) => void;
  isGenerating: boolean;
  placeholder?: string;
}

export function ChatComposer({
  onSendMessage,
  isGenerating,
  placeholder = 'Ask a question about this document...',
}: ChatComposerProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-3.5 border-t border-[#DDE1EB] bg-white shrink-0">
      <div className="rounded-2xl border border-[#DDE1EB] bg-[#F7F8FA] focus-within:bg-white focus-within:border-[#7185E8] focus-within:ring-2 focus-within:ring-[#7185E8]/10 transition-all p-2.5 shadow-xs">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isGenerating}
          className="w-full bg-transparent resize-none border-0 text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none leading-relaxed max-h-[120px] px-1 py-0.5"
        />

        <div className="flex items-center justify-between pt-2 border-t border-[#E9EAF0]/60 mt-1">
          <span className="text-[10px] text-[#858A99] pl-1 font-mono">
            {isGenerating ? (
              <span className="flex items-center gap-1.5 text-[#7185E8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7185E8] animate-pulse" />
                Synthesizing response...
              </span>
            ) : (
              'Press Enter to send, Shift+Enter for new line'
            )}
          </span>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating}
            className="h-7 w-7 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-subtle shadow-[#7185E8]/20 active:scale-95 cursor-pointer"
            aria-label="Send message"
            title="Send inquiry"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </div>
  );
}

