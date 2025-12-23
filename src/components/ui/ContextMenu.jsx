import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export const ContextMenu = ({ children, items }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef(null);

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();

        // Calculate position - ensures menu doesn't go off screen
        const x = e.clientX;
        const y = e.clientY;

        setPosition({ x, y });
        setIsOpen(true);
    }, []);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const handleClick = (e) => {
                if (menuRef.current && !menuRef.current.contains(e.target)) {
                    closeMenu();
                }
            };
            const handleScroll = () => closeMenu();
            window.addEventListener('click', handleClick);
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', closeMenu);

            return () => {
                window.removeEventListener('click', handleClick);
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', closeMenu);
            };
        }
    }, [isOpen, closeMenu]);

    // Position adjustment logic after render
    useEffect(() => {
        if (isOpen && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            let newX = position.x;
            let newY = position.y;

            if (position.x + rect.width > screenWidth) {
                newX = position.x - rect.width;
            }
            if (position.y + rect.height > screenHeight) {
                newY = position.y - rect.height;
            }

            if (newX !== position.x || newY !== position.y) {
                setPosition({ x: newX, y: newY });
            }
        }
    }, [isOpen, position.x, position.y]);

    return (
        <div onContextMenu={handleContextMenu} className="h-full w-full">
            {children}
            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        style={{
                            position: 'fixed',
                            top: position.y,
                            left: position.x,
                            zIndex: 9999,
                        }}
                        className="min-w-[180px] bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-xl p-1.5 overflow-hidden"
                    >
                        <div className="flex flex-col gap-0.5">
                            {items.map((item, idx) => (
                                item.separator ? (
                                    <div key={idx} className="h-px bg-border/50 my-1 mx-1" />
                                ) : (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            item.onClick();
                                            closeMenu();
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left w-full group",
                                            item.variant === 'danger'
                                                ? "text-red-400 hover:bg-red-500/10 hover:text-red-500"
                                                : "text-foreground/80 hover:bg-primary/10 hover:text-primary"
                                        )}
                                    >
                                        {item.icon && <span className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110">{item.icon}</span>}
                                        <span className="flex-1 font-medium">{item.label}</span>
                                        {item.shortcut && (
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                                                {item.shortcut}
                                            </span>
                                        )}
                                    </button>
                                )
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
