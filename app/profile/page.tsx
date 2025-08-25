"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TgUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string; // available inside Telegram Web Apps
};

export default function ProfilePage() {
  const [user, setUser] = useState<TgUser | null>(null);

  useEffect(() => {
    try {
      const tg = (window as any)?.Telegram?.WebApp;
      if (tg) {
        tg.ready?.();
        tg.expand?.();
        setUser(tg.initDataUnsafe?.user ?? null);
      }
    } catch {
      // not inside Telegram or SDK not loaded
    }
  }, []);

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Guest";

  return (
    <main className="mx-auto max-w-md p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">👤 Profile</h1>
        <Link href="/leaderboard" className="underline">
          Leaderboard
        </Link>
      </header>

      <div className="rounded-2xl border bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border bg-gray-100">
            {user?.photo_url ? (
              // using <img> avoids Next.js image domain config
              <img
                src={user.photo_url}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl">
                {fullName.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <div className="text-lg font-semibold">{fullName}</div>
            <div className="text-sm text-gray-600">
              @{user?.username || "unknown"}
            </div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">User ID</dt>
            <dd className="font-medium">{user?.id ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Language</dt>
            <dd className="font-medium">{user?.language_code ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Premium</dt>
            <dd className="font-medium">
              {user?.is_premium ? "Yes" : "No / Unknown"}
            </dd>
          </div>
        </dl>

        {!user && (
          <p className="mt-5 text-sm text-orange-700">
            Open this page from inside Telegram (via your bot’s{" "}
            <code>web_app</code> button) to see your real profile.
          </p>
        )}
      </div>
    </main>
  );
}
