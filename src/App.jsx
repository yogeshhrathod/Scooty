import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Movies } from './pages/Movies';
import { Player } from './pages/Player';
import { Settings } from './pages/Settings';
import { Details } from './pages/Details';
import { TvShows } from './pages/TvShows';
import { TvShowDetails } from './pages/TvShowDetails';
import { Genres } from './pages/Genres';
import { useStore } from './store/useStore';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Welcome } from './pages/Welcome';
import { PrivacyConsent } from './components/PrivacyConsent';

import { useAnalytics } from './hooks/useAnalytics';

function AnimatedRoutes() {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location, trackPageView]);

  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<Home />} />
      <Route path="/library" element={<Library />} />
      <Route path="/movies" element={<Movies />} />
      <Route path="/genres" element={<Genres />} />
      <Route path="/genres/:genreName" element={<Genres />} />
      <Route path="/tv" element={<TvShows />} />
      <Route path="/tv/:showId" element={<TvShowDetails />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/details/:id" element={<Details />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
    </Routes>
  );
}

function App() {
  const ftpSources = useStore((state) => state.ftpSources) || [];
  const isSetupComplete = useStore((state) => state.isSetupComplete);
  const [isReady, setIsReady] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Wait for Zustand store to hydrate from IndexedDB
  useEffect(() => {
    // Zustand persist has an onRehydrateStorage callback, but we can also 
    // detect hydration by checking if the store subscription fires
    const unsubscribe = useStore.persist.onFinishHydration(() => {
      console.log('[App] Store hydration complete');
      setHasHydrated(true);
    });

    // If already hydrated (sync storage), trigger immediately
    if (useStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle Theme
  const theme = useStore((state) => state.theme);
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t) => {
      root.classList.remove('light', 'dark');
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(t);
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Restore FTP configs only AFTER store has hydrated
  useEffect(() => {
    if (!hasHydrated) return;

    const restoreFtpConfigs = async () => {
      const sources = useStore.getState().ftpSources || [];

      if (sources.length > 0 && window.electron) {
        const { ftpService } = await import('./services/ftp');
        console.log(`[App] Restoring ${sources.length} FTP source(s)...`);

        for (const source of sources) {
          try {
            console.log('[App] Restoring FTP config for:', source.host);
            await ftpService.restoreConfig(source);
          } catch (e) {
            console.warn('[App] Failed to restore FTP config:', source.host, e);
          }
        }
      }

      setIsReady(true);
    };

    restoreFtpConfigs();
  }, [hasHydrated]);

  // Handle splash screen visibility
  useEffect(() => {
    if (isReady) {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => {
          splash.style.display = 'none';
        }, 500); // Match transition duration
      }
    }
  }, [isReady]);

  const { trackAppError } = useAnalytics();

  // Show nothing (let the HTML splash screen show) until both hydration AND FTP restoration are complete
  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary trackError={trackAppError}>
      <HashRouter>
        <Routes>
          {/* Player is standalone (no sidebar) */}
          <Route path="/play/:id" element={<Player />} />

          {/* Onboarding */}
          <Route path="/welcome" element={
            isSetupComplete ? <Navigate to="/" replace /> : <Welcome />
          } />

          {/* Main Layout routes */}
          <Route path="/*" element={
            !isSetupComplete ? <Navigate to="/welcome" replace /> :
              <Layout>
                <AnimatedRoutes />
              </Layout>
          } />
        </Routes>
        <PrivacyConsent />
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
