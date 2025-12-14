# 01. User Stories & Functional Requirements

## User Personas

### 1. The Data Hoarder (Alex)
-   **Profile:** Has 20TB of movies on a NAS and external hard drives. Organized with tools like Radarr, but strict about filenames.
-   **Needs:** Fast scanning, handling of 10,000+ items, perfect metadata matching, 4K HDR playback support.
-   **Pain Point:** VLC is ugly; Plex requires a running server.

### 2. The Casual Streamer (Sam)
-   **Profile:** Downloads a few movies to a laptop for a flight.
-   **Needs:** Easy "Drag and Drop", simple interface, battery efficiency, offline support.
-   **Pain Point:** Most players don't download subtitles automatically.

### 3. The Anime Fan (Jordan)
-   **Profile:** Watches shows with complex subtitles (.ASS/.SSA) and dual audio tracks.
-   **Needs:** Accurate separate subtitle rendering, Season/OVA sorting.

---

## Functional Requirements (Detailed)

### FR1: Library Management
*   **FR1.1:** App must accept multiple "Sources" (Local Folder, FTP Account, SMB Share).
*   **FR1.2:** App must recursively scan sources for video extensions (.mkv, .mp4, .avi, .mov, .iso).
*   **FR1.3:** App must parse messy filenames (e.g., `Deadpool.and.Wolverine.2024.2160p.DV.HDR.SCENE-GROUP.mkv`) into `{Title: "Deadpool & Wolverine", Year: 2024}`.
*   **FR1.4:** App must fetch metadata (Poster, Backdrop, Cast, Plot, Rating) from TMDB.
*   **FR1.5:** App must aggregate identical content from different sources into a single "Item" (Version merging).
*   **FR1.6:** **Series Grouping:** TV Episodes must **NEVER** appear individually in the main grid. They must be grouped under a single "Series" poster. Clicking the series reveals the episodes.

### FR2: Video Playback
*   **FR2.1:** Core Player must support HTML5 formats natively (Direct Play).
*   **FR2.2:** App must transcode or use native wrappers (Electron/Capacitor) for non-web formats (MKV, HEVC).
*   **FR2.3:** Player must support "Soft Subtitles" (switchable tracks during playback).
*   **FR2.4:** Player must support Audio Track switching (e.g., Eng 5.1 -> Jap Stereo).
*   **FR2.5:** Playback state (Time, Audio Track, Sub Track) must be saved every 10 seconds.

### FR3: Networking & Connectivity
*   **FR3.1:** **FTP Client:** Support Plain FTP, FTP over TLS (FTPS). Robust retry optimization.
*   **FR3.2:** **SMB Client:** Support SMBv2/SMBv3 authentication (Guest & User).
*   **FR3.3:** **Stream Proxy:** Create a localhost HTTP server to pipe remote bytes to the video player component (Range Request support is mandatory).

### FR4: Advanced Discovery
*   **FR4.1:** **Deep Search:** Search must query Titles, Cast names, Directors, and Genres using fuzzy matching.
*   **FR4.2:** **Filter Logic:** Users must be able to combine filters (e.g., "Action" + "1990s" + "Unwatched").
*   **FR4.3:** **Pivot Navigation:** Clicking any metadata (Actor, Director, Studio) must pivot the view to show related items in the library.

---

## Detailed User Stories

### Story 1: The First Launch
**As a** new user,
**I want** to be guided through adding my first folder,
**So that** I don't stare at an empty screen.
-   *Acceptance Criteria:*
    -   Onboarding Overlay explains "Add a Source".
    -   Clicking "Add Source" opens native file picker.
    -   Selecting a folder immediately triggers a visual "Scanner" progress bar.
    -   First items appear in grid as soon as they are fetched (Lazy Loading).

### Story 2: The "Resume"
**As a** user watching a movie,
**I want** to close the app and reopen it later to exact same spot,
**So that** I don't lose progress.
-   *Acceptance Criteria:*
    -   Home screen shows "Continue Watching" shelf at the top.
    -   Card shows progress bar (e.g., 45% filled).
    -   Clicking card immediately resumes video (no "Start/Resume" dialog, just resume).

### Story 3: The Bad Match
**As a** user with an obscure movie,
**I want** to manually fix incorrect metadata,
**So that** my library looks perfect.
-   *Acceptance Criteria:*
    -   Right-click (or long press) on an item -> "Edit Metadata".
    -   Opens search dialog pre-filled with parsed title.
    -   User selects correct match from list.
    -   Item instantly updates poster/text.

### Story 4: The Network Stream
**As a** user with a NAS,
**I want** to stream a 4GB file over WiFi without downloading it first,
**So that** I save storage space on my laptop.
-   *Acceptance Criteria:*
    -   Video starts within <5 seconds.
    -   Seeking (jumping to 1:00:00) takes <2 seconds buffering.
    -   No "download complete" notification; it's pure streaming.
