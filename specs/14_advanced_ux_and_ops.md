# 14. Advanced UX & Operations Specification

## 1. Input & Accessibility (The "10-Foot UI")
To be a true Media Center, the app must be fully navigable using **only a keyboard** (Arrow Keys, Enter, Esc) or a TV Remote.

### Focus Management
-   **Library:** `react-aria` (or custom hook) to manage a "Focus Trap" on the Grid.
-   **Visual Indicator:** Focused item gains a thick white border (`ring-4 ring-white`).
-   **Navigation Logic:**
    -   `ArrowRight`: `index + 1`
    -   `ArrowLeft`: `index - 1`
    -   `ArrowDown`: `index + cols`
    -   `ArrowUp`: `index - cols`

### Shortcuts Map
| Key | Context | Action |
| :--- | :--- | :--- |
| `Space` | Player | Toggle Play/Pause |
| `M` | Player | Toggle Mute |
| `F` | Global | Toggle Fullscreen |
| `Esc` | Modal/Player | Close / Go Back |
| `ArrowLeft` | Player | Seek -10s |
| `ArrowRight` | Player | Seek +10s |
| `ArrowUp` | Player | Volume +10% |
| `ArrowDown` | Player | Volume -10% |
| `Cmd+,` | Global | Open Settings |

## 2. Security & Credentials
Stored FTP/SMB passwords must be encrypted, not plain text in `library.json`.

### Implementation (Desktop)
-   **Library:** `keytar` (System Keychain wrapper).
-   **Flow:**
    1.  User enters password.
    2.  App generaets a UUID for the Source.
    3.  `keytar.setPassword('scooty', sourceUUID, password)`.
    4.  Config saved to JSON has `authReference: "sourceUUID"` (No password).

### Implementation (Mobile/Web)
-   **Mobile:** `@capacitor/preferences` (uses secure storage on OS).
-   **Web:** `sessionStorage` (Cleared on close) or ask user to re-enter (Security tradeoff).

## 3. Error Handling Standards
Avoid generic "Something went wrong".

### Error Categories
| Code | User Message | Recovery Action |
| :--- | :--- | :--- |
| `ERR_NET_TIMEOUT` | "Connection to [Source] timed out." | "Retry" button (Backoff 2s). |
| `ERR_FILE_404` | "File not found on server." | Remove from library option. |
| `ERR_CODEC_FAIL` | "Video format not supported on this device." | "Try transcoding" (Future) or "Open in VLC". |
| `ERR_AUTH_FAIL` | "Access Denied. Check password." | Pop open Edit Source modal. |
| `ERR_SCAN_PARTIAL` | "Scanned 50 items, 2 failed." | Show "Error Log" link. |

## 4. Updates & CI/CD
Automated pipeline for releases.

### Desktop (electron-updater)
-   **Config:** `electron-builder.yml`.
-   **Provider:** GitHub Releases.
-   **Flow:**
    1.  App checks for update on launch.
    2.  If found -> Toast "Update Downloading...".
    3.  When ready -> "Restart to Update".

### Mobile (Stores)
-   **iOS:** TestFlight for beta.
-   **Android:** Internal Testing track.
-   **Versioning:** Semantic (`1.0.0`).
    -   *Rule:* Native code changes require new Binary.
    -   *Rule:* JS-only changes can be "Live Patched" (via Capacitor Live Update - *Future*).
