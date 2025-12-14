# 09. Task Breakdown: Phase 1 (Foundation & Core)

**Goal:** Get the app running, looking good, and scanning 1 local test folder.

| ID | Task Name | Description | Priority |
| :--- | :--- | :--- | :--- |
| **1-01** | **Init Project** | Setup Vite, React, Electron, Tailwind. Clean up boilerplate. | P0 |
| **1-02** | **Install HeroUI** | Install `@heroui/react`. Config `tailwind.config.js` with project colors. | P0 |
| **1-03** | **App Layout Shell** | Create `MainLayout`. Sidebar (left), Content (right). Glassmorphism styles. | P0 |
| **1-04** | **Routing Setup** | Setup React Router v7. Routes: `/`, `/library`, `/settings`, `/play/:id`. | P1 |
| **1-05** | **Zustand Library Store** | Create empty store with `addItem`, `setScanning` actions. | P1 |
| **1-06** | **IPC Handler: File Select** | Main: `dialog.showOpenDialog`. Renderer: `window.scooty.selectFolder()`. | P1 |
| **1-07** | **IPC Handler: Scan** | Main: `fast-glob` implementation. Return file list. | P1 |
| **1-08** | **Filename Regex Service** | logic to parse `Name.2020.mkv` (Movie) and `Show.S01E01.mkv` (TV). Unit tests required. | P1 |
| **1-09** | **TMDB Service** | logic to fetch `search/multi`. API Key config. | P2 |
| **1-10** | **Metadata Orchestrator** | Connect Scan -> Regex -> TMDB -> Store. | P2 |
| **1-11** | **UI: MovieCard** | Create component. Poster image, hover effect, title truncation. | P2 |
| **1-12** | **UI: Grid View** | Responsive grid to display store items. | P2 |
| **1-13** | **UI: Settings Page** | Simple inputs to Manage Sources (Delete source). | P3 |
