import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { MovieCard } from '../components/MovieCard';
import { useNavigate, useParams } from 'react-router-dom';
import { Tags, ArrowLeft, Film } from 'lucide-react';
import { motion } from 'framer-motion';

export const Genres = () => {
    const { genreName } = useParams();
    const navigate = useNavigate();
    const library = useStore((state) => state.library) || [];

    // Get all unique genres from the library
    const allGenres = useMemo(() => {
        const genres = new Set();
        library.forEach(item => {
            if (item.genres && Array.isArray(item.genres)) {
                item.genres.forEach(g => genres.add(g));
            }
        });
        return Array.from(genres).sort();
    }, [library]);

    // Filter content by selected genre and group TV shows
    const filteredContent = useMemo(() => {
        if (!genreName) return [];

        const uniqueItems = new Map();

        library.forEach(item => {
            if (item.genres && Array.isArray(item.genres) && item.genres.includes(genreName)) {
                if (item.type === 'tv') {
                    // Group TV shows by ID or Title
                    const key = item.tmdbId || item.showTitle || item.title;
                    if (!uniqueItems.has(key)) {
                        uniqueItems.set(key, item);
                    }
                } else {
                    // Movies are always unique by ID or Path, but let's use ID/Path just in case
                    const key = item.id || item.tmdbId || item.path;
                    if (!uniqueItems.has(key)) {
                        uniqueItems.set(key, item);
                    }
                }
            }
        });

        return Array.from(uniqueItems.values());
    }, [library, genreName]);

    if (genreName) {
        return (
            <div className="min-h-screen pb-20 px-2 sm:px-4">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/genres')}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-foreground" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{genreName}</h1>
                        <p className="text-muted-foreground text-sm">{filteredContent.length} titles</p>
                    </div>
                </div>

                {filteredContent.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                        <Film className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-medium text-foreground mb-2">No titles found</h3>
                        <p className="text-muted-foreground">No content found in this genre.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
                        {filteredContent.map((item) => (
                            <MovieCard
                                key={item.id || item.tmdbId || item.path}
                                item={item}
                                title={item.showTitle || item.title}
                                year={item.year}
                                posterPath={item.poster_path}
                                onClick={() => navigate(item.type === 'tv'
                                    ? `/tv/${item.tmdbId || encodeURIComponent(item.showTitle || item.title)}`
                                    : `/details/${item.tmdbId || item.id || encodeURIComponent(item.path)}`
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 px-2 sm:px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 mb-2">
                    Genres
                </h1>
                <p className="text-muted-foreground">Browse your library by genre</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {allGenres.map((genre, idx) => {
                    // Count items in this genre
                    const itemsInGenre = library.filter(i => i.genres?.includes(genre));
                    const count = itemsInGenre.length;

                    // Find a representative image (prefer backdrop, then poster)
                    const representativeItem = itemsInGenre.find(i => i.backdrop_path) || itemsInGenre.find(i => i.poster_path);
                    const bgImage = representativeItem?.backdrop_path || representativeItem?.poster_path;

                    return (
                        <motion.div
                            key={genre}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => navigate(`/genres/${encodeURIComponent(genre)}`)}
                            className="relative h-40 overflow-hidden rounded-xl cursor-pointer group border border-border hover:border-primary/50 transition-all duration-300 shadow-sm"
                        >
                            {/* Background Image */}
                            {bgImage && (
                                <div className="absolute inset-0">
                                    <img
                                        src={bgImage}
                                        alt={genre}
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-70 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                                    <div className="absolute inset-0 bg-background/20 group-hover:bg-transparent transition-colors" />
                                </div>
                            )}

                            {/* Content */}
                            <div className="absolute inset-x-0 bottom-0 p-6 z-10 flex items-end justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{genre}</h3>
                                    <div className="flex items-center gap-2">
                                        <Tags className="w-3 h-3 text-primary" />
                                        <span className="text-xs font-bold text-muted-foreground">{count} titles</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {allGenres.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <Tags className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium text-foreground mb-2">No genres found</h3>
                    <p className="text-muted-foreground">Add content to your library to see genres.</p>
                </div>
            )}
        </div>
    );
};
