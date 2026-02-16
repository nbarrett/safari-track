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
  const [showGuide, setShowGuide] = useState(false);
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
    setShowGuide(false);
    if (state.kind === "stale") {
      markVersionSeen();
    } else {
      setDismissed(state.scenario);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const choice = await deferredPrompt.current.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
      }
      deferredPrompt.current = null;
    } else {
      setShowGuide(true);
    }
  };

  const scenario = state.kind === "scenario" ? state.scenario : null;
  const isIos = scenario === "ios-safari" || scenario === "ios-non-safari";

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[9997] translate-y-0 animate-slide-up bg-brand-dark px-4 py-4 text-sm text-white shadow-lg transition-transform">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex-1">
            <p>Install Safari Track for quick access and offline use.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => void handleInstall()}
              className="rounded-md bg-brand-gold px-3 py-1.5 font-medium text-brand-dark"
            >
              {isIos ? "Add" : "Install"}
            </button>
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

      {showGuide && (
        <div
          className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/60 pb-20"
          onClick={dismiss}
        >
          <div
            className="mx-4 max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-4xl">
              {scenario === "ios-non-safari" ? "🧭" : "📲"}
            </div>
            {scenario === "ios-non-safari" ? (
              <>
                <p className="mb-2 text-lg font-semibold text-brand-dark">
                  Open in Safari
                </p>
                <p className="text-sm text-brand-khaki">
                  To add Safari Track to your home screen, open this page in{" "}
                  <strong>Safari</strong> then tap{" "}
                  <ShareIcon /> and select <strong>Add to Home Screen</strong>.
                </p>
              </>
            ) : (
              <>
                <p className="mb-2 text-lg font-semibold text-brand-dark">
                  Add to Home Screen
                </p>
                <p className="text-sm text-brand-khaki">
                  Tap the <ShareIcon /> button in Safari&apos;s toolbar below, then
                  select <strong>Add to Home Screen</strong>.
                </p>
                <div className="mt-4 flex justify-center">
                  <svg className="h-8 w-8 animate-bounce text-brand-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </>
            )}
            <button
              onClick={dismiss}
              className="mt-4 rounded-lg bg-brand-cream px-6 py-2 text-sm font-medium text-brand-brown"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
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
