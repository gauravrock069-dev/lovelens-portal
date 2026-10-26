import "server-only";
import { db } from "./supabase";
import { isMockMode, mockDb } from "./mock-db";
import type { GalleryWithStats } from "./types";

export async function listGalleries(): Promise<GalleryWithStats[]> {
  if (isMockMode()) {
    return mockDb.getGalleriesWithStats();
  }

  const [g, s] = await Promise.all([
    db().from("galleries").select("*").order("created_at", { ascending: false }),
    db().from("gallery_stats").select("*"),
  ]);
  if (g.error) throw new Error(g.error.message);
  if (s.error) throw new Error(s.error.message);
  const stats = new Map((s.data ?? []).map((r) => [r.gallery_id, r]));
  return (g.data ?? []).map((x) => ({
    ...x,
    photo_count: Number(stats.get(x.id)?.photo_count ?? 0),
    selected_count: Number(stats.get(x.id)?.selected_count ?? 0),
  }));
}

/** PostgREST caps responses at 1000 rows; wedding galleries are bigger than that. */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
