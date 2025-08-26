// app/api/twitter/posts/route.ts
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
  const includeReplies = (searchParams.get("includeReplies") || "false") === "true";
  const limitParam = parseInt(searchParams.get("limit") || "5", 10);
  const limit = Math.max(1, Math.min(isNaN(limitParam) ? 5 : limitParam, 20)); // clamp 1..20

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
    "https://api.twitterapi.io/twitter/user/last_tweets?userName=" +
    encodeURIComponent(username) +
    `&includeReplies=${includeReplies ? "true" : "false"}`;

  try {
    const r = await fetch(url, {
      headers: { "X-API-Key": key },
      cache: "no-store",
    });

    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json(
        { error: json?.msg || "twitterapi.io error (tweets)" },
        { status: r.status }
      );
    }

    const tweets = Array.isArray(json?.tweets) ? json.tweets : [];
    const posts = tweets.slice(0, limit).map((t: any) => ({
      id: String(t.id),
      url: t.url,
      text: t.text,
      createdAt: t.createdAt,
    }));

    return NextResponse.json({ username, posts });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "network error" }, { status: 500 });
  }
}
