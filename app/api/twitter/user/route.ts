import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const key = process.env.TWITTERAPI_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Server not configured: missing TWITTERAPI_KEY" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.trim();
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) {
    return NextResponse.json(
      { error: "invalid username (letters/numbers/_ only, max 15 chars)" },
      { status: 422 }
    );
  }

  const url =
    "https://api.twitterapi.io/twitter/user/info?userName=" +
    encodeURIComponent(username);

  try {
    const r = await fetch(url, {
      headers: { "X-API-Key": key },
      cache: "no-store",
    });
    const json = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { error: json?.msg || "twitterapi.io error" },
        { status: r.status }
      );
    }

    const d = json?.data || {};
    // ⬇️ return ONLY the fields you care about
    return NextResponse.json({
      userName: d.userName ?? null,
      url: d.url ?? null,
      followers: d.followers ?? null,
      following: d.following ?? null,
      profilePicture: d.profilePicture ?? null,
      isBlueVerified: !!d.isBlueVerified,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "network error" },
      { status: 500 }
    );
  }
}
