"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ExifReader from "exifreader";
import { savePendingPhoto } from "~/lib/photo-store";
import { isNative } from "~/lib/native";
import { takeNativePhoto, pickNativePhoto } from "~/lib/native-camera";

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

interface PhotoMetadata {
  lat?: number;
  lng?: number;
  date?: Date;
}

interface PhotoCaptureProps {
  driveId: string;
  currentPosition: { lat: number; lng: number } | null;
  speciesList: SpeciesInfo[];
  onSightingsConfirmed: (
    sightings: { speciesId: string; commonName: string; category: string; imageUrl: string | null; count: number }[],
    photoUrl: string | null,
    metadata?: PhotoMetadata,
  ) => void;
  onClose: () => void;
}

type CaptureState = "idle" | "uploading" | "detecting" | "results" | "offline-saved";

export function PhotoCapture({
  driveId,
  currentPosition,
  speciesList,
  onSightingsConfirmed,
  onClose,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CaptureState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [exifMeta, setExifMeta] = useState<PhotoMetadata | undefined>();

  const processPhoto = useCallback(
    async (file: File) => {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Extract EXIF GPS + date
      let exifLat: number | undefined;
      let exifLng: number | undefined;
      let exifDate: Date | undefined;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const tags = ExifReader.load(arrayBuffer, { expanded: true });
        if (tags.gps?.Latitude != null && tags.gps?.Longitude != null) {
          exifLat = tags.gps.Latitude;
          exifLng = tags.gps.Longitude;
        }
        const dateTag = tags.exif?.DateTimeOriginal ?? tags.exif?.DateTime;
        if (dateTag?.description) {
          // EXIF date format: "YYYY:MM:DD HH:MM:SS"
          const parsed = new Date(dateTag.description.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"));
          if (!isNaN(parsed.getTime())) exifDate = parsed;
        }
      } catch {
        // EXIF extraction failed — continue without it
      }
      const meta: PhotoMetadata | undefined =
        exifLat != null || exifDate ? { lat: exifLat, lng: exifLng, date: exifDate } : undefined;
      setExifMeta(meta);

      // Use EXIF position if available, otherwise current GPS
      const lat = exifLat ?? currentPosition?.lat ?? null;
      const lng = exifLng ?? currentPosition?.lng ?? null;

      const saveLocally = async () => {
        setState("uploading");
        await savePendingPhoto(driveId, file, lat, lng);
        setState("offline-saved");
      };

      if (!navigator.onLine) {
        await saveLocally();
        return;
      }

      try {
        setState("uploading");
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("driveId", driveId);
        if (lat != null) formData.append("lat", lat.toString());
        if (lng != null) formData.append("lng", lng.toString());

        let uploadRes: Response;
        try {
          uploadRes = await fetch("/api/photos/upload", {
            method: "POST",
            body: formData,
          });
        } catch {
          await saveLocally();
          return;
        }

        if (!uploadRes.ok) {
          await saveLocally();
          return;
        }

        const uploadData = (await uploadRes.json()) as { url: string; photoId: string };
        setPhotoUrl(uploadData.url);

        setState("detecting");

        try {
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
            setSelected(new Set(matched.map((d, i) => d.confidence >= 0.7 ? i : -1).filter((i) => i >= 0)));
          } else {
            const errBody = (await identifyRes.json().catch(() => ({}))) as { error?: string };
            setDetectError(errBody.error ?? `Detection failed (${identifyRes.status})`);
          }
        } catch {
          setDetectError("Species detection unavailable");
        }

        setState("results");
      } catch {
        await saveLocally();
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

  const toggleSelected = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleConfirm = () => {
    const sightings = detections
      .filter((d, i) => d.speciesId && selected.has(i))
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
    onSightingsConfirmed(sightings, photoUrl, exifMeta);
  };

  const handleRetake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setDetections([]);
    setSelected(new Set());
    setPhotoUrl(null);
    setDetectError(null);
    setExifMeta(undefined);
    setState("idle");
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    setCameraError(null);
    if (isNative()) {
      takeNativePhoto()
        .then((file) => { if (file) void processPhoto(file); })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Camera unavailable";
          if (!msg.toLowerCase().includes("cancel")) setCameraError(msg);
        });
    } else {
      fileInputRef.current?.click();
    }
  };

  const openGallery = () => {
    setCameraError(null);
    if (isNative()) {
      pickNativePhoto()
        .then((file) => { if (file) void processPhoto(file); })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Photo library unavailable";
          if (!msg.toLowerCase().includes("cancel")) setCameraError(msg);
        });
    } else {
      galleryInputRef.current?.click();
    }
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
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
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
              {cameraError && (
                <div className="w-full rounded-xl bg-red-500/10 px-4 py-3 text-center">
                  <div className="text-sm font-semibold text-red-600">Camera Error</div>
                  <div className="mt-1 text-xs text-brand-khaki">{cameraError}</div>
                </div>
              )}
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
                    onClick={openGallery}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 shadow-lg transition active:scale-95"
                  >
                    <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM8.25 8.625a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" />
                    </svg>
                  </button>
                  <span className="text-xs text-brand-khaki">Library</span>
                </div>
              </div>
              <p className="text-xs text-brand-khaki/60">or paste from clipboard with Ctrl+V</p>
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
                <div className="max-h-[40vh] overflow-y-auto">
                  {detections.some((d) => d.confidence >= 0.7) && (
                    <div className="mb-2 text-xs font-semibold uppercase text-brand-khaki">
                      Best Match
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {detections.map((d, i) => {
                      const isAlt = d.confidence < 0.7;
                      const isSelected = selected.has(i);
                      const isFirstAlt = isAlt && (i === 0 || detections[i - 1]!.confidence >= 0.7);
                      return (
                        <div key={d.speciesId ?? i}>
                          {isFirstAlt && (
                            <div className="mb-1.5 mt-3 text-xs font-semibold uppercase text-brand-khaki">
                              Also Possible
                            </div>
                          )}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleSelected(i)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelected(i); } }}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left transition active:scale-[0.98] ${
                              isSelected
                                ? "bg-brand-green/10 ring-1 ring-brand-green/30"
                                : "bg-brand-cream/50"
                            }`}
                          >
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                              isSelected ? "bg-brand-green text-white" : "border border-brand-khaki/30"
                            }`}>
                              {isSelected && (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`truncate text-sm font-medium ${isSelected ? "text-brand-dark" : "text-brand-khaki"}`}>
                                {d.commonName}
                              </div>
                              <div className="text-[10px] text-brand-khaki">
                                {Math.round(d.confidence * 100)}% confidence
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCountChange(i, -1); }}
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
                                  onClick={(e) => { e.stopPropagation(); handleCountChange(i, 1); }}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green/15 text-brand-green transition active:scale-90"
                                >
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : detectError ? (
                <div className="rounded-xl bg-red-500/10 px-4 py-3 text-center">
                  <div className="text-sm font-semibold text-red-600">Detection unavailable</div>
                  <div className="mt-1 text-xs text-brand-khaki">{detectError}</div>
                  <div className="mt-1 text-xs text-brand-khaki">Photo has been saved to the drive.</div>
                </div>
              ) : (
                <div className="rounded-xl bg-brand-cream/50 px-4 py-3 text-center text-sm text-brand-khaki">
                  No species detected. Photo has been saved to the drive.
                </div>
              )}

              <div className="flex gap-2">
                {selected.size > 0 && (
                  <button
                    onClick={handleConfirm}
                    className="flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-bold text-white transition active:scale-95"
                  >
                    Confirm ({selected.size})
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
                  {selected.size > 0 ? "Skip" : "Done"}
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
