# 06. API & Integration Specifications

## 1. The Movie Database (TMDB)

### Configuration
-   **Base URL:** `https://api.themoviedb.org/3`
-   **Image URL:** `https://image.tmdb.org/t/p/w500` (Poster), `original` (Backdrop)
-   **Auth:** Bearer Token (Stored in `.env` for dev, injected in build for prod).

### Endpoints Used

#### Search (The Matcher)
`GET /search/multi`
-   **Query:** Parsed Title (e.g. "Iron Man").
-   **Params:** `include_adult=false`, `year=2008` (optional).
-   **Response Strategy:**
    1.  Filter results by `media_type` ('movie', 'tv').
    2.  Score results based on `title` + `year` match.
    3.  Take Top #1 if confidence > 90%.

#### Details (Enrichment)
`GET /movie/{id}`
-   **Append:** `credits,images,similar,videos`.
-   **Data extracted:**
    -   `runtime`
    -   `overview`
    -   `genres`
    -   `credits.cast` (Top 5)
    -   `videos.results` (Filter for type="Trailer", site="YouTube")

`GET /tv/{id}`
-   **Append:** `season/{season_number}`.
-   **Goal:** We need episode level details (Name, Still Image) for the file `S01E05`. We fetch the specific Season details when parsing an episode.

## 1.5. File Identification Logic (Regex Engine)
Before calling TMDB, we must understand what the file is.

### Regex Patterns
1.  **TV Standard:** `/(?<title>.+?)[\._ \-]?[Ss](?<season>\d{1,2})[Ee](?<episode>\d{1,2})/i`
    *   *Example:* `Breaking.Bad.S01E01.mkv` -> `{ title: "Breaking Bad", season: 1, episode: 1, type: 'tv' }`
2.  **TV X-Notation:** `/(?<title>.+?)[\._ \-](?<season>\d{1,2})x(?<episode>\d{1,2})/i`
    *   *Example:* `Heroes.1x01.avi` -> `{ title: "Heroes", season: 1, episode: 1, type: 'tv' }`
3.  **Movie Standard:** `/(?<title>.+?)[\._ \-\(](?<year>19\d{2}|20\d{2})/i`
    *   *Example:* `Avatar.2009.mkv` -> `{ title: "Avatar", year: 2009, type: 'movie' }`

### Matching Workflow
1.  **Execute Patterns:** Try TV patterns first. If no match, try Movie pattern.
2.  **Clean Title:** Replace dots/underscores with spaces. Remove "WebDL", "1080p", "SceneGroup" noise.
3.  **TMDB Query:**
    -   If `type === 'tv'`: Call `search/tv` with Title. Validate Season/Episode count locally if possible.
    -   If `type === 'movie'`: Call `search/movie` with Title + Year.


## 2. OpenSubtitles (Future Phase)
Authentication required for API v2.
-   **Flow:** Login -> Get Token -> Search by Hash (Best) or Query (Fallback).
-   **Action:** Returns download link (often gzipped).
-   **Handling:** Download -> Unzip -> Cache as `.srt` sidecar file -> Pass to Player.

## 3. FTP / SMB Auth
User credentials are potentially sensitive.
-   **Storage:** `electron-store` encodes data on disk.
-   **Safety:** We never display password in UI after entry.
-   **Validation:** "Test Connection" button is mandatory before saving source.
    -   `Client.access(config)` -> If throws, fail.

## 4. Rate Limiting Strategy
TMDB allows ~4 requests/second / ~50 requests/10 seconds.
-   **Queue:** Use `p-queue` or simple delay loop in `MetadataService`.
-   **Concurrency:** Max 2 simultaneous requests.
-   **Caching:**
    -   Key: `tmdb_search_${sanitizedTitle}_${year}`
    -   Value: Result ID.
    -   TTL: 30 Days.
