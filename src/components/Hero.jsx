import React from 'react';
import { motion } from 'framer-motion';
import { Play, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useMemo } from 'react';
import { Spotlight } from './ui/spotlight';

export const Hero = ({ item, className }) => {
    const navigate = useNavigate();
    const history = useStore((state) => state.history);
    const library = useStore((state) => state.library);

    // Determine what to play and button text
    const playbackState = useMemo(() => {
        if (!item) return null;

        if (item.type === 'tv') {
            // Find all episodes for this show
            const episodes = library.filter(l =>
                l.type === 'tv' &&
                (l.tmdbId === item.tmdbId || (l.showTitle || l.title) === (item.showTitle || item.title))
            );

            // Find the most recently watched episode
            let lastWatchedEp = null;
            let lastWatchedTime = 0;

            episodes.forEach(ep => {
                const h = history[ep.path] || history[ep.id];
                if (h && h.lastWatched > lastWatchedTime) {
                    lastWatchedTime = h.lastWatched;
                    lastWatchedEp = ep;
                }
            });

            if (lastWatchedEp) {
                const h = history[lastWatchedEp.path] || history[lastWatchedEp.id];
                const pct = h.duration ? h.progress / h.duration : 0;

                // If somewhat watched and not almost finished, resume
                if (pct < 0.95) {
                    return {
                        label: `Resume S${lastWatchedEp.season || '?'} E${lastWatchedEp.episode || '?'}`,
                        playItem: lastWatchedEp,
                        isResume: true
                    };
                }
                // If finished, ideally we find the next episode, but for now fallback to details
                // or just "Play Next" if we could determine it.
            }

            // Fallback (start from beginning or go to details)
            // Just return specific playItem if we have at least one episode
            if (episodes.length > 0) {
                // Simple sort to find S1E1 if possible?
                // For now, let's just let "Play Now" open details for TV shows if not resuming,
                // as starting a random episode is confusing.
                return { label: 'Play Now', action: 'details' };
            }

            return { label: 'Play Now', action: 'details' };
        } else {
            // Movie
            const h = history[item.path] || history[item.id];
            if (h) {
                const pct = h.duration ? h.progress / h.duration : 0;
                if (pct > 0.05 && pct < 0.95) {
                    return { label: 'Resume', playItem: item, isResume: true };
                }
            }
            return { label: 'Play Now', playItem: item };
        }
    }, [item, library, history]);

    if (!item) return null;

    const handlePlay = (e) => {
        e.stopPropagation();
        if (playbackState?.action === 'details') {
            handleDetails(e);
            return;
        }
        if (playbackState?.playItem) {
            navigate(`/play/${encodeURIComponent(playbackState.playItem.path)}`);
        }
    };

    const handleDetails = (e) => {
        e.stopPropagation();
        if (item.type === 'tv') {
            navigate(`/tv/${item.tmdbId || encodeURIComponent(item.showTitle || item.title)}`);
        } else {
            navigate(`/details/${item.tmdbId || item.id || encodeURIComponent(item.path)}`);
        }
    };

    const backdropUrl = item.backdrop_path || item.poster_path;

    return (
        <div className={cn("relative w-full h-[50vh] md:h-[70vh] rounded-3xl overflow-hidden shadow-2xl group", className)}>
            <Spotlight className="-top-20 left-0 md:left-20 md:-top-20 opacity-50" fill="white" />
            {/* Background Image */}
            <div className="absolute inset-0">
                {backdropUrl ? (
                    <img
                        src={backdropUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
                )}
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 lg:p-16 flex flex-col justify-end items-start z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="max-w-3xl"
                >
                    {/* Tag / Type */}
                    {/* Tag / Type */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 md:mb-4">
                        <span className="px-2 py-1 text-xs md:text-sm font-medium bg-primary/20 text-primary rounded-md backdrop-blur-md border border-primary/20 uppercase tracking-wider">
                            {item.type === 'tv' ? 'TV Series' : 'Movie'}
                        </span>
                        {item.vote_average > 0 && (
                            <span className="px-2 py-1 text-xs md:text-sm font-medium bg-yellow-500/20 text-yellow-500 rounded-md backdrop-blur-md border border-yellow-500/20">
                                ⭐ {item.vote_average.toFixed(1)}
                            </span>
                        )}
                        {item.year && (
                            <span className="px-2 py-1 text-xs md:text-sm font-medium text-neutral-400 bg-neutral-800/50 rounded-md backdrop-blur-md">
                                {item.year}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-3 md:mb-5 leading-tight tracking-tight drop-shadow-xl">
                        {item.title}
                    </h1>

                    {/* Overview */}
                    <p className="text-sm md:text-lg text-neutral-300 line-clamp-3 md:line-clamp-4 max-w-2xl mb-6 md:mb-8 font-light leading-relaxed drop-shadow-md">
                        {item.overview || "No description available for this title."}
                    </p>

                    {/* Buttons */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-4">
                        <button
                            onClick={handlePlay}
                            className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm md:text-base transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
                        >
                            <Play className={cn("w-5 h-5 fill-current", playbackState?.isResume && "fill-transparent stroke-[3px]")} />
                            {playbackState?.label || 'Play Now'}
                        </button>
                        <button
                            onClick={handleDetails}
                            className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white/10 text-white backdrop-blur-md border border-white/20 rounded-xl font-semibold text-sm md:text-base transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
                        >
                            <Info className="w-5 h-5" />
                            More Info
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
