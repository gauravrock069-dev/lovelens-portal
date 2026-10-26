import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ll_admin";
export const galleryCookie = (galleryId: string) => `ll_g_${galleryId}`;

export const ADMIN_TTL = 60 * 60 * 24 * 7;
export const GALLERY_TTL = 60 * 60 * 24 * 30;

export const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return s;
}

const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function makeToken(subject: string, ttlSeconds: number) {
  const body = `${subject}|${Math.floor(Date.now() / 1000) + ttlSeconds}`;
  return `${body}|${sign(body)}`;
}

function readToken(token: string | undefined, subject: string) {
  if (!token) return false;
  const parts = token.split("|");
  if (parts.length !== 3) return false;
  const [sub, exp, sig] = parts;
  if (sub !== subject || !safeEqual(sig, sign(`${sub}|${exp}`))) return false;
  return Number(exp) > Date.now() / 1000;
}

export const checkAdminPassword = (input: string) => {
  const expected = process.env.ADMIN_PASSWORD;
  return !!expected && safeEqual(input, expected);
};

export async function isAdmin() {
  return readToken((await cookies()).get(ADMIN_COOKIE)?.value, "admin");
}

export async function hasGalleryAccess(galleryId: string) {
  return readToken((await cookies()).get(galleryCookie(galleryId))?.value, `gallery:${galleryId}`);
}

export const galleryToken = (galleryId: string) => makeToken(`gallery:${galleryId}`, GALLERY_TTL);

export function pinMatches(input: string, expected: string) {
  return safeEqual(input, expected);
}
