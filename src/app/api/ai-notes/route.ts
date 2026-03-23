import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const { url, transcriptText: providedTranscript } = await req.json();

        let transcriptText = providedTranscript || '';
        let videoId = 'manual';

        if (!transcriptText) {
            if (!url) {
                return NextResponse.json({ error: 'YouTube URL or Transcript Text is required' }, { status: 400 });
            }

            videoId = extractVideoId(url) || 'manual';
            if (videoId === 'manual' && !url.includes('manual')) {
                return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
            }

            try {
                console.log(`Layer 1: Primary Fetch for ${videoId}...`);
                const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' })
                    .catch(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'hi' }))
                    .catch(() => YoutubeTranscript.fetchTranscript(videoId)); 
                
                transcriptText = transcript.map((t: any) => t.text).join(' ');
            } catch (err: any) {
                console.warn('Layer 1 Blocked. Trying Layer 2 (Meta Recovery)...');
                
                try {
                    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                    });
                    const html = await pageResponse.text();
                    const description = html.match(/"shortDescription":"(.*?)"/)?.[1] || '';
                    if (description.length > 50) {
                        transcriptText = `[META-NOTES MODE]\nTITLE: ${videoId}\nDESCRIPTION: ${description.replace(/\\n/g, '\n')}`;
                    }
                } catch (metaErr) {
                    console.error('Layer 2 Blocked. Trying Layer 3 (Invidious Proxy API)...');
                    try {
                        const invidiousRes = await fetch(`https://invidious.snopyta.org/api/v1/captions/${videoId}?label=English`);
                        const invidiousData = await invidiousRes.json();
                        if (invidiousData.captions && invidiousData.captions.length > 0) {
                            transcriptText = invidiousData.captions.map((c: any) => c.text).join(' ');
                        }
                    } catch (proxyErr) {
                        console.error('All layers failed.');
                    }
                }

                if (!transcriptText) {
                    return NextResponse.json({ 
                        error: `YouTube is aggressively blocking this server. Please use the "Paste Transcript" tab above—it's 100% reliable!` 
                    }, { status: 500 });
                }
            }
        }

        if (!transcriptText || transcriptText.length < 50) {
            return NextResponse.json({ error: 'Transcript is too short to process.' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 500 });
        }

        // --- ELITE PROMPT DESIGN ---
        console.log('Initiating Gemini Streaming (2.5-flash) with Elite Prompt...');
        
        const prompt = `
            You are a World-Class Academic Professor. Generate the ULTIMATE high-density study notes.
            
            Video ID: ${videoId}
            Transcript Data (30k Window): ${transcriptText.substring(0, 30000)}

            MASTER INSTRUCTIONS:
            1. **High Detail**: Do not skip steps. Provide an extremely detailed phase-by-phase breakdown of the transcript.
            2. **Pure Chemistry SVGs**: Draw skeletal structures for molecules. Example: Benzene is a hexagon \`<polygon points="500,200 587,250 587,350 500,400 413,350 413,250" />\`.
            3. **SVG Layout**: Use \`<g transform="translate(500, 250)">\` to center. Labels at edges. No overlapping text.
            4. **Formula Spacing**: Use \`\\mathrm{...}\` for long variable names. Each formula gets its own line with $$ LaTeX $$.
            5. **Clean Markdown**: Absolutely NO raw JSON, escaped entities, or script tags.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 8192,
                    temperature: 0.2, // Precise for high-fidelity notes
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            const message = err.error?.message || JSON.stringify(err);
            console.error('--- GEMINI ERROR LOG ---');
            console.error('Status:', response.status);
            console.error('Raw Error:', JSON.stringify(err, null, 2));
            throw new Error(`Gemini API: ${message} (Status: ${response.status})`);
        }

        // Custom Stream Transform to extract text from Gemini's JSON stream format
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        const readableStream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) return;

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        controller.enqueue(value);
                    }
                } catch (err) {
                    controller.error(err);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (err: any) {
        console.error('Final API Exception:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

function extractVideoId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
