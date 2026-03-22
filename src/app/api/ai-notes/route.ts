import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
        }

        // 1. Extract Video ID
        const videoId = extractVideoId(url);
        if (!videoId) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        // 2. Fetch Transcript
        let transcriptText = '';
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            transcriptText = transcript.map(t => t.text).join(' ');
        } catch (err: any) {
            console.error('Transcript error:', err);
            return NextResponse.json({ 
                error: 'Could not fetch transcript. This video might not have captions enabled or is restricted.' 
            }, { status: 500 });
        }

        if (!transcriptText || transcriptText.length < 50) {
            return NextResponse.json({ error: 'Transcript is too short to process.' }, { status: 400 });
        }

        // 3. Generate Notes with Gemini via Direct Fetch (more robust)
        const prompt = `
            You are a master note-taker and educational assistant. Convert the following transcript from a YouTube video into a comprehensive, high-quality, and structured study guide. 
            
            Video ID: ${videoId}
            
            STRICT GUIDELINES FOR MASTER-CLASS STUDY NOTES (PURE MARKDOWN):
            1. **Unlimitied Depth**: You have infinite space. Be extremely verbose, detailed, and thorough. Explain every concept from the ground up like a world-class mentor.
            2. **ELITE FORMATTING (NO BACKTICKS)**: 
               - USE PURE MARKDOWN ONLY. 
               - **CRITICAL**: NEVER use backticks (\` \` \`) for SVG or HTML blocks. Output them as raw text directly in your markdown response.
               - DO NOT use "style" attributes or color names in your text.
               - Use \`#\` for the Page Title.
               - Use \`##\` for Main Topics (rendered in Black Ink).
               - Use \`###\` for Sub-topics (rendered in Black Ink with Red Underline).
               - Use \`**BOLD**\` for important terms (rendered in Blue Ink with Red Underline).
            3. **Physics Illustrations (MANDATORY)**: 
               - For physical setups (wheels, vectors, rigid bodies), generate clean **SVG code**.
               - **NO BACKTICKS** for SVGs. Output raw \`<div class="physics-diagram">\n<svg viewBox="0 0 400 200">\n...\n</svg>\n</div>\`.
               - **CRITICAL**: Do NOT indent your SVG code with spaces or tabs. Start the \`<div...\` and \`<svg>\` directly at the beginning of the line. Indenting causes the system to render it as a raw code block!
               - **CRITICAL**: ALL shapes (\`<line>\`, \`<circle>\`, \`<defs>\`, etc.) MUST be properly enclosed INSIDE the \`<svg> ... </svg>\` tags. NEVER output loose SVG tags.
            4. **Concept Maps (Mermaid)**:
               - **CRITICAL MERMAID QUOTE RULE**: If a node label contains spaces, ampersands (&), or parentheses (), YOU MUST WRAP IT IN DOUBLE QUOTES. 
               - WRONG: A[Translation & Rotation (CRTM)]
               - RIGHT: A["Translation & Rotation (CRTM)"]
            5. **Derivations & Numericals**: 
               - Every line of math must be on a NEW LINE using LaTeX ($$ ... $$). 
               - Explain the logic of every transition clearly.
            6. **Structured Tables**: Use Markdown Tables (Pure Markdown) for comparative data.
            7. **Logical Soundness**: Do not use technical jargon without explanation. Use warm, educational English.
            5. **Educational Content**:
               - **Executive Summary**: 3-sentence summary of the physics/math/topic.
               - **Key Takeaways**: Bulleted conceptual "nuggets".
               - **Detailed Deep Dive**: Comprehensive notes with step-by-step numericals.
               - **Active Recall**: 5 Flashcards and a 3-question Quiz.
            
            Tone: Professional, encouraging, and highly academic yet accessible.
            
            Transcript:
            ${transcriptText.substring(0, 30000)}
        `;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            return NextResponse.json({ error: 'Please set a valid GEMINI_API_KEY in .env.local' }, { status: 500 });
        }

        // Try gemini-2.5-flash or gemini-flash-latest
        let notes = '';
        try {
            // gemini-2.5-flash seems to be the flagship in this fleet
            const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const aiData = await aiResponse.json();
            
            if (aiResponse.ok) {
                notes = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else {
                console.warn('gemini-2.5-flash failed, trying gemini-flash-latest...', aiData.error?.message);
                const secondResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                const secondData = await secondResponse.json();
                if (secondResponse.ok) {
                    notes = secondData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                } else {
                    throw new Error(secondData.error?.message || 'AI Generation failed');
                }
            }
        } catch (err: any) {
            console.error('Gemini Fetch Error:', err.message);
            return NextResponse.json({ error: `AI Error: ${err.message}` }, { status: 500 });
        }

        if (!notes) {
            return NextResponse.json({ error: 'AI returned empty notes. Please try again.' }, { status: 500 });
        }

        return NextResponse.json({ notes });

    } catch (err: any) {
        console.error('AI Notes API Error:', err);
        return NextResponse.json({ error: 'Failed to generate notes. Please try again later.' }, { status: 500 });
    }
}

function extractVideoId(url: string) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}
