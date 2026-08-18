/**
 * Spoofer Shield — Bidi/RTLO, Magic Byte, and Disguised Executable Security Scanner
 */

export interface SecurityEntryInput {
  name: string;
  magicBytes?: Uint8Array;
}

export interface BidiScanResult {
  hasBidi: boolean;
  charactersFound: string[];
  description?: string;
}

export interface ExecutableScanResult {
  isDisguised: boolean;
  isRiskyExtension: boolean;
  doubleExtension?: string;
  extension: string;
  reason?: string;
}

export interface MagicByteScanResult {
  isMismatch: boolean;
  detectedFormat?: string;
  claimedExtension: string;
  reason?: string;
}

export interface EntrySecurityReport {
  filename: string;
  bidi: BidiScanResult;
  executable: ExecutableScanResult;
  magicByte: MagicByteScanResult;
  riskLevel: 'safe' | 'warning' | 'danger';
  warnings: string[];
}

/**
 * Regex matching Unicode Bidirectional control/override characters.
 */
const BIDI_CONTROL_REGEX = /[\u202A-\u202E\u200E\u200F\u061C\u2066-\u2069]/g;

const BIDI_CHAR_NAMES: Record<string, string> = {
  '\u202A': 'LRE (Left-to-Right Embedding)',
  '\u202B': 'RLE (Right-to-Left Embedding)',
  '\u202C': 'PDF (Pop Directional Formatting)',
  '\u202D': 'LRO (Left-to-Right Override)',
  '\u202E': 'RLO (Right-to-Left Override)',
  '\u200E': 'LRM (Left-to-Right Mark)',
  '\u200F': 'RLM (Right-to-Left Mark)',
  '\u061C': 'ALM (Arabic Letter Mark)',
  '\u2066': 'LRI (Left-to-Right Isolate)',
  '\u2067': 'RLI (Right-to-Left Isolate)',
  '\u2068': 'FSI (First Strong Isolate)',
  '\u2069': 'PDI (Pop Directional Isolate)',
};

/**
 * High-risk executable/script extensions commonly used in social engineering attacks.
 */
export const HIGH_RISK_EXTENSIONS = new Set([
  'exe', 'scr', 'bat', 'cmd', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh',
  'hta', 'lnk', 'ps1', 'msi', 'com', 'pif', 'cpl', 'jar', 'reg', 'gadget'
]);

/**
 * Safe document/media extensions commonly faked in double extension attacks (e.g. filename.pdf.exe).
 */
export const FAUX_DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'txt', 'doc', 'docx',
  'xls', 'xlsx', 'ppt', 'pptx', 'mp3', 'mp4', 'avi', 'zip', 'csv'
]);

/**
 * Detects Unicode Bidirectional control/override characters in filenames.
 */
export function detectBidiControlChars(filename: string): BidiScanResult {
  const matches = filename.match(BIDI_CONTROL_REGEX);
  if (!matches || matches.length === 0) {
    return { hasBidi: false, charactersFound: [] };
  }

  const uniqueChars = Array.from(new Set(matches));
  const characterDescriptions = uniqueChars.map(c => BIDI_CHAR_NAMES[c] || `U+${c.charCodeAt(0).toString(16).toUpperCase()}`);

  return {
    hasBidi: true,
    charactersFound: uniqueChars,
    description: `Filename contains Unicode bidi control character(s): ${characterDescriptions.join(', ')}. This can disguise the true file extension on modern OSes.`,
  };
}

/**
 * Detects disguised executables and high-risk social engineering file extensions.
 */
export function detectDisguisedExecutable(filename: string): ExecutableScanResult {
  // Normalize path separators to get the leaf filename
  const cleanName = filename.split(/[/\\]/).pop() || filename;
  const parts = cleanName.split('.').filter(Boolean);

  if (parts.length === 0) {
    return { isDisguised: false, isRiskyExtension: false, extension: '' };
  }

  const extension = parts[parts.length - 1].toLowerCase();
  const isRiskyExtension = HIGH_RISK_EXTENSIONS.has(extension);

  let isDisguised = false;
  let doubleExtension: string | undefined;
  let reason: string | undefined;

  if (parts.length >= 3) {
    const priorExt = parts[parts.length - 2].toLowerCase();
    if (FAUX_DOCUMENT_EXTENSIONS.has(priorExt) && isRiskyExtension) {
      isDisguised = true;
      doubleExtension = `.${priorExt}.${extension}`;
      reason = `Disguised executable detected: double extension '${doubleExtension}' tricks users into opening an executable as a document.`;
    }
  }

  if (!isDisguised && isRiskyExtension) {
    reason = `High-risk file extension '.${extension}' detected.`;
  }

  return {
    isDisguised,
    isRiskyExtension,
    doubleExtension,
    extension,
    reason,
  };
}

/**
 * Sniffs magic bytes from header to determine file format.
 */
export function detectFormatFromMagicBytes(headerBytes?: Uint8Array): string | null {
  if (!headerBytes || headerBytes.length < 2) return null;

  // PE Windows Executable ('MZ')
  if (headerBytes[0] === 0x4d && headerBytes[1] === 0x5a) {
    return 'PE Windows Executable';
  }

  // ELF Unix/Linux Executable ('\x7fELF')
  if (headerBytes.length >= 4 && headerBytes[0] === 0x7f && headerBytes[1] === 0x45 && headerBytes[2] === 0x4c && headerBytes[3] === 0x46) {
    return 'ELF Unix Executable';
  }

  // Mach-O macOS Executable
  if (headerBytes.length >= 4) {
    if (
      (headerBytes[0] === 0xfe && headerBytes[1] === 0xed && headerBytes[2] === 0xfa && (headerBytes[3] === 0xce || headerBytes[3] === 0xcf)) ||
      (headerBytes[0] === 0xce && headerBytes[1] === 0xfa && headerBytes[2] === 0xed && headerBytes[3] === 0xfe) ||
      (headerBytes[0] === 0xcf && headerBytes[1] === 0xfa && headerBytes[2] === 0xed && headerBytes[3] === 0xfe) ||
      (headerBytes[0] === 0xca && headerBytes[1] === 0xfe && headerBytes[2] === 0xba && headerBytes[3] === 0xbe)
    ) {
      return 'Mach-O macOS Executable';
    }
  }

  // PDF ('%PDF')
  if (headerBytes.length >= 4 && headerBytes[0] === 0x25 && headerBytes[1] === 0x50 && headerBytes[2] === 0x44 && headerBytes[3] === 0x46) {
    return 'PDF Document';
  }

  // PNG
  if (
    headerBytes.length >= 8 &&
    headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4e && headerBytes[3] === 0x47 &&
    headerBytes[4] === 0x0d && headerBytes[5] === 0x0a && headerBytes[6] === 0x1a && headerBytes[7] === 0x0a
  ) {
    return 'PNG Image';
  }

  // JPEG
  if (headerBytes.length >= 3 && headerBytes[0] === 0xff && headerBytes[1] === 0xd8 && headerBytes[2] === 0xff) {
    return 'JPEG Image';
  }

  // GIF ('GIF87a' / 'GIF89a')
  if (headerBytes.length >= 6 && headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x38) {
    return 'GIF Image';
  }

  // ZIP ('PK\x03\x04')
  if (headerBytes.length >= 4 && headerBytes[0] === 0x50 && headerBytes[1] === 0x4b && headerBytes[2] === 0x03 && headerBytes[3] === 0x04) {
    return 'ZIP Archive';
  }

  return null;
}

/**
 * Compares file header magic bytes against claimed extension.
 */
export function checkMagicByteExtensionMatch(filename: string, headerBytes?: Uint8Array): MagicByteScanResult {
  const cleanName = filename.split(/[/\\]/).pop() || filename;
  const parts = cleanName.split('.').filter(Boolean);
  const claimedExtension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';

  const detectedFormat = detectFormatFromMagicBytes(headerBytes);
  if (!detectedFormat) {
    return { isMismatch: false, claimedExtension };
  }

  let isMismatch = false;
  let reason: string | undefined;

  // PE / ELF / Mach-O binary disguised as document/image
  if (
    (detectedFormat === 'PE Windows Executable' || detectedFormat === 'ELF Unix Executable' || detectedFormat === 'Mach-O macOS Executable') &&
    FAUX_DOCUMENT_EXTENSIONS.has(claimedExtension)
  ) {
    isMismatch = true;
    reason = `Critical format mismatch: File header indicates '${detectedFormat}', but file extension claims '.${claimedExtension}'.`;
  } else if (detectedFormat === 'PDF Document' && claimedExtension !== 'pdf') {
    isMismatch = true;
    reason = `Format mismatch: File header indicates 'PDF Document', but extension claims '.${claimedExtension}'.`;
  } else if ((detectedFormat === 'PNG Image' || detectedFormat === 'JPEG Image' || detectedFormat === 'GIF Image') && !['png', 'jpg', 'jpeg', 'gif'].includes(claimedExtension)) {
    isMismatch = true;
    reason = `Format mismatch: File header indicates '${detectedFormat}', but extension claims '.${claimedExtension}'.`;
  }

  return {
    isMismatch,
    detectedFormat,
    claimedExtension,
    reason,
  };
}

/**
 * Runs full security inspection for an entry.
 */
export function scanEntrySecurity(entry: SecurityEntryInput): EntrySecurityReport {
  const bidi = detectBidiControlChars(entry.name);
  const executable = detectDisguisedExecutable(entry.name);
  const magicByte = checkMagicByteExtensionMatch(entry.name, entry.magicBytes);

  const warnings: string[] = [];
  if (bidi.hasBidi && bidi.description) warnings.push(bidi.description);
  if (executable.reason) warnings.push(executable.reason);
  if (magicByte.isMismatch && magicByte.reason) warnings.push(magicByte.reason);

  let riskLevel: 'safe' | 'warning' | 'danger' = 'safe';
  if (magicByte.isMismatch || executable.isDisguised || (bidi.hasBidi && executable.isRiskyExtension)) {
    riskLevel = 'danger';
  } else if (bidi.hasBidi || executable.isRiskyExtension) {
    riskLevel = 'warning';
  }

  return {
    filename: entry.name,
    bidi,
    executable,
    magicByte,
    riskLevel,
    warnings,
  };
}
