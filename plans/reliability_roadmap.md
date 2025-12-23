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
