# Reliability & Security Roadmap

This document outlines the prioritized tasks required to ensure **Scooty** is a secure, stable, and reliable product ready for shipping.

## 🚨 Phase 1: Critical Security & Core Stability (Immediate )
*These issues pose severe risks to user security or render the app unusable under normal conditions.*

- [x] **Secure Electron Configuration** `HIGH PRIORITY`
    - **Current State**: `nodeIntegration: true`, `contextIsolation: false`, `webSecurity: false`. This allows any executed script (including from potentially malicious filenames or hijacked streams) to access the user's OS.
    - **Task**: 
        - [x] Enable `contextIsolation: true`.
        - [x] Disable `nodeIntegration`.
        - [x] Create a `preload.js` to expose only safe, necessary APIs via `contextBridge`.
        - [x] Enable `webSecurity`.

- [x] **Fix "App Freeze" on Library Scan** `HIGH PRIORITY`
    - **Current State**: `scanDir` refers to synchronous FS operations on the main thread. Scanning a large drive freezes the entire UI.
    - **Task**: 
        - [x] Rewrite `scanDir` to use asynchronous `fs.promises`.
        - [x] (Optional) Move scanning logic to a Worker Thread or separate Child Process to keep the UI silky smooth.

- [x] **Secure FTP Connections**
    - **Current State**: `rejectUnauthorized: false` is hardcoded, disabling SSL security.
    - **Task**: 
        - [x] Default to `rejectUnauthorized: true`.
        - [x] Add a UI toggle for users to explicitly "Allow Insecure Certificates" if they need it for home setups, with a warning.

## 💾 Phase 2: Data Integrity & Scalability (Must-Have for Beta)
*These issues will cause the app to crash or lose data as soon as real users try it with real-sized libraries.*

- [x] **Migrate Storage Strategy**
    - **Current State**: Using `localStorage` via Zustand persist. Limit is ~5MB.
    - **Impact**: Fails silently or crashes with ~500+ movies/shows.
    - **Task**: Migrate to `IndexedDB` (using `idb-keyval` or `localforage` for Zustand) or a robust Electron store (e.g., `electron-store`).

- [x] **Robust Metadata Fetching (Rate Limiting)**
    - **Current State**: Bursts concurrent requests to TMDB.
    - **Impact**: API keys get banned or requests fail (429 Too Many Requests), resulting in "Missing Metadata".
    - **Task**: Implement a queue system (e.g., `p-queue`) with a max rate (e.g., 4 requests/second) and retry logic.

## 🛡️ Phase 3: Error Handling & Performance (Polish)
*These issues differentiate a "hobby project" from a "product".*

- [x] **Global Error Boundaries**
    - **Current State**: Uncaught component errors crash the whole app (White Screen).
    - **Task**: Wrap key areas (Main Router, Video Player) in React Error Boundaries to show friendly "Something went wrong" UI.

- [x] **Fix Backend Memory/Disk Leaks**
    - **Current State**: StreamProxy caches extracted subtitles indefinitely.
    - **Task**: Implement cleanup logic to delete temp VTT files when the player closes or on app exit.

- [x] **Refactor Video Player**
    - **Current State**: Monolithic 36kb+ component.
    - **Task**: Break down `VideoPlayer.jsx` into smaller, testable sub-components (`Controls`, `Overlay`, `SubtitleRenderer`).

## 🚀 Phase 4: Production Readiness (New Findings - Dec 2024)
*These issues were identified during code review and need to be addressed before public release.*

### High Priority

- [x] **Multi-FTP Source Selection** `HIGH PRIORITY` ✅ COMPLETED
    - **Current State**: `StreamProxy.js` always uses `allConfigs[0]`, ignoring which FTP source the file actually belongs to.
    - **Impact**: Files from secondary FTP sources may fail to play or use wrong credentials.
    - **Task**: 
        - [x] Pass `sourceId` from frontend when requesting streams.
        - [x] Match file's `sourceId` to correct FTP config in StreamProxy.
        - [x] Added `getConfigById()` to FtpService for ID-based lookup.
        - [x] Updated `createStreamClient()` to support sourceId parameter.
    - **Location**: `electron/StreamProxy.js`, `electron/FtpService.js`, `src/pages/Player.jsx`

### Medium Priority

- [ ] **FTP Directory Scanning Efficiency**
    - **Current State**: Uses sequential `cd()` + `list()` for each directory.
    - **Impact**: Scanning large FTP libraries with deep nesting is slow.
    - **Task**: 
        - [ ] Implement parallel directory scanning with concurrency limit.
        - [ ] Add progress reporting during scan.
    - **Location**: `electron/FtpService.js` (line 85-123)

- [x] **Local Scan Depth Limit** ✅ COMPLETED
    - **Current State**: `scanDir` in `main.js` has no recursion depth limit.
    - **Impact**: Extremely deep directory structures could cause stack overflow or long freeze times.
    - **Task**: 
        - [x] Add `maxDepth` parameter (default 10) to local directory scanning.
    - **Location**: `main.js` (line 131)

- [ ] **FTP Connection Pooling**
    - **Current State**: Each stream creates a new FTP client via `createStreamClient()`.
    - **Impact**: Multiple simultaneous requests create multiple connections, hitting server limits.
    - **Task**: 
        - [ ] Implement connection pool with max 3-5 concurrent connections.
        - [ ] Reuse connections for sequential requests.
    - **Location**: `electron/FtpService.js`

- [x] **Graceful FFmpeg Process Cleanup** ✅ COMPLETED
    - **Current State**: Uses `SIGKILL` immediately on client disconnect.
    - **Impact**: No graceful cleanup, potential zombie processes.
    - **Task**: 
        - [x] Use `SIGTERM` first, then `SIGKILL` after 2s timeout.
        - [x] Track active FFmpeg processes for cleanup on app exit.
        - [x] Added `killCommand()` and `trackCommand()` helper methods.
    - **Location**: `electron/StreamProxy.js`

- [x] **VideoPlayer Memory Optimization** ✅ PARTIALLY COMPLETED
    - **Current State**: 660-line component with many refs and frequent state updates.
    - **Impact**: Potential memory leaks on rapid navigation.
    - **Task**: 
        - [ ] Audit all `useEffect` hooks for proper cleanup.
        - [x] Debounce `onProgress` callbacks (3s interval).
        - [ ] Memoize expensive calculations.
    - **Location**: `src/components/VideoPlayer/VideoPlayer.jsx`

### Low Priority

- [ ] **Subtitle Cache Lifecycle Management**
    - **Current State**: Subtitle cache only cleans up on app exit.
    - **Impact**: Long sessions accumulate temp files on disk.
    - **Task**: 
        - [ ] Clear cache entries when navigating away from player.
        - [ ] Implement LRU eviction (max 10 cached subtitles).
    - **Location**: `electron/StreamProxy.js` (line 74-82)

- [x] **Consistent FTP Config Access** ✅ COMPLETED
    - **Current State**: `MediaInfoService.extractSubtitle()` uses `.config` (legacy) while `getMediaInfo()` uses `.getAllConfigs()`.
    - **Impact**: Inconsistent behavior, potential stale config usage.
    - **Task**: 
        - [x] Standardize all FTP config access to use `getAllConfigs()`.
    - **Location**: `electron/MediaInfoService.js` (line 165)

- [ ] **FTP Stream Retry Logic**
    - **Current State**: No automatic reconnection if FTP drops mid-stream.
    - **Impact**: Users must manually retry on network hiccups.
    - **Task**: 
        - [ ] Implement exponential backoff retry (3 attempts).
        - [ ] Show "Reconnecting..." UI state.
    - **Location**: `electron/StreamProxy.js`, `electron/FtpService.js`

---

## 📋 Testing Checklist (Before Release)

| Test Case | Status |
|-----------|--------|
| Play local MP4 file | ⬜ |
| Play local MKV file (transcoding) | ⬜ |
| Play FTP MP4 file (direct stream) | ⬜ |
| Play FTP MKV file (transcoding) | ⬜ |
| Seek in transcoded stream | ⬜ |
| Switch audio tracks mid-playback | ⬜ |
| Enable/disable subtitles | ⬜ |
| Library scan with 500+ files | ⬜ |
| Multiple FTP sources configured | ⬜ |
| App memory after 10 video plays | ⬜ |
| Startup time < 2 seconds | ⬜ |
