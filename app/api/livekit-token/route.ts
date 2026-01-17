import { NextRequest, NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit credentials not configured" },
        { status: 500 }
      )
    }

    // Get room and participant name from query params
    const { searchParams } = new URL(request.url)
    const roomName = searchParams.get("room") || "appointment-booking"
    const participantName = searchParams.get("name") || `patient-${Date.now()}`

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: "10m", // Token valid for 10 minutes
    })

    // Grant permissions
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    })

    const jwt = await token.toJwt()

    return NextResponse.json({ 
      token: jwt,
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL 
    })
  } catch (error) {
    console.error("Error generating LiveKit token:", error)
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    )
  }
}
