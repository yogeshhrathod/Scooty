import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Play, ArrowLeft, Clock, Calendar, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export const Details = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const library = useStore((state) => state.library);

    // Find item by ID or Path (since ID might be path in some cases)
    const item = useMemo(() => {
        if (!library || library.length === 0 || !id) return null;

        const decodedId = decodeURIComponent(id);

        // Try to find by various identifiers
        const found = library.find(i =>
            (i.id && String(i.id) === id) ||
            (i.id && String(i.id) === decodedId) ||
            (i.tmdbId && String(i.tmdbId) === id) ||
            (i.tmdbId && String(i.tmdbId) === decodedId) ||
            i.path === id ||
            i.path === decodedId
        );

        return found;
    }, [library, id]);

    // If it's a TV show, redirect to TV show details page
    React.useEffect(() => {
        if (item && item.type === 'tv') {
            navigate(`/tv/${item.tmdbId || encodeURIComponent(item.showTitle || item.title)}`, { replace: true });
        }
    }, [item, navigate]);

    if (!item) {
        return (
            <div className="relative min-h-screen bg-black/90 -m-8 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Item Not Found</h1>
                    <p className="text-neutral-400 mb-6">The content you're looking for doesn't exist in your library.</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 bg-primary rounded-full text-white hover:bg-primary/80 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-black/90 -m-8">
            {/* Backdrop Image */}
            <div className="absolute inset-0 h-[60vh] lg:h-[70vh] xl:h-[75vh] w-full overflow-hidden">
                {item.backdrop_path || item.poster_path ? (
                    <img
                        src={item.backdrop_path || item.poster_path}
                        alt="Backdrop"
                        className="w-full h-full object-cover opacity-40 mask-image-b"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-b from-primary/20 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            <div className="relative z-10 px-6 pt-6 md:px-12 md:pt-12 lg:px-16 xl:px-24 2xl:px-32 flex flex-col min-h-screen">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 w-fit"
                >
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>

                <div className="flex flex-col md:flex-row gap-8 md:gap-12 mt-auto pb-20">
                    {/* Poster */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="w-48 md:w-64 lg:w-72 xl:w-80 2xl:w-96 shrink-0 rounded-xl overflow-hidden shadow-2xl shadow-primary/20 border border-white/10"
                    >
                        {item.poster_path ? (
                            <img src={item.poster_path} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full aspect-[2/3] bg-neutral-800 flex items-center justify-center text-neutral-500">
                                No Poster
                            </div>
                        )}
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 space-y-6 pt-4">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight"
                        >
                            {item.title || item.name}
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex flex-wrap items-center gap-4 md:gap-6 text-sm md:text-base lg:text-lg text-neutral-300"
                        >
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                {item.year || item.release_date?.substring(0, 4) || "Unknown Year"}
                            </span>
                            {item.runtime && (
                                <span className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    {Math.floor(item.runtime / 60)}h {item.runtime % 60}m
                                </span>
                            )}
                            {item.vote_average > 0 && (
                                <span className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-primary" />
                                    {item.vote_average.toFixed(1)}
                                </span>
                            )}
                        </motion.div>

                        {/* Genres */}
                        {item.genres && item.genres.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="flex flex-wrap gap-2"
                            >
                                {item.genres.map((genre, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/80">
                                        {genre}
                                    </span>
                                ))}
                            </motion.div>
                        )}

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-base md:text-lg lg:text-xl text-neutral-400 leading-relaxed max-w-4xl"
                        >
                            {item.overview || item.description || item.plot || "No description available."}
                        </motion.p>

                        {/* Cast */}
                        {item.cast && item.cast.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="text-sm text-neutral-500"
                            >
                                <span className="text-neutral-400">Cast:</span> {item.cast.join(', ')}
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-4 pt-4"
                        >
                            <button
                                onClick={() => {
                                    const playPath = encodeURIComponent(item.path || item.id || 'mock');
                                    const title = encodeURIComponent(item.title || item.name || 'Video');
                                    navigate(`/play/${playPath}?title=${title}`);
                                }}
                                className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10"
                            >
                                <Play className="w-5 h-5 fill-black" />
                                Play Movie
                            </button>
                            <button className="px-8 py-3 rounded-full font-medium border border-white/20 hover:bg-white/10 transition-colors text-white">
                                Trailer
                            </button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};
