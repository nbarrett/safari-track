"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

function isExternal(url: string) {
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function InternaliseButton({
  url,
  onInternalised,
}: {
  url: string;
  onInternalised: (newUrl: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  if (!isExternal(url)) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/photos/internalise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { url: string };
      if (data.url) onInternalised(data.url);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className="rounded bg-brand-gold/20 px-2 py-1 text-[10px] font-medium text-brand-brown transition hover:bg-brand-gold/30 disabled:opacity-50"
      title="Copy to internal storage"
    >
      {loading ? "Copying..." : "Internalise"}
    </button>
  );
}

function ImagePreview({ url }: { url: string }) {
  const [show, setShow] = useState(false);

  if (!url) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShow(true)}
        className="rounded bg-brand-cream px-2 py-1 text-[10px] font-medium text-brand-khaki transition hover:bg-brand-cream/80"
      >
        Preview
      </button>
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShow(false)}
        >
          <Image
            src={url}
            alt="Preview"
            width={800}
            height={600}
            unoptimized
            className="max-h-[80vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}

export default function AdminLodgeEditPage() {
  const { data: session, status } = useSession();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = api.useUtils();

  const lodge = api.lodge.showcase.useQuery(undefined, {
    select: (data) => data.find((l) => l.id === params.id),
  });

  const [name, setName] = useState<string | null>(null);
  const [tagline, setTagline] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<string | null>(null);
  const [detailedLocation, setDetailedLocation] = useState<string | null>(null);
  const [heroImages, setHeroImages] = useState<string[] | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [brandName, setBrandName] = useState<string | null>(null);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandLogoLight, setBrandLogoLight] = useState<boolean | null>(null);
  const [brandAccentColour, setBrandAccentColour] = useState<string | null>(null);
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState<string | null>(null);

  const update = api.lodge.update.useMutation({
    onSuccess: () => {
      void utils.lodge.showcase.invalidate();
      router.push("/admin/lodges");
    },
  });

  if (status === "loading" || lodge.isLoading) {
    return (
      <>
        <PageBackdrop />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <p className="text-white/60">Loading...</p>
        </div>
      </>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const l = lodge.data;
  if (!l) {
    return (
      <>
        <PageBackdrop />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <p className="text-white">Lodge not found</p>
        </div>
      </>
    );
  }

  const val = {
    name: name ?? l.name,
    tagline: tagline ?? l.tagline ?? "",
    description: description ?? l.description ?? "",
    highlights: highlights ?? l.highlights.join("\n"),
    capacity: capacity ?? l.capacity ?? "",
    detailedLocation: detailedLocation ?? l.detailedLocation ?? "",
    heroImages: heroImages ?? l.heroImages,
    brandName: brandName ?? l.brandName ?? "",
    brandLogoUrl: brandLogoUrl ?? l.brandLogoUrl ?? "",
    brandLogoLight: brandLogoLight ?? l.brandLogoLight,
    brandAccentColour: brandAccentColour ?? l.brandAccentColour ?? "",
    brandWebsiteUrl: brandWebsiteUrl ?? l.brandWebsiteUrl ?? "",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      id: l.id,
      name: val.name,
      tagline: val.tagline || null,
      description: val.description || null,
      highlights: val.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
      capacity: val.capacity || null,
      detailedLocation: val.detailedLocation || null,
      heroImages: val.heroImages,
      brandName: val.brandName || null,
      brandLogoUrl: val.brandLogoUrl || null,
      brandLogoLight: val.brandLogoLight,
      brandAccentColour: val.brandAccentColour || null,
      brandWebsiteUrl: val.brandWebsiteUrl || null,
    });
  };

  const addHeroImage = () => {
    if (!newImageUrl.trim()) return;
    setHeroImages([...val.heroImages, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const removeHeroImage = (index: number) => {
    setHeroImages(val.heroImages.filter((_, i) => i !== index));
  };

  const moveHeroImage = (index: number, direction: -1 | 1) => {
    const arr = [...val.heroImages];
    const target = index + direction;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target]!, arr[index]!];
    setHeroImages(arr);
  };

  const replaceHeroImage = (index: number, newUrl: string) => {
    const arr = [...val.heroImages];
    arr[index] = newUrl;
    setHeroImages(arr);
  };

  const replaceLogoUrl = (newUrl: string) => {
    setBrandLogoUrl(newUrl);
  };

  return (
    <>
      <PageBackdrop />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/admin/lodges"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit {l.name}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-lg bg-white/95 p-6 shadow-lg backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-brand-dark">Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-brand-khaki">Name</label>
                <input
                  type="text"
                  value={val.name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-khaki">Tagline</label>
                <input
                  type="text"
                  value={val.tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-khaki">Description (Markdown)</label>
                <div className="mt-1" data-color-mode="light">
                  <MDEditor
                    value={val.description}
                    onChange={(v) => setDescription(v ?? "")}
                    height={300}
                    preview="edit"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-khaki">Highlights (one per line)</label>
                <textarea
                  value={val.highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-brand-khaki">Capacity</label>
                  <input
                    type="text"
                    value={val.capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-khaki">Location</label>
                  <input
                    type="text"
                    value={val.detailedLocation}
                    onChange={(e) => setDetailedLocation(e.target.value)}
                    className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-white/95 p-6 shadow-lg backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-brand-dark">Hero Images</h2>
            <div className="space-y-3">
              {val.heroImages.map((url, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-brand-khaki/20 p-2">
                  <Image
                    src={url}
                    alt={`Hero ${i + 1}`}
                    width={80}
                    height={50}
                    unoptimized
                    className="h-12 w-20 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-brand-dark/60">{url}</p>
                    <div className="mt-1 flex gap-1">
                      <ImagePreview url={url} />
                      <InternaliseButton url={url} onInternalised={(newUrl) => replaceHeroImage(i, newUrl)} />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => moveHeroImage(i, -1)}
                      disabled={i === 0}
                      className="rounded p-1 text-brand-khaki hover:bg-brand-cream disabled:opacity-30"
                      title="Move up"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveHeroImage(i, 1)}
                      disabled={i === val.heroImages.length - 1}
                      className="rounded p-1 text-brand-khaki hover:bg-brand-cream disabled:opacity-30"
                      title="Move down"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHeroImage(i)}
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                      title="Remove"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHeroImage(); } }}
                  className="flex-1 rounded-md border border-brand-khaki/30 px-3 py-2 text-sm text-brand-dark focus:border-brand-gold focus:outline-none"
                  placeholder="Paste image URL and press Add..."
                />
                <button
                  type="button"
                  onClick={addHeroImage}
                  className="rounded-md bg-brand-brown px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-brown/90"
                >
                  Add
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-white/95 p-6 shadow-lg backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-brand-dark">Branding</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-brand-khaki">Brand name</label>
                  <input
                    type="text"
                    value={val.brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-khaki">Accent colour</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={val.brandAccentColour || "#D4A017"}
                      onChange={(e) => setBrandAccentColour(e.target.value)}
                      className="h-[38px] w-12 cursor-pointer rounded-md border border-brand-khaki/30"
                    />
                    <input
                      type="text"
                      value={val.brandAccentColour}
                      onChange={(e) => setBrandAccentColour(e.target.value)}
                      className="flex-1 rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                      placeholder="#hex"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-khaki">Logo URL</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={val.brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    className="flex-1 rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                  />
                  <ImagePreview url={val.brandLogoUrl} />
                  <InternaliseButton url={val.brandLogoUrl} onInternalised={replaceLogoUrl} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="logo-light"
                  checked={val.brandLogoLight}
                  onChange={(e) => setBrandLogoLight(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-khaki/30 accent-brand-gold"
                />
                <label htmlFor="logo-light" className="text-xs text-brand-dark">Logo is light (for dark backgrounds)</label>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-khaki">Website URL</label>
                <input
                  type="text"
                  value={val.brandWebsiteUrl}
                  onChange={(e) => setBrandWebsiteUrl(e.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between rounded-lg bg-white/95 p-4 shadow-lg backdrop-blur-sm">
            <Link
              href="/admin/lodges"
              className="rounded-md px-4 py-2.5 text-sm font-medium text-brand-dark/60 hover:text-brand-dark"
            >
              Cancel
            </Link>
            <div className="flex items-center gap-3">
              {update.error && (
                <p className="text-sm text-red-600">{update.error.message}</p>
              )}
              <button
                type="submit"
                disabled={update.isPending}
                className="rounded-md bg-brand-brown px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-brown/90 disabled:opacity-50"
              >
                {update.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
