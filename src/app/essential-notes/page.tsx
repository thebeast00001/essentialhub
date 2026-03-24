'use client';

import { useState } from 'react';
import { BookOpen, Youtube, Sparkles, Loader2, Maximize2, Minimize2, CheckCircle2, History } from 'lucide-react';
import styles from './EssentialNotes.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import clsx from 'clsx';
import 'katex/dist/katex.min.css';

export default function EssentialNotesPage() {
    const [url, setUrl] = useState('');
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Analyzing video...');
    const [error, setError] = useState('');
    const [isFullView, setIsFullView] = useState(false);

    const processMarkdown = (content: string) => {
        if (!content) return '';
        return content.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    };

    const handleGenerate = async () => {
        if (!url) return;
        
        setIsLoading(true);
        setError('');
        setData(null);
        setLoadingMessage('Analyzing video...');

        // Track loading state for the timeout closures
        let isActive = true;

        try {
            // Informative progress sequence
            setTimeout(() => {
                if (isActive) setLoadingMessage('Attempting to find captions...');
            }, 3000);
            setTimeout(() => {
                if (isActive) setLoadingMessage('No captions found! Booting up AI Transcriber (Whisper)...');
            }, 8000);
            setTimeout(() => {
                if (isActive) setLoadingMessage('Transcribing audio using Whisper AI (Bhai, time lag sakta hai)...');
            }, 15000);
            setTimeout(() => {
                if (isActive) setLoadingMessage('Transcription complete! Now generating elite study notes...');
            }, 35000);

            const response = await fetch('/api/essential-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.reason || 'Failed to generate notes');
            }

            setData(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            isActive = false;
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <BookOpen size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
                <h1 className={styles.title}>ESSENTIAL NOTES</h1>
                <p className={styles.subtitle}>
                    Premium academic research assistant. Works on ANY video (with or without captions).
                </p>
            </div>

            <div className={styles.inputGroup}>
                <Youtube color="var(--text-muted)" style={{ marginTop: '14px', alignSelf: 'flex-start' }} />
                <input
                    type="text"
                    placeholder="https://youtube.com/watch?v=..."
                    className={styles.input}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button 
                    className={styles.btn} 
                    onClick={handleGenerate} 
                    disabled={isLoading || !url}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    {isLoading ? "Transcribing..." : "Generate"}
                </button>
            </div>

            {error && (
                <div className={styles.errorText}>
                    {error}
                </div>
            )}

            {(data || isLoading) && (
                <div className={clsx(styles.notebookContainer, isFullView && styles.fullView)}>
                    <button 
                        className={styles.displayToggle}
                        onClick={() => setIsFullView(!isFullView)}
                        title={isFullView ? "Exit Full View" : "Enter Full View"}
                    >
                        {isFullView ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        {isFullView ? "Exit Full View" : "Full Display"}
                    </button>
                    
                    <div className={styles.notebookContent}>
                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                                <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" style={{ margin: '0 auto 20px' }} />
                                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '10px' }}>{loadingMessage}</h3>
                                <p style={{ color: 'var(--text-muted)' }}>This can take 30-60 seconds for videos without captions.</p>
                            </div>
                        ) : (
                            <>
                                {data.source === 'whisper' && (
                                    <div style={{ backgroundColor: '#f0f7ff', border: '1px solid #bae7ff', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <History size={16} color="#096dd9" />
                                        <span>No captions found. Generated transcript using Whisper AI fallback.</span>
                                    </div>
                                )}

                                {data.title && (
                                    <h1 className={styles.mainTitle} style={{ color: '#1a1a1a', fontWeight: '800' }}>{data.title}</h1>
                                )}

                                {data.keyPoints && data.keyPoints.length > 0 && (
                                    <div className={styles.insightsSection} style={{ marginBottom: '40px' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '20px', color: '#1a1a1a' }}>🌟 Key Insights:</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                            {data.keyPoints.map((point: string, i: number) => (
                                                <div key={i} style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--accent-primary)' }}>
                                                    <span style={{ fontWeight: '600' }}>{point}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className={styles.divider} style={{ margin: '40px 0', borderBottom: '2px dashed #f0f0f0' }}></div>

                                <div className={styles.richNotes}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                                    >
                                        {processMarkdown(data.notes)}
                                    </ReactMarkdown>
                                </div>
                                
                                <div style={{ marginTop: '60px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px', color: '#999', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <CheckCircle2 size={16} /> Processed by Zenith Academic Stack
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
