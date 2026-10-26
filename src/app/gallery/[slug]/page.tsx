import { notFound } from "next/navigation";
import GalleryClientView from "@/components/GalleryClientView";
import PinScreen from "@/components/PinScreen";
import { hasGalleryAccess } from "@/lib/auth";
import { fetchAll } from "@/lib/galleries";
import { isMockMode, mockDb } from "@/lib/mock-db";
import { db } from "@/lib/supabase";
import type { Photo, PublicGallery } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your gallery · Love Lens Wedding", robots: { index: false, follow: false } };

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (isMockMode()) {
    const gallery = mockDb.getGalleryBySlug(slug);
    if (!gallery) notFound();
    if (!(await hasGalleryAccess(gallery.id))) {
      return <PinScreen slug={gallery.slug} title={gallery.title} clientName={gallery.client_name} />;
    }
    const photos = mockDb.getPhotosByGallery(gallery.id);
    const selections = mockDb.getSelections(gallery.id);
    return (
      <GalleryClientView gallery={gallery} photos={photos} initialSelected={selections} />
    );
  }

  const { data } = await db()
    .from("galleries")
    .select("id, title, slug, client_name, event_date, categories")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();
  const gallery = data as PublicGallery; // pin_code is never selected here

  if (!(await hasGalleryAccess(gallery.id))) {
    return <PinScreen slug={gallery.slug} title={gallery.title} clientName={gallery.client_name} />;
  }

  const [photos, selections] = await Promise.all([
    fetchAll<Photo>((from, to) =>
      db()
        .from("photos")
        .select("id, original_name, category, r2_url, preview_url, thumb_url, blur_data_url, width, height")
        .eq("gallery_id", gallery.id)
        .order("original_name")
        .range(from, to),
    ),
    fetchAll<{ photo_id: string }>((from, to) =>
      db()
        .from("selections")
        .select("photo_id")
        .eq("gallery_id", gallery.id)
        .eq("selected_by_client", true)
        .range(from, to),
    ),
  ]);

  return (
    <GalleryClientView gallery={gallery} photos={photos} initialSelected={selections.map((s) => s.photo_id)} />
  );
}
