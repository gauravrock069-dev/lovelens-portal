import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_TTL, checkAdminPassword, cookieOpts, makeToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || !checkAdminPassword(password)) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeToken("admin", ADMIN_TTL), cookieOpts(ADMIN_TTL));
  return res;
}
