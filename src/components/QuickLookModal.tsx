import React, { useState, useEffect } from 'react';
import { X, Eye, FileText, FileSpreadsheet, Image as ImageIcon, Code, AlertTriangle, Download } from 'lucide-react';
import { PdfViewer } from './PdfViewer';

export interface QuickLookFile {
  name: string;
  size?: number;
  uncompressedSize?: number;
  mimeType?: string;
  content?: string | Uint8Array;
}

interface QuickLookModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: QuickLookFile | null;
}

export const QuickLookModal: React.FC<QuickLookModalProps> = ({ isOpen, onClose, file }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const isPdf = extension === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension);
  const isCsv = extension === 'csv';
  const isMarkdown = extension === 'md' || extension === 'markdown';
  const isCode = ['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'go', 'rs', 'java', 'html', 'css', 'sh', 'yaml', 'yml'].includes(extension);
  const isText = isCsv || isMarkdown || isCode || ['txt', 'log', 'env', 'conf', 'ini', 'xml'].includes(extension);

  let textContent = '';
  if (typeof file.content === 'string') {
    textContent = file.content;
  } else if (file.content instanceof Uint8Array) {
    try {
      textContent = new TextDecoder().decode(file.content);
    } catch {
      textContent = '[Binary data - Cannot render as text]';
    }
  } else {
    textContent = `[Sample preview content for ${file.name}]\nFormat: ${extension.toUpperCase()}\nSize: ${file.size || file.uncompressedSize || 0} bytes\n\nPreviewing file content in zero-extract safe sandbox mode.`;
  }

  // Parse CSV for table view
  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n').map(l => l.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = lines[0];
    const rows = lines.slice(1);
    return { headers, rows };
  };

  const csvData = isCsv ? parseCsv(textContent) : null;

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    let blob: Blob;
    if (typeof file.content === 'string') {
      blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    } else if (file.content instanceof Uint8Array) {
      blob = new Blob([new Uint8Array(file.content)]);
    } else {
      blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.split('/').pop() || 'file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-look-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs"
    >
      <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-graphite dark:text-stone">
        {/* Header */}
        <div className="px-5 py-4 border-b border-graphite/15 dark:border-white/10 flex items-center justify-between bg-stone/50 dark:bg-graphite/50">
          <div className="flex items-center gap-2.5 min-w-0">
            {isImage && <ImageIcon size={18} className="text-signal-dim dark:text-signal shrink-0" />}
            {isCsv && <FileSpreadsheet size={18} className="text-signal-dim dark:text-signal shrink-0" />}
            {isCode && <Code size={18} className="text-signal-dim dark:text-signal shrink-0" />}
            {(isText || isPdf) && !isCsv && !isCode && <FileText size={18} className="text-signal-dim dark:text-signal shrink-0" />}
            {!isText && !isImage && !isPdf && <Eye size={18} className="text-signal-dim dark:text-signal shrink-0" />}

            <div className="min-w-0">
              <h2 id="quick-look-title" className="text-sm font-semibold truncate">
                {file.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular">
                {formatBytes(file.size || file.uncompressedSize)} • Quick Look Preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isMarkdown && (
              <div className="flex bg-gray-200/70 dark:bg-ink/70 p-0.5 rounded-panel text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-2 py-0.5 rounded-panel transition-colors ${activeTab === 'preview' ? 'bg-stone dark:bg-graphite shadow-xs' : 'text-gray-500'}`}
                >
                  Formatted
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('raw')}
                  className={`px-2 py-0.5 rounded-panel transition-colors ${activeTab === 'raw' ? 'bg-stone dark:bg-graphite shadow-xs' : 'text-gray-500'}`}
                >
                  Raw
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownload}
              title="Download entry"
              aria-label="Download entry"
              className="p-1.5 rounded-panel hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              <Download size={16} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-panel hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-auto flex-1 bg-stone/30 dark:bg-ink/30 text-xs flex flex-col">
          {isPdf ? (
            <PdfViewer fileName={file.name} content={file.content} />
          ) : isImage ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] p-4 bg-gray-100/50 dark:bg-ink/50 rounded-panel border border-graphite/10 dark:border-white/10">
              {typeof file.content === 'string' && file.content.startsWith('data:image') ? (
                <img src={file.content} alt={file.name} className="max-h-[400px] object-contain rounded shadow-sm" />
              ) : (
                <div className="text-center space-y-2">
                  <ImageIcon size={48} className="mx-auto text-signal-dim dark:text-signal opacity-70" />
                  <p className="font-mono text-gray-500">Image Preview Available</p>
                  <p className="text-[11px] text-gray-400">Format: {extension.toUpperCase()}</p>
                </div>
              )}
            </div>
          ) : isCsv && csvData ? (
            <div className="overflow-x-auto rounded-panel border border-graphite/15 dark:border-white/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-200/60 dark:bg-graphite border-b border-graphite/15 dark:border-white/10">
                    {csvData.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-mono font-semibold text-gray-700 dark:text-gray-200 border-r border-graphite/10 dark:border-white/10 last:border-r-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite/10 dark:divide-white/10 font-mono text-[11px]">
                  {csvData.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-gray-100/50 dark:hover:bg-gray-800/40">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-1.5 border-r border-graphite/10 dark:border-white/10 last:border-r-0 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isText ? (
            <div className="bg-stone dark:bg-ink p-4 rounded-panel border border-graphite/15 dark:border-white/10 font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {activeTab === 'preview' && isMarkdown ? (
                <div className="prose dark:prose-invert max-w-none text-xs font-sans">
                  {textContent.split('\n').map((line, lIdx) => {
                    if (line.startsWith('# ')) return <h1 key={lIdx} className="text-base font-bold my-2">{line.replace('# ', '')}</h1>;
                    if (line.startsWith('## ')) return <h2 key={lIdx} className="text-sm font-semibold my-1.5">{line.replace('## ', '')}</h2>;
                    if (line.startsWith('- ')) return <li key={lIdx} className="ml-4 list-disc">{line.replace('- ', '')}</li>;
                    return <p key={lIdx} className="my-1">{line}</p>;
                  })}
                </div>
              ) : (
                <code>{textContent}</code>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-stone dark:bg-ink rounded-panel border border-graphite/15 dark:border-white/10 text-center space-y-3">
              <AlertTriangle size={32} className="text-signal-dim dark:text-signal" />
              <div>
                <p className="font-semibold text-sm">Binary or Non-Text Entry</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Direct preview for <span className="font-mono">.{extension}</span> files is disabled in safe zero-extract mode.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="bg-graphite hover:bg-ink dark:bg-stone dark:hover:bg-gray-300 text-stone dark:text-ink inline-flex items-center gap-1.5 px-3 py-1.5 rounded-panel text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                <Download size={14} />
                <span>Download Entry File</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-graphite/15 dark:border-white/10 bg-stone/50 dark:bg-graphite/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/15 dark:hover:bg-gray-800 text-graphite px-4 py-1.5 rounded-panel text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
