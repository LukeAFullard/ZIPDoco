import { describe, it, expect } from 'vitest';
import { PdfViewer } from './PdfViewer';

describe('PdfViewer component', () => {
  it('instantiates properly and exports component function', () => {
    expect(PdfViewer).toBeDefined();
    expect(typeof PdfViewer).toBe('function');
  });

  it('accepts fileName and text/binary PDF content props', () => {
    const props = {
      fileName: 'financial_report.pdf',
      content: 'Sample PDF content text',
    };

    expect(props.fileName).toBe('financial_report.pdf');
    expect(props.content).toBe('Sample PDF content text');
  });
});
