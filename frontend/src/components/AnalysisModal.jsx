import { useState, useEffect } from 'react';
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
 * AnalysisModal - Modal with dynamic chart visualization
 */
export default function AnalysisModal({ isOpen, onClose, analysisData, isLoading, error }) {
    if (!isOpen) return null;

    const renderChart = () => {
        if (!analysisData?.chart_config) return null;

        const { type, x_key, y_key, data } = analysisData.chart_config;

        if (!data || data.length === 0) {
            return (
                <div className="flex items-center justify-center h-64 text-[var(--color-text-muted)]">
                    No data available for visualization
                </div>
            );
        }

        const commonProps = {
            data,
            margin: { top: 20, right: 30, left: 20, bottom: 60 }
        };

        switch (type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                                dataKey={x_key}
                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                                angle={-35}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-text)'
                                }}
                            />
                            <Legend />
                            <Bar dataKey={y_key} fill="#c4f04f" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                                dataKey={x_key}
                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                                angle={-35}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-text)'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey={y_key}
                                stroke="#c4f04f"
                                strokeWidth={2}
                                dot={{ fill: '#c4f04f', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                                dataKey={x_key}
                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                                angle={-35}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-text)'
                                }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey={y_key}
                                stroke="#c4f04f"
                                fill="#c4f04f"
                                fillOpacity={0.3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                );

            case 'scatter':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                                dataKey={x_key}
                                name={x_key}
                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                            />
                            <YAxis
                                dataKey={y_key}
                                name={y_key}
                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                            />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-text)'
                                }}
                            />
                            <Legend />
                            <Scatter name={`${x_key} vs ${y_key}`} data={data} fill="#c4f04f" />
                        </ScatterChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey={y_key}
                                nameKey={x_key}
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                fill="#c4f04f"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                labelLine={true}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-text)'
                                }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case 'histogram':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                                dataKey={x_key}
                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-text)'
                                }}
                            />
                            <Bar dataKey={y_key} fill="#8884d8" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            default:
                return (
                    <div className="flex items-center justify-center h-64 text-[var(--color-text-muted)]">
                        Unsupported chart type: {type}
                    </div>
                );
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
                <div className="w-full max-w-5xl bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
                        <div>
                            <h2 className="text-lg font-serif text-[var(--color-text)]">Deep Analysis</h2>
                            <p className="text-xs text-[var(--color-text-muted)]">
                                Automated visualization and insights
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                        >
                            <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-10 h-10 border-3 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-[var(--color-text-secondary)]">Analyzing data...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-sm text-red-500">{error}</p>
                            </div>
                        ) : analysisData ? (
                            <div className="space-y-6">
                                {/* Insight Summary */}
                                {analysisData.insight_summary && (
                                    <div className="bg-[var(--color-bg-alt)] rounded-xl p-4 border border-[var(--color-border)]">
                                        <p className="text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Insights</p>
                                        <p className="text-sm text-[var(--color-text)]">{analysisData.insight_summary}</p>
                                    </div>
                                )}

                                {/* Chart Type Badge */}
                                {analysisData.chart_config && (
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-medium rounded-full capitalize">
                                            {analysisData.chart_config.type} Chart
                                        </span>
                                        <span className="text-xs text-[var(--color-text-muted)]">
                                            {analysisData.chart_config.x_key} vs {analysisData.chart_config.y_key}
                                        </span>
                                    </div>
                                )}

                                {/* Chart */}
                                <div id="analysis-chart" className="bg-[var(--color-bg-alt)] rounded-xl p-6 border border-[var(--color-border)] min-h-[400px]">
                                    {renderChart()}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-[var(--color-text-muted)]">
                                No analysis data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
