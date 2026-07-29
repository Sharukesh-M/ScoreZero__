import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, ShieldCheck, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface StatementUploaderProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export const StatementUploader: React.FC<StatementUploaderProps> = ({ onUpload, isLoading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setValidationError(null);

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setValidationError('ScoreZero accepts PhonePe or Google Pay PDF statements only. Image or non-PDF files are not supported.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setValidationError('File exceeds maximum size limit of 15 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile && !isLoading) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#102235] border border-[#27D9FF]/30 rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(39,217,255,0.2)] relative overflow-hidden">
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#27D9FF]/10 border border-[#27D9FF]/30 text-xs font-semibold text-[#27D9FF]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stateless & Confidential</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Upload PDF Bank Statement
        </h2>
        <p className="text-xs sm:text-sm text-[#B8C5D0] max-w-lg mx-auto">
          Ingest your official PhonePe or Google Pay PDF export for instant financial scoring & AI underwriting commentary.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
            isDragOver
              ? 'border-[#27D9FF] bg-[#27D9FF]/10 scale-[1.01]'
              : 'border-[#27D9FF]/30 bg-[#081421]/80 hover:bg-[#081421] hover:border-[#27D9FF]/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={isLoading}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF] transition-transform group-hover:scale-110">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full border-2 border-[#27D9FF]/30 border-t-[#27D9FF] animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-[#27D9FF]" />
            )}
          </div>

          {selectedFile ? (
            <div className="space-y-1">
              <p className="font-bold text-white text-base break-all flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-[#27D9FF]" />
                <span>{selectedFile.name}</span>
              </p>
              <p className="text-xs text-[#27D9FF] font-mono">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for score calculation
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold text-white text-base">
                Click to browse or drag & drop PDF statement here
              </p>
              <p className="text-xs text-[#B8C5D0]">
                Supports PhonePe & Google Pay PDF exports (Up to 15MB)
              </p>
            </div>
          )}
        </div>

        {validationError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 rounded-2xl bg-[#081421] border border-[#27D9FF]/30 text-center space-y-3 animate-pulse">
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-[#27D9FF]/30 border-t-[#27D9FF] animate-spin" />
              <span className="font-bold text-[#27D9FF] text-base">
                Parsing Statement & Calculating Health Score...
              </span>
            </div>
            <p className="text-xs text-[#B8C5D0]">
              Extracting UPI credit/debits, computing rule deltas, and fetching Gemini AI advice.
            </p>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!selectedFile || isLoading}
            className={`w-full py-4 rounded-2xl bg-[#27D9FF] text-[#081421] font-extrabold text-base tracking-wide hover:bg-[#4BE7FF] transition-all shadow-[0_0_25px_rgba(39,217,255,0.3)] flex items-center justify-center gap-2 ${
              !selectedFile ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span>Analyze Statement & Compute Score</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </form>

      <div className="mt-8 pt-6 border-t border-[#27D9FF]/15 flex flex-wrap justify-between items-center text-xs text-[#B8C5D0] gap-2">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#27D9FF]" />
          PhonePe & GPay Supported
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#27D9FF]" />
          Stateless Memory Processing
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#27D9FF]" />
          Gemini AI Integration
        </span>
      </div>
    </div>
  );
};

export default StatementUploader;
