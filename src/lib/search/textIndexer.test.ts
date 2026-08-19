import { describe, it, expect } from 'vitest';
import {
  buildInvertedIndex,
  tokenizeText,
  type SearchDocument,
} from './textIndexer';

describe('tokenizeText', () => {
  it('tokenizes lowercases and filters short tokens', () => {
    const tokens = tokenizeText('Hello World! This is a test_123.');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    expect(tokens).toContain('this');
    expect(tokens).toContain('test_123');
    expect(tokens).not.toContain('a');
  });
});

describe('InvertedIndex & buildInvertedIndex', () => {
  it('indexes documents and returns relevant search results with line occurrences', () => {
    const docs: SearchDocument[] = [
      {
        name: 'README.md',
        content: '# Project Overview\nThis project provides offline archive extraction and search.',
      },
      {
        name: 'src/main.ts',
        content: 'import { search } from "./search";\nconsole.log("Starting main app");',
      },
      {
        name: 'data.json',
        content: '{"secret": "hidden_value"}',
      },
    ];

    const index = buildInvertedIndex(docs);
    const results = index.search('archive extraction');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('README.md');
    expect(results[0].occurrences[0].lineNumber).toBe(2);
    expect(results[0].occurrences[0].lineContent).toContain('offline archive extraction');
  });

  it('returns empty results for non-matching queries', () => {
    const docs: SearchDocument[] = [{ name: 'file.txt', content: 'hello world' }];
    const index = buildInvertedIndex(docs);
    const results = index.search('nonexistent_query_string');
    expect(results).toHaveLength(0);
  });
});
