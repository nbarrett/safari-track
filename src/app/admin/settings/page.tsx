"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";

export default function AdminSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);

  const strava = api.settings.getStrava.useQuery(undefined, {
    enabled: session?.user?.role === "ADMIN",
  });

  useEffect(() => {
    if (strava.data) {
      setClientId(strava.data.clientId);
      setClientSecret(strava.data.clientSecret);
    }
  }, [strava.data]);

  const save = api.settings.setStrava.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-khaki">
        Loading...
      </div>
    );
  }

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <main className="relative min-h-screen">
        <PageBackdrop />
        <div className="relative z-10 mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-red-600/90 px-4 py-3 text-sm text-white backdrop-blur-sm">
            Access denied
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <PageBackdrop />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-xl font-bold text-white drop-shadow-md">Settings</h1>

        {saved && (
          <div className="mb-4 rounded-lg bg-brand-green/90 px-4 py-3 text-sm text-white backdrop-blur-sm">
            Strava credentials saved successfully.
          </div>
        )}

        {save.error && (
          <div className="mb-4 rounded-lg bg-red-600/90 px-4 py-3 text-sm text-white backdrop-blur-sm">
            {save.error.message}
          </div>
        )}

        <div className="rounded-lg bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-dark">Strava API Credentials</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ clientId, clientSecret });
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="clientId" className="mb-1 block text-sm font-medium text-brand-dark">
                Client ID
              </label>
              <input
                id="clientId"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-brand-dark focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>

            <div>
              <label htmlFor="clientSecret" className="mb-1 block text-sm font-medium text-brand-dark">
                Client Secret
              </label>
              <div className="relative">
                <input
                  id="clientSecret"
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full rounded-md border border-brand-khaki/30 px-3 py-2 pr-16 text-brand-dark focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-brand-khaki transition hover:text-brand-dark"
                >
                  {showSecret ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={save.isPending || !clientId || !clientSecret}
              className="rounded-md bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {save.isPending ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
