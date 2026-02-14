import type { Session } from "next-auth";

const SESSION_KEY = "wildtrack-session";
const CREDENTIALS_KEY = "wildtrack-credentials";

interface CachedCredential {
  name: string;
  hash: string;
  session: Session;
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function cacheCredentials(name: string, password: string, session: Session): Promise<void> {
  try {
    const hash = await sha256(password);
    const entry: CachedCredential = { name: name.toLowerCase(), hash, session };
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(entry));
  } catch {
    return;
  }
}

export async function getOfflineSession(name: string, password: string): Promise<Session | null> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedCredential;
    if (entry.name !== name.toLowerCase()) return null;
    const hash = await sha256(password);
    if (hash !== entry.hash) return null;
    return entry.session;
  } catch {
    return null;
  }
}

export function cacheSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    return;
  }
}

export function getCachedSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (new Date(session.expires) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearCachedSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
}
