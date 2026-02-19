import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

function base64ToFile(base64String: string, format: string): File {
  const byteChars = atob(base64String);
  const byteArrays: Uint8Array<ArrayBuffer>[] = [];
  for (let i = 0; i < byteChars.length; i += 512) {
    const slice = byteChars.slice(i, i + 512);
    const bytes = new Uint8Array(slice.length);
    for (let j = 0; j < slice.length; j++) {
      bytes[j] = slice.charCodeAt(j);
    }
    byteArrays.push(bytes);
  }
  const blob = new Blob(byteArrays, { type: `image/${format}` });
  return new File([blob], `photo_${Date.now()}.${format}`, { type: `image/${format}` });
}

async function requestCameraPermission(): Promise<boolean> {
  const status = await Camera.checkPermissions();
  if (status.camera === "granted") return true;
  if (status.camera === "denied") return false;
  const requested = await Camera.requestPermissions({ permissions: ["camera"] });
  return requested.camera === "granted";
}

async function requestPhotosPermission(): Promise<boolean> {
  const status = await Camera.checkPermissions();
  if (status.photos === "granted" || status.photos === "limited") return true;
  if (status.photos === "denied") return false;
  const requested = await Camera.requestPermissions({ permissions: ["photos"] });
  return requested.photos === "granted" || requested.photos === "limited";
}

export async function takeNativePhoto(): Promise<File | null> {
  const granted = await requestCameraPermission();
  if (!granted) throw new Error("Camera permission denied. Please enable it in Settings.");

  const photo = await Camera.getPhoto({
    quality: 85,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    correctOrientation: true,
  });

  if (!photo.base64String) return null;
  return base64ToFile(photo.base64String, photo.format ?? "jpeg");
}

export async function pickNativePhoto(): Promise<File | null> {
  const granted = await requestPhotosPermission();
  if (!granted) throw new Error("Photo library permission denied. Please enable it in Settings.");

  const photo = await Camera.getPhoto({
    quality: 85,
    resultType: CameraResultType.Base64,
    source: CameraSource.Photos,
    correctOrientation: true,
  });

  if (!photo.base64String) return null;
  return base64ToFile(photo.base64String, photo.format ?? "jpeg");
}
