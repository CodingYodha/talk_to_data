import { useState, useRef, useEffect, useCallback } from 'react';
import { streamQuery, analyzeData } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import ChatMessage from './components/ChatMessage';
import ChatSidebar from './components/ChatSidebar';
import SettingsPage from './components/SettingsPage';
import AnalysisPanel from './components/AnalysisPanel';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Utility functions for localStorage
const STORAGE_KEY = 'talk_to_data_chats';
const LLM_MODE_KEY = 'talk_to_data_llm_mode';

const loadChats = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveChats = (chats) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (e) {
    console.error('Failed to save chats:', e);
  }
};

const generateChatId = () => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const generateChatTitle = (messages) => {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    const title = firstUserMessage.content.slice(0, 40);
    return title.length < firstUserMessage.content.length ? title + '...' : title;
  }
  return 'New Chat';
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSql, setLastSql] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('');
  const [selectedReports, setSelectedReports] = useState(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [llmMode, setLlmMode] = useState(() => {
    try {
      return localStorage.getItem(LLM_MODE_KEY) || 'paid';
    } catch { return 'paid'; }
  });
  // Analysis state (lifted from ChatMessage)
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const messagesEndRef = useRef(null);

  const toggleLlmMode = useCallback(() => {
    setLlmMode(prev => {
      const newMode = prev === 'paid' ? 'free' : 'paid';
      try { localStorage.setItem(LLM_MODE_KEY, newMode); } catch { }
      return newMode;
    });
  }, []);

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = loadChats();
    setChats(savedChats);
    if (savedChats.length > 0) {
      const mostRecent = savedChats[0];
      setActiveChatId(mostRecent.id);
      setMessages(mostRecent.messages || []);
    }
  }, []);

  // Save current chat when messages change
  useEffect(() => {
    if (activeChatId && messages.length > 0) {
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat =>
          chat.id === activeChatId
            ? { ...chat, messages, messageCount: messages.length, title: generateChatTitle(messages), updatedAt: Date.now() }
            : chat
        );
        saveChats(updatedChats);
        return updatedChats;
      });
    }
  }, [messages, activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const downloadableMessages = messages.filter(
    (m) => m.role === 'assistant' && m.results && m.results.length > 0
  );

  const handleNewChat = useCallback(() => {
    const newChatId = generateChatId();
    const newChat = {
      id: newChatId,
      title: 'New Chat',
      messages: [],
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setChats(prev => {
      const updated = [newChat, ...prev];
      saveChats(updated);
      return updated;
    });
    setActiveChatId(newChatId);
    setMessages([]);
    setSuggestions([]);
    setLastSql(null);
    setCurrentPage('chat');
  }, []);

  const handleSelectChat = useCallback((chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setActiveChatId(chatId);
      setMessages(chat.messages || []);
      setSuggestions([]);
      setLastSql(null);
    }
  }, [chats]);

  const handleDeleteChat = useCallback((chatId) => {
    setChats(prev => {
      const updated = prev.filter(c => c.id !== chatId);
      saveChats(updated);
      if (chatId === activeChatId) {
        if (updated.length > 0) {
          setActiveChatId(updated[0].id);
          setMessages(updated[0].messages || []);
        } else {
          setActiveChatId(null);
          setMessages([]);
        }
        setSuggestions([]);
        setLastSql(null);
      }
      return updated;
    });
  }, [activeChatId]);

  const handleClearChat = useCallback(() => {
    if (!activeChatId) return;
    setMessages([]);
    setSuggestions([]);
    setLastSql(null);
    setChats(prev => {
      const updated = prev.map(chat =>
        chat.id === activeChatId
          ? { ...chat, messages: [], messageCount: 0, title: 'New Chat', updatedAt: Date.now() }
          : chat
      );
      saveChats(updated);
      return updated;
    });
  }, [activeChatId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question || isLoading) return;

    if (!activeChatId) {
      const newChatId = generateChatId();
      const newChat = {
        id: newChatId,
        title: 'New Chat',
        messages: [],
        messageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setChats(prev => {
        const updated = [newChat, ...prev];
        saveChats(updated);
        return updated;
      });
      setActiveChatId(newChatId);
    }

    const userMessage = { id: Date.now(), role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSuggestions([]);
    setCurrentStatus('');
    setIsLoading(true);

    const assistantId = Date.now() + 1;
    const streamingMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      thought_trace: '',
      sql_code: '',
      columns: [],
      results: [],
      data_summary: '',
      error: null,
      originalQuestion: question,
      isStreaming: true,
      streamingStatus: 'Connecting...',
      model_used: '',
    };
    setMessages((prev) => [...prev, streamingMessage]);

    try {
      await streamQuery(question, lastSql, (eventType, data) => {
        setMessages((prev) => {
          const updated = [...prev];
          const msgIndex = updated.findIndex((m) => m.id === assistantId);
          if (msgIndex === -1) return prev;
          const msg = { ...updated[msgIndex] };

          switch (eventType) {
            case 'status': msg.streamingStatus = data; setCurrentStatus(data); break;
            case 'model': msg.model_used = data; msg.content = `Processing with ${data} model...`; break;
            case 'thought': msg.thought_trace = data; break;
            case 'sql': msg.sql_code = data; setLastSql(data); break;
            case 'table': msg.columns = data.columns || []; msg.results = data.results || []; msg.content = `Processed using ${msg.model_used || 'unknown'} model.`; break;
            case 'suggestions': setSuggestions(data || []); break;
            case 'summary': msg.data_summary = data; break;
            case 'error': msg.error = data; msg.content = 'Error processing query'; break;
            case 'done': msg.isStreaming = false; msg.streamingStatus = ''; if (!msg.content || msg.content.includes('Processing')) { msg.content = `Processed using ${msg.model_used || 'unknown'} model.`; } break;
            default: break;
          }
          updated[msgIndex] = msg;
          return updated;
        });
      }, llmMode);
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        const msgIndex = updated.findIndex((m) => m.id === assistantId);
        if (msgIndex !== -1) {
          updated[msgIndex] = { ...updated[msgIndex], error: error.message || 'An unexpected error occurred', content: 'Error processing query', isStreaming: false };
        }
        return updated;
      });
      setSuggestions([]);
    } finally {
      setIsLoading(false);
      setCurrentStatus('');
    }
  };

  const handleSuggestionClick = (suggestion) => setInputValue(suggestion);

  // Handle deep analysis request from ChatMessage
  const handleAnalysis = async (data, question) => {
    // Quick frontend validation with user-friendly message
    if (!data || data.length < 2) {
      setAnalysisData(null);
      setAnalysisError('Analysis cannot be done - data is too short (need at least 2 rows)');
      return;
    }
    if (Object.keys(data[0] || {}).length < 2) {
      setAnalysisData(null);
      setAnalysisError('Analysis cannot be done - data is too short (need at least 2 columns)');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisData(null);

    try {
      console.log('[Analysis] Calling API with', data.length, 'rows');
      const result = await analyzeData(data, question);
      console.log('[Analysis] Result:', result);

      if (result.success) {
        setAnalysisData(result);
      } else {
        setAnalysisError(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('[Analysis] Error:', error);
      setAnalysisError(error.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCloseAnalysis = () => {
    setAnalysisData(null);
    setAnalysisError(null);
  };

  const handleReportSelect = (messageId) => {
    setSelectedReports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) newSet.delete(messageId);
      else newSet.add(messageId);
      return newSet;
    });
  };

  const generateCombinedPDF = (messagesToExport) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    doc.setFontSize(20);
    doc.setTextColor(26, 31, 54);
    doc.text('Talk to Data - Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    messagesToExport.forEach((message, index) => {
      if (yPos > 250) { doc.addPage(); yPos = 20; }

      doc.setFontSize(12);
      doc.setTextColor(26, 31, 54);
      doc.text(`Query ${index + 1}`, 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const questionLines = doc.splitTextToSize(`Q: ${message.originalQuestion || 'N/A'}`, pageWidth - 28);
      doc.text(questionLines, 14, yPos);
      yPos += questionLines.length * 5 + 5;

      if (message.data_summary) {
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        const summaryLines = doc.splitTextToSize(`Analysis: ${message.data_summary}`, pageWidth - 28);
        doc.text(summaryLines, 14, yPos);
        yPos += summaryLines.length * 4 + 5;
      }

      if (message.results && message.results.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [message.columns],
          body: message.results.slice(0, 10),
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [26, 31, 54], textColor: 255 },
          alternateRowStyles: { fillColor: [248, 249, 250] },
          margin: { left: 14, right: 14 },
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      doc.setDrawColor(229, 231, 235);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 10;
    });

    doc.save('report.pdf');
  };

  const handleDownloadSelected = () => {
    const selected = messages.filter((m) => selectedReports.has(m.id));
    generateCombinedPDF(selected);
    setSelectedReports(new Set());
  };

  const handleDownloadAll = () => generateCombinedPDF(downloadableMessages);

  const hasSuggestions = suggestions.length > 0 && !isLoading;
  const hasSelectedReports = selectedReports.size > 1;

  const handleNavigateToChat = () => {
    if (chats.length === 0) handleNewChat();
    else setCurrentPage('chat');
  };

  if (currentPage === 'home') {
    return (
      <>
        <Navbar onNavigate={setCurrentPage} currentPage={currentPage} />
        <LandingPage onGetStarted={handleNavigateToChat} />
      </>
    );
  }

  if (currentPage === 'settings') {
    return (
      <SettingsPage
        onBack={() => setCurrentPage('chat')}
        llmMode={llmMode}
        onToggleLLM={toggleLlmMode}
      />
    );
  }

  return (
    <div className="min-h-screen h-screen grid-bg flex overflow-hidden">
      <Navbar
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Chat Sidebar - with spacing from navbar */}
      <div className="pt-12 ml-12 h-full hidden md:block">
        <ChatSidebar
          chats={chats}
          activeChat={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Mobile Sidebar */}
      <ChatSidebar
        chats={chats}
        activeChat={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isMobile
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:flex-row h-full transition-all duration-700 ease-out px-2 md:pr-4 py-2 md:py-4 pt-12 md:pt-10">
        {/* Chat Container */}
        <div className={`flex flex-col surface overflow-hidden transition-all duration-500 ease-out flex-1 ${hasSuggestions ? 'md:max-w-4xl lg:max-w-5xl' : 'md:max-w-5xl lg:max-w-6xl'}`}>
          {/* Chat Header */}
          <div className="px-3 md:px-4 py-2 md:py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-[var(--color-text)] text-xs md:text-sm truncate">
                {chats.find(c => c.id === activeChatId)?.title || 'New Chat'}
              </h3>
              <p className="text-[10px] md:text-xs text-[var(--color-text-muted)]">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {downloadableMessages.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition-all duration-200"
                  title="Export all reports"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Export ({downloadableMessages.length})</span>
                </button>
              )}

              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                  title="Clear chat history"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6">

            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <p className="text-base md:text-lg font-serif text-[var(--color-text)] mb-2">Ready to query</p>
                  <p className="text-xs md:text-sm text-[var(--color-text-muted)]">
                    Try: "Show me top 5 artists by sales"
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isSelected={selectedReports.has(message.id)}
                    onSelect={handleReportSelect}
                    showCheckbox={message.role === 'assistant' && message.results?.length > 0}
                    onAnalysis={handleAnalysis}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Status Bar */}
          {currentStatus && (
            <div className="px-3 md:px-4 py-1.5 md:py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]">
              <div className="flex items-center gap-2 text-xs md:text-sm text-[var(--color-text-secondary)]">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[var(--color-accent)] animate-pulse"></div>
                <span className="truncate">{currentStatus}</span>
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-2 md:p-4 border-t border-[var(--color-border)]">
            <div className="flex gap-2 md:gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                className="input flex-1 text-sm md:text-base py-2 md:py-3 px-3 md:px-4"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="btn-primary disabled:opacity-50 text-xs md:text-sm px-3 md:px-6"
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Right side panel - Suggestions only */}
        <div className={`hidden md:flex flex-col transition-all duration-500 ease-out ml-4 ${hasSuggestions ? 'w-56 lg:w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden ml-0'}`}>
          <div className="card flex-1 animate-slide-in-right overflow-hidden">
            <p className="text-[10px] lg:text-xs text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">Suggestions</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-btn px-3 py-2 text-left text-xs text-[var(--color-text)] bg-[var(--color-bg-alt)] rounded-lg border border-[var(--color-border)]"
                >
                  <span className="hover-bg"></span>
                  <span className="relative z-10">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Analysis Panel */}
      {(analysisData || isAnalyzing || analysisError) && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={handleCloseAnalysis}
          />
          {/* Panel - Centered at top */}
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-3xl">
            <AnalysisPanel
              analysisData={analysisData}
              isLoading={isAnalyzing}
              error={analysisError}
              onClose={handleCloseAnalysis}
            />
          </div>
        </>
      )}

      {/* Floating Download Button */}
      <div className={`fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${hasSelectedReports ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        <button onClick={handleDownloadSelected} className="btn-accent flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 shadow-lg text-xs md:text-sm">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download {selectedReports.size}
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
