import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Play, ArrowLeft, Clock, Calendar, Star, User, Film, Clapperboard, Info, EyeOff, Youtube, DollarSign, Activity, PenTool } from 'lucide-react';
import { motion } from 'framer-motion';
import { MovieCard } from '../components/MovieCard';
import { cn } from '../lib/utils';

// Quality Badge Component
const QualityBadge = ({ label, color = "bg-muted" }) => (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", color)}>
        {label}
    </span>
);

// Actor Card Component
const ActorCard = ({ actor, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + index * 0.05 }}
        className="flex flex-col items-center text-center group cursor-pointer"
    >
        <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden bg-muted border-2 border-transparent group-hover:border-primary transition-colors shadow-lg">
            {actor.profile_path ? (
                <img
                    src={actor.profile_path}
                    alt={actor.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <User className="w-8 h-8 text-muted-foreground" />
                </div>
            )}
        </div>
        <p className="mt-2 text-sm font-medium text-foreground truncate max-w-[100px] lg:max-w-[120px]">{actor.name}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[100px] lg:max-w-[120px]">{actor.character}</p>
    </motion.div>
);

// Info Row Component
const InfoRow = ({ icon: Icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-center gap-3 text-sm">
            <Icon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground">{value}</span>
        </div>
    );
};

export const Details = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const library = useStore((state) => state.library);
    const ignorePath = useStore((state) => state.ignorePath);
    const history = useStore((state) => state.history);
    const updateHistory = useStore((state) => state.updateHistory);

    // Find item by ID or Path
    const item = useMemo(() => {
        if (!library || library.length === 0 || !id) return null;

        const decodedId = decodeURIComponent(id);

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

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount) return null;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    // Get suggestions
    const suggestions = useMemo(() => {
        if (!library || !item) return [];

        // 1. Prioritize official recommendations from TMDB if available (and matches library items)
        if (item.recommendations && item.recommendations.length > 0) {
            const libraryMap = new Map();
            library.forEach(i => {
                if (i.tmdbId) libraryMap.set(String(i.tmdbId), i);
                if (i.title) libraryMap.set(i.title.toLowerCase(), i);
            });

            const matchedRecs = item.recommendations
                .map(rec => libraryMap.get(String(rec.id)) || libraryMap.get(rec.title.toLowerCase()))
                .filter(Boolean)
                .filter(m => m.path !== item.path); // exclude self

            if (matchedRecs.length > 0) return matchedRecs;
        }

        // 2. Fallback to genre matching
        const movies = library.filter(m =>
            m.type !== 'tv' &&
            m.tmdbId !== item.tmdbId &&
            m.path !== item.path
        );

        if (item.genres && item.genres.length > 0) {
            const genreMatches = movies.filter(m =>
                m.genres && m.genres.some(g => item.genres.includes(g))
            );
            if (genreMatches.length >= 4) {
                return genreMatches.slice(0, 8);
            }
        }

        return movies.slice(0, 8);
    }, [library, item]);

    // Check history (Moved up before conditional return)
    const historyItem = history[(item?.path || item?.id)];
    const hasHistory = useMemo(() => {
        if (!historyItem) return false;
        const progress = typeof historyItem === 'number' ? historyItem : historyItem.progress;
        if (progress < 10) return false;
        return progress > 0;
    }, [historyItem]);

    // If it's a TV show, redirect to TV show details page
    React.useEffect(() => {
        if (item && item.type === 'tv') {
            navigate(`/tv/${item.tmdbId || encodeURIComponent(item.showTitle || item.title)}`, { replace: true });
        }
    }, [item, navigate]);

    // Detect quality from filename
    const qualityBadges = useMemo(() => {
        if (!item?.name && !item?.path) return [];
        const filename = (item.name || item.path || '').toLowerCase();
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
        } else if (filename.includes('truehd') || filename.includes('dts-hd') || filename.includes('dts:x')) {
            badges.push({ label: 'HD AUDIO', color: 'bg-green-500/20 text-green-400' });
        }

        if (filename.includes('remux')) {
            badges.push({ label: 'REMUX', color: 'bg-red-500/20 text-red-400' });
        }

        return badges;
    }, [item]);

    if (!item) {
        return (
            <div className="relative min-h-screen bg-background/90 -m-8 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-4">Item Not Found</h1>
                    <p className="text-muted-foreground mb-6">The content you're looking for doesn't exist in your library.</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 bg-primary rounded-full text-primary-foreground hover:opacity-90 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const castDetails = item.castDetails || [];

    const handleExclude = () => {
        if (window.confirm("Are you sure you want to exclude this video from your library? Is this irrelevant?")) {
            ignorePath(item.path);
            navigate(-1);
        }
    };

    return (
        <div className="relative min-h-screen bg-background -m-4 md:-m-8 lg:-mx-12 lg:-my-8 xl:-mx-16 2xl:-mx-20">
            {/* Backdrop Image with Blur */}
            <div className="absolute inset-0 h-[70vh] lg:h-[80vh] w-full overflow-hidden">
                {item.backdrop_path || item.poster_path ? (
                    <>
                        <img
                            src={item.backdrop_path || item.poster_path}
                            alt="Backdrop"
                            className="w-full h-full object-cover opacity-50 scale-105"
                        />
                        <div className="absolute inset-0 backdrop-blur-[2px]" />
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />
            </div>

            <div className="relative z-10 px-6 pt-6 md:px-12 md:pt-12 lg:px-16 xl:px-24 2xl:px-32">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 w-fit group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
                </button>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 mt-8 lg:mt-16">
                    {/* Poster */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="w-56 md:w-72 lg:w-80 xl:w-96 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-background border border-border/50 mx-auto lg:mx-0 relative group"
                    >
                        {item.poster_path ? (
                            <img src={item.poster_path} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center text-muted-foreground">
                                No Poster
                            </div>
                        )}
                        {/* Status Badge */}
                        {item.status && (
                            <div className="absolute top-4 right-4 px-3 py-1 bg-background/60 backdrop-blur-md rounded-full text-xs font-bold text-foreground border border-border">
                                {item.status}
                            </div>
                        )}
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 space-y-6 text-center lg:text-left">
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

                        {/* Title */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight"
                        >
                            {item.title || item.name}
                        </motion.h1>

                        {/* Tagline */}
                        {item.tagline && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-lg md:text-xl text-muted-foreground italic"
                            >
                                "{item.tagline}"
                            </motion.p>
                        )}

                        {/* Meta Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-6 text-sm md:text-base text-muted-foreground"
                        >
                            {/* Certification */}
                            {item.certification && (
                                <span className="px-2 py-0.5 border border-border rounded text-foreground/80 text-xs font-bold">
                                    {item.certification}
                                </span>
                            )}

                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                {item.year || item.release_date?.substring(0, 4) || "Unknown Year"}
                            </span>
                            {item.runtime > 0 && (
                                <span className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    {Math.floor(item.runtime / 60)}h {item.runtime % 60}m
                                </span>
                            )}
                            {item.vote_average > 0 && (
                                <span className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="text-yellow-500 font-semibold">{item.vote_average.toFixed(1)}</span>
                                </span>
                            )}
                        </motion.div>

                        {/* Genres */}
                        {item.genres && item.genres.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="flex flex-wrap gap-2 justify-center lg:justify-start"
                            >
                                {item.genres.map((genre, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/genres/${encodeURIComponent(genre)}`);
                                        }}
                                        className="px-4 py-1.5 bg-muted hover:bg-primary/20 hover:border-primary/50 transition-colors rounded-full text-sm text-foreground/80 hover:text-foreground border border-border cursor-pointer"
                                    >
                                        {genre}
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        {/* Action Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2"
                        >
                            {/* Play / Resume Button */}
                            <button
                                onClick={() => {
                                    const playPath = encodeURIComponent(item.path || item.id || 'mock');
                                    const title = encodeURIComponent(item.title || item.name || 'Video');
                                    navigate(`/play/${playPath}?title=${title}`);
                                }}
                                className="flex items-center gap-3 bg-foreground text-background px-10 py-4 rounded-full font-bold hover:opacity-90 transition-all shadow-lg active:scale-95"
                            >
                                <Play className="w-6 h-6 fill-current" />
                                {hasHistory ? 'Resume' : 'Play'}
                            </button>

                            {/* Trailer Button */}
                            {item.trailer && (
                                <button
                                    onClick={() => window.open(item.trailer, '_blank')}
                                    className="flex items-center gap-2 px-6 py-4 rounded-full font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-900/40"
                                >
                                    <Youtube className="w-5 h-5" />
                                    Trailer
                                </button>
                            )}

                            {/* Start Over Button (only if history exists) */}
                            {hasHistory && (
                                <button
                                    onClick={() => {
                                        if (window.confirm("Start from the beginning?")) {
                                            updateHistory(item.path || item.id, 0); // Reset progress
                                            const playPath = encodeURIComponent(item.path || item.id || 'mock');
                                            const title = encodeURIComponent(item.title || item.name || 'Video');
                                            navigate(`/play/${playPath}?title=${title}`);
                                        }
                                    }}
                                    className="px-6 py-4 rounded-full font-medium border border-border hover:bg-muted transition-colors text-foreground"
                                >
                                    Start Over
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

                        {/* Expanded Credits & Info */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                            className="bg-card rounded-xl p-5 backdrop-blur-sm border border-border"
                        >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {item.director && (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-primary text-sm font-medium"><Clapperboard className="w-3 h-3" /> Director</div>
                                        <div className="text-white text-sm">{item.director}</div>
                                    </div>
                                )}
                                {item.writers && item.writers.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-primary text-sm font-medium"><PenTool className="w-3 h-3" /> Writer</div>
                                        <div className="text-white text-sm">{item.writers.join(', ')}</div>
                                    </div>
                                )}
                                {item.budget > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-primary text-sm font-medium"><DollarSign className="w-3 h-3" /> Budget</div>
                                        <div className="text-white text-sm text-opacity-80">{formatCurrency(item.budget)}</div>
                                    </div>
                                )}
                                {item.revenue > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-primary text-sm font-medium"><Activity className="w-3 h-3" /> Revenue</div>
                                        <div className="text-white text-sm text-opacity-80">{formatCurrency(item.revenue)}</div>
                                    </div>
                                )}
                            </div>
                            {item.production_companies && item.production_companies.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-20">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">Production</div>
                                        <div className="text-foreground text-sm">{item.production_companies.join(', ')}</div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* Description Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-16 max-w-4xl"
                >
                    <h2 className="text-xl font-semibold text-foreground mb-4">Synopsis</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {item.overview || item.description || item.plot || "No description available."}
                    </p>
                </motion.div>

                {/* Cast Section */}
                {castDetails.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 }}
                        className="mt-16"
                    >
                        <h2 className="text-xl font-semibold text-foreground mb-6">Cast</h2>
                        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                            {castDetails.map((actor, idx) => (
                                <ActorCard key={actor.id || idx} actor={actor} index={idx} />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Fallback for simple cast array */}
                {(!castDetails || castDetails.length === 0) && item.cast && item.cast.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 }}
                        className="mt-16"
                    >
                        <h2 className="text-xl font-semibold text-foreground mb-4">Cast</h2>
                        <p className="text-muted-foreground">{item.cast.join(' • ')}</p>
                    </motion.div>
                )}

                {/* More Like This Section */}
                {suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-20 pb-20"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <Film className="text-primary w-6 h-6" />
                            <h2 className="text-xl font-semibold text-foreground">More Like This</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
                            {suggestions.map((movie) => (
                                <MovieCard
                                    key={movie.tmdbId || movie.path}
                                    item={movie}
                                    title={movie.title}
                                    year={movie.year}
                                    posterPath={movie.poster_path}
                                    onClick={() => navigate(`/details/${movie.tmdbId || encodeURIComponent(movie.path)}`)}
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
