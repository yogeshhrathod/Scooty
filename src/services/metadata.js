import axios from 'axios';

// Get API Key from env
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';

export const metadataService = {
    // 1. Clean filename to get a search query
    parseFilename: (filename) => {
        console.log(`[Metadata] Parsing filename: ${filename}`);
        if (!filename) return { title: '', year: null, isTV: false };

        // Remove extension
        let name = filename.replace(/\.[^/.]+$/, "");

        // Common release groups and junk to remove
        const junkRegex = /\b(1080p|720p|480p|4k|2160p|uhd|bluray|web-dl|webrip|hdtv|x264|x265|hevc|aac|ac3|dts|remux|proper|repack|hdr|atmos|truehd|dd5\.1)\b/gi;

        // Detect TV Show Pattern (S01E01, 1x01, etc)
        const tvRegex = /s(\d{1,2})e(\d{1,2})|(\d{1,2})x(\d{1,2})/i;
        const tvMatch = name.match(tvRegex);
        const isTV = !!tvMatch;

        let season = null;
        let episode = null;

        if (tvMatch) {
            season = parseInt(tvMatch[1] || tvMatch[3]);
            episode = parseInt(tvMatch[2] || tvMatch[4]);
            console.log(`[Metadata] Detected TV Show: S${season}E${episode}`);
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

        // 5. Trim whitespace
        name = name.replace(/\s+/g, ' ').trim();

        console.log(`[Metadata] Cleaned Name: "${name}", Year: ${year}, isTV: ${isTV}`);
        return { title: name, year, isTV, season, episode };
    },

    // 2. Identify Metadata from TMDB
    identify: async (file) => {
        console.log(`[Metadata] Identifying ${file.name}...`);
        if (!API_KEY) {
            console.warn('[Metadata] No API Key found, using mock data.');
            return generateMockMetadata(file);
        }

        try {
            const { title, year, isTV, season, episode } = metadataService.parseFilename(file.name);

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

                    // Fetch TV show details and credits
                    let showDetails = {};
                    let showCredits = {};
                    try {
                        const [detailsRes, creditsRes] = await Promise.all([
                            axios.get(`${BASE_URL}/tv/${match.id}?api_key=${API_KEY}`),
                            axios.get(`${BASE_URL}/tv/${match.id}/credits?api_key=${API_KEY}`)
                        ]);
                        showDetails = detailsRes.data;
                        showCredits = creditsRes.data;
                    } catch (err) {
                        console.warn(`[Metadata] Failed to fetch TV show details: ${err.message}`);
                    }

                    // Get detailed cast info with profile photos
                    const castWithPhotos = (showCredits.cast || []).slice(0, 10).map(c => ({
                        id: c.id,
                        name: c.name,
                        character: c.character,
                        profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
                        order: c.order
                    }));

                    // Get episode-specific data if available
                    let episodeData = {};
                    if (season && episode) {
                        try {
                            const epReq = await axios.get(`${BASE_URL}/tv/${match.id}/season/${season}/episode/${episode}?api_key=${API_KEY}`);
                            episodeData = epReq.data;
                            console.log(`[Metadata] Found Episode: ${episodeData.name}`);
                        } catch (err) {
                            console.warn(`[Metadata] Failed to fetch specific episode details: ${err.message}`);
                        }
                    }

                    return {
                        ...file,
                        tmdbId: match.id,
                        title: episodeData.name || match.name,
                        showTitle: match.name,
                        tagline: showDetails.tagline,
                        overview: episodeData.overview || match.overview,
                        poster_path: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
                        still_path: episodeData.still_path ? `https://image.tmdb.org/t/p/w500${episodeData.still_path}` : null,
                        backdrop_path: match.backdrop_path ? `https://image.tmdb.org/t/p/original${match.backdrop_path}` : null,
                        release_date: episodeData.air_date || match.first_air_date,
                        year: year || (match.first_air_date ? match.first_air_date.substring(0, 4) : null),
                        vote_average: episodeData.vote_average || match.vote_average,
                        genres: (showDetails.genres || []).map(g => g.name),
                        cast: (showCredits.cast || []).slice(0, 5).map(c => c.name),
                        castDetails: castWithPhotos,
                        networks: (showDetails.networks || []).slice(0, 2).map(n => n.name),
                        created_by: (showDetails.created_by || []).slice(0, 2).map(c => c.name),
                        number_of_seasons: showDetails.number_of_seasons,
                        number_of_episodes: showDetails.number_of_episodes,
                        type: 'tv',
                        season,
                        episode,
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

                    // Fetch full details
                    const [details, credits] = await Promise.all([
                        axios.get(`${BASE_URL}/movie/${match.id}?api_key=${API_KEY}`),
                        axios.get(`${BASE_URL}/movie/${match.id}/credits?api_key=${API_KEY}`)
                    ]);

                    // Extract director from crew
                    const director = credits.data.crew.find(c => c.job === 'Director');

                    // Get detailed cast info with profile photos
                    const castWithPhotos = credits.data.cast.slice(0, 10).map(c => ({
                        id: c.id,
                        name: c.name,
                        character: c.character,
                        profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
                        order: c.order
                    }));

                    return {
                        ...file,
                        tmdbId: match.id,
                        title: match.title,
                        tagline: details.data.tagline,
                        overview: match.overview,
                        poster_path: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
                        backdrop_path: match.backdrop_path ? `https://image.tmdb.org/t/p/original${match.backdrop_path}` : null,
                        release_date: match.release_date,
                        year: year || (match.release_date ? match.release_date.substring(0, 4) : null),
                        vote_average: match.vote_average,
                        runtime: details.data.runtime,
                        cast: credits.data.cast.slice(0, 5).map(c => c.name),
                        castDetails: castWithPhotos,
                        director: director ? director.name : null,
                        genres: details.data.genres.map(g => g.name),
                        production_companies: details.data.production_companies.slice(0, 2).map(c => c.name),
                        budget: details.data.budget,
                        revenue: details.data.revenue,
                        status: details.data.status,
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

    // 3. Get similar/recommendations for auto-play
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
    const { title, year } = metadataService.parseFilename(file.name);

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

    return {
        ...file,
        title: title || file.name,
        overview: "Metadata could not be fetched. Check your internet connection or API Key.",
        poster_path: placeholder,
        backdrop_path: null, // UI should handle null backdrop
        vote_average: 0,
        identified: false,
        year: year
    };
}
