import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Telegram Mini App",
  description: "A simple Telegram Mini App using Next.js 14",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Load Telegram WebApp SDK before any client code runs */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {/* One-time init + expand + (optional) theme sync */}
        <Script id="tg-init" strategy="afterInteractive">
          {`
            try {
              const tg = window.Telegram?.WebApp;
              if (tg) {
                tg.ready();
                tg.expand();
                // Optional: keep colors in sync with Telegram theme
                const setTheme = () => {
                  const p = tg.themeParams || {};
                  document.documentElement.style.setProperty("--tg-bg", p.bg_color || "");
                  document.documentElement.style.setProperty("--tg-text", p.text_color || "");
                };
                setTheme();
                tg.onEvent?.("themeChanged", setTheme);
              }
            } catch (e) {}
          `}
        </Script>
      </head>
      <body
        className={`${inter.className} min-h-screen`}
        style={{
          background: "var(--tg-theme-bg-color, var(--tg-bg, #f9fafb))",
          color: "var(--tg-theme-text-color, var(--tg-text, #111827))",
        }}
      >
        <main className="mx-auto max-w-2xl p-4">{children}</main>
      </body>
    </html>
  );
}