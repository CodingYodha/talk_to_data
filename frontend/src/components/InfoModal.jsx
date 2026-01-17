import { useState } from 'react';

/**
 * InfoModal - Feature showcase popup
 * Lists key system capabilities
 */
export default function InfoModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const features = [
        {
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            ),
            title: "AI-Powered Reasoning",
            description: "Multi-step reasoning with Claude or GPT models. Sees your data structure to write precise SQL."
        },
        {
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            ),
            title: "Read-Only Safety",
            description: "All write operations blocked. Your database is safe from accidental modifications."
        },
        {
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
            ),
            title: "Universal Database",
            description: "Connect to SQLite, PostgreSQL, or MySQL. Switch databases with one config change."
        },
        {
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            title: "Deep Analysis",
            description: "Auto-generate charts and insights. LLM picks the best visualization for your data."
        },
        {
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            ),
            title: "Self-Correcting",
            description: "If a query fails, the AI analyzes the error and retries with corrections automatically."
        },
        {
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            ),
            title: "Mobile Optimized",
            description: "Responsive design that works great on phones, tablets, and desktops."
        }
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-fade-in"
                onClick={onClose}
            />

            {/* Modal - Centered with proper margins */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg z-[101] animate-fade-in-up">
                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
                        <div>
                            <h2 className="text-lg font-serif text-[var(--color-text)]">Talk to Data</h2>
                            <p className="text-xs text-[var(--color-text-muted)]">AI-powered database queries</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                        >
                            <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Features List */}
                    <div className="flex-1 overflow-y-auto p-5">
                        <div className="space-y-4">
                            {features.map((feature, idx) => (
                                <div
                                    key={idx}
                                    className="flex gap-4 p-3 rounded-xl bg-[var(--color-bg-alt)] border border-[var(--color-border)]"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)]">
                                        {feature.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-[var(--color-text)]">{feature.title}</h3>
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-[var(--color-border)] flex-shrink-0">
                        <p className="text-xs text-center text-[var(--color-text-muted)]">
                            Built with FastAPI + React + Claude AI
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
