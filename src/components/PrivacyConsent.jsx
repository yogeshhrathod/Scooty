import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAnalytics } from '../hooks/useAnalytics';

export function PrivacyConsent() {
    const privacyAccepted = useStore((state) => state.privacyAccepted);
    const acceptPrivacy = useStore((state) => state.acceptPrivacy);
    const location = useLocation();
    const { trackEvent } = useAnalytics();

    const handleAccept = () => {
        acceptPrivacy();
        trackEvent('privacy_accepted');
    };

    // Don't show if already accepted
    if (privacyAccepted) return null;

    // Don't show if currently viewing the privacy policy page
    if (location.pathname === '/privacy') return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-10 duration-300">
                <h2 className="text-2xl font-bold text-foreground mb-3">Privacy & Analytics</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                    We use anonymous analytics to improve your experience. We respect your privacy and do not collect personal information or track your media content.
                    <br /><br />
                    By continuing, you agree to our <Link to="/privacy" className="text-primary hover:text-primary/80 underline underline-offset-4">Privacy Policy</Link>.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleAccept}
                        className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-colors shadow-lg shadow-primary/20"
                    >
                        I Accept
                    </button>
                </div>
            </div>
        </div>
    );
}
