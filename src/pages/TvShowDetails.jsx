import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Play, ArrowLeft, Clock, Calendar, Star, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const TvShowDetails = () => {
    const { showId } = useParams();
    const navigate = useNavigate();
    const library = useStore((state) => state.library);

    // Find all episodes for this show
    const { show, allEpisodes, seasons } = useMemo(() => {
        const decodedId = decodeURIComponent(showId);

        // Find all episodes that belong to this show
        const episodes = library.filter(item =>
            item.type === 'tv' && (
                String(item.tmdbId) === decodedId ||
                item.showTitle === decodedId ||
                item.title === decodedId
            )
        ).sort((a, b) => {
            if (a.season !== b.season) return (a.season || 0) - (b.season || 0);
            return (a.episode || 0) - (b.episode || 0);
        });

        // Use the first episode to get show metadata
        const representativeShow = episodes[0] || null;

        // Group by season
        const seasonMap = episodes.reduce((acc, ep) => {
            const s = ep.season || 1;
            if (!acc[s]) acc[s] = [];
            acc[s].push(ep);
            return acc;
        }, {});

        return {
            show: representativeShow,
            allEpisodes: episodes,
            seasons: seasonMap
        };
    }, [library, showId]);

    if (!show) {
        return (
            <div className="relative min-h-screen bg-black/90 -m-8 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Show Not Found</h1>
                    <p className="text-neutral-400 mb-6">The TV show you're looking for doesn't exist in your library.</p>
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
            <div className="absolute inset-0 h-[50vh] lg:h-[60vh] xl:h-[65vh] w-full overflow-hidden">
                {show.backdrop_path || show.poster_path ? (
                    <img
                        src={show.backdrop_path || show.poster_path}
                        alt="Backdrop"
                        className="w-full h-full object-cover opacity-40"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-b from-primary/20 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            <div className="relative z-10 px-6 pt-6 md:px-12 md:pt-12 lg:px-16 xl:px-24 2xl:px-32">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 w-fit"
                >
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>

                {/* Show Header */}
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 pb-12">
                    {/* Poster */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="w-40 md:w-56 lg:w-64 xl:w-72 2xl:w-80 shrink-0 rounded-xl overflow-hidden shadow-2xl shadow-primary/20 border border-white/10"
                    >
                        {show.poster_path ? (
                            <img src={show.poster_path} alt={show.showTitle || show.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full aspect-[2/3] bg-neutral-800 flex items-center justify-center text-neutral-500">
                                No Poster
                            </div>
                        )}
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 space-y-4 pt-4">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight"
                        >
                            {show.showTitle || show.title}
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-6 text-sm md:text-base text-neutral-300"
                        >
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                {show.year || "Unknown Year"}
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                {Object.keys(seasons).length} Season{Object.keys(seasons).length !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-primary" />
                                {show.vote_average?.toFixed(1) || "N/A"}
                            </span>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-base text-neutral-400 leading-relaxed max-w-2xl"
                        >
                            {show.overview || "No overview available."}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-4 pt-4"
                        >
                            <button
                                onClick={() => {
                                    const ep = allEpisodes[0];
                                    const playPath = encodeURIComponent(ep?.path || ep?.id || 'mock');
                                    const title = encodeURIComponent(`${show.showTitle || show.title} - S${ep?.season || 1}E${ep?.episode || 1}`);
                                    navigate(`/play/${playPath}?title=${title}`);
                                }}
                                className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10"
                            >
                                <Play className="w-5 h-5 fill-black" />
                                Play S{allEpisodes[0]?.season || 1}E{allEpisodes[0]?.episode || 1}
                            </button>
                        </motion.div>
                    </div>
                </div>

                {/* Episodes Section */}
                <div className="pb-20">
                    <h3 className="text-2xl font-bold text-white mb-8">Episodes</h3>
                    <div className="space-y-12">
                        {Object.entries(seasons).map(([seasonNum, eps]) => (
                            <div key={seasonNum}>
                                <h4 className="text-xl font-medium text-white/70 mb-4 ml-1">Season {seasonNum}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                    {eps.map((ep) => (
                                        <motion.div
                                            key={ep.id || ep.path}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => {
                                                const playPath = encodeURIComponent(ep.path || ep.id);
                                                const title = encodeURIComponent(`${show.showTitle || show.title} - S${ep.season || 1}E${ep.episode || 1} - ${ep.title || ''}`);
                                                navigate(`/play/${playPath}?title=${title}`);
                                            }}
                                            className="flex gap-4 p-3 rounded-xl cursor-pointer transition-all border bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-28 lg:w-32 xl:w-36 aspect-video bg-neutral-800 rounded-lg overflow-hidden shrink-0 relative group">
                                                {ep.still_path || ep.backdrop_path || ep.poster_path ? (
                                                    <img
                                                        src={ep.still_path || ep.backdrop_path || ep.poster_path}
                                                        alt={ep.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                                                        No Image
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Play className="w-8 h-8 text-white fill-white" />
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-center min-w-0 flex-1">
                                                <span className="text-sm font-bold text-white truncate pr-2">
                                                    {ep.episode}. {ep.title}
                                                </span>
                                                <span className="text-xs text-neutral-400 line-clamp-2 mt-1">
                                                    {ep.overview || "No overview available."}
                                                </span>
                                            </div>

                                            <ChevronRight className="w-5 h-5 text-neutral-500 self-center flex-shrink-0" />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
