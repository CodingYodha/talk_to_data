import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import InfoModal from './InfoModal';
import DatabaseModal from './DatabaseModal';

/**
 * Navbar - Ultra-compact navigation bar with icons and settings
 */
export default function Navbar({ onNavigate, currentPage, onToggleSidebar, isSidebarOpen }) {
    const { isDark, toggleTheme } = useTheme();
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isDbModalOpen, setIsDbModalOpen] = useState(false);
    const isChat = currentPage === 'chat';
    const isSettings = currentPage === 'settings';

    return (
        <nav
            className={`fixed z-50 navbar transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isChat
                    ? 'top-2 left-2 px-1 py-0.5'
                    : 'top-2 left-1/2 -translate-x-1/2 md:top-4 px-4 py-2 md:px-8 md:py-3'
                }`}
        >
            <div className={`flex items-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isChat ? 'gap-0' : 'gap-3 md:gap-10'}`}>
                {/* Mobile menu button - only on chat page mobile */}
                {isChat && (
                    <button
                        onClick={onToggleSidebar}
                        className="nav-link relative p-1.5 rounded-full overflow-hidden md:hidden"
                        title="Toggle sidebar"
                    >
                        <span className="hover-bg"></span>
                        <svg className="w-4 h-4 text-[var(--color-text)] relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isSidebarOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                )}

                {/* Logo */}
                <div
                    className="flex items-center gap-1 md:gap-2 cursor-pointer relative px-1.5 py-1 md:px-3 md:py-2 rounded-full overflow-hidden"
                    onClick={() => onNavigate('home')}
                    title="Talk to Data"
                >
                    <span className="hover-bg"></span>
                    <div className={`rounded-full bg-[var(--color-primary)] flex items-center justify-center relative z-10 transition-all duration-500 ${isChat ? 'w-5 h-5' : 'w-6 h-6 md:w-7 md:h-7'}`}>
                        <span className={`text-[var(--color-bg)] font-serif font-semibold transition-all duration-500 ${isChat ? 'text-[10px]' : 'text-xs md:text-sm'}`}>T</span>
                    </div>
                    {!isChat && !isSettings && (
                        <span className="font-serif font-medium text-[var(--color-text)] relative z-10 hidden sm:block">
                            Talk to Data
                        </span>
                    )}
                </div>

                {/* Nav Links - Icons on chat page */}
                <div className={`flex items-center transition-all duration-700 ${isChat ? 'gap-0' : 'gap-2 md:gap-6'}`}>
                    {/* Home */}
                    <button
                        onClick={() => onNavigate('home')}
                        className={`nav-link relative rounded-full overflow-hidden transition-all duration-500 ${isChat ? 'p-1' : 'px-3 py-1.5 md:px-4 md:py-2'}`}
                        title="Home"
                    >
                        <span className="hover-bg"></span>
                        {isChat ? (
                            <svg className={`w-3.5 h-3.5 relative z-10 transition-colors ${currentPage === 'home' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        ) : (
                            <span className={`relative z-10 text-xs md:text-sm font-medium ${currentPage === 'home' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                                Home
                            </span>
                        )}
                    </button>

                    {/* Query */}
                    <button
                        onClick={() => onNavigate('chat')}
                        className={`nav-link relative rounded-full overflow-hidden transition-all duration-500 ${isChat ? 'p-1' : 'px-3 py-1.5 md:px-4 md:py-2'}`}
                        title="Query"
                    >
                        <span className="hover-bg"></span>
                        {isChat ? (
                            <svg className={`w-3.5 h-3.5 relative z-10 transition-colors ${currentPage === 'chat' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        ) : (
                            <span className={`relative z-10 text-xs md:text-sm font-medium ${currentPage === 'chat' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                                Query
                            </span>
                        )}
                    </button>

                    {/* Settings */}
                    <button
                        onClick={() => onNavigate('settings')}
                        className={`nav-link relative rounded-full overflow-hidden transition-all duration-500 ${isChat ? 'p-1' : 'px-3 py-1.5 md:px-4 md:py-2'}`}
                        title="Settings"
                    >
                        <span className="hover-bg"></span>
                        {isChat ? (
                            <svg className={`w-3.5 h-3.5 relative z-10 transition-colors ${currentPage === 'settings' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        ) : (
                            <span className={`relative z-10 text-xs md:text-sm font-medium ${currentPage === 'settings' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                                Settings
                            </span>
                        )}
                    </button>
                </div>

                {/* Database Button */}
                <button
                    onClick={() => setIsDbModalOpen(true)}
                    className={`nav-link relative rounded-full overflow-hidden transition-all duration-500 ${isChat ? 'p-1' : 'p-1.5 md:p-2'}`}
                    title="Switch Database"
                >
                    <span className="hover-bg"></span>
                    <svg className={`text-[var(--color-text)] relative z-10 ${isChat ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-5 md:h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                </button>

                {/* Info Button */}
                <button
                    onClick={() => setIsInfoOpen(true)}
                    className={`nav-link relative rounded-full overflow-hidden transition-all duration-500 ${isChat ? 'p-1' : 'p-1.5 md:p-2'}`}
                    title="Features"
                >
                    <span className="hover-bg"></span>
                    <svg className={`text-[var(--color-text)] relative z-10 ${isChat ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-5 md:h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`nav-link relative rounded-full overflow-hidden transition-all duration-500 ${isChat ? 'p-1' : 'p-1.5 md:p-2'}`}
                    title={isDark ? 'Light mode' : 'Dark mode'}
                >
                    <span className="hover-bg"></span>
                    {isDark ? (
                        <svg className={`text-[var(--color-text)] relative z-10 ${isChat ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-5 md:h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        <svg className={`text-[var(--color-text)] relative z-10 ${isChat ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-5 md:h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>

                {/* CTA Button - only on home */}
                {!isChat && !isSettings && (
                    <button
                        onClick={() => onNavigate('chat')}
                        className="btn-primary whitespace-nowrap text-xs md:text-sm px-3 py-1.5 md:px-6 md:py-2.5 hidden sm:block ml-1 md:ml-2"
                    >
                        Get Started
                    </button>
                )}
            </div>

            {/* Modals */}
            <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
            <DatabaseModal isOpen={isDbModalOpen} onClose={() => setIsDbModalOpen(false)} />
        </nav>
    );
}
