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

        // 3. Generate Notes with Gemini via Direct Fetch
        console.log(`Generating notes for video: ${videoId}`);
        const prompt = `
            You are a master note-taker and educational assistant. Convert the following transcript from a YouTube video into a comprehensive study guide.
            
            Video ID: ${videoId}
            
            STRICT GUIDELINES (PURE MARKDOWN):
            1. **Unlimitied Depth**: Be extremely verbose, detailed, and thorough. 
            2. **ELITE FORMATTING**: Use # for Page Title, ## for Topics, **BOLD** for terms.
            3. **Visual-First (MANDATORY)**: 
               - For every major concept, generate a high-quality **SVG code block** tagged with \`\`\`svg.
               - NO ASCII art. Use real SVGs for chemistry (molecules) and physics (diagrams).
               - **SVG Layout**: Use a wide **viewBox** (e.g., \`0 0 1000 500\`) to ensure everything is spaced out.
               - **NO OVERLAPPING TEXT**: Labels above arrows or next to symbols must have careful offsets. Keep at least **40px vertical distance** between different text elements.
               - **Font Precision**: use \`font-size="20px"\` for titles and \`18px\` for labels. Maintain #1e3a8a stroke.
            4. **Interactive Lab**: 
               - Use \`\`\`sandbox type="rotation"\`\`\` for inertia or \`\`\`sandbox type="projectile"\`\`\` for motion.
            5. **Sticky Flashcards**: 
               - Use \`\`\`flashcard\`\`\` blocks for critical definitions. Term: Definition format.
            6. **Aesthetic Vertical Flow**: 
               - NEVER use triple backticks for simple formulas or sentences. Triple backticks are ONLY for visuals.
               - Each math derivation step must be on its own line ($$ ... $$). 
            7. **Full-Width Visuals**: Ensure SVGs occupy the full 1000px width.
            8. **Soundness**: High academic tone but accessible English.
            
            Transcript:
            ${transcriptText.substring(0, 30000)}
        `;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('Missing GEMINI_API_KEY');
            return NextResponse.json({ error: 'Please set a valid GEMINI_API_KEY in .env.local' }, { status: 500 });
        }

        let notes = '';
        try {
            console.log('Fetching from Gemini (gemini-2.5-flash)...');
            const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                    ]
                })
            });

            const aiData = await aiResponse.json();
            
            if (aiResponse.ok) {
                notes = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log(`Success! Notes length: ${notes.length}`);
            } else {
                const errMsg = aiData.error?.message || 'AI Generation failed';
                console.error('Gemini 2.5-flash failed.', errMsg);
                
                // If it's a quota error, give a friendly message
                if (aiData.error?.code === 429) {
                    throw new Error('Daily AI Quota Reached (20/20). Please try again tomorrow or use a different API key.');
                }
                
                throw new Error(errMsg);
            }
        } catch (err: any) {
            console.error('Final API Exception:', err.message);
            return NextResponse.json({ error: err.message }, { status: 500 });
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
