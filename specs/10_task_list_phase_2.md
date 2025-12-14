# 10. Task Breakdown: Phase 2 (The Player)

**Goal:** Enable robust video playback with UI controls.

| ID | Task Name | Description | Priority |
| :--- | :--- | :--- | :--- |
| **2-01** | **Player Route** | Create `/play/:id` page. Fullscreen, black background. | P0 |
| **2-02** | **Video Component** | wrapper to `<video>` or `react-player`. Handle props `src`, `poster`. | P0 |
| **2-03** | **Local File Protocol** | Ensure `file://` protocol works in Electron for local media. | P1 |
| **2-04** | **Custom Controls UI** | Overlay div. Play/Pause toggle. Bottom gradient. | P1 |
| **2-05** | **Scrubber/Slider** | Progress bar component. Drag to seek. Buffer indication. | P1 |
| **2-06** | **Auto-Hide Logic** | `mousemove` listener. Hide controls after 3000ms idle. | P2 |
| **2-07** | **Volume/Mute** | Vertical or Horizontal volume slider. Mute toggle. | P2 |
| **2-08** | **Duration Formatter** | Utility `formatTime(sec)` -> `01:30:25`. | P3 |
| **2-09** | **Keyboard Shortcuts** | Space, Arrow Keys, F (Fullscreen), Esc. | P2 |
| **2-10** | **Resume Logic** | On Mount: `video.currentTime = item.resumeTime`. On Unmount: Save time. | P1 |
| **2-11** | **Details Page** | Create "Pre-play" screen. Backdrop, Title, "Play" button. | P1 |
