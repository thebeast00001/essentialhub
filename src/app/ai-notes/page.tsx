"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, 
    Youtube, 
    Send, 
    Copy, 
    Download, 
    Check, 
    AlertCircle,
    Brain,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import styles from './AiNotes.module.css';
import { clsx } from 'clsx';
import Link from 'next/link';
import mermaid from 'mermaid';

// Initialize mermaid
if (typeof window !== 'undefined') {
    mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Caveat, cursive',
    });
}

const MermaidComponent = ({ chart }: { chart: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');

    useEffect(() => {
        const render = async () => {
            if (ref.current && chart) {
                try {
                    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                    const { svg } = await mermaid.render(id, chart);
                    setSvg(svg);
                } catch (err) {
                    console.error('Mermaid render error:', err);
                }
            }
        };
        render();
    }, [chart]);

    return (
        <div className={styles.mermaidContainer} ref={ref}>
            <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
    );
};

export default function AiNotesPage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Font injection
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        setError(null);
        setNotes(null);

        try {
            const res = await fetch('/api/ai-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate notes');
            }

            setNotes(data.notes);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!notes) return;
        navigator.clipboard.writeText(notes);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadAsTxt = () => {
        if (!notes) return;
        const element = document.createElement("a");
        const file = new Blob([notes], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "Zenith_AI_Notes.md";
        document.body.appendChild(element);
        element.click();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Link href="/" className={styles.backLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '0.9rem' }}>
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </Link>
                    <h1 className={styles.title}>
                        <Brain size={48} className={styles.titleIcon} />
                        AI Study Notes
                    </h1>
                    <p className={styles.subtitle}>
                        Transform any YouTube video into structured study guides, flashcards, and quizzes in seconds.
                    </p>
                </motion.div>
            </header>

            <section className={styles.searchSection}>
                <form onSubmit={handleGenerate} className={styles.searchBox}>
                    <Youtube size={24} style={{ marginLeft: '16px', color: '#ff0000' }} />
                    <input 
                        type="text" 
                        placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                        className={styles.input}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={loading}
                    />
                    <button 
                        type="submit" 
                        className={styles.generateBtn}
                        disabled={loading || !url.trim()}
                    >
                        {loading ? <Loader2 size={18} className={styles.spin} /> : <Sparkles size={18} />}
                        {loading ? 'Analyzing...' : 'Generate Notes'}
                    </button>
                </form>
            </section>

            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div 
                        key="loading"
                        className={styles.loadingContainer}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className={styles.aiBrain}>
                            <div className={styles.pulse} />
                            <Brain size={60} color="var(--accent-primary)" style={{ position: 'relative', zIndex: 1 }} />
                        </div>
                        <h2 className={styles.loadingText}>ZENITH AI IS THINKING</h2>
                        <p className={styles.loadingSubtext}>Extracting transcript and synthesizing insights...</p>
                    </motion.div>
                )}

                {error && (
                    <motion.div 
                        key="error"
                        className={styles.errorCard}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', color: '#fca5a5', maxWidth: '600px', margin: '0 auto' }}
                    >
                        <AlertCircle size={24} />
                        <p>{error}</p>
                    </motion.div>
                )}

                {notes && !loading && (
                    <motion.div 
                        key="notes"
                        className={styles.notesWrapper}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', damping: 20 }}
                    >
                        <div className={styles.notesHeader}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>AI Performance Report</h2>
                            <div className={styles.actionBar}>
                                <button className={styles.actionBtn} onClick={copyToClipboard}>
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button className={styles.actionBtn} onClick={downloadAsTxt}>
                                    <Download size={16} />
                                    Download .md
                                </button>
                            </div>
                        </div>

                        <div className={styles.markdownBody}>
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    code({ node, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        if (match && match[1] === 'mermaid') {
                                            return <MermaidComponent chart={String(children).replace(/\n$/, '')} />;
                                        }
                                        return (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        );
                                    }
                                }}
                            >
                                {notes}
                            </ReactMarkdown>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
