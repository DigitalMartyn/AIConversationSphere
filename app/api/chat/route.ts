import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        response: "OpenAI API key not configured. This is a test response instead!",
      })
    }

    // Call OpenAI Chat API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant. Keep responses concise and friendly.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI Chat API error:", errorText)
      return NextResponse.json({
        response: "Sorry, I'm having trouble connecting to OpenAI right now.",
      })
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || "I'm not sure how to respond to that."

    return NextResponse.json({ response: aiResponse })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({
      response: "Sorry, something went wrong. This is a fallback response.",
    })
  }
}
