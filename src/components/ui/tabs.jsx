import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const Tabs = ({
    tabs: propTabs,
    containerClassName,
    activeTabClassName,
    tabClassName,
    contentClassName,
}) => {
    const [active, setActive] = useState(propTabs[0]);
    const [tabs, setTabs] = useState(propTabs);

    // Sync tabs with propTabs when they change
    useEffect(() => {
        const activeIdx = propTabs.findIndex(t => t.value === active?.value);
        if (activeIdx !== -1) {
            const newTabs = [...propTabs];
            const selectedTab = newTabs.splice(activeIdx, 1);
            newTabs.unshift(selectedTab[0]);
            setTabs(newTabs);
            setActive(newTabs[0]);
        } else {
            setTabs(propTabs);
            setActive(propTabs[0]);
        }
    }, [propTabs]);

    const moveSelectedTabToTop = (val) => {
        const idx = tabs.findIndex(t => t.value === val);
        if (idx === -1) return;
        const newTabs = [...tabs];
        const selectedTab = newTabs.splice(idx, 1);
        newTabs.unshift(selectedTab[0]);
        setTabs(newTabs);
        setActive(newTabs[0]);
    };

    const [hovering, setHovering] = useState(false);

    return (
        <>
            <div
                className={cn(
                    "flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full gap-2",
                    containerClassName
                )}
            >
                {propTabs.map((tab, idx) => (
                    <button
                        key={tab.value}
                        onClick={() => {
                            moveSelectedTabToTop(tab.value);
                        }}
                        onMouseEnter={() => setHovering(true)}
                        onMouseLeave={() => setHovering(false)}
                        className={cn("relative px-4 py-2 rounded-full transition-colors", tabClassName)}
                        style={{
                            transformStyle: "preserve-3d",
                        }}
                    >
                        {active.value === tab.value && (
                            <motion.div
                                layoutId="clickedbutton"
                                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                                className={cn(
                                    "absolute inset-0 bg-muted rounded-full ",
                                    activeTabClassName
                                )}
                            />
                        )}

                        <span className={cn(
                            "relative block transition-colors duration-200",
                            active.value === tab.value ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                        )}>
                            {tab.title}
                        </span>
                    </button>
                ))}
            </div>
            <FadeInDiv
                tabs={tabs}
                active={active}
                key={active.value}
                hovering={hovering}
                className={cn("mt-8", contentClassName)}
            />
        </>
    );
};

export const FadeInDiv = ({
    className,
    tabs,
    hovering,
}) => {
    const isActive = (tab) => {
        return tab.value === tabs[0].value;
    };
    return (
        <div className={cn("relative w-full", className)}>
            {tabs.map((tab, idx) => (
                <motion.div
                    key={tab.value}
                    layoutId={tab.value}
                    style={{
                        scale: 1 - idx * 0.1,
                        top: hovering ? idx * -50 : 0,
                        zIndex: -idx,
                        opacity: idx < 3 ? 1 - idx * 0.1 : 0,
                    }}
                    animate={{
                        y: isActive(tab) ? [0, 40, 0] : 0,
                    }}
                    className={cn(
                        "w-full left-0",
                        isActive(tab) ? "relative" : "absolute top-0 pointer-events-none"
                    )}
                >
                    {tab.content}
                </motion.div>
            ))}
        </div>
    );
};
