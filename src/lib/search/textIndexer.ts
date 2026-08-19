export interface SearchDocument {
  id?: string;
  name: string;
  content?: string;
}

export interface SearchResultOccurrence {
  lineNumber: number;
  lineContent: string;
  matchWord: string;
}

export interface SearchResultItem {
  name: string;
  score: number;
  occurrences: SearchResultOccurrence[];
}

export interface Posting {
  docName: string;
  lineNumber: number;
  lineContent: string;
}

export class InvertedIndex {
  private postingsMap = new Map<string, Posting[]>();

  public addDocument(doc: SearchDocument): void {
    if (!doc.content) return;

    // Limit indexing to files under 5MB string length
    if (doc.content.length > 5 * 1024 * 1024) return;

    const lines = doc.content.split(/\r?\n/);
    lines.forEach((line, lineIdx) => {
      const lineNumber = lineIdx + 1;
      const terms = tokenizeText(line);

      terms.forEach((term) => {
        let list = this.postingsMap.get(term);
        if (!list) {
          list = [];
          this.postingsMap.set(term, list);
        }
        list.push({
          docName: doc.name,
          lineNumber,
          lineContent: line.trim(),
        });
      });
    });
  }

  public search(query: string): SearchResultItem[] {
    const queryTerms = tokenizeText(query);
    if (queryTerms.length === 0) return [];

    const resultsMap = new Map<string, { score: number; occurrences: SearchResultOccurrence[] }>();

    queryTerms.forEach((queryTerm) => {
      // Prefix matching or exact term matching
      for (const [term, postings] of this.postingsMap.entries()) {
        if (term.includes(queryTerm)) {
          postings.forEach((p) => {
            let res = resultsMap.get(p.docName);
            if (!res) {
              res = { score: 0, occurrences: [] };
              resultsMap.set(p.docName, res);
            }

            res.score += 1;
            // Prevent duplicate line occurrences
            if (!res.occurrences.some((occ) => occ.lineNumber === p.lineNumber)) {
              res.occurrences.push({
                lineNumber: p.lineNumber,
                lineContent: p.lineContent,
                matchWord: term,
              });
            }
          });
        }
      }
    });

    const items: SearchResultItem[] = [];
    resultsMap.forEach((val, name) => {
      items.push({
        name,
        score: val.score,
        occurrences: val.occurrences,
      });
    });

    // Sort by relevance score descending
    return items.sort((a, b) => b.score - a.score);
  }
}

export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((token) => token.length >= 2);
}

export function buildInvertedIndex(docs: SearchDocument[]): InvertedIndex {
  const index = new InvertedIndex();
  docs.forEach((doc) => index.addDocument(doc));
  return index;
}
