import { useTheme } from '../context/ThemeContext';

/**
 * SettingsPage - Settings with LLM model toggle
 */
export default function SettingsPage({ onBack, llmMode, onToggleLLM }) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen grid-bg">
            {/* Header */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                        <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-serif text-[var(--color-text)]">Settings</h1>
                </div>
            </div>

            {/* Settings Content */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* LLM Model Section */}
                <div className="card mb-6">
                    <h2 className="text-lg font-medium text-[var(--color-text)] mb-4">Language Model</h2>

                    <div className="flex items-center justify-between py-4 border-b border-[var(--color-border)]">
                        <div>
                            <p className="font-medium text-[var(--color-text)]">Model Provider</p>
                            <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                {llmMode === 'paid'
                                    ? 'Using Claude (Anthropic) - Premium quality'
                                    : 'Using GPT-OSS (Groq) - Free tier'
                                }
                            </p>
                        </div>

                        <button
                            onClick={onToggleLLM}
                            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${llmMode === 'paid'
                                    ? 'bg-[var(--color-accent)]'
                                    : 'bg-[var(--color-border)]'
                                }`}
                        >
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${llmMode === 'paid' ? 'translate-x-8' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    <div className="pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-lg border-2 transition-all ${llmMode === 'free'
                                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                                    : 'border-[var(--color-border)]'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🆓</span>
                                    <span className="font-medium text-[var(--color-text)]">Free</span>
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)]">GPT-OSS via Groq</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Flash: gpt-oss-20b</p>
                                <p className="text-[10px] text-[var(--color-text-muted)]">Pro: gpt-oss-120b</p>
                            </div>

                            <div className={`p-4 rounded-lg border-2 transition-all ${llmMode === 'paid'
                                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                                    : 'border-[var(--color-border)]'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">⚡</span>
                                    <span className="font-medium text-[var(--color-text)]">Premium</span>
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)]">Claude via Anthropic</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Flash: claude-3-haiku</p>
                                <p className="text-[10px] text-[var(--color-text-muted)]">Pro: claude-3.5-sonnet</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="card">
                    <h2 className="text-lg font-medium text-[var(--color-text)] mb-4">Appearance</h2>

                    <div className="flex items-center justify-between py-4">
                        <div>
                            <p className="font-medium text-[var(--color-text)]">Dark Mode</p>
                            <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
                            </p>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${isDark
                                    ? 'bg-[var(--color-accent)]'
                                    : 'bg-[var(--color-border)]'
                                }`}
                        >
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${isDark ? 'translate-x-8' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
