import { describe, it, expect } from 'vitest';
import { sanitizePath } from './sanitizer';
import { checkZipBombThreshold } from './zipBomb';
import { scanEntrySecurity } from './spooferShield';
import { scanEntryLeaks } from './leakScanner';

describe('Dedicated Security Test Suite (CI Security Shield Suite)', () => {
  describe('Zip Slip Neutralizer Verification', () => {
    it('should sanitize path traversals and absolute path attempts', () => {
      expect(sanitizePath('../../etc/passwd')).toBe('etc/passwd');
      expect(sanitizePath('C:\\Windows\\System32\\cmd.exe')).toBe('Windows/System32/cmd.exe');
      expect(sanitizePath('/var/www/index.html')).toBe('var/www/index.html');
      expect(sanitizePath('a/b/../../../secret.txt')).toBe('secret.txt');
    });
  });

  describe('Zip Bomb Defense Verification', () => {
    it('should flag expansion ratio exceeding 100:1 threshold', () => {
      const bombEntries = [
        { name: '42.zip', compressedSize: 100, uncompressedSize: 500000 },
      ];
      const result = checkZipBombThreshold(bombEntries, { maxRatio: 100 });

      expect(result.isBombWarning).toBe(true);
      expect(result.globalRatio).toBe(5000);
      expect(result.reason).toContain('Global archive expansion ratio');
    });
  });

  describe('Magic Bytes & Disguised Extension Verification', () => {
    it('should flag executable file disguised as PDF document', () => {
      const report = scanEntrySecurity({
        name: 'invoice_2025.pdf',
        magicBytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), // Windows EXE magic header
      });

      expect(report.magicByte.isMismatch).toBe(true);
      expect(report.magicByte.detectedFormat).toBe('PE Windows Executable');
      expect(report.riskLevel).toBe('danger');
    });
  });

  describe('Bidi & RTLO Character Detection', () => {
    it('should flag Right-to-Left Override spoofing character in filename', () => {
      const report = scanEntrySecurity({
        name: 'invoice_\u202Eexe.pdf',
      });

      expect(report.bidi.hasBidi).toBe(true);
      expect(report.bidi.charactersFound).toContain('\u202E');
    });
  });

  describe('Secret & Credential Leak Scanner Verification', () => {
    it('should match sensitive config files and credential patterns', () => {
      const reportEnv = scanEntryLeaks('configs/.env');
      expect(reportEnv.isFlagged).toBe(true);

      const reportKey = scanEntryLeaks('ssh/id_rsa');
      expect(reportKey.isFlagged).toBe(true);
    });
  });
});
