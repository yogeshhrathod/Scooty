# 11. Task Breakdown: Phase 3 (Networking & Advanced)

**Goal:** FTP/SMB Support and Stream Proxy.

| ID | Task Name | Description | Priority |
| :--- | :--- | :--- | :--- |
| **3-01** | **FTP Service (Main)** | `basic-ftp` class. `connect`, `list` methods. | P1 |
| **3-02** | **IPC: FTP Connect** | Bridge frontend form to backend service. connection test. | P1 |
| **3-03** | **Stream Proxy Server** | Express app in Main. Route `/stream`. Range Header parsing. | P0 |
| **3-04** | **Proxy Integration** | Pipe FTP stream to Response. | P0 |
| **3-05** | **Frontend FTP Source** | UI to input Host, User, Pass. Save to Settings. | P1 |
| **3-06** | **FTP Scanner** | Recursive list logic for FTP. (Warning: Can be slow, need limits). | P2 |
| **3-07** | **URL Resolver** | Logic: If `item.isFtp`, call `ipc.getStreamUrl(path)`. | P1 |
| **3-08** | **SMB Service (Optional)** | Implement valid SMB connection using `@marsaud/smb2`. | P3 |
| **3-09** | **Mobile Native Player** | Integrate Capacitor Video Player plugin for Android/iOS. | P2 |
| **3-10** | **TV Show Grouping** | Logic to group flat list of episodes into Series -> Seasons. | P2 |
