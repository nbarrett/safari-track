"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { PageBackdrop } from "~/app/_components/page-backdrop";

interface RoadStats {
  featureCount: number;
  fileSize: string;
}

export default function AdminRoadsPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<RoadStats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/data/roads.geojson");
      if (!res.ok) {
        setStats(null);
        return;
      }
      const text = await res.text();
      const geojson = JSON.parse(text) as { features?: unknown[] };
      const sizeKb = (text.length / 1024).toFixed(1);
      setStats({
        featureCount: geojson.features?.length ?? 0,
        fileSize: Number(sizeKb) > 1024 ? `${(Number(sizeKb) / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
      });
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (status === "loading") return null;
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { type?: string; features?: unknown[] };
      if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
        setMessage({ type: "error", text: "File must be a valid GeoJSON FeatureCollection" });
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/roads/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { success?: boolean; featureCount?: number; error?: string };

      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Upload failed" });
      } else {
        setMessage({ type: "success", text: `Uploaded ${data.featureCount} road features` });
        await loadStats();
      }
    } catch {
      setMessage({ type: "error", text: "Invalid file" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <main className="relative min-h-screen">
      <PageBackdrop />
      <div className="relative z-10 mx-auto max-w-2xl px-4 pr-14 py-8 lg:pr-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Road Data</h1>

        {stats && (
          <div className="mb-6 rounded-lg bg-white/10 p-4">
            <h2 className="mb-2 text-lg font-semibold text-brand-gold">Current Data</h2>
            <p className="text-white/80">{stats.featureCount} road features</p>
            <p className="text-white/80">File size: {stats.fileSize}</p>
          </div>
        )}

        <div className="rounded-lg bg-white/10 p-4">
          <h2 className="mb-2 text-lg font-semibold text-brand-gold">Upload GeoJSON</h2>
          <p className="mb-4 text-sm text-white/60">
            Upload a .geojson file containing a FeatureCollection of road data. This will replace the existing road data.
          </p>
          <label className="inline-block cursor-pointer rounded-lg bg-brand-gold px-4 py-2 font-medium text-brand-brown transition hover:bg-brand-gold/90">
            {uploading ? "Uploading..." : "Choose File"}
            <input
              type="file"
              accept=".geojson"
              onChange={(e) => void handleUpload(e)}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {message && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm font-medium ${
              message.type === "success" ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </main>
  );
}
