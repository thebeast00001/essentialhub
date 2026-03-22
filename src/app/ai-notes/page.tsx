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
    ArrowLeft,
    Library
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import styles from './AiNotes.module.css';
import { clsx } from 'clsx';
import Link from 'next/link';
import mermaid from 'mermaid';
import MomentOfInertiaSandbox from '@/components/sandboxes/MomentOfInertiaSandbox';
import ProjectileSandbox from '@/components/sandboxes/ProjectileSandbox';
import StickyFlashcard from '@/components/flashcards/StickyFlashcard';

// Initialize mermaid (strictly localized to avoid breaking other app pages)
if (typeof window !== 'undefined') {
    mermaid.initialize({
        startOnLoad: false, // CRITICAL: Do not run globally on all pages
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Caveat, cursive',
    });
}

const MermaidComponent = ({ chart }: { chart: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        const renderChart = async () => {
            if (!chart) return;
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            
            try {
                // Clean up the chart string (remove any lingering markdown backticks)
                let cleanChart = chart.trim()
                    .replace(/^```mermaid\n?/, '')
                    .replace(/\n?```$/, '');

                const { svg } = await mermaid.render(id, cleanChart);
                setSvg(svg);
                setError(false);
            } catch (err) {
                console.warn('Mermaid render warning:', err);

                // Mermaid automatically injects a massive SVG error overlay into the DOM with the ID `d${id}`.
                // We must surgically remove it so it doesn't pollute the app globally!
                const errorOverlay = document.getElementById(`d${id}`);
                if (errorOverlay) {
                    errorOverlay.remove();
                }
                setError(true);
            }

        };
        renderChart();
    }, [chart]);

    if (error) {
        return (
            <div className={styles.codeBlock} style={{ borderStyle: 'dashed', borderColor: '#cbd5e1' }}>
                <div style={{ color: '#64748b', fontSize: '0.85em', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 900 }}>Concept Map (Raw Mode)</div>
                <code style={{ whiteSpace: 'pre-wrap' }}>{chart}</code>
            </div>
        );
    }

    return (
        <div className={styles.mermaidContainer}>
            <div className="mermaid-wrapper" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
    );

};

export default function AiNotesPage() {
    const [url, setUrl] = useState('');
    const [manualContent, setManualContent] = useState('');
    const [isManual, setIsManual] = useState(false);
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
        if (isManual && !manualContent.trim()) return;
        if (!isManual && !url.trim()) return;

        setLoading(true);
        setError(null);
        setNotes(''); // Initialize as empty for streaming

        try {
            console.log('Generating streaming notes...', isManual ? 'Manual Mode' : `URL: ${url}`);
            const response = await fetch('/api/ai-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isManual ? { transcriptText: manualContent } : { url }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate notes');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('No reader found');

            let fullNotes = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                
                // Gemini Stream Extractor
                // The stream contains chunks like: [{"candidates":[{"content":{"parts":[{"text":"hello"}]}}]}, ...]
                // We'll use a regex to extract text fragments from the raw JSON chunks
                const matches = chunk.matchAll(/"text":\s*"(.*?)"/g);
                for (const match of matches) {
                    let text = match[1];
                    // Unescape JSON string characters
                    text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                    fullNotes += text;
                    setNotes(fullNotes);
                }
            }
            
            // Scroll to notes after a small delay to allow animation
            setTimeout(() => {
                window.scrollTo({ top: window.innerHeight * 0.5, behavior: 'smooth' });
            }, 500);
        } catch (err: any) {
            console.error('Generation Error:', err.message);
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

    // 🧼 CLEANUP LOGIC: Ensure no "computer language" like backticks around SVGs appears
    const cleanNotes = (content: string) => {
        if (!content) return "";
        return content
            // Special case: sometimes AI puts backticks around KaTeX blocks
            .replace(/```latex\n?([\s\S]*?)\n?```/gi, '$1');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className={styles.headerLinks}>
                        <Link href="/" className={styles.backLink}>
                            <ArrowLeft size={16} />
                            Back to Dashboard
                        </Link>
                        <Link href="/ai-notes/flashcards" className={styles.libraryLink}>
                            <Library size={16} />
                            Your Study Deck
                        </Link>
                    </div>
                    <h1 className={styles.title}>
                        <Brain size={48} className={styles.titleIcon} />
                        AI Study Notes
                    </h1>
                    <p className={styles.subtitle}>
                        Transform any YouTube video into elite, master-class study guides with SVG illustrations.
                    </p>
                </motion.div>
            </header>

            <section className={styles.searchSection}>
                <div className={styles.modeTabs}>
                    <button 
                        className={clsx(styles.modeTab, !isManual && styles.activeTab)}
                        onClick={() => setIsManual(false)}
                    >
                        <Youtube size={16} /> Auto-Fetch
                    </button>
                    <button 
                        className={clsx(styles.modeTab, isManual && styles.activeTab)}
                        onClick={() => setIsManual(true)}
                    >
                        <Copy size={16} /> Paste Transcript
                    </button>
                </div>

                <form onSubmit={handleGenerate} className={clsx(styles.searchBox, isManual && styles.manualBox)}>
                    {isManual ? (
                        <textarea
                            placeholder="Paste the YouTube transcript or lecture text here (100+ words recommended)..."
                            className={styles.manualTextarea}
                            value={manualContent}
                            onChange={(e) => setManualContent(e.target.value)}
                            disabled={loading}
                        />
                    ) : (
                        <>
                            <Youtube size={24} style={{ marginLeft: '16px', color: '#ff0000' }} />
                            <input 
                                type="text" 
                                placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                                className={styles.input}
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={loading}
                            />
                        </>
                    )}
                    <button 
                        type="submit" 
                        className={styles.generateBtn}
                        disabled={loading || (isManual ? !manualContent.trim() : !url.trim())}
                    >
                        {loading ? <Loader2 size={18} className={styles.spin} /> : <Sparkles size={18} />}
                        {loading ? 'Analyzing...' : isManual ? 'Craft from Text' : 'Generate Notes'}
                    </button>
                </form>

                {!isManual && !loading && !notes && (
                    <p className={styles.infoHint}>
                        Pro-tip: If the link fails (YouTube blocks us), switch to <strong>"Paste Transcript"</strong> mode above.
                    </p>
                )}
            </section>

            <AnimatePresence mode="wait">
                {loading ? (
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
                        <h2 className={styles.loadingText}>CRAFTING ELITE KNOWLEDGE...</h2>
                        <p className={styles.loadingSubtext}>Transcribing, deriving math, and drawing physics illustrations</p>
                    </motion.div>
                ) : error ? (
                    <motion.div 
                        key="error"
                        className={styles.loadingContainer}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <AlertCircle size={60} color="#ef4444" />
                        <h2 style={{ color: '#ef4444' }}>Generation Failed</h2>
                        <p style={{ color: '#94a3b8', maxWidth: '400px', textAlign: 'center' }}>{error}</p>
                        <button 
                            onClick={() => setError(null)}
                            style={{ marginTop: '20px', padding: '10px 20px', background: '#334155', color: '#fff', borderRadius: '30px', border: 'none', cursor: 'pointer' }}
                        >
                            Try Again
                        </button>
                    </motion.div>
                ) : notes ? (
                    <motion.div 
                        key="notes"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 20 }}
                    >
                        <div className={styles.notesWrapper}>
                            <div className={styles.zenithSeal}>
                                ZENITH AI<br/>CERTIFIED<br/>NOTES
                            </div>
                            <div className={styles.notesHeader}>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>AI Study Report</h2>
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
                                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                                    components={{
                                        p({ node, children, ...props }: any) {
                                            return <div className={styles.markdownP} {...props}>{children}</div>;
                                        },
                                        // Handle cases where AI generates <flashcard> or <sandbox> tags
                                        flashcard({ node, children, ...props }: any) {
                                            return <StickyFlashcard content={String(children)} />;
                                        },
                                        sandbox({ node, ...props }: any) {
                                            const type = props.type || 'rotation';
                                            if (type.includes('rotation') || type.includes('inertia')) return <MomentOfInertiaSandbox />;
                                            if (type.includes('projectile') || type.includes('motion')) return <ProjectileSandbox />;
                                            return <MomentOfInertiaSandbox />;
                                        },
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const isMermaid = match && match[1] === 'mermaid';
                                            const contentStr = String(children);
                                            
                                            // Fallback detection: if it looks like Mermaid but missing tag
                                            if (isMermaid || contentStr.trim().startsWith('graph ') || contentStr.trim().startsWith('sequenceDiagram') || contentStr.trim().startsWith('pie')) {
                                                return <MermaidComponent chart={contentStr.replace(/\n$/, '')} />;
                                            }

                                            // Intercept Interactive Sandboxes
                                            const isSandbox = match && match[1] === 'sandbox';
                                            if (isSandbox) {
                                                if (contentStr.toLowerCase().includes('type="rotation"') || contentStr.toLowerCase().includes('type="inertia"')) {
                                                    return <MomentOfInertiaSandbox />;
                                                }
                                                if (contentStr.toLowerCase().includes('type="projectile"') || contentStr.toLowerCase().includes('type="motion"')) {
                                                    return <ProjectileSandbox />;
                                                }
                                                return <MomentOfInertiaSandbox />;
                                            }

                                            // Intercept Sticky Note Flashcards
                                            const isFlashcard = match && match[1] === 'flashcard';
                                            if (isFlashcard) {
                                                return <StickyFlashcard content={contentStr} />;
                                            }

                                            // Intercepting SVGs and Visual HTML
                                            const isVisual = isMermaid || 
                                                           (match && (match[1] === 'svg' || match[1] === 'html')) || 
                                                           contentStr.trim().startsWith('<svg') || 
                                                           contentStr.trim().startsWith('<circle') || 
                                                           contentStr.trim().startsWith('<line') || 
                                                           contentStr.trim().startsWith('<div');

                                            const isShort = contentStr.length < 60 && !contentStr.includes('\n');

                                            if (isVisual && !isMermaid) {
                                                const rawHtml = contentStr.includes('physics-diagram') ? contentStr : `<div class="physics-diagram">${contentStr}</div>`;
                                                return <div className={styles.visualBlock} dangerouslySetInnerHTML={{ __html: rawHtml }} />;
                                            }

                                            // Skip code block styling for simple text/formulas
                                            if (!match && !inline && isShort) {
                                                return <span style={{ fontFamily: 'var(--font-mono)', verticalAlign: 'middle' }}>{children}</span>;
                                            }

                                            return inline ? (
                                                <code style={{ fontSize: '1.1em', fontWeight: 'bold' }} {...props}>
                                                    {children}
                                                </code>
                                            ) : (
                                                <div className={styles.codeBlock}>
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                </div>
                                            );
                                        }
                                    } as any}
                                >
                                    {cleanNotes(notes || "")}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
