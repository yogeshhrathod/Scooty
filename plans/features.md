# Scooty Feature Roadmap (Premium)

This document outlines the feature list required for Scooty to compete with or surpass the gold standard for media players on Apple platforms.

## Core Philosophy
**"Play Anything, Look Beautiful, Sync Everywhere."**
The target success is built on three pillars:
1.  **Universal Format Support:** It plays files standard players can't (MKV, AV1, DTS, Dolby).
2.  **Metadata Magic:** It turns a folder of ugly filenames into a Netflix-like catalog.
3.  **Network Freedom:** It streams from anywhere (Cloud, NAS, PC) without a dedicated server component (unlike Plex).

---

## Feature Comparison & Roadmap

### 1. Playback Engine (The "Iron Dome")
Scooty uses a custom playback engine (based on mpv/ffmpeg principles) rather than the native system player to support everything.

| Feature | Competitor | Scooty (Current) | Target Implementation |
| :--- | :--- | :--- | :--- |
| **Containers** | MKV, MP4, AVI, ISO, DVD, BDMV | HTML5 (MP4/WebM) | Integrate **MPV** or **FFmpeg** (via WebAssembly or Electron native binding) to support MKV & AVI. |
| **Codecs** | H.264, H.265 (HEVC), AV1, VP9 | Browser dependent | Add **HEVC & AV1** software/hardware decoding support. |
| **Audio** | Dolby Atmos, DTS-HD, TrueHD, AAC, FLAC | Stereo/AAC | **Audio Passthrough** for receivers and multi-channel support. |
| **HDR** | Dolby Vision, HDR10+ | SDR | Tone mapping for HDR content on SDR screens. |

### 2. Metadata & Organization (The "Brain")
Scooty scans filenames and builds a library *locally*.

| Feature | Competitor | Scooty (Current) | Target Implementation |
| :--- | :--- | :--- | :--- |
| **Movies** | Auto-match via TMDB | Basic Movie Search | Keep current TMDB logic, improve "Year" parsing accuracy. |
| **TV Shows** | Auto-group Seasons/Episodes | **MISSING** | **CRITICAL:** Add regex for `S01E01` / `1x01`. Query TMDB TV endpoints. Group by `SeriesID`. |
| **Smart Groups** | Collections (e.g. "Marvel Universe") | Manual | Auto-fetch "Belongs to Collection" from TMDB. |
| **Adult/Anime** | Supported | Unknown | Add Fanart.tv or AniSearch support for better Anime metadata. |

### 3. Connectivity (The "Reach")
Scooty does not require a server. It connects directly to file sources.

| Feature | Competitor | Scooty (Current) | Target Implementation |
| :--- | :--- | :--- | :--- |
| **Local Files** | iTunes File Sharing / On-device | Local Files | **File Access API** for local folders (Mac/PC). |
| **Network Shares**| SMB, NFS, FTP, WebDAV | **MISSING** | Implement **SMB (v2/v3)** client and **WebDAV** support. |
| **Cloud Svcs** | Google Drive, Dropbox, OneDrive, Mega | **MISSING** | OAuth integrations for direct cloud streaming (no full download). |
| **Media Servers**| Plex, Emby, Jellyfin | **MISSING** | Optional: Connect to Plex/Jellyfin libraries as a client. |

### 4. Subtitles (The "Reader")
| Feature | Competitor | Scooty (Current) | Target Implementation |
| :--- | :--- | :--- | :--- |
| **Formats** | SRT, VTT, SSA/ASS (Anime), PGS (Bluray) | Likely VTT only | Render **ASS/SSA** with styles (essential for Anime). Support embedded MKV subs. |
| **Download** | OpenSubtitles Integration | **MISSING** | Add "Download Subtitles" button using OpenSubtitles API. |
| **Sync** | Adjust offset (+/- secs) | **MISSING** | UI slider to fix out-of-sync audio/subtitles. |

### 5. UI/UX (The "Wow Factor")
Scooty is known for its "Apple-like" premium feel.

-   **Poster Wall:** A clean grid of high-res posters (no text lists).
-   **Backdrops:** Dynamic background blur matching the movie art.
-   **Details Page:** Cast lists, director info, and "Up Next" for TV shows.
-   **Trakt Sync:** 2-way sync with Trakt.tv to track watched history across devices.

---

## Immediate Task List (Priority Order)

### Phase 1: Core Metadata & TV Support (The "Library" Update)
1.  **Refactor `metadata.js`**:
    *   Add regex support for TV Show patterns (`SxxExx`, `Season X`).
    *   Switch to `multi/search` on TMDB or handle TV specifically.
    *   Store `mediaType`: 'movie' | 'tv'.
2.  **TV Details Fetching**:
    *   Fetch Season/Episode specific thumbnails and plot summaries.

### Phase 2: The Player Upgrade (The "Cinema" Update)
3.  **Video Player UI**:
    *   Custom controls (Play/Pause, Seek, Volume) overlaying a cinematic UI.
    *   Subtitle selector menu (if multiple tracks exist).
    *   Audio track selector.

### Phase 3: File System & Networking
4.  **Folder Scanning**:
    *   Instead of single file pick, allow picking a "Root Folder".
    *   Recursively scan folder for video files.
5.  **SMB/Local Network**:
    *   Add a "Connect to Server" screen.

## Suggested Tech Stack Additions
*   **Media Info:** `mediainfo.js` (wasm) to read headers/tracks from MKV/MP4 files in the browser.
*   **Player:** `video.js` or `plyr` for better HTML5 wrapping, or a custom implementation.
*   **Networking:** `browserfs` or node-smb (if Electron main process).

