import React, { useState, useEffect } from 'react';
import { Tabs } from '../components/ui/tabs'; // Assuming this component supports the array format used
import {
    Monitor,
    Smartphone,
    Moon,
    Sun,
    FolderOpen,
    Wifi,
    Trash2,
    Info,
    Github,
    Server,
    Database,
    Clock,
    HardDrive,
    Film,
    Tv,
    RotateCcw,
    History,
    RefreshCw,
    PlayCircle,
    Mic2,
    Languages,
    Cpu,
    Zap,
    Globe,
    Shield,
    CheckCircle2,
    AlertCircle,

    Loader2,
    Plus,
    EyeOff,
    FileMinus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AddFtpModal } from '../components/AddFtpModal';

export const Settings = () => {
    const library = useStore((state) => state.library);
    const clearCache = useStore((state) => state.clearCache);
    const clearLibrary = useStore((state) => state.clearLibrary);
    const deleteAllData = useStore((state) => state.deleteAllData);
    const resyncLibrary = useStore((state) => state.resyncLibrary);
    const resyncFtpSource = useStore((state) => state.resyncFtpSource);
    const history = useStore((state) => state.history) || {};
    const folders = useStore((state) => state.folders) || [];
    const ftpSources = useStore((state) => state.ftpSources) || [];
    const ignoredPaths = useStore((state) => state.ignoredPaths) || [];
    const removeFolder = useStore((state) => state.removeFolder);
    const removeFtpSource = useStore((state) => state.removeFtpSource);
    const addToLibrary = useStore((state) => state.addToLibrary);
    const addFolder = useStore((state) => state.addFolder);
    const ignorePath = useStore((state) => state.ignorePath);
    const unignorePath = useStore((state) => state.unignorePath);

    // Local UI State
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncingSourceId, setSyncingSourceId] = useState(null);

    const [theme, setTheme] = useState('dark');
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'clear_lib', title: 'Start Fresh?' }

    // Mock Settings State
    const [autoPlay, setAutoPlay] = useState(true);
    const [hardwareAccel, setHardwareAccel] = useState(true);
    const [defLang, setDefLang] = useState('English');

    // Check if running in Electron
    const isElectron = typeof window !== 'undefined' && window.electron;

    const handleFtpResync = async (id) => {
        setSyncingSourceId(id);
        await resyncFtpSource(id);
        setSyncingSourceId(null);
    };

    const handleResync = async () => {
        setIsSyncing(true);
        // Simulate minimum delay for visual feedback
        const start = Date.now();
        await resyncLibrary();
        const took = Date.now() - start;
        if (took < 1000) await new Promise(r => setTimeout(r, 1000 - took));
        setIsSyncing(false);
    };

    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
        const html = document.documentElement;
        if (newTheme === 'dark') html.classList.add('dark');
        else if (newTheme === 'light') html.classList.remove('dark');
        else {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) html.classList.add('dark');
            else html.classList.remove('dark');
        }
    };

    // Stats Calculation
    const moviesCount = library.filter(i => i.type === 'movie' || (!i.type && !i.season)).length;
    const tvEpisodesCount = library.filter(i => i.type === 'tv' || i.season).length;
    const distinctSeries = new Set(library.filter(i => i.type === 'tv').map(i => i.tmdbId || i.showTitle)).size;
    const totalBytes = library.reduce((acc, item) => acc + (item.size || 0), 0);
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    };

    // Use Electron's native dialog and IPC for folder selection (no "uploading")
    const handleAddLocalFolder = async () => {
        if (!isElectron) {
            console.warn('[Settings] Not running in Electron, cannot use native dialog.');
            return;
        }

        const { ipcRenderer } = window.electron;

        try {
            setIsSyncing(true);

            // 1. Open native folder picker dialog
            const folderPath = await ipcRenderer.invoke('open-directory');
            if (!folderPath) {
                setIsSyncing(false);
                return; // User cancelled
            }

            console.log('[Settings] Selected folder:', folderPath);

            // 2. Add folder to sources list
            addFolder(folderPath);

            // 3. Scan the directory for media files via IPC
            const mediaFiles = await ipcRenderer.invoke('scan-directory', folderPath);
            console.log('[Settings] Scanned files:', mediaFiles.length);

            // 4. Add scanned files to library (will trigger metadata identification)
            if (mediaFiles.length > 0) {
                await addToLibrary(mediaFiles);
            }

            setIsSyncing(false);
        } catch (err) {
            console.error('[Settings] Error adding folder:', err);
            setIsSyncing(false);
        }
    };

    const handleAddException = async (type = 'directory') => {
        if (!isElectron) return;
        const { ipcRenderer } = window.electron;
        try {
            const path = await ipcRenderer.invoke(type === 'file' ? 'open-file' : 'open-directory');
            if (path) {
                if (Array.isArray(path)) path.forEach(p => ignorePath(p));
                else ignorePath(path);
            }
        } catch (err) {
            console.error('[Settings] Error adding exception:', err);
        }
    };

    const tabs = [
        {
            title: "Library",
            value: "library",
            content: (
                <div className="w-full relative h-full rounded-2xl p-6 md:p-10 bg-white dark:bg-gradient-to-br dark:from-neutral-900 dark:to-neutral-950 border border-neutral-200 dark:border-white/10 shadow-xl overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
                        <div>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 sm:gap-3">
                                <Database className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /> Library Management
                            </h3>
                            <p className="text-neutral-500 mt-1 sm:mt-2 text-sm sm:text-base">Manage your media sources and metadata.</p>
                        </div>
                        {isSyncing && (
                            <div className="bg-primary/20 text-primary px-3 py-2 rounded-full flex items-center gap-2 animate-pulse font-medium text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Syncing...
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 md:mb-10">
                        <StatsCard icon={Film} label="Movies" value={moviesCount} color="text-blue-500" />
                        <StatsCard icon={Tv} label="TV Series" value={distinctSeries} subtext={`${tvEpisodesCount} Eps`} color="text-purple-500" />
                        <StatsCard icon={FolderOpen} label="Sources" value={folders.length + ftpSources.length} color="text-yellow-500" />
                        <StatsCard icon={HardDrive} label="Storage" value={formatBytes(totalBytes)} color="text-green-500" />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
                        <div>
                            <SettingsSection title="Connected Sources">
                                {folders.length === 0 && ftpSources.length === 0 && (
                                    <div className="p-8 text-center text-neutral-500 border-dashed border-2 border-white/10 rounded-xl">
                                        No sources added yet.
                                    </div>
                                )}
                                {folders.map((f, i) => (
                                    <SourceRow key={i} icon={FolderOpen} label={f} type="Local Folder" onDelete={() => removeFolder(f)} />
                                ))}
                                {ftpSources.map((f) => (
                                    <SourceRow
                                        key={f.id}
                                        icon={Globe}
                                        label={`${f.user}@${f.host}`}
                                        type="FTP Server"
                                        onDelete={() => removeFtpSource(f.id)}
                                        onResync={() => handleFtpResync(f.id)}
                                        isSyncing={syncingSourceId === f.id}
                                    />
                                ))}
                                <div className="p-4 border-t border-white/5">
                                    <button
                                        onClick={handleAddLocalFolder}
                                        disabled={isSyncing}
                                        className="w-full py-3 border border-dashed border-neutral-300 dark:border-white/10 rounded-xl text-neutral-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <Plus className="w-5 h-5" />
                                        {isSyncing ? 'Scanning...' : 'Add Local Folder'}
                                    </button>
                                    <button
                                        onClick={() => setIsFtpModalOpen(true)}
                                        disabled={isSyncing}
                                        className="w-full py-3 border border-dashed border-neutral-300 dark:border-white/10 rounded-xl text-neutral-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <Globe className="w-5 h-5" />
                                        Add FTP Source
                                    </button>
                                </div>
                            </SettingsSection>

                            <SettingsSection title="Excluded Items">
                                {ignoredPaths.length === 0 && (
                                    <div className="p-6 text-center text-neutral-500 italic text-sm">
                                        No exclusions defined.
                                    </div>
                                )}
                                {ignoredPaths.map((path, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 border-b last:border-0 border-white/5 bg-transparent hover:bg-white/5 transition">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <EyeOff className="w-4 h-4 text-neutral-400 shrink-0" />
                                            <span className="text-white text-sm truncate dir-rtl text-left" title={path}>
                                                ...{path.slice(-40)}
                                            </span>
                                        </div>
                                        <button onClick={() => unignorePath(path)} className="text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 bg-primary/10 rounded-md">
                                            Restore
                                        </button>
                                    </div>
                                ))}
                                <div className="p-4 border-t border-white/5 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleAddException('directory')}
                                        className="py-2 px-3 bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs font-medium hover:bg-white/10 transition flex items-center justify-center gap-2"
                                    >
                                        <EyeOff className="w-3 h-3" /> Exclude Folder
                                    </button>
                                    <button
                                        onClick={() => handleAddException('file')}
                                        className="py-2 px-3 bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs font-medium hover:bg-white/10 transition flex items-center justify-center gap-2"
                                    >
                                        <FileMinus className="w-3 h-3" /> Exclude File
                                    </button>
                                </div>
                            </SettingsSection>
                        </div>

                        <div className="space-y-6">
                            <SettingsSection title="Maintenance">
                                <ActionRow
                                    icon={RefreshCw}
                                    label="Resync Metadata"
                                    description="Re-scan items to fix missing posters or info."
                                    actionLabel={isSyncing ? "Syncing..." : "Start Scan"}
                                    onClick={handleResync}
                                    disabled={isSyncing}
                                />
                                <ActionRow
                                    icon={RotateCcw}
                                    label="Clear Image Cache"
                                    description="Free up space by removing cached posters."
                                    actionLabel="Clear Cache"
                                    onClick={clearCache}
                                />
                            </SettingsSection>

                            <SettingsSection title="Danger Zone">
                                <ActionRow
                                    icon={Trash2}
                                    label="Nuke Library"
                                    description="Irreversible. Removes all items and history."
                                    actionLabel="Format"
                                    variant="danger"
                                    onClick={() => {
                                        if (window.confirm("This will wipe ALL data and reset the app. Are you sure?")) {
                                            deleteAllData();
                                        }
                                    }}
                                />
                            </SettingsSection>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Playback",
            value: "playback",
            content: (
                <div className="w-full relative h-full rounded-2xl p-6 md:p-10 bg-white dark:bg-gradient-to-br dark:from-neutral-900 dark:to-neutral-950 border border-neutral-200 dark:border-white/10 shadow-xl overflow-y-auto">
                    <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
                        <PlayCircle className="w-8 h-8 text-primary" /> Playback Experiences
                    </h3>

                    <div className="grid md:grid-cols-2 gap-8">
                        <SettingsSection title="Behavior">
                            <ToggleRow
                                label="Auto-Play Next Episode"
                                description="Automatically start the next episode when one finishes."
                                isOn={autoPlay}
                                onToggle={() => setAutoPlay(!autoPlay)}
                            />
                            <ToggleRow
                                label="Hardware Acceleration"
                                description="Use GPU for decoding (smoother 4K playback)."
                                isOn={hardwareAccel}
                                onToggle={() => setHardwareAccel(!hardwareAccel)}
                            />
                        </SettingsSection>

                        <SettingsSection title="Languages">
                            <div className="p-4 flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <Mic2 className="w-5 h-5 text-neutral-400" />
                                    <span className="text-white font-medium">Preferred Audio</span>
                                </div>
                                <select className="bg-black/30 text-white border border-white/10 rounded-md px-2 py-1 outline-none text-sm" value={defLang} onChange={e => setDefLang(e.target.value)}>
                                    <option>English</option>
                                    <option>Japanese</option>
                                    <option>French</option>
                                    <option>Spanish</option>
                                </select>
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Languages className="w-5 h-5 text-neutral-400" />
                                    <span className="text-white font-medium">Preferred Subtitles</span>
                                </div>
                                <select className="bg-black/30 text-white border border-white/10 rounded-md px-2 py-1 outline-none text-sm">
                                    <option>None</option>
                                    <option>English</option>
                                    <option>English (SDH)</option>
                                    <option>Spanish</option>
                                </select>
                            </div>
                        </SettingsSection>
                    </div>
                </div>
            )
        },
        {
            title: "Appearance",
            value: "appearance",
            content: (
                <div className="w-full relative h-full rounded-2xl p-6 md:p-10 bg-white dark:bg-gradient-to-br dark:from-neutral-900 dark:to-neutral-950 border border-neutral-200 dark:border-white/10 shadow-xl overflow-y-auto">
                    <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
                        <Monitor className="w-8 h-8 text-primary" /> UI & Theme
                    </h3>

                    <SettingsSection title="Application Theme">
                        <div className="grid grid-cols-3 gap-6 p-4">
                            <ThemeCard icon={Sun} label="Light" active={theme === 'light'} onClick={() => toggleTheme('light')} />
                            <ThemeCard icon={Moon} label="Dark" active={theme === 'dark'} onClick={() => toggleTheme('dark')} />
                            <ThemeCard icon={Monitor} label="System" active={theme === 'system'} onClick={() => toggleTheme('system')} />
                        </div>
                    </SettingsSection>
                </div>
            )
        },
        {
            title: "About",
            value: "about",
            content: (
                <div className="w-full relative h-full rounded-2xl p-6 md:p-10 bg-white dark:bg-gradient-to-br dark:from-neutral-900 dark:to-neutral-950 border border-neutral-200 dark:border-white/10 shadow-xl overflow-y-auto">
                    <div className="flex flex-col items-center text-center py-10">
                        <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mb-6">
                            <Zap className="w-12 h-12 text-primary fill-primary" />
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-2">Scooty Player</h1>
                        <p className="text-white/50 text-lg mb-8">The Ultimate Media Experience</p>

                        <div className="grid grid-cols-2 gap-4 max-w-md w-full mb-10">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Version</div>
                                <div className="text-white font-mono">0.9.1 Beta</div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Build</div>
                                <div className="text-white font-mono">241214.X</div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden w-full max-w-2xl text-left">
                            <div className="p-4 border-b border-white/5 text-sm font-medium text-white">Credits</div>
                            <div className="p-4 space-y-3">
                                <CreditRow role="Developer" name="Yogesh" />
                                <CreditRow role="Design System" name="Aceternity UI" />
                                <CreditRow role="Icons" name="Lucide React" />
                                <CreditRow role="Framework" name="Tauri / Electron" />
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    // FTP Modal State
    const [isFtpModalOpen, setIsFtpModalOpen] = useState(false);

    return (
        <div className="min-h-screen pb-20 relative flex flex-col w-full items-start justify-start px-2 sm:px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-6 md:mb-8 tracking-tight">Settings</h2>
            <Tabs tabs={tabs} containerClassName="mb-10 w-full" contentClassName="h-[40rem] md:h-[50rem]" />
            <AddFtpModal isOpen={isFtpModalOpen} onClose={() => setIsFtpModalOpen(false)} />
        </div>
    );
};

// --- Sub-Components ---

const SettingsSection = ({ title, children }) => (
    <div className="mb-8">
        <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-4 ml-1">{title}</h4>
        <div className="bg-neutral-100 dark:bg-black/20 rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/5 backdrop-blur-sm">
            {children}
        </div>
    </div>
);

const StatsCard = ({ icon: Icon, label, value, subtext, color }) => (
    <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors cursor-default">
        <div className={cn("mb-2 sm:mb-3 p-2 sm:p-3 rounded-full bg-white dark:bg-neutral-800 shadow-lg", color)}>
            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
        </div>
        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white block tracking-tighter">{value}</span>
        <span className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 block">{label}</span>
        {subtext && <span className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-600 mt-1">{subtext}</span>}
    </div>
);

const ActionRow = ({ icon: Icon, label, description, actionLabel, variant = 'primary', onClick, disabled }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gap-3 sm:gap-4 border-b last:border-0 border-neutral-200 dark:border-white/5 bg-white dark:bg-transparent hover:bg-neutral-50 dark:hover:bg-white/5 transition group">
        <div className="flex items-start sm:items-center gap-3 sm:gap-5">
            <div className={cn("p-2 sm:p-3 rounded-xl shrink-0", variant === 'danger' ? "bg-red-500/10 text-red-500" : "bg-neutral-200 dark:bg-white/5 text-neutral-600 dark:text-neutral-300")}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
                <span className={cn("block text-sm sm:text-base font-medium", variant === 'danger' ? "text-red-400" : "text-neutral-900 dark:text-white")}>{label}</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mt-0.5">{description}</span>
            </div>
        </div>
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto",
                variant === 'danger'
                    ? "bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white"
                    : "bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-700 dark:hover:bg-neutral-200"
            )}
        >
            {actionLabel}
        </button>
    </div>
);

const ToggleRow = ({ label, description, isOn, onToggle }) => (
    <div className="flex items-center justify-between p-5 border-b last:border-0 border-white/5 bg-transparent hover:bg-white/5 transition">
        <div>
            <span className="block text-base font-medium text-white">{label}</span>
            <span className="block text-xs text-neutral-400 mt-0.5">{description}</span>
        </div>
        <button
            onClick={onToggle}
            className={cn("w-12 h-7 rounded-full p-1 transition-colors duration-300 relative", isOn ? "bg-primary" : "bg-neutral-700")}
        >
            <div className={cn("w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300", isOn ? "translate-x-5" : "translate-x-0")} />
        </button>
    </div>
)

const SourceRow = ({ icon: Icon, label, type, onDelete, onResync, isSyncing }) => (
    <div className="flex items-center justify-between p-4 border-b last:border-0 border-white/5">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-white/5 rounded-lg">
                <Icon className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
                <div className="text-white font-medium text-sm">{label}</div>
                <div className="text-xs text-neutral-500">{type}</div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {onResync && (
                <button
                    onClick={onResync}
                    disabled={isSyncing}
                    className="p-2 hover:bg-primary/20 text-neutral-500 hover:text-primary rounded-lg transition-colors disabled:opacity-50 disabled:animate-spin"
                    title="Resync Source"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            )}
            <button onClick={onDelete} className="p-2 hover:bg-red-500/20 text-neutral-500 hover:text-red-500 rounded-lg transition-colors" title="Remove Source">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    </div>
);

const ThemeCard = ({ icon: Icon, label, active, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "cursor-pointer flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 hover:scale-105 active:scale-95",
            active
                ? "bg-primary/10 border-primary text-primary shadow-xl shadow-primary/10"
                : "bg-white dark:bg-white/5 border-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/10"
        )}
    >
        <Icon className={cn("w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-3", active && "fill-current")} />
        <span className="font-bold text-xs sm:text-sm tracking-wide">{label}</span>
    </div>
);

const CreditRow = ({ role, name }) => (
    <div className="flex justify-between items-center">
        <span className="text-neutral-500 text-sm">{role}</span>
        <span className="text-white font-medium text-sm">{name}</span>
    </div>
);
