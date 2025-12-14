import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { MovieCard } from '../components/MovieCard';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '../components/ui/input';

export const Library = () => {
    const library = useStore((state) => state.library) || [];
    const navigate = useNavigate();
    const [search, setSearch] = React.useState('');

    const filteredLibrary = useMemo(() => {
        if (!search) return library;
        return library.filter(item =>
            item.title?.toLowerCase().includes(search.toLowerCase()) ||
            item.name?.toLowerCase().includes(search.toLowerCase())
        );
    }, [library, search]);

    return (
        <div className="min-h-screen pb-20">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 px-2">
                <div>
                    {/* "My Library" text with Aceternity gradient style if preferred, keeping existing gradient for now */}
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
                        My Library
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-muted-foreground">
                            {filteredLibrary.length} titles
                        </p>
                        <div className="h-4 w-[1px] bg-neutral-700" />
                        <button
                            onClick={() => useStore.getState().resyncLibrary()}
                            className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                            title="Resync Library Metadata"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
                            Resync
                        </button>
                    </div>
                </div>

                <div className="relative w-full md:w-72">
                    <Input
                        type="text"
                        placeholder="Filter library..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-black/50"
                    />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {filteredLibrary.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-neutral-500" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No media found</h3>
                    <p className="text-muted-foreground max-w-sm">
                        {search ? "Try adjusting your search terms." : "Add some folders or FTP sources in Settings to get started."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-6 px-2">
                    {filteredLibrary.map((item) => (
                        <MovieCard
                            key={item.id || item.path}
                            title={item.title || item.name}
                            year={item.year}
                            posterPath={item.poster}
                            onClick={() => navigate(`/details/${item.id || encodeURIComponent(item.path)}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
