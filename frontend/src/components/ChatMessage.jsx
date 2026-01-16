import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * ChatMessage Component - Renders a single message with selection support and fluid animations
 */
export default function ChatMessage({ message, isSelected = false, onSelect, showCheckbox = false }) {
    const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
    const [showTable, setShowTable] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [tableRowsVisible, setTableRowsVisible] = useState(0);
    const isUser = message.role === 'user';
    const isStreaming = message.isStreaming;

    // Animate table appearance with staggered rows
    useEffect(() => {
        if (message.results && message.results.length > 0) {
            const timer = setTimeout(() => setShowTable(true), 150);
            return () => clearTimeout(timer);
        }
    }, [message.results]);

    // Stagger table row visibility
    useEffect(() => {
        if (showTable && message.results?.length > 0) {
            const interval = setInterval(() => {
                setTableRowsVisible((prev) => {
                    if (prev >= message.results.length) {
                        clearInterval(interval);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 30);
            return () => clearInterval(interval);
        }
    }, [showTable, message.results?.length]);

    // Animate summary appearance
    useEffect(() => {
        if (message.data_summary) {
            const timer = setTimeout(() => setShowSummary(true), 200);
            return () => clearTimeout(timer);
        }
    }, [message.data_summary]);

    // Generate PDF report for single message
    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(18);
        doc.setTextColor(30, 64, 175);
        doc.text('Talk to Data - Query Report', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Question:', 14, 35);
        doc.setFontSize(10);
        doc.text(message.originalQuestion || 'N/A', 14, 42);

        let yPos = 55;
        if (message.data_summary) {
            doc.setFontSize(12);
            doc.setTextColor(30, 64, 175);
            doc.text('Analysis:', 14, yPos);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const summaryLines = doc.splitTextToSize(message.data_summary, pageWidth - 28);
            doc.text(summaryLines, 14, yPos + 7);
            yPos += 7 + (summaryLines.length * 5) + 10;
        }

        if (message.sql_code) {
            doc.setFontSize(12);
            doc.setTextColor(30, 64, 175);
            doc.text('SQL Query:', 14, yPos);
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            const sqlLines = doc.splitTextToSize(message.sql_code, pageWidth - 28);
            doc.text(sqlLines, 14, yPos + 7);
            yPos += 7 + (sqlLines.length * 4) + 10;
        }

        if (message.results && message.results.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(30, 64, 175);
            doc.text('Results:', 14, yPos);

            autoTable(doc, {
                startY: yPos + 5,
                head: [message.columns],
                body: message.results,
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [30, 64, 175], textColor: 255 },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { left: 14, right: 14 },
            });
        }

        const finalY = doc.lastAutoTable?.finalY || yPos + 20;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, finalY + 15);

        doc.save('query-report.pdf');
    };

    if (isUser) {
        return (
            <div className="flex justify-end mb-4 animate-fade-in-up">
                <div className="bg-blue-500 text-white px-4 py-3 rounded-2xl max-w-[80%] shadow-lg transform transition-all duration-300 hover:shadow-xl">
                    <p>{message.content}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-start mb-4 animate-fade-in-up w-full min-w-0">
            <div className={`bg-gray-100 px-4 py-4 rounded-2xl w-full shadow-lg transition-all duration-300 overflow-hidden ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50' : ''
                }`}>
                {/* Header with checkbox */}
                <div className="flex items-start gap-3 min-w-0">
                    {/* Selection Checkbox */}
                    {showCheckbox && (
                        <div className="flex-shrink-0 pt-1">
                            <button
                                onClick={() => onSelect?.(message.id)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                                    ? 'bg-blue-500 border-blue-500 scale-110'
                                    : 'border-gray-300 hover:border-blue-400 hover:scale-105'
                                    }`}
                            >
                                {isSelected && (
                                    <svg className="w-3 h-3 text-white animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    )}

                    <div className="flex-1 min-w-0 overflow-hidden">
                        {/* Status / Content */}
                        <div className="flex items-center gap-2 mb-2">
                            {isStreaming && (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                            )}
                            <p className={`font-semibold text-gray-800 transition-all duration-500 ${isStreaming ? 'animate-pulse' : ''}`}>
                                {message.streamingStatus || message.content}
                            </p>
                        </div>

                        {/* Data Summary with smooth expand/collapse */}
                        {message.data_summary && (
                            <div
                                className={`mb-3 bg-amber-50 border border-amber-200 rounded-lg overflow-hidden transition-all duration-500 ease-out ${showSummary ? 'opacity-100 translate-y-0 max-h-40' : 'opacity-0 -translate-y-2 max-h-0'
                                    }`}
                            >
                                <button
                                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                                    className="w-full flex items-center justify-between px-4 py-2 text-left bg-amber-100 hover:bg-amber-200 transition-all duration-300"
                                >
                                    <span className="font-semibold text-amber-800">Analysis</span>
                                    <span
                                        className="text-amber-600 transition-transform duration-300"
                                        style={{ transform: isSummaryExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                                    >
                                        ▼
                                    </span>
                                </button>
                                <div
                                    className={`transition-all duration-500 ease-out overflow-hidden ${isSummaryExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    <div className="px-4 py-3">
                                        <p className="text-amber-900">{message.data_summary}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Collapsible Reasoning Trace */}
                        {(message.thought_trace || message.sql_code) && (
                            <div className="mb-3">
                                <button
                                    onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-all duration-300 hover:translate-x-1"
                                >
                                    <span
                                        className="transition-transform duration-300"
                                        style={{ transform: isReasoningExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                                    >
                                        ▶
                                    </span>
                                    Reasoning Trace & SQL
                                </button>

                                <div
                                    className={`transition-all duration-500 ease-out overflow-hidden ${isReasoningExpanded ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                        {message.thought_trace && (
                                            <>
                                                <p className="font-semibold text-sm text-gray-700 mb-1">Thought Process:</p>
                                                <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">
                                                    {message.thought_trace}
                                                </p>
                                            </>
                                        )}

                                        {message.sql_code && (
                                            <>
                                                <p className="font-semibold text-sm text-gray-700 mb-1">Generated SQL:</p>
                                                <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-sm overflow-x-auto">
                                                    {message.sql_code}
                                                </pre>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Data Table with staggered row animation */}
                        {message.results && message.results.length > 0 && (
                            <div
                                className={`overflow-x-auto bg-white rounded-lg border border-gray-200 transition-all duration-500 ease-out ${showTable ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                                    }`}
                            >
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {message.columns.map((col, idx) => (
                                                <th
                                                    key={idx}
                                                    className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap"
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {message.results.map((row, rowIdx) => (
                                            <tr
                                                key={rowIdx}
                                                className={`hover:bg-gray-50 transition-all duration-300 ${rowIdx < tableRowsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                                                    }`}
                                            >
                                                {row.map((cell, cellIdx) => (
                                                    <td
                                                        key={cellIdx}
                                                        className="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap"
                                                    >
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* No results message */}
                        {!isStreaming && (!message.results || message.results.length === 0) && !message.error && message.sql_code && (
                            <p className="text-gray-500 italic text-sm animate-fade-in">No results found.</p>
                        )}

                        {/* Download Button */}
                        {message.results && message.results.length > 0 && !isStreaming && (
                            <div className="mt-3 animate-fade-in">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-300 hover:shadow-lg hover:scale-105"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download Report
                                </button>
                            </div>
                        )}

                        {/* Error Display */}
                        {message.error && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg animate-shake">
                                <p className="text-red-700 text-sm">{message.error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
