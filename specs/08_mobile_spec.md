# 08. Mobile Specification (Capacitor)

## 1. Core Config
`capacitor.config.ts`
-   **App ID:** `com.scooty.media`
-   **WebDir:** `dist`
-   **Plugins:**
    -   `StatusBar`: Style 'Dark'.
    -   `SplashScreen`: Auto-hide after 300ms.
    -   `ScreenOrientation`: Lock to 'Landscape' for Phone (optional) or allow rotation.

## 2. Native Plugins Required

### 2.1. File System (`@capacitor/filesystem`)
-   Access to internal storage for downloading media / caching images.
-   Android: Requires `READ_EXTERNAL_STORAGE` permission request logic.

### 2.2. Native Video Player (Critical Gap)
Standard HTML5 video on iOS/Android **cannot** play MKV or AC3 audio.
**Solution:** We must use a native video player plugin that overlays the webview.

-   **Plugin:** `capacitor-video-player` (Community) or Custom Wrapper.
-   **Implementation:**
    -   React Component renders a placeholder `<div>`.
    -   On Mount: Call `CapacitorVideoPlayer.init({ mode: 'fullscreen', url: '...' })`.
    -   The Native OS Player (AVPlayer/ExoPlayer) takes over the screen.
    -   Events (TimeUpdate, Ended) are sent back to JS via Plugin Listeners.

### 2.3. Background Mode
-   **Goal:** Allow music/audio to play when app is minimized (optional feature).
-   **Requirement:** Audio Session configuration in Xcode/Android Manifest.

## 3. UI Adaptations for Touch

### Gestures
-   **Swipe Down** on Details Page -> Close/Back.
-   **Swipe Left/Right** on Player -> Seek.
-   **Swipe Up/Down** on Player -> Volume/Brightness (Standard Mobile Player UX).

### Safe Areas
-   Use `env(safe-area-inset-top)` in CSS to avoid Notch/Dynamic Island.
-   Video Player must handle "Immersive Mode" (Hiding status bar and home indicator).

## 4. Build & Deploy
-   **iOS:** Requires Mac with Xcode.
    -   `npx cap add ios`
    -   `npx cap sync`
-   **Android:** Requires Android Studio.
    -   `npx cap add android`
-   **Live Reload:**
    -   Use `npx cap run android -l --external` to dev on device with HMR.
