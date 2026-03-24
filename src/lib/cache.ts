import { supabase } from './supabase';

export interface CachedNotes {
    video_id: string;
    title: string;
    notes: string;
    keyPoints: string[];
    summary: string;
}

export async function getCachedNotes(videoId: string): Promise<CachedNotes | null> {
    try {
        const { data, error } = await supabase
            .from('essential_notes_cache')
            .select('video_id, title, notes, keyPoints:key_points, summary')
            .eq('video_id', videoId)
            .single();
            
        if (error || !data) return null;
        return data as CachedNotes;
    } catch (err) {
        console.error('Cache fetch error (Table might not exist):', err);
        return null;
    }
}

export async function setCachedNotes(videoId: string, payload: Omit<CachedNotes, 'video_id'>) {
    try {
        const { error } = await supabase
            .from('essential_notes_cache')
            .upsert({
                video_id: videoId,
                title: payload.title,
                notes: payload.notes,
                key_points: payload.keyPoints,
                summary: payload.summary,
                created_at: new Date().toISOString()
            });
            
        if (error) console.error('Cache set error:', error);
    } catch (err) {
        console.error('Cache save error (Table might not exist):', err);
    }
}
