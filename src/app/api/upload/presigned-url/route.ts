import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ALLOWED_TYPES } from "@/lib/constants";
import { isMockMode, mockDb } from "@/lib/mock-db";
import { presignPut, publicUrl } from "@/lib/r2";
import { db } from "@/lib/supabase";
import { isUuid } from "@/lib/utils";

/**
 * Returns presigned PUT URLs so the browser uploads straight to R2.
 * Three objects per photo: the original, a 2400px preview and a 900px thumbnail.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { galleryId, filename, contentType } = await req.json().catch(() => ({}));
  if (!isUuid(galleryId) || typeof filename !== "string" || !ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Only JPEG, PNG or WebP images are supported" }, { status: 400 });
  }

  if (isMockMode()) {
    const gallery = mockDb.getGalleryById(galleryId);
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  } else {
    const { data: gallery } = await db().from("galleries").select("id").eq("id", galleryId).maybeSingle();
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const id = randomUUID();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  const base = `galleries/${galleryId}/${id}`;
  const keys = {
    original: { key: `${base}/original-${safe}`, type: contentType as string },
    preview: { key: `${base}/preview.jpg`, type: "image/jpeg" },
    thumb: { key: `${base}/thumb.jpg`, type: "image/jpeg" },
  };

  const entries = await Promise.all(
    Object.entries(keys).map(
      async ([name, { key, type }]) =>
        [name, { key, uploadUrl: await presignPut(key, type), publicUrl: publicUrl(key) }] as const,
    ),
  );
  return NextResponse.json({ id, ...Object.fromEntries(entries) });
}
