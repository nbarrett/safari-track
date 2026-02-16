"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { savePendingPhoto } from "~/lib/photo-store";

interface Detection {
  commonName: string;
  count: number;
  confidence: number;
  speciesId?: string;
}

interface SpeciesInfo {
  id: string;
  commonName: string;
  category: string;
  imageUrl: string | null;
}

interface PhotoCaptureProps {
  driveId: string;
  currentPosition: { lat: number; lng: number } | null;
  speciesList: SpeciesInfo[];
  onSightingsConfirmed: (
    sightings: { speciesId: string; commonName: string; category: string; imageUrl: string | null; count: number }[],
    photoUrl: string | null,
  ) => void;
  onClose: () => void;
}

type CaptureState = "idle" | "uploading" | "detecting" | "results" | "offline-saved" | "error";

export function PhotoCapture({
  driveId,
  currentPosition,
  speciesList,
  onSightingsConfirmed,
  onClose,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CaptureState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processPhoto = useCallback(
    async (file: File) => {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      if (!navigator.onLine) {
        setState("uploading");
        const lat = currentPosition?.lat ?? null;
        const lng = currentPosition?.lng ?? null;
        await savePendingPhoto(driveId, file, lat, lng);
        setState("offline-saved");
        return;
      }

      try {
        setState("uploading");
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("driveId", driveId);
        if (currentPosition) {
          formData.append("lat", currentPosition.lat.toString());
          formData.append("lng", currentPosition.lng.toString());
        }

        const uploadRes = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = (await uploadRes.json()) as { error?: string };
          throw new Error(err.error ?? "Upload failed");
        }

        const uploadData = (await uploadRes.json()) as { url: string; photoId: string };
        setPhotoUrl(uploadData.url);

        setState("detecting");

        const base64 = await fileToBase64(file);
        const speciesNames = speciesList.map((s) => s.commonName);

        const identifyRes = await fetch("/api/photos/identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, speciesList: speciesNames }),
        });

        if (identifyRes.ok) {
          const identifyData = (await identifyRes.json()) as { detections: Detection[] };
          const matched = identifyData.detections.map((d) => {
            const species = speciesList.find(
              (s) => s.commonName.toLowerCase() === d.commonName.toLowerCase(),
            );
            return { ...d, speciesId: species?.id };
          }).filter((d) => d.speciesId);
          setDetections(matched);
        }

        setState("results");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
        setState("error");
      }
    },
    [driveId, currentPosition, speciesList],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await processPhoto(file);
    },
    [processPhoto],
  );

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `paste_${Date.now()}.jpg`, { type: imageType });
          await processPhoto(file);
          return;
        }
      }
    } catch {
      /* clipboard read denied or empty */
    }
  }, [processPhoto]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (state !== "idle") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) void processPhoto(blob);
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [state, processPhoto]);

  const handleCountChange = (index: number, delta: number) => {
    setDetections((prev) =>
      prev.map((d, i) =>
        i === index ? { ...d, count: Math.max(1, d.count + delta) } : d,
      ),
    );
  };

  const handleRemoveDetection = (index: number) => {
    setDetections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const sightings = detections
      .filter((d) => d.speciesId)
      .map((d) => {
        const species = speciesList.find((s) => s.id === d.speciesId)!;
        return {
          speciesId: d.speciesId!,
          commonName: species.commonName,
          category: species.category,
          imageUrl: species.imageUrl,
          count: d.count,
        };
      });
    onSightingsConfirmed(sightings, photoUrl);
  };

  const handleRetake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setDetections([]);
    setPhotoUrl(null);
    setErrorMessage(null);
    setState("idle");
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 mb-[calc(1rem+env(safe-area-inset-bottom))] w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void handleFileSelect(e)}
          className="hidden"
        />

        <div className="flex items-center justify-between border-b border-brand-khaki/20 px-4 py-3">
          <h3 className="text-base font-bold text-brand-dark">Photo Capture</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-cream transition active:scale-95"
          >
            <svg className="h-4 w-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {state === "idle" && !preview && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={openCamera}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-green shadow-lg transition active:scale-95"
                  >
                    <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </button>
                  <span className="text-xs text-brand-khaki">Camera</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => void handlePaste()}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 shadow-lg transition active:scale-95"
                  >
                    <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  </button>
                  <span className="text-xs text-brand-khaki">Paste</span>
                </div>
              </div>
              <p className="text-xs text-brand-khaki/60">or press Ctrl+V to paste from clipboard</p>
            </div>
          )}

          {(state === "uploading" || state === "detecting") && preview && (
            <div className="flex flex-col items-center gap-3">
              <img src={preview} alt="Captured" className="max-h-48 rounded-xl object-contain" />
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin text-brand-green" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium text-brand-dark">
                  {state === "uploading" ? "Uploading photo..." : "Identifying species..."}
                </span>
              </div>
            </div>
          )}

          {state === "results" && preview && (
            <div className="flex flex-col gap-3">
              <img src={preview} alt="Captured" className="max-h-36 self-center rounded-xl object-contain" />

              {detections.length > 0 ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase text-brand-khaki">
                    Detected Species
                  </div>
                  <div className="space-y-2">
                    {detections.map((d, i) => (
                      <div
                        key={d.speciesId ?? i}
                        className="flex items-center gap-2 rounded-xl bg-brand-cream/50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-brand-dark">
                            {d.commonName}
                          </div>
                          <div className="text-[10px] text-brand-khaki">
                            {Math.round(d.confidence * 100)}% confidence
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => handleCountChange(i, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-red-600 transition active:scale-90"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-semibold text-brand-dark">
                            {d.count}
                          </span>
                          <button
                            onClick={() => handleCountChange(i, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green/15 text-brand-green transition active:scale-90"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveDetection(i)}
                            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-cream text-brand-khaki transition active:scale-90"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-brand-cream/50 px-4 py-3 text-center text-sm text-brand-khaki">
                  No species detected. Photo has been saved to the drive.
                </div>
              )}

              <div className="flex gap-2">
                {detections.length > 0 && (
                  <button
                    onClick={handleConfirm}
                    className="flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-bold text-white transition active:scale-95"
                  >
                    Confirm Sightings
                  </button>
                )}
                <button
                  onClick={handleRetake}
                  className="flex-1 rounded-xl bg-brand-cream py-2.5 text-sm font-bold text-brand-dark transition active:scale-95"
                >
                  Retake
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-brand-khaki/10 py-2.5 text-sm font-bold text-brand-khaki transition active:scale-95"
                >
                  {detections.length > 0 ? "Skip" : "Done"}
                </button>
              </div>
            </div>
          )}

          {state === "offline-saved" && preview && (
            <div className="flex flex-col items-center gap-3">
              <img src={preview} alt="Captured" className="max-h-48 rounded-xl object-contain" />
              <div className="rounded-xl bg-brand-gold/15 px-4 py-3 text-center">
                <div className="text-sm font-semibold text-brand-dark">Photo saved</div>
                <div className="mt-1 text-xs text-brand-khaki">
                  Will upload and identify species when back online
                </div>
              </div>
              <div className="flex w-full gap-2">
                <button
                  onClick={handleRetake}
                  className="flex-1 rounded-xl bg-brand-cream py-2.5 text-sm font-bold text-brand-dark transition active:scale-95"
                >
                  Take Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-bold text-white transition active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3">
              {preview && (
                <img src={preview} alt="Captured" className="max-h-48 rounded-xl object-contain" />
              )}
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-center">
                <div className="text-sm font-semibold text-red-600">Upload failed</div>
                <div className="mt-1 text-xs text-brand-khaki">{errorMessage}</div>
              </div>
              <div className="flex w-full gap-2">
                <button
                  onClick={handleRetake}
                  className="flex-1 rounded-xl bg-brand-cream py-2.5 text-sm font-bold text-brand-dark transition active:scale-95"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-brand-khaki/10 py-2.5 text-sm font-bold text-brand-khaki transition active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
