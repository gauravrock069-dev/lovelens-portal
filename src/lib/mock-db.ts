import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Category } from "./constants";
import type { GalleryWithStats, Photo, PublicGallery } from "./types";

export function isMockMode(): boolean {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "false") return false;
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes("your-project.supabase.co");
}

type StoredGallery = {
  id: string;
  title: string;
  slug: string;
  client_name: string;
  event_date: string | null;
  pin_code: string;
  categories: Category[];
  cover_image_url: string | null;
  created_at: string;
};

type StoredPhoto = Photo & {
  gallery_id: string;
  created_at: string;
};

type StoredSelection = {
  id: string;
  gallery_id: string;
  photo_id: string;
  selected_by_client: boolean;
  updated_at: string;
};

type StoredPinAttempt = {
  id: string;
  gallery_id: string;
  ip: string;
  succeeded: boolean;
  attempted_at: string;
};

type Schema = {
  galleries: StoredGallery[];
  photos: StoredPhoto[];
  selections: StoredSelection[];
  pin_attempts: StoredPinAttempt[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "mock-db.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function readData(): Schema {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    const initial: Schema = { galleries: [], photos: [], selections: [], pin_attempts: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(content) as Schema;
  } catch {
    return { galleries: [], photos: [], selections: [], pin_attempts: [] };
  }
}

function writeData(data: Schema) {
  ensureDirs();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

export const mockDb = {
  getGalleriesWithStats(): GalleryWithStats[] {
    const data = readData();
    return data.galleries
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((g) => {
        const photo_count = data.photos.filter((p) => p.gallery_id === g.id).length;
        const selected_count = data.selections.filter((s) => s.gallery_id === g.id && s.selected_by_client).length;
        return {
          ...g,
          photo_count,
          selected_count,
        };
      });
  },

  getGalleryBySlug(slug: string): GalleryWithStats | null {
    const all = this.getGalleriesWithStats();
    return all.find((g) => g.slug === slug) ?? null;
  },

  getGalleryById(id: string): GalleryWithStats | null {
    const all = this.getGalleriesWithStats();
    return all.find((g) => g.id === id) ?? null;
  },

  createGallery(data: {
    title: string;
    slug: string;
    client_name: string;
    event_date: string | null;
    pin_code: string;
    categories: Category[];
  }): GalleryWithStats {
    const store = readData();
    const newGallery: StoredGallery = {
      id: randomUUID(),
      title: data.title,
      slug: data.slug,
      client_name: data.client_name,
      event_date: data.event_date,
      pin_code: data.pin_code,
      categories: data.categories,
      cover_image_url: null,
      created_at: new Date().toISOString(),
    };
    store.galleries.unshift(newGallery);
    writeData(store);
    return { ...newGallery, photo_count: 0, selected_count: 0 };
  },

  updateGallery(id: string, patch: Partial<StoredGallery>) {
    const store = readData();
    const idx = store.galleries.findIndex((g) => g.id === id);
    if (idx !== -1) {
      store.galleries[idx] = { ...store.galleries[idx], ...patch };
      writeData(store);
    }
  },

  getPhotosByGallery(galleryId: string): Photo[] {
    const data = readData();
    return data.photos
      .filter((p) => p.gallery_id === galleryId)
      .sort((a, b) => a.original_name.localeCompare(b.original_name))
      .map(({ gallery_id: _, created_at: __, ...photo }) => photo);
  },

  insertPhotos(photos: (Omit<Photo, "id"> & { id?: string; gallery_id: string })[]) {
    const store = readData();
    for (const p of photos) {
      const id = p.id || randomUUID();
      const existingIdx = store.photos.findIndex((x) => x.id === id);
      const row: StoredPhoto = {
        id,
        gallery_id: p.gallery_id,
        original_name: p.original_name,
        category: p.category,
        r2_url: p.r2_url,
        preview_url: p.preview_url,
        thumb_url: p.thumb_url,
        blur_data_url: p.blur_data_url,
        width: p.width,
        height: p.height,
        created_at: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        store.photos[existingIdx] = row;
      } else {
        store.photos.push(row);
      }
    }

    if (photos.length > 0) {
      const galleryId = photos[0].gallery_id;
      const g = store.galleries.find((x) => x.id === galleryId);
      if (g && !g.cover_image_url) {
        g.cover_image_url = photos[0].thumb_url;
      }
    }

    writeData(store);
  },

  getSelections(galleryId: string): string[] {
    const data = readData();
    return data.selections
      .filter((s) => s.gallery_id === galleryId && s.selected_by_client)
      .map((s) => s.photo_id);
  },

  setSelection(galleryId: string, photoId: string, selected: boolean) {
    const store = readData();
    const idx = store.selections.findIndex((s) => s.gallery_id === galleryId && s.photo_id === photoId);
    if (idx >= 0) {
      store.selections[idx].selected_by_client = selected;
      store.selections[idx].updated_at = new Date().toISOString();
    } else {
      store.selections.push({
        id: randomUUID(),
        gallery_id: galleryId,
        photo_id: photoId,
        selected_by_client: selected,
        updated_at: new Date().toISOString(),
      });
    }
    writeData(store);
  },

  recordPinAttempt(galleryId: string, ip: string, succeeded: boolean) {
    const store = readData();
    store.pin_attempts.push({
      id: randomUUID(),
      gallery_id: galleryId,
      ip,
      succeeded,
      attempted_at: new Date().toISOString(),
    });
    writeData(store);
  },

  getPinFails(galleryId: string, ip: string, windowMs: number): { byIp: number; byGallery: number } {
    const store = readData();
    const since = Date.now() - windowMs;
    const fails = store.pin_attempts.filter(
      (a) => a.gallery_id === galleryId && !a.succeeded && new Date(a.attempted_at).getTime() >= since,
    );
    const byIp = fails.filter((a) => a.ip === ip).length;
    return { byIp, byGallery: fails.length };
  },
};

export async function saveMockFile(key: string, buffer: Buffer) {
  ensureDirs();
  const filePath = path.join(UPLOADS_DIR, key.replace(/[/\\]/g, path.sep));
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

export async function getMockFile(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  const filePath = path.join(UPLOADS_DIR, key.replace(/[/\\]/g, path.sep));
  if (!fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "application/octet-stream";
  return { data, contentType };
}
