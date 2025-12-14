# 04. Data Models & Schemas

## 1. Zustand Stores (Global State)

### `useLibraryStore`
Holds the "Truth" of what content is available.
```typescript
interface LibraryState {
  // The normalized list of all media
  items: MediaItem[]; 
  
  // Status
  isScanning: boolean;
  scanProgress: number; // 0-100
  
  // Actions
  addItem: (item: MediaItem) => void;
  updateItem: (id: string, updates: Partial<MediaItem>) => void;
  removeItem: (id: string) => void;
  
  // Search Index
  // fuseIndex: Fuse<MediaItem>; // Config: ['title', 'cast.name', 'director']
  
  // Computed (Selectors can derive these)
  // movies: () => items.filter(i => i.type === 'movie')
  // tvShows: () => items.filter(i => i.type === 'tv')
}
```

### `useSettingsStore`
Persisted configurations.
```typescript
interface SettingsState {
  sources: SourceConfig[];
  tmdbApiKey: string;
  uiPreferences: {
    viewMode: 'grid' | 'list';
    posterSize: 'small' | 'medium' | 'large';
    theme: 'dark' | 'light';
  };
  playbackPreferences: {
    autoPlayNext: boolean;
    defaultSubtitleLang: string; // 'en'
    defaultAudioLang: string; // 'en'
  }
}

interface SourceConfig {
  id: string; // uuid
  name: string; // "My NAS"
  type: 'local' | 'ftp' | 'smb';
  path: string; // "/Volumes/Movies" or "/"
  connection?: {
    host: string;
    port: number;
    user: string;
    pass: string; // Encrypted ideally, base64 for now
    protocol: 'ftp' | 'ftps';
  };
}
```

## 2. Media Models

### `MediaItem` (The Unified Model)
Whether from FTP or Local, it converts to this.
```typescript
interface MediaItem {
  id: string; // UUID
  
  // File Info
  filePath: string; // "ftp://user:pass@192.168.1.5/Movies/Avatar.mkv" OR "/Users/me/Movies/Avatar.mkv"
  fileName: string;
  fileSize: number;
  dateAdded: number; // timestamp
  
  // Parsed Metadata
  title: string;
  originalTitle?: string;
  year?: number;
  type: 'movie' | 'tv-episode';
  
  // TV Specific
  seriesId?: string; // Links episode to series
  seasonNumber?: number;
  episodeNumber?: number;
  
  // TMDB Metadata
  tmdbId?: number;
  posterUrl?: string; // "/p/abcd.jpg"
  backdropUrl?: string; // "/b/abcd.jpg"
  overview?: string; // Plot summary
  
  // Scoring & Details
  rating?: number; // 1-10 (e.g. 8.2)
  contentRating?: string; // "PG-13", "TV-MA"
  genres?: string[]; // ["Action", "Sci-Fi"]
  language?: string; // "en"
  
  // People
  cast?: CastMember[]; // Top 5-10 actors
  director?: string; // "Christopher Nolan"
  writer?: string;
  
  // User State
  isWatched: boolean;
  resumeTime: number; // Seconds
  duration: number; // Seconds
}

interface CastMember {
  id: number;
  name: string; // "Robert Downey Jr."
  character: string; // "Tony Stark"
  id: number;
  name: string; // "Robert Downey Jr."
  character: string; // "Tony Stark"
  profileUrl: string; // "/p/face.jpg"
}

/**
 * Series Aggregation Logic:
 * In the 'items' store, we keep individual episodes (MediaItem type='tv-episode').
 * However, the UI Grid must display grouped 'Series' cards.
 * This is derived at runtime or via a separate 'series' map in the store.
 */
interface SeriesItem {
  id: string; // "breaking-bad" (Slug or TMDB ID)
  tmdbId: number;
  title: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  overview: string;
  episodeCount: number;
  firstAirDate: string;
}
```

## 3. Database Schema (LowDB / JSON)
We persist to `library.json` in user data folder.

```json
{
  "version": 1,
  "sources": [...],
  "items": {
    "uuid-1": { ...MediaItem },
    "uuid-2": { ...MediaItem }
  },
  "history": [
    { "itemId": "uuid-1", "timestamp": 12345678, "action": "watched" }
  ]
}
```

## 4. Cache Schema
Location: `%UserData%/cache/images/`
-   Images are downloaded and hashed.
-   Example: `cache/tmdb_12345_poster.webp`
-   This prevents re-fetching images from TMDB on every app launch.
