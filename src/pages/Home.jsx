import React from 'react';
import { Spotlight } from '../components/ui/spotlight';
import { MovieCard } from '../components/MovieCard';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
    // Attempt to get movies from store, fallback to empty array if store is not ready
    const movies = useStore((state) => state.library) || [];
    const navigate = useNavigate();

    // Mock data if no movies
    const displayMovies = movies.length > 0 ? movies : [
        { id: 1, title: "Inception", year: "2010", poster: null }, // Fallback
        { id: 2, title: "Interstellar", year: "2014", poster: null },
        { id: 3, title: "Dune", year: "2021", poster: null },
        { id: 4, title: "The Matrix", year: "1999", poster: null },
    ];

    return (
        <div className="relative w-full min-h-[calc(100vh-80px)] overflow-hidden rounded-md flex flex-col items-start justify-start">
            <Spotlight
                className="-top-40 left-0 md:left-60 md:-top-20"
                fill="white"
            />

            <div className="relative z-10 w-full">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-600 to-neutral-900 dark:from-neutral-50 dark:to-neutral-400 bg-opacity-50 pb-4 mt-10">
                        Continue Watching
                    </h1>
                    <p className="mt-4 font-normal text-base text-neutral-600 dark:text-neutral-300 max-w-lg text-center mx-auto">
                        Jump back into your favorite stories.
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-6 px-4">
                    {displayMovies.slice(0, 5).map((movie) => (
                        <MovieCard
                            key={movie.id}
                            title={movie.title}
                            year={movie.year || movie.release_date?.split('-')[0]}
                            posterPath={movie.poster /* Store might use 'poster' or 'poster_path' */}
                            onClick={() => navigate(`/details/${movie.id}`)}
                        />
                    ))}
                </div>

                <div className="mt-20 mb-8 ps-4">
                    <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6 pl-2 border-l-4 border-primary">
                        Recommended for You
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-6 px-4">
                        {displayMovies.slice(0, 10).map((movie) => (
                            <MovieCard
                                key={movie.id}
                                title={movie.title}
                                year={movie.year || movie.release_date?.split('-')[0]}
                                posterPath={movie.poster}
                                onClick={() => navigate(`/details/${movie.id}`)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
