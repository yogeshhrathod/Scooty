import React, { useMemo, useState, useEffect } from 'react';
import { Spotlight } from '../components/ui/spotlight';
import { MovieCard } from '../components/MovieCard';
import { Hero } from '../components/Hero';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const Home = () => {
    const library = useStore((state) => state.library) || [];
    const navigate = useNavigate();
    const history = useStore((state) => state.history) || {};
    const [heroItem, setHeroItem] = useState(null);

    // Group items logic
    const displayItems = useMemo(() => {
        if (!library || library.length === 0) return [];

        const map = new Map();
        library.forEach(item => {
            if (item.type === 'tv') {
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
                map.set(item.id || item.path, item);
            }
        });
        return Array.from(map.values());
    }, [library]);

    // Continue Watching logic
    const continueWatchingItems = useMemo(() => {
        if (!library || library.length === 0) return [];
        return Object.entries(history)
            .map(([id, data]) => {
                const item = library.find(l => l.path === id || l.id === id);
                if (!item) return null;
                const progress = typeof data === 'number' ? data : data.progress;
                const duration = typeof data === 'number' ? 0 : data.duration;
                const lastWatched = typeof data === 'number' ? 0 : data.lastWatched;
                if (duration > 0) {
                    const pct = progress / duration;
                    if (pct > 0.95) return null;
                    if (pct < 0.01 && progress < 30) return null;
                } else {
                    if (progress < 10) return null;
                }
                return { ...item, lastWatched, progress, duration };
            })
            .filter(Boolean)
            .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
    }, [library, history]);

    const moviesOnly = useMemo(() => displayItems.filter(item => item.type !== 'tv'), [displayItems]);
    const tvShowsOnly = useMemo(() => displayItems.filter(item => item.type === 'tv'), [displayItems]);

    // Select Hero Item
    useEffect(() => {
        if (displayItems.length > 0 && !heroItem) {
            // Prefer items with backdrop images
            const candidates = displayItems.filter(i => i.backdrop_path);
            const pool = candidates.length > 0 ? candidates : displayItems;

            // Pick a random one from the pool
            const randomItem = pool[Math.floor(Math.random() * pool.length)];
            setHeroItem(randomItem);
        }
    }, [displayItems, heroItem]);

    const handleItemClick = (item) => {
        if (item.type === 'tv') {
            navigate(`/tv/${item.tmdbId || encodeURIComponent(item.showTitle || item.title)}`);
        } else {
            navigate(`/details/${item.tmdbId || item.id || encodeURIComponent(item.path)}`);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    if (displayItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center w-full px-4 relative overflow-hidden">
                <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="z-10"
                >
                    <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 pb-4">
                        Welcome to Scooty
                    </h1>
                    <p className="mt-4 text-lg text-neutral-400 max-w-lg mx-auto">
                        Your personal media sanctuary. Add your library to get started.
                    </p>
                    <button
                        onClick={() => navigate('/settings')}
                        className="mt-8 px-8 py-3 bg-primary rounded-full text-white font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/20"
                    >
                        Setup Library
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="relative w-full min-h-screen pb-20 overflow-x-hidden">
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

            {/* Hero Section */}
            <div className="px-4 md:px-8 lg:px-12 pt-6 mb-12">
                <Hero item={heroItem} />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-12 px-4 md:px-8 lg:px-12"
            >
                {/* Continue Watching */}
                {continueWatchingItems.length > 0 && (
                    <section>
                        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
                            <div className="w-1 h-8 bg-primary rounded-full" />
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-100">Continue Watching</h2>
                        </motion.div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {continueWatchingItems.slice(0, 6).map((item) => (
                                <MovieCard
                                    key={item.id || item.tmdbId || item.path}
                                    title={item.title || item.name}
                                    year={item.year || item.release_date?.split('-')[0]}
                                    posterPath={item.poster_path || item.backdrop_path}
                                    onClick={() => handleItemClick(item)}
                                    progress={item.duration ? (item.progress / item.duration) * 100 : 0}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Movies */}
                {moviesOnly.length > 0 && (
                    <section>
                        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
                            <div className="w-1 h-8 bg-blue-500 rounded-full" />
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-100">Recent Movies</h2>
                        </motion.div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {moviesOnly.slice(0, 12).map((movie) => (
                                <MovieCard
                                    key={movie.id || movie.tmdbId || movie.path}
                                    title={movie.title}
                                    year={movie.year || movie.release_date?.split('-')[0]}
                                    posterPath={movie.poster_path}
                                    onClick={() => handleItemClick(movie)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* TV Shows */}
                {tvShowsOnly.length > 0 && (
                    <section>
                        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
                            <div className="w-1 h-8 bg-orange-500 rounded-full" />
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-100">TV Shows</h2>
                        </motion.div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {tvShowsOnly.slice(0, 12).map((show) => (
                                <MovieCard
                                    key={show.groupKey || show.tmdbId || show.path}
                                    title={show.title}
                                    year={show.year}
                                    posterPath={show.poster_path}
                                    onClick={() => handleItemClick(show)}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </motion.div>
        </div>
    );
};
