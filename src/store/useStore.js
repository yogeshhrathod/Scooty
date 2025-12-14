import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { metadataService } from '../services/metadata';

export const useStore = create(
    persist(
        (set, get) => ({
            library: [],
            history: {}, // { movieId: progressSeconds }
            favorites: [],

            // Async action to add and identify
            addToLibrary: async (rawFiles) => {
                const currentLib = get().library;
                // Filter duplicates by path
                const newFiles = rawFiles.filter(f => !currentLib.some(l => l.path === f.path));

                if (newFiles.length === 0) return;

                // Identify metadata for each
                // Show some loading state in UI if needed, but for now we do it in bg or blocking
                const enrichedFiles = await Promise.all(
                    newFiles.map(file => metadataService.identify(file))
                );

                set((state) => ({
                    library: [...state.library, ...enrichedFiles]
                }));
            },

            resyncLibrary: async () => {
                const currentLib = get().library;
                if (currentLib.length === 0) return;

                // Re-run identify on all files
                // We map back to basic file object structure if needed, but identify implementation handles existing meta fields gracefully (it re-parses name)
                const refreshedLibrary = await Promise.all(
                    currentLib.map(async (item) => {
                        // If it was a mock or failed before, re-try
                        // We simulate a fresh file object from the existing path/name
                        return await metadataService.identify({
                            name: item.name,
                            path: item.path,
                            size: item.size,
                            type: item.type
                        });
                    })
                );

                set({ library: refreshedLibrary });
            },

            clearLibrary: () => set({ library: [], history: {}, favorites: [] }),

            updateHistory: (id, time) => set((state) => ({
                history: { ...state.history, [id]: time }
            })),
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

            addFtpSource: (config) => set((state) => ({
                ftpSources: [...state.ftpSources, { ...config, id: Date.now().toString() }]
            })),

            removeFtpSource: (id) => set((state) => ({
                ftpSources: state.ftpSources.filter(s => s.id !== id),
                // Also remove files from this source
                library: state.library.filter(item => item.sourceId !== id)
            })),

            syncFtp: async (config) => {
                const { ftpService } = await import('../services/ftp');
                try {
                    const files = await ftpService.scan(config);
                    // Add sourceId to files for easy removal later
                    const sourceId = config.id || 'temp-ftp'; // In real usage, ensure config has ID when passed here
                    const filesWithSource = files.map(f => ({ ...f, sourceId, source: 'ftp' }));
                    await get().addToLibrary(filesWithSource);
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            },

            // Settings / Data Management
            clearCache: () => set((state) => ({
                // Keep library but reset metadata/history? 
                // Or maybe the user means clearing temporary files. 
                // For now, let's interpret "Clear Cache" as clearing images/metadata but keeping file references, 
                // BUT since we don't store metadata separately from library items, 
                // maybe "Clear Cache" is just a no-op or console log in this basic store, 
                // or we could clear 'history' (resume points).
                // Let's assume it clears identified metadata and forces re-identification on next sync.
                // However, re-identification is expensive.
                // Let's make it clear history and favorites for now, or maybe just clear history.
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
        }
    )
);
