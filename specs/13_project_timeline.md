# 13. Project Timeline & Progress Tracker

This document tracks the high-level progress of the Scooty project against the weekly goals.

## Legend
- [ ] Not Started
- [~] In Progress
- [x] Completed
- [!] Blocked

---

## Week 1: Foundation & Core Library (Phases 0 & 1)
**Dates:** TBD
**Goal:** A working app that can scan local folders and show a beautiful grid of movies.

### Day 1-2: Setup & Architecture
- [x] **1-01** Init Project (Vite + Electron + Tailwind)
- [x] **1-02** Install HeroUI & Configure Theme
- [x] **1-03** Create Main Layout (Sidebar + Glassmorphism)
- [x] **1-04** Setup React Router v7

### Day 3-4: The Brain (Metadata)
- [x] **1-08** Implement Filename Regex Service (Movie/TV)
- [x] **1-09** Implement TMDB Service
- [x] **1-05** Setup Zustand Library Store
- [x] **1-06** IPC: File Picker Dialog

### Day 5-7: The Library UI
- [x] **1-07** IPC: Fast-Glob Scanner
- [x] **1-10** Metadata Orchestrator (Scan -> Match -> Save)
- [x] **1-11** Build `MovieCard` Component
- [x] **1-12** Build `MediaGrid` View
- [x] **1-13** Settings Page (Manage Sources)

---

## Week 2: The Player Experience (Phase 2)
**Dates:** TBD
**Goal:** Seamless playback of local video files with custom controls.

### Day 8-10: Player Engine
- [x] **2-01** Route `/play/:id` & Layout
- [x] **2-02** Video Player Component (Wrapper)
- [x] **2-03** Electron `file://` Protocol Support

### Day 11-12: Controls & HUD
- [x] **2-04** Custom Controls Overlay (Play/Pause/Seek)
- [x] **2-05** Scrubber Bar & Buffering State
- [x] **2-06** Auto-hide Logic (Idle detection)
- [x] **2-07** Volume & Audio Track Selector

### Day 13-14: Polish & History
- [ ] **2-10** Resume Playback Logic
- [x] **2-11** Details View (Hero + Cast + Meta)
- [ ] **QA-01** Manual Test: Playback of 4K MKV

---

## Week 3: Advanced Networking (Phase 3)
**Dates:** TBD
**Goal:** Streaming from FTP/SMB sources without full downloads.

### Day 15-17: The Proxy
- [x] **3-01** NodeJS FTP Service (Main Process)
- [x] **3-02** IPC Bridge for FTP Connect
- [x] **3-03** Stream Proxy Server (express)
- [x] **3-04** Range Header Request Handling

### Day 18-21: Integration
- [x] **3-05** Frontend: Add FTP Source UI
- [x] **3-07** URL Resolver (FTP -> Localhost Proxy)
- [ ] **QA-04** Test: Seek performance on FTP Stream
- [x] **3-10** TV Show Grouping Logic (Seasons/Episodes)

---

## Week 4: Mobile & Release
**Dates:** TBD
**Goal:** Android/iOS Build and Final Polish.

### Day 22-25: Mobile
- [x] **08-01** Capacitor Audit & Config
- [ ] **3-09** Native Player Plugin Integration
- [ ] **08-03** Touch Gesture Support

### Day 26-28: Shipping
- [ ] **12-01** Full QA Sweep
- [ ] **CI-01** Build Electron Binaries (`.dmg`, `.exe`)
- [ ] **CI-02** Build Android APK
