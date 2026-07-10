import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, isValidAdminPassword, setAdminSessionCookie } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload/session
 * Crea una sesión admin httpOnly tras validar ADMIN_PASSWORD.
 */
export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!isValidAdminPassword(password)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  setAdminSessionCookie(response);
  return response;
}

/**
 * GET /api/upload/session
 * Permite al frontend saber si la sesión admin actual sigue vigente.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ isAdmin: isAdminRequest(request) });
}
