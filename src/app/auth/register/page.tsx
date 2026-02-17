"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cacheCredentials } from "~/lib/session-cache";
import { api } from "~/trpc/react";
import { AuthCard } from "~/app/auth/auth-card";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [lodgeId, setLodgeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debouncedName, setDebouncedName] = useState("");

  const lodges = api.lodge.list.useQuery();
  const register = api.user.register.useMutation();

  const nameCheck = api.user.checkName.useQuery(
    { name: debouncedName },
    { enabled: debouncedName.length >= 1 },
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(name.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [name]);

  const nameTaken = nameCheck.data?.existingUser && !nameCheck.data?.available;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register.mutateAsync({ name, password, lodgeId });

      const result = await signIn("credentials", {
        name,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Registration succeeded but sign-in failed. Please sign in manually.");
        setLoading(false);
      } else {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        await cacheCredentials(name, password, session);
        router.push("/");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label htmlFor="reg-name" className="block text-sm font-medium text-brand-dark">
            Name
          </label>
          <input
            id="reg-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-brand-khaki/30 bg-white px-3 py-2 text-base text-brand-dark focus:border-brand-gold focus:outline-none"
            placeholder="Your first name"
          />
          {nameTaken && (
            <div className="mt-3 rounded-md border border-brand-khaki/30 bg-brand-cream/60 px-3 py-4 text-sm text-brand-dark/80">
              <p>Someone with that name is already registered. Is that you?</p>
              <Link
                href={`/auth/signin?name=${encodeURIComponent(name.trim())}&password=${encodeURIComponent(password)}`}
                className="mt-3 inline-block rounded-md bg-brand-brown px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-brown/90"
              >
                Sign in instead
              </Link>
              <p className="mt-3 text-xs text-brand-khaki">
                If you&apos;re a different person, add your last name initial (e.g. &quot;{name.trim()} B&quot;) to continue.
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-brand-dark">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            required
            minLength={4}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-brand-khaki/30 bg-white px-3 py-2 text-base text-brand-dark focus:border-brand-gold focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="lodge" className="block text-sm font-medium text-brand-dark">
            Lodge
          </label>
          <select
            id="lodge"
            required
            value={lodgeId}
            onChange={(e) => setLodgeId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-brand-khaki/30 bg-white px-3 py-2 text-base text-brand-dark focus:border-brand-gold focus:outline-none"
          >
            <option value="" disabled>
              Select your lodge
            </option>
            {lodges.data?.map((lodge) => (
              <option key={lodge.id} value={lodge.id}>
                {lodge.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !lodgeId || !!nameTaken}
          className="w-full rounded-md bg-brand-brown px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-brown/90 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="text-center text-sm text-brand-dark/60">
          Already registered?{" "}
          <Link
            href={name.trim() ? `/auth/signin?name=${encodeURIComponent(name.trim())}${password ? `&password=${encodeURIComponent(password)}` : ""}` : "/auth/signin"}
            className="font-medium text-brand-brown hover:text-brand-brown/80"
          >
            Sign In
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
