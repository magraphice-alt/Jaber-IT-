import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  ExternalLink,
  Download,
  AlertCircle,
  Eye,
  CheckCircle2,
  Calendar,
  User,
  CreditCard,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { formatBDDateTime } from '../utils/timeHelper';

export interface ProofModalData {
  url: string;
  name?: string;
  userName?: string;
  amount?: number;
  method?: string;
  date?: string;
}

interface ProofPreviewModalProps {
  data: ProofModalData | null;
  onClose: () => void;
}

export const ProofPreviewModal: React.FC<ProofPreviewModalProps> = ({ data, onClose }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Determine file type
  const { isPdf, isImage, normalizedUrl } = useMemo(() => {
    if (!data?.url) return { isPdf: false, isImage: false, normalizedUrl: '' };

    let url = data.url.trim();
    const name = (data.name || '').toLowerCase();

    // Check if raw base64 without prefix
    if (!url.startsWith('data:') && !url.startsWith('http') && !url.startsWith('blob:')) {
      if (url.startsWith('JVBERi0')) {
        url = `data:application/pdf;base64,${url}`;
      } else if (url.startsWith('/9j/')) {
        url = `data:image/jpeg;base64,${url}`;
      } else if (url.startsWith('iVBORw0KGgo')) {
        url = `data:image/png;base64,${url}`;
      }
    }

    const checkPdf =
      name.endsWith('.pdf') ||
      url.startsWith('data:application/pdf') ||
      url.includes('application/pdf') ||
      url.startsWith('JVBERi0');

    const checkImage =
      !checkPdf &&
      (url.startsWith('data:image/') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png') ||
        name.endsWith('.webp') ||
        name.endsWith('.gif') ||
        /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url));

    return { isPdf: checkPdf, isImage: checkImage, normalizedUrl: url };
  }, [data]);

  // Create a reliable Blob URL for viewing and downloading
  useEffect(() => {
    setHasError(false);
    setZoom(1);
    setRotation(0);

    if (!normalizedUrl) {
      setBlobUrl(null);
      return;
    }

    if (normalizedUrl.startsWith('data:')) {
      try {
        const parts = normalizedUrl.split(',');
        if (parts.length === 2) {
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch
            ? mimeMatch[1]
            : isPdf
            ? 'application/pdf'
            : 'image/jpeg';
          const byteCharacters = atob(parts[1]);
          const byteArrays: Uint8Array[] = [];
          const sliceSize = 1024;

          for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            byteArrays.push(new Uint8Array(byteNumbers));
          }

          const blob = new Blob(byteArrays as BlobPart[], { type: mime });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);

          return () => {
            URL.revokeObjectURL(url);
          };
        }
      } catch (err) {
        console.error('Failed to convert base64 to blob:', err);
      }
    }

    setBlobUrl(normalizedUrl);
  }, [normalizedUrl, isPdf]);

  if (!data) return null;

  const fileName = data.name || (isPdf ? 'statement_proof.pdf' : 'attachment_proof.jpg');

  const handleOpenInNewTab = () => {
    const targetUrl = blobUrl || normalizedUrl;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = () => {
    const targetUrl = blobUrl || normalizedUrl;
    if (!targetUrl) return;

    try {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full flex flex-col max-h-[92vh] shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white truncate">
                  Attachment Proof
                </h3>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    isPdf
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isPdf ? 'PDF Document' : 'Image Receipt'}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-xs sm:max-w-md font-mono mt-0.5">
                {fileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Open in New Window */}
            <button
              type="button"
              onClick={handleOpenInNewTab}
              title="Open full file in new window"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open in Tab</span>
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              title="Download file to device"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Transaction Metadata Bar */}
        {(data.userName || data.amount !== undefined || data.method || data.date) && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 sm:px-5 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-3 flex-wrap">
              {data.userName && (
                <div className="flex items-center gap-1 font-semibold text-slate-800">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{data.userName}</span>
                </div>
              )}
              {data.amount !== undefined && (
                <div className="flex items-center gap-1 font-bold text-emerald-700">
                  <span>৳{data.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {data.method && (
                <div className="flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px] font-medium">
                  <CreditCard className="w-3 h-3 text-slate-400" />
                  <span>{data.method}</span>
                </div>
              )}
            </div>

            {data.date && (
              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{formatBDDateTime(data.date, false)}</span>
              </div>
            )}
          </div>
        )}

        {/* Viewer Controls (for Images) */}
        {isImage && !hasError && (
          <div className="bg-slate-100 px-4 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="text-[11px] text-slate-600">Zoom & View controls:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] font-bold px-1 min-w-[45px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="h-3.5 w-px bg-slate-300 mx-1" />
              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer flex items-center gap-1"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-[10px] hidden sm:inline">Rotate</span>
              </button>
              {(zoom !== 1 || rotation !== 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  className="text-[10px] text-blue-700 hover:underline ml-1 cursor-pointer font-semibold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Preview Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-950 flex items-center justify-center min-h-[360px] sm:min-h-[480px]">
          {hasError ? (
            /* Fallback if display fails */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center max-w-md w-full space-y-3 text-slate-200">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-white">Direct Preview Unavailable</h4>
              <p className="text-xs text-slate-400">
                This proof file cannot be previewed directly inside the iframe. You can open or download it below:
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" /> Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download File
                </button>
              </div>
            </div>
          ) : isPdf ? (
            /* PDF Document Viewer */
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-full h-[55vh] sm:h-[65vh] bg-white rounded-xl overflow-hidden shadow-inner relative flex flex-col">
                <iframe
                  src={`${blobUrl || normalizedUrl}#toolbar=1&navpanes=0`}
                  title={fileName}
                  className="w-full h-full border-0 bg-white"
                  onError={() => setHasError(true)}
                />
              </div>

              {/* PDF Quick Help Action Strip */}
              <div className="w-full mt-2.5 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-slate-300 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] sm:text-xs">
                    Viewing PDF statement. If your browser blocks inline display:
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="text-blue-400 hover:text-blue-300 text-xs font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open PDF
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Save PDF
                  </button>
                </div>
              </div>
            </div>
          ) : isImage ? (
            /* Image Receipt Viewer */
            <div className="relative w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={blobUrl || normalizedUrl}
                alt={fileName}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out'
                }}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-md select-none"
                onError={() => setHasError(true)}
              />
            </div>
          ) : (
            /* Generic File Fallback */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center max-w-md w-full space-y-3 text-slate-200">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-white">{fileName}</h4>
              <p className="text-xs text-slate-400">
                Click below to view or download this attached document on your device:
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" /> Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download Document
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-4 py-3 sm:px-5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-slate-700">Proof attached by customer</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
