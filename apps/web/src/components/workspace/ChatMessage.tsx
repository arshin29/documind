'use client';

import { useState } from 'react';
import { Copy, Check, RotateCw, Bot, User, AlertCircle } from 'lucide-react';
import { WorkspaceMessage } from '@/data/mock-data';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SourceCitation } from './SourceCitation';

interface ChatMessageProps {
  message: WorkspaceMessage;
  onNavigateToPage?: (page: number, documentId?: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function ChatMessage({
  message,
  onNavigateToPage,
  onRegenerate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';

  const handleCopy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-3">
        <div className="max-w-[85%] md:max-w-lg flex items-start gap-2.5 flex-row-reverse">
          <div className="w-6 h-6 rounded-full bg-[#7185E8] text-white flex items-center justify-center shrink-0 text-xs font-semibold shadow-xs mt-0.5">
            <User className="w-3.5 h-3.5 stroke-[2]" />
          </div>
          <div className="flex flex-col items-end">
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-xs bg-[#EEF0FF] border border-[#D5DAF8] text-[#242633] text-xs font-medium leading-relaxed break-words shadow-xs">
              {message.content}
            </div>
            <span className="text-[10px] text-[#858A99] mt-1 pr-1 font-mono">
              {message.timestamp}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const isFailed = message.timestamp === 'Failed';
  const isThinking = !message.content && !isFailed;

  // Assistant Message: Pure white card resting cleanly on #FAFAFD chat background
  return (
    <div className="my-3 flex items-start gap-2.5 max-w-full">
      {/* Bot Avatar */}
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${isFailed
            ? 'bg-[#FEF1F1] text-[#E55353] border border-[#FAD0D0]'
            : 'bg-[#F3F2FF] text-[#7185E8] border border-[#DAD8F8]'
          }`}
      >
        {isFailed ? (
          <AlertCircle className="w-4 h-4 stroke-[2]" />
        ) : (
          <Bot className="w-4 h-4 stroke-[1.75]" />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-[92%]">
        <div
          className={`p-4 sm:p-5 rounded-2xl rounded-tl-xs bg-white border shadow-[0_2px_8px_rgba(36,38,51,0.04)] text-xs text-[#242633] space-y-3.5 ${isFailed ? 'border-[#FAD0D0] bg-[#FFFBFB]' : 'border-[#E9EAF0]'
            }`}
        >
          {message.content ? (
            <MarkdownRenderer content={message.content} />
          ) : isFailed ? (
            <div className="flex items-center gap-2 py-1 text-xs text-[#E55353] font-medium">
              <AlertCircle className="w-4 h-4 text-[#E55353] shrink-0" />
              <span>Failed to generate response. Please try again.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 py-1 text-xs text-[#858A99]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7185E8] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7185E8] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7185E8] animate-bounce" />
              </span>
              <span className="text-[11px] font-medium text-[#7185E8] animate-pulse">
                Thinking & synthesizing document context...
              </span>
            </div>
          )}

          {/* Unobtrusive Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="pt-3 border-t border-[#E9EAF0] space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#858A99] block">
                Source Citations ({message.citations.length})
              </span>
              <div className="space-y-2">
                {message.citations.map((cite, idx) => (
                  <SourceCitation
                    key={idx}
                    documentTitle={cite.documentTitle}
                    documentId={cite.documentId}
                    page={cite.page}
                    section={(cite as any).section || cite.documentTitle}
                    quote={cite.quote}
                    onNavigateToPage={onNavigateToPage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-2.5 border-t border-[#E9EAF0]/70 text-[11px] text-[#858A99]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-1 rounded-lg hover:bg-[#F7F8FA] hover:text-[#242633] flex items-center gap-1.5 transition-colors font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#29A36A]" />
                    <span className="text-[#29A36A]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {onRegenerate && (
                <button
                  type="button"
                  onClick={() => onRegenerate(message.id)}
                  className="px-2 py-1 rounded-lg hover:bg-[#F7F8FA] hover:text-[#7185E8] flex items-center gap-1.5 transition-colors font-medium"
                >
                  <RotateCw className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>

            <span className="font-mono text-[10px] text-[#858A99]">
              {message.timestamp}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

