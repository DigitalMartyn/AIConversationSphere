import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { google } from "googleapis"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    // Fetch calendar events if connected
    let calendarContext = ""
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("google_access_token")?.value
    const refreshToken = cookieStore.get("google_refresh_token")?.value

    if (accessToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI,
        )

        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        const calendar = google.calendar({ version: "v3", auth: oauth2Client })

        const now = new Date()
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: now.toISOString(),
          timeMax: nextWeek.toISOString(),
          maxResults: 20,
          singleEvents: true,
          orderBy: "startTime",
        })

        const events = response.data.items || []

        if (events.length > 0) {
          calendarContext =
            "\n\nUser's Calendar Events (next 7 days):\n" +
            events
              .map((event) => {
                const start = event.start?.dateTime || event.start?.date
                const end = event.end?.dateTime || event.end?.date
                return `- ${event.summary} (${start} to ${end})${event.location ? ` at ${event.location}` : ""}`
              })
              .join("\n")
        }
      } catch (calendarError) {
        console.error("Error fetching calendar for AI context:", calendarError)
      }
    }

    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are a helpful AI assistant with access to the user's calendar. 
      
User message: ${message}
${calendarContext}

Please respond naturally and helpfully. If the user asks about their schedule, meetings, or availability, use the calendar information provided above.`,
    })

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
