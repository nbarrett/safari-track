import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "~/server/auth";
import { env } from "~/env";

interface Detection {
  commonName: string;
  count: number;
  confidence: number;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI detection not configured" }, { status: 503 });
  }

  const body = (await request.json()) as { imageBase64?: string; speciesList?: string[] };
  const { imageBase64, speciesList } = body;

  if (!imageBase64 || !speciesList?.length) {
    return NextResponse.json(
      { error: "imageBase64 and speciesList are required" },
      { status: 400 },
    );
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const speciesListText = speciesList.join(", ");

  const prompt = `You are a wildlife identification expert. Identify the wildlife species visible in this photo.

IMPORTANT: Only return species from this exact list: ${speciesListText}

For each species you identify, provide:
- commonName: the exact name from the list above
- count: how many individuals you can see
- confidence: your confidence level from 0 to 1

Return ONLY valid JSON in this exact format, with no other text:
[{"commonName": "species name", "count": 1, "confidence": 0.9}]

If you cannot identify any species from the list, return an empty array: []`;

  try {
    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]!
      : imageBase64;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
    ]);

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ detections: [] });
    }

    const parsed = JSON.parse(jsonMatch[0]) as Detection[];
    const speciesSet = new Set(speciesList.map((s) => s.toLowerCase()));

    const detections = parsed
      .filter(
        (d) =>
          d.commonName &&
          d.count > 0 &&
          d.confidence >= 0.7 &&
          speciesSet.has(d.commonName.toLowerCase()),
      )
      .map((d) => ({
        commonName: speciesList.find(
          (s) => s.toLowerCase() === d.commonName.toLowerCase(),
        ) ?? d.commonName,
        count: Math.round(d.count),
        confidence: d.confidence,
      }));

    return NextResponse.json({ detections });
  } catch (err) {
    console.error("[photos/identify] Gemini error:", err);
    const message = err instanceof Error ? err.message : "AI detection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
