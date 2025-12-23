import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Link, Upload, FileText, Loader2, Globe, AlertCircle, Search, Download, Star, Check, ChevronDown } from 'lucide-react';

// Language options for subtitle search (3-letter codes for OpenSubtitles legacy API)
const LANGUAGES = [
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fre', name: 'French' },
    { code: 'ger', name: 'German' },
    { code: 'ita', name: 'Italian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'rus', name: 'Russian' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'kor', name: 'Korean' },
    { code: 'chi', name: 'Chinese' },
    { code: 'ara', name: 'Arabic' },
    { code: 'hin', name: 'Hindi' },
    { code: 'dut', name: 'Dutch' },
    { code: 'pol', name: 'Polish' },
    { code: 'tur', name: 'Turkish' },
    { code: 'all', name: 'All Languages' },
];

/**
 * External Subtitle Dialog - Search, load from URL, or upload subtitle files
 * Similar to KM Player's external subtitle loading feature
 */
export const ExternalSubtitleDialog = ({
    show,
    onClose,
    onLoadUrl,
    onLoadFile,
    streamBaseUrl,
    videoTitle = '',
    tmdbId = null,
    imdbId = null
}) => {
    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'url' | 'file'
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('eng');
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);

    // Auto-populate search query from video title
    useEffect(() => {
        if (show && videoTitle && !searchQuery) {
            // Clean up the video title for search
            const cleanTitle = videoTitle
                .replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm)$/i, '')
                .replace(/\[.*?\]/g, '')
                .replace(/\(.*?\)/g, '')
                .replace(/\d{3,4}p/gi, '')
                .replace(/x26[45]/gi, '')
                .replace(/HEVC|H\.?265|H\.?264|AAC|DTS|BluRay|WEB-?DL|HDRip|BRRip/gi, '')
                .replace(/[._-]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            setSearchQuery(cleanTitle);
        }
    }, [show, videoTitle]);

    // Auto-search when dialog opens with a title
    useEffect(() => {
        if (show && searchQuery && !hasSearched && activeTab === 'search') {
            handleSearch();
        }
    }, [show, searchQuery, activeTab]);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim() && !imdbId && !tmdbId) return;

        setIsSearching(true);
        setError(null);
        setHasSearched(true);

        try {
            const params = new URLSearchParams();
            if (imdbId) {
                params.append('imdb_id', imdbId);
            } else if (tmdbId) {
                params.append('tmdb_id', tmdbId);
            } else {
                params.append('query', searchQuery.trim());
            }
            params.append('languages', selectedLanguage);

            const response = await fetch(`${streamBaseUrl}/subtitles/search?${params.toString()}`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Search failed');
            }

            const data = await response.json();
            setSearchResults(data.results || []);

            if (data.results?.length === 0) {
                setError('No subtitles found. Try a different search term or language.');
            }
        } catch (err) {
            setError(err.message || 'Failed to search subtitles');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleDownloadSubtitle = async (result) => {
        if (!result.zip_url && !result.id && !result.download_url && !result.file_id) {
            setError('Invalid subtitle file');
            return;
        }

        setDownloadingId(result.id);
        setError(null);

        try {
            // Get the subtitle URL through our proxy
            // Prefer zip_url (works without auth), then subtitle_id, then download_url
            let downloadParam;
            if (result.zip_url) {
                downloadParam = `zip_url=${encodeURIComponent(result.zip_url)}`;
            } else if (result.id) {
                downloadParam = `subtitle_id=${result.id}`;
            } else if (result.download_url) {
                downloadParam = `download_url=${encodeURIComponent(result.download_url)}`;
            } else {
                downloadParam = `file_id=${result.file_id}`;
            }
            const subtitleUrl = `${streamBaseUrl}/subtitles/download?${downloadParam}`;

            // Test if we can fetch it
            const response = await fetch(subtitleUrl);
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to download subtitle');
            }

            // Create display name from result info
            const langName = result.language_name || result.language?.toUpperCase() || 'EN';
            const displayName = `${result.release || result.feature || 'Subtitle'} (${langName})`;

            // Add to external subtitles via the onLoadUrl callback
            // We pass the download URL directly since the proxy handles conversion
            await onLoadUrl(subtitleUrl, displayName);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to download subtitle');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleUrlSubmit = async (e) => {
        e.preventDefault();
        if (!url.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            await onLoadUrl(url.trim());
            setUrl('');
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to load subtitle');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = async (files) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        const validExtensions = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(ext)) {
            setError(`Unsupported format. Supported: ${validExtensions.join(', ')}`);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const content = await file.text();
            await onLoadFile(content, file.name);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to load subtitle file');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    }, []);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setError(null);
    };

    if (!show) return null;

    return (
        <div className="external-subtitle-overlay" onClick={onClose}>
            <div className="external-subtitle-dialog" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="dialog-header">
                    <h3>
                        <Globe size={20} />
                        Load Subtitle
                    </h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="dialog-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                        onClick={() => handleTabChange('search')}
                    >
                        <Search size={16} />
                        Search Online
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'url' ? 'active' : ''}`}
                        onClick={() => handleTabChange('url')}
                    >
                        <Link size={16} />
                        From URL
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
                        onClick={() => handleTabChange('file')}
                    >
                        <Upload size={16} />
                        Upload
                    </button>
                </div>

                {/* Content */}
                <div className="dialog-content">
                    {/* Search Tab */}
                    {activeTab === 'search' && (
                        <div className="search-tab">
                            <form onSubmit={handleSearch} className="search-form">
                                <div className="search-row">
                                    <div className="search-input-wrapper">
                                        <Search size={18} className="search-icon" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Movie or TV show name..."
                                            disabled={isSearching}
                                        />
                                    </div>
                                    <select
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                        className="language-select"
                                        disabled={isSearching}
                                    >
                                        {LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        className="search-btn"
                                        disabled={isSearching || (!searchQuery.trim() && !imdbId && !tmdbId)}
                                    >
                                        {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                    </button>
                                </div>
                            </form>

                            {/* Search Results */}
                            <div className="search-results">
                                {isSearching && (
                                    <div className="loading-state">
                                        <Loader2 size={32} className="animate-spin" />
                                        <p>Searching for subtitles...</p>
                                    </div>
                                )}

                                {!isSearching && searchResults.length === 0 && hasSearched && !error && (
                                    <div className="empty-state">
                                        <Search size={48} />
                                        <p>No subtitles found</p>
                                        <span>Try a different search term or language</span>
                                    </div>
                                )}

                                {!isSearching && !hasSearched && (
                                    <div className="empty-state">
                                        <Search size={48} />
                                        <p>Search for subtitles</p>
                                        <span>Enter a movie or TV show name to find subtitles</span>
                                    </div>
                                )}

                                {!isSearching && searchResults.length > 0 && (
                                    <div className="results-list">
                                        {searchResults.map((result) => (
                                            <div key={result.id} className="result-item">
                                                <div className="result-info">
                                                    <div className="result-title">
                                                        {result.release || result.feature || 'Unknown'}
                                                        {result.from_trusted && (
                                                            <span className="trusted-badge" title="Trusted uploader">
                                                                <Star size={12} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="result-meta">
                                                        <span className="lang-badge">{result.language?.toUpperCase()}</span>
                                                        {result.download_count && (
                                                            <span className="downloads">
                                                                <Download size={12} /> {result.download_count.toLocaleString()}
                                                            </span>
                                                        )}
                                                        {result.hearing_impaired && (
                                                            <span className="hi-badge" title="Hearing Impaired">HI</span>
                                                        )}
                                                        {result.uploader && (
                                                            <span className="uploader">by {result.uploader}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    className="download-btn"
                                                    onClick={() => handleDownloadSubtitle(result)}
                                                    disabled={downloadingId === result.id}
                                                >
                                                    {downloadingId === result.id ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <Download size={18} />
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* URL Tab */}
                    {activeTab === 'url' && (
                        <form onSubmit={handleUrlSubmit} className="url-form">
                            <div className="input-group">
                                <label htmlFor="subtitle-url">Subtitle URL</label>
                                <input
                                    id="subtitle-url"
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com/subtitle.srt"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                            <p className="help-text">
                                Supports SRT, VTT, ASS/SSA formats. You can use direct links from OpenSubtitles, Subscene, or any other source.
                            </p>
                            <button
                                type="submit"
                                className="load-btn"
                                disabled={isLoading || !url.trim()}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Globe size={18} />
                                        Load Subtitle
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* File Tab */}
                    {activeTab === 'file' && (
                        <div
                            className={`file-drop-zone ${dragActive ? 'drag-active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".srt,.vtt,.ass,.ssa,.sub"
                                onChange={(e) => handleFileSelect(e.target.files)}
                                style={{ display: 'none' }}
                            />
                            {isLoading ? (
                                <Loader2 size={48} className="animate-spin" />
                            ) : (
                                <FileText size={48} />
                            )}
                            <p className="drop-text">
                                {dragActive
                                    ? 'Drop subtitle file here'
                                    : 'Drag & drop subtitle file or click to browse'}
                            </p>
                            <p className="format-text">
                                Supports: SRT, VTT, ASS, SSA
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExternalSubtitleDialog;
