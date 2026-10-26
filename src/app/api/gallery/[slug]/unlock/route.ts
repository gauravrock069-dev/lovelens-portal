import { NextResponse } from "next/server";
import { cookieOpts, galleryCookie, galleryToken, GALLERY_TTL, pinMatches } from "@/lib/auth";
import { isMockMode, mockDb } from "@/lib/mock-db";
import { db } from "@/lib/supabase";
import { clientIp } from "@/lib/utils";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IP = 8;
const MAX_FAILS_PER_GALLERY = 40;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { pin } = await req.json().catch(() => ({}));
  if (typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: "Enter your PIN" }, { status: 400 });
  }

  if (isMockMode()) {
    const gallery = mockDb.getGalleryBySlug(slug);
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    const ip = clientIp(req);
    const { byIp, byGallery } = mockDb.getPinFails(gallery.id, ip, WINDOW_MS);
    if (byIp >= MAX_FAILS_PER_IP || byGallery >= MAX_FAILS_PER_GALLERY) {
      return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    }
    const ok = pinMatches(pin, gallery.pin_code);
    mockDb.recordPinAttempt(gallery.id, ip, ok);
    if (!ok) return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(galleryCookie(gallery.id), galleryToken(gallery.id), cookieOpts(GALLERY_TTL));
    return res;
  }

  const { data: gallery } = await db().from("galleries").select("id, pin_code").eq("slug", slug).maybeSingle();
  if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

  const ip = clientIp(req);
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const fails = () =>
    db().from("pin_attempts").select("id", { count: "exact", head: true })
      .eq("gallery_id", gallery.id).eq("succeeded", false).gte("attempted_at", since);
  const [byIp, byGallery] = await Promise.all([fails().eq("ip", ip), fails()]);
  if ((byIp.count ?? 0) >= MAX_FAILS_PER_IP || (byGallery.count ?? 0) >= MAX_FAILS_PER_GALLERY) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const ok = pinMatches(pin, gallery.pin_code);
  await db().from("pin_attempts").insert({ gallery_id: gallery.id, ip, succeeded: ok });
  if (!ok) return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(galleryCookie(gallery.id), galleryToken(gallery.id), cookieOpts(GALLERY_TTL));
  return res;
}
