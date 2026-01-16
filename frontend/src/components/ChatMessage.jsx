import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * ChatMessage Component - Elegant card-style messages
 */
export default function ChatMessage({ message, isSelected = false, onSelect, showCheckbox = false }) {
    const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
    const [showTable, setShowTable] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const isUser = message.role === 'user';
    const isStreaming = message.isStreaming;

    useEffect(() => {
        if (message.results && message.results.length > 0) {
            const timer = setTimeout(() => setShowTable(true), 100);
            return () => clearTimeout(timer);
        }
    }, [message.results]);

    useEffect(() => {
        if (message.data_summary) {
            const timer = setTimeout(() => setShowSummary(true), 150);
            return () => clearTimeout(timer);
        }
    }, [message.data_summary]);

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(18);
        doc.setTextColor(26, 31, 54);
        doc.text('Query Report', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Question:', 14, 35);
        doc.setFontSize(10);
        doc.text(message.originalQuestion || 'N/A', 14, 42);

        let yPos = 55;
        if (message.data_summary) {
            doc.setFontSize(12);
            doc.setTextColor(26, 31, 54);
            doc.text('Analysis:', 14, yPos);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const summaryLines = doc.splitTextToSize(message.data_summary, pageWidth - 28);
            doc.text(summaryLines, 14, yPos + 7);
            yPos += 7 + (summaryLines.length * 5) + 10;
        }

        if (message.results && message.results.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(26, 31, 54);
            doc.text('Results:', 14, yPos);

            autoTable(doc, {
                startY: yPos + 5,
                head: [message.columns],
                body: message.results,
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [26, 31, 54], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 249, 250] },
                margin: { left: 14, right: 14 },
            });
        }

        doc.save('query-report.pdf');
    };

    if (isUser) {
        return (
            <div className="flex justify-end mb-3 md:mb-4 animate-fade-in-up">
                <div className="px-3 py-2 md:px-4 md:py-3 rounded-2xl max-w-[85%] md:max-w-[80%] bg-[var(--color-primary)] text-[var(--color-bg)]">
                    <p className="text-xs md:text-sm">{message.content}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-start mb-3 md:mb-4 animate-fade-in-up w-full">
            <div className={`card w-full p-3 md:p-6 transition-all duration-200 ${isSelected ? 'ring-2 ring-[var(--color-accent)]' : ''}`}>
                {/* Header */}
                <div className="flex items-start gap-2 md:gap-3">
                    {showCheckbox && (
                        <button
                            onClick={() => onSelect?.(message.id)}
                            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                                : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                                }`}
                        >
                            {isSelected && (
                                <svg className="w-3 h-3 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    )}

                    <div className="flex-1 min-w-0">
                        {/* Status */}
                        <div className="flex items-center gap-2 mb-3">
                            {isStreaming && (
                                <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                            )}
                            <p className="font-medium text-[var(--color-text)] text-sm">
                                {message.streamingStatus || message.content}
                            </p>
                        </div>

                        {/* Analysis Summary */}
                        {message.data_summary && (
                            <div className={`mb-4 p-4 rounded-xl bg-[var(--color-bg-alt)] border border-[var(--color-border)] transition-all duration-300 ${showSummary ? 'opacity-100' : 'opacity-0'}`}>
                                <button
                                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                                    className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)] mb-2"
                                >
                                    <svg
                                        className={`w-4 h-4 transition-transform ${isSummaryExpanded ? 'rotate-90' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    Analysis
                                </button>
                                {isSummaryExpanded && (
                                    <div className="pl-6 border-l-2 border-[var(--color-accent)]">
                                        <p className="text-sm text-[var(--color-text-secondary)]">{message.data_summary}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reasoning Trace */}
                        {(message.thought_trace || message.sql_code) && (
                            <div className="mb-4">
                                <button
                                    onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                                    className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                                >
                                    <svg
                                        className={`w-4 h-4 transition-transform ${isReasoningExpanded ? 'rotate-90' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    View Details
                                </button>

                                {isReasoningExpanded && (
                                    <div className="mt-3 p-4 bg-[var(--color-bg-alt)] rounded-lg border border-[var(--color-border)]">
                                        {message.thought_trace && (
                                            <div className="mb-4">
                                                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Reasoning</p>
                                                <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{message.thought_trace}</p>
                                            </div>
                                        )}
                                        {message.sql_code && (
                                            <div>
                                                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">SQL Query</p>
                                                <pre className="p-3 bg-[var(--color-surface)] rounded-lg text-sm font-mono overflow-x-auto border border-[var(--color-border)] text-[var(--color-text)]">
                                                    {message.sql_code}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Data Table */}
                        {message.results && message.results.length > 0 && (
                            <div className={`overflow-x-auto rounded-lg border border-[var(--color-border)] transition-all duration-300 ${showTable ? 'opacity-100' : 'opacity-0'}`}>
                                <table className="min-w-full">
                                    <thead className="bg-[var(--color-bg-alt)]">
                                        <tr>
                                            {message.columns.map((col, idx) => (
                                                <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {message.results.map((row, rowIdx) => (
                                            <tr key={rowIdx} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                                                {row.map((cell, cellIdx) => (
                                                    <td key={cellIdx} className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* No results */}
                        {!isStreaming && (!message.results || message.results.length === 0) && !message.error && message.sql_code && (
                            <div className="p-3 rounded-lg bg-[var(--color-bg-alt)] border border-[var(--color-border)]">
                                <p className="text-sm text-[var(--color-text-muted)]">The requested data is not available in the database.</p>
                            </div>
                        )}

                        {/* Download Button */}
                        {message.results && message.results.length > 0 && !isStreaming && (
                            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                                <button onClick={handleDownloadPDF} className="btn-secondary text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export PDF
                                </button>
                            </div>
                        )}

                        {/* Error */}
                        {message.error && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-400">{message.error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
