"use client";

import Link from "next/link";
import { PageBackdrop } from "~/app/_components/page-backdrop";
import { APP_VERSION, CHANGELOG } from "~/lib/version";

export default function ChangelogPage() {
  return (
    <main className="relative min-h-screen">
      <PageBackdrop />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pr-14 pb-12 sm:px-6 lg:px-8 lg:pr-8" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}>
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white drop-shadow-md">What's New</h1>
            <div className="text-sm text-white/50">Version {APP_VERSION}</div>
          </div>
        </div>

        <div className="space-y-6">
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className="rounded-xl bg-white/85 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-brand-dark">{entry.title}</h2>
                <span className="shrink-0 ml-3 rounded-full bg-brand-green/15 px-2.5 py-0.5 text-xs font-medium text-brand-green">
                  v{entry.version}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-brand-khaki">{entry.date}</div>
              <ul className="mt-3 space-y-2">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-brand-dark/80">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
