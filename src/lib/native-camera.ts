import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export async function takeNativePhoto(): Promise<File | null> {
  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
    correctOrientation: true,
  });

  if (!photo.dataUrl) return null;

  const response = await fetch(photo.dataUrl);
  const blob = await response.blob();
  return new File([blob], `photo_${Date.now()}.${photo.format}`, {
    type: `image/${photo.format}`,
  });
}

export async function pickNativePhoto(): Promise<File | null> {
  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Photos,
    correctOrientation: true,
  });

  if (!photo.dataUrl) return null;

  const response = await fetch(photo.dataUrl);
  const blob = await response.blob();
  return new File([blob], `photo_${Date.now()}.${photo.format}`, {
    type: `image/${photo.format}`,
  });
}
