import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Check, AlertCircle, Loader2, Globe } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

import { ftpService } from '../services/ftp';

export const AddFtpModal = ({ isOpen, onClose }) => {
    const addFtpSource = useStore((state) => state.addFtpSource);
    const syncFtp = useStore((state) => state.syncFtp);
    const [formData, setFormData] = useState({
        host: '',
        port: '21',
        user: '',
        password: '',
        remotePath: '/',
        secure: false,
        allowSelfSigned: false,
    });
    const [status, setStatus] = useState('idle'); // idle, testing, syncing, success, error
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (status !== 'idle') setStatus('idle');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('testing');
        setErrorMessage('');

        try {
            if (!formData.host || !formData.user) {
                throw new Error("Host and User are required.");
            }

            // Real connection test
            await ftpService.test({
                host: formData.host,
                port: parseInt(formData.port),
                user: formData.user,
                password: formData.password,
                secure: formData.secure,
                rejectUnauthorized: !formData.allowSelfSigned
            });

            // Add to store
            const config = {
                host: formData.host,
                port: parseInt(formData.port),
                user: formData.user,
                password: formData.password, // Note: storing plaintext pwd in memory/store. Should be secured in real app.
                remotePath: formData.remotePath,
                secure: formData.secure,
                rejectUnauthorized: !formData.allowSelfSigned
            };
            addFtpSource(config);

            // Trigger Sync
            setStatus('syncing');
            const success = await syncFtp(config);
            if (!success) {
                throw new Error("Connection successful, but sync failed.");
            }

            setStatus('success');
            setTimeout(() => {
                onClose();
                setStatus('idle');
                setFormData({
                    host: '',
                    port: '21',
                    user: '',
                    password: '',
                    remotePath: '/',
                    secure: false,
                });
            }, 1000);

        } catch (err) {
            setStatus('error');
            // Extract error message from IPC error object if possible, or use default
            setErrorMessage(err.message?.replace('Error invoking remote method \'ftp-test\': Error: ', '') || "Failed to connect to FTP server.");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Server className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Add FTP Source</h2>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect to a remote FTP server</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-colors text-neutral-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Host / IP</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                            <input
                                                type="text"
                                                name="host"
                                                value={formData.host}
                                                onChange={handleChange}
                                                placeholder="192.168.1.50"
                                                className="w-full bg-neutral-100 dark:bg-white/5 border-transparent focus:border-primary focus:ring-0 rounded-xl pl-10 pr-4 py-3 text-neutral-900 dark:text-white transition-all outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Port</label>
                                        <input
                                            type="number"
                                            name="port"
                                            value={formData.port}
                                            onChange={handleChange}
                                            placeholder="21"
                                            className="w-full bg-neutral-100 dark:bg-white/5 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-neutral-900 dark:text-white transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Username</label>
                                        <input
                                            type="text"
                                            name="user"
                                            value={formData.user}
                                            onChange={handleChange}
                                            placeholder="user"
                                            className="w-full bg-neutral-100 dark:bg-white/5 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-neutral-900 dark:text-white transition-all outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="••••••"
                                            className="w-full bg-neutral-100 dark:bg-white/5 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-neutral-900 dark:text-white transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Remote Path</label>
                                    <input
                                        type="text"
                                        name="remotePath"
                                        value={formData.remotePath}
                                        onChange={handleChange}
                                        placeholder="/Movies"
                                        className="w-full bg-neutral-100 dark:bg-white/5 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-neutral-900 dark:text-white transition-all outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <label className="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-neutral-200 dark:hover:bg-white/10 transition">
                                        <input
                                            type="checkbox"
                                            name="secure"
                                            checked={formData.secure}
                                            onChange={handleChange}
                                            className="w-5 h-5 rounded border-neutral-300 text-primary focus:ring-primary"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-neutral-900 dark:text-white">Use Secure Connection (FTPS)</div>
                                            <div className="text-xs text-neutral-500">Encrypts the connection (TLS/SSL).</div>
                                        </div>
                                    </label>

                                    {formData.secure && (
                                        <label className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl cursor-pointer hover:bg-orange-500/20 transition">
                                            <input
                                                type="checkbox"
                                                name="allowSelfSigned"
                                                checked={formData.allowSelfSigned}
                                                onChange={handleChange}
                                                className="w-5 h-5 rounded border-orange-500 text-orange-600 focus:ring-orange-500"
                                            />
                                            <div>
                                                <div className="text-sm font-bold text-orange-600 dark:text-orange-400">Allow Self-Signed Certificates</div>
                                                <div className="text-xs text-orange-600/70 dark:text-orange-400/70">Enable this if you use a home server without a public domain.</div>
                                            </div>
                                        </label>
                                    )}
                                </div>

                                {/* Status Messages */}
                                {status === 'error' && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        {errorMessage}
                                    </div>
                                )}
                                {status === 'success' && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-500 text-sm">
                                        <Check className="w-4 h-4" />
                                        Connected and Synced!
                                    </div>
                                )}

                                {/* Footer Actions */}
                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-200 dark:border-white/10 mt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={status === 'testing' || status === 'syncing' || status === 'success'}
                                        className={cn(
                                            "px-6 py-2 bg-primary text-black font-bold rounded-xl text-sm transition-all hover:brightness-110 active:scale-95 flex items-center gap-2",
                                            (status === 'testing' || status === 'syncing' || status === 'success') && "opacity-70 cursor-not-allowed"
                                        )}
                                    >
                                        {status === 'testing' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                                            </>
                                        ) : status === 'syncing' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Syncing Library...
                                            </>
                                        ) : status === 'success' ? (
                                            <>
                                                <Check className="w-4 h-4" /> Done
                                            </>
                                        ) : (
                                            'Connect & Add'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
