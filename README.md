# Infuse Clone

A cross-platform media player (Web, Windows, Mac, Linux, iOS, Android) built with React, Vite, TailwindCSS, Electron, and Capacitor.

## Features
-   **Cross-Platform**: One codebase for all devices.
-   **OTT UI**: Beautiful, premium Netflix/Infuse-style interface.
-   **Metadata**: Automatic movie identification using TMDB.
-   **Library**: Manage local folders and files.
-   **Player**: Custom video player with subtitle and audio controls.

## Project Structure
-   `src/`: Main React source code.
-   `electron/`: Desktop entry point.
-   `android/` & `ios/`: Native mobile projects.
-   `dist/`: Production build output.

## How to Run

### Web (Development)
```bash
npm install
npm run dev
```

### Desktop (Electron)
```bash
# Development
npm run electron:dev

# Build (.exe / .dmg / .AppImage)
npm run electron:build
```
*Note: The build artifacts will be in the `dist_electron` or `release` folder depending on config.*

### Mobile (iOS & Android)
```bash
# Sync Web Assets to Native
npm run build
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio
npx cap open android
```

## Supported Formats
-   **Web**: MP4, WebM (Browser specific).
-   **Desktop/Mobile**: MKV, AVI, etc. require Native Player integration.
    -   *Current implementation uses a Hybrid Player wrapper.*
    -   *For Production MKV support, ensure the Native Players (ExoPlayer/AVPlayer) are properly linked via Capacitor plugins.*

## Tech Stack
-   **Frontend**: React, Vite, TailwindCSS v3, Framer Motion, Zustand.
-   **Desktop**: Electron.
-   **Mobile**: Capacitor.
-   **Data**: TMDB API key (Set in `src/services/tmdb.js`).

