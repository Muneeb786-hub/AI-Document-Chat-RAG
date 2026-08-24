'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface DocumentUploadProps {
  onUpload: (file: File) => Promise<void>;
  uploadingFiles: { filename: string; progress: number }[];
}

export function DocumentUpload({ onUpload, uploadingFiles }: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = async (file: File) => {
    setErrorMessage(null);
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Only PDF documents are supported for ingestion.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit.');
      return;
    }

    try {
      await onUpload(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process PDF.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/10 shadow-inner'
            : 'border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
            <UploadCloud className="w-5 h-5" />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
              Click to upload or drag & drop PDF
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              PyMuPDF page-aware chunking • Max 25MB
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center space-x-2 p-2.5 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}

      {/* Upload Progress Status */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center space-x-1.5 truncate max-w-[200px]">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
                  <span className="truncate font-medium">{file.filename}</span>
                </div>
                <span className="text-indigo-400 font-semibold">{file.progress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500">
                {file.progress < 40
                  ? 'Parsing PDF pages (PyMuPDF)...'
                  : file.progress < 80
                  ? 'Generating embeddings & indexing (ChromaDB)...'
                  : 'Finalizing corpus registration...'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
