import { NextResponse } from "next/server";
import { hasGalleryAccess } from "@/lib/auth";
import { isMockMode, mockDb } from "@/lib/mock-db";
import { db } from "@/lib/supabase";
import { isUuid } from "@/lib/utils";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { photoId, selected } = await req.json().catch(() => ({}));
  if (!isUuid(photoId) || typeof selected !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (isMockMode()) {
    const gallery = mockDb.getGalleryBySlug(slug);
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    if (!(await hasGalleryAccess(gallery.id))) return NextResponse.json({ error: "Locked" }, { status: 401 });
    mockDb.setSelection(gallery.id, photoId, selected);
    return NextResponse.json({ ok: true });
  }

  const { data: gallery } = await db().from("galleries").select("id").eq("slug", slug).maybeSingle();
  if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  if (!(await hasGalleryAccess(gallery.id))) return NextResponse.json({ error: "Locked" }, { status: 401 });

  const { data: photo } = await db().from("photos").select("id").eq("id", photoId).eq("gallery_id", gallery.id).maybeSingle();
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const { error } = await db()
    .from("selections")
    .upsert(
      { gallery_id: gallery.id, photo_id: photoId, selected_by_client: selected, updated_at: new Date().toISOString() },
      { onConflict: "gallery_id,photo_id" },
    );
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
