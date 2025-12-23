import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Spotlight } from '../components/ui/spotlight';

export const Welcome = () => {
    const navigate = useNavigate();
    const completeSetup = useStore((state) => state.completeSetup);

    const handleGetStarted = () => {
        completeSetup();
        navigate('/');
    };

    return (
        <div className="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden">
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-neutral-950 to-neutral-950" />

            <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-2xl">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-primary/20"
                >
                    <Zap className="w-12 h-12 text-white fill-white" />
                </motion.div>

                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight"
                >
                    Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Scooty</span>
                </motion.h1>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-lg md:text-xl text-neutral-400 mb-12 max-w-lg leading-relaxed"
                >
                    The ultimate media experience for your personal library.
                    Stream, organize, and enjoy your collection like never before.
                </motion.p>

                <motion.button
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    onClick={handleGetStarted}
                    className="group relative px-8 py-4 bg-white text-neutral-950 rounded-full font-bold text-lg flex items-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-white/20 transition-all"
                >
                    Get Started
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
            </div>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-8 text-neutral-600 text-sm"
            >
                v0.9.1 Beta
            </motion.div>
        </div>
    );
};
