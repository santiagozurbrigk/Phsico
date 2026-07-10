import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

const COOKIE_NAME = "user_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const existingUserId = request.cookies.get(COOKIE_NAME)?.value;
  if (!existingUserId) {
    const newUserId = uuidv4();
    response.cookies.set(COOKIE_NAME, newUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ONE_YEAR_SECONDS,
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplicar a todas las rutas excepto archivos estáticos y _next
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

/** Lee el user_id de la cookie en rutas API (server-side) */
export function getUserIdFromCookies(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/user_id=([^;]+)/);
  return match ? match[1] : null;
}
