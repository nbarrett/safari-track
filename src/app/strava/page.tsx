"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";
import { formatDateTime } from "~/lib/format";

function formatDistance(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatSpeed(metresPerSecond: number): string {
  return `${(metresPerSecond * 3.6).toFixed(1)} km/h`;
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You denied access to your Strava account.",
  token_exchange_failed: "Failed to connect to Strava. Please try again.",
  missing_code: "The Strava authorisation response was incomplete. Please try again.",
};

function StravaContent() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const connected = searchParams.get("connected");
  const error = searchParams.get("error");
  const [importingId, setImportingId] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const stravaConfigured = api.settings.stravaConfigured.useQuery(undefined, {
    enabled: !!session,
  });

  const connectionStatus = api.strava.connectionStatus.useQuery(undefined, {
    enabled: !!session && stravaConfigured.data?.configured === true,
  });

  const activities = api.strava.activities.useQuery(
    { page: 1, perPage: 30 },
    { enabled: connectionStatus.data?.connected === true },
  );

  const utils = api.useUtils();
  const disconnect = api.strava.disconnect.useMutation({
    onSuccess: () => {
      void utils.strava.connectionStatus.invalidate();
      void utils.strava.activities.invalidate();
    },
  });

  const importActivity = api.strava.importActivity.useMutation({
    onMutate: ({ activityId }) => {
      setImportingId(activityId);
      setImportError(null);
    },
    onSuccess: (data) => {
      router.push(`/drives/${data.driveId}`);
    },
    onError: (err) => {
      setImportError(err.message);
      setImportingId(null);
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

  return (
    <main className="relative min-h-screen">
      <PageBackdrop />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pr-12 pb-8 pt-6 sm:px-6 lg:px-8 lg:pr-8">
        <h1 className="mb-4 text-xl font-bold text-white drop-shadow-md">Strava</h1>

        {connected === "true" && stravaConfigured.data?.configured !== false && (
          <div className="mb-4 rounded-lg bg-brand-green/90 px-4 py-3 text-sm text-white backdrop-blur-sm">
            Strava account connected successfully.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-600/90 px-4 py-3 text-sm text-white backdrop-blur-sm">
            {ERROR_MESSAGES[error] ?? `An error occurred: ${error}`}
          </div>
        )}

        {stravaConfigured.data?.configured === false ? (
          <div className="rounded-lg bg-white/80 p-6 text-center shadow-sm backdrop-blur-sm">
            {session.user.role === "ADMIN" ? (
              <>
                <p className="mb-4 text-brand-dark">
                  Strava integration is not configured yet.
                </p>
                <a
                  href="/admin/settings"
                  className="inline-block rounded-md bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Configure Strava
                </a>
              </>
            ) : (
              <p className="text-brand-dark">
                Strava integration is not available yet. Ask your administrator to set it up.
              </p>
            )}
          </div>
        ) : connectionStatus.isLoading ? (
          <p className="text-sm text-white/60">Checking Strava connection...</p>
        ) : connectionStatus.data?.connected ? (
          <>
            <div className="mb-4 flex items-center justify-between rounded-lg bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {connectionStatus.data.athlete?.profileImageUrl && (
                  <img
                    src={connectionStatus.data.athlete.profileImageUrl}
                    alt="Strava profile"
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div>
                  <div className="font-medium text-brand-dark">
                    {connectionStatus.data.athlete?.firstName}{" "}
                    {connectionStatus.data.athlete?.lastName}
                  </div>
                  <div className="text-xs text-brand-khaki">Connected to Strava</div>
                </div>
              </div>
              <button
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                {disconnect.isPending ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>

            <h2 className="mb-3 text-lg font-semibold text-white drop-shadow-md">
              Recent Activities
            </h2>

            {importError && (
              <div className="mb-3 rounded-lg bg-red-600/90 px-4 py-3 text-sm text-white backdrop-blur-sm">
                {importError}
              </div>
            )}

            {activities.isLoading ? (
              <p className="text-sm text-white/60">Loading activities...</p>
            ) : activities.error ? (
              <div className="rounded-lg bg-white/80 p-4 text-sm text-red-600 backdrop-blur-sm">
                {activities.error.message}
              </div>
            ) : activities.data && activities.data.length > 0 ? (
              <div className="space-y-2">
                {activities.data.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-lg bg-white/80 p-4 shadow-sm backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-brand-dark">{activity.name}</div>
                        <div className="text-xs text-brand-khaki">{activity.sportType}</div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="text-right text-sm text-brand-dark/80">
                          {formatDateTime(activity.startDateLocal)}
                        </div>
                        <button
                          onClick={() => importActivity.mutate({ activityId: activity.id })}
                          disabled={importingId !== null}
                          className="rounded-md bg-brand-green px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                        >
                          {importingId === activity.id ? "Importing..." : "Import"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-brand-khaki">
                      <span>{formatDistance(activity.distance)}</span>
                      <span>{formatDuration(activity.movingTime)}</span>
                      <span>{formatSpeed(activity.averageSpeed)}</span>
                      {activity.totalElevationGain > 0 && (
                        <span>{activity.totalElevationGain.toFixed(0)}m elev</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">No activities found.</p>
            )}
          </>
        ) : (
          <div className="rounded-lg bg-white/80 p-6 text-center shadow-sm backdrop-blur-sm">
            <p className="mb-4 text-brand-dark">
              Connect your Strava account to browse and import activities.
            </p>
            <a
              href="/api/strava/connect"
              className="inline-block rounded-md px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ backgroundColor: "#FC4C02" }}
            >
              Connect with Strava
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

export default function StravaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-brand-khaki">
          Loading...
        </div>
      }
    >
      <StravaContent />
    </Suspense>
  );
}
