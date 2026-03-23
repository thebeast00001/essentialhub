import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const modelId = "stabilityai/stable-diffusion-xl-base-1.0";
        const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;

        if (!hfToken) {
            throw new Error("Missing Hugging Face API key in environment variables (HF_TOKEN)");
        }

        const augmentedPrompt = `A pencil sketch diagram, minimal, educational, white background. ${prompt}`;

        const response = await fetch(
            `https://api-inference.huggingface.co/models/${modelId}`,
            {
                headers: {
                    Authorization: `Bearer ${hfToken}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ inputs: augmentedPrompt }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Hugging Face API Error: ${err}`);
        }

        const blob = await response.blob();
        
        return new Response(blob, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg'
            }
        });

    } catch (error: any) {
        console.error('Illustration generation error:', error);
        return NextResponse.json({ error: error?.message || 'Failed to generate illustration' }, { status: 500 });
    }
}
