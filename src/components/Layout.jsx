import React, { useState } from 'react';
import { Home, Film, Tv, Folder, Settings, Search, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { Sidebar, SidebarBody, SidebarLink } from './ui/sidebar';
import { Input } from './ui/input';

const TitleBar = () => {
    const isMac = typeof process !== 'undefined' && process.platform === 'darwin';

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

    return (
        <header
            className="h-20 flex items-center justify-between px-6 sticky top-0 z-40 bg-background/50 backdrop-blur-md select-none"
            style={{ WebkitAppRegion: 'drag' }}
            onDoubleClick={handleMaximize}
        >
            {/* Left Section: Mac Traffic Lights Spacer or Windows Logo */}
            <div className="flex items-center w-1/3">
                {isMac ? (
                    <div className="w-20" /> // Spacer for traffic lights
                ) : (
                    <div className="flex items-center gap-2 pl-2" style={{ WebkitAppRegion: 'no-drag' }}>
                        {/* Windows Controls Left? No usually right. Let's just keep spacer or nothing if logo is in sidebar */}
                    </div>
                )}
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 flex justify-center max-w-xl mx-auto" style={{ WebkitAppRegion: 'no-drag' }}>
                <div className="relative w-full">
                    <Input
                        type="text"
                        placeholder="Search movies, collections..."
                        className="w-full pl-10 bg-neutral-200 dark:bg-black/20 border-transparent focus:border-primary transition-all duration-300 rounded-full"
                    />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {/* Right Section: User Profile & Windows Controls */}
            <div className="flex items-center justify-end w-1/3 gap-4">
                {/* User Profile - No Drag to allow clicking */}
                <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[2px] cursor-pointer hover:scale-105 transition-transform">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                            <img src="https://github.com/shadcn.png" alt="User" />
                        </div>
                    </div>
                </div>

                {/* Windows Controls */}
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
                    <div>
                        <SidebarLink
                            link={{
                                label: "Yogesh",
                                href: "#",
                                icon: (
                                    <img
                                        src="https://github.com/shadcn.png"
                                        className="h-7 w-7 flex-shrink-0 rounded-full"
                                        width={50}
                                        height={50}
                                        alt="Avatar"
                                    />
                                ),
                            }}
                        />
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
