import { useAptabase } from '@aptabase/react';
import { useCallback } from 'react';

/**
 * Custom hook for unified analytics tracking.
 * Wraps Aptabase and adds project-specific event typing.
 */
export function useAnalytics() {
    const { trackEvent } = useAptabase();

    const track = useCallback((eventName, props = {}) => {
        // Only track if consent is given
        const hasConsented = localStorage.getItem('privacy_accepted');
        if (!hasConsented) return;

        try {
            trackEvent(eventName, props);
        } catch (e) {
            console.warn('Analytics failed:', e);
        }
    }, [trackEvent]);

    return {
        trackPageView: (pageName) => track('page_view', { page: pageName }),
        trackVideoPlay: (title) => track('video_play', { title }), // Avoid sending PII filenames if possible, or assume local filenames are fine if generic
        trackVideoError: (error) => track('video_error', { error: error.toString() }),
        trackAppError: (error, componentStack) => track('app_error', { error: error.toString(), stack: componentStack }),
        trackFeatureUsage: (feature) => track('feature_used', { feature }),
        track
    };
}
