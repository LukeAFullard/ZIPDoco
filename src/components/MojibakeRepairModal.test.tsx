import { describe, it, expect } from 'vitest';
import type { MangledEntryItem } from './MojibakeRepairModal';

describe('MojibakeRepairModal Component State Logic', () => {
  const sampleMangled: MangledEntryItem[] = [
    {
      name: 'rÃ©sumÃ©.pdf',
      mojibake: {
        original: 'rÃ©sumÃ©.pdf',
        repaired: 'résumé.pdf',
        detectedEncoding: 'UTF-8 (Double Decoded)',
        confidence: 0.95,
        isMangled: true,
      },
    },
    {
      name: 'テスト_mangled.txt',
      mojibake: {
        original: 'テスト_mangled.txt',
        repaired: 'テスト.txt',
        detectedEncoding: 'Shift-JIS',
        confidence: 0.9,
        isMangled: true,
      },
    },
  ];

  it('filters and maps selected repair names correctly', () => {
    const selectedNames = new Set(['rÃ©sumÃ©.pdf']);

    const repairsMap: Record<string, string> = {};
    for (const item of sampleMangled) {
      if (selectedNames.has(item.name)) {
        repairsMap[item.name] = item.mojibake.repaired;
      }
    }

    expect(repairsMap).toEqual({
      'rÃ©sumÃ©.pdf': 'résumé.pdf',
    });
  });

  it('handles repairing all detected entries', () => {
    const selectedNames = new Set(sampleMangled.map(e => e.name));

    const repairsMap: Record<string, string> = {};
    for (const item of sampleMangled) {
      if (selectedNames.has(item.name)) {
        repairsMap[item.name] = item.mojibake.repaired;
      }
    }

    expect(Object.keys(repairsMap)).toHaveLength(2);
    expect(repairsMap['rÃ©sumÃ©.pdf']).toBe('résumé.pdf');
    expect(repairsMap['テスト_mangled.txt']).toBe('テスト.txt');
  });
});
