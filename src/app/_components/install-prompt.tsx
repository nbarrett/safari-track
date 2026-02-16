"use client";

import { useEffect, useRef, useState } from "react";
import {
  type InstallScenario,
  detectInstallScenario,
  isDismissed,
  setDismissed,
  isAppStale,
  markVersionSeen,
} from "~/lib/install-prompt";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptState =
  | { kind: "scenario"; scenario: InstallScenario }
  | { kind: "stale" };

export function InstallPrompt() {
  const [state, setState] = useState<PromptState | null>(null);
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  const timerFired = useRef(false);

  useEffect(() => {
    const tryShow = (scenario: InstallScenario) => {
      if (isDismissed(scenario)) return;
      setState({ kind: "scenario", scenario });
      setShow(true);
    };

    const handleBip = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      if (timerFired.current && !show) {
        tryShow("android");
      }
    };
    window.addEventListener("beforeinstallprompt", handleBip);

    const timer = setTimeout(() => {
      timerFired.current = true;

      if (isAppStale()) {
        setState({ kind: "stale" });
        setShow(true);
        return;
      }

      const scenario = detectInstallScenario();
      if (!scenario) return;

      if (scenario === "android" && !deferredPrompt.current) return;

      tryShow(scenario);
    }, 3000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBip);
    };
  }, [show]);

  if (!state || !show) return null;

  const dismiss = () => {
    setShow(false);
    if (state.kind === "stale") {
      markVersionSeen();
    } else {
      setDismissed(state.scenario);
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const choice = await deferredPrompt.current.userChoice;
    if (choice.outcome === "accepted") {
      setShow(false);
    }
    deferredPrompt.current = null;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9997] translate-y-0 animate-slide-up bg-brand-dark px-4 py-4 text-sm text-white shadow-lg transition-transform">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="flex-1">
          <BannerContent state={state} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {deferredPrompt.current && (
            <button
              onClick={handleInstall}
              className="rounded-md bg-brand-gold px-3 py-1.5 font-medium text-brand-dark"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="p-1 text-white/60 hover:text-white"
            aria-label="Dismiss"
          >
            <XIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerContent({ state }: { state: PromptState }) {
  if (state.kind === "stale") {
    return (
      <p>
        Safari Track has been updated &mdash; re-add to your home screen for the
        latest version.
      </p>
    );
  }

  switch (state.scenario) {
    case "android":
      return <p>Install Safari Track for quick access and offline use.</p>;
    case "ios-safari":
      return (
        <p>
          Add Safari Track: tap{" "}
          <ShareIcon /> then <strong>Add to Home Screen</strong>.
        </p>
      );
    case "ios-non-safari":
      return (
        <p>
          For the best experience, open this app in <strong>Safari</strong> and
          tap <strong>Share &rarr; Add to Home Screen</strong>.
        </p>
      );
    case "desktop":
      return (
        <p>
          Install Safari Track: click the install icon in your browser&apos;s address bar, or use the browser menu.
        </p>
      );
  }
}

function ShareIcon() {
  return (
    <svg
      className="inline-block h-4 w-4 align-text-bottom"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}
