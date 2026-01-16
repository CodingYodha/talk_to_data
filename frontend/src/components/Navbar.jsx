import { useTheme } from '../context/ThemeContext';

/**
 * Navbar - Floating translucent navigation bar with fluid animations
 */
export default function Navbar({ onNavigate, currentPage }) {
    const { isDark, toggleTheme } = useTheme();
    const isChat = currentPage === 'chat';

    return (
        <nav
            className={`fixed z-50 navbar transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isChat
                    ? 'top-4 left-4 px-3 py-2'
                    : 'top-4 left-1/2 -translate-x-1/2 px-8 py-3 hover:px-12'
                }`}
        >
            <div className={`flex items-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isChat ? 'gap-2' : 'gap-10'}`}>
                {/* Logo */}
                <div
                    className="flex items-center gap-2 cursor-pointer relative px-3 py-2 rounded-full overflow-hidden"
                    onClick={() => onNavigate('home')}
                >
                    <span className="hover-bg"></span>
                    <div className={`rounded-full bg-[var(--color-primary)] flex items-center justify-center relative z-10 transition-all duration-500 ${isChat ? 'w-6 h-6' : 'w-7 h-7'}`}>
                        <span className={`text-[var(--color-bg)] font-serif font-semibold transition-all duration-500 ${isChat ? 'text-xs' : 'text-sm'}`}>T</span>
                    </div>
                    <span className={`font-serif font-medium text-[var(--color-text)] relative z-10 transition-all duration-500 whitespace-nowrap overflow-hidden ${isChat ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Talk to Data
                    </span>
                </div>

                {/* Nav Links */}
                <div className={`flex items-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isChat ? 'gap-1' : 'gap-6'}`}>
                    <button
                        onClick={() => onNavigate('home')}
                        className={`nav-link relative rounded-full overflow-hidden transition-all duration-500 ${isChat ? 'px-3 py-1.5' : 'px-4 py-2'}`}
                    >
                        <span className="hover-bg"></span>
                        <span className={`relative z-10 font-medium transition-all duration-500 ${isChat ? 'text-xs' : 'text-sm'} ${currentPage === 'home'
                                ? 'text-[var(--color-text)]'
                                : 'text-[var(--color-text-secondary)]'
                            }`}>
                            Home
                        </span>
                    </button>
                    <button
                        onClick={() => onNavigate('chat')}
                        className={`nav-link relative rounded-full overflow-hidden transition-all duration-500 ${isChat ? 'px-3 py-1.5' : 'px-4 py-2'}`}
                    >
                        <span className="hover-bg"></span>
                        <span className={`relative z-10 font-medium transition-all duration-500 ${isChat ? 'text-xs' : 'text-sm'} ${currentPage === 'chat'
                                ? 'text-[var(--color-text)]'
                                : 'text-[var(--color-text-secondary)]'
                            }`}>
                            Query
                        </span>
                    </button>
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`nav-link relative rounded-full overflow-hidden transition-all duration-500 ${isChat ? 'p-1.5' : 'p-2'}`}
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    <span className="hover-bg"></span>
                    {isDark ? (
                        <svg className={`text-[var(--color-text)] relative z-10 transition-all duration-500 ${isChat ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        <svg className={`text-[var(--color-text)] relative z-10 transition-all duration-500 ${isChat ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>

                {/* CTA Button - only on home */}
                <div className={`transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isChat ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-2'}`}>
                    <button
                        onClick={() => onNavigate('chat')}
                        className="btn-primary whitespace-nowrap"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </nav>
    );
}
