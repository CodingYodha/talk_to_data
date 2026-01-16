import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area,
    ScatterChart, Scatter, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CHART_COLORS = [
    '#c4f04f', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c',
    '#a4de6c', '#d0ed57', '#8dd1e1', '#ff8042', '#ffbb28'
];

/**
 * AnalysisPanel - Fixed panel above chat with chart and download button
 */
export default function AnalysisPanel({ analysisData, isLoading, error, onClose }) {
    const chartRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadChart = async () => {
        if (!chartRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: '#ffffff',
                scale: 2
            });
            const link = document.createElement('a');
            link.download = 'analysis-chart.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('Download failed:', e);
        }
        setIsDownloading(false);
    };

    const renderChart = () => {
        if (!analysisData?.chart_config) return null;

        const { type, x_key, y_key, data } = analysisData.chart_config;

        if (!data || data.length === 0) {
            return (
                <div className="flex items-center justify-center h-48 text-[var(--color-text-muted)]">
                    No data available for visualization
                </div>
            );
        }

        const commonProps = {
            data,
            margin: { top: 10, right: 20, left: 10, bottom: 40 }
        };

        switch (type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey={x_key} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }} />
                            <Bar dataKey={y_key} fill="#c4f04f" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey={x_key} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }} />
                            <Line type="monotone" dataKey={y_key} stroke="#c4f04f" strokeWidth={2} dot={{ fill: '#c4f04f', r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'scatter':
                return (
                    <ResponsiveContainer width="100%" height={280}>
                        <ScatterChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey={x_key} name={x_key} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                            <YAxis dataKey={y_key} name={y_key} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }} />
                            <Scatter name={`${x_key} vs ${y_key}`} data={data} fill="#c4f04f" />
                        </ScatterChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={data} dataKey={y_key} nameKey={x_key} cx="50%" cy="50%" outerRadius={90} fill="#c4f04f" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={true}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }} />
                        </PieChart>
                    </ResponsiveContainer>
                );

            default:
                return (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey={x_key} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }} />
                            <Bar dataKey={y_key} fill="#c4f04f" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );
        }
    };

    return (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-[var(--color-text)]">Deep Analysis</h3>
                    {analysisData?.chart_config && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                            {analysisData.chart_config.x_key} vs {analysisData.chart_config.y_key}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Download Button */}
                    {analysisData?.chart_config && (
                        <button
                            onClick={handleDownloadChart}
                            disabled={isDownloading}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                            title="Download chart"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    )}
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                        <svg className="w-4 h-4 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-[var(--color-text-secondary)]">Analyzing...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-xs text-red-500 text-center">{error}</p>
                    </div>
                ) : analysisData ? (
                    <div className="space-y-3">
                        {/* Insight */}
                        {analysisData.insight_summary && (
                            <p className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-alt)] rounded-lg px-3 py-2">
                                {analysisData.insight_summary}
                            </p>
                        )}
                        {/* Chart */}
                        <div ref={chartRef} id="analysis-chart" className="bg-white rounded-lg p-3">
                            {renderChart()}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
