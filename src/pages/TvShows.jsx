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
                const key = item.tmdbId ? `tv-${item.tmdbId}` : `tv-${item.showTitle || item.title}`;
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
        <div className="min-h-screen pb-20">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 px-2">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
                        TV Shows
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-muted-foreground">
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
                        className="pl-10 bg-black/50"
                    />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {filteredShows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                        <Tv className="w-8 h-8 text-neutral-500" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No TV shows found</h3>
                    <p className="text-muted-foreground max-w-sm">
                        {search ? "Try adjusting your search terms." : "Add some folders with TV shows in Settings to get started."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 4k:grid-cols-12 gap-4 md:gap-6">
                    {filteredShows.map((item) => (
                        <MovieCard
                            key={item.groupKey || item.tmdbId || item.path}
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
