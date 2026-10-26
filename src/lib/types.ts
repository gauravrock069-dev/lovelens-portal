import type { Category } from "./constants";

export type PublicGallery = {
  id: string;
  title: string;
  slug: string;
  client_name: string;
  event_date: string | null;
  categories: Category[];
};

export type GalleryWithStats = PublicGallery & {
  pin_code: string;
  cover_image_url: string | null;
  created_at: string;
  photo_count: number;
  selected_count: number;
};

export type Photo = {
  id: string;
  original_name: string;
  category: Category;
  r2_url: string;
  preview_url: string;
  thumb_url: string;
  blur_data_url: string | null;
  width: number;
  height: number;
};
