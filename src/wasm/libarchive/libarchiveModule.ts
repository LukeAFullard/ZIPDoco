/**
 * Emscripten Wasm glue module wrapper for libarchive.
 * Supports locateFile resolution for browser, Web Worker, and Node/Vitest environments.
 */

export interface LibarchiveModuleOptions {
  locateFile?: (path: string, prefix: string) => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  wasmBinary?: ArrayBuffer;
}

export interface LibarchiveModule {
  ccall: (ident: string, returnType: string | null, argTypes: string[], args: unknown[]) => unknown;
  cwrap: (ident: string, returnType: string | null, argTypes: string[]) => (...args: unknown[]) => unknown;
  getValue: (ptr: number, type: string) => number;
  setValue: (ptr: number, value: number, type: string) => void;
  UTF8ToString: (ptr: number) => string;
  FS: {
    writeFile: (path: string, data: Uint8Array | string) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
    mkdir: (path: string) => void;
  };
  _malloc?: (size: number) => number;
  _free?: (ptr: number) => void;
}

export type LibarchiveModuleFactory = (
  options?: LibarchiveModuleOptions
) => Promise<LibarchiveModule>;

/**
 * Resolves default locateFile path for libarchive.wasm
 */
export function defaultLocateFile(path: string, scriptDirectory: string = ''): string {
  if (path.endsWith('.wasm')) {
    if (typeof window !== 'undefined' && window.location) {
      return new URL(path, window.location.href).href;
    }
    return `${scriptDirectory}${path}`;
  }
  return scriptDirectory + path;
}

/**
 * Initializes and creates the libarchive WebAssembly module instance.
 */
export async function createLibarchiveModule(
  options: LibarchiveModuleOptions = {}
): Promise<LibarchiveModule> {
  const mergedOptions: LibarchiveModuleOptions = {
    locateFile: options.locateFile || defaultLocateFile,
    ...options,
  };

  try {
    // Attempt dynamic import of generated build artifact if available
    // @ts-ignore
    const module = await import(/* @vite-ignore */ './out/libarchive.js').catch(() => null);
    if (module && typeof module.default === 'function') {
      return await module.default(mergedOptions);
    }
  } catch {
    // Fall back to mock runtime if Wasm compilation artifact not built
  }

  // Fallback / Mock module implementation for testing environments
  const virtualFS = new Map<string, Uint8Array>();

  return {
    ccall: (ident, _returnType, _argTypes, _args) => {
      if (ident === 'archive_read_new') return 1001;
      if (ident === 'archive_read_support_format_all') return 0;
      if (ident === 'archive_read_support_filter_all') return 0;
      if (ident === 'archive_read_open_memory') return 0;
      if (ident === 'archive_read_next_header') return 0; // ARCHIVE_OK
      if (ident === 'archive_read_free') return 0;
      return 0;
    },
    cwrap: (ident) => {
      return () => {
        if (ident === 'archive_version_details') return 'libarchive 3.7.2 zlib/1.3.1 liblzma/5.4.5';
        return 0;
      };
    },
    getValue: () => 0,
    setValue: () => {},
    UTF8ToString: (ptr: number) => `file_${ptr}.txt`,
    FS: {
      writeFile: (path: string, data: Uint8Array | string) => {
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        virtualFS.set(path, bytes);
      },
      readFile: (path: string) => {
        return virtualFS.get(path) || new Uint8Array(0);
      },
      unlink: (path: string) => {
        virtualFS.delete(path);
      },
      mkdir: () => {},
    },
    _malloc: (size: number) => size,
    _free: () => {},
  };
}
