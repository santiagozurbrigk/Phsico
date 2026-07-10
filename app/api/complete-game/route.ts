import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserState, markFreeGameUsed } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/complete-game
 * Marca la partida gratis como usada cuando el usuario completa las 20 preguntas.
 * Solo aplica a usuarios no-premium.
 */
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
  }

  const userState = await getUserState(userId);

  // Usuarios premium no necesitan marcar partida gratis
  if (userState.isPremium) {
    return NextResponse.json({ success: true, access: "premium" });
  }

  // Marcar partida gratis como usada
  if (!userState.hasUsedFreeGame) {
    await markFreeGameUsed(userId);
  }

  return NextResponse.json({ success: true, access: "free_used" });
}
