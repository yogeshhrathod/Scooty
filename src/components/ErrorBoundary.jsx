import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        if (window.electron) {
            window.location.reload();
        } else {
            window.location.reload();
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-6 text-center select-none">
                    <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-neutral-400 max-w-md mb-8">
                        The application encountered an unexpected error.
                    </p>

                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 w-full max-w-lg mb-8 text-left font-mono text-xs overflow-auto max-h-48">
                        <p className="text-red-400 mb-2">{this.state.error?.toString()}</p>
                        <p className="text-neutral-500 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</p>
                    </div>

                    <button
                        onClick={this.handleReload}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 transition active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" /> Restart App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
