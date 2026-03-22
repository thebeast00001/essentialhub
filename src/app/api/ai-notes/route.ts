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
            
            STRICT GUIDELINES FOR REVOLUTIONARY NOTES:
            1. **Visual Quality**: Use H1 for the main title, H2 for major sections, and H3 for sub-topics. Use emojis for a premium feel.
            2. **Emphasis**: **BOLD** every important term. Example: **Artificial Intelligence**.
            3. **Scientific Accuracy (CRITICAL)**: If the video describes any formulas, equations, or scientific laws, YOU MUST use LaTeX.
               - DO NOT wrap LaTeX in code blocks. Use raw delimiters.
               - For DISPLAY MATH (centered): Use \`$$\` on new lines. Example:
                 $$ E = mc^2 $$
               - For INLINE MATH: Use \`$\`. Example: $x + y = z$.
            4. **Flowcharts & Diagrams (CRITICAL)**: If the video describes a process, hierarchy, or sequence, YOU MUST include a Mermaid.js flowchart.
               - SYNTAX: Use \`\`\`mermaid followed by a valid graph (e.g., graph TD).
               - DO NOT use any other labels for diagrams.
            5. **Educational Content**:
               - **Executive Summary**: Punchy 3-sentence summary.
               - **Key Takeaways**: Bulleted list of the most important concepts.
               - **Detailed Deep Dive**: Comprehensive, logical notes with highlights.
               - **Active Recall**: 5 conceptual Flashcards and a 3-question Quiz.
            
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
