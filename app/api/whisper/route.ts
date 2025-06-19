import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 501 })
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    console.log(`Received audio file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`)

    // Create FormData for OpenAI API
    const openaiFormData = new FormData()
    openaiFormData.append("file", audioFile, "audio.webm")
    openaiFormData.append("model", "whisper-1")
    openaiFormData.append("language", "en")
    openaiFormData.append("response_format", "json")

    // Call OpenAI Whisper API
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI Whisper API error:", errorText)
      return NextResponse.json({ error: `Whisper API error: ${response.status}` }, { status: response.status })
    }

    const transcription = await response.json()
    console.log("Transcription result:", transcription)

    return NextResponse.json({ text: transcription.text })
  } catch (error) {
    console.error("Whisper API error:", error)
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 })
  }
}
