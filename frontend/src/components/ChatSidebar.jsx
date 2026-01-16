import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * ChatSidebar - Responsive sidebar with resize handle
 */
export default function ChatSidebar({
    chats,
    activeChat,
    onSelectChat,
    onNewChat,
    onDeleteChat,
    isOpen,
    onClose,
    isMobile = false
}) {
    const { isDark } = useTheme();
    const [hoveredChat, setHoveredChat] = useState(null);
    const [width, setWidth] = useState(220);
    const [isResizing, setIsResizing] = useState(false);

    const handleChatSelect = (chatId) => {
        onSelectChat(chatId);
        if (isMobile) onClose?.();
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = width;

        const handleMouseMove = (e) => {
            const newWidth = startWidth + (e.clientX - startX);
            setWidth(Math.max(160, Math.min(320, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Mobile version - overlay
    if (isMobile) {
        return (
            <>
                {/* Backdrop */}
                <div
                    className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    onClick={onClose}
                />

                {/* Mobile drawer */}
                <div className={`
          fixed top-0 left-0 z-40 h-full w-64
          flex flex-col 
          bg-[var(--color-surface)] 
          border-r border-[var(--color-border)] 
          transition-transform duration-300 ease-out
          md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
                    {/* Header */}
                    <div className="p-3 border-b border-[var(--color-border)] pt-14">
                        <button
                            onClick={() => { onNewChat(); onClose?.(); }}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Chat
                        </button>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {renderChatList()}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-[var(--color-border)]">
                        <p className="text-xs text-[var(--color-text-muted)] text-center">
                            {chats.length} chat{chats.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </>
        );
    }

    function renderChatList() {
        if (chats.length === 0) {
            return (
                <div className="text-center py-6">
                    <p className="text-xs text-[var(--color-text-muted)]">No chats yet</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-0.5">
                {chats.map((chat) => (
                    <div
                        key={chat.id}
                        className={`group relative rounded-lg transition-all duration-200 cursor-pointer ${activeChat === chat.id
                            ? 'bg-[var(--color-bg-alt)]'
                            : 'hover:bg-[var(--color-surface-hover)]'
                            }`}
                        onMouseEnter={() => setHoveredChat(chat.id)}
                        onMouseLeave={() => setHoveredChat(null)}
                        onClick={() => handleChatSelect(chat.id)}
                    >
                        <div className="px-2 py-1.5 pr-7">
                            <p className="text-[11px] text-[var(--color-text)] truncate font-medium leading-tight">
                                {chat.title || 'New Chat'}
                            </p>
                            <p className="text-[9px] text-[var(--color-text-muted)] leading-tight">
                                {chat.messageCount} msg{chat.messageCount !== 1 ? 's' : ''}
                            </p>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChat(chat.id);
                            }}
                            className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded transition-all duration-200 ${hoveredChat === chat.id || activeChat === chat.id
                                ? 'opacity-100'
                                : 'opacity-0'
                                } hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-500`}
                            title="Delete"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    // Desktop version - static with resize
    return (
        <div
            className="relative h-full flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]"
            style={{ width: `${width}px` }}
        >
            {/* Header */}
            <div className="p-2 border-b border-[var(--color-border)]">
                <button
                    onClick={onNewChat}
                    className="w-full btn-primary flex items-center justify-center gap-1.5 py-2 text-xs"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Chat
                </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-1.5">
                {renderChatList()}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-[var(--color-border)]">
                <p className="text-[10px] text-[var(--color-text-muted)] text-center">
                    {chats.length} chat{chats.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Resize handle */}
            <div
                className={`absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[var(--color-accent)]/30 transition-colors ${isResizing ? 'bg-[var(--color-accent)]/50' : ''}`}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
}
