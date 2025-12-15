import React from 'react';
import { motion } from 'framer-motion';
import { Play, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export const Hero = ({ item, className }) => {
    const navigate = useNavigate();

    if (!item) return null;

    const handlePlay = (e) => {
        e.stopPropagation();
        navigate(`/player/${encodeURIComponent(item.path)}`);
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
                    <div className="flex items-center space-x-2 mb-3 md:mb-4">
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
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={handlePlay}
                            className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm md:text-base transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Play Now
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
