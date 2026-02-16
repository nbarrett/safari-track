import type { Prisma } from "../../../../../generated/prisma";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { uploadToS3 } from "~/lib/s3";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("photo");
  const driveId = formData.get("driveId") as string | null;
  const lat = formData.get("lat") as string | null;
  const lng = formData.get("lng") as string | null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo file provided" }, { status: 400 });
  }

  if (!driveId) {
    return NextResponse.json({ error: "driveId is required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : "jpg";
  const key = `drives/${driveId}/${Date.now()}.${ext}`;
  const url = await uploadToS3(key, buffer, file.type || "image/jpeg");

  const photoEntry = {
    url,
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    caption: null as string | null,
  };

  const drive = await db.driveSession.findUnique({
    where: { id: driveId },
    select: { photos: true },
  });

  if (drive) {
    const existingPhotos = (drive.photos ?? []).filter(
      (p): p is Prisma.JsonObject => p !== null && typeof p === "object" && !Array.isArray(p),
    );

    await db.driveSession.update({
      where: { id: driveId },
      data: { photos: [...existingPhotos, photoEntry] },
    });
  }

  return NextResponse.json({ url, photoId: key });
}
