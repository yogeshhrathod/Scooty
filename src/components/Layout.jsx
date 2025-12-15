import React, { useState } from 'react';
import { Home, Film, Tv, Folder, Settings, Search, Tags, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Sidebar, SidebarBody, SidebarLink } from './ui/sidebar';
import { Input } from './ui/input';

import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useRef, useEffect } from 'react';

const TitleBar = () => {
    const isMac = typeof process !== 'undefined' && process.platform === 'darwin';
    const navigate = useNavigate();
    const library = useStore((state) => state.library);
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);

    // Handle Cmd+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === 'Escape') {
                inputRef.current?.blur();
                setIsFocused(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMinimize = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('window-minimize');
        }
    };

    const handleMaximize = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('window-maximize-toggle');
        }
    };

    const handleClose = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('window-close');
        }
    };

    // Filter results with grouping for TV shows
    const results = React.useMemo(() => {
        if (!query || query.length < 2) return [];
        const lowerQuery = query.toLowerCase();

        // 1. First find all matching items
        const rawMatches = library.filter(item => {
            const title = (item.title || item.showTitle || item.name || '').toLowerCase();
            return title.includes(lowerQuery);
        });

        // 2. Group TV items by Show Title
        const uniqueMatches = [];
        const processedShows = new Set();
        const processedMovies = new Set();

        rawMatches.forEach(item => {
            if (item.type === 'tv') {
                const showName = item.showTitle || item.title;
                const distinctKey = `${showName}-${item.year || 'unknown'}`;

                if (!processedShows.has(distinctKey)) {
                    processedShows.add(distinctKey);
                    // Use the item as a representative for the show, but ensure title is the show title
                    uniqueMatches.push({
                        ...item,
                        title: showName, // Display show title, not episode title
                        originalItem: item
                    });
                }
            } else {
                const key = item.id || item.tmdbId || item.path;
                if (!processedMovies.has(key)) {
                    processedMovies.add(key);
                    uniqueMatches.push(item);
                }
            }
        });

        return uniqueMatches.slice(0, 8);
    }, [query, library]);

    const handleResultClick = (item) => {
        setQuery('');
        setIsFocused(false);
        if (item.type === 'tv') {
            navigate(`/tv/${item.tmdbId || encodeURIComponent(item.showTitle || item.title)}`);
        } else {
            navigate(`/details/${item.tmdbId || item.id || encodeURIComponent(item.path)}`);
        }
    };

    return (
        <header
            className="h-20 flex items-center justify-between px-6 sticky top-0 z-50 bg-background/80 backdrop-blur-xl select-none border-b border-white/5"
            style={{ WebkitAppRegion: 'drag' }}
            onDoubleClick={handleMaximize}
        >
            {/* Left Section: Spacer */}
            <div className="flex items-center w-1/4">
                {isMac && <div className="w-20" />}
            </div>

            {/* Center: Enhanced Search Bar */}
            <div className="flex-1 flex justify-center max-w-xl mx-auto relative" style={{ WebkitAppRegion: 'no-drag' }} ref={wrapperRef}>
                <div className={`relative w-full transition-all duration-300 ${isFocused ? 'scale-100' : 'scale-95 opacity-80'}`}>
                    <div className="relative group">
                        <Search className={`absolute left-4 top-2.5 w-4 h-4 transition-colors ${isFocused ? 'text-primary' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
                        <Input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            placeholder="Search library..."
                            className="w-full pl-10 pr-12 h-10 bg-neutral-900/50 border border-white/10 focus:border-primary/50 focus:bg-neutral-900 focus:ring-1 focus:ring-primary/50 rounded-lg transition-all duration-300 text-sm placeholder:text-neutral-600 shadow-md"
                        />
                        <div className="absolute right-3 top-2.5 flex items-center gap-1 pointer-events-none">
                            <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-neutral-400">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>
                    </div>

                    {/* Search Results Dropdown */}
                    {isFocused && query.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {results.length > 0 ? (
                                <div className="p-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    <div className="text-[10px] font-bold text-neutral-500 px-3 py-2 uppercase tracking-wider">Top Results</div>
                                    {results.map((item) => (
                                        <button
                                            key={item.id || item.path}
                                            onClick={() => handleResultClick(item)}
                                            className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 transition-colors group text-left"
                                        >
                                            <div className="w-8 h-12 bg-neutral-800 rounded overflow-hidden shrink-0 shadow-sm border border-white/5">
                                                {item.poster_path ? (
                                                    <img src={item.poster_path} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {item.type === 'tv' ? <Tv className="w-3 h-3 text-neutral-600" /> : <Film className="w-3 h-3 text-neutral-600" />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-neutral-200 group-hover:text-white truncate">
                                                    {item.showTitle || item.title || item.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                                                    <span className={`px-1 rounded ${item.type === 'tv' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                        {item.type === 'tv' ? 'TV' : 'Movie'}
                                                    </span>
                                                    <span>{item.year || (item.release_date || '').substring(0, 4)}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-neutral-600 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-neutral-500 text-sm">
                                    <p>No results found for "{query}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Section: Window Controls */}
            <div className="flex items-center justify-end w-1/4 gap-4">
                {!isMac && (
                    <div className="flex items-center gap-3 pl-4 border-l border-white/10 ml-4" style={{ WebkitAppRegion: 'no-drag' }}>
                        <button onClick={handleMinimize} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                            <div className="w-3 h-0.5 bg-white group-hover:bg-primary" />
                        </button>
                        <button onClick={handleMaximize} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                            <div className="w-3 h-3 border border-white group-hover:border-primary" />
                        </button>
                        <button onClick={handleClose} className="p-2 hover:bg-red-500/20 rounded-full transition-colors group">
                            <div className="relative w-3 h-3">
                                <div className="absolute inset-0 rotate-45 bg-white group-hover:bg-red-500 h-[1px] top-1.5" />
                                <div className="absolute inset-0 -rotate-45 bg-white group-hover:bg-red-500 h-[1px] top-1.5" />
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export const Layout = ({ children }) => {
    const [open, setOpen] = useState(false);

    const links = [
        { label: 'Home', href: '/', icon: <Home className="h-5 w-5 flex-shrink-0" /> },
        { label: 'Movies', href: '/movies', icon: <Film className="h-5 w-5 flex-shrink-0" /> },
        { label: 'TV Shows', href: '/tv', icon: <Tv className="h-5 w-5 flex-shrink-0" /> },
        { label: 'Genres', href: '/genres', icon: <Tags className="h-5 w-5 flex-shrink-0" /> },
        { label: 'Library', href: '/library', icon: <Folder className="h-5 w-5 flex-shrink-0" /> },
        { label: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5 flex-shrink-0" /> },
    ];

    return (
        <div className="flex flex-col md:flex-row bg-background w-full h-screen overflow-hidden">
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="flex flex-col">
                            {/* Logo */}
                            <div className="font-bold text-xl mb-6 flex items-center gap-2 overflow-hidden">
                                <img src="/logo.png" alt="Scooty Logo" className="h-8 w-8 rounded-lg flex-shrink-0 object-cover" />
                                <span className={cn("text-neutral-900 dark:text-white transition-opacity duration-200 whitespace-nowrap", open ? "opacity-100" : "opacity-0 hidden")}>
                                    Scooty
                                </span>
                            </div>

                            {/* Links */}
                            <div className="flex flex-col gap-2">
                                {links.map((link, idx) => (
                                    <SidebarLink key={idx} link={link} />
                                ))}
                            </div>
                        </div>
                    </div>

                </SidebarBody>
            </Sidebar>

            <main className="flex-1 flex flex-col h-full relative overflow-y-auto">
                <TitleBar />
                <div className="p-4 md:p-8 lg:px-12 xl:px-16 2xl:px-20 animate-in fade-in duration-500 w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
