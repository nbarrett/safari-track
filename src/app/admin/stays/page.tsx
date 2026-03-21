"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0]!;
}

function EditModal({
  stay,
  onClose,
}: {
  stay: {
    id: string;
    startDate: Date;
    endDate: Date;
    label: string | null;
    driverName: string | null;
    trackerName: string | null;
  };
  onClose: () => void;
}) {
  const [startDate, setStartDate] = useState(toInputDate(stay.startDate));
  const [endDate, setEndDate] = useState(toInputDate(stay.endDate));
  const [label, setLabel] = useState(stay.label ?? "");
  const [driverName, setDriverName] = useState(stay.driverName ?? "");
  const [trackerName, setTrackerName] = useState(stay.trackerName ?? "");

  const utils = api.useUtils();
  const update = api.stay.update.useMutation({
    onSuccess: () => {
      void utils.stay.list.invalidate();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      id: stay.id,
      startDate,
      endDate,
      label: label || null,
      driverName: driverName || null,
      trackerName: trackerName || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-brand-dark">Edit Stay</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-brand-khaki">Start</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-khaki">End</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </div>
        </div>

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
          placeholder="Label (e.g. Smith family)"
        />

        <input
          type="text"
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
          className="w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
          placeholder="Driver name"
        />

        <input
          type="text"
          value={trackerName}
          onChange={(e) => setTrackerName(e.target.value)}
          className="w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
          placeholder="Tracker name"
        />

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

export default function AdminStaysPage() {
  const { data: session, status } = useSession();
  const [lodgeId, setLodgeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [label, setLabel] = useState("");
  const [driverName, setDriverName] = useState("");
  const [trackerName, setTrackerName] = useState("");
  const [editingStay, setEditingStay] = useState<{
    id: string;
    startDate: Date;
    endDate: Date;
    label: string | null;
    driverName: string | null;
    trackerName: string | null;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const lodges = api.lodge.list.useQuery();
  const stays = api.stay.list.useQuery(undefined, { enabled: status === "authenticated" });
  const utils = api.useUtils();

  const createStay = api.stay.create.useMutation({
    onSuccess: () => {
      void utils.stay.list.invalidate();
      setStartDate("");
      setEndDate("");
      setLabel("");
      setDriverName("");
      setTrackerName("");
    },
  });

  const deleteStay = api.stay.delete.useMutation({
    onSuccess: () => {
      void utils.stay.list.invalidate();
      setDeleteConfirm(null);
    },
  });

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createStay.mutate({
      lodgeId,
      startDate,
      endDate,
      label: label || undefined,
      driverName: driverName || undefined,
      trackerName: trackerName || undefined,
    });
  };

  const grouped = (stays.data ?? []).reduce<Record<string, typeof stays.data>>((acc, stay) => {
    const lodgeName = stay.lodge.name;
    if (!acc[lodgeName]) acc[lodgeName] = [];
    acc[lodgeName]!.push(stay);
    return acc;
  }, {});

  return (
    <>
      <PageBackdrop />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Stays Management</h1>

        <form
          onSubmit={handleCreate}
          className="mb-8 space-y-3 rounded-lg bg-white/95 p-4 shadow-lg backdrop-blur-sm"
        >
          <h2 className="text-lg font-semibold text-brand-dark">Add Stay</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              required
              value={lodgeId}
              onChange={(e) => setLodgeId(e.target.value)}
              className="rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
            >
              <option value="" disabled>Lodge *</option>
              {lodges.data?.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
              placeholder="Label (e.g. Smith family)"
            />
            <div>
              <label className="block text-xs font-medium text-brand-khaki">Start date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-khaki">End date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
              />
            </div>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
              placeholder="Driver name"
            />
            <input
              type="text"
              value={trackerName}
              onChange={(e) => setTrackerName(e.target.value)}
              className="rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
              placeholder="Tracker name"
            />
          </div>
          <button
            type="submit"
            disabled={createStay.isPending}
            className="rounded-md bg-brand-brown px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-brown/90 disabled:opacity-50"
          >
            {createStay.isPending ? "Adding..." : "Add Stay"}
          </button>
          {createStay.error && (
            <p className="text-sm text-red-600">{createStay.error.message}</p>
          )}
        </form>

        {stays.isLoading && (
          <p className="text-sm text-white/60">Loading stays...</p>
        )}

        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([lodgeName, lodgeStays]) => (
              <div key={lodgeName}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-gold">
                  {lodgeName} ({lodgeStays!.length})
                </h3>
                <div className="divide-y divide-brand-khaki/10 rounded-lg bg-white/95 shadow-lg backdrop-blur-sm">
                  {lodgeStays!.map((stay) => {
                    const now = new Date();
                    const isActive = new Date(stay.startDate) <= now && new Date(stay.endDate) >= now;

                    return (
                      <div
                        key={stay.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-brand-dark">
                              {formatDate(stay.startDate)} &ndash; {formatDate(stay.endDate)}
                            </span>
                            {isActive && (
                              <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] font-semibold text-brand-green">
                                Active
                              </span>
                            )}
                          </div>
                          {stay.label && (
                            <div className="text-sm text-brand-dark/70">{stay.label}</div>
                          )}
                          <div className="mt-0.5 flex gap-3 text-xs text-brand-khaki">
                            {stay.driverName && <span>Driver: {stay.driverName}</span>}
                            {stay.trackerName && <span>Tracker: {stay.trackerName}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => setEditingStay(stay)}
                            className="min-h-[44px] min-w-[44px] rounded-md px-3 py-2 text-sm font-medium text-brand-brown hover:bg-brand-brown/10"
                          >
                            Edit
                          </button>
                          {deleteConfirm === stay.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteStay.mutate({ id: stay.id })}
                                disabled={deleteStay.isPending}
                                className="min-h-[44px] rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="min-h-[44px] rounded-md px-3 py-2 text-sm text-brand-dark/60 hover:text-brand-dark"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(stay.id)}
                              className="min-h-[44px] min-w-[44px] rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        {editingStay && (
          <EditModal
            stay={editingStay}
            onClose={() => setEditingStay(null)}
          />
        )}
      </div>
    </>
  );
}
