import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function extractVideoId(url: string) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        let transcriptText = '';
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            transcriptText = transcript.map((t) => t.text).join(' ');
        } catch (error) {
            console.error('Transcript fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch transcript. The video might not have captions enabled or is restricted. Try another video.' }, { status: 400 });
        }

        // Gemini FREE TIER has a strict limit of 250,000 input tokens per minute.
        // We MUST cap the transcript to ~60,000 characters (approx 15,000 tokens) 
        // to prevent users hitting the 429 quota error if they test a few videos in a minute.
        const MAX_CHARS = 60000;
        let safeTranscript = transcriptText;
        if (safeTranscript.length > MAX_CHARS) {
            safeTranscript = safeTranscript.slice(0, MAX_CHARS) + "\n\n[Transcript truncated to prevent Gemini Free Tier Rate Limits...]";
        }

        // Using Gemini 2.5 Flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
You are an expert student creating the perfect handwritten-style notebook summary of a YouTube educational video.
I will provide you with the transcript of the video. You MUST generate comprehensive, highly structured, and visually descriptive study notes based strictly on the following requirements:

INPUT KNOWLEDGE:
Video Transcript: ${safeTranscript}

OUTPUT FORMAT (VERY IMPORTANT):
Generate notes in a handwritten-style structured format. The notes must feel like human-made study notes with clarity, structure, and visual explanation. Use clear Markdown.

1. Clean Title & Topic: Extract the main topic and create a clean, short title (e.g., "# Understanding Newton's Laws of Motion").
2. Sectioned Notes: Break content into clear sections using headings (##), subheadings (###), and bullet points (-). Each section should represent a single concept.
3. Handwritten-Style Explanation: Write like a smart student would. Simple language, short sentences, easy to revise, NO fluff or generic filler sentences.
4. Key Points & Highlights: Highlight important ideas! Use blockquotes (>) for boxed summaries, bolding (**text**) for keywords, and clear structures for Definitions, Formulas, and Rules.
5. Visual Illustration Instructions: For each major concept, include visual description blocks. Format them EXACTLY like this on a new line: [ILLUSTRATION: Draw a diagram showing force acting on a box with arrows labeled F1 and F2].
6. Flowcharts & Structures: Where applicable, convert explanations into step-by-step flows using arrows (e.g., Force ➡️ Acceleration ➡️ Motion).
7. Examples & Analogies: Add simple examples to improve understanding (e.g., "Example: A moving car stopping when brakes are applied").
8. Summary Section: At the end, include a '## Summary & Revision' section with 5-7 key takeaways in bullet points.
9. Enhancements: Include a small '## Quick Quiz' section at the end. Mark crucial points with "🚨 IMPORTANT FOR EXAMS 🚨". Ensure formulas are formatted beautifully in LaTeX using double $$ for block (e.g., $$ F = ma $$) and single $ for inline (e.g., $E=mc^2$). NEVER put spaces directly after a backslash in LaTeX equations.

TONE:
Educational, student-friendly, concise, revision-focused. Avoid long paragraphs. Use smart formatting.

Do NOT include any external pleasantries, introductions to your answer, or JSON formatting. OUTPUT ONLY THE FINAL MARKDOWN NOTES starting immediately with the title.
`;

        const result = await model.generateContentStream(prompt);
        
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        controller.enqueue(encoder.encode(chunkText));
                    }
                    controller.close();
                } catch (streamError) {
                    console.error('Streaming error:', streamError);
                    controller.error(streamError);
                }
            }
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('Essential Notes generation error:', error);
        return NextResponse.json({ error: error?.message || 'Failed to generate notes' }, { status: 500 });
    }
}
