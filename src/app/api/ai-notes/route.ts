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
            2. **ELITE FORMATTING**: 
               - DO NOT use "style" attributes or color names in your text.
               - Use \`#\` for the Page Title.
               - Use \`##\` for Main Topics (rendered in Black Ink).
               - Use \`###\` for Sub-topics (rendered in Black Ink with Red Underline).
               - Use \`**BOLD**\` for important terms (rendered in Blue Ink with Red Underline).
            3. **Physics Illustrations (MANDATORY & HIGH QUALITY)**: 
               - For physical setups (wheels, vectors, rigid bodies), generate deeply detailed, beautiful **SVG code**.
               - **AESTHETICS**: Use \`<marker>\` for sharp arrowheads on vectors. Use \`stroke-dasharray\` for axes of rotation or invisible lines. Use \`fill-opacity="0.2"\` for overlapping semi-transparent 3D depth (like discs or spheres).
               - **COLORS**: strictly use \`#1e40af\` (blue), \`#dc2626\` (red), and \`#0f172a\` (black) for your strokes and text. Set \`font-family="Caveat, cursive"\` inside your SVG text tags to match the handwriting!
               - **CRITICAL FORMATTING**: You MUST wrap your HTML/SVG explicitly in a \`\`\`svg code block. DO NOT output loose raw HTML into the markdown body, as it crashes the React Virtual DOM.
               - Example Output:
               \`\`\`svg
               <div class="physics-diagram">
                 <svg viewBox="0 0 400 200">
                    ...
                 </svg>
               </div>
               \`\`\`
               - **CRITICAL**: ALL shapes (\`<line>\`, \`<circle>\`, \`<defs>\`, \`<text>\`) MUST be properly enclosed INSIDE the \`<svg> ... </svg>\` tags.
            4. **Derivations & Numericals (SIMPLIFIED & VERTICAL)**: 
               - **NEVER WRITE HUGE PARAGRAPHS.** Use short, simple sentences.
               - **NEVER squish math or derivation steps together horizontally.**
               - When demonstrating steps (e.g., plugging in values), **EACH STEP MUST BE ON A NEW LINE.**
               - Use \`$$\` for any equation involving fractions, integrations, or multiple terms.
               - **CRITICAL**: You MUST leave a blank empty line before AND after every \`$$\` block and \`\`\`svg block so it renders correctly. 
               - Single variables in text ($m$, $r$) must be Inline LaTeX (\`$ ... $\`). 
            5. **Structured Tables**: Use Markdown Tables for comparative data.
            6. **Logical Soundness**: Do not use technical jargon without explanation. Use warm, educational English.
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
