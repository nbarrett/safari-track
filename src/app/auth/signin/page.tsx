"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
        router.push("/");
        router.refresh();
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
          alt="Klaserie wildlife"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-brand-dark/70" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo-white.png"
            alt="Klaserie Camps"
            width={200}
            height={100}
            className="mb-4"
            priority
          />
          <p className="text-sm text-brand-cream/80">Wildlife Tracking</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white/95 p-6 shadow-xl backdrop-blur-sm">
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
