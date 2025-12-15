import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Play, ArrowLeft, Clock, Calendar, Star, ChevronRight, Tv, Info, User, Youtube, EyeOff, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MovieCard } from '../components/MovieCard';

// Quality Badge Component
const QualityBadge = ({ label, color = "bg-white/10" }) => (
    <span className={`px-2 py-0.5 ${color} rounded text-[10px] font-bold uppercase tracking-wider`}>
        {label}
    </span>
);

export const TvShowDetails = () => {
    const { showId } = useParams();
    const navigate = useNavigate();
    const library = useStore((state) => state.library);
    const ignorePath = useStore((state) => state.ignorePath);
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

    const handleExclude = () => {
        if (window.confirm("Are you sure you want to exclude this show from your library?")) {
            if (show) ignorePath(show.path);
            navigate(-1);
        }
    };

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
    const sortedSeasons = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));

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
                        className="w-48 md:w-64 lg:w-72 xl:w-80 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 mx-auto lg:mx-0 relative"
                    >
                        {show.poster_path ? (
                            <img src={show.poster_path} alt={show.showTitle || show.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full aspect-[2/3] bg-neutral-800 flex items-center justify-center text-neutral-500">
                                No Poster
                            </div>
                        )}
                        {/* Status Badge */}
                        {show.status && (
                            <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10">
                                {show.status}
                            </div>
                        )}
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 space-y-5 text-center lg:text-left">
                        {/* Quality & Type Badges */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-wrap gap-2 justify-center lg:justify-start items-center"
                        >
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium border border-orange-500/20">
                                <Tv className="w-3 h-3" /> TV Series
                            </span>
                            {qualityBadges.map((badge, idx) => (
                                <QualityBadge key={idx} label={badge.label} color={badge.color} />
                            ))}
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
                            {/* Certification */}
                            {show.certification && (
                                <span className="px-2 py-0.5 border border-white/30 rounded text-white/80 text-xs font-bold">
                                    {show.certification}
                                </span>
                            )}

                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                {show.year || "Unknown Year"}
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                {sortedSeasons.length} Season{sortedSeasons.length !== 1 ? 's' : ''} • {totalEpisodes} Episode{totalEpisodes !== 1 ? 's' : ''}
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
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/genres/${encodeURIComponent(genre)}`);
                                        }}
                                        className="px-4 py-1.5 bg-white/5 hover:bg-primary/20 hover:border-primary/50 transition-colors rounded-full text-sm text-white/80 hover:text-white border border-white/10 cursor-pointer"
                                    >
                                        {genre}
                                    </button>
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
                                    const epTitleStr = ep.title && ep.title !== `Episode ${ep.episode}` && ep.title !== ep.name ? ` - ${ep.title}` : '';
                                    const title = encodeURIComponent(`${show.showTitle || show.title} - S${ep.season || 1}E${ep.episode || 1}${epTitleStr}`);
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

                            {/* Trailer Button */}
                            {show.trailer && (
                                <button
                                    onClick={() => window.open(show.trailer, '_blank')}
                                    className="flex items-center gap-2 px-6 py-4 rounded-full font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-900/40"
                                >
                                    <Youtube className="w-5 h-5" />
                                    Trailer
                                </button>
                            )}

                            <button
                                onClick={handleExclude}
                                className="p-4 rounded-full font-medium border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors group"
                                title="Exclude from Library"
                            >
                                <EyeOff className="w-6 h-6" />
                            </button>
                        </motion.div>
                    </div>
                </div>

                {/* Seasons & Episodes List */}
                <div className="mt-16 pb-20 max-w-5xl">
                    <h2 className="text-2xl font-bold text-white mb-8">Episodes</h2>
                    <div className="space-y-12">
                        {sortedSeasons.map((seasonNum) => {
                            const eps = seasons[seasonNum];
                            return (
                                <div key={seasonNum}>
                                    <div className="flex items-center gap-3 mb-6 sticky top-0 bg-black/90 backdrop-blur-sm z-20 py-4 border-b border-white/5">
                                        <div className="w-1 h-6 bg-primary rounded-full" />
                                        <h3 className="text-xl font-semibold text-white">Season {seasonNum}</h3>
                                        <span className="text-sm text-neutral-500">{eps.length} Episodes</span>
                                    </div>
                                    <div className="grid gap-4">
                                        {eps.map((ep, idx) => {
                                            const isWatched = history[ep.path]?.progress > (ep.duration * 0.9) || false;
                                            const progress = history[ep.path]?.progress || 0;

                                            // Determine correct title and overview (fallback to generic if not improved)
                                            const epTitle = ep.title !== ep.name ? ep.title : `Episode ${ep.episode}`;
                                            const epOverview = ep.overview && ep.overview !== show.overview ? ep.overview : `Episode ${ep.episode} from Season ${ep.season}`;

                                            return (
                                                <motion.div
                                                    key={ep.id || ep.path}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => {
                                                        const playPath = encodeURIComponent(ep.path || ep.id || 'mock');
                                                        const epTitleStr = ep.title && ep.title !== `Episode ${ep.episode}` && ep.title !== ep.name ? ` - ${ep.title}` : '';
                                                        const title = encodeURIComponent(`${show.showTitle || show.title} - S${ep.season}E${ep.episode}${epTitleStr}`);
                                                        navigate(`/play/${playPath}?title=${title}`);
                                                    }}
                                                    className="group flex gap-4 md:gap-6 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden"
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="w-32 md:w-48 aspect-video shrink-0 rounded-lg overflow-hidden bg-neutral-900 relative">
                                                        {ep.still_path || show.backdrop_path ? (
                                                            <img
                                                                src={ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : (show.backdrop_path || show.poster_path)}
                                                                alt={`S${ep.season}E${ep.episode}`}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                                                <Tv className="w-8 h-8 opacity-20" />
                                                            </div>
                                                        )}

                                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                                                <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                                                            </div>
                                                        </div>

                                                        {/* Progress bar */}
                                                        {progress > 0 && (
                                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                                                <div
                                                                    className="h-full bg-primary"
                                                                    style={{ width: `${Math.min(100, (progress / (ep.duration || 1)) * 100)}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 flex flex-col justify-center min-w-0">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <h4 className="text-base md:text-lg font-semibold text-white group-hover:text-primary transition-colors truncate pr-4">
                                                                    {ep.episode}. {epTitle}
                                                                </h4>
                                                                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 mb-2">
                                                                    {ep.air_date && <span>{ep.air_date}</span>}
                                                                    {ep.runtime && <span>• {ep.runtime} min</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-neutral-400 line-clamp-2 md:line-clamp-3">
                                                            {epOverview}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};
