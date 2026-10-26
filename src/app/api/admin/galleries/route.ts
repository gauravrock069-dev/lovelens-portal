import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { listGalleries } from "@/lib/galleries";
import { isMockMode, mockDb } from "@/lib/mock-db";
import { db } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  return NextResponse.json({ galleries: await listGalleries() });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request");

  const clientName = typeof b.clientName === "string" ? b.clientName.trim() : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const pin = typeof b.pin === "string" ? b.pin : "";
  const date = typeof b.eventDate === "string" && b.eventDate ? b.eventDate : null;
  const categories: string[] = Array.isArray(b.categories)
    ? CATEGORIES.filter((c) => b.categories.includes(c))
    : [];

  if (!clientName || clientName.length > 120) return bad("Enter the client name");
  if (!title || title.length > 120) return bad("Enter an event title");
  if (!/^\d{4}$/.test(pin)) return bad("PIN must be exactly 4 digits");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("Invalid date");
  if (!categories.length) return bad("Pick at least one category");

  const slug = `${slugify(clientName)}-${randomBytes(3).toString("hex")}`;

  if (isMockMode()) {
    const gallery = mockDb.createGallery({
      title,
      slug,
      client_name: clientName,
      event_date: date,
      pin_code: pin,
      categories: categories as any,
    });
    return NextResponse.json({ gallery });
  }
  try {
    const { data, error } = await db()
      .from("galleries")
      .insert({ title, slug, client_name: clientName, event_date: date, pin_code: pin, categories })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ gallery: { ...data, photo_count: 0, selected_count: 0 } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({
      error: `Database not connected (${msg}). Please configure your Supabase URL & Key in .env.local.`
    }, { status: 500 });
  }
}
