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
| Archive reading | **libarchive** compiled to Wasm via Emscripten | BSD-licensed, no use restrictions. Natively supports RAR4 **and** RAR5, 7z, TAR, GZ, BZ2, XZ. |
| ZIP writing | **fflate** (streaming, Worker-friendly) | Lightweight, no main-thread blocking, good compression ratio/speed tradeoff. |
| Concurrency | Web Worker pool (4–8 workers, `navigator.hardwareConcurrency` bound) | Keeps UI thread responsive during scan/extract/repack. |
| Large-file storage | **Origin Private File System (OPFS)** + **File System Access API** | Enables multi-GB streaming without holding full archive in memory. |
| Memory model | Wasm32 (4 GB linear memory ceiling), **not** Memory64 | Stream chunks through a bounded working set instead of raising the ceiling. |
| App shell | PWA: Service Worker + Web App Manifest | Offline capability, installability. |
| OS integration | **File Handling API** + **Web Share Target API** | Gets "open with" / "share to" behavior without an extension. |

### Critical architectural constraint
**Never hold the full archive or its full extracted contents in Wasm linear memory.**
All read/write operations must be chunked and streamed through OPFS. This is a Milestone 1
requirement, not a later optimization.

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

## 4. Granular Phase Breakdown (Smaller Chunks)

### Phase 0: Project & Infrastructure Foundation
- [x] **0.1 PWA Shell Scaffolding**
  - [x] Configure Vite PWA plugin & Web App Manifest (`manifest.webmanifest`).
  - [x] Implement offline Service Worker strategy for app shell assets.
  - [x] Add timeDoco design tokens & basic UI layout frame in React.
- [ ] **0.2 Wasm Build Pipeline Setup**
  - [ ] Configure Emscripten build script for `libarchive.wasm` targeting Wasm32.
  - [ ] Implement Emscripten glue module wrapper exporting modular `createLibarchiveModule`.
  - [ ] Verify basic archive read capability against a RAR5 test fixture.
- [x] **0.3 OPFS Working Storage Layer**
  - [x] Create OPFS session file manager (`src/lib/storage/opfs.ts`).
  - [x] Implement 4MB chunked stream reader/writer utilities for OPFS files.
  - [x] Implement session directory cleanup lifecycle (`beforeunload`, `visibilitychange`, 24h purge routine).
- [x] **0.4 Web Worker Pool Architecture**
  - [x] Create Worker Pool Coordinator (`src/lib/workers/pool.ts`) with `navigator.hardwareConcurrency` auto-scaling.
  - [x] Establish typed RPC `postMessage` protocol between main thread and workers.
  - [x] Implement Worker error isolation & try/catch bounds to prevent main thread crashes.

---

### Milestone 1 — Core MVP & Security Shields

#### 1.1 Universal Transcoder
- [ ] **1.1.1 Input Processing & Volume Handling**
  - [x] Implement drag-and-drop & File System Access API file loader.
  - [x] Implement multi-volume RAR (`.part1.rar`, `.part2.rar`) detection & volume aggregation prompt.
- [ ] **1.1.2 Libarchive Streaming Decompressor**
  - [ ] Implement 4MB chunked Wasm input stream feeder into libarchive reader.
  - [ ] Extract file entries iteratively to OPFS scratch storage without staging full files in linear memory.
- [ ] **1.1.3 Streaming Repacker & AES Encryption**
  - [ ] Integrate `fflate` streaming ZIP writer in a dedicated background worker.
  - [ ] Add optional AES-256 encryption layer for repack output stream.
- [ ] **1.1.4 Transcoder Acceptance & Memory Verification**
  - [ ] Verify 2GB test archive round-trip with <200MB peak JS heap.
  - [ ] Validate output ZIP compatibility with native OS archive tools (macOS, Windows Explorer, 7-Zip).

#### 1.2 Zip Bomb Defense
- [x] **1.2.1 Pre-Flight Header Ratio Calculator**
  - [x] Parse archive central directory / header headers before decompressing file contents.
  - [x] Calculate global expansion ratio `sum(uncompressed_size) / sum(compressed_size)`.
- [x] **1.2.2 Threshold Trigger & User Intercept UI**
  - [x] Implement >100:1 ratio warning UI block requiring explicit user override.
  - [x] Enable single-entry sequential extraction fallback when override is granted.
- [x] **1.2.3 Nested Archive Matryoshka Scanner**
  - [x] Detect nested archive formats via magic-byte inspection on inner entry headers.
  - [x] Recurse expansion ratio check into nested archive entries before extraction.
- [x] **1.2.4 Worker Memory Circuit Breaker**
  - [x] Track cumulative bytes written to OPFS during decompression inside worker state.
  - [x] Hard-abort extraction job & discard partial OPFS output if configurable threshold (10GB) is reached.
- [x] **1.2.5 Synthetic Bomb Test Suite**
  - [x] Add automated test fixture for synthetic zip bombs (e.g. 42.zip) verifying pre-flight intercept.

#### 1.3 Zip Slip Neutralizer
- [x] **1.3.1 Path Sanitizer Core**
  - [x] Implement unified `sanitizePath(path: string)` function stripping leading slashes and drive letters (`C:\`).
  - [x] Resolve relative `..` directory traversal segments.
- [x] **1.3.2 Containment Enforcement & Symlink Validator**
  - [x] Reject entries resolving outside extraction root directory and log blocked entry counts.
  - [x] Validate TAR symlink targets to block symlinks resolving outside extraction root.
- [x] **1.3.3 Sanitizer Unit Test Suite**
  - [x] Create unit tests covering 15+ malicious path vectors (`../`, absolute paths, mixed slashes, symlinks).

#### 1.4 OS Junk Stripper
- [x] **1.4.1 Junk Path Matcher Module**
  - [x] Implement pattern matcher for OS clutter: `__MACOSX/`, `.DS_Store`, `Thumbs.db`, `desktop.ini`.
- [x] **1.4.2 Stage Integrations & UI Toggle**
  - [x] Integrate filter into archive listing stage (hiding junk entries from UI tree).
  - [x] Integrate filter into extraction/repack pipeline with user toggle (default ON).

---

### Milestone 2 — Inspection, Safety & File Polish

#### 2.1 Zero-Extract Quick Look
- [ ] **2.1.1 Entry Seek & Byte Streamer**
  - [ ] Implement targeted byte-range extraction for single entries directly from Wasm decompressor.
- [x] **2.1.2 Text, Markdown, CSV, and Image Renderers**
  - [x] Build plain text, Markdown previewer, and CSV table view component.
  - [x] Build image preview modal (`png`, `jpg`, `gif`, `webp`).
- [x] **2.1.3 Syntax Highlighting Component**
  - [x] Integrate lightweight syntax highlighter (Prism/Shiki lazy-loaded) for source files (`.py`, `.js`, `.ts`, `.go`, `.rs`, `.java`).
- [ ] **2.1.4 Wasm PDF Renderer Integration**
  - [ ] Integrate pdf.js / Wasm PDF renderer for in-browser PDF previews.

#### 2.2 Selective Extraction
- [x] **2.2.1 Virtualized File Tree Component**
  - [x] Build high-performance virtualized file tree UI handling 10,000+ archive entries.
- [x] **2.2.2 Granular Selection State & Download Trigger**
  - [x] Add checkbox selection state at file and directory levels.
  - [x] Connect "Extract Selected" action to stream chosen files directly to OPFS / browser download.

#### 2.3 Mojibake Repair
- [x] **2.3.1 Character Set Detector Integration**
  - [x] Integrate character encoding detector (Shift-JIS, GBK, Windows-1252 detection).
- [x] **2.3.2 Filename & Text Normalization**
  - [x] Implement UTF-8 string conversion for detected non-UTF8 filename byte sequences.
- [x] **2.3.3 Before/After Diff Confirmation UI**
  - [x] Build interactive diff UI displaying original vs repaired filenames before user confirmation.

#### 2.4 Spoofer Shield
- [x] **2.4.1 Bidi & RTLO Character Detector**
  - [x] Flag filenames containing Right-to-Left Override (`\u202E`) and Unicode bidi control characters.
- [x] **2.4.2 Magic-Byte Format Validator**
  - [x] Implement file header magic-byte sniffing (first 512 bytes) and compare against extension claims.
  - [x] Flag mismatch anomalies (e.g. executable disguised as PDF).
- [x] **2.4.3 Disguised Executable & Risky Extension Scanner**
  - [x] Detect double extensions (`invoice.pdf.exe`).
  - [x] Flag high-risk social engineering file extensions (`.lnk`, `.hta`, `.scr`, `.exe`, `.bat`).
- [x] **2.4.4 Safety Summary Panel**
  - [x] Create consolidated "Safety Inspection" UI panel summarizing all detected security warnings.

---

### Milestone 3 — Batch Workflows & Integrity

#### 3.1 Pre-Flight Leak Scanner
- [x] **3.1.1 Filename Credential Pattern Matching**
  - [x] Scan entry names against sensitive patterns (`.env`, `.pem`, `.key`, `id_rsa`, `.git/`, `credentials*`, `.aws/`).
- [x] **3.1.2 Content Shannon Entropy Analyzer**
  - [x] Calculate Shannon entropy on string tokens extracted from text files.
  - [x] Flag high-entropy tokens exceeding threshold (entropy > 4.0 over ≥20 chars).
- [x] **3.1.3 Secret Token Pattern Matcher**
  - [x] Add regex matchers for AWS keys (`AKIA...`), SSH private keys (`-----BEGIN...KEY-----`), JWTs, API tokens.
- [x] **3.1.4 Purge Confirmation & Sanitized Repack**
  - [x] Build confirmation modal listing detected secret files/tokens.
  - [x] Provide one-click purge action removing flagged secrets from repack output stream.

#### 3.2 Batch Consolidator
- [ ] **3.2.1 Multi-Archive Queue Manager**
  - [ ] Support multi-file drag-and-drop batch queueing.
- [ ] **3.2.2 Isolated Batch Extraction ("Unzip All")**
  - [ ] Extract multiple archives into isolated, collision-safe OPFS folders.
- [ ] **3.2.3 Content-Deduplicated Master Repack ("Merge All")**
  - [ ] Calculate SHA-256 hashes of entry byte streams.
  - [ ] Build master ZIP writer skipping duplicate file byte streams regardless of original path names.

#### 3.3 Archive Diff
- [ ] **3.3.1 Dual-Pane Tree Comparison Engine**
  - [ ] Compare two archives side-by-side to detect added, removed, modified, and identical files.
- [ ] **3.3.2 Two-Column Line-Level Text Diff**
  - [ ] Implement client-side LCS text diffing algorithm for modified code/text files.
  - [ ] Render two-column highlighted text diff view.

#### 3.4 Exportable Audit Report
- [x] **3.4.1 Audit Summary Data Schema**
  - [x] Define versioned JSON schema capturing file counts, safety flags, entropy findings, SHA-256 manifests.
- [x] **3.4.2 JSON & Human-Readable PDF Exporters**
  - [x] Add machine-readable `.json` audit report exporter.
  - [x] Add styled printable `.pdf` audit report generator.

---

### Milestone 4 — PWA-Native Differentiation

#### 4.1 File Handling API Registration
- [x] **4.1.1 Manifest Registration**
  - [x] Register file handlers in `manifest.webmanifest` for `.zip`, `.rar`, `.7z`, `.tar.gz`.
- [x] **4.1.2 Chromium OS Integration Handler**
  - [x] Wire `launchQueue.setConsumer()` in `main.tsx` to handle direct OS file double-click launches.

#### 4.2 Web Share Target API
- [x] **4.2.1 Share Target Manifest Configuration**
  - [x] Configure `share_target` field in web manifest for receiving shared files.
- [x] **4.2.2 Service Worker Share Payload Handler**
  - [x] Add Service Worker `fetch` intercept for incoming share POST data and pass file handles to UI.

#### 4.3 Thumbnail Grid & Comic Reader View
- [ ] **4.3.1 Lazy Canvas Thumbnail Generator**
  - [ ] Detect image-heavy archives (>50% image entries) and render virtualized thumbnail grid.
  - [ ] Generate low-res image thumbnails on demand using HTML Canvas downscaling.
- [ ] **4.3.2 Comic Archive Reader (CBR/CBZ)**
  - [ ] Recognize CBR/CBZ extensions and provide paginated reader interface.

#### 4.4 Full-Text Search Inside Archive
- [ ] **4.4.1 Client-Side Inverted Text Indexer**
  - [ ] Index text content of files (<5MB) into an in-memory inverted index without disk extraction.
- [ ] **4.4.2 Instant Search UI & Quick Look Jump**
  - [ ] Provide instant search input returning matching entries and line occurrences in <500ms.
  - [ ] Connect search results directly to Quick Look preview.

---

## 5. Cross-Cutting Engineering Requirements

- [ ] **Dedicated Security Test Suite:** CI automated tests for Zip Slip, Zip Bomb, Magic Bytes, Bidi/RTLO, and Secret Scan matchers.
- [ ] **Strict Zero-Network CI Enforcer:** CI test verifying zero network calls (`fetch`/`XHR`) fire during runtime operation.
- [ ] **Worker Error Isolation Wrapper:** Ensure all worker task handlers catch errors and report structured messages without main thread crashes.
- [ ] **OPFS Garbage Collector:** Automated cleanup routine on session end and 24h stale directory purge on app boot.

---

## 6. Granular Phased Execution Order

1. **Phase 0.1 – 0.4:** Infrastructure setup (PWA shell, Emscripten Wasm build, OPFS storage, Web Worker pool).
2. **Phase 1.3:** Zip Slip sanitizer module & test suite (critical security primitive built first).
3. **Phase 1.2:** Zip Bomb pre-flight ratio scanner & memory circuit breaker.
4. **Phase 1.1:** Universal Transcoder (libarchive streaming reader + fflate streaming writer + AES layer).
5. **Phase 1.4:** OS Junk Stripper path matcher & filter integration.
6. **Phase 2.4:** Spoofer Shield (RTLO detection, magic-byte sniffing, disguised executable detection).
7. **Phase 3.1:** Pre-flight Leak Scanner (filename credentials, Shannon entropy analyzer, secret regex patterns).
8. **Phase 2.1 – 2.3:** Quick Look renderers, selective extraction UI tree, Mojibake repair tool.
9. **Phase 3.2 – 3.4:** Batch Consolidator, Archive Diff tool, Audit Report exporter.
10. **Phase 4.1 – 4.4:** File Handling API, Web Share Target, Thumbnail/Comic view, Full-Text search.
