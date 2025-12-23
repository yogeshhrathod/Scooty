import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { MovieCard } from '../components/MovieCard';
import { useNavigate } from 'react-router-dom';
import { Search, Film } from 'lucide-react';
import { Input } from '../components/ui/input';

export const Movies = () => {
    const library = useStore((state) => state.library) || [];
    const navigate = useNavigate();
    const [search, setSearch] = React.useState('');

    // Filter only movies (exclude TV shows)
    const moviesOnly = useMemo(() => {
        return library.filter(item => item.type !== 'tv');
    }, [library]);

    const filteredMovies = useMemo(() => {
        if (!search) return moviesOnly;
        return moviesOnly.filter(item =>
            item.title?.toLowerCase().includes(search.toLowerCase()) ||
            item.name?.toLowerCase().includes(search.toLowerCase())
        );
    }, [moviesOnly, search]);

    return (
        <div className="min-h-screen pb-20 px-2 sm:px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 leading-tight">
                        Movies
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-muted-foreground text-sm sm:text-base">
                            {filteredMovies.length} movies
                        </p>
                    </div>
                </div>

                <div className="relative w-full md:w-72">
                    <Input
                        type="text"
                        placeholder="Search movies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-muted/50 focus:bg-muted transition-colors"
                    />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {filteredMovies.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Film className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium text-foreground mb-2">No movies found</h3>
                    <p className="text-muted-foreground max-w-sm text-sm sm:text-base">
                        {search ? "Try adjusting your search terms." : "Add some folders with movies in Settings to get started."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 4k:grid-cols-12 gap-4 md:gap-6">
                    {filteredMovies.map((item) => (
                        <MovieCard
                            key={item.id || item.tmdbId || item.path}
                            item={item}
                            title={item.title}
                            year={item.year}
                            posterPath={item.poster_path}
                            onClick={() => navigate(`/details/${item.tmdbId || item.id || encodeURIComponent(item.path)}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
