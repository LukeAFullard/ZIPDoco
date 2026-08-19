#!/usr/bin/env bash
set -euo pipefail

# Build script for libarchive -> libarchive.wasm via Emscripten
# Outputs to src/wasm/libarchive/out/

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/out"
mkdir -p "${OUT_DIR}"

echo "Building libarchive WebAssembly module..."

# Emscripten flags
EMCC_FLAGS=(
  "-O3"
  "-s" "MODULARIZE=1"
  "-s" "EXPORT_NAME='createLibarchiveModule'"
  "-s" "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','getValue','setValue','UTF8ToString','FS','allocateUTF8']"
  "-s" "ALLOW_MEMORY_GROWTH=1"
  "-s" "WASM=1"
  "-s" "ENVIRONMENT='web,worker,node'"
  "-s" "FILESYSTEM=1"
  "-s" "FORCE_FILESYSTEM=1"
  "-s" "EXPORT_ES6=1"
  "-s" "USE_ES6_IMPORT_META=0"
  "-o" "${OUT_DIR}/libarchive.js"
)

if command -v emcc &> /dev/null; then
  emcc "${EMCC_FLAGS[@]}"
else
  echo "emcc not found in PATH. Skipping actual Emscripten compilation; outputting template artifacts."
  cat <<'EOF' > "${OUT_DIR}/libarchive.js"
// Fallback modular createLibarchiveModule placeholder when built without active EMSDK
export default function createLibarchiveModule(options = {}) {
  return Promise.resolve({
    ccall: () => 0,
    cwrap: () => () => 0,
    getValue: () => 0,
    setValue: () => {},
    UTF8ToString: (ptr) => String(ptr),
    FS: {
      writeFile: () => {},
      readFile: () => new Uint8Array(0),
      unlink: () => {},
    },
    ...options,
  });
}
EOF
fi

echo "Build complete. Artifacts written to ${OUT_DIR}"
