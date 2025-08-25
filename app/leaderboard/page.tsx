"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TgUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type Row = { id: number; name: string; points: number };

export default function LeaderboardPage() {
  const [me, setMe] = useState<TgUser | null>(null);

  // Read user from Telegram WebApp if available
  useEffect(() => {
    try {
      const tg = (window as any)?.Telegram?.WebApp;
      if (tg) {
        tg.ready?.();
        tg.expand?.();
        setMe(tg.initDataUnsafe?.user ?? null);
      }
    } catch {
      // ignore if not in Telegram
    }
  }, []);

  // Demo leaderboard data — replace with your API later
  const rows: Row[] = useMemo(() => {
    const demo: Row[] = [
      { id: 101, name: "Alice", points: 1320 },
      { id: 102, name: "Bob", points: 1280 },
      { id: 103, name: "Charlie", points: 1100 },
      { id: 104, name: "Diana", points: 990 },
    ];
    // Add current user to the board (if opened inside Telegram)
    if (me?.id) {
      demo.push({
        id: me.id,
        name:
          [me.first_name, me.last_name].filter(Boolean).join(" ") ||
          me.username ||
          "You",
        points: 1050, // sample number; replace with real points
      });
    }
    return demo.sort((a, b) => b.points - a.points);
  }, [me]);

  return (
    <main className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏆 Leaderboard</h1>
        <Link href="/profile" className="underline">
          Profile
        </Link>
      </header>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => {
              const isMe = me?.id && r.id === me.id;
              return (
                <tr
                  key={`${r.id}-${r.name}`}
                  className={isMe ? "bg-yellow-50 font-medium" : ""}
                >
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3">
                    {r.name} {isMe ? <span className="text-xs">(you)</span> : null}
                  </td>
                  <td className="px-4 py-3">{r.points.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Tip: open this page from inside Telegram (via your bot’s{" "}
        <code>web_app</code> button) to auto-detect your account and highlight you.
      </p>
    </main>
  );
}
