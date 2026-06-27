import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deal Radar",
  description: "Cache-first deal intelligence demo for noisy resale posts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <header className="border-b border-[var(--border)] bg-[var(--panel)]/92">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <Link href="/" className="flex flex-col">
              <span className="text-lg font-semibold tracking-normal">
                Deal Radar
              </span>
              <span className="text-sm text-[var(--muted)]">
                Cache-first resale intelligence
              </span>
            </Link>
            <nav className="flex flex-wrap gap-2 text-sm font-medium">
              <Link
                href="/"
                className="rounded-md border border-[var(--border)] px-3 py-2 hover:border-[var(--accent)]"
              >
                Dashboard
              </Link>
              <Link
                href="/demo"
                className="rounded-md bg-[var(--foreground)] px-3 py-2 text-[var(--background)] hover:bg-[var(--accent-strong)]"
              >
                Demo Console
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
