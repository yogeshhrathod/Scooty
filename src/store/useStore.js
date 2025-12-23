import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { metadataService } from '../services/metadata';

// Custom Storage adapter for IndexedDB
const storage = {
    getItem: async (name) => {
        // Try IndexedDB first
        const fromIdb = await get(name);
        if (fromIdb) return fromIdb;

        // Fallback: Check localStorage (Migration)
        // If data exists in localStorage but not IDB, move it to IDB
        if (typeof localStorage !== 'undefined') {
            const fromLocal = localStorage.getItem(name);
            if (fromLocal) {
                console.log('[Store] Migrating data from localStorage to IndexedDB');
                await set(name, fromLocal);
                return fromLocal;
            }
        }
        return null;
    },
    setItem: async (name, value) => {
        await set(name, value);
    },
    removeItem: async (name) => {
        await del(name);
    },
};

export const useStore = create(
    persist(
        (set, get) => ({
            library: [],
            ignoredPaths: [], // List of paths to exclude
            history: {}, // { movieId: progressSeconds }
            favorites: [],

            // Async action to add and identify
            // Async action to add and identify
            addToLibrary: async (rawFiles) => {
                const { library, ignoredPaths } = get();

                // Helper to check if a file matches ignore rules
                const isIgnored = (filePath) => {
                    return ignoredPaths.some(ignored =>
                        filePath === ignored || filePath.startsWith(ignored + '/') || filePath.startsWith(ignored + '\\')
                    );
                };

                // Filter duplicates and ignored files
                const newFiles = rawFiles.filter(f =>
                    !library.some(l => l.path === f.path) && !isIgnored(f.path)
                );

                if (newFiles.length === 0) return;

                // Identify metadata for each with concurrency limit
                const CHUNK_SIZE = 3;
                const enrichedFiles = [];

                for (let i = 0; i < newFiles.length; i += CHUNK_SIZE) {
                    const chunk = newFiles.slice(i, i + CHUNK_SIZE);
                    const results = await Promise.all(
                        chunk.map(file => metadataService.identify(file))
                    );
                    enrichedFiles.push(...results);

                    // Small delay between chunks to be nice to API
                    if (i + CHUNK_SIZE < newFiles.length) {
                        await new Promise(r => setTimeout(r, 500));
                    }
                }

                set((state) => ({
                    library: [...state.library, ...enrichedFiles]
                }));
            },

            resyncLibrary: async () => {
                const currentLib = get().library;
                if (currentLib.length === 0) return;

                // Re-run identify on all files with concurrency
                const CHUNK_SIZE = 3;
                const refreshedLibrary = [];

                for (let i = 0; i < currentLib.length; i += CHUNK_SIZE) {
                    const chunk = currentLib.slice(i, i + CHUNK_SIZE);
                    const results = await Promise.all(
                        chunk.map(async (item) => {
                            return await metadataService.identify({
                                ...item,
                                // We keep existing ID/path but re-fetch meta based on name/path
                                identified: false // Force re-ID
                            });
                        })
                    );
                    refreshedLibrary.push(...results);
                    await new Promise(r => setTimeout(r, 500));
                }

                set({ library: refreshedLibrary });
            },

            clearLibrary: () => set({ library: [], history: {}, favorites: [] }),

            updateHistory: (id, data) => set((state) => {
                const existing = state.history[id] || {};
                // Handle legacy number input (just time)
                if (typeof data === 'number') {
                    return {
                        history: {
                            ...state.history,
                            [id]: { ...existing, progress: data, lastWatched: Date.now() }
                        }
                    };
                }
                // Handle object input
                return {
                    history: {
                        ...state.history,
                        [id]: { ...existing, ...data, lastWatched: Date.now() }
                    }
                };
            }),
            toggleFavorite: (id) => set((state) => {
                if (state.favorites.includes(id)) {
                    return { favorites: state.favorites.filter(f => f !== id) };
                }
                return { favorites: [...state.favorites, id] };
            }),

            // FTP Support
            ftpSources: [],
            // Local Folders Support
            folders: [],

            addFolder: (path) => set((state) => {
                if (state.folders.includes(path)) return {};
                return { folders: [...state.folders, path] };
            }),

            removeFolder: (path) => set((state) => ({
                folders: state.folders.filter(f => f !== path),
                library: state.library.filter(item => !item.path.startsWith(path))
            })),

            ignorePath: (path) => set((state) => {
                const alreadyIgnored = state.ignoredPaths.includes(path);
                if (alreadyIgnored) return {};

                // Add to ignored list
                const newIgnored = [...state.ignoredPaths, path];

                // Remove any current library items that match this path
                const newLibrary = state.library.filter(item =>
                    item.path !== path && !item.path.startsWith(path + '/') && !item.path.startsWith(path + '\\')
                );

                return {
                    ignoredPaths: newIgnored,
                    library: newLibrary
                };
            }),

            unignorePath: (path) => set((state) => ({
                ignoredPaths: state.ignoredPaths.filter(p => p !== path)
            })),

            addFtpSource: (config) => set((state) => ({
                ftpSources: [...state.ftpSources, { ...config, id: Date.now().toString() }]
            })),

            removeFtpSource: (id) => set((state) => ({
                ftpSources: state.ftpSources.filter(s => s.id !== id),
                // Also remove files from this source
                library: state.library.filter(item => item.sourceId !== id)
            })),

            // Sync State
            isSyncing: false,
            syncStatus: '',

            setSyncState: (isSyncing, status) => set({ isSyncing, syncStatus: status }),

            async syncFtp(config) {
                const { ftpService } = await import('../services/ftp');
                set({ isSyncing: true, syncStatus: `Scanning FTP: ${config.host}...` });
                try {
                    const files = await ftpService.scan(config);

                    if (files.length === 0) {
                        console.warn('No files found on FTP');
                        return true;
                    }

                    set({ syncStatus: `Processing ${files.length} items...` });

                    // Add sourceId to files for easy removal later
                    const sourceId = config.id || 'temp-ftp';
                    const filesWithSource = files.map(f => ({ ...f, sourceId, source: 'ftp' }));

                    await get().addToLibrary(filesWithSource);
                    return true;
                } catch (e) {
                    console.error('FTP Sync Error:', e);
                    return false;
                } finally {
                    set({ isSyncing: false, syncStatus: '' });
                }
            },

            resyncFtpSource: async (id) => {
                const source = get().ftpSources.find(s => s.id === id);
                if (!source) return false;
                return await get().syncFtp(source);
            },

            // Settings / Data Management
            clearCache: () => set((state) => ({
                history: {},
            })),

            deleteAllData: () => set({
                library: [],
                folders: [],
                ftpSources: [],
                history: {},
                favorites: []
            }),

        }),
        {
            name: 'infuse-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
