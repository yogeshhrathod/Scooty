import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Play, ArrowLeft, Clock, Calendar, Star, ChevronRight, Tv, Info, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { MovieCard } from '../components/MovieCard';

// Quality Badge Component
const QualityBadge = ({ label, color = "bg-white/10" }) => (
    <span className={`px-2 py-0.5 ${color} rounded text-[10px] font-bold uppercase tracking-wider`}>
        {label}
    </span>
);

// Actor Card Component
const ActorCard = ({ actor, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + index * 0.05 }}
        className="flex flex-col items-center text-center group cursor-pointer shrink-0"
    >
        <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden bg-neutral-800 border-2 border-transparent group-hover:border-primary transition-colors shadow-lg">
            {actor.profile_path ? (
                <img
                    src={actor.profile_path}
                    alt={actor.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-800">
                    <User className="w-8 h-8 text-neutral-500" />
                </div>
            )}
        </div>
        <p className="mt-2 text-sm font-medium text-white truncate max-w-[100px] lg:max-w-[120px]">{actor.name}</p>
        <p className="text-xs text-neutral-500 truncate max-w-[100px] lg:max-w-[120px]">{actor.character}</p>
    </motion.div>
);

export const TvShowDetails = () => {
    const { showId } = useParams();
    const navigate = useNavigate();
    const library = useStore((state) => state.library);

    const history = useStore((state) => state.history);

    // Find all episodes for this show
    const { show, allEpisodes, seasons, lastWatchedEpisode } = useMemo(() => {
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

        // Find last watched episode
        let lastWatched = null;
        let recentTime = 0;

        episodes.forEach(ep => {
            const h = history[ep.path];
            if (h) {
                // Check if it's really watched (progress > 10s)
                const progress = typeof h === 'number' ? h : h.progress;
                const lastTime = typeof h === 'number' ? 0 : h.lastWatched || 0;

                if (progress > 10 && lastTime > recentTime) {
                    recentTime = lastTime;
                    lastWatched = ep;
                }
            }
        });

        // If no episode is specifically last watched, default to first episode
        const targetEpisode = lastWatched || episodes[0];

        return {
            show: representativeShow,
            allEpisodes: episodes,
            seasons: seasonMap,
            lastWatchedEpisode: targetEpisode
        };
    }, [library, showId, history]);

    // Get suggested TV shows (other shows in library)
    const suggestions = useMemo(() => {
        if (!library || !show) return [];

        // Get unique TV shows (grouped by tmdbId or showTitle)
        const showsMap = new Map();
        library
            .filter(item => item.type === 'tv')
            .forEach(item => {
                const key = item.tmdbId ? `tv-${item.tmdbId}` : `tv-${item.showTitle || item.title}`;
                // Exclude current show
                if (String(item.tmdbId) === String(show.tmdbId) ||
                    item.showTitle === show.showTitle) {
                    return;
                }
                if (!showsMap.has(key)) {
                    showsMap.set(key, {
                        ...item,
                        title: item.showTitle || item.title,
                        groupKey: key
                    });
                }
            });

        return Array.from(showsMap.values()).slice(0, 8);
    }, [library, show]);

    // Detect quality from filename
    const qualityBadges = useMemo(() => {
        if (!show?.name && !show?.path) return [];
        const filename = (show.name || show.path || '').toLowerCase();
        const badges = [];

        if (filename.includes('2160p') || filename.includes('4k') || filename.includes('uhd')) {
            badges.push({ label: '4K', color: 'bg-amber-500/20 text-amber-400' });
        } else if (filename.includes('1080p')) {
            badges.push({ label: 'HD', color: 'bg-blue-500/20 text-blue-400' });
        } else if (filename.includes('720p')) {
            badges.push({ label: '720p', color: 'bg-white/10 text-white/70' });
        }

        if (filename.includes('hdr') || filename.includes('dv') || filename.includes('dolby vision')) {
            badges.push({ label: 'HDR', color: 'bg-purple-500/20 text-purple-400' });
        }

        if (filename.includes('atmos')) {
            badges.push({ label: 'ATMOS', color: 'bg-cyan-500/20 text-cyan-400' });
        }

        return badges;
    }, [show]);

    if (!show) {
        return (
            <div className="relative min-h-screen bg-black -m-8 flex items-center justify-center">
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

    const totalEpisodes = allEpisodes.length;
    const seasonCount = Object.keys(seasons).length;

    return (
        <div className="relative min-h-screen bg-black -m-8">
            {/* Backdrop Image with Blur */}
            <div className="absolute inset-0 h-[60vh] lg:h-[70vh] w-full overflow-hidden">
                {show.backdrop_path || show.poster_path ? (
                    <>
                        <img
                            src={show.backdrop_path || show.poster_path}
                            alt="Backdrop"
                            className="w-full h-full object-cover opacity-50 scale-105"
                        />
                        <div className="absolute inset-0 backdrop-blur-[2px]" />
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-b from-primary/20 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
            </div>

            <div className="relative z-10 px-6 pt-6 md:px-12 md:pt-12 lg:px-16 xl:px-24 2xl:px-32">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 w-fit group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
                </button>

                {/* Show Header */}
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 mt-8 lg:mt-16">
                    {/* Poster */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="w-48 md:w-64 lg:w-72 xl:w-80 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 mx-auto lg:mx-0"
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
                    <div className="flex-1 space-y-5 text-center lg:text-left">
                        {/* Quality Badges */}
                        {qualityBadges.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-wrap gap-2 justify-center lg:justify-start"
                            >
                                {qualityBadges.map((badge, idx) => (
                                    <QualityBadge key={idx} label={badge.label} color={badge.color} />
                                ))}
                            </motion.div>
                        )}

                        {/* TV Badge */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 justify-center lg:justify-start"
                        >
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">
                                <Tv className="w-3 h-3" /> TV Series
                            </span>
                        </motion.div>

                        {/* Title */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight"
                        >
                            {show.showTitle || show.title}
                        </motion.h1>

                        {/* Meta Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-6 text-sm md:text-base text-neutral-300"
                        >
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                {show.year || "Unknown Year"}
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                {seasonCount} Season{seasonCount !== 1 ? 's' : ''} • {totalEpisodes} Episode{totalEpisodes !== 1 ? 's' : ''}
                            </span>
                            {show.vote_average > 0 && (
                                <span className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="text-yellow-500 font-semibold">{show.vote_average?.toFixed(1)}</span>
                                </span>
                            )}
                        </motion.div>

                        {/* Overview */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-base md:text-lg text-neutral-400 leading-relaxed max-w-3xl mx-auto lg:mx-0"
                        >
                            {show.overview || "No overview available."}
                        </motion.p>

                        {/* Genres */}
                        {show.genres && show.genres.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="flex flex-wrap gap-2 justify-center lg:justify-start"
                            >
                                {show.genres.map((genre, idx) => (
                                    <span key={idx} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 transition-colors rounded-full text-sm text-white/80 border border-white/10">
                                        {genre}
                                    </span>
                                ))}
                            </motion.div>
                        )}

                        {/* Creator & Network Info */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.28 }}
                            className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm"
                        >
                            {show.created_by && show.created_by.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-neutral-500">Created by</span>
                                    <span className="text-white">{show.created_by.join(', ')}</span>
                                </div>
                            )}
                            {show.networks && show.networks.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-neutral-500">Network</span>
                                    <span className="text-white">{show.networks.join(', ')}</span>
                                </div>
                            )}
                        </motion.div>

                        {/* Action Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2"
                        >
                            <button
                                onClick={() => {
                                    const ep = lastWatchedEpisode || allEpisodes[0];
                                    if (!ep) return;
                                    const playPath = encodeURIComponent(ep.path || ep.id || 'mock');
                                    const title = encodeURIComponent(`${show.showTitle || show.title} - S${ep.season || 1}E${ep.episode || 1}`);
                                    navigate(`/play/${playPath}?title=${title}`);
                                }}
                                className="flex items-center gap-3 bg-white text-black px-10 py-4 rounded-full font-bold hover:bg-neutral-200 transition-all shadow-lg shadow-white/20 hover:scale-105"
                            >
                                <Play className="w-6 h-6 fill-black" />
                                {lastWatchedEpisode && history[lastWatchedEpisode.path]
                                    ? `Resume S${lastWatchedEpisode.season}E${lastWatchedEpisode.episode}`
                                    : `Play S${allEpisodes[0]?.season || 1}E${allEpisodes[0]?.episode || 1}`
                                }
                            </button>
                            <button className="p-4 rounded-full font-medium border border-white/20 hover:bg-white/10 transition-colors text-white">
                                <Info className="w-6 h-6" />
                            </button>
                        </motion.div>
                    </div>
                </div>

                {/* Episodes Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-20"
                >
                    <h2 className="text-2xl font-bold text-white mb-8">Episodes</h2>
                    <div className="space-y-12">
                        {Object.entries(seasons).map(([seasonNum, eps]) => (
                            <div key={seasonNum}>
                                <h3 className="text-xl font-medium text-white/70 mb-4 flex items-center gap-3">
                                    <span className="px-3 py-1 bg-white/10 rounded-lg text-sm">Season {seasonNum}</span>
                                    <span className="text-sm text-neutral-500">{eps.length} Episodes</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                    {eps.map((ep, idx) => (
                                        <motion.div
                                            key={ep.id || ep.path}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 + idx * 0.02 }}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => {
                                                const playPath = encodeURIComponent(ep.path || ep.id);
                                                const title = encodeURIComponent(`${show.showTitle || show.title} - S${ep.season || 1}E${ep.episode || 1} - ${ep.title || ''}`);
                                                navigate(`/play/${playPath}?title=${title}`);
                                            }}
                                            className="flex gap-4 p-3 rounded-xl cursor-pointer transition-all border bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10 group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-28 lg:w-32 xl:w-36 aspect-video bg-neutral-800 rounded-lg overflow-hidden shrink-0 relative">
                                                {ep.still_path || ep.backdrop_path || ep.poster_path ? (
                                                    <img
                                                        src={ep.still_path || ep.backdrop_path || ep.poster_path}
                                                        alt={ep.title}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
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
                                                <span className="text-sm font-bold text-white line-clamp-2 pr-2 leading-snug">
                                                    {ep.episode}. {ep.title || `Episode ${ep.episode}`}
                                                </span>
                                                <span className="text-xs text-neutral-400 line-clamp-2 mt-1">
                                                    {ep.overview || "No overview available."}
                                                </span>
                                            </div>

                                            <ChevronRight className="w-5 h-5 text-neutral-500 self-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Cast Section */}
                {show.castDetails && show.castDetails.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-16"
                    >
                        <h2 className="text-xl font-semibold text-white mb-6">Cast</h2>
                        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                            {show.castDetails.map((actor, idx) => (
                                <ActorCard key={actor.id || idx} actor={actor} index={idx} />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* More TV Shows Section */}
                {suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-20 pb-20"
                    >
                        <h2 className="text-xl font-semibold text-white mb-6">More TV Shows</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
                            {suggestions.map((tvShow) => (
                                <MovieCard
                                    key={tvShow.groupKey || tvShow.tmdbId || tvShow.path}
                                    title={tvShow.title}
                                    year={tvShow.year}
                                    posterPath={tvShow.poster_path}
                                    onClick={() => navigate(`/tv/${tvShow.tmdbId || encodeURIComponent(tvShow.showTitle || tvShow.title)}`)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Spacer for pages with no suggestions */}
                {suggestions.length === 0 && <div className="pb-20" />}
            </div>
        </div>
    );
};
