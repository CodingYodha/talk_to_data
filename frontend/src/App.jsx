import { useState, useRef, useEffect } from 'react';
import { streamQuery } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import ChatMessage from './components/ChatMessage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSql, setLastSql] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('');
  const [selectedReports, setSelectedReports] = useState(new Set());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const downloadableMessages = messages.filter(
    (m) => m.role === 'assistant' && m.results && m.results.length > 0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question || isLoading) return;

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
      });
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

  // Render landing page or chat
  if (currentPage === 'home') {
    return (
      <>
        <Navbar onNavigate={setCurrentPage} currentPage={currentPage} />
        <LandingPage onGetStarted={() => setCurrentPage('chat')} />
      </>
    );
  }

  return (
    <div className="min-h-screen h-screen grid-bg flex">
      <Navbar onNavigate={setCurrentPage} currentPage={currentPage} />

      {/* Main content area - full height */}
      <div className="flex-1 flex h-full transition-all duration-700 ease-out pl-20 pr-4 py-4">
        {/* Chat Container - takes full height */}
        <div className={`flex flex-col surface overflow-hidden transition-all duration-500 ease-out ${hasSuggestions ? 'flex-1 max-w-5xl' : 'flex-1 max-w-6xl'}`}>
          {/* Messages Area - full height */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-lg font-serif text-[var(--color-text)] mb-2">Ready to query</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Try: "Show me top 5 artists by sales" or "List all rock albums"
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
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Status Bar */}
          {currentStatus && (
            <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse"></div>
                <span>{currentStatus}</span>
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--color-border)]">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                className="input flex-1"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Right side panel */}
        <div className={`flex flex-col transition-all duration-500 ease-out ml-4 ${hasSuggestions ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden ml-0'}`}>
          {/* Header moved to right */}
          <div className="mb-4 text-right pr-2 pt-2">
            <h2 className="text-lg font-serif text-[var(--color-text)]">Query Database</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Natural language</p>
          </div>

          {/* Suggestions */}
          <div className="card flex-1 animate-slide-in-right overflow-hidden">
            <p className="text-xs text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">Suggestions</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-btn px-4 py-3 text-left text-sm text-[var(--color-text)] bg-[var(--color-bg-alt)] rounded-lg border border-[var(--color-border)]"
                >
                  <span className="hover-bg"></span>
                  <span className="relative z-10">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export button - spaced from chat */}
          {downloadableMessages.length > 0 && (
            <button
              onClick={handleDownloadAll}
              className="btn-secondary flex items-center justify-center gap-2 mt-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export All ({downloadableMessages.length})
            </button>
          )}
        </div>

        {/* Header when no suggestions - positioned top right */}
        {!hasSuggestions && (
          <div className="fixed top-4 right-6 text-right animate-fade-in">
            <h2 className="text-lg font-serif text-[var(--color-text)]">Query Database</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Natural language</p>

            {downloadableMessages.length > 0 && (
              <button
                onClick={handleDownloadAll}
                className="btn-secondary flex items-center gap-2 mt-3 ml-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export ({downloadableMessages.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Download Button */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${hasSelectedReports ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        <button onClick={handleDownloadSelected} className="btn-accent flex items-center gap-2 px-6 py-3 shadow-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download {selectedReports.size} Reports
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
