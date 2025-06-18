import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 501 })
    }

    // Real OpenAI TTS implementation would go here
    // For now, return an error to trigger fallback
    return NextResponse.json({ error: "TTS service temporarily unavailable" }, { status: 503 })

    /* 
    // Uncomment this when you have OpenAI API key configured:
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      }),
    })

    if (!response.ok) {
      throw new Error('OpenAI TTS API error')
    }

    const audioBuffer = await response.arrayBuffer()
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
    */
  } catch (error) {
    console.error("TTS API error:", error)
    return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 })
  }
}
