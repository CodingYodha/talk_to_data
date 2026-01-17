import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

/**
 * ChatMessage Component - Elegant card-style messages
 */
export default function ChatMessage({ message, isSelected = false, onSelect, showCheckbox = false, onAnalysis }) {
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

    const handleDownloadPDF = async () => {
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

            yPos = doc.lastAutoTable.finalY + 15;
        }

        // Note: Chart capture removed - analysis is now in separate panel
        // PDF exports the query results table only

        doc.save('query-report.pdf');
    };

    const handleDeepAnalysis = () => {
        console.log('[ChatMessage] Deep Analysis clicked', message.results?.length, 'rows');
        if (!message.results || message.results.length === 0 || !onAnalysis) {
            console.log('[ChatMessage] Aborting: no results or no callback');
            return;
        }

        // Convert table data to object format for analysis
        const data = message.results.map(row => {
            const obj = {};
            message.columns.forEach((col, idx) => {
                const val = row[idx];
                const num = parseFloat(val);
                obj[col] = !isNaN(num) && val.trim() !== '' ? num : val;
            });
            return obj;
        });

        console.log('[ChatMessage] Calling onAnalysis with', data.length, 'rows');
        onAnalysis(data, message.originalQuestion || '');
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
                                    <div className="mt-3 p-4 bg-[var(--color-bg-alt)] rounded-lg border border-[var(--color-border)] space-y-4">
                                        {message.thought_trace && (
                                            <div>
                                                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Reasoning</p>
                                                <div className="max-h-48 overflow-y-auto">
                                                    <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap break-words">{message.thought_trace}</p>
                                                </div>
                                            </div>
                                        )}
                                        {message.sql_code && (
                                            <div>
                                                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">SQL Query</p>
                                                <div className="max-h-64 overflow-auto">
                                                    <pre className="p-3 bg-[var(--color-surface)] rounded-lg text-sm font-mono border border-[var(--color-border)] text-[var(--color-text)] whitespace-pre-wrap break-all">
                                                        {message.sql_code}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Data Table */}
                        {message.results && message.results.length > 0 && (
                            <div className={`rounded-lg border border-[var(--color-border)] transition-all duration-300 ${showTable ? 'opacity-100' : 'opacity-0'}`}>
                                {/* Mobile scroll wrapper - only shows horizontal scroll on small screens */}
                                <div className="overflow-x-auto md:overflow-x-visible max-w-full">
                                    <table className="min-w-full">
                                        <thead className="bg-[var(--color-bg-alt)]">
                                            <tr>
                                                {message.columns.map((col, idx) => (
                                                    <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider whitespace-nowrap">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {message.results.map((row, rowIdx) => (
                                                <tr key={rowIdx} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                                                    {row.map((cell, cellIdx) => (
                                                        <td key={cellIdx} className="px-4 py-3 text-sm text-[var(--color-text-secondary)] whitespace-nowrap md:whitespace-normal">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Rule-based Table Summary */}
                        {message.results && message.results.length > 0 && !isStreaming && (
                            <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--color-bg-alt)] border border-[var(--color-border)]">
                                <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)]">
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                        <strong>{message.results.length}</strong> row{message.results.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                        </svg>
                                        <strong>{message.columns.length}</strong> column{message.columns.length !== 1 ? 's' : ''}
                                    </span>
                                    {/* Detect numeric columns and show min/max/sum if applicable */}
                                    {(() => {
                                        const numericStats = [];
                                        message.columns.forEach((col, colIdx) => {
                                            const values = message.results
                                                .map(row => parseFloat(row[colIdx]))
                                                .filter(v => !isNaN(v));
                                            if (values.length === message.results.length && values.length > 1) {
                                                const sum = values.reduce((a, b) => a + b, 0);
                                                const min = Math.min(...values);
                                                const max = Math.max(...values);
                                                // Only show stats for meaningful numeric columns
                                                if (max !== min) {
                                                    numericStats.push({ col, sum, min, max, isPrice: col.toLowerCase().includes('price') || col.toLowerCase().includes('total') || col.toLowerCase().includes('amount') });
                                                }
                                            }
                                        });
                                        // Show first numeric stat found
                                        const stat = numericStats[0];
                                        if (stat) {
                                            const formatNum = (n) => n >= 1000 ? n.toLocaleString() : (n % 1 !== 0 ? n.toFixed(2) : n);
                                            return (
                                                <>
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="text-green-500">↑</span>
                                                        Max {stat.col}: <strong>{formatNum(stat.max)}</strong>
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="text-orange-500">↓</span>
                                                        Min {stat.col}: <strong>{formatNum(stat.min)}</strong>
                                                    </span>
                                                    {stat.isPrice && (
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="text-blue-500">Σ</span>
                                                            Total: <strong>{formatNum(stat.sum)}</strong>
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* No results */}
                        {!isStreaming && (!message.results || message.results.length === 0) && !message.error && message.sql_code && (
                            <div className="p-3 rounded-lg bg-[var(--color-bg-alt)] border border-[var(--color-border)]">
                                <p className="text-sm text-[var(--color-text-muted)]">The requested data is not available in the database.</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {message.results && message.results.length > 0 && !isStreaming && (
                            <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-2">
                                <button onClick={handleDeepAnalysis} className="btn-primary text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Deep Analysis
                                </button>
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
