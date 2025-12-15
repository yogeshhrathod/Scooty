import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

// A simple but elegant Movie Card with a hover effect
// We can upgrade this to use 3D Card later if performance allows, 
// but for a grid of many items, a simple scale/glow is better.

export const MovieCard = ({ title, posterPath, year, className, onClick, progress = 0 }) => {
    return (
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
                    <div className="flex h-full items-center justify-center bg-zinc-800">
                        <span className="text-zinc-500">No Image</span>
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
    );
};
