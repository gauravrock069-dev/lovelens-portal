import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { CATEGORIES, type Category } from "@/lib/constants";
import { isMockMode, mockDb } from "@/lib/mock-db";
import { publicUrl } from "@/lib/r2";
import { db } from "@/lib/supabase";
import { isUuid } from "@/lib/utils";

type Incoming = {
  id: string;
  originalName: string;
  category: string;
  originalKey: string;
  previewKey: string;
  thumbKey: string;
  width: number;
  height: number;
  blurDataUrl?: string;
};

/** Saves photo metadata after the browser finished uploading to R2. URLs are rebuilt server-side from keys. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { galleryId, photos } = await req.json().catch(() => ({}));
  if (!isUuid(galleryId) || !Array.isArray(photos) || !photos.length || photos.length > 50) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rows = [];
  for (const p of photos as Incoming[]) {
    const prefix = `galleries/${galleryId}/${p.id}/`;
    const keysOk = [p.originalKey, p.previewKey, p.thumbKey].every((k) => typeof k === "string" && k.startsWith(prefix));
    if (
      !isUuid(p.id) || !keysOk ||
      !(CATEGORIES as readonly string[]).includes(p.category) ||
      !Number.isInteger(p.width) || !Number.isInteger(p.height) || p.width < 1 || p.height < 1 ||
      typeof p.originalName !== "string" || p.originalName.length > 255
    ) {
      return NextResponse.json({ error: "Invalid photo data" }, { status: 400 });
    }
    rows.push({
      id: p.id,
      gallery_id: galleryId,
      original_name: p.originalName,
      category: p.category as Category,
      r2_url: publicUrl(p.originalKey),
      preview_url: publicUrl(p.previewKey),
      thumb_url: publicUrl(p.thumbKey),
      blur_data_url:
        typeof p.blurDataUrl === "string" && p.blurDataUrl.startsWith("data:image/jpeg;base64,") && p.blurDataUrl.length < 2000
          ? p.blurDataUrl
          : null,
      width: p.width,
      height: p.height,
    });
  }

  if (isMockMode()) {
    mockDb.insertPhotos(rows);
    return NextResponse.json({ ok: true });
  }

  const { error } = await db().from("photos").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // First upload becomes the gallery cover
  await db().from("galleries").update({ cover_image_url: rows[0].thumb_url }).eq("id", galleryId).is("cover_image_url", null);
  return NextResponse.json({ ok: true });
}
