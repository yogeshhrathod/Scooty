import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { MovieCard } from '../components/MovieCard';
import { useNavigate } from 'react-router-dom';
import { Search, Tv } from 'lucide-react';
import { Input } from '../components/ui/input';

export const TvShows = () => {
    const library = useStore((state) => state.library) || [];
    const navigate = useNavigate();
    const [search, setSearch] = React.useState('');

    // Group TV shows by tmdbId or showTitle - only one card per show
    const groupedShows = useMemo(() => {
        const map = new Map();
        library
            .filter(item => item.type === 'tv')
            .forEach(item => {
                // Use tmdbId if available, otherwise fall back to parsedShowTitle for consistent grouping
                // parsedShowTitle is normalized (lowercase, no special chars) for better matching
                const key = item.tmdbId
                    ? `tv-${item.tmdbId}`
                    : item.parsedShowTitle
                        ? `tv-parsed-${item.parsedShowTitle}`
                        : `tv-${(item.showTitle || item.title).toLowerCase().replace(/[^a-z0-9]/g, '')}`;

                if (!map.has(key)) {
                    map.set(key, {
                        ...item,
                        title: item.showTitle || item.title, // Display Show Title
                        isSeriesGroup: true,
                        groupKey: key
                    });
                }
            });
        return Array.from(map.values());
    }, [library]);

    const filteredShows = useMemo(() => {
        if (!search) return groupedShows;
        return groupedShows.filter(item =>
            item.title?.toLowerCase().includes(search.toLowerCase()) ||
            item.showTitle?.toLowerCase().includes(search.toLowerCase())
        );
    }, [groupedShows, search]);

    return (
        <div className="min-h-screen pb-20 px-2 sm:px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 leading-tight">
                        TV Shows
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-muted-foreground text-sm sm:text-base">
                            {filteredShows.length} shows
                        </p>
                    </div>
                </div>

                <div className="relative w-full md:w-72">
                    <Input
                        type="text"
                        placeholder="Search TV shows..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-muted/50 focus:bg-muted transition-colors"
                    />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {filteredShows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Tv className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium text-foreground mb-2">No TV shows found</h3>
                    <p className="text-muted-foreground max-w-sm text-sm sm:text-base">
                        {search ? "Try adjusting your search terms." : "Add some folders with TV shows in Settings to get started."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 4k:grid-cols-12 gap-4 md:gap-6">
                    {filteredShows.map((item) => (
                        <MovieCard
                            key={item.groupKey || item.tmdbId || item.path}
                            item={item}
                            title={item.title}
                            year={item.year}
                            posterPath={item.poster_path}
                            onClick={() => navigate(`/tv/${item.tmdbId || encodeURIComponent(item.showTitle || item.title)}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
