# 05. Service Architecture (Electron)

## Process Model
Scooty follows the **Electron Process Model**:
1.  **Main Process (Node.js):**
    -   Runs `main.js`.
    -   Controls Lifecycle (Launch, Quit).
    -   Manages `BrowserWindow` instances.
    -   **HOSTS SERVICES:** `FtpService`, `SmbService`, `HttpProxy`.
2.  **Renderer Process (Chromium/React):**
    -   Runs the UI.
    -   Cannot access FS/Net directly (blocked by Context Isolation).
    -   Communicates via `preload.js` (IPC Bridge).

## IPC Bridge API
These are the methods exposed to `window.electron`.

```typescript
// preload.js

contextBridge.exposeInMainWorld('scooty', {
  // File System
  selectFolder: () => Promise<string>,
  scanDirectory: (path: string) => Promise<string[]>, // Returns list of file paths
  
  // Network / FTP
  ftpConnect: (config: FtpConfig) => Promise<boolean>,
  ftpList: (path: string) => Promise<FtpItem[]>,
  
  // Playback Proxy
  startStream: (fileUrl: string) => Promise<string>, // Returns http://localhost:PORT/stream?file=...
  
  // Window Control
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),
});
```

## Critical Service: `StreamProxy` (The "Translation Layer")

### Problem
Chrome cannot play `ftp://` streams natively. It cannot seek `smb://`.

### Solution
A local Express server running on a dynamic port.

**Workflow:**
1.  Frontend requests playback: `startStream("ftp://user:pass@host/movie.mkv")`.
2.  Main Process starts Proxy (if not running).
3.  Main Process generates a secure token for this session.
4.  Main Process returns: `http://localhost:45555/stream?target=ENCODED_URL&token=XYZ`.
5.  Frontend sets `<video src="...">` to this URL.

**Proxy Logic (`/stream` route):**
1.  **Headers:** Read `Range: bytes=X-Y`.
2.  **Source:** Parse `target` query param to identify FTP config.
3.  **Fetch:** Call `basic-ftp` method `downloadTo(writableStream, startAt)`.
4.  **Pipe:** Pipe the FTP stream directly to the HTTP Response object.
5.  **Status:** Return `206 Partial Content`.

**Diagram:**
```
[Video Player] --(HTTP Range 0-1MB)--> [Local Proxy] --(FTP RETR @ 0)--> [NAS]
[Video Player] <--(Video Bytes)------- [Local Proxy] <--(TCP Data)------ [NAS]
```

## Service: `LibraryScanner`
Runs in Main Process to avoid freezing UI.
-   Input: `RootPath`
-   Logic:
    1.  `glob('**/*.{mkv,mp4}', { cwd: RootPath })`
    2.  Returns array of relative strings.
    3.  Frontend receives Strings -> Adds to Queue -> Processes Metadata individually (Queue batch size: 5).
