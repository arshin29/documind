'use client';

import { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { uploadDocumentApi, formatBytes } from '@/lib/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (doc: {
    title: string;
    type: 'PDF' | 'DOCX' | 'TXT';
    size: string;
  }) => void;
}

export function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'processing' | 'done' | 'error'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMessage(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      setErrorMessage(
        'Please upload a supported document format: PDF, DOCX, or TXT.',
      );
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 20 MB limit.');
      return;
    }

    setSelectedFile(file);
    executeRealUpload(file);
  };

  const executeRealUpload = async (file: File) => {
    setUploadStatus('uploading');
    setProgress(25);
    setErrorMessage(null);

    const progressTimer = setTimeout(() => {
      setProgress(60);
      setUploadStatus('processing');
    }, 400);

    try {
      const createdDoc = await uploadDocumentApi(file);
      clearTimeout(progressTimer);

      setProgress(100);
      setUploadStatus('done');

      onUploadSuccess?.({
        title: createdDoc.title,
        type: createdDoc.fileType,
        size: formatBytes(createdDoc.fileSize),
      });
    } catch (error) {
      clearTimeout(progressTimer);
      setUploadStatus('error');
      const msg = (error as Error).message || '';
      if (
        msg.includes('No authentication') ||
        msg.includes('session is invalid') ||
        msg.includes('401')
      ) {
        setErrorMessage(
          'You must be signed in to upload documents. Please sign in to continue.',
        );
      } else {
        setErrorMessage(msg || 'Failed to upload document. Please retry.');
      }
    }
  };

  const resetAndClose = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-[#E9EAF0] p-6 z-10 shadow-card">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E9EAF0]">
          <div>
            <h3 className="text-sm font-bold text-[#242633]">Upload Document</h3>
            <p className="text-xs text-[#858A99] mt-0.5">
              Files are parsed and prepared for retrieval.
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-lg text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {uploadStatus === 'idle' ? (
          <div className="mt-4 space-y-3">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#FEF7ED] border border-[#FBE3CD] text-[#E6A13A] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-[#7185E8] bg-[#EEF0FF]'
                  : 'border-[#E9EAF0] hover:border-[#7185E8]/60 bg-[#F7F8FA]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E9EAF0] flex items-center justify-center text-[#7185E8] mb-3 shadow-xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#242633]">
                Choose file or drag &amp; drop
              </p>
              <p className="text-[11px] text-[#858A99] mt-0.5">
                PDF, DOCX, or TXT up to 20 MB
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="p-3.5 rounded-xl border border-[#E9EAF0] bg-[#F7F8FA] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#E9EAF0] flex items-center justify-center text-[#7185E8] shrink-0 shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#242633] truncate">
                  {selectedFile?.name}
                </p>
                <p className="text-[11px] text-[#858A99] font-mono">
                  {selectedFile?.size ? formatBytes(selectedFile.size) : '0 KB'}
                </p>
              </div>

              {uploadStatus === 'uploading' && (
                <div className="flex items-center gap-1.5 text-xs text-[#858A99]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7185E8]" />
                  <span>Uploading</span>
                </div>
              )}

              {uploadStatus === 'processing' && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#7185E8]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7185E8]" />
                  <span>Processing</span>
                </div>
              )}

              {uploadStatus === 'done' && (
                <div className="flex items-center gap-1 text-xs text-[#29A36A] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready</span>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="flex items-center gap-1 text-xs text-[#E55353] font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Failed</span>
                </div>
              )}
            </div>

            {uploadStatus === 'error' && errorMessage && (
              <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#FBE3E3] text-[#E55353] text-xs flex flex-col gap-2">
                <span>{errorMessage}</span>
                {errorMessage.toLowerCase().includes('sign in') && (
                  <button
                    type="button"
                    onClick={() => {
                      resetAndClose();
                      window.location.href = `/login?message=${encodeURIComponent(
                        'Please sign in to upload documents to your workspace.',
                      )}&redirect=/documents`;
                    }}
                    className="self-start px-3 py-1.5 rounded-lg bg-[#7185E8] hover:bg-[#5E72D6] text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    Sign In
                  </button>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {uploadStatus !== 'error' && (
              <div className="space-y-1">
                <div className="w-full bg-[#E9EAF0] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#7185E8] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#858A99]">
                  <span>
                    {uploadStatus === 'uploading' && 'Transferring data...'}
                    {uploadStatus === 'processing' &&
                      'Extracting text and indexing...'}
                    {uploadStatus === 'done' && 'Uploaded and indexed'}
                  </span>
                  <span className="font-mono text-[#242633] font-medium">
                    {progress}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2.5 pt-3.5 border-t border-[#E9EAF0]">
          <button
            onClick={resetAndClose}
            className="h-9 px-4 rounded-xl border border-[#E9EAF0] text-xs font-medium text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-colors"
          >
            {uploadStatus === 'done' ? 'Close' : 'Cancel'}
          </button>
          {uploadStatus === 'done' && (
            <button
              onClick={resetAndClose}
              className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5E72D6] text-xs font-semibold text-white shadow-sm transition-all"
            >
              Done
            </button>
          )}
          {uploadStatus === 'error' && (
            <button
              onClick={() => {
                if (selectedFile) executeRealUpload(selectedFile);
              }}
              className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5E72D6] text-xs font-semibold text-white shadow-sm transition-all"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
