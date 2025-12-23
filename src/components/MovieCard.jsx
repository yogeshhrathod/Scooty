import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { ContextMenu } from './ui/ContextMenu';
import { Play, Info, CheckCircle2, Circle, Star, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

// A simple but elegant Movie Card with a hover effect
// We can upgrade this to use 3D Card later if performance allows, 
// but for a grid of many items, a simple scale/glow is better.

export const MovieCard = ({ title, posterPath, year, className, onClick, progress = 0, item }) => {
    const navigate = useNavigate();
    const toggleFavorite = useStore(state => state.toggleFavorite);
    const favorites = useStore(state => state.favorites) || [];
    const updateHistory = useStore(state => state.updateHistory);
    const ignorePath = useStore(state => state.ignorePath);

    const isFavorite = item && favorites.includes(item.id || item.tmdbId || item.path);

    const handlePlay = () => {
        if (!item) return;
        const playPath = encodeURIComponent(item.path || item.id || 'mock');
        const playTitle = encodeURIComponent(item.title || item.name || 'Video');
        navigate(`/play/${playPath}?title=${playTitle}`);
    };

    const handleViewDetails = () => {
        if (!item) {
            if (onClick) onClick();
            return;
        }
        if (item.type === 'tv') {
            navigate(`/tv/${item.tmdbId || encodeURIComponent(item.showTitle || item.title)}`);
        } else {
            navigate(`/details/${item.tmdbId || item.id || encodeURIComponent(item.path)}`);
        }
    };

    const handleMarkWatched = () => {
        if (!item) return;
        updateHistory(item.path || item.id, { progress: 99.9, duration: 100 }); // Mark as almost finished
    };

    const handleMarkUnwatched = () => {
        if (!item) return;
        updateHistory(item.path || item.id, 0); // Reset progress
    };

    const handleToggleFavorite = () => {
        if (!item) return;
        toggleFavorite(item.id || item.tmdbId || item.path);
    };

    const handleExclude = () => {
        if (!item) return;
        if (window.confirm(`Are you sure you want to remove "${title}" from your library?`)) {
            ignorePath(item.path);
        }
    };

    const menuItems = [
        { label: 'Play', icon: <Play className="w-4 h-4 fill-current" />, onClick: handlePlay },
        { label: 'View Details', icon: <Info className="w-4 h-4" />, onClick: handleViewDetails },
        { separator: true },
        {
            label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
            icon: <Star className={cn("w-4 h-4", isFavorite && "fill-yellow-500 text-yellow-500")} />,
            onClick: handleToggleFavorite
        },
        {
            label: progress > 0 ? 'Mark as Watched' : 'Mark as Watched',
            icon: <CheckCircle2 className="w-4 h-4" />,
            onClick: handleMarkWatched
        },
        progress > 0 && {
            label: 'Clear Progress',
            icon: <Circle className="w-4 h-4" />,
            onClick: handleMarkUnwatched
        },
        { separator: true },
        { label: 'Remove from Library', icon: <Trash2 className="w-4 h-4" />, onClick: handleExclude, variant: 'danger' },
    ].filter(Boolean);

    return (
        <ContextMenu items={menuItems}>
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl lg:rounded-2xl bg-card text-card-foreground shadow-sm transition-all hover:shadow-2xl hover:shadow-primary/10 cursor-pointer ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    className
                )}
                onClick={onClick}
            >
                <div className="aspect-[2/3] w-full overflow-hidden bg-muted relative">
                    {posterPath ? (
                        <img
                            src={posterPath}
                            alt={title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center bg-muted">
                            <span className="text-muted-foreground text-xs uppercase font-bold tracking-widest">No Image</span>
                        </div>
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Progress Bar */}
                    {progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${Math.min(100, progress)}%` }}
                            />
                        </div>
                    )}
                </div>

                <div className="p-3 lg:p-4">
                    <h3 className="line-clamp-1 text-sm lg:text-base font-medium leading-none group-hover:text-primary transition-colors">
                        {title}
                    </h3>
                    {year && (
                        <p className="mt-1 lg:mt-1.5 text-xs lg:text-sm text-muted-foreground">{year}</p>
                    )}
                </div>
            </motion.div>
        </ContextMenu>
    );
};

