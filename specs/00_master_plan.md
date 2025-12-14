# 00. Project Master Plan & Index

## Project Name: Scooty (Infuse Clone)
**Vision:** A high-performance, aesthetically stunning, cross-platform media player that aggregates content from various sources (Local, FTP, Cloud) into a unified, Netflix-grade interface.

## Documentation Index
This `specs/` folder contains the absolute source of truth for the project.

| File ID | Title | Purpose |
| :--- | :--- | :--- |
| **01** | **[Requirements & User Stories](./01_requirements_stories.md)** | User-centric goals, detailed user stories, and acceptance criteria. |
| **02** | **[Tech Stack & Libraries](./02_technical_stack.md)** | Definitive list of libraries (HeroUI, Tailwind, Electron), versions, and reasoning. |
| **03** | **[Design System & UI Specs](./03_design_system_tokens.md)** | Color palettes, typography, glassmorphism constants, animation curves. |
| **04** | **[Data Models & Schema](./04_data_models_schemas.md)** | Zoning of Zustand stores, Local Database (LowDB/SQLite), and Type definitions. |
| **05** | **[Service Architecture](./05_service_architecture.md)** | Detailed diagrams of Electron Main processes, Stream Proxy, and Worker threads. |
| **06** | **[API & Connectivity](./06_auth_and_api_spec.md)** | TMDB endpoints, Trakt Auth flow, FTP/SMB protocol details. |
| **07** | **[UI Flows & Navigation](./07_ui_flow_navigation.md)** | Step-by-step user journey maps (Onboarding, Playback, Search). |
| **08** | **[Mobile & Native Bridge](./08_mobile_spec.md)** | Capacitor configuration, native plugins, and touch-interface rules. |
| **09** | **[Tasks: Phase 1 (Core)](./09_task_list_phase_1.md)** | Granular ticket list for Setup, Foundation, and Local Scanning. |
| **10** | **[Tasks: Phase 2 (Player)](./10_task_list_phase_2.md)** | Granular ticket list for Video Player, Controls, and Codecs. |
| **11** | **[Tasks: Phase 3 (Network)](./11_task_list_phase_3.md)** | Granular ticket list for FTP, SMB, and Cloud integrations. |
| **12** | **[QA & Testing](./12_qa_testing_spec.md)** | Test plans, edge cases, and manual review checklists. |
| **13** | **[Timeline & Tracker](./13_project_timeline.md)** | High-level schedule and progress tracking dashboard. |
| **14** | **[Advanced UX & Ops](./14_advanced_ux_and_ops.md)** | Keyboard navigation, Security/Keytar, and Error codes. |
| **15** | **[Master Execution Order](./15_step_by_step_execution.md)** | Linear Step-by-Step dependency graph (The "Golden Path"). |

## Guiding Principles
1.  **Aesthetics First:** If it doesn't look like a premium Apple app, it's wrong.
2.  **No Server Needed:** The app must be standalone. No "Plex Server" requirement.
3.  **Speed:** Interfaces must react instantly. Expensive ops go to Web Workers or Main Process.
4.  **Universal:** If a file exists, we play it. No excuses.
