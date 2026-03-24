import { exec } from 'child_process';
import path from 'path';

export function extractVideoId(url: string) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * Stage 1: Native transcript fetch (fastest)
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
        return null;
    }
}

/**
 * Stage 3: Metadata extraction (absolute last resort if all AI/Transcripts fail)
 */
async function fetchVideoMetadata(videoId: string): Promise<string | null> {
    try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await response.text();
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const descMatch = html.match(/"description":\{"simpleText":"(.*?)"\}/);
        
        if (titleMatch) {
            return `Title: ${titleMatch[1]}\nDescription: ${descMatch ? descMatch[1] : ""}`;
        }
        return null;
    } catch (e) {
        return null;
    }
}

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
 * TRIPLE-FALLBACK SYSTEM (FOR 100% SUCCESS RATE)
 */
export async function getTranscriptWithFallback(videoId: string): Promise<{ success: boolean; text?: string; source: "transcript" | "whisper" | "metadata"; reason?: string }> {
    // 1. Try Native Scraping (Fastest, FREE)
    const transcriptText = await fetchTranscriptNative(videoId);
    if (transcriptText) {
        return { success: true, text: transcriptText, source: "transcript" };
    }

    // 2. Try Whisper AI CLI Fallback (Local, Works everywhere, Robust)
    console.log(`No captions found for video: ${videoId}. Using Whisper CLI.`);
    try {
        const whisperText = await runWhisper(`https://www.youtube.com/watch?v=${videoId}`);
        if (whisperText && whisperText.length > 10) {
            return { success: true, text: whisperText, source: "whisper" };
        }
    } catch (whisperError) {
        console.error('Whisper CLI failed. Moving to Metadata Fallback.');
    }

    // 3. Last Resort: Metadata (Title/Description) - ALWAYS WORKS
    const metadataText = await fetchVideoMetadata(videoId);
    if (metadataText) {
        return { success: true, text: metadataText, source: "metadata" };
    }

    return { success: false, source: "transcript", reason: "Video content reached end of resilience. Please try another video." };
}

async function runWhisper(videoUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'transcriber', 'transcribe.py');
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const command = `${pythonCmd} "${scriptPath}" "${videoUrl}"`;

        exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
