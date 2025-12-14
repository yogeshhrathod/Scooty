# 12. QA & Testing Strategy

## 1. Unit Testing (Vitest)
Strict logic (parsers) must be tested.

**Test Suite: `src/services/metadata.test.js`**
-   Input: `Avengers.Infinity.War.2018.1080p.BluRay.x264.DTS-HD.MA.7.1-HDC.mkv`
-   Expect: `{ title: "Avengers Infinity War", year: "2018" }`
-   Input: `The.Office.US.S05E12.Dimensions.720p.WEB-DL.mkv`
-   Expect: `{ title: "The Office US", season: 5, episode: 12 }`

## 2. Component Testing (Snapshot)
Ensure UI doesn't regress.
-   `<MovieCard />` renders correct Image URL.
-   `<Loader />` is centered.
-   `<ProgressBar />` width = 50% when value=0.5.

## 3. Integration Testing (Manual / Scripted)

### Connector Tests
| ID | Test Case | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **QA-01** | **Local Scan** | Add `~/Downloads`. | Files appear. Metadata fetched. |
| **QA-02** | **FTP Connect** | Enter valid creds. Click Test. | "Success" toast. |
| **QA-03** | **FTP Fail** | Enter bad pass. Click Test. | "Auth Failed" error. |
| **QA-04** | **Stream Seek** | Play FTP movie. Click middle of bar. | Video buffers then plays from middle. |
| **QA-05** | **Offline** | Disconnect Wifi. Open App. | Library loads (cached). Images load (cached). |

## 4. Performance checklist
-   [ ] **Scroll Performance:** Library grid with 500 items stays at 60fps.
-   [ ] **Memory Leak:** Open/Close Player 10 times. Memory usage should be stable.
-   [ ] **Startup Time:** App visible in < 2 seconds.
-   [ ] **Scan Speed:** 100 files scanned & matched in < 30 seconds.
