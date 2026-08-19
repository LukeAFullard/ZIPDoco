export interface MojibakeDetectionResult {
  original: string;
  repaired: string;
  detectedEncoding: string;
  confidence: number; // 0 to 1
  isMangled: boolean;
}

// Common UTF-8 byte sequences misdecoded as CP1252 / ISO-8859-1
const UTF8_MISDECODED_PATTERNS = [
  /Ã[©¤öü±§¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/,
  /â[•]/,
  /ï¿½/, // Replacement character
  /â[\u0021-\u00FF]{2}/,
  /Ã[\u0080-\u00BF]/,
];

// Common CJK byte sequences misdecoded into Latin/CP437 extended symbols
const CJK_MISDECODED_PATTERNS = [
  /[├┼┴┬┤┐└┘┌┐│─][\u0020-\u00FF]/,
  /[ÆØÅæøå][\u0020-\u00FF]/,
  /ﾃ[ｶ-ﾝ]/,
];

/**
 * Encodes a JS string (which was decoded assuming CP1252/Latin1) back into raw byte array.
 */
export function stringToBytesLatin1(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Safely decodes byte array with a given TextDecoder encoding.
 */
export function safeDecodeBytes(bytes: Uint8Array, encoding: string): string | null {
  try {
    const decoder = new TextDecoder(encoding, { fatal: true });
    return decoder.decode(bytes).normalize('NFC');
  } catch {
    return null;
  }
}

/**
 * Detects if a filename string or byte array suffers from Mojibake and attempts repair.
 */
export function detectEncodingAndRepair(
  originalStr: string,
  rawBytes?: Uint8Array
): MojibakeDetectionResult {
  if (!originalStr) {
    return {
      original: '',
      repaired: '',
      detectedEncoding: 'UTF-8',
      confidence: 1,
      isMangled: false,
    };
  }

  // Check if string exhibits explicit Mojibake patterns
  let matchesUTF8Mangle = false;
  for (const pattern of UTF8_MISDECODED_PATTERNS) {
    if (pattern.test(originalStr)) {
      matchesUTF8Mangle = true;
      break;
    }
  }

  let matchesCJKMangle = false;
  for (const pattern of CJK_MISDECODED_PATTERNS) {
    if (pattern.test(originalStr)) {
      matchesCJKMangle = true;
      break;
    }
  }

  // If rawBytes is missing and string does not match any mangle pattern, treat as valid UTF-8
  if (!rawBytes && !matchesUTF8Mangle && !matchesCJKMangle) {
    return {
      original: originalStr,
      repaired: originalStr,
      detectedEncoding: 'UTF-8',
      confidence: 1.0,
      isMangled: false,
    };
  }

  const bytes = rawBytes ?? stringToBytesLatin1(originalStr);

  // Check 1: Double-encoded UTF-8 (e.g. "Ã©" for "é", "â" for "–")
  if (matchesUTF8Mangle) {
    const utf8Repaired = safeDecodeBytes(bytes, 'utf-8');
    if (utf8Repaired && utf8Repaired !== originalStr) {
      return {
        original: originalStr,
        repaired: utf8Repaired,
        detectedEncoding: 'UTF-8 (Double Decoded)',
        confidence: 0.95,
        isMangled: true,
      };
    }
  }

  // Check 2: Shift-JIS (Japanese CP932)
  const sjisRepaired = safeDecodeBytes(bytes, 'shift_jis');
  if (sjisRepaired && sjisRepaired !== originalStr) {
    const containsJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(sjisRepaired);
    if (containsJapanese) {
      return {
        original: originalStr,
        repaired: sjisRepaired,
        detectedEncoding: 'Shift-JIS (CP932)',
        confidence: 0.9,
        isMangled: true,
      };
    }
  }

  // Check 3: GBK / GB18030 (Simplified Chinese CP936)
  const gbkRepaired = safeDecodeBytes(bytes, 'gbk');
  if (gbkRepaired && gbkRepaired !== originalStr) {
    const containsChinese = /[\u4E00-\u9FAF]/.test(gbkRepaired);
    if (containsChinese) {
      return {
        original: originalStr,
        repaired: gbkRepaired,
        detectedEncoding: 'GBK (CP936)',
        confidence: 0.85,
        isMangled: true,
      };
    }
  }

  if (matchesCJKMangle) {
    if (sjisRepaired) {
      return {
        original: originalStr,
        repaired: sjisRepaired,
        detectedEncoding: 'Shift-JIS',
        confidence: 0.8,
        isMangled: true,
      };
    }
    if (gbkRepaired) {
      return {
        original: originalStr,
        repaired: gbkRepaired,
        detectedEncoding: 'GBK',
        confidence: 0.8,
        isMangled: true,
      };
    }
  }

  return {
    original: originalStr,
    repaired: originalStr,
    detectedEncoding: 'UTF-8',
    confidence: 1.0,
    isMangled: false,
  };
}

/**
 * Scans a list of entry objects for Mojibake filenames.
 */
export function scanArchiveMojibake<T extends { name: string; rawBytes?: Uint8Array }>(
  entries: T[]
): Array<T & { mojibake: MojibakeDetectionResult }> {
  return entries
    .map(entry => {
      const mojibake = detectEncodingAndRepair(entry.name, entry.rawBytes);
      return {
        ...entry,
        mojibake,
      };
    })
    .filter(entry => entry.mojibake.isMangled);
}
