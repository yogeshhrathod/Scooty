# 02. Technical Stack & Libraries

## Core Framework
-   **Runtime:** Node.js (Latest LTS)
-   **Bundler:** Vite v6+ (Fastest HMR)
-   **Framework:** React 19 (Latest)
-   **Language:** JavaScript (ESNext) *[User workspace is JS, keeping JS]*

## Application Wrappers
-   **Desktop:** Electron v33+
    -   *Why:* Full OS access, Native Node modules for networking/filesystem.
-   **Mobile:** Capacitor v6+
    -   *Why:* Single codebase for Web/iOS/Android. Easier than React Native for "Web-First" UI approach.

## UI & Design System (The "Premium" Look)
**Constraint:** No shadcn/ui. Must support Tailwind.
**Selection: HeroUI (formerly NextUI) v2**
-   **Docs:** `https://heroui.com/` (or `nextui.org` legacy)
-   **Why:**
    -   Built on TailwindCSS (fully customizable via `tailwind.config.js`).
    -   Native "Glassmorphism" support (blur effects).
    -   Premium animations built-in (framer-motion based).
    -   Accessibile (Aria) primitives.
    -   Dark mode first design.

### Supporting UI Libraries
-   **Styling:** `tailwindcss` v3.4 (Standard, proven).
-   **Icons:** `lucide-react` (Clean, modern, thin strokes).
-   **Animations:** `framer-motion` (Complex layout transitions, shared element transitions for "Poster to Details" hero animation).
-   **Virtualization:** `react-virtuoso` (Better performance than react-window for variable grids).

## State Management & Data
-   **Global State:** `zustand` (Minimalist, Redux-killer, easy to persist).
    -   *Middleware:* `persist` (to localStorage/IndexedDB).
-   **Data Fetching:** `axios` (Better than fetch for progress events on streams).
-   **Search Engine:** `fuse.js` (Client-side fuzzy search for library).
-   **Database (Desktop):** `lowdb` (JSON file db) OR `better-sqlite3` (if perf needed for >10k items). *Start with lowdb for simplicity.*

## Backend & Services (Node/Electron)
-   **FTP Client:** `basic-ftp` (Promise based, robust).
-   **SMB Client:** `@marsaud/smb2` (Modern SMB implementation).
-   **WebServer:** `express` (To run the local Stream Proxy).
-   **Port Finding:** `portfinder` (To safely bind the proxy).
-   **File Scanning:** `fast-glob` (Extremely fast recursive lookup).

## Development Tools
-   **Linting:** `eslint`, `prettier`.
-   **Testing:** `vitest` (Unit), `playwright` (E2E).
-   **Build:** `electron-builder` (For .dmg, .exe, .AppImage).

## Version Locking
To ensure stability, we will use exact versions for critical packages in `package.json`.
```json
"dependencies": {
  "@heroui/react": "^2.2.0",
  "framer-motion": "^11.0.0",
  "electron": "^33.0.0",
  "basic-ftp": "^5.0.0"
}
```
