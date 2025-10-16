import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("google_access_token")

    return NextResponse.json({
      connected: !!accessToken?.value,
    })
  } catch (error) {
    console.error("Error checking calendar status:", error)
    return NextResponse.json({ connected: false })
  }
}
