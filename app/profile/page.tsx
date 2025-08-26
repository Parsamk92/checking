"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TgUser = { id?: number; first_name?: string; last_name?: string; username?: string };

type Tweet = { id: string; url: string; text: string; createdAt: string };
type ProfilePayload = {
  user: {
    userName: string | null;
    url: string | null;
    followers: number | null;
    following: number | null;
    profilePicture: string | null;
    isBlueVerified: boolean;
  };
  posts: Tweet[];
  includeRepliesUsed?: boolean;
};

const LS_KEY = (tgId?: number | string) => `ton-miniapp:xhandle:${tgId ?? "guest"}`;

export default function ProfilePage() {
  const [tg, setTg] = useState<TgUser | null>(null);
  const [handle, setHandle] = useState("");
  const [payload, setPayload] = useState<ProfilePayload | null>(null);
  const [includeReplies, setIncludeReplies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Load Telegram user if inside Telegram
  useEffect(() => {
    try {
      const web = (window as any)?.Telegram?.WebApp;
      if (web) { web.ready?.(); web.expand?.(); setTg(web.initDataUnsafe?.user ?? null); }
    } catch {}
  }, []);

  // ✅ Only auto-fetch if a saved, valid handle exists.
  // If none, open the editor immediately (so we don't call the API with an empty username).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY(tg?.id));
      if (saved) {
        const h = JSON.parse(saved) as string;
        if (/^[A-Za-z0-9_]{1,15}$/.test(h)) {
          setHandle(h);
          void fetchProfile(h, includeReplies);
          return;
        }
      }
    } catch {}
    setEditing(true); // no valid saved handle → show the input form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tg?.id]);

  // ✅ Guarded fetch: never hits the API without a valid handle
  async function fetchProfile(h: string, withReplies: boolean) {
    if (!h || !/^[A-Za-z0-9_]{1,15}$/.test(h)) {
      setPayload(null);
      return;
    }

    setLoading(true);
    setErr(null);
    setPayload(null);
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(
        `${base}/api/twitter/profile?username=${encodeURIComponent(h)}&limit=5&includeReplies=${withReplies ? "true" : "false"}`,
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );

      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      if (!ct.includes("application/json")) {
        throw new Error(`Expected JSON but got ${ct || "unknown"} (status ${res.status}). Snippet: ${text.slice(0,120)}`);
      }

      const json = JSON.parse(text) as ProfilePayload | { error: string };
      if (!res.ok) throw new Error((json as any)?.error || "API error");

      setPayload(json as ProfilePayload);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const h = handle.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) {
      setErr("Enter a valid X (Twitter) username (letters/numbers/_ only, max 15).");
      return;
    }
    localStorage.setItem(LS_KEY(tg?.id), JSON.stringify(h));
    void fetchProfile(h, includeReplies);
    setEditing(false);
  }

  const fullName = [tg?.first_name, tg?.last_name].filter(Boolean).join(" ") || tg?.username || "Guest";

  return (
    <main className="mx-auto max-w-md p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">👤 Profile</h1>
        <Link href="/leaderboard" className="underline">Leaderboard</Link>
      </header>

      <div className="rounded-2xl border bg-white p-5">
        {/* Telegram identity (optional) */}
        <div className="mb-4">
          <div className="text-lg font-semibold">{fullName}</div>
          <div className="text-sm text-gray-600">TG User ID: {tg?.id ?? "—"}</div>
        </div>

        {/* Enter/Change handle */}
        {(!handle || editing) && (
          <form onSubmit={onSubmit} className="mb-4 space-y-2">
            <label className="block text-sm font-medium">Your X (Twitter) username (without @)</label>
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-lg border bg-gray-50 px-2">@</span>
              <input
                className="w-full rounded-lg border p-2"
                placeholder="ton_blockchain"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                maxLength={15}
                autoComplete="off"
              />
              <button type="submit" disabled={loading} className="rounded-lg border px-3 py-2">
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
          </form>
        )}

        {/* Controls */}
        {handle && !editing && (
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={includeReplies}
                onChange={(e) => {
                  const v = e.target.checked;
                  setIncludeReplies(v);
                  if (/^[A-Za-z0-9_]{1,15}$/.test(handle)) void fetchProfile(handle, v);
                  else setEditing(true);
                }}
              />
              Include replies
            </label>
            <div className="flex gap-2">
              <button
                className="rounded-lg border px-3 py-1.5 text-sm"
                onClick={() => {
                  if (/^[A-Za-z0-9_]{1,15}$/.test(handle)) void fetchProfile(handle, includeReplies);
                  else setEditing(true);
                }}
                disabled={loading}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
              <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setEditing(true)}>
                Change
              </button>
              <button
                className="rounded-lg border px-3 py-1.5 text-sm"
                onClick={() => {
                  localStorage.removeItem(LS_KEY(tg?.id));
                  setHandle(""); setPayload(null); setEditing(true);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {payload && (
          <div className="space-y-4">
            {/* User header */}
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-full border bg-gray-100">
                {payload.user.profilePicture ? (
                  <img src={payload.user.profilePicture} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl">@</div>
                )}
              </div>
              <div>
                <div className="text-lg font-semibold">
                  @{payload.user.userName || handle} {payload.user.isBlueVerified ? "✔︎" : ""}
                </div>
                {payload.user.url && (
                  <a className="text-sm underline" href={payload.user.url} target="_blank" rel="noreferrer">
                    Open on X
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Followers</div>
                <div className="font-medium">{payload.user.followers ?? "—"}</div>
              </div>
              <div>
                <div className="text-gray-500">Following</div>
                <div className="font-medium">{payload.user.following ?? "—"}</div>
              </div>
            </div>

            {/* Posts */}
            {payload.includeRepliesUsed && !includeReplies && (
              <p className="text-xs text-gray-500">
                No standalone posts found — showing replies instead.
              </p>
            )}

            {payload.posts.length === 0 ? (
              <p className="text-sm text-gray-600">No recent posts found.</p>
            ) : (
              payload.posts.map((p) => (
                <article key={p.id} className="rounded-xl border p-4">
                  <p className="whitespace-pre-wrap text-sm">{p.text}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(p.createdAt).toLocaleString()}</span>
                    {p.url && (
                      <a className="underline" href={p.url} target="_blank" rel="noreferrer">
                        View on X
                      </a>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {!handle && !editing && !payload && (
          <p className="text-sm text-orange-700">
            Enter your X username to show your latest posts here.
          </p>
        )}

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
      </div>
    </main>
  );
}
