"use client";

import { type FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { PageBackdrop } from "~/app/_components/page-backdrop";

export default function GpxImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-khaki">
        Loading...
      </div>
    );
  }

  if (!session) {
    redirect("/auth/signin");
  }

  function handleFileChange() {
    const file = fileInputRef.current?.files?.[0];
    setFileName(file?.name ?? null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a GPX file");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("gpx", file);

    try {
      const res = await fetch("/api/gpx/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { driveId?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }

      router.push(`/drives/${data.driveId}`);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="relative min-h-screen">
      <PageBackdrop />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pr-14 pb-8 pt-6 sm:px-6 lg:px-8 lg:pr-8">
        <Link href="/drives" className="text-sm text-brand-gold hover:text-brand-gold/80">
          &larr; Back to history
        </Link>
        <h1 className="mt-2 mb-4 text-xl font-bold text-white drop-shadow-md">Import GPX</h1>

        <div className="rounded-lg bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <p className="mb-4 text-sm text-brand-dark">
            Upload a GPX file to create a drive session from its route data.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-600/90 px-4 py-3 text-sm text-white">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="gpx-file"
              className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-brand-khaki/40 px-6 py-10 transition hover:border-brand-gold/60"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mb-2 h-8 w-8 text-brand-khaki"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span className="text-sm font-medium text-brand-dark">
                {fileName ?? "Choose a .gpx file"}
              </span>
              <span className="mt-1 text-xs text-brand-khaki">Max 10 MB</span>
              <input
                id="gpx-file"
                ref={fileInputRef}
                type="file"
                accept=".gpx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <button
              type="submit"
              disabled={uploading || !fileName}
              className="mt-4 w-full rounded-md bg-brand-green px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload & Create Drive"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
