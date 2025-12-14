# 07. UI Flows & Navigation

## 1. Onboarding Flow
**Goal:** Minimise time to "First Pixel" (First movie showing).

1.  **Welcome Screen**
    -   Logo + "Welcome to Scooty".
    -   Button: "Get Started".
2.  **Source Setup**
    -   Prompt: "Where is your media?"
    -   Options: [Local Folder] [FTP Server] [SMB Share].
    -   *Action:* User selects "Local Folder".
    -   *System:* Opens Picker -> User selects path.
3.  **Scanning (Background)**
    -   User is immediately redirected to **Dashboard**.
    -   **Toast/Banner:** "Scanning /Movies... (5 found)".
    -   Cards pop in one by one as metadata resolves.

## 2. Navigation Structure (Sidebar/Navbar)

### Desktop (Sidebar)
**Behavior:**
-   **Default:** "Mini" State (Icons Only, width ~64px).
-   **Expansion:** auto-expands on Hover or Hamburger click (width ~240px).
-   **Mobile:** Hidden behind Hamburger menu.

Left Vertical Rail (Collapsible).
-   **Logo** (Top)
-   **Menu:**
    -   Home (Dashboard)
    -   Movies (Grid)
    -   TV Shows (Grid)
    -   Playlists
-   **Bottom:**
    -   Settings (Gear)
    -   Add Source (+)

### Mobile (Tab Bar)
Bottom Fixed Bar.
-   [Home] [Movies] [TV] [Search] [More]

## 3. Browsing Logic

### The "Grid" View
-   **Filtering:** Top Bar Pill Selectors (All, Action, Comedy, HDR).
-   **Sorting:** Dropdown (Date Added, Year, Title, Rating).
-   **Interaction:**
-   **Sorting:** Dropdown (Date Added, Year, Title, Rating).

### Advanced Discovery Flow
**Goal:** "Find similar movies, explore by cast, filtering."

1.  **Global Search (Cmd+K):**
    -   Overlay Search Bar.
    -   Target: Titles, **Cast Members**, Directors.
    -   *Result:* "Robert Downey Jr." -> Shows Person Card + "Movies with Robert..."

2.  **Filter Panel:**
    -   Sidebar or Slide-out panel.
    -   **Multi-Select:** Action + Sci-Fi.
    -   **Resolution:** 4K | 1080p.
    -   **Decade:** 1990s | 2000s.

3.  **Cross-Linking:**
    -   Clicking Actor Face in Details -> Navigates to filtered grid `?cast=ID`.
    -   Clicking Genre Pill -> Navigates to filtered grid `?genre=Action`.

-   **Interaction:**
    -   **Movie Item:** Click -> Opens **Movie Details Modal** (Info + Play Button).
    -   **Series Item:** Click -> Opens **Series Details Page** (Info + Season/Episode List).
    -   Hover -> Plays Trailer (optional) or Slide Show.

### The "Details" View
-   **Hero:** Full width backdrop image.
-   **Primary Action:** Big Orange "Play" Button.
    -   *If Resume available:* "Resume from 14:00".
-   **Details Content:**
    -   **Meta Row:** Year • Rating (8.2/10) • Duration • Content Rating (PG-13).
    -   **Plot:** 3-line clamped summary.
    -   **Cast Row:** Horizontal scroll of actors with character names.
    -   **Crew:** Director / Writer credits.
    -   **Crew:** Director / Writer credits.
    -   **Related:** "More Like This" row.

### The "Series Details" View (TV Only)
-   **Header:** Series Poster, Plot, Metadata (Seasons Count).
-   **Season Selector:** Tabs or Dropdown (Season 1, Season 2...).
-   **Episode List:** Vertical list.
    -   **Item:** Thumbnail | Ep Number | Title | plot snippet | Duration.
    -   **Action:** Click -> Plays Episode.

## 4. Playback Flow
1.  **Transition:** Screen fades to black.
2.  **Loader:** Spinner centered. "Buffering...".
3.  **Start:** Video fades in. UI overlay shows Title for 3s then fades out.
4.  **Interaction:**
    -   Mouse Move -> Show Controls.
    -   Spacebar -> Toggle Play/Pause.
    -   Arrow Left/Right -> Seek -/+ 10s.
    -   Escape -> Exit Fullscreen/Player.
5.  **Completion:**
    -   At 95% -> Mark as "Watched".
    -   At 100% -> Auto-close or Show "Up Next" (if TV Show).
