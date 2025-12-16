import axios from 'axios';

// Get API Key from env
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';

export const metadataService = {
    // 1. Clean filename to get a search query
    parseFilename: (filename, filePath = '') => {
        console.log(`[Metadata] Parsing filename: ${filename}`);
        if (!filename) return { title: '', year: null, isTV: false, parsedShowTitle: '' };

        // Remove extension
        let name = filename.replace(/\.[^/.]+$/, "");

        // Common release groups and junk to remove
        const junkRegex = /\b(1080p|720p|480p|4k|2160p|uhd|bluray|web-dl|webrip|hdtv|x264|x265|hevc|aac|ac3|dts|remux|proper|repack|hdr|atmos|truehd|dd5\.1)\b/gi;

        // Detect TV Show Pattern (S01E01, 1x01, etc)
        const tvRegex = /s(\d{1,2})e(\d{1,2})|(\d{1,2})x(\d{1,2})/i;
        let tvMatch = name.match(tvRegex);
        let isTV = !!tvMatch;

        let season = null;
        let episode = null;
        let showTitleFromFolder = '';

        if (tvMatch) {
            season = parseInt(tvMatch[1] || tvMatch[3]);
            episode = parseInt(tvMatch[2] || tvMatch[4]);
            console.log(`[Metadata] Detected TV Show from filename: S${season}E${episode}`);
        }

        // Try to detect TV show from folder structure if not detected from filename
        // Common patterns: /Show Name/Season 1/episode.mkv or /Show Name/S01/episode.mkv
        if (filePath) {
            const pathParts = filePath.replace(/\\/g, '/').split('/');

            // Check for "Season X" or "SXX" folder pattern
            for (let i = pathParts.length - 2; i >= 0; i--) {
                const folder = pathParts[i];

                // Match "Season 1", "Season 01", "S1", "S01" patterns
                const seasonFolderMatch = folder.match(/^(?:season\s*)?(\d{1,2})$/i) ||
                    folder.match(/^s(\d{1,2})$/i) ||
                    folder.match(/^season\s*(\d{1,2})$/i);

                if (seasonFolderMatch) {
                    const folderSeason = parseInt(seasonFolderMatch[1]);

                    // If we haven't detected season from filename, use folder
                    if (!season) {
                        season = folderSeason;
                        isTV = true;
                    }

                    // The folder before this should be the show name
                    if (i > 0) {
                        showTitleFromFolder = pathParts[i - 1]
                            .replace(/[._\-]/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
                        console.log(`[Metadata] Detected show title from folder: "${showTitleFromFolder}"`);
                    }
                    break;
                }
            }

            // If still not detected but we found a Season folder, check if episode number is in filename
            // Only do this if we already detected a season folder (showTitleFromFolder is set)
            if (!isTV && !episode && showTitleFromFolder) {
                // Match patterns like "Episode 1", "Ep 01", "E01", "Part 1" at the end of filename
                // Be more conservative - only match explicit episode markers, not just trailing numbers
                const altEpMatch = name.match(/(?:ep(?:isode)?|e|part)\s*(\d{1,3})$/i);
                if (altEpMatch && parseInt(altEpMatch[1]) <= 99) {
                    episode = parseInt(altEpMatch[1]);
                    isTV = true;
                    console.log(`[Metadata] Detected episode number from alt pattern: E${episode}`);
                } else {
                    // If we have a season folder but no episode detected, try to extract episode from simple number
                    // Only if filename starts with a number (like "01 - Episode Name.mkv")
                    const simpleEpMatch = name.match(/^(\d{1,2})(?:\s*[\-\.]\s*|\s+)/);
                    if (simpleEpMatch && parseInt(simpleEpMatch[1]) <= 99) {
                        episode = parseInt(simpleEpMatch[1]);
                        isTV = true;
                        console.log(`[Metadata] Detected episode from leading number: E${episode}`);
                    }
                }
            }
        }

        // Extract Year (matches 19xx or 20xx in brackets, logic, or standalone)
        const yearMatch = name.match(/(?:19|20)\d{2}/g);
        let year = yearMatch ? yearMatch[yearMatch.length - 1] : null;

        // Clean name
        // 1. Replace dots, underscores with spaces
        name = name.replace(/[._\-]/g, ' ');

        // 2. Remove year and everything after it (usually where release info starts)
        // For TV shows, we might want to keep the name part before SxxExx
        if (isTV && tvMatch) {
            const parts = name.split(new RegExp(`s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}|${season}x${episode}`, 'i'));
            name = parts[0];
        } else if (year) {
            const parts = name.split(year);
            name = parts[0];
        }

        // 3. Remove junk terms if they exist in the remaining string
        name = name.replace(junkRegex, '');

        // 4. Remove brackets/parentheses and their content
        name = name.replace(/[\[\(].*?[\]\)]/g, '');

        // 5. Remove episode numbers at the end for TV shows (e.g., "Show Name 01" -> "Show Name")
        if (isTV && episode) {
            name = name.replace(/\s+\d{1,2}$/, '');
        }

        // 6. Trim whitespace
        name = name.replace(/\s+/g, ' ').trim();

        // Use folder title if filename title is empty or very short
        const finalTitle = (name.length < 2 && showTitleFromFolder) ? showTitleFromFolder : name;

        // Create a normalized show title for grouping (lowercase, no special chars)
        const parsedShowTitle = (showTitleFromFolder || finalTitle).toLowerCase().replace(/[^a-z0-9]/g, '');

        console.log(`[Metadata] Cleaned Name: "${finalTitle}", Year: ${year}, isTV: ${isTV}, parsedShowTitle: "${parsedShowTitle}"`);
        return { title: finalTitle, year, isTV, season, episode, parsedShowTitle };
    },

    // 2. Identify Metadata from TMDB
    identify: async (file) => {
        console.log(`[Metadata] Identifying ${file.name}...`);
        if (!API_KEY) {
            console.warn('[Metadata] No API Key found, using mock data.');
            return generateMockMetadata(file);
        }

        try {
            const { title, year, isTV, season, episode, parsedShowTitle } = metadataService.parseFilename(file.name, file.path);

            if (!title) return generateMockMetadata(file);

            let res;
            let match;

            if (isTV) {
                // Search TV Show
                let endpoint = `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(title)}`;
                if (year) endpoint += `&first_air_date_year=${year}`;

                console.log(`[Metadata] Searching TV: ${endpoint}`);
                res = await axios.get(endpoint);

                if (res.data.results && res.data.results.length > 0) {
                    match = res.data.results[0];
                    console.log(`[Metadata] Found TV Match: ${match.name} (ID: ${match.id})`);

                    // Fetch details with append_to_response
                    let showDetails = {};
                    let episodeData = {};

                    try {
                        const detailsRes = await axios.get(`${BASE_URL}/tv/${match.id}?api_key=${API_KEY}&append_to_response=credits,videos,content_ratings,recommendations`);
                        showDetails = detailsRes.data;

                        // Get episode-specific data if available
                        if (season && episode) {
                            const epReq = await axios.get(`${BASE_URL}/tv/${match.id}/season/${season}/episode/${episode}?api_key=${API_KEY}`);
                            episodeData = epReq.data;
                            console.log(`[Metadata] Found Episode: ${episodeData.name}`);
                        }
                    } catch (err) {
                        console.warn(`[Metadata] Failed to fetch TV details: ${err.message}`);
                        // Fallback to basic match data if details fail
                        showDetails = match;
                    }

                    // Process Cast
                    const castWithPhotos = (showDetails.credits?.cast || []).slice(0, 15).map(c => ({
                        id: c.id,
                        name: c.name,
                        character: c.character,
                        profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
                        order: c.order
                    }));

                    // Process Certification
                    const rating = showDetails.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating || '';

                    // Process Trailer
                    const trailer = showDetails.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');

                    return {
                        ...file,
                        tmdbId: match.id,
                        title: episodeData.name || match.name,
                        showTitle: match.name,
                        tagline: showDetails.tagline,
                        overview: episodeData.overview || showDetails.overview || match.overview,
                        poster_path: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
                        still_path: episodeData.still_path ? `https://image.tmdb.org/t/p/w500${episodeData.still_path}` : null,
                        backdrop_path: match.backdrop_path ? `https://image.tmdb.org/t/p/original${match.backdrop_path}` : null,
                        release_date: episodeData.air_date || match.first_air_date,
                        year: year || (match.first_air_date ? match.first_air_date.substring(0, 4) : null),
                        vote_average: episodeData.vote_average || match.vote_average,
                        genres: (showDetails.genres || []).map(g => g.name),
                        cast: (showDetails.credits?.cast || []).slice(0, 5).map(c => c.name),
                        castDetails: castWithPhotos,
                        networks: (showDetails.networks || []).slice(0, 2).map(n => n.name),
                        created_by: (showDetails.created_by || []).slice(0, 2).map(c => c.name),
                        number_of_seasons: showDetails.number_of_seasons,
                        number_of_episodes: showDetails.number_of_episodes,
                        status: showDetails.status,
                        certification: rating,
                        trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
                        recommendations: (showDetails.recommendations?.results || []).slice(0, 10),
                        type: 'tv',
                        season,
                        episode,
                        parsedShowTitle, // Used for fallback grouping if tmdbId is missing
                        identified: true
                    };
                }

            } else {
                // Search Movie
                let endpoint = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}`;
                if (year) endpoint += `&year=${year}`;

                console.log(`[Metadata] Searching Movie: ${endpoint}`);
                res = await axios.get(endpoint);

                // Retry without year if no results (fuzzy search)
                if ((!res.data.results || res.data.results.length === 0) && year) {
                    console.log('[Metadata] No match with year, retrying without year...');
                    endpoint = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}`;
                    res = await axios.get(endpoint);
                }

                if (res.data.results && res.data.results.length > 0) {
                    match = res.data.results[0];
                    console.log(`[Metadata] Found Movie Match: ${match.title}`);

                    // Fetch details with append_to_response
                    const detailsRes = await axios.get(`${BASE_URL}/movie/${match.id}?api_key=${API_KEY}&append_to_response=credits,videos,release_dates,recommendations`);
                    const details = detailsRes.data;

                    // Extract director from crew
                    const director = details.credits?.crew?.find(c => c.job === 'Director');

                    // Extract Writer
                    const writers = details.credits?.crew?.filter(c => ['Screenplay', 'Writer', 'Story'].includes(c.job)).slice(0, 2).map(c => c.name) || [];

                    // Get detailed cast info
                    const castWithPhotos = (details.credits?.cast || []).slice(0, 15).map(c => ({
                        id: c.id,
                        name: c.name,
                        character: c.character,
                        profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
                        order: c.order
                    }));

                    // Get Certification (US)
                    const releaseDates = details.release_dates?.results?.find(r => r.iso_3166_1 === 'US');
                    const certification = releaseDates?.release_dates?.find(d => d.certification)?.certification || '';

                    // Get Trailer
                    const trailer = details.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');

                    return {
                        ...file,
                        tmdbId: match.id,
                        title: match.title,
                        tagline: details.tagline,
                        overview: match.overview,
                        poster_path: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
                        backdrop_path: match.backdrop_path ? `https://image.tmdb.org/t/p/original${match.backdrop_path}` : null,
                        release_date: match.release_date,
                        year: year || (match.release_date ? match.release_date.substring(0, 4) : null),
                        vote_average: match.vote_average,
                        runtime: details.runtime,
                        cast: (details.credits?.cast || []).slice(0, 5).map(c => c.name),
                        castDetails: castWithPhotos,
                        director: director ? director.name : null,
                        writers: writers,
                        genres: (details.genres || []).map(g => g.name),
                        production_companies: (details.production_companies || []).slice(0, 2).map(c => c.name),
                        budget: details.budget,
                        revenue: details.revenue,
                        status: details.status,
                        certification: certification,
                        trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
                        recommendations: (details.recommendations?.results || []).slice(0, 10),
                        type: 'movie',
                        identified: true
                    };
                }
            }

            console.warn(`[Metadata] No results found for ${title}`);

        } catch (e) {
            console.error(`[Metadata] Identification Error for ${file.name}:`, e);
        }

        return generateMockMetadata(file);
    },

    // 3. Get similar/recommendations (kept for standalone use if needed)
    getRecommendations: async (tmdbId) => {
        if (!API_KEY || !tmdbId) return [];
        try {
            const res = await axios.get(`${BASE_URL}/movie/${tmdbId}/recommendations?api_key=${API_KEY}`);
            return res.data.results;
        } catch (e) {
            return [];
        }
    }
};

function generateMockMetadata(file) {
    const { title, year, isTV, season, episode, parsedShowTitle } = metadataService.parseFilename(file.name, file.path);

    // Create a deterministic color/gradient based on filename for the placeholder
    const stringHash = file.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hues = [220, 200, 260, 340, 180]; // Blue, Cyan, Purple, Pink, Teal
    const hue = hues[stringHash % hues.length];

    // We use a data URI for a simple SVG placeholder to avoid external network dependencies
    const svgString = `
    <svg width="500" height="750" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="hsl(${hue}, 40%, 20%)" />
        <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle" dy=".3em">
            ${title.substring(0, 1).toUpperCase()}
        </text>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.6)" text-anchor="middle" dy="1.5em">
             ${year || ''}
        </text>
    </svg>
    `.trim().replace(/\s+/g, ' ');

    const placeholder = `data:image/svg+xml;base64,${btoa(svgString)}`;

    const result = {
        ...file,
        title: title || file.name,
        overview: "Metadata could not be fetched. Check your internet connection or API Key.",
        poster_path: placeholder,
        backdrop_path: null, // UI should handle null backdrop
        vote_average: 0,
        identified: false,
        year: year
    };

    // Add TV-specific data for proper grouping
    if (isTV) {
        result.type = 'tv';
        result.showTitle = title;
        result.season = season || 1;
        result.episode = episode || 1;
        result.parsedShowTitle = parsedShowTitle;
    }

    return result;
}
