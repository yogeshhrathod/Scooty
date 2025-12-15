import React from 'react';
import { Spotlight } from '../components/ui/spotlight';
import { MovieCard } from '../components/MovieCard';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
    // Attempt to get movies from store, fallback to empty array if store is not ready
    const library = useStore((state) => state.library) || [];
    const navigate = useNavigate();

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

    // Get only movies for "Continue Watching" and "Recommended"
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
                {/* Continue Watching Section - Shows both movies and TV shows */}
                {displayItems.length > 0 && (
                    <div className="mb-10 md:mb-12">
                        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-600 to-neutral-900 dark:from-neutral-50 dark:to-neutral-400 bg-opacity-50 pb-3 md:pb-4 mt-6 md:mt-10">
                            Continue Watching
                        </h1>
                        <p className="mt-3 md:mt-4 font-normal text-sm sm:text-base text-neutral-600 dark:text-neutral-300 max-w-lg text-center mx-auto px-4">
                            Jump back into your favorite stories.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 4k:grid-cols-12 gap-3 sm:gap-4 md:gap-6 mt-6 md:mt-8">
                            {displayItems.slice(0, 6).map((item) => (
                                <MovieCard
                                    key={item.groupKey || item.id || item.tmdbId || item.path}
                                    title={item.title}
                                    year={item.year || item.release_date?.split('-')[0]}
                                    posterPath={item.poster_path}
                                    onClick={() => handleItemClick(item)}
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
