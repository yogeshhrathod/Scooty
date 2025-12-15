import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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

function AnimatedRoutes() {
  const location = useLocation();
  // We can add AnimatePresence here later for route transitions
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
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Player is standalone (no sidebar) */}
        <Route path="/play/:id" element={<Player />} />

        {/* Main Layout routes */}
        <Route path="/*" element={
          <Layout>
            <AnimatedRoutes />
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

