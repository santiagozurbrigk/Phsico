import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserState } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/user-status
 * Devuelve el estado del usuario (para polling post-pago).
 */
export async function GET() {
  const cookieStore = cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
  }

  const state = await getUserState(userId);

  return NextResponse.json({
    isPremium: state.isPremium,
    hasUsedFreeGame: state.hasUsedFreeGame,
    premiumSince: state.premiumSince,
  });
}
