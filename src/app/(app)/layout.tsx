import type { Metadata } from "next";
import Link from "next/link";
import "../globals.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import "@fontsource/eb-garamond/700.css";
import "@fontsource/eb-garamond/700-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/400-italic.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/open-sans/400.css";
import "@fontsource/open-sans/400-italic.css";
import "@fontsource/open-sans/600.css";
import "@fontsource/open-sans/700.css";
import "@fontsource/merriweather/300.css";
import "@fontsource/merriweather/400.css";
import "@fontsource/merriweather/400-italic.css";
import "@fontsource/merriweather/700.css";
import { Wordmark } from "@/components/Logo";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { DARK_THEMES, DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/themes";

/**
 * Runs before first paint so the saved theme is on <html> by the time anything
 * renders — otherwise every load flashes the default light palette first.
 */
const THEME_INIT = `(function(){try{
var c=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${JSON.stringify(DEFAULT_THEME)};
var t=c==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":${JSON.stringify(DEFAULT_THEME)}):c;
var d=document.documentElement;
d.dataset.theme=t;
d.style.colorScheme=${JSON.stringify([...DARK_THEMES])}.indexOf(t)>-1?"dark":"light";
}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Locus — CV builder",
  description:
    "Keep every experience on file, put the relevant ones forward. " +
    "Locus — Latin for a place or position, and so for an opening.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must be a plain sync script in <head> so it runs before paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
          <div className="mx-auto flex h-13 max-w-[1600px] items-center gap-6 px-6 py-3">
            <Link
              href="/"
              className="flex items-baseline gap-2.5"
              title="Locus — Latin for a place or position, and so for an opening"
            >
              <Wordmark />
              <span className="text-[12px] muted">CV builder</span>
            </Link>
            <nav className="flex items-center gap-1 text-[13px]">
              <Link href="/" className="btn btn-ghost btn-sm">
                CVs
              </Link>
              <Link href="/library" className="btn btn-ghost btn-sm">
                Library
              </Link>
            </nav>
            <div className="ml-auto">
              <ThemeSwitcher />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
