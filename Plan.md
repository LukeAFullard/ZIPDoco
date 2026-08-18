# Archive Intake PWA — Full Build Plan

## 1. Product Summary

A 100% client-side Progressive Web App for safely opening, inspecting, converting, and
repacking archive files (RAR4/5, 7z, TAR, GZ, BZ2, XZ, ZIP). Positioning: not "another
unzip tool" — a **safe intake tool for untrusted archives**, aimed at developers, IT/security
teams, and anyone receiving files from outside their organization. Zero network dependency
at runtime; all processing happens in-browser via WebAssembly and Web Workers.

### Non-goals (explicit, do not build)
- No browser extension. PWA only.
- No self-extracting HTML payloads (malware-pattern risk, cut from scope).
- No server-side processing of any kind, ever — this is the core trust promise.
- No password-cracking / brute-force features.
- No AV-style malware signature scanning (false sense of security without a threat-intel
  feed; conflicts with zero-network architecture).

---

## 2. Technology Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| Archive reading | **libarchive** compiled to Wasm via Emscripten | BSD-licensed, no use restrictions (unlike RARLAB's `unrar`, which forbids building a compressor and carries other non-free clauses). Natively supports RAR4 **and** RAR5, 7z, TAR, GZ, BZ2, XZ. |
| ZIP writing | **fflate** (streaming, Worker-friendly) | Lightweight, no main-thread blocking, good compression ratio/speed tradeoff. |
| Concurrency | Web Worker pool (4–8 workers, `navigator.hardwareConcurrency` bound) | Keeps UI thread responsive during scan/extract/repack. |
| Large-file storage | **Origin Private File System (OPFS)** + **File System Access API** | Enables multi-GB streaming without holding full archive in memory. |
| Memory model | Wasm32 (4 GB linear memory ceiling), **not** Memory64 | Memory64 origin-trial/partial support as of 2026 is not reliable enough to depend on; stream chunks through a bounded working set instead of raising the ceiling. |
| App shell | PWA: Service Worker + Web App Manifest | Offline capability, installability. |
| OS integration | **File Handling API** (register as `.zip/.rar/.7z/.tar.gz` handler) + **Web Share Target API** | Gets "open with" / "share to" behavior without an extension. |

### Critical architectural constraint
**Never hold the full archive or its full extracted contents in Wasm linear memory.**
All read/write operations must be chunked and streamed through OPFS. This is a Milestone 1
requirement, not a later optimization — retrofitting it after M2/M3 features are built on
top of an in-memory model would require a rewrite.

---

## 3. System Architecture

```
[Main Thread / UI]
   |
   |-- postMessage --> [Worker Pool Coordinator]
   |                        |
   |                        |-- Worker 1..N: libarchive.wasm instance
   |                        |       reads archive in CHUNK_SIZE (e.g. 4MB) blocks
   |                        |       from OPFS-backed file handle
   |                        |
   |                        |-- Worker (dedicated): fflate streaming ZIP writer
   |                        |       writes output chunks to OPFS as produced
   |                        |
   |                        `-- Worker (dedicated): security scan pipeline
   |                                (bomb ratio check, path sanitizer, magic-byte
   |                                 verification, secret pattern scan)
   |
   `-- OPFS root
          /incoming/{session-id}/source.<ext>      (streamed in from File System Access API)
          /incoming/{session-id}/work/*             (scratch space for extraction)
          /incoming/{session-id}/output.zip          (streamed repack target)
```

### Data flow for "open archive"
1. User drops file or opens via File Handling API → File handle acquired via File System
   Access API (no full read into memory).
2. File streamed in 4MB chunks into an OPFS scratch file.
3. Pre-flight pass (Milestone 1): read only the central directory / header structures
   (format-dependent) to get file count, compressed/uncompressed size ratios, entry names —
   **before** any full decompression.
4. If pre-flight passes safety checks, proceed to full listing; extraction of individual
   files happens **on demand**, not eagerly.

---

## Milestone 1 — Core MVP & Security Shields

**Goal:** A working, safe, installable PWA that can open and convert archives. This is the
part that must ship correctly before anything else is layered on.

### 1.1 Universal Transcoder
- Input: drag-and-drop or File Handling API launch of `.rar`, `.7z`, `.tar`, `.tar.gz`,
  `.tar.bz2`, `.tar.xz`.
- Output: standard `.zip`, optionally AES-256 encrypted (via a Wasm AES implementation
  applied to the fflate output stream — do not implement crypto by hand).
- Multi-volume RAR (`.part1.rar`, `.part2.rar`, ...) is **out of scope for auto-detection**
  in M1: detect the pattern, show a clear message asking the user to select all volumes,
  and merge them into a single logical stream before handing to libarchive. Do not silently
  fail on volume 1 only.
- Acceptance criteria:
  - Successfully round-trips a 2GB test archive without exceeding ~200MB peak JS heap
    (verify via Performance/Memory panel in automated test).
  - Output zip opens correctly in native OS tools (macOS Archive Utility, Windows Explorer,
    7-Zip).

### 1.2 Zip Bomb Defense
- **Pre-flight check** (runs before any full decompression):
  - Read archive central directory / header only.
  - Compute `expansion_ratio = sum(uncompressed_size) / sum(compressed_size)` across all
    entries.
  - **Trigger threshold: >100:1** → block automatic extraction, show warning with the
    actual ratio, require explicit user confirmation to proceed, and if they proceed,
    extract one entry at a time with the circuit breaker below active.
  - Also check **nested archives**: if an entry inside the archive is itself an archive
    format (by magic bytes, not just extension), recurse the same ratio check into it
    before allowing extraction — this closes the "matryoshka bomb" evasion where a single
    outer archive looks safe but contains a bomb one level down.
- **Worker memory circuit breaker** (runtime safety net, independent of pre-flight):
  - Each extraction Worker tracks cumulative bytes written to OPFS during a single
    operation.
  - Hard cap (configurable, default 10GB per session) — if exceeded, abort the operation,
    discard partial output, surface an error.
- Acceptance criteria: a synthetic 42.zip-style test bomb is caught at pre-flight and never
  reaches full decompression.

### 1.3 Zip Slip Neutralizer
- For every entry path extracted from any archive format:
  - Strip leading `/` or drive letters (`C:\`).
  - Resolve `..` segments; if resolution would place the target outside the extraction
    root, **reject that entry** (do not silently clamp it — log it as blocked and show the
    user a count of blocked entries).
  - Reject symlink entries (common in TAR) whose target resolves outside the extraction
    root, using the same resolution logic.
- Implement as a single shared sanitizer function used by every extraction code path (not
  duplicated per format) — this function is a natural unit-test target: write ~15 test
  cases covering `../`, absolute paths, symlink targets, and mixed separators.

### 1.4 OS Junk Stripper
- One-click toggle, on by default, that filters these from extraction output:
  `__MACOSX/`, `.DS_Store`, `Thumbs.db`, `desktop.ini`.
- Apply the filter at the listing stage (so junk files don't even appear in the file tree)
  as well as at extraction time.

### M1 exit criteria
- All four features above pass acceptance criteria.
- PWA is installable (manifest + service worker validated via Lighthouse PWA audit, target
  score ≥90).
- No feature requires network access at runtime; verify by testing with DevTools "offline"
  mode after first load.

---

## Milestone 2 — Inspection, Safety & File Polish

**Goal:** Make the tool safe and useful to actually look inside an archive before trusting
it — this is where the "intake" positioning becomes real, not just marketing copy.

### 2.1 Zero-Extract Quick Look
- Preview without writing to disk: text, Markdown (rendered), CSV (as table), images
  (png/jpg/gif/webp), PDF (via a Wasm PDF renderer, e.g. pdf.js).
- **Syntax-highlighted code preview** for common source extensions (`.py`, `.js`, `.ts`,
  `.tsx`, `.go`, `.rs`, `.java`, etc.) using a lightweight highlighter (e.g. Prism, loaded
  lazily).
- Preview reads only the bytes needed for the single entry being viewed (seek within the
  Wasm-decompressed stream), not the whole archive.

### 2.2 Selective Extraction
- Interactive file tree (virtualized rendering for archives with 10k+ entries — do not
  render the full DOM tree eagerly).
- Checkbox selection at file or folder granularity; "Extract selected" streams only the
  chosen entries to OPFS / triggers browser download.

### 2.3 Mojibake Repair
- Auto-detect legacy encodings in filenames and text content: Shift-JIS, GBK, Windows-1252.
- Use a charset-detection library (e.g. a Wasm port of `uchardet` or `chardet`-equivalent)
  run against filename byte sequences and text file contents.
- Normalize to UTF-8 on extraction; show a before/after diff of renamed files so the user
  can confirm rather than being surprised.

### 2.4 Spoofer Shield
- Detect Right-to-Left Override character (`\u202E`) and other Unicode bidi-control
  characters in filenames — flag any entry where the override changes the apparent file
  extension.
- Verify true file type via magic-byte sniffing (first N bytes) against the claimed
  extension for every entry; flag mismatches (e.g. a `.pdf` that's actually a PE
  executable).
- **Disguised-executable detection** (extends Spoofer Shield): flag double extensions
  (`invoice.pdf.exe`), and specifically call out `.lnk`, `.hta`, `.scr` regardless of
  magic-byte result, since these are common social-engineering vectors independent of
  content.
- Surface all flags in a single "Safety" panel per archive, not scattered inline — this
  becomes the seed of the audit report in M3.

### M2 exit criteria
- Quick Look renders all listed formats without extraction-to-disk (verify via OPFS write
  count = 0 during preview-only session).
- Spoofer Shield correctly flags a test set of RTLO-renamed and magic-byte-mismatched fixtures.

---

## Milestone 3 — Batch Workflows & Integrity (the differentiation layer)

**Goal:** This is the milestone that actually separates the product from the ~6+ existing
"free client-side unzip" tools already in market. Prioritize accordingly.

### 3.1 Pre-Flight Leak Scanner (promoted from original M3 — highest-priority feature here)
- **Filename-based pass:** flag `.env`, `.pem`, `.key`, `id_rsa*`, `.git/`, `credentials*`,
  `*_rsa`, cloud provider credential file patterns (`.aws/credentials`, etc.).
- **Content-based pass** (the actual differentiator — do not ship filename-only):
  - Run a Shannon-entropy check on string tokens extracted from text-like files; flag
    high-entropy strings above a length/entropy threshold (tunable, start with entropy >
    4.0 bits/char over ≥20 chars).
  - Pattern-match known secret formats: AWS access keys (`AKIA[0-9A-Z]{16}`), private key
    PEM headers (`-----BEGIN...PRIVATE KEY-----`), generic JWT structure, Slack/Stripe/etc.
    token prefixes.
  - This catches secrets in files renamed to avoid filename detection (e.g. `secrets.env`
    → `notes.txt`).
- One-click purge: removes flagged entries from the repack output; always show a
  confirmation list before purging (never silent-delete).

### 3.2 Batch Consolidator
- Accept multiple archives in one drop.
- "Unzip All" → isolated output folder per archive (named after source archive, collision-
  safe).
- "Merge All" → single deduplicated master ZIP; dedupe by content hash (SHA-256 of file
  bytes), not just filename, so identical files under different names are still deduped.
- Both modes run through the same Junk Stripper / Zip Slip / Zip Bomb pipeline per archive
  — no shortcuts for batch mode.

### 3.3 Archive Diff
- Dual-pane comparison between two archives: added / removed / modified / size-delta,
  keyed by normalized path.
- **Line-level diff for text/code files specifically** (not just "modified" flag) — reuse
  the syntax-highlighted preview component from 2.1, rendered in a two-column diff view
  (a simple LCS-based diff algorithm run client-side is sufficient; no need for a Wasm
  diff library at this scale).

### 3.4 Exportable Audit Report
- After running Leak Scanner + Spoofer Shield + Zip Bomb/Slip checks on an archive,
  generate a single report: file count, flagged items with reasons, SHA-256 manifest of
  all entries, encoding issues found.
- Export as JSON (machine-readable) and PDF (human-readable, for attaching to a ticket).
- This is the natural seed of a future paid/team tier — scope the data model with that in
  mind (structured JSON schema, versioned) even though monetization isn't in this plan.

### M3 exit criteria
- Content-based secret scan catches a renamed-extension test fixture that filename-only
  scanning would miss.
- Merge-all dedup correctly collapses byte-identical files across ≥3 source archives with
  different filenames.

---

## Milestone 4 — PWA-Native Differentiation

**Goal:** Features that lean into being an installed PWA rather than a website, without
crossing into extension territory.

### 4.1 File Handling API Registration
- Register `.zip`, `.rar`, `.7z`, `.tar.gz` in the Web App Manifest `file_handlers` field
  so the installed PWA appears in the OS "Open with" menu.
- Verify behavior on Chromium desktop (primary support target); note in docs that Safari/
  Firefox support is partial/absent as of 2026 and the app must still work as a normal tab
  for those browsers.

### 4.2 Web Share Target API
- Register as a share target so files can be shared directly into the app from other apps
  on Android and supporting desktop contexts, without needing an extension.

### 4.3 Thumbnail Grid View
- For archives detected as image/video-heavy (heuristic: >50% of entries match image
  extensions), offer a grid view instead of the file tree.
- Generate thumbnails client-side (canvas-based downscale) with lazy loading /
  virtualization — do not decode every image eagerly for a large archive.
- Format-aware detection extends this: recognize comic archives (CBR/CBZ) specifically and
  default to a reader-style paginated view rather than a grid.

### 4.4 Full-Text Search Inside Archive
- Index text-like file contents (respecting a reasonable size cap per file, e.g. skip files
  >5MB from indexing to avoid pathological cases) into an in-memory search structure
  (simple inverted index is sufficient at this scale — no need for a full search library).
- Search runs against the index without extracting files to disk; clicking a result opens
  Quick Look at the matching file/line.

### M4 exit criteria
- File Handling registration verified working end-to-end on Chromium (double-click a
  `.zip` in OS file manager launches the installed PWA with that file loaded).
- Full-text search returns results in <500ms for a 500-file archive on a mid-range laptop.

---

## 4. Cross-Cutting Engineering Requirements (apply to every milestone)

- **Testing:** every sanitizer/security function (Zip Slip, Zip Bomb ratio check, magic-
  byte verification, secret pattern matching) needs a dedicated unit test suite with known-
  malicious fixtures, run in CI before merge — these are the functions where a regression
  is a security incident, not a bug.
- **No feature may introduce a network call.** Add a CI check (e.g. a test that runs the
  app fully offline and fails the build if any `fetch`/`XMLHttpRequest` fires) to enforce
  the zero-network promise structurally, not just by convention.
- **Worker error isolation:** a crash or exception in one Worker (e.g. a malformed archive
  triggering a libarchive parse error) must not crash the main thread or other in-flight
  Worker jobs — wrap all Worker message handlers in try/catch and report structured errors
  back to the UI.
- **OPFS cleanup:** scratch space under `/incoming/{session-id}/` must be deleted when a
  session ends (tab close, or explicit "start over") — add a cleanup routine on
  `visibilitychange`/`beforeunload` as a best-effort, plus a startup routine that purges
  orphaned session directories older than 24 hours.

---

## 5. Suggested Build Order for an Agent

1. Scaffold PWA shell (manifest, service worker, offline caching) — do this first so every
   subsequent milestone is testable in an installed, offline context from day one.
2. Wasm build pipeline: compile libarchive via Emscripten, verify RAR5 read works on a test
   fixture, before writing any UI.
3. OPFS + Worker pool plumbing with the chunked-streaming model — build and load-test this
   against a large (5GB+) synthetic file *before* building M1 UI on top of it, since this is
   the highest-risk architectural assumption in the whole plan.
4. M1 features in the order listed (Transcoder → Zip Bomb → Zip Slip → Junk Stripper).
5. M2, M3, M4 in order, but M3.1 (Leak Scanner) can be pulled forward ahead of 2.3/2.4 if
   the agent is working in parallel tracks — it has no dependency on Mojibake/Spoofer work.