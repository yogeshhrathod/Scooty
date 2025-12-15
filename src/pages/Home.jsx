import React from 'react';
import { Spotlight } from '../components/ui/spotlight';
import { MovieCard } from '../components/MovieCard';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
    // Attempt to get movies from store, fallback to empty array if store is not ready
    const library = useStore((state) => state.library) || [];
    const navigate = useNavigate();

    // Get history from store
    const history = useStore((state) => state.history) || {};

    // Group items: Movies are individual, TV Shows are grouped by tmdbId or showTitle
    const displayItems = React.useMemo(() => {
        if (!library || library.length === 0) {
            return [];
        }

        const map = new Map();
        library.forEach(item => {
            if (item.type === 'tv') {
                // Group TV shows by tmdbId or showTitle
                const key = item.tmdbId ? `tv-${item.tmdbId}` : `tv-${item.showTitle || item.title}`;
                if (!map.has(key)) {
                    map.set(key, {
                        ...item,
                        title: item.showTitle || item.title,
                        isSeriesGroup: true,
                        groupKey: key
                    });
                }
            } else {
                // Movies are shown individually
                map.set(item.id || item.path, item);
            }
        });
        return Array.from(map.values());
    }, [library]);

    // Derive Continue Watching items
    const continueWatchingItems = React.useMemo(() => {
        if (!library || library.length === 0) return [];

        return Object.entries(history)
            .map(([id, data]) => {
                // Find the item in the library
                // Note: id in history is the filePath for local files
                const item = library.find(l => l.path === id || l.id === id);
                if (!item) return null;

                // Normalize history data
                const progress = typeof data === 'number' ? data : data.progress;
                const duration = typeof data === 'number' ? 0 : data.duration;
                const lastWatched = typeof data === 'number' ? 0 : data.lastWatched;

                // Filter out finished items (e.g., > 90% watched)
                // And items with very little progress (e.g. < 10s)
                if (duration > 0) {
                    const pct = progress / duration;
                    if (pct > 0.95) return null; // Considered finished
                    if (pct < 0.01 && progress < 30) return null; // Just opened, not really watching
                } else {
                    if (progress < 10) return null;
                }

                return { ...item, lastWatched, progress, duration };
            })
            .filter(Boolean)
            .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
    }, [library, history]);

    // Get only movies for "Recommended"
    const moviesOnly = displayItems.filter(item => item.type !== 'tv');
    const tvShowsOnly = displayItems.filter(item => item.type === 'tv');

    const handleItemClick = (item) => {
        if (item.type === 'tv') {
            // Navigate to TV show details page
            navigate(`/tv/${item.tmdbId || encodeURIComponent(item.showTitle || item.title)}`);
        } else {
            // Navigate to movie details page
            navigate(`/details/${item.tmdbId || item.id || encodeURIComponent(item.path)}`);
        }
    };

    return (
        <div className="relative w-full min-h-[calc(100vh-80px)] overflow-hidden rounded-md flex flex-col items-start justify-start">
            <Spotlight
                className="-top-40 left-0 md:left-60 md:-top-20"
                fill="white"
            />

            <div className="relative z-10 w-full px-2 sm:px-4">
                {/* Continue Watching Section */}
                {continueWatchingItems.length > 0 && (
                    <div className="mb-10 md:mb-12">
                        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-600 to-neutral-900 dark:from-neutral-50 dark:to-neutral-400 bg-opacity-50 pb-3 md:pb-4 mt-6 md:mt-10">
                            Continue Watching
                        </h1>
                        <p className="mt-3 md:mt-4 font-normal text-sm sm:text-base text-neutral-600 dark:text-neutral-300 max-w-lg text-center mx-auto px-4">
                            Jump back into your favorite stories.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 4k:grid-cols-12 gap-3 sm:gap-4 md:gap-6 mt-6 md:mt-8">
                            {continueWatchingItems.slice(0, 10).map((item) => (
                                <MovieCard
                                    key={item.id || item.tmdbId || item.path}
                                    title={item.title || item.name} // Handle generic file names
                                    year={item.year || item.release_date?.split('-')[0]}
                                    posterPath={item.poster_path || item.backdrop_path}
                                    onClick={() => handleItemClick(item)}
                                    progress={item.duration ? (item.progress / item.duration) * 100 : 0}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Movies Section */}
                {moviesOnly.length > 0 && (
                    <div className="mt-8 md:mt-12 mb-6 md:mb-8">
                        <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white mb-4 md:mb-6 pl-2 border-l-4 border-primary">
                            Recent Movies
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 4k:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
                            {moviesOnly.slice(0, 8).map((movie) => (
                                <MovieCard
                                    key={movie.id || movie.tmdbId || movie.path}
                                    title={movie.title}
                                    year={movie.year || movie.release_date?.split('-')[0]}
                                    posterPath={movie.poster_path}
                                    onClick={() => handleItemClick(movie)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* TV Shows Section */}
                {tvShowsOnly.length > 0 && (
                    <div className="mt-8 md:mt-12 mb-6 md:mb-8">
                        <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white mb-4 md:mb-6 pl-2 border-l-4 border-orange-500">
                            TV Shows
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 4k:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
                            {tvShowsOnly.slice(0, 8).map((show) => (
                                <MovieCard
                                    key={show.groupKey || show.tmdbId || show.path}
                                    title={show.title}
                                    year={show.year}
                                    posterPath={show.poster_path}
                                    onClick={() => handleItemClick(show)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {displayItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center w-full px-4">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 pb-3 md:pb-4">
                            Welcome to Scooty
                        </h1>
                        <p className="mt-3 md:mt-4 font-normal text-sm sm:text-base text-neutral-300 max-w-lg text-center mx-auto">
                            Add your media folders in Settings to get started.
                        </p>
                        <button
                            onClick={() => navigate('/settings')}
                            className="mt-6 md:mt-8 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary rounded-full text-white text-sm sm:text-base font-medium hover:bg-primary/80 transition-colors"
                        >
                            Go to Settings
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
