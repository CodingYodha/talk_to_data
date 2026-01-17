import { useState, useRef } from 'react';

/**
 * DatabaseModal - Database switcher popup
 * Upload custom SQLite database or reset to demo
 */
export default function DatabaseModal({ isOpen, onClose }) {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }
    const [dbInfo, setDbInfo] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.db')) {
            setStatus({ type: 'error', message: 'Only .db files are allowed' });
            return;
        }

        setIsLoading(true);
        setStatus({ type: 'loading', message: 'Swapping Brains...' });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/database/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setDbInfo(data.database);
                setStatus({
                    type: 'success',
                    message: `Connected to New Database - ${data.database.table_count} tables found`
                });
            } else {
                setStatus({
                    type: 'error',
                    message: data.detail || data.message || 'Upload failed'
                });
            }
        } catch (error) {
            setStatus({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setIsLoading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleReset = async () => {
        setIsLoading(true);
        setStatus({ type: 'loading', message: 'Resetting to Demo Database...' });

        try {
            const response = await fetch('/api/database/reset', {
                method: 'POST',
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setDbInfo(data.database);
                setStatus({
                    type: 'success',
                    message: `Reset Complete - Demo database with ${data.database.table_count} tables`
                });
            } else {
                setStatus({
                    type: 'error',
                    message: data.detail || data.message || 'Reset failed'
                });
            }
        } catch (error) {
            setStatus({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStatus(null);
        setDbInfo(null);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-fade-in"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md z-[101] animate-fade-in-up">
                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-serif text-[var(--color-text)]">Switch Database</h2>
                                <p className="text-xs text-[var(--color-text-muted)]">Upload your own SQLite file</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                        >
                            <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        {/* Status Message */}
                        {status && (
                            <div className={`p-4 rounded-xl border ${status.type === 'success'
                                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                    : status.type === 'error'
                                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                        : 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {status.type === 'loading' && (
                                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {status.type === 'success' && (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {status.type === 'error' && (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                    <span className="text-sm font-medium">{status.message}</span>
                                </div>
                            </div>
                        )}

                        {/* Database Info */}
                        {dbInfo && status?.type === 'success' && (
                            <div className="p-4 rounded-xl bg-[var(--color-bg-alt)] border border-[var(--color-border)]">
                                <p className="text-xs text-[var(--color-text-muted)] mb-2">Available Tables:</p>
                                <div className="flex flex-wrap gap-2">
                                    {dbInfo.tables?.slice(0, 8).map((table, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 text-xs rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
                                        >
                                            {table}
                                        </span>
                                    ))}
                                    {dbInfo.tables?.length > 8 && (
                                        <span className="px-2 py-1 text-xs text-[var(--color-text-muted)]">
                                            +{dbInfo.tables.length - 8} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Upload Section */}
                        <div className="space-y-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".db"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="db-upload"
                            />
                            <label
                                htmlFor="db-upload"
                                className={`flex items-center justify-center gap-3 w-full p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${isLoading
                                        ? 'border-[var(--color-border)] bg-[var(--color-bg-alt)] opacity-50 pointer-events-none'
                                        : 'border-[var(--color-accent)]/50 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5'
                                    }`}
                            >
                                <svg className="w-6 h-6 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span className="text-sm font-medium text-[var(--color-text)]">
                                    Upload SQLite Database (.db)
                                </span>
                            </label>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[var(--color-border)]"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-2 bg-[var(--color-surface)] text-[var(--color-text-muted)]">or</span>
                                </div>
                            </div>

                            <button
                                onClick={handleReset}
                                disabled={isLoading}
                                className={`w-full p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${isLoading
                                        ? 'border-[var(--color-border)] bg-[var(--color-bg-alt)] opacity-50 cursor-not-allowed'
                                        : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)]'
                                    }`}
                            >
                                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="text-sm text-[var(--color-text)]">Reset to Demo Database</span>
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]">
                        <p className="text-xs text-center text-[var(--color-text-muted)]">
                            Your data stays in-memory. Read-only mode enforced.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
