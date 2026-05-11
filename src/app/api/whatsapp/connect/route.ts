import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { instanceId, token } = await req.json() as {
    instanceId: string;
    token: string;
  };

  if (!instanceId || !token) {
    return NextResponse.json({ connected: false });
  }

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/status`,
      { method: "GET" }
    );

    if (!res.ok) {
      return NextResponse.json({ connected: false });
    }

    const data = await res.json() as { value?: string; connected?: boolean };
    const connected = data?.value === "connected" || data?.connected === true;
    return NextResponse.json({ connected });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
