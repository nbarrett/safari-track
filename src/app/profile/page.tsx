"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const utils = api.useUtils();

  const profile = api.user.me.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("km");
  const [profileInitialised, setProfileInitialised] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (profile.data && !profileInitialised) {
    setName(profile.data.name);
    setEmail(profile.data.email);
    setDistanceUnit(profile.data.distanceUnit as "km" | "mi");
    setProfileInitialised(true);
  }

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      setProfileMessage({ type: "success", text: "Profile updated" });
      void utils.user.me.invalidate();
    },
    onError: (err) => {
      setProfileMessage({ type: "error", text: err.message });
    },
  });

  const changePassword = api.user.changePassword.useMutation({
    onSuccess: () => {
      setPasswordMessage({ type: "success", text: "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      setPasswordMessage({ type: "error", text: err.message });
    },
  });

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-brand-khaki">Loading...</div>;
  }

  if (!session) {
    redirect("/auth/signin");
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    updateProfile.mutate({ name, email, distanceUnit });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <main className="relative min-h-screen">
      <PageBackdrop />

      <div className="relative z-10 mx-auto max-w-lg px-4 pr-14 py-6 sm:px-6 lg:pr-6">
        <Link href="/" className="text-sm text-brand-gold hover:text-brand-gold/80">
          &larr; Back to home
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-white drop-shadow-md">Profile</h1>

        {profile.data && (
          <div className="mt-1 text-sm text-white/60">
            {profile.data.lodge.name} &middot; {profile.data.role}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="mt-6 rounded-2xl bg-white/90 p-5 shadow-lg backdrop-blur-md">
          <h2 className="text-lg font-semibold text-brand-dark">Details</h2>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-brand-dark">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-khaki/30 bg-white px-3 py-2 text-sm text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-sm font-medium text-brand-dark">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-khaki/30 bg-white px-3 py-2 text-sm text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </label>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-brand-dark">Distance unit</legend>
            <div className="mt-1 flex rounded-lg border border-brand-khaki/30 bg-white">
              <button
                type="button"
                onClick={() => setDistanceUnit("km")}
                className={`flex-1 rounded-l-lg px-4 py-2 text-sm font-medium transition ${
                  distanceUnit === "km"
                    ? "bg-brand-brown text-white"
                    : "text-brand-khaki hover:text-brand-dark"
                }`}
              >
                Kilometres
              </button>
              <button
                type="button"
                onClick={() => setDistanceUnit("mi")}
                className={`flex-1 rounded-r-lg px-4 py-2 text-sm font-medium transition ${
                  distanceUnit === "mi"
                    ? "bg-brand-brown text-white"
                    : "text-brand-khaki hover:text-brand-dark"
                }`}
              >
                Miles
              </button>
            </div>
          </fieldset>

          {profileMessage && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              profileMessage.type === "success"
                ? "bg-brand-green/10 text-brand-green"
                : "bg-red-50 text-red-600"
            }`}>
              {profileMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="mt-4 w-full rounded-xl bg-brand-brown py-3 text-sm font-bold text-white transition hover:bg-brand-brown/90 active:scale-[0.98] disabled:opacity-50"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="mt-4 rounded-2xl bg-white/90 p-5 shadow-lg backdrop-blur-md">
          <h2 className="text-lg font-semibold text-brand-dark">Change Password</h2>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-brand-dark">Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-khaki/30 bg-white px-3 py-2 text-sm text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-sm font-medium text-brand-dark">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-khaki/30 bg-white px-3 py-2 text-sm text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-sm font-medium text-brand-dark">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-khaki/30 bg-white px-3 py-2 text-sm text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </label>

          {passwordMessage && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              passwordMessage.type === "success"
                ? "bg-brand-green/10 text-brand-green"
                : "bg-red-50 text-red-600"
            }`}>
              {passwordMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
            className="mt-4 w-full rounded-xl bg-brand-brown py-3 text-sm font-bold text-white transition hover:bg-brand-brown/90 active:scale-[0.98] disabled:opacity-50"
          >
            {changePassword.isPending ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </main>
  );
}
