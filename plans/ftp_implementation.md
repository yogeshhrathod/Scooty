# FTP Support Implementation Plan

## Objective
Enable the application to sync movie lists from an FTP server and stream them directly with fault tolerance and seeking support.

## Architecture

### 1. Backend (Electron Main Process)

The backend will handle the heavy lifting: network connections, file scanning, and protocol translation (FTP -> HTTP Stream).

**Dependencies:**
- `basic-ftp`: For robust FTP/FTPS client functionality.
- `express` (or native `http`): To run a local proxy server for streaming.
- `portfinder`: To safely find a free port for the proxy.

**Components:**

A. **`FtpService` Class**
   - **Responsibility**: Manage FTP connection lifecycle (connect, disconnect, reconnect).
   - **Fault Tolerance**: 
     - Auto-reconnect on connection loss.
     - Retry logic for failed commands.
   - **Methods**:
     - `connect(config)`: keys stored in-memory for session.
     - `scan(rootPath)`: Recursively list video files.
     - `getStream(remotePath, startByte)`: Returns a readable stream starting from `startByte`.

B. **Local Streaming Proxy (HTTP Server)**
   - **Why?**: Video players (like HTML5 video) require HTTP/HTTPS and support Range requests for seeking. Browsers often have poor or deprecated native FTP support.
   - **Mechanism**:
     - Starts on a local port (e.g., `http://127.0.0.1:4567`).
     - Endpoint: `/stream?file=/path/on/ftp/movie.mkv`
     - Handling:
       1. Parses `Range` header (e.g., `bytes=1048576-`).
       2. Requests specific byte offset from `FtpService`.
       3. Pipes the chunks to the HTTP response with `206 Partial Content`.
   - **Fault Tolerance**: Handles broken pipes and client disconnects gracefully.

### 2. IPC Layer
Expose methods to the Renderer:
- `ftp:connect-and-scan(config)` -> Returns list of files (virtual paths).
- `ftp:get-stream-url` -> Returns the `localhost` base URL found by the proxy.

### 3. Frontend (Renderer)

A. **State Management (Zustand)**
   - Add `ftpConfigurations`: Store saved FTP credentials (password stored optionally or per-session).
   - Add `ftpFiles`: Store the synced list of files distinguished by `source: 'ftp'`.

B. **UI Changes**
   - **Settings/Add Source**: Form for Host, Port, User, Password, TLS toggle.
   - **Library**: Merge FTP items with local items.
     - FTP items might need a special badge icon.
   - **Player**: 
     - When playing an FTP file, construct the URL: `http://localhost:<PORT>/stream?file=${encodeURIComponent(file.path)}`.

## Implementation Steps

1.  **Install Dependencies**: `basic-ftp`, `express`, `portfinder`, `cors`.
2.  **Create Backend Service**: Implement `src/main/services/FtpService.js`.
3.  **Setup Proxy**: Implement `src/main/services/StreamProxy.js`.
4.  **Integrate in `main.js`**: Initialize services and setup IPC handlers.
5.  **Frontend Logic**: Creates actions to trigger sync and retrieve files.

## Fault Tolerance Strategy
- **Connection**: If the proxy sees the FTP connection is dead when a chunk is requested, it will attempt 1 reconnection before failing.
- **Scanning**: If scanning fails on a specific folder, log and continue (best effort) or retry directory.
- **Timeouts**: Enforce timeouts on FTP operations to prevent hanging the UI.
