import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractVideoId, getTranscriptWithFallback } from '@/lib/youtube';
import { getCachedNotes, setCachedNotes } from '@/lib/cache';

// REMOVED Edge Runtime - Now using Node.js for child_process visibility (Whisper)
// export const runtime = 'edge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

        // 1. Check Cache First
        try {
            const cached = await getCachedNotes(videoId);
            if (cached) {
                console.log(`Cache hit for video: ${videoId}`);
                return NextResponse.json({ 
                    success: true, 
                    source: "transcript", // Use cached data
                    notes: cached.notes,
                    keyPoints: cached.keyPoints,
                    title: cached.title,
                    summary: cached.summary
                });
            }
        } catch (cacheError) {
            console.error('Cache check failed:', cacheError);
        }

        // 2. Fetch Transcript with Native or Whisper Fallback
        const transcriptRes = await getTranscriptWithFallback(videoId);
        
        if (!transcriptRes.success) {
            return NextResponse.json({ 
                success: false, 
                reason: transcriptRes.reason || "Unable to extract content" 
            }, { status: 400 });
        }

        const transcriptText = transcriptRes.text!;
        const MAX_CHARS = 600000;
        let safeTranscript = transcriptText;
        if (safeTranscript.length > MAX_CHARS) {
            safeTranscript = safeTranscript.slice(0, MAX_CHARS) + "\n\n[Transcript limit reached. Summarizing content...]";
        }

        // 3. Ultra High Quality Gemini Prompt (Hardened Professor Persona)
        const prompt = `
You are an elite AI professor, researcher, and visual thinker.
Your task is to convert raw transcript text into the most insightful, structured, and visually clear notes possible.

STRICT RULES:
1. Deep Understanding: Do not summarize blindly. Extract core concepts, hidden insights, and intent.
2. Structure: TITLE | OVERVIEW | DETAILED NOTES | KEY INSIGHTS | MENTAL MODELS | ACTIONABLE POINTS | SIMPLIFIED EXPLANATION.
3. Roman Hinglish Persona: Use your smart topper-friend voice (boss, suno, logic pakdo).
4. NO HINDI ALPHABETS: Use ONLY Roman script.
5. BEAUTY: Use markdown tables, bold highlights, and clean spacing.

Return your response in this JSON format (no backticks):
{
  "title": "Creative Title",
  "overview": "Summary (2-3 lines)",
  "notes": "Detailed premium notes with comparisons, definitions, and highlights",
  "keyPoints": ["Powerful Takeaway 1", "Powerful Takeaway 2"],
  "mentalModels": ["Relevant framework used (e.g., First Principles)"],
  "actionablePoints": ["Concrete step the user can take"],
  "simplifiedExplanation": "ELI15 explanation"
}

INPUT:
${safeTranscript}
`;

        // Multi-Model Fallback Chain for Stability
        const modelsToTry = ["gemini-1.5-flash-002", "gemini-2.0-flash-exp", "gemini-2.5-flash"];
        let result = null;
        let lastError: any = null;

        for (const modelName of modelsToTry) {
            try {
                const genModel = genAI.getGenerativeModel({ model: modelName });
                const generation = await genModel.generateContent(prompt);
                result = generation.response.text();
                break;
            } catch (error: any) {
                lastError = error;
                if (error?.message?.includes('404') || error?.message?.includes('429')) {
                    continue;
                }
                break;
            }
        }

        if (!result) {
            return NextResponse.json({ 
                error: lastError?.message || 'Failed to initialize AI models.' 
            }, { status: 500 });
        }

        // 4. Parse and Save
        let sanitizedResult = result.trim();
        if (sanitizedResult.startsWith('```json')) {
            sanitizedResult = sanitizedResult.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (sanitizedResult.startsWith('```')) {
            sanitizedResult = sanitizedResult.replace(/^```/, '').replace(/```$/, '').trim();
        }

        try {
            const parsedData = JSON.parse(sanitizedResult);
            
            // Build the final display notes
            const fullNotesMarkdown = `
# ${parsedData.title}

${parsedData.overview}

## 📝 Detailed Study Notes
${parsedData.notes}

## 🧠 Mental Models & Frameworks
${parsedData.mentalModels && parsedData.mentalModels.length > 0 ? parsedData.mentalModels.map((m: string) => `- ${m}`).join('\n') : "Internal Logical Synthesis"}

## ✅ Actionable Points
${parsedData.actionablePoints && parsedData.actionablePoints.length > 0 ? parsedData.actionablePoints.map((p: string) => `- ${p}`).join('\n') : "Apply these concepts in your next problem set!"}

## 👶 Simplified (Eli15)
${parsedData.simplifiedExplanation}
            `.trim();

            const responsePayload = {
                success: true,
                source: transcriptRes.source,
                notes: fullNotesMarkdown,
                keyPoints: parsedData.keyPoints,
                title: parsedData.title,
                summary: parsedData.overview
            };

            // Cache the result
            try {
                await setCachedNotes(videoId, {
                    title: parsedData.title,
                    notes: fullNotesMarkdown,
                    keyPoints: parsedData.keyPoints,
                    summary: parsedData.overview
                });
            } catch (cacheError) {
                console.error('Failed to cache notes:', cacheError);
            }

            return NextResponse.json(responsePayload);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError, result);
            return NextResponse.json({ error: 'AI returned malformed data. Try again.' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Essential Notes generation error:', error);
        return NextResponse.json({ error: error?.message || 'Failed to generate notes' }, { status: 500 });
    }
}
