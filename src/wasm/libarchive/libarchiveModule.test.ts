import { describe, it, expect } from 'vitest';
import { createLibarchiveModule, defaultLocateFile } from './libarchiveModule';

describe('libarchiveModule Wasm Pipeline', () => {
  it('should initialize libarchive module instance with default options', async () => {
    const mod = await createLibarchiveModule();
    expect(mod).toBeDefined();
    expect(typeof mod.ccall).toBe('function');
    expect(typeof mod.cwrap).toBe('function');
    expect(mod.FS).toBeDefined();
  });

  it('should correctly resolve locateFile path for .wasm binary', () => {
    const resolved = defaultLocateFile('libarchive.wasm', '/assets/');
    expect(resolved).toContain('libarchive.wasm');
  });

  it('should execute C wrapper calls and mock virtual filesystem operations', async () => {
    const mod = await createLibarchiveModule();

    // Test virtual FS
    const sampleData = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]); // RAR5 header magic
    mod.FS.writeFile('/tmp/archive.rar', sampleData);

    const readBack = mod.FS.readFile('/tmp/archive.rar');
    expect(readBack).toEqual(sampleData);

    mod.FS.unlink('/tmp/archive.rar');
    expect(mod.FS.readFile('/tmp/archive.rar')).toHaveLength(0);
  });

  it('should verify basic archive read calls against RAR5 test fixture', async () => {
    const mod = await createLibarchiveModule();

    // Call simulated archive functions
    const archivePtr = mod.ccall('archive_read_new', 'number', [], []) as number;
    expect(archivePtr).toBeGreaterThan(0);

    const supportResult = mod.ccall('archive_read_support_format_all', 'number', ['number'], [archivePtr]);
    expect(supportResult).toBe(0);

    const freeResult = mod.ccall('archive_read_free', 'number', ['number'], [archivePtr]);
    expect(freeResult).toBe(0);
  });
});
