"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";

function EditModal({
  species,
  categories,
  onClose,
}: {
  species: { id: string; commonName: string; scientificName: string | null; category: string };
  categories: string[];
  onClose: () => void;
}) {
  const [commonName, setCommonName] = useState(species.commonName);
  const [scientificName, setScientificName] = useState(species.scientificName ?? "");
  const [category, setCategory] = useState(species.category);
  const [newCategory, setNewCategory] = useState("");
  const [useNewCategory, setUseNewCategory] = useState(false);

  const utils = api.useUtils();
  const update = api.species.update.useMutation({
    onSuccess: () => {
      void utils.species.list.invalidate();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      id: species.id,
      commonName,
      scientificName: scientificName || undefined,
      category: useNewCategory ? newCategory : category,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-brand-dark">Edit Species</h3>

        <input
          type="text"
          required
          value={commonName}
          onChange={(e) => setCommonName(e.target.value)}
          className="w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
          placeholder="Common name"
        />

        <input
          type="text"
          value={scientificName}
          onChange={(e) => setScientificName(e.target.value)}
          className="w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
          placeholder="Scientific name (optional)"
        />

        <div className="space-y-2">
          {!useNewCategory ? (
            <select
              value={category}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setUseNewCategory(true);
                } else {
                  setCategory(e.target.value);
                }
              }}
              className="w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__new__">+ New category</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-gold focus:outline-none"
                placeholder="New category name"
              />
              <button
                type="button"
                onClick={() => setUseNewCategory(false)}
                className="rounded-md px-3 py-2 text-sm text-brand-dark/60 hover:text-brand-dark"
              >
                Cancel
              </button>
            </div>
          )}
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

export default function AdminSpeciesPage() {
  const { data: session, status } = useSession();
  const [search, setSearch] = useState("");
  const [commonName, setCommonName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [useNewCategory, setUseNewCategory] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState<{
    id: string;
    commonName: string;
    scientificName: string | null;
    category: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const speciesList = api.species.list.useQuery();
  const categories = api.species.categories.useQuery();
  const utils = api.useUtils();

  const createSpecies = api.species.create.useMutation({
    onSuccess: () => {
      void utils.species.list.invalidate();
      void utils.species.categories.invalidate();
      setCommonName("");
      setScientificName("");
      setCategory("");
      setNewCategory("");
      setUseNewCategory(false);
    },
  });

  const deleteSpecies = api.species.delete.useMutation({
    onSuccess: () => {
      void utils.species.list.invalidate();
      setDeleteConfirm(null);
    },
  });

  const grouped = useMemo(() => {
    if (!speciesList.data) return {};
    const filtered = search
      ? speciesList.data.filter(
          (s) =>
            s.commonName.toLowerCase().includes(search.toLowerCase()) ||
            s.scientificName?.toLowerCase().includes(search.toLowerCase()) ||
            s.category.toLowerCase().includes(search.toLowerCase()),
        )
      : speciesList.data;

    return filtered.reduce<Record<string, typeof filtered>>((acc, species) => {
      const cat = species.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat]!.push(species);
      return acc;
    }, {});
  }, [speciesList.data, search]);

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createSpecies.mutate({
      commonName,
      scientificName: scientificName || undefined,
      category: useNewCategory ? newCategory : category,
    });
  };

  return (
    <>
      <PageBackdrop />
      <div className="relative z-10 mx-auto max-w-4xl px-4 pr-14 py-8 lg:pr-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Species Management</h1>

        <form
          onSubmit={handleCreate}
          className="mb-8 space-y-3 rounded-lg bg-white/95 p-4 shadow-lg backdrop-blur-sm"
        >
          <h2 className="text-lg font-semibold text-brand-dark">Add Species</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              required
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
              className="rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
              placeholder="Common name *"
            />
            <input
              type="text"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              className="rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
              placeholder="Scientific name"
            />
            {!useNewCategory ? (
              <select
                required
                value={category}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setUseNewCategory(true);
                    setCategory("");
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
              >
                <option value="" disabled>Category *</option>
                {categories.data?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__new__">+ New category</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 rounded-md border border-brand-khaki/30 px-3 py-2.5 text-brand-dark focus:border-brand-gold focus:outline-none"
                  placeholder="New category name"
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseNewCategory(false);
                    setNewCategory("");
                  }}
                  className="rounded-md px-3 py-2.5 text-sm text-brand-dark/60 hover:text-brand-dark"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={createSpecies.isPending}
            className="rounded-md bg-brand-brown px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-brown/90 disabled:opacity-50"
          >
            {createSpecies.isPending ? "Adding..." : "Add Species"}
          </button>
          {createSpecies.error && (
            <p className="text-sm text-red-600">{createSpecies.error.message}</p>
          )}
        </form>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-brand-gold focus:outline-none"
            placeholder="Search species..."
          />
        </div>

        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, species]) => (
              <div key={cat}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-gold">
                  {cat} ({species.length})
                </h3>
                <div className="divide-y divide-brand-khaki/10 rounded-lg bg-white/95 shadow-lg backdrop-blur-sm">
                  {species.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <span className="font-medium text-brand-dark">{s.commonName}</span>
                        {s.scientificName && (
                          <span className="ml-2 text-sm italic text-brand-dark/50">
                            {s.scientificName}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSpecies(s)}
                          className="min-h-[44px] min-w-[44px] rounded-md px-3 py-2 text-sm font-medium text-brand-brown hover:bg-brand-brown/10"
                        >
                          Edit
                        </button>
                        {deleteConfirm === s.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteSpecies.mutate({ id: s.id })}
                              disabled={deleteSpecies.isPending}
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
                            onClick={() => setDeleteConfirm(s.id)}
                            className="min-h-[44px] min-w-[44px] rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {deleteSpecies.error && deleteConfirm && (
                  <p className="mt-2 text-sm text-red-400">{deleteSpecies.error.message}</p>
                )}
              </div>
            ))}
        </div>

        {editingSpecies && (
          <EditModal
            species={editingSpecies}
            categories={categories.data ?? []}
            onClose={() => setEditingSpecies(null)}
          />
        )}
      </div>
    </>
  );
}
