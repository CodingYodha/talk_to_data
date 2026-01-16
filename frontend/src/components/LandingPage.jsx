import { useState } from 'react';

/**
 * LandingPage - Responsive hero section
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
            <main className="flex-1 flex items-center justify-center px-4 md:px-6 pt-20 md:pt-32 pb-8 md:pb-12">
                <div className="max-w-5xl w-full">
                    {/* Main Heading */}
                    <div className="text-center mb-6 md:mb-8 animate-fade-in-up">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-serif mb-2 md:mb-4 text-[var(--color-text)]">
                            Query your data
                        </h1>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-serif italic text-[var(--color-text-secondary)]">
                            naturally
                        </h1>
                    </div>

                    {/* Subtitle */}
                    <p
                        className="text-center text-[var(--color-text-secondary)] text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-8 md:mb-12 px-4 animate-fade-in-up"
                        style={{ animationDelay: '0.1s' }}
                    >
                        Transform natural language into powerful SQL queries.
                        Analyze your database with simple questions.
                    </p>

                    {/* CTA Button */}
                    <div
                        className="flex justify-center mb-12 md:mb-20 animate-fade-in-up"
                        style={{ animationDelay: '0.2s' }}
                    >
                        <button onClick={onGetStarted} className="btn-primary px-6 py-3 md:px-10 md:py-4 text-sm md:text-base">
                            Start Querying
                        </button>
                    </div>

                    {/* Feature Cards */}
                    <div
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-2 animate-fade-in-up"
                        style={{ animationDelay: '0.3s' }}
                    >
                        {features.map((feature, idx) => (
                            <div key={idx} className="card group cursor-default hover-card">
                                <div className="flex items-center gap-3 mb-2 md:mb-3">
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[var(--color-bg-alt)] flex items-center justify-center flex-shrink-0">
                                        <span className="text-[var(--color-accent)] font-semibold text-xs md:text-sm">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <h3 className="font-sans font-semibold text-[var(--color-text)] text-sm md:text-base">
                                        {feature.title}
                                    </h3>
                                </div>
                                <p className="text-[var(--color-text-secondary)] text-xs md:text-sm">
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
