import { describe, it, expect } from 'vitest';
import {
  calculateShannonEntropy,
  scanFilenameLeaks,
  scanTextContentLeaks,
  scanEntryLeaks,
  maskSecretToken,
} from './leakScanner';

describe('leakScanner Module', () => {
  describe('calculateShannonEntropy', () => {
    it('returns 0 for empty string', () => {
      expect(calculateShannonEntropy('')).toBe(0);
    });

    it('returns 0 for single character repeated string', () => {
      expect(calculateShannonEntropy('AAAAAAA')).toBe(0);
    });

    it('calculates high entropy for random base64 secret strings', () => {
      const randomSecret = 'd9F2kL8mP4xQ7wR1vS0tN5zY';
      const entropy = calculateShannonEntropy(randomSecret);
      expect(entropy).toBeGreaterThan(4.0);
    });
  });

  describe('scanFilenameLeaks', () => {
    it('detects .env files', () => {
      const leaks = scanFilenameLeaks('config/.env');
      expect(leaks).toHaveLength(1);
      expect(leaks[0].category).toBe('credential_file');
    });

    it('detects private key files', () => {
      const leaks1 = scanFilenameLeaks('keys/id_rsa');
      expect(leaks1[0].category).toBe('private_key');

      const leaks2 = scanFilenameLeaks('certs/server.pem');
      expect(leaks2[0].category).toBe('private_key');
    });

    it('detects .git repository internal folders', () => {
      const leaks = scanFilenameLeaks('project/.git/HEAD');
      expect(leaks[0].category).toBe('vcs_dir');
    });

    it('detects AWS credentials file', () => {
      const leaks = scanFilenameLeaks('.aws/credentials');
      expect(leaks[0].category).toBe('aws_config');
    });

    it('passes standard safe files', () => {
      expect(scanFilenameLeaks('src/index.ts')).toHaveLength(0);
      expect(scanFilenameLeaks('docs/README.md')).toHaveLength(0);
    });
  });

  describe('scanTextContentLeaks', () => {
    it('detects AWS Access Keys', () => {
      const text = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n';
      const findings = scanTextContentLeaks(text);
      expect(findings.some(f => f.type === 'aws_key')).toBe(true);
      expect(findings[0].matchedToken).toBe(maskSecretToken('AKIAIOSFODNN7EXAMPLE'));
    });

    it('detects SSH Private Key Headers', () => {
      const text = '-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEA...\n';
      const findings = scanTextContentLeaks(text);
      expect(findings.some(f => f.type === 'ssh_private_key')).toBe(true);
    });

    it('detects GitHub Personal Access Tokens', () => {
      const text = 'token = "ghp_123456789012345678901234567890123456"';
      const findings = scanTextContentLeaks(text);
      expect(findings.some(f => f.type === 'github_token')).toBe(true);
    });

    it('detects high-entropy random tokens', () => {
      const text = 'SECRET_KEY = "x9K3#mP7!vQ1$zL8&wR4*tN0"\n';
      const findings = scanTextContentLeaks(text);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('scanEntryLeaks', () => {
    it('combines filename and content analysis into a single entry report', () => {
      const report = scanEntryLeaks('.env', 'DATABASE_URL=postgres://user:password@localhost/db');
      expect(report.isFlagged).toBe(true);
      expect(report.hasFilenameLeak).toBe(true);
      expect(report.filenameLeaks).toHaveLength(1);
    });
  });
});
