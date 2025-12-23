import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background text-foreground p-8 pt-24">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link to="/settings" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
                    <ArrowLeft size={20} />
                    Back to Settings
                </Link>

                <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>

                <div className="max-w-none space-y-6">
                    <p className="text-lg text-muted-foreground">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
                        <p>
                            Welcome to Scooty ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
                            This Privacy Policy explains how we collect, use, and protect your information when you use our application.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold text-foreground">2. Information We Collect</h2>
                        <p>
                            We collect minimal anonymous usage data to help us improve the application. This includes:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Device information (OS version, app version)</li>
                            <li>Basic usage statistics (features used, session duration)</li>
                            <li>Error logs and crash reports</li>
                        </ul>
                        <p>
                            We do <strong>not</strong> collect any personally identifiable information (PII) such as your name, email address, or specific file contents.
                            Your media library content remains local to your device.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold text-foreground">3. Third-Party Services</h2>
                        <p>
                            We use <strong>Aptabase</strong> for anonymous analytics. Aptabase is a privacy-first analytics service that does not track you across websites or apps.
                            The data collected is aggregated and anonymous.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold text-foreground">4. Data Storage and Security</h2>
                        <p>
                            All local data (such as your library index and settings) is stored securely on your device.
                            We do not upload your media files to any cloud servers.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold text-foreground">5. Changes to This Policy</h2>
                        <p>
                            We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new privacy policy in the app.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-semibold text-foreground">6. Contact Us</h2>
                        <p>
                            If you have any questions about this privacy policy, please contact us through the application settings or support channels.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
