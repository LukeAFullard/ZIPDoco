export interface ArchiveDiffEntry {
  path: string;
  size?: number;
  hash?: string;
  content?: string;
}

export type EntryDiffStatus = 'added' | 'removed' | 'modified' | 'identical';

export interface DiffResultItem {
  path: string;
  status: EntryDiffStatus;
  entryA?: ArchiveDiffEntry;
  entryB?: ArchiveDiffEntry;
  sizeDelta?: number;
}

export interface ArchiveDiffSummary {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  identicalCount: number;
  totalA: number;
  totalB: number;
  diffs: DiffResultItem[];
}

export interface LineDiffOp {
  type: 'added' | 'removed' | 'unchanged';
  lineA?: number;
  lineB?: number;
  text: string;
}

/**
 * Normalizes relative paths for consistent comparison (converts backslashes, strips leading ./ or /)
 */
export function normalizeDiffPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

/**
 * Compares two archive entry lists and produces itemized diff status and summary
 */
export function compareArchives(
  archiveA: ArchiveDiffEntry[],
  archiveB: ArchiveDiffEntry[]
): ArchiveDiffSummary {
  const mapA = new Map<string, ArchiveDiffEntry>();
  const mapB = new Map<string, ArchiveDiffEntry>();

  for (const entry of archiveA) {
    const norm = normalizeDiffPath(entry.path);
    mapA.set(norm, entry);
  }

  for (const entry of archiveB) {
    const norm = normalizeDiffPath(entry.path);
    mapB.set(norm, entry);
  }

  const allPaths = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const sortedPaths = Array.from(allPaths).sort();

  const diffs: DiffResultItem[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let identicalCount = 0;

  for (const path of sortedPaths) {
    const entryA = mapA.get(path);
    const entryB = mapB.get(path);

    if (entryA && !entryB) {
      removedCount++;
      diffs.push({
        path,
        status: 'removed',
        entryA,
        sizeDelta: entryA.size ? -entryA.size : undefined,
      });
    } else if (!entryA && entryB) {
      addedCount++;
      diffs.push({
        path,
        status: 'added',
        entryB,
        sizeDelta: entryB.size ? entryB.size : undefined,
      });
    } else if (entryA && entryB) {
      const isModified = checkIsModified(entryA, entryB);
      const sizeDelta =
        entryA.size !== undefined && entryB.size !== undefined
          ? entryB.size - entryA.size
          : undefined;

      if (isModified) {
        modifiedCount++;
        diffs.push({
          path,
          status: 'modified',
          entryA,
          entryB,
          sizeDelta,
        });
      } else {
        identicalCount++;
        diffs.push({
          path,
          status: 'identical',
          entryA,
          entryB,
          sizeDelta: 0,
        });
      }
    }
  }

  return {
    addedCount,
    removedCount,
    modifiedCount,
    identicalCount,
    totalA: archiveA.length,
    totalB: archiveB.length,
    diffs,
  };
}

function checkIsModified(a: ArchiveDiffEntry, b: ArchiveDiffEntry): boolean {
  if (a.hash && b.hash) {
    return a.hash !== b.hash;
  }
  if (a.content !== undefined && b.content !== undefined) {
    return a.content !== b.content;
  }
  if (a.size !== undefined && b.size !== undefined) {
    return a.size !== b.size;
  }
  return false;
}

/**
 * Computes line-by-line text diff using LCS (Longest Common Subsequence) algorithm
 */
export function diffLines(textA: string, textB: string): LineDiffOp[] {
  const linesA = textA.split(/\r?\n/);
  const linesB = textB.split(/\r?\n/);

  const M = linesA.length;
  const N = linesB.length;

  // LCS DP table
  const dp: number[][] = Array.from({ length: M + 1 }, () => new Array(N + 1).fill(0));

  for (let i = M - 1; i >= 0; i--) {
    for (let j = N - 1; j >= 0; j--) {
      if (linesA[i] === linesB[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const ops: LineDiffOp[] = [];
  let i = 0;
  let j = 0;
  let lineNoA = 1;
  let lineNoB = 1;

  while (i < M && j < N) {
    if (linesA[i] === linesB[j]) {
      ops.push({
        type: 'unchanged',
        lineA: lineNoA++,
        lineB: lineNoB++,
        text: linesA[i],
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({
        type: 'removed',
        lineA: lineNoA++,
        text: linesA[i],
      });
      i++;
    } else {
      ops.push({
        type: 'added',
        lineB: lineNoB++,
        text: linesB[j],
      });
      j++;
    }
  }

  while (i < M) {
    ops.push({
      type: 'removed',
      lineA: lineNoA++,
      text: linesA[i],
    });
    i++;
  }

  while (j < N) {
    ops.push({
      type: 'added',
      lineB: lineNoB++,
      text: linesB[j],
    });
    j++;
  }

  return ops;
}
