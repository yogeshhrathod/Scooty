import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

// For demo purposes, we will return some mock data if the API fails or no key
export const tmdb = {
    getImage: (path, size = 'original') => {
        if (!path) return '';
        return `https://image.tmdb.org/t/p/${size}${path}`;
    },
    getTrending: async () => {
        if (!API_KEY) return [];
        try {
            const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
            return response.data.results;
        } catch (error) {
            console.error("TMDB Error", error);
            return [];
        }
    },
    searchMovie: async (query) => {
        if (!API_KEY) return [];
        try {
            const response = await axios.get(`${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}`);
            return response.data.results;
        } catch (error) {
            return [];
        }
    }
};
