import { exec } from 'child_process';
import path from 'path';

export function extractVideoId(url: string) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * PRIMARY METHOD: Native fetch for transcript
 */
async function fetchTranscriptNative(videoId: string): Promise<string | null> {
    try {
        const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const videoPageHtml = await videoPageResponse.text();
        const jsonMatch = videoPageHtml.match(/"captionTracks":\s*(\[.*?\])/);
        
        if (!jsonMatch) return null;

        const captionTracks = JSON.parse(jsonMatch[1]);
        const track = captionTracks.find((t: any) => t.languageCode === 'en' || t.languageCode === 'en-US') || captionTracks[0];
        
        if (!track || !track.baseUrl) return null;

        const transcriptResponse = await fetch(track.baseUrl);
        const transcriptText = await transcriptResponse.text();
        
        return cleanTranscriptText(transcriptText);
    } catch (e) {
        console.error('Native fetch error:', e);
        return null;
    }
}

/**
 * Clean transcript (XML removal, spacing, paragraphing)
 */
function cleanTranscriptText(text: string): string {
    return text
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * FALLBACK SYSTEM (MANDATORY STRUCTURE)
 */
export async function getTranscriptWithFallback(videoId: string): Promise<{ success: boolean; text?: string; source: "transcript" | "whisper"; reason?: string }> {
    // 1. Try Primary Method
    const transcriptText = await fetchTranscriptNative(videoId);
    
    if (transcriptText) {
        return { success: true, text: transcriptText, source: "transcript" };
    }

    // 2. Fallback to Whisper (Python Implementation)
    console.log(`No captions found for video: ${videoId}. Using Whisper fallback.`);
    const fallbackText = await fallbackTranscription(videoId);
    if (fallbackText) {
        return { success: true, text: fallbackText, source: "whisper" };
    }

    return { success: false, source: "transcript", reason: "Unable to extract content even with Whisper." };
}

/**
 * FALLBACK TRANSCRIPTION FUNCTION (Whisper Implementation)
 */
async function fallbackTranscription(videoId: string): Promise<string | null> {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
        const result = await runWhisper(videoUrl);
        return result || null;
    } catch (error) {
        console.error('Whisper fallback error:', error);
        return null; // Return null to trigger the "unable to extract" error state
    }
}

/**
 * Call Python Transcriber (Child Process)
 */
async function runWhisper(videoUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Path to the Python script
        const scriptPath = path.join(process.cwd(), 'transcriber', 'transcribe.py');
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const command = `${pythonCmd} "${scriptPath}" "${videoUrl}"`;

        console.log(`Running Whisper for: ${videoUrl}`);

        exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Whisper execution error:', error);
                reject(error);
                return;
            }
            if (stderr) {
                console.warn('Whisper warnings:', stderr);
            }
            resolve(stdout.trim());
        });
    });
}
