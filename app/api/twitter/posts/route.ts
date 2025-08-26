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
  const username = searchParams.get("username")?.trim() || null;
  const includeReplies = (searchParams.get("includeReplies") || "false") === "true";
  const limitParam = parseInt(searchParams.get("limit") || "5", 10);
  const limit = Math.max(1, Math.min(Number.isNaN(limitParam) ? 5 : limitParam, 20)); // clamp 1..20

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) {
    return NextResponse.json(
      { error: "invalid username (letters/numbers/_ only, max 15 chars)" },
      { status: 422 }
    );
  }

  const headers = { "X-API-Key": key };

  // Resolve to userId if possible (more reliable)
  const infoUrl =
    "https://api.twitterapi.io/twitter/user/info?userName=" +
    encodeURIComponent(username);

  let userId: string | null = null;
  try {
    const infoRes = await fetch(infoUrl, { headers, cache: "no-store" });
    const infoJson = await infoRes.json().catch(() => ({}));
    if (infoRes.ok && infoJson?.data?.id) {
      userId = String(infoJson.data.id);
    }
  } catch {
    // ignore; we'll fall back to userName
  }

  // Capture a non-null copy so TS is happy inside the helper
  const usernameParam: string = username;

  type Post = { id: string; url: string; text: string; createdAt: string };

  async function fetchTweets(withReplies: boolean): Promise<Post[]> {
    const params = new URLSearchParams();
    if (userId && userId.length > 0) {
      params.set("userId", userId);
    } else {
      params.set("userName", usernameParam);
    }
    params.set("includeReplies", withReplies ? "true" : "false");

    const url =
      "https://api.twitterapi.io/twitter/user/last_tweets?" + params.toString();

    const r = await fetch(url, { headers, cache: "no-store" });
    const json = await r.json().catch(() => ({}));

    if (!r.ok) {
      throw new Error(json?.msg || `twitterapi.io error (${r.status})`);
    }

    const tweets: any[] = Array.isArray(json?.tweets) ? json.tweets : [];
    return tweets.slice(0, limit).map((t: any) => ({
      id: String(t.id),
      url: t.url,
      text: t.text,
      createdAt: t.createdAt,
    }));
  }

  try {
    // First try respecting includeReplies
    let posts = await fetchTweets(includeReplies);

    // If empty and replies were excluded, retry including replies
    if ((!posts || posts.length === 0) && !includeReplies) {
      posts = await fetchTweets(true);
      return NextResponse.json({
        username: usernameParam,
        posts,
        includeRepliesUsed: true,
      });
    }

    return NextResponse.json({
      username: usernameParam,
      posts,
      includeRepliesUsed: includeReplies,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "network error" },
      { status: 500 }
    );
  }
}
