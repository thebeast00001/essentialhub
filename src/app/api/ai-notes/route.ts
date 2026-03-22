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
            1. **Unlimitied Depth**: You have infinite space. Be extremely verbose, detailed, and thorough. Explain every concept from the ground up.
            2. **ELITE FORMATTING**: 
               - Use \`#\` for the Page Title.
               - Use \`##\` for Main Topics (rendered in Black Ink).
               - Use \`**BOLD**\` for important terms (rendered in Blue Ink with Red Underline).
            3. **Visual-First Pedagogy (CRITICAL)**: 
               - **NEVER use ASCII art or plain code blocks** to show structures (like chemical molecules or circuits). 
               - **MANDATORY SVG**: For every major concept, you MUST generate a high-quality **SVG code block**. 
               - **Chemistry Structures**: For molecules like Butane (C4H10), draw a proper structural formula using \`<line>\` and \`<text>\` tags inside the SVG. Show the bonds clearly.
               - **AESTHETICS**: Use \`stroke-width="2"\`, \`stroke="#1e3a8a"\`, and \`font-family="Caveat, cursive"\`.
               - **STRICT RULE**: Use triple backticks (\` \` \`) to tag your blocks. **NEVER use HTML tags like <flashcard> or <sandbox>**, as these will crash the renderer.
               - Example Output:
               \`\`\`svg
               <div class="physics-diagram">
                 <svg viewBox="0 0 400 200"> ... </svg>
               </div>
               \`\`\`
            4. **Interactive Sandbox Visualizers (PRIORITY)**:
               - If the topic involves motion or dynamics, **INJECT A SANDBOX IMMEDIATELY**.
               - Use \`type="rotation"\` for inertia and \`type="projectile"\` for kinematics.
            5. **Tear-away Sticky Note Flashcards**:
               - Output critical definitions in a \`flashcard\` block.
            6. **Vertical Content Flow (AESTHETICS)**: 
               - **NEVER use triple backticks for simple formulas or sentences.** (e.g., do NOT use \` \` \` for "CH3-CH2"). Use plain text or Inline LaTeX instead. 
               - **NO BOXES**: Triple backticks create grey boxes that break the handwriting theme. Only use code blocks for SVGs or Sandboxes.
               - **Math steps** must each be on their own line.
            7. **SVG Optimization**: 
               - For orbital diagrams or complex pathways, use a **wide viewBox** (e.g., \`0 0 1000 300\`) to ensure the details are not squished and are fully visible upon scrolling.
            8. **Structured Layout**:
               - Executive Summary -> Key Takeaways -> Visual Deep Dive (Diagrams) -> Lab -> Recall.
            
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
