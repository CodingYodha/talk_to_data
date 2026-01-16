import { useState } from 'react';

/**
 * LandingPage - Hero section with elegant design
 */
export default function LandingPage({ onGetStarted }) {
    const features = [
        {
            title: 'Natural Language Queries',
            description: 'Ask questions in plain English and get instant SQL results'
        },
        {
            title: 'Intelligent Analysis',
            description: 'AI-powered insights from your database'
        },
        {
            title: 'Export Reports',
            description: 'Download comprehensive PDF reports with one click'
        }
    ];

    return (
        <div className="min-h-screen grid-bg flex flex-col">
            {/* Hero Section */}
            <main className="flex-1 flex items-center justify-center px-6 pt-32 pb-12">
                <div className="max-w-5xl w-full">
                    {/* Main Heading */}
                    <div className="text-center mb-8 animate-fade-in-up">
                        <h1 className="text-5xl md:text-7xl font-serif mb-4 text-[var(--color-text)]">
                            Query your data
                        </h1>
                        <h1 className="text-5xl md:text-7xl font-serif italic text-[var(--color-text-secondary)]">
                            naturally
                        </h1>
                    </div>

                    {/* Subtitle */}
                    <p
                        className="text-center text-[var(--color-text-secondary)] text-lg max-w-xl mx-auto mb-12 animate-fade-in-up"
                        style={{ animationDelay: '0.1s' }}
                    >
                        Transform natural language into powerful SQL queries.
                        Analyze your database with simple questions.
                    </p>

                    {/* CTA Button */}
                    <div
                        className="flex justify-center mb-20 animate-fade-in-up"
                        style={{ animationDelay: '0.2s' }}
                    >
                        <button onClick={onGetStarted} className="btn-primary px-10 py-4 text-base">
                            Start Querying
                        </button>
                    </div>

                    {/* Feature Cards */}
                    <div
                        className="grid md:grid-cols-3 gap-6 animate-fade-in-up"
                        style={{ animationDelay: '0.3s' }}
                    >
                        {features.map((feature, idx) => (
                            <div key={idx} className="card group cursor-default hover-card">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-alt)] flex items-center justify-center">
                                        <span className="text-[var(--color-accent)] font-semibold text-sm">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <h3 className="font-sans font-semibold text-[var(--color-text)]">
                                        {feature.title}
                                    </h3>
                                </div>
                                <p className="text-[var(--color-text-secondary)] text-sm">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
