"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";
import { OfflineImage } from "~/app/_components/offline-image";
import { precacheSpeciesImages } from "~/lib/precache-images";
import { useOfflineMutation } from "~/lib/use-offline-mutation";

const CATEGORY_CARDS = [
  { key: "All", label: "All Species", image: "/hero-elephants.jpg" },
  { key: "Mammal", label: "Mammal", image: "/images/mammals.jpg" },
  { key: "Bird", label: "Bird", image: "/images/birds.jpg" },
  { key: "Reptile", label: "Reptile", image: "/hero-rhinos.webp" },
];

export default function ChecklistPage() {
  const { data: session, status } = useSession();
  const [activeCategory, setActiveCategory] = useState("All");
  const [showSpottedOnly, setShowSpottedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedImage, setExpandedImage] = useState<{ url: string; name: string } | null>(null);
  const [thumbSize, setThumbSize] = useState<"sm" | "lg" | "max" | "xl">(() => {
    if (typeof window === "undefined") return "lg";
    const saved = localStorage.getItem("checklist-thumb-size");
    if (saved === "sm" || saved === "lg" || saved === "max" || saved === "xl") return saved;
    return "lg";
  });

  useEffect(() => {
    if (!expandedImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedImage(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expandedImage]);

  useEffect(() => {
    localStorage.setItem("checklist-thumb-size", thumbSize);
  }, [thumbSize]);

  const isGuest = status !== "loading" && !session;

  const utils = api.useUtils();

  const checklist = api.checklist.myChecklist.useQuery(
    {
      category: activeCategory === "All" ? undefined : activeCategory,
      spottedOnly: showSpottedOnly,
    },
    { enabled: !!session },
  );

  const speciesList = api.species.byCategory.useQuery(
    { category: activeCategory },
    { enabled: isGuest && activeCategory !== "All" },
  );
  const allSpecies = api.species.list.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });

  useEffect(() => {
    const urls = (allSpecies.data ?? [])
      .map((s) => s.imageUrl)
      .filter((url): url is string => !!url);
    if (urls.length > 0) {
      void precacheSpeciesImages(urls);
    }
  }, [allSpecies.data]);

  const stats = api.checklist.stats.useQuery(undefined, {
    enabled: !!session,
  });

  const toggleSpottedMutation = api.checklist.toggleSpotted.useMutation();
  const toggleSpotted = useOfflineMutation({
    path: "checklist.toggleSpotted",
    mutationFn: (input: { speciesId: string }) =>
      toggleSpottedMutation.mutateAsync(input),
    onSuccess: () => {
      void utils.checklist.myChecklist.invalidate();
      void utils.checklist.stats.invalidate();
    },
  });

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-khaki">
        Loading...
      </div>
    );
  }

  const rawItems = session
    ? (checklist.data ?? [])
    : (activeCategory === "All" ? allSpecies.data : speciesList.data)?.map(
        (s) => ({
          speciesId: s.id,
          commonName: s.commonName,
          scientificName: s.scientificName,
          category: s.category,
          family: s.family,
          imageUrl: s.imageUrl,
          spotted: false,
          sightingCount: 0,
        }),
      ) ?? [];

  const filteredItems = rawItems.filter((item) =>
    searchQuery.length > 0
      ? item.commonName.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      const key = item.family ?? item.category;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, typeof filteredItems>,
  );

  const sortedGroups = Object.entries(groupedItems).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const isLoading = session
    ? checklist.isLoading
    : activeCategory === "All"
      ? allSpecies.isLoading
      : speciesList.isLoading;

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageBackdrop />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white/90 shadow-lg backdrop-blur-md">
          {/* Sticky header section */}
          <div className="shrink-0 border-b border-brand-cream/60 p-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-brand-dark">
                Wildlife Checklist
              </h1>
              {isGuest && (
                <Link
                  href="/auth/signin"
                  className="rounded-lg bg-brand-brown px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-brown/90"
                >
                  Sign In
                </Link>
              )}
            </div>

            {isGuest && (
              <p className="mt-2 text-xs text-brand-khaki">
                Browsing as guest. Sign in to track your personal sightings.
              </p>
            )}

            {session && stats.data && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  onClick={() => setShowSpottedOnly(true)}
                  className={`rounded-lg p-3 text-center transition ${
                    showSpottedOnly
                      ? "bg-brand-green/20 ring-2 ring-brand-green"
                      : "bg-brand-green/10 hover:bg-brand-green/20"
                  }`}
                >
                  <div className="text-2xl font-bold text-brand-green">
                    {stats.data.spotted}
                  </div>
                  <div className="text-xs text-brand-green/80">Spotted</div>
                </button>
                <button
                  onClick={() => setShowSpottedOnly(false)}
                  className={`rounded-lg p-3 text-center shadow-sm transition ${
                    !showSpottedOnly
                      ? "bg-white/90 ring-2 ring-brand-brown"
                      : "bg-white/80 hover:bg-white/90"
                  }`}
                >
                  <div className="text-2xl font-bold text-brand-dark">
                    {stats.data.total}
                  </div>
                  <div className="text-xs text-brand-khaki">Total Species</div>
                </button>
                <button
                  onClick={() => setShowSpottedOnly(!showSpottedOnly)}
                  className="rounded-lg bg-brand-gold/10 p-3 text-center transition hover:bg-brand-gold/20"
                >
                  <div className="text-2xl font-bold text-brand-gold">
                    {stats.data.total > 0
                      ? Math.round(
                          (stats.data.spotted / stats.data.total) * 100,
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-brand-gold/80">Complete</div>
                </button>
              </div>
            )}

            <div className="mt-3 grid grid-cols-4 gap-2">
              {CATEGORY_CARDS.map((card) => {
                const catStats = stats.data?.categories.find((c) => c.category === card.key);
                const isAll = card.key === "All";
                const spotted = isAll ? (stats.data?.spotted ?? 0) : (catStats?.spotted ?? 0);
                const total = isAll ? (stats.data?.total ?? 0) : (catStats?.total ?? 0);
                return (
                  <button
                    key={card.key}
                    onClick={() => {
                      setActiveCategory(card.key);
                      setShowSpottedOnly(false);
                    }}
                    className={`relative overflow-hidden rounded-lg transition ${
                      activeCategory === card.key
                        ? "ring-2 ring-brand-gold shadow-lg"
                        : "hover:ring-1 hover:ring-brand-khaki/40"
                    }`}
                  >
                    <Image
                      src={card.image}
                      alt={card.label}
                      width={300}
                      height={120}
                      className="h-24 w-full object-cover"
                    />
                    <div className={`absolute inset-0 ${activeCategory === card.key ? "bg-black/40" : "bg-black/55"}`} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-semibold text-white drop-shadow">
                        {card.label}
                      </span>
                      {session && stats.data && (
                        <>
                          <span className="text-xs text-white/80">
                            {spotted}/{total}
                          </span>
                          <div className="mt-1 h-1 w-12 rounded-full bg-white/30">
                            <div
                              className="h-1 rounded-full bg-brand-gold"
                              style={{
                                width: `${total > 0 ? (spotted / total) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-brand-khaki/30 bg-white px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
              />
              {session && (
                <button
                  onClick={() => setShowSpottedOnly(!showSpottedOnly)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition ${
                    showSpottedOnly
                      ? "bg-brand-green text-white shadow-md"
                      : "bg-brand-cream/50 text-brand-khaki shadow-sm hover:bg-brand-cream"
                  }`}
                >
                  {showSpottedOnly ? "Spotted Only" : "Show All"}
                </button>
              )}
              <div className="flex shrink-0 rounded-lg border border-brand-khaki/30 bg-white">
                {(["sm", "lg", "max", "xl"] as const).map((size, i, arr) => (
                  <button
                    key={size}
                    onClick={() => setThumbSize(size)}
                    className={`px-2.5 py-1.5 text-xs font-medium transition ${
                      thumbSize === size
                        ? "bg-brand-brown text-white"
                        : "text-brand-khaki hover:text-brand-dark"
                    } ${i === 0 ? "rounded-l-lg" : i === arr.length - 1 ? "rounded-r-lg" : ""}`}
                  >
                    {size === "sm" ? "S" : size === "lg" ? "M" : size === "max" ? "L" : "XL"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable species list */}
          <div className="flex-1 overflow-y-auto p-4 sm:px-6">
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-brand-khaki">Loading checklist...</p>
              ) : thumbSize === "xl" && filteredItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.speciesId}
                      className="overflow-hidden rounded-xl bg-white shadow-sm"
                    >
                      <div className="flex min-h-14 items-center gap-2 px-3 py-2">
                        {session ? (
                          <button
                            onClick={() =>
                              toggleSpotted.mutate({
                                speciesId: item.speciesId,
                              })
                            }
                            disabled={toggleSpotted.isPending}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${item.spotted ? "border-brand-green bg-brand-green text-white" : "border-brand-khaki/40"}`}
                            >
                              {item.spotted && (
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`truncate text-sm font-medium ${item.spotted ? "text-brand-green" : "text-brand-dark"}`}
                              >
                                {item.commonName}
                              </div>
                              {item.sightingCount > 0 && (
                                <div className="text-xs text-brand-khaki">
                                  Seen {item.sightingCount}x
                                </div>
                              )}
                            </div>
                          </button>
                        ) : (
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="h-5 w-5 shrink-0 rounded border border-brand-khaki/20" />
                            <div className="truncate text-sm font-medium text-brand-dark">
                              {item.commonName}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <OfflineImage
                          src={item.imageUrl}
                          alt={item.commonName}
                          className="aspect-square w-full object-cover transition hover:scale-105"
                          placeholderClassName="aspect-square w-full"
                          onClick={item.imageUrl ? () => setExpandedImage({ url: item.imageUrl!, name: item.commonName }) : undefined}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedGroups.length > 0 ? (
                sortedGroups.map(([group, items]) => (
                  <div key={group}>
                    <h3 className="mb-1 text-xs font-semibold tracking-wider text-brand-brown">
                      {group}
                    </h3>
                    <div className="rounded-lg bg-white shadow-sm">
                      {items.map((item, idx) =>
                        session ? (
                          <div
                            key={item.speciesId}
                            className={`flex w-full items-center justify-between px-3 py-2 ${idx > 0 ? "border-t border-brand-cream/60" : ""}`}
                          >
                            <button
                              onClick={() =>
                                toggleSpotted.mutate({
                                  speciesId: item.speciesId,
                                })
                              }
                              disabled={toggleSpotted.isPending}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${item.spotted ? "border-brand-green bg-brand-green text-white" : "border-brand-khaki/40"}`}
                              >
                                {item.spotted && (
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div
                                  className={`truncate text-sm font-medium ${item.spotted ? "text-brand-green" : "text-brand-dark"}`}
                                >
                                  {item.commonName}
                                </div>
                                {item.sightingCount > 0 && (
                                  <div className="text-xs text-brand-khaki">
                                    Seen {item.sightingCount}x
                                  </div>
                                )}
                              </div>
                            </button>
                            {item.imageUrl ? (
                              <div className="relative shrink-0 ml-2">
                                <OfflineImage
                                  src={item.imageUrl}
                                  alt={item.commonName}
                                  className={`${thumbSize === "sm" ? "h-12 w-12" : thumbSize === "lg" ? "h-20 w-20" : "h-32 w-32"} rounded-xl object-cover shadow-sm transition hover:scale-105 hover:shadow-md`}
                                  placeholderClassName={`${thumbSize === "sm" ? "h-12 w-12" : thumbSize === "lg" ? "h-20 w-20" : "h-32 w-32"} rounded-xl`}
                                  onClick={() => setExpandedImage({ url: item.imageUrl!, name: item.commonName })}
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div
                            key={item.speciesId}
                            className={`flex items-center justify-between px-3 py-2 ${idx > 0 ? "border-t border-brand-cream/60" : ""}`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-5 w-5 shrink-0 rounded border border-brand-khaki/20" />
                              <div className="truncate text-sm font-medium text-brand-dark">
                                {item.commonName}
                              </div>
                            </div>
                            {item.imageUrl ? (
                              <div className="relative shrink-0 ml-2">
                                <OfflineImage
                                  src={item.imageUrl}
                                  alt={item.commonName}
                                  className={`${thumbSize === "sm" ? "h-12 w-12" : thumbSize === "lg" ? "h-20 w-20" : "h-32 w-32"} rounded-xl object-cover shadow-sm transition hover:scale-105 hover:shadow-md`}
                                  placeholderClassName={`${thumbSize === "sm" ? "h-12 w-12" : thumbSize === "lg" ? "h-20 w-20" : "h-32 w-32"} rounded-xl`}
                                  onClick={() => setExpandedImage({ url: item.imageUrl!, name: item.commonName })}
                                />
                              </div>
                            ) : null}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-brand-khaki">No species found.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-h-[80vh] max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative">
              <OfflineImage
                src={expandedImage.url.replace(/\/\d+px-/, "/800px-")}
                alt={expandedImage.name}
                className="max-h-[70vh] w-full object-contain"
                placeholderClassName="flex h-64 w-full"
              />
            </div>
            <div className="px-4 py-3 text-center">
              <span className="text-sm font-semibold text-brand-dark">{expandedImage.name}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
