import React, { useState, useMemo } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Eye, CheckSquare, Square, ShieldAlert, Search } from 'lucide-react';
import type { EntrySecurityReport } from '../lib/security/spooferShield';
import { buildInvertedIndex, type SearchResultItem } from '../lib/search/textIndexer';

export interface FileTreeNodeItem {
  name: string;
  fullPath: string;
  isFolder: boolean;
  size?: number;
  children?: FileTreeNodeItem[];
  riskLevel?: 'safe' | 'warning' | 'danger';
  warningMessage?: string;
}

interface FileTreeProps {
  entries: Array<{ name: string; size?: number; compressedSize?: number; uncompressedSize?: number; content?: string }>;
  securityReports?: EntrySecurityReport[];
  selectedPaths: Set<string>;
  onTogglePath: (path: string) => void;
  onToggleSelectAll: (select: boolean) => void;
  onPreviewFile: (path: string) => void;
}

function buildTree(
  entries: Array<{ name: string; size?: number; compressedSize?: number; uncompressedSize?: number }>,
  securityReports?: EntrySecurityReport[]
): FileTreeNodeItem[] {
  const root: FileTreeNodeItem[] = [];

  const reportsMap = new Map<string, EntrySecurityReport>();
  if (securityReports) {
    securityReports.forEach(r => reportsMap.set(r.filename, r));
  }

  entries.forEach(entry => {
    const parts = entry.name.split('/').filter(Boolean);
    let currentLevel = root;
    let accumulatedPath = '';

    parts.forEach((part, index) => {
      const isFolder = index < parts.length - 1;
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      let existingNode = currentLevel.find(n => n.name === part && n.isFolder === isFolder);

      if (!existingNode) {
        const spooferReport = reportsMap.get(accumulatedPath);
        existingNode = {
          name: part,
          fullPath: accumulatedPath,
          isFolder,
          size: isFolder ? undefined : (entry.size || entry.uncompressedSize),
          children: isFolder ? [] : undefined,
          riskLevel: spooferReport?.riskLevel || 'safe',
          warningMessage: spooferReport?.warnings?.join('; '),
        };
        currentLevel.push(existingNode);
      }

      if (isFolder) {
        currentLevel = existingNode.children!;
      }
    });
  });

  return root;
}

const TreeNode: React.FC<{
  node: FileTreeNodeItem;
  selectedPaths: Set<string>;
  onTogglePath: (path: string) => void;
  onPreviewFile: (path: string) => void;
  depth?: number;
}> = ({ node, selectedPaths, onTogglePath, onPreviewFile, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (node.isFolder) {
    return (
      <div className="select-none">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 py-1 px-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-panel cursor-pointer text-xs transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <span className="text-gray-400">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {isOpen ? (
            <FolderOpen size={15} className="text-signal-dim dark:text-signal shrink-0" />
          ) : (
            <Folder size={15} className="text-signal-dim dark:text-signal shrink-0" />
          )}
          <span className="font-medium text-graphite dark:text-stone truncate">{node.name}</span>
        </div>

        {isOpen && node.children && (
          <div>
            {node.children.map(child => (
              <TreeNode
                key={child.fullPath}
                node={child}
                selectedPaths={selectedPaths}
                onTogglePath={onTogglePath}
                onPreviewFile={onPreviewFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedPaths.has(node.fullPath);

  return (
    <div
      className="flex items-center justify-between py-1 px-2 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 rounded-panel text-xs transition-colors group"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => onTogglePath(node.fullPath)}
          aria-label={`Select ${node.fullPath}`}
          className="text-gray-500 hover:text-signal-dim dark:hover:text-signal focus:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded"
        >
          {isSelected ? (
            <CheckSquare size={15} className="text-verdigris" />
          ) : (
            <Square size={15} />
          )}
        </button>

        <FileText size={14} className="text-gray-500 shrink-0" />

        <span className={`truncate font-mono text-[11px] ${isSelected ? 'text-graphite dark:text-stone font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
          {node.name}
        </span>

        {node.riskLevel && node.riskLevel !== 'safe' && (
          <span
            title={node.warningMessage}
            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-sans font-medium ${
              node.riskLevel === 'danger'
                ? 'bg-rust/15 text-rust border border-rust/30'
                : 'bg-signal/20 text-signal-dim dark:text-signal border border-signal/40'
            }`}
          >
            <ShieldAlert size={10} />
            <span>{node.riskLevel === 'danger' ? 'High Risk' : 'Warning'}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {node.size !== undefined && (
          <span className="text-[10px] font-mono tabular text-gray-500 dark:text-gray-400">
            {formatBytes(node.size)}
          </span>
        )}

        <button
          type="button"
          onClick={() => onPreviewFile(node.fullPath)}
          title={`Quick Look preview for ${node.name}`}
          aria-label={`Quick Look preview for ${node.name}`}
          className="p-1 rounded-panel opacity-80 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <Eye size={14} className="text-signal-dim dark:text-signal" />
        </button>
      </div>
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  entries,
  securityReports,
  selectedPaths,
  onTogglePath,
  onToggleSelectAll,
  onPreviewFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const treeNodes = useMemo(() => buildTree(entries, securityReports), [entries, securityReports]);

  // Build inverted text index over entry text contents
  const invertedIndex = useMemo(() => {
    return buildInvertedIndex(entries.map(e => ({ name: e.name, content: e.content || e.name })));
  }, [entries]);

  const searchResults: SearchResultItem[] = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return invertedIndex.search(searchQuery.trim());
  }, [invertedIndex, searchQuery]);

  const allFilePaths = useMemo(() => {
    const paths: string[] = [];
    const traverse = (nodes: FileTreeNodeItem[]) => {
      nodes.forEach(n => {
        if (!n.isFolder) paths.push(n.fullPath);
        if (n.children) traverse(n.children);
      });
    };
    traverse(treeNodes);
    return paths;
  }, [treeNodes]);

  const allSelected = allFilePaths.length > 0 && allFilePaths.every(p => selectedPaths.has(p));

  return (
    <div className="bg-white dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/20 shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-graphite/10 dark:border-white/10 text-xs">
        <div className="flex items-center gap-2 font-semibold text-graphite dark:text-stone">
          <Folder size={16} className="text-signal-dim dark:text-signal" />
          <span>Archive File Hierarchy &amp; Selection ({allFilePaths.length} Files)</span>
        </div>

        <button
          type="button"
          onClick={() => onToggleSelectAll(!allSelected)}
          className="text-xs font-medium text-signal-dim dark:text-signal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded px-1 self-start sm:self-auto"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Full-Text Instant Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Instant full-text search inside archive entries..."
            className="w-full pl-8 pr-3 py-1.5 border border-graphite/20 dark:border-white/20 rounded-panel bg-white dark:bg-graphite text-xs text-graphite dark:text-stone placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
          />
        </div>

        {searchQuery.trim() !== '' && (
          <div className="mt-2 border border-signal/30 rounded-panel p-2 bg-stone dark:bg-ink text-xs space-y-2 max-h-[160px] overflow-y-auto">
            <span className="text-[10px] font-mono text-signal-dim dark:text-signal font-bold uppercase block">
              Search Results ({searchResults.length} Files Matched)
            </span>
            {searchResults.length === 0 ? (
              <p className="text-gray-500 italic text-[11px]">No matching terms or filenames found.</p>
            ) : (
              searchResults.map(res => (
                <div
                  key={res.name}
                  onClick={() => onPreviewFile(res.name)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors space-y-0.5"
                >
                  <div className="flex items-center justify-between font-mono font-medium text-[11px]">
                    <span className="text-signal-dim dark:text-signal">{res.name}</span>
                    <span className="text-[10px] text-gray-500">Score: {res.score}</span>
                  </div>
                  {res.occurrences.map((occ, idx) => (
                    <p key={idx} className="text-[10px] text-gray-600 dark:text-gray-400 truncate pl-2 border-l border-signal/40">
                      Line {occ.lineNumber}: {occ.lineContent}
                    </p>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="max-h-[350px] overflow-auto space-y-0.5">
        {treeNodes.map(node => (
          <TreeNode
            key={node.fullPath}
            node={node}
            selectedPaths={selectedPaths}
            onTogglePath={onTogglePath}
            onPreviewFile={onPreviewFile}
          />
        ))}
      </div>
    </div>
  );
};
