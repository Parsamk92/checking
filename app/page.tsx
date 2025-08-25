"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [name, setName] = useState("friend");

  useEffect(() => {
    try {
      const tg = (window as any)?.Telegram?.WebApp;
      if (tg) {
        tg.ready?.();
        tg.expand?.();
        const u = tg.initDataUnsafe?.user;
        setName(u?.first_name || u?.username || "friend");
      }
    } catch {}
  }, []);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Welcome, {name}!</h1>

      <div className="grid gap-3">
        <Link
          href="/leaderboard"
          className="block rounded-xl border bg-white p-4 hover:bg-gray-50"
        >
          🏆 Open Leaderboard
        </Link>
        <Link
          href="/profile"
          className="block rounded-xl border bg-white p-4 hover:bg-gray-50"
        >
          👤 Open Profile
        </Link>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Tip: open via your bot’s <code>web_app</code> button to see your Telegram data.
      </p>
    </main>
  );
}