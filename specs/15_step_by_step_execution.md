# 15. Master Execution Order (Dependency Graph)

This document reorganizes all tasks into a strict **Linear Execution Path**. Run these steps in order. Dependencies are explicitly noted.

## Phase 1: The "Skeleton" (Foundation)
*Objective: A running Electron app that renders a styled UI.*

1.  **[1-01] Project Initialization** ✅
    -   *Action:* Scaffold Vite + React + Electron.
    -   *Outcome:* `npm run electron:dev` opens a Hello World window.
2.  **[1-02] Design Sytem Setup** ✅
    -   *Action:* Install HeroUI, Tailwind Config, Fonts.
    -   *Outcome:* UI components look "Premium" (Dark mode, Orange accents).
3.  **[1-03] Shell Architecture** ✅
    -   *Action:* Create Sidebar, Topbar, Main Content Area.
    -   *Outcome:* Navigation between dummy pages works.
4.  **[1-04] Navigation & Routing** ✅
    -   *Action:* Setup React Router v7 with paths `/`, `/library`, `/play`.
    -   *Outcome:* Url changes update the view.

## Phase 2: The "Brain" (Data Layer)
*Objective: Turn files into metadata.*

5.  **[1-05] State Management** ✅
    -   *Action:* Setup `zustand` stores (`useLibraryStore`, `useSettingsStore`).
    -   *Outcome:* State persists to localStorage/file.
6.  **[1-08] Regex Engine** ✅
    -   *Action:* Implement parser for `Movie.2020.mkv` and `Show.S01E01.mkv`.
    -   *Outcome:* Unit tests pass for 50+ filename variations.
    -   *Dependency:* None.
7.  **[1-09] TMDB Client** ✅
    -   *Action:* Implement `TMDB.search()` and `TMDB.getDetails()`.
    -   *Outcome:* API returns correct JSON for "Iron Man".
8.  **[1-07] File Scanner (Electron)** ✅
    -   *Action:* Implement `fast-glob` or `fs.readdir` recursive scan in Main process.
    -   *Outcome:* Returns array of strings `['/Users/me/Movie.mkv']`.

## Phase 3: The "Library" (First Feature)
*Objective: Display the user's content.*

9.  **[1-10] Metadata Orchestrator** ✅
    -   *Action:* Chain: `Scan` -> `Regex` -> `TMDB` -> `Store.addItem`.
    -   *Outcome:* Console logs full metadata objects for a test folder.
    -   *Dependency:* [1-05], [1-08], [1-09], [1-07].
10. **[1-11] UI Components: Cards** ✅
    -   *Action:* Build `MovieCard` with Poster & Hover animation.
    -   *Outcome:* Visual card component.
11. **[1-12] Library Grid** ✅
    -   *Action:* Connect Store to Grid View using `MovieCard`.
    -   *Outcome:* User sees their movies in a grid.
    -   *Addendum:* **Details Page** implemented with Episode support.

## Phase 4: The "Theater" (Playback)
*Objective: Play video files.*

12. **[2-01] Player Route** ✅
    -   *Action:* Create immersive black page at `/play/:id`.
    -   *Outcome:* Empty black screen.
13. **[2-03] Protocol Handler** ✅
    -   *Action:* Ensure Electron can read `file://` / `atom://` paths.
    -   *Outcome:* `<video src="file:///...">` works.
14. **[2-02] Video Engine** ✅
    -   *Action:* Implement `<video>` or `react-player` wrapper.
    -   *Outcome:* Video plays/pauses.
15. **[2-04] HUD & Controls** ✅
    -   *Action:* Overlay Play/Pause, Scrubber, Volume.
    -   *Outcome:* Interactive custom UI over video.

## Phase 5: The "Connector" (Network)
*Objective: Stream without downloading.*

16. **[3-01] FTP Backend** ✅
    -   *Action:* Implement Node.js FTP client in Main process.
    -   *Outcome:* Can list files on remote server.
17. **[3-03] Stream Proxy** ✅
    -   *Action:* Express server `localhost:port/stream` with Range support.
    -   *Outcome:* `curl -r 0-100 http://...` returns bytes.
    -   *Dependency:* [3-01].
18. **[3-07] Stream Integration** ✅
    -   *Action:* Connect Library item -> Proxy URL -> Player.
    -   *Outcome:* FTP file plays in HTML5 video tag.

## Phase 6: The "Mobile" (Expansion)
*Objective: Handheld experience.*

19. **[08-01] Capacitor Init** ✅
    -   *Action:* Add Android/iOS platforms.
    -   *Outcome:* App runs in simulator.
20.- **[Pending]** [2-10] Resume Playback Logic (Completed; Handles MKV transcoding now)
- **[Pending]** [QA-01] Manual Test: Playback of 4K MKV (Ready for test)
    -   *Outcome:* MKV plays on iPhone.
