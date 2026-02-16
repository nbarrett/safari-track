"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";
import { formatDateTime } from "~/lib/format";

export default function DrivesPage() {
  const { data: session, status } = useSession();
  const utils = api.useUtils();
  const drives = api.drive.list.useQuery({ limit: 50 });
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMany = api.drive.deleteMany.useMutation({
    onSuccess: () => {
      void utils.drive.list.invalidate();
      setSelected(new Set());
      setSelecting(false);
      setConfirmDelete(false);
    },
  });

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-brand-khaki">Loading...</div>;
  }

  if (!session) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const selectableDrives = isAdmin
    ? drives.data?.items ?? []
    : drives.data?.items.filter((d) => d.user.id === userId) ?? [];
  const canSelect = selectableDrives.length > 0;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === selectableDrives.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableDrives.map((d) => d.id)));
    }
  };

  const exitSelectMode = () => {
    setSelecting(false);
    setSelected(new Set());
    setConfirmDelete(false);
  };

  return (
    <main className="relative min-h-screen">
      <PageBackdrop />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pr-14 pb-8 pt-6 sm:px-6 lg:px-8 lg:pr-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white drop-shadow-md">Drive History</h1>
          <div className="flex items-center gap-2">
            {canSelect && !selecting && (
              <button
                onClick={() => setSelecting(true)}
                className="rounded-md bg-white/20 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                Select
              </button>
            )}
            {!selecting && (
              <Link
                href="/drives/import"
                className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Import GPX
              </Link>
            )}
          </div>
        </div>

        {selecting && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="text-sm font-medium text-brand-brown transition hover:text-brand-dark"
              >
                {selected.size === selectableDrives.length ? "Deselect all" : "Select all"}
              </button>
              <span className="text-sm text-brand-khaki">
                {selected.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && !confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                >
                  Delete
                </button>
              )}
              {confirmDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">Delete {selected.size} drive{selected.size !== 1 ? "s" : ""}?</span>
                  <button
                    onClick={() => deleteMany.mutate({ ids: [...selected] })}
                    disabled={deleteMany.isPending}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteMany.isPending ? "Deleting..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-brand-khaki transition hover:bg-brand-cream"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <button
                onClick={exitSelectMode}
                className="rounded-md bg-brand-cream/50 px-3 py-1.5 text-xs font-medium text-brand-khaki transition hover:bg-brand-cream"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {drives.data && drives.data.items.length > 0 ? (
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {drives.data.items.map((drive) => {
              const isOwned = isAdmin || drive.user.id === userId;
              const isSelected = selected.has(drive.id);

              if (selecting) {
                return (
                  <button
                    key={drive.id}
                    onClick={() => isOwned && toggleSelect(drive.id)}
                    disabled={!isOwned}
                    className={`block w-full rounded-lg p-4 text-left shadow-sm backdrop-blur-sm transition ${
                      isSelected
                        ? "bg-red-50/90 ring-2 ring-red-400"
                        : isOwned
                          ? "bg-white/80 hover:bg-white/90"
                          : "bg-white/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isOwned && (
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isSelected ? "border-red-500 bg-red-500 text-white" : "border-brand-khaki/40"
                        }`}>
                          {isSelected && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      )}
                      <div className="flex flex-1 items-center justify-between">
                        <div>
                          <div className="font-medium text-brand-dark">{drive.user.name}</div>
                          <div className="text-sm text-brand-khaki">
                            {drive._count.sightings} sighting{drive._count.sightings !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-brand-dark/80">
                            {formatDateTime(drive.startedAt)}
                          </div>
                          <div className="text-xs text-brand-khaki">
                            {drive.endedAt ? "Completed" : "In Progress"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <Link
                  key={drive.id}
                  href={`/drives/${drive.id}`}
                  className="block rounded-lg bg-white/80 p-4 shadow-sm backdrop-blur-sm transition hover:bg-white/90 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-brand-dark">{drive.user.name}</div>
                      <div className="text-sm text-brand-khaki">
                        {drive._count.sightings} sighting{drive._count.sightings !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-brand-dark/80">
                        {formatDateTime(drive.startedAt)}
                      </div>
                      <div className="text-xs text-brand-khaki">
                        {drive.endedAt ? "Completed" : "In Progress"}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : drives.isLoading ? (
          <p className="text-sm text-white/60">Loading drives...</p>
        ) : (
          <p className="text-sm text-white/60">No drives recorded yet.</p>
        )}
      </div>
    </main>
  );
}
