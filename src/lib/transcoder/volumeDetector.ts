/**
 * Multi-Volume Archive Detection & Volume Aggregation Helper.
 * Detects RAR, 7z, and ZIP multi-volume part sequences and aggregates volume sets.
 */

export interface MultiVolumeInfo {
  baseName: string;
  format: 'rar' | '7z' | 'zip' | 'generic';
  volumeIndex: number; // 1-based index
  partPattern: string;
}

export interface DetectedVolumeItem {
  volumeIndex: number;
  name: string;
  size?: number;
}

export interface MultiVolumeSetReport {
  isMultiVolumeSet: boolean;
  format?: 'rar' | '7z' | 'zip' | 'generic';
  baseName?: string;
  detectedVolumes: DetectedVolumeItem[];
  missingVolumeIndexes: number[];
  isComplete: boolean;
  expectedTotalVolumes?: number;
  promptMessage?: string;
}

/**
 * Detects if a filename follows a known multi-volume archive convention.
 */
export function detectMultiVolume(filename: string): MultiVolumeInfo | null {
  const cleanName = filename.trim();

  // Pattern 1: RAR modern scheme: e.g. "archive.part01.rar", "archive.part1.rar"
  const rarPartMatch = cleanName.match(/^(.+?)\.part(\d+)\.rar$/i);
  if (rarPartMatch) {
    const baseName = rarPartMatch[1];
    const index = parseInt(rarPartMatch[2], 10);
    return {
      baseName,
      format: 'rar',
      volumeIndex: index,
      partPattern: '.part{N}.rar',
    };
  }

  // Pattern 2: RAR legacy scheme: e.g. "archive.rar" (index 1), "archive.r00" (index 2), "archive.r01" (index 3)
  const rarLegacyMatch = cleanName.match(/^(.+?)\.r(\d{2})$/i);
  if (rarLegacyMatch) {
    const baseName = rarLegacyMatch[1];
    const index = parseInt(rarLegacyMatch[2], 10) + 2; // .r00 is volume 2 (volume 1 is .rar)
    return {
      baseName,
      format: 'rar',
      volumeIndex: index,
      partPattern: '.r{NN}',
    };
  }

  // Pattern 3: 7z split scheme: e.g. "archive.7z.001", "archive.7z.002"
  const sevenZipMatch = cleanName.match(/^(.+?)\.7z\.(\d{3,})$/i);
  if (sevenZipMatch) {
    const baseName = sevenZipMatch[1];
    const index = parseInt(sevenZipMatch[2], 10);
    return {
      baseName,
      format: '7z',
      volumeIndex: index,
      partPattern: '.7z.{NNN}',
    };
  }

  // Pattern 4: ZIP split scheme: e.g. "archive.z01", "archive.z02", "archive.zip"
  const zipSplitMatch = cleanName.match(/^(.+?)\.z(\d{2})$/i);
  if (zipSplitMatch) {
    const baseName = zipSplitMatch[1];
    const index = parseInt(zipSplitMatch[2], 10);
    return {
      baseName,
      format: 'zip',
      volumeIndex: index,
      partPattern: '.z{NN}',
    };
  }

  // Pattern 5: Generic split scheme: e.g. "archive.zip.001", "archive.tar.gz.001"
  const genericSplitMatch = cleanName.match(/^(.+?)\.(zip|tar\.gz|tar)\.(\d{3,})$/i);
  if (genericSplitMatch) {
    const baseName = genericSplitMatch[1];
    const formatStr = genericSplitMatch[2].toLowerCase().includes('zip') ? 'zip' : 'generic';
    const index = parseInt(genericSplitMatch[3], 10);
    return {
      baseName,
      format: formatStr,
      volumeIndex: index,
      partPattern: '.{ext}.{NNN}',
    };
  }

  return null;
}

/**
 * Aggregates a list of uploaded/dropped files into a multi-volume set report.
 */
export function aggregateVolumeSet(
  files: Array<{ name: string; size?: number }>
): MultiVolumeSetReport {
  if (files.length === 0) {
    return {
      isMultiVolumeSet: false,
      detectedVolumes: [],
      missingVolumeIndexes: [],
      isComplete: true,
    };
  }

  const parsedItems: Array<{ file: { name: string; size?: number }; info: MultiVolumeInfo }> = [];

  for (const f of files) {
    const info = detectMultiVolume(f.name);
    if (info) {
      parsedItems.push({ file: f, info });
    }
  }

  if (parsedItems.length === 0) {
    return {
      isMultiVolumeSet: false,
      detectedVolumes: [],
      missingVolumeIndexes: [],
      isComplete: true,
    };
  }

  // Group by baseName & format
  const baseName = parsedItems[0].info.baseName;
  const format = parsedItems[0].info.format;

  const detectedVolumes: DetectedVolumeItem[] = [];
  const foundIndexes = new Set<number>();

  for (const item of parsedItems) {
    if (item.info.baseName.toLowerCase() === baseName.toLowerCase()) {
      foundIndexes.add(item.info.volumeIndex);
      detectedVolumes.push({
        volumeIndex: item.info.volumeIndex,
        name: item.file.name,
        size: item.file.size,
      });
    }
  }

  detectedVolumes.sort((a, b) => a.volumeIndex - b.volumeIndex);

  const maxIndex = Math.max(...Array.from(foundIndexes));
  const missingVolumeIndexes: number[] = [];

  for (let i = 1; i <= maxIndex; i++) {
    if (!foundIndexes.has(i)) {
      missingVolumeIndexes.push(i);
    }
  }

  const isComplete = missingVolumeIndexes.length === 0;

  let promptMessage: string | undefined;
  if (!isComplete) {
    promptMessage = `Multi-volume ${format.toUpperCase()} archive set "${baseName}" is incomplete. Missing volume parts: ${missingVolumeIndexes.map(idx => `Part ${idx}`).join(', ')}. Please select or drop the missing volume files.`;
  } else {
    promptMessage = `Multi-volume ${format.toUpperCase()} set "${baseName}" complete (${detectedVolumes.length} volumes detected).`;
  }

  return {
    isMultiVolumeSet: true,
    format,
    baseName,
    detectedVolumes,
    missingVolumeIndexes,
    isComplete,
    expectedTotalVolumes: maxIndex,
    promptMessage,
  };
}
