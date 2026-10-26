export const CATEGORIES = ["Haldi", "Mehendi", "Wedding", "Reception"] as const;
export type Category = (typeof CATEGORIES)[number];

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTOGRAPHER_PHONE = process.env.NEXT_PUBLIC_PHOTOGRAPHER_PHONE ?? "";
