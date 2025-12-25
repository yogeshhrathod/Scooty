import { useAptabase } from '@aptabase/react';
import { useCallback } from 'react';
import { useStore } from '../store/useStore';

/**
 * Custom hook for unified analytics tracking.
 * Wraps Aptabase and adds project-specific event typing.
 */
export function useAnalytics() {
    const { trackEvent } = useAptabase();
    const privacyAccepted = useStore((state) => state.privacyAccepted);

    const track = useCallback((eventName, props = {}) => {
        // Allow tracking 'privacy_accepted' event regardless of current state
        // Otherwise, invoke check
        if (eventName !== 'privacy_accepted' && !privacyAccepted) {
            // Double check store state just in case (though referenced from closure)
            // Check if we are in the process of accepting
            if (useStore.getState().privacyAccepted === false) {
                return;
            }
        }

        try {
            trackEvent(eventName, props);
        } catch (e) {
            console.warn('Analytics failed:', e);
        }
    }, [trackEvent, privacyAccepted]);

    return {
        trackPageView: (pageName) => track('page_view', { page: pageName }),
        trackVideoPlay: (title) => track('video_play', { title }),
        trackVideoError: (error) => track('video_error', { error: error.toString() }),
        trackAppError: (error, componentStack) => track('app_error', { error: error.toString(), stack: componentStack }),
        trackFeatureUsage: (feature) => track('feature_used', { feature }),
        track,         // Exposed generic tracker
    };
}
