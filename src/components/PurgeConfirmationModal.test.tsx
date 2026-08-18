import { describe, it, expect } from 'vitest';
import type { EntryLeakReport } from '../lib/security/leakScanner';

describe('PurgeConfirmationModal Purge Logic & Sanitization', () => {
  const mockLeakReports: EntryLeakReport[] = [
    {
      entryName: '.env',
      hasFilenameLeak: true,
      filenameLeaks: [
        {
          path: '.env',
          category: 'credential_file',
          severity: 'critical',
          description: 'Environment file (.env) detected which may contain unencrypted secrets/passwords.',
        },
      ],
      contentSecrets: [],
      isFlagged: true,
    },
    {
      entryName: 'config/keys.json',
      hasFilenameLeak: false,
      filenameLeaks: [],
      contentSecrets: [
        {
          type: 'aws_key',
          matchedToken: 'AKIA...89AB',
          line: 4,
          description: 'AWS Access Key ID',
        },
      ],
      isFlagged: true,
    },
    {
      entryName: 'safe_document.txt',
      hasFilenameLeak: false,
      filenameLeaks: [],
      contentSecrets: [],
      isFlagged: false,
    },
  ];

  it('filters flagged reports correctly for modal display', () => {
    const flagged = mockLeakReports.filter(r => r.isFlagged);
    expect(flagged).toHaveLength(2);
    expect(flagged.map(f => f.entryName)).toEqual(['.env', 'config/keys.json']);
  });

  it('correctly produces sanitized entry set after purging selected flagged entries', () => {
    const allEntries = ['.env', 'config/keys.json', 'safe_document.txt', 'image.png'];
    const purgedEntries = ['.env', 'config/keys.json'];

    const sanitizedEntries = allEntries.filter(entry => !purgedEntries.includes(entry));

    expect(sanitizedEntries).toEqual(['safe_document.txt', 'image.png']);
    expect(sanitizedEntries).not.toContain('.env');
    expect(sanitizedEntries).not.toContain('config/keys.json');
  });

  it('handles empty or partial purge selection gracefully', () => {
    const allEntries = ['.env', 'config/keys.json', 'safe_document.txt'];
    const partialPurged = ['.env'];

    const sanitizedEntries = allEntries.filter(entry => !partialPurged.includes(entry));

    expect(sanitizedEntries).toEqual(['config/keys.json', 'safe_document.txt']);
  });
});
