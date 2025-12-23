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
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-10 duration-300">
                <h2 className="text-2xl font-bold text-white mb-3">Privacy & Analytics</h2>
                <p className="text-neutral-300 mb-6 leading-relaxed">
                    We use anonymous analytics to improve your experience. We respect your privacy and do not collect personal information or track your media content.
                    <br /><br />
                    By continuing, you agree to our <Link to="/privacy" className="text-orange-500 hover:text-orange-400 underline underline-offset-4">Privacy Policy</Link>.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleAccept}
                        className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-orange-900/20"
                    >
                        I Accept
                    </button>
                </div>
            </div>
        </div>
    );
}
