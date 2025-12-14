# 03. Design System & UI Specs

## Philosophy
**"The Theater Context"**
Users are often in dark environments. The UI must be dark, high contrast, and immersive. Use "Light" only for emphasis.

## Color Palette (Tailwind Config)

### Backgrounds
-   `bg-background`: `#000000` (Pure Black - OLED friendly)
-   `bg-surface`: `#121212` (Google Material Dark default)
-   `bg-surface-elevated`: `#1E1E1E` (Cards, Modals - lighter)

### Accents (Infuse Style)
-   `primary`: `#FF8800` (Sunset Orange) - *Used for Play buttons, Progress bars.*
-   `secondary`: `#007AFF` (System Blue) - *Used for Selection states, Links.*
-   `danger`: `#FF453A` (Red) - *Delete actions.*

### Text
-   `text-foreground`: `#FFFFFF` (100% White)
-   `text-muted`: `#A1A1A1` (Zinc 400 - Metadata)
-   `text-dark`: `#000000` (Text on Primary buttons)

## Typography
**Font Family:** System Stack (`-apple-system`, `BlinkMacSystemFont`, `Inter`, `sans-serif`).
*Why:* Feels native on every OS.

-   **H1 (Movie Title):** Text-3xl, Font-Bold, Tracking-Tight.
-   **H2 (Section Header):** Text-xl, Font-Semibold, Text-White.
-   **Body:** Text-base, Font-Regular, Text-Muted.
-   **Caption:** Text-xs, Font-Medium, Uppercase, Tracking-Widest.

## Components styling

### Glassmorphism (The "Premium" Touch)
We use extensive backdrop blur for overlays.
-   **Sidebar/Nav:** `bg-black/60 backdrop-blur-xl border-r border-white/5`
-   **Modal Overlay:** `bg-black/40 backdrop-blur-sm`
-   **Floating Controls:** `bg-black/50 backdrop-blur-md rounded-full`

### Cards (Posters)
-   **Ratio:** 2:3 (Standard Movie Poster).
-   **Corner Radius:** `rounded-lg` (8px) or `rounded-xl` (12px).
-   **Shadow:** `shadow-lg` (Black diffuse shadow).
-   **Hover State:**
    -   Scale: 1.05
    -   Shadow: `shadow-primary/20` (Glow effect).
    -   Border: `ring-2 ring-white`.

## Animation Constants (Framer Motion)

### Transitions
```javascript
export const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30
};

export const EASE_TRANSITION = {
  duration: 0.3,
  ease: [0.32, 0.72, 0, 1]
};
```

### Variants
**Page Load:**
```javascript
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};
```

**Staggered List:**
```javascript
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};
```

## Icons
Use **Lucide React**.
-   **Size:** Standard 24px (`w-6 h-6`).
-   **Stroke:** 2px (Bold) for active, 1.5px for inactive.
