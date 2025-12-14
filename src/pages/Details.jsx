import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Play, ArrowLeft, Clock, Calendar, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export const Details = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const library = useStore((state) => state.library);

    // Find item by ID or Path (since ID might be path in some cases)
    const item = library.find(i => (i.id && String(i.id) === id) || i.path === decodeURIComponent(id)) || {
        // Mock fallback if not found (for demo)
        title: "Unknown Title",
        description: "No description available.",
        year: "----",
        poster: null,
        backdrop: null
    };

    return (
        <div className="relative min-h-screen bg-black/90 -m-8">
            {/* Backdrop Image */}
            <div className="absolute inset-0 h-[70vh] w-full overflow-hidden">
                {item.backdrop || item.poster ? (
                    <img
                        src={item.backdrop || item.poster}
                        alt="Backdrop"
                        className="w-full h-full object-cover opacity-40 mask-image-b"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-b from-primary/20 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            <div className="relative z-10 px-8 pt-8 md:px-16 md:pt-16 max-w-7xl mx-auto flex flex-col min-h-screen">
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
                        className="w-48 md:w-72 shrink-0 rounded-xl overflow-hidden shadow-2xl shadow-primary/20 border border-white/10"
                    >
                        {item.poster ? (
                            <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
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
                            className="text-4xl md:text-6xl font-bold text-white tracking-tight"
                        >
                            {item.title || item.name}
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-6 text-sm md:text-base text-neutral-300"
                        >
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                {item.year || "Unknown Year"}
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                {item.duration || "1h 45m"} {/* Mock duration if missing */}
                            </span>
                            <span className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-primary" />
                                {item.rating || "8.5"} {/* Mock rating if missing */}
                            </span>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg text-neutral-400 leading-relaxed max-w-2xl"
                        >
                            {item.description || item.plot || "A captivating story that takes you on a journey through time and space. Explore the depths of human emotion and visual spectacle in this masterpiece."}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-4 pt-4"
                        >
                            <button
                                onClick={() => navigate(`/play/${encodeURIComponent(item.id || item.path || 'mock')}`)}
                                className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10"
                            >
                                <Play className="w-5 h-5 fill-black" />
                                Play Now
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
