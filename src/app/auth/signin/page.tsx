"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cacheCredentials, cacheSession, getOfflineSession } from "~/lib/session-cache";

export default function SignInPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!navigator.onLine) {
      const offlineSession = await getOfflineSession(name, password);
      if (offlineSession) {
        cacheSession(offlineSession);
        router.push("/");
        return;
      }
      setError("No internet connection. Please connect to sign in for the first time.");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        name,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid name or password");
        setLoading(false);
      } else {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        await cacheCredentials(name, password, session);
        router.push("/");
      }
    } catch {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/hero-rhinos.webp"
          alt="Safari wildlife"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-brand-dark/70" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white/95 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-2 flex flex-col items-center">
            <Image
              src="/logo-icon.png"
              alt="Safari Track"
              width={320}
              height={320}
              className="mb-4 w-40 rounded-3xl"
              priority
            />
            <h1 className="text-2xl font-semibold tracking-wide text-brand-dark">Safari Track</h1>
            <p className="text-sm text-brand-khaki">Wildlife Tracking</p>
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-brand-dark">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-brand-khaki/30 bg-white px-3 py-2 text-base text-brand-dark focus:border-brand-gold focus:outline-none"
              placeholder="Your first name"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-dark">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-brand-khaki/30 bg-white px-3 py-2 text-base text-brand-dark focus:border-brand-gold focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-brand-brown px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-brown/90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-sm text-brand-dark/60">
            New here?{" "}
            <Link href="/auth/register" className="font-medium text-brand-brown hover:text-brand-brown/80">
              Register
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
