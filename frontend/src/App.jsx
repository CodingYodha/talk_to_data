import { useState, useRef, useEffect } from 'react';
import { streamQuery } from './services/api';
import ChatMessage from './components/ChatMessage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSql, setLastSql] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('');
  const [selectedReports, setSelectedReports] = useState(new Set());
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get messages that have results (can be downloaded)
  const downloadableMessages = messages.filter(
    (m) => m.role === 'assistant' && m.results && m.results.length > 0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const question = inputValue.trim();
    if (!question || isLoading) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSuggestions([]);
    setCurrentStatus('');
    setIsLoading(true);

    // Create streaming assistant message placeholder
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
            case 'status':
              msg.streamingStatus = data;
              setCurrentStatus(data);
              break;
            case 'model':
              msg.model_used = data;
              msg.content = `Processing with ${data} model...`;
              break;
            case 'thought':
              msg.thought_trace = data;
              break;
            case 'sql':
              msg.sql_code = data;
              setLastSql(data);
              break;
            case 'table':
              msg.columns = data.columns || [];
              msg.results = data.results || [];
              msg.content = `Processed using ${msg.model_used || 'unknown'} model.`;
              break;
            case 'suggestions':
              setSuggestions(data || []);
              break;
            case 'summary':
              msg.data_summary = data;
              break;
            case 'error':
              msg.error = data;
              msg.content = 'Error processing query';
              break;
            case 'done':
              msg.isStreaming = false;
              msg.streamingStatus = '';
              if (!msg.content || msg.content.includes('Processing')) {
                msg.content = `Processed using ${msg.model_used || 'unknown'} model.`;
              }
              break;
            default:
              break;
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
          updated[msgIndex] = {
            ...updated[msgIndex],
            error: error.message || 'An unexpected error occurred',
            content: 'Error processing query',
            isStreaming: false,
          };
        }
        return updated;
      });
      setSuggestions([]);
    } finally {
      setIsLoading(false);
      setCurrentStatus('');
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
  };

  // Toggle report selection
  const handleReportSelect = (messageId) => {
    setSelectedReports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Generate combined PDF for selected/all messages
  const generateCombinedPDF = (messagesToExport) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text('Talk to Data - Chat Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
    doc.text(`Total Queries: ${messagesToExport.length}`, pageWidth / 2, yPos + 5, { align: 'center' });
    yPos += 20;

    messagesToExport.forEach((message, index) => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Query header
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.text(`Query ${index + 1}`, 14, yPos);
      yPos += 8;

      // Question
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const questionLines = doc.splitTextToSize(`Q: ${message.originalQuestion || 'N/A'}`, pageWidth - 28);
      doc.text(questionLines, 14, yPos);
      yPos += questionLines.length * 5 + 5;

      // Data Summary
      if (message.data_summary) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const summaryLines = doc.splitTextToSize(`Analysis: ${message.data_summary}`, pageWidth - 28);
        doc.text(summaryLines, 14, yPos);
        yPos += summaryLines.length * 4 + 5;
      }

      // SQL
      if (message.sql_code) {
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const sqlLines = doc.splitTextToSize(message.sql_code, pageWidth - 28);
        doc.text(sqlLines, 14, yPos);
        yPos += sqlLines.length * 3 + 5;
      }

      // Table
      if (message.results && message.results.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [message.columns],
          body: message.results.slice(0, 10), // Limit to 10 rows per query
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [30, 64, 175], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          margin: { left: 14, right: 14 },
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // Separator
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 10;
    });

    doc.save('chat-report.pdf');
  };

  const handleDownloadSelected = () => {
    const selected = messages.filter((m) => selectedReports.has(m.id));
    generateCombinedPDF(selected);
    setSelectedReports(new Set()); // Clear selection after download
  };

  const handleDownloadAll = () => {
    generateCombinedPDF(downloadableMessages);
  };

  const hasSuggestions = suggestions.length > 0 && !isLoading;
  const hasSelectedReports = selectedReports.size > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="h-screen flex flex-col py-8 px-4">
        {/* Header */}
        <header className="text-center mb-6 relative">
          <h1 className="text-4xl font-bold text-white mb-2">
            Talk to Data
          </h1>
          <p className="text-slate-400">
            Query the Chinook Music Database using natural language
          </p>

          {/* Download All Button */}
          {downloadableMessages.length > 0 && (
            <button
              onClick={handleDownloadAll}
              className="absolute right-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download All ({downloadableMessages.length})
            </button>
          )}
        </header>

        {/* Main Content - Dynamic Layout */}
        <div className="flex-1 flex justify-center items-stretch gap-4 overflow-hidden px-4">
          {/* Chat Container - wider and responsive */}
          <div
            className={`flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden transition-all duration-700 ease-out ${hasSuggestions ? 'flex-1 max-w-6xl' : 'flex-1 max-w-7xl'
              }`}
          >
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400 animate-fade-in">
                    <p className="text-lg mb-2">Welcome!</p>
                    <p className="text-sm">
                      Try asking: "Show me first 10 tracks" or "Who are the top 5 artists by sales?"
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

            {/* Current Status Bar */}
            {currentStatus && (
              <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/20 animate-fade-in">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="animate-pulse">{currentStatus}</span>
                </div>
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-white/10 bg-white/5"
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask a question (e.g., 'Who are the top 5 artists by sales?')"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  Send
                </button>
              </div>
            </form>
          </div>

          {/* Suggestions Panel - with enhanced animations */}
          <div
            className={`flex flex-col justify-end transition-all duration-700 ease-out ${hasSuggestions
              ? 'w-64 opacity-100 translate-x-0'
              : 'w-0 opacity-0 translate-x-8 overflow-hidden'
              }`}
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 mb-4 animate-slide-in-right">
              <p className="text-xs text-slate-400 mb-3 font-medium">Suggested follow-ups:</p>
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-2 bg-slate-700/50 hover:bg-slate-600 text-white text-sm rounded-lg transition-all duration-300 border border-slate-600 text-left hover:translate-x-1 hover:shadow-lg animate-stagger-fade-in"
                    style={{
                      animationDelay: `${idx * 150}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Download Selected Button */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out ${hasSelectedReports
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
          }`}
      >
        <button
          onClick={handleDownloadSelected}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-blue-500/25 flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download {selectedReports.size} Reports
        </button>
      </div>
    </div>
  );
}

export default App;
