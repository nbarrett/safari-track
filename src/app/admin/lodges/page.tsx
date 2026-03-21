"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

function EditModal({
  lodge,
  onClose,
}: {
  lodge: {
    id: string;
    name: string;
    tagline: string | null;
    description: string | null;
    highlights: string[];
    capacity: string | null;
    detailedLocation: string | null;
    brandName: string | null;
    brandLogoUrl: string | null;
    brandLogoLight: boolean;
    brandAccentColour: string | null;
    brandWebsiteUrl: string | null;
  };
  onClose: () => void;
}) {
  const [tagline, setTagline] = useState(lodge.tagline ?? "");
  const [description, setDescription] = useState(lodge.description ?? "");
  const [highlights, setHighlights] = useState(lodge.highlights.join("\n"));
  const [capacity, setCapacity] = useState(lodge.capacity ?? "");
  const [detailedLocation, setDetailedLocation] = useState(lodge.detailedLocation ?? "");
  const [brandName, setBrandName] = useState(lodge.brandName ?? "");
  const [brandLogoUrl, setBrandLogoUrl] = useState(lodge.brandLogoUrl ?? "");
  const [brandLogoLight, setBrandLogoLight] = useState(lodge.brandLogoLight);
  const [brandAccentColour, setBrandAccentColour] = useState(lodge.brandAccentColour ?? "");
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState(lodge.brandWebsiteUrl ?? "");

  const utils = api.useUtils();
  const update = api.lodge.update.useMutation({
    onSuccess: () => {
      void utils.lodge.showcase.invalidate();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      id: lodge.id,
      tagline: tagline || null,
      description: description || null,
      highlights: highlights.split("\n").map((h) => h.trim()).filter(Boolean),
      capacity: capacity || null,
      detailedLocation: detailedLocation || null,
      brandName: brandName || null,
      brandLogoUrl: brandLogoUrl || null,
      brandLogoLight,
      brandAccentColour: brandAccentColour || null,
      brandWebsiteUrl: brandWebsiteUrl || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12 pb-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl space-y-4 rounded-lg bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-brand-dark">Edit {lodge.name}</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-brand-khaki">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-brand-khaki">Description (Markdown)</label>
            <div className="mt-1" data-color-mode="light">
              <MDEditor
                value={description}
                onChange={(val) => setDescription(val ?? "")}
                height={300}
                preview="edit"
              />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-brand-khaki">Highlights (one per line)</label>
            <textarea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-khaki">Capacity</label>
            <input
              type="text"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-khaki">Location</label>
            <input
              type="text"
              value={detailedLocation}
              onChange={(e) => setDetailedLocation(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </div>
        </div>

        <div className="border-t border-brand-khaki/20 pt-4">
          <h4 className="text-sm font-semibold text-brand-dark">Branding</h4>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-khaki">Brand name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-khaki">Accent colour</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={brandAccentColour || "#D4A017"}
                  onChange={(e) => setBrandAccentColour(e.target.value)}
                  className="h-[38px] w-12 cursor-pointer rounded-md border border-brand-khaki/30"
                />
                <input
                  type="text"
                  value={brandAccentColour}
                  onChange={(e) => setBrandAccentColour(e.target.value)}
                  className="flex-1 rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                  placeholder="#hex"
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-brand-khaki">Logo URL</label>
              <input
                type="text"
                value={brandLogoUrl}
                onChange={(e) => setBrandLogoUrl(e.target.value)}
                className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="logo-light"
                checked={brandLogoLight}
                onChange={(e) => setBrandLogoLight(e.target.checked)}
                className="h-4 w-4 rounded border-brand-khaki/30 accent-brand-gold"
              />
              <label htmlFor="logo-light" className="text-xs text-brand-dark">Logo is light (for dark backgrounds)</label>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-khaki">Website URL</label>
              <input
                type="text"
                value={brandWebsiteUrl}
                onChange={(e) => setBrandWebsiteUrl(e.target.value)}
                className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2.5 text-sm font-medium text-brand-dark/60 hover:text-brand-dark"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={update.isPending}
            className="rounded-md bg-brand-brown px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-brown/90 disabled:opacity-50"
          >
            {update.isPending ? "Saving..." : "Save"}
          </button>
        </div>

        {update.error && (
          <p className="text-sm text-red-600">{update.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function AdminLodgesPage() {
  const { data: session, status } = useSession();
  const lodges = api.lodge.showcase.useQuery();
  const [editingLodge, setEditingLodge] = useState<Parameters<typeof EditModal>[0]["lodge"] | null>(null);

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <>
      <PageBackdrop />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Lodge Content</h1>

        {lodges.isLoading && (
          <p className="text-sm text-white/60">Loading lodges...</p>
        )}

        <div className="space-y-4">
          {lodges.data?.map((lodge) => (
            <div
              key={lodge.id}
              className="rounded-lg bg-white/95 p-4 shadow-lg backdrop-blur-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-brand-dark">{lodge.name}</h2>
                  {lodge.brandName && (
                    <div className="text-sm text-brand-khaki">{lodge.brandName}</div>
                  )}
                  {lodge.tagline && (
                    <div className="mt-1 text-sm text-brand-dark/60">{lodge.tagline}</div>
                  )}
                </div>
                <button
                  onClick={() => setEditingLodge(lodge)}
                  className="rounded-md bg-brand-brown px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-brown/90"
                >
                  Edit
                </button>
              </div>
              {lodge.description && (
                <p className="mt-2 line-clamp-2 text-sm text-brand-dark/50">{lodge.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {lodge.highlights.slice(0, 3).map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-brand-cream px-2.5 py-0.5 text-xs text-brand-khaki"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {editingLodge && (
          <EditModal lodge={editingLodge} onClose={() => setEditingLodge(null)} />
        )}
      </div>
    </>
  );
}
