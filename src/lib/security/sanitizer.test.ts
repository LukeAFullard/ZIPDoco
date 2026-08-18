import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizePath,
  validatePath,
  validateSymlinkTarget,
  SanitizerTracker,
} from './sanitizer';

describe('Zip Slip Path Sanitizer', () => {
  describe('sanitizePath', () => {
    it('1. handles standard relative directory traversal (../../etc/passwd)', () => {
      expect(sanitizePath('../../etc/passwd')).toBe('etc/passwd');
    });

    it('2. strips absolute leading slash (/etc/passwd)', () => {
      expect(sanitizePath('/etc/passwd')).toBe('etc/passwd');
    });

    it('3. strips Windows drive letters with backslashes (C:\\Windows\\System32\\cmd.exe)', () => {
      expect(sanitizePath('C:\\Windows\\System32\\cmd.exe')).toBe('Windows/System32/cmd.exe');
    });

    it('4. strips Windows drive letters with forward slashes (D:/folder/subfolder/file.txt)', () => {
      expect(sanitizePath('D:/folder/subfolder/file.txt')).toBe('folder/subfolder/file.txt');
    });

    it('5. resolves nested relative traversals (a/b/../../c)', () => {
      expect(sanitizePath('a/b/../../c')).toBe('c');
    });

    it('6. prevents escaping above root when traversal exceeds depth (a/b/../../../c)', () => {
      expect(sanitizePath('a/b/../../../c')).toBe('c');
    });

    it('7. strips UNC network share prefixes (\\\\server\\share\\secret.txt)', () => {
      expect(sanitizePath('\\\\server\\share\\secret.txt')).toBe('secret.txt');
    });

    it('8. removes null bytes from paths (foo/\\0/bar.txt)', () => {
      expect(sanitizePath('foo/\0/bar.txt')).toBe('foo/bar.txt');
    });

    it('9. normalizes dot directory segments (subfolder/./file.txt)', () => {
      expect(sanitizePath('subfolder/./file.txt')).toBe('subfolder/file.txt');
    });

    it('10. handles multiple consecutive leading slashes (///var/log/syslog)', () => {
      expect(sanitizePath('///var/log/syslog')).toBe('var/log/syslog');
    });

    it('11. handles deep excessive traversals (a/b/c/../../../../../../etc/passwd)', () => {
      expect(sanitizePath('a/b/c/../../../../../../etc/passwd')).toBe('etc/passwd');
    });

    it('12. handles mixed backslashes and forward slashes (a\\b/c\\..\\d)', () => {
      expect(sanitizePath('a\\b/c\\..\\d')).toBe('a/b/d');
    });

    it('13. handles empty or null path inputs', () => {
      expect(sanitizePath('')).toBe('');
    });
  });

  describe('validatePath', () => {
    it('14. rejects empty or whitespace paths', () => {
      const res1 = validatePath('');
      expect(res1.safe).toBe(false);
      expect(res1.blockedReason).toBe('Empty path');

      const res2 = validatePath('   ');
      expect(res2.safe).toBe(false);
      expect(res2.blockedReason).toBe('Empty path');
    });

    it('15. rejects paths containing null bytes', () => {
      const res = validatePath('malicious.exe\0.txt');
      expect(res.safe).toBe(false);
      expect(res.blockedReason).toContain('Null byte injection');
    });

    it('16. flags path traversal attempts while returning safe sanitized path', () => {
      const res = validatePath('../../../etc/passwd');
      expect(res.safe).toBe(true);
      expect(res.sanitizedPath).toBe('etc/passwd');
      expect(res.blockedReason).toBe('Path traversal components sanitized');
    });

    it('17. accepts valid safe relative paths without warning', () => {
      const res = validatePath('src/components/Button.tsx');
      expect(res.safe).toBe(true);
      expect(res.sanitizedPath).toBe('src/components/Button.tsx');
      expect(res.blockedReason).toBeUndefined();
    });
  });

  describe('validateSymlinkTarget', () => {
    it('18. blocks symlinks attempting to escape root via relative traversal', () => {
      const res = validateSymlinkTarget('../../etc/passwd', 'docs/readme.txt');
      expect(res.safe).toBe(false);
      expect(res.blockedReason).toContain('escapes extraction root');
    });

    it('19. allows safe relative symlinks within the extraction directory structure', () => {
      const res = validateSymlinkTarget('../license.txt', 'docs/readme.txt');
      expect(res.safe).toBe(true);
      expect(res.resolvedTarget).toBe('license.txt');
    });

    it('20. blocks symlinks pointing to absolute paths (/etc/passwd)', () => {
      const res = validateSymlinkTarget('/etc/passwd', 'docs/readme.txt');
      expect(res.safe).toBe(false);
      expect(res.blockedReason).toContain('absolute path outside root');
    });

    it('21. blocks symlinks with Windows drive letters (C:\\Windows\\System32)', () => {
      const res = validateSymlinkTarget('C:\\Windows\\System32', 'docs/readme.txt');
      expect(res.safe).toBe(false);
      expect(res.blockedReason).toContain('absolute path outside root');
    });

    it('22. blocks empty symlink targets', () => {
      const res = validateSymlinkTarget('', 'docs/readme.txt');
      expect(res.safe).toBe(false);
      expect(res.blockedReason).toBe('Empty symlink target');
    });

    it('23. blocks null byte injection in symlink targets', () => {
      const res = validateSymlinkTarget('target\0.txt', 'docs/readme.txt');
      expect(res.safe).toBe(false);
      expect(res.blockedReason).toContain('Null byte injection');
    });
  });

  describe('SanitizerTracker', () => {
    let tracker: SanitizerTracker;

    beforeEach(() => {
      tracker = new SanitizerTracker();
    });

    it('24. tracks sanitized and blocked entry counts correctly', () => {
      tracker.processPath('normal/file.txt'); // no change
      tracker.processPath('../traversal/file.txt'); // sanitized
      tracker.processPath('null\0byte.txt'); // blocked
      tracker.processSymlink('../../etc/passwd', 'a/b.txt'); // blocked symlink

      const stats = tracker.getStats();
      expect(stats.sanitizedCount).toBe(1);
      expect(stats.blockedCount).toBe(2);
    });

    it('25. resets stats properly', () => {
      tracker.processPath('null\0byte.txt');
      tracker.reset();
      expect(tracker.getStats()).toEqual({ blockedCount: 0, sanitizedCount: 0 });
    });
  });
});
