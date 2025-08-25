"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TgUser = { id?: number; first_name?: string; last_name?: string; username?: string };

type TwitterUser = {
  userName: string | null;
  url: string | null;
  followers: number | null;
  following: number | null;
  profilePicture: string | null;
  isBlueVerified: boolean;
};

const LS_KEY = (tgId?: number | string) => `ton-miniapp:twitter:${tgId ?? "guest"}`;

export default function ProfilePage() {
  const [tg, setTg] = useState<TgUser | null>(null);

  const [handle, setHandle] = useState("");
  const [data, setData] = useState<TwitterUser | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // read Telegram user (if opened inside Telegram)
  useEffect(() => {
    try {
      const tg = (window as any)?.Telegram?.WebApp;
      if (tg) {
        tg.ready?.();
        tg.expand?.();
        setTg(tg.initDataUnsafe?.user ?? null);
      }
    } catch {}
  }, []);

  // load saved info for this Telegram user
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY(tg?.id));
      if (saved) {
        const parsed = JSON.parse(saved) as { handle: string; data: TwitterUser };
        setHandle(parsed.handle || "");
        setData(parsed.data || null);
      }
    } catch {}
  }, [tg?.id]);

  async function lookup(h: string) {
  setLoading(true);
  setErr(null);
  try {
    // always hit the same origin as the page (PUBLIC_URL)
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const res = await fetch(
      `${base}/api/twitter/user?username=${encodeURIComponent(h)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );

    const ct = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!ct.includes("application/json")) {
      // If the server returned HTML (404 page, proxy error, etc.), show a helpful error
      throw new Error(
        `Expected JSON but got ${ct || "unknown"} (status ${res.status}). Snippet: ${text.slice(0, 120)}`
      );
    }

    const json = JSON.parse(text);
    if (!res.ok) {
      throw new Error(json?.error || `API error (status ${res.status})`);
    }

    // success
    setData(json);
    const savedHandle = (json.userName ?? h) || h;
    setHandle(savedHandle);
    localStorage.setItem(LS_KEY(tg?.id), JSON.stringify({ handle: savedHandle, data: json }));
    setEditing(false);
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
      setErr("Enter a valid Twitter username (letters/numbers/_ only, max 15).");
      return;
    }
    lookup(h);
  }

  const fullName =
    [tg?.first_name, tg?.last_name].filter(Boolean).join(" ") ||
    tg?.username ||
    "Guest";

  return (
    <main className="mx-auto max-w-md p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">👤 Profile</h1>
        <Link href="/leaderboard" className="underline">Leaderboard</Link>
      </header>

      <div className="rounded-2xl border bg-white p-5">
        {/* Telegram identity summary (optional) */}
        <div className="mb-4">
          <div className="text-lg font-semibold">{fullName}</div>
          <div className="text-sm text-gray-600">TG User ID: {tg?.id ?? "—"}</div>
        </div>

        {/* Ask for Twitter handle (first time or when editing) */}
        {(!data || editing) && (
          <form onSubmit={onSubmit} className="mb-4 space-y-2">
            <label className="block text-sm font-medium">Your Twitter username (without @)</label>
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-lg border bg-gray-50 px-2">@</span>
              <input
                className="w-full rounded-lg border p-2"
                placeholder="cocowaves"
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

        {/* Show ONLY the chosen Twitter fields */}
        {data && !editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-full border bg-gray-100">
                {data.profilePicture ? (
                  <img src={data.profilePicture} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl">@</div>
                )}
              </div>
              <div>
                <div className="text-lg font-semibold">
                  @{data.userName || handle} {data.isBlueVerified ? "✔︎" : ""}
                </div>
                {data.url && (
                  <a className="text-sm underline" href={data.url} target="_blank" rel="noreferrer">
                    Open on X
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Followers</div>
                <div className="font-medium">{data.followers ?? "—"}</div>
              </div>
              <div>
                <div className="text-gray-500">Following</div>
                <div className="font-medium">{data.following ?? "—"}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="rounded-lg border px-3 py-2" onClick={() => setEditing(true)}>
                Change Twitter
              </button>
              <button
                className="rounded-lg border px-3 py-2"
                onClick={() => {
                  localStorage.removeItem(LS_KEY(tg?.id));
                  setData(null);
                  setHandle("");
                  setEditing(true);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {!data && !editing && (
          <p className="text-sm text-orange-700">Enter your Twitter username to show your profile here.</p>
        )}
      </div>
    </main>
  );
}
