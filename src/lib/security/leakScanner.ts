/**
 * Pre-Flight Leak Scanner Module.
 * Scans filenames and text content for exposed credentials, high-entropy secret tokens, and sensitive system files.
 */

export interface FilenameLeakFinding {
  path: string;
  category: 'credential_file' | 'private_key' | 'vcs_dir' | 'aws_config' | 'sensitive_system';
  severity: 'high' | 'critical';
  description: string;
}

export interface ContentSecretFinding {
  type: 'aws_key' | 'ssh_private_key' | 'jwt_token' | 'github_token' | 'slack_token' | 'stripe_key' | 'generic_secret' | 'high_entropy_token';
  matchedToken: string; // masked for safe display
  line?: number;
  entropy?: number;
  description: string;
}

export interface EntryLeakReport {
  entryName: string;
  hasFilenameLeak: boolean;
  filenameLeaks: FilenameLeakFinding[];
  contentSecrets: ContentSecretFinding[];
  isFlagged: boolean;
}

/**
 * Calculates the Shannon Entropy of a string.
 * High entropy (> 4.0 over 20+ chars) indicates high-randomness strings such as API keys or hashes.
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const frequencies: Record<string, number> = {};
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Masks sensitive secret strings for safe display (e.g., "AKIA...89AB").
 */
export function maskSecretToken(token: string): string {
  if (token.length <= 8) {
    return '***REDENCTED***';
  }
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Scans an entry filename or path for sensitive credential file patterns.
 */
export function scanFilenameLeaks(path: string): FilenameLeakFinding[] {
  const findings: FilenameLeakFinding[] = [];
  const normalized = path.replace(/\\/g, '/').toLowerCase();

  // 1. Environment files (.env, .env.local, .env.production)
  if (/(^|\/)\.env(\.[a-z0-9_-]+)?$/i.test(normalized)) {
    findings.push({
      path,
      category: 'credential_file',
      severity: 'critical',
      description: 'Environment file (.env) detected which may contain unencrypted secrets/passwords.',
    });
  }

  // 2. Private Key Files (id_rsa, id_ed25519, *.pem, *.key, id_dsa)
  if (
    /(^|\/)(id_rsa|id_ed25519|id_dsa|id_ecdsa)$/i.test(normalized) ||
    /\.(pem|key|pkcs12|pfx|keystore)$/i.test(normalized)
  ) {
    findings.push({
      path,
      category: 'private_key',
      severity: 'critical',
      description: 'Cryptographic private key or certificate file detected.',
    });
  }

  // 3. VCS directory artifacts (.git/, .svn/)
  if (/(^|\/)\.git(\/|$)/i.test(normalized) || /(^|\/)\.svn(\/|$)/i.test(normalized)) {
    findings.push({
      path,
      category: 'vcs_dir',
      severity: 'high',
      description: 'Internal VCS directory (.git/.svn) detected.',
    });
  }

  // 4. AWS / Cloud Configuration
  if (/(^|\/)\.aws\/(credentials|config)/i.test(normalized) || /(^|\/)credentials(\.json|\.yml|\.xml)?$/i.test(normalized)) {
    findings.push({
      path,
      category: 'aws_config',
      severity: 'critical',
      description: 'Cloud credential or API configuration file detected.',
    });
  }

  // 5. Sensitive system files (/etc/shadow, /etc/passwd, .htpasswd)
  if (/(^|\/)(\.htpasswd|shadow|passwd|master\.passwd)$/i.test(normalized)) {
    findings.push({
      path,
      category: 'sensitive_system',
      severity: 'critical',
      description: 'Sensitive system credential file detected.',
    });
  }

  return findings;
}

/**
 * Known secret pattern regexes.
 */
const SECRET_REGEX_PATTERNS: Array<{
  type: ContentSecretFinding['type'];
  regex: RegExp;
  description: string;
}> = [
  {
    type: 'aws_key',
    regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
    description: 'AWS Access Key ID',
  },
  {
    type: 'ssh_private_key',
    regex: /-----BEGIN\s+(RSA|OPENSSH|EC|DSA|PGP)\s+PRIVATE\s+KEY-----/g,
    description: 'SSH/PGP Private Key Header',
  },
  {
    type: 'github_token',
    regex: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})\b/g,
    description: 'GitHub Personal Access Token',
  },
  {
    type: 'slack_token',
    regex: /\bxoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}\b/g,
    description: 'Slack Bot Access Token',
  },
  {
    type: 'stripe_key',
    regex: /\bsk_live_[0-9a-zA-Z]{24}\b/g,
    description: 'Stripe Live Secret Key',
  },
  {
    type: 'jwt_token',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    description: 'JSON Web Token (JWT)',
  },
];

/**
 * Scans text content lines for secret patterns and high Shannon entropy tokens.
 */
export function scanTextContentLeaks(textContent: string): ContentSecretFinding[] {
  const findings: ContentSecretFinding[] = [];
  if (!textContent) return findings;

  const lines = textContent.split(/\r?\n/);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNum = lineIdx + 1;

    // 1. Regex secret pattern matching
    for (const pattern of SECRET_REGEX_PATTERNS) {
      pattern.regex.lastIndex = 0; // Reset regex state
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        const token = match[0];
        findings.push({
          type: pattern.type,
          matchedToken: maskSecretToken(token),
          line: lineNum,
          description: pattern.description,
        });
      }
    }

    // 2. High-entropy token analysis on word segments
    const tokens = line.split(/[\s="'`:;,<>()[]{}]/);
    for (const token of tokens) {
      const cleanToken = token.trim();
      if (cleanToken.length >= 20 && cleanToken.length <= 128) {
        // Exclude common Base64/standard uniform sequences if needed, calculate entropy
        const entropy = calculateShannonEntropy(cleanToken);
        if (entropy > 4.0 && !cleanToken.includes('http://') && !cleanToken.includes('https://')) {
          // Avoid duplicate report if already matched by regex
          const alreadyMatched = findings.some(
            f => f.line === lineNum && f.matchedToken === maskSecretToken(cleanToken)
          );
          if (!alreadyMatched) {
            findings.push({
              type: 'high_entropy_token',
              matchedToken: maskSecretToken(cleanToken),
              line: lineNum,
              entropy: parseFloat(entropy.toFixed(2)),
              description: `High Shannon entropy token (entropy ${entropy.toFixed(2)} > 4.0)`,
            });
          }
        }
      }
    }
  }

  return findings;
}

/**
 * Comprehensive leak scan for an archive entry.
 */
export function scanEntryLeaks(entryName: string, textContent?: string): EntryLeakReport {
  const filenameLeaks = scanFilenameLeaks(entryName);
  const contentSecrets = textContent ? scanTextContentLeaks(textContent) : [];

  const hasFilenameLeak = filenameLeaks.length > 0;
  const isFlagged = hasFilenameLeak || contentSecrets.length > 0;

  return {
    entryName,
    hasFilenameLeak,
    filenameLeaks,
    contentSecrets,
    isFlagged,
  };
}
