import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { uploadToS3 } from "~/lib/s3";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { url } = (await request.json()) as { url: string };
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const response = await fetch(url);
  if (!response.ok) {
    return NextResponse.json(
      { error: `Failed to fetch image: ${response.status}` },
      { status: 400 },
    );
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());

  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("svg")
        ? "svg"
        : "jpg";

  const key = `lodges/${Date.now()}.${ext}`;
  const internalUrl = await uploadToS3(key, buffer, contentType);

  return NextResponse.json({ url: internalUrl });
}
