// app/api/twitter/profile/route.ts
import { NextRequest, NextResponse } from "next/server";

type Tweet = { id: string; url: string; text: string; createdAt: string };

export async function GET(req: NextRequest) {
  const key = process.env.TWITTERAPI_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Server not configured: missing TWITTERAPI_KEY" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const usernameRaw = searchParams.get("username")?.trim() || "";
  const includeRepliesWanted =
    (searchParams.get("includeReplies") || "false") === "true";
  const limitParam = parseInt(searchParams.get("limit") || "5", 10);
  const limit = Math.max(1, Math.min(Number.isNaN(limitParam) ? 5 : limitParam, 20)); // clamp 1..20

  if (!usernameRaw) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_]{1,15}$/.test(usernameRaw)) {
    return NextResponse.json(
      { error: "invalid username (letters/numbers/_ only, max 15 chars)" },
      { status: 422 }
    );
  }

  // capture non-null username string
  const username: string = usernameRaw;
  const headers: Record<string, string> = { "X-API-Key": key };

  try {
    // 1) get user info (also gives reliable userId)
    const infoUrl =
      "https://api.twitterapi.io/twitter/user/info?userName=" +
      encodeURIComponent(username);

    const uRes = await fetch(infoUrl, { headers, cache: "no-store" });
    const uJson = await uRes.json().catch(() => ({}));
    if (!uRes.ok) {
      return NextResponse.json(
        { error: uJson?.msg || "twitterapi.io error (user)" },
        { status: uRes.status }
      );
    }

    const d = uJson?.data || {};
    const userId: string = d?.id ? String(d.id) : ""; // make it a string (empty if missing)

    // ✅ helper as an ARROW FUNCTION, passing params explicitly (no ESLint/TS complaints)
    const fetchTweets = async (
      userId: string,
      username: string,
      withReplies: boolean,
      limit: number,
      headers: Record<string, string>
    ): Promise<Tweet[]> => {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      else params.set("userName", username);
      params.set("includeReplies", withReplies ? "true" : "false");

      const tweetsUrl =
        "https://api.twitterapi.io/twitter/user/last_tweets?" + params.toString();

      const tRes = await fetch(tweetsUrl, { headers, cache: "no-store" });
      const tJson = await tRes.json().catch(() => ({}));
      if (!tRes.ok) {
        throw new Error(tJson?.msg || `twitterapi.io error (tweets ${tRes.status})`);
      }

      const tweets: any[] = Array.isArray(tJson?.tweets) ? tJson.tweets : [];
      return tweets.slice(0, limit).map((t: any) => ({
        id: String(t.id),
        url: t.url,
        text: t.text,
        createdAt: t.createdAt,
      }));
    };

    // 2) get latest posts (retry incl. replies if first pass empty)
    let posts = await fetchTweets(userId, username, includeRepliesWanted, limit, headers);
    let includeRepliesUsed = includeRepliesWanted;
    if ((!posts || posts.length === 0) && !includeRepliesWanted) {
      posts = await fetchTweets(userId, username, true, limit, headers);
      includeRepliesUsed = true;
    }

    // 3) return the user fields you want + posts (each has its link in `url`)
    return NextResponse.json({
      user: {
        userName: d.userName ?? null,
        url: d.url ?? null,
        followers: d.followers ?? null,
        following: d.following ?? null,
        profilePicture: d.profilePicture ?? null,
        isBlueVerified: !!d.isBlueVerified,
      },
      posts,
      includeRepliesUsed,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "network error" }, { status: 500 });
  }
}
