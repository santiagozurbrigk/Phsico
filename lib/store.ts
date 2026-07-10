import { kv } from "@vercel/kv";

export interface Question {
  id: number;
  statement: string;
  answer: boolean;
  explanation: string;
}

export interface QuestionsState {
  questions: Question[];
  generatedAt: number;
  nextResetAt: number;
}

export interface UserState {
  hasUsedFreeGame: boolean;
  isPremium: boolean;
  premiumSince: number | null;
  paymentId: string | null;
}

export interface AppConfig {
  pdfs: { name: string; url: string }[];
  exampleImageUrl: string | null;
  topic: string;
}

const QUESTIONS_KEY = "questions:current";
const CONFIG_KEY = "app:config";
const RESET_INTERVAL_MS = 20 * 60 * 1000; // 20 minutos

function userKey(userId: string): string {
  return `user:${userId}`;
}

const DEFAULT_USER: UserState = {
  hasUsedFreeGame: false,
  isPremium: false,
  premiumSince: null,
  paymentId: null,
};

const DEFAULT_CONFIG: AppConfig = {
  pdfs: [],
  exampleImageUrl: null,
  topic: "Psicología",
};

/** Obtiene o crea el estado del usuario en KV */
export async function getUserState(userId: string): Promise<UserState> {
  const state = await kv.get<UserState>(userKey(userId));
  return state ?? { ...DEFAULT_USER };
}

/** Guarda el estado del usuario en KV */
export async function saveUserState(
  userId: string,
  state: UserState
): Promise<void> {
  await kv.set(userKey(userId), state);
}

/** Marca la partida gratis como usada */
export async function markFreeGameUsed(userId: string): Promise<void> {
  const state = await getUserState(userId);
  state.hasUsedFreeGame = true;
  await saveUserState(userId, state);
}

/** Activa premium tras pago confirmado */
export async function activatePremium(
  userId: string,
  paymentId: string
): Promise<void> {
  const state = await getUserState(userId);
  state.isPremium = true;
  state.premiumSince = Date.now();
  state.paymentId = paymentId;
  await saveUserState(userId, state);
}

/** Obtiene la configuración de la app (PDFs, imagen, tema) */
export async function getConfig(): Promise<AppConfig> {
  const config = await kv.get<AppConfig>(CONFIG_KEY);
  return config ?? { ...DEFAULT_CONFIG };
}

/** Guarda la configuración de la app */
export async function saveConfig(config: AppConfig): Promise<void> {
  await kv.set(CONFIG_KEY, config);
}

/** Obtiene el estado actual de preguntas */
export async function getQuestionsState(): Promise<QuestionsState | null> {
  return kv.get<QuestionsState>(QUESTIONS_KEY);
}

/** Guarda el estado de preguntas */
export async function saveQuestionsState(state: QuestionsState): Promise<void> {
  await kv.set(QUESTIONS_KEY, state);
}

/**
 * Lazy reset: si pasaron 20 min desde la última generación,
 * devuelve null para indicar que hay que regenerar.
 */
export async function getOrRefreshQuestions(): Promise<{
  needsRefresh: boolean;
  state: QuestionsState | null;
}> {
  const state = await getQuestionsState();
  const now = Date.now();

  if (!state || now >= state.nextResetAt) {
    return { needsRefresh: true, state };
  }

  return { needsRefresh: false, state };
}

/** Crea un nuevo estado de preguntas con timestamp de reseteo */
export function createQuestionsState(questions: Question[]): QuestionsState {
  const now = Date.now();
  return {
    questions,
    generatedAt: now,
    nextResetAt: now + RESET_INTERVAL_MS,
  };
}

export { RESET_INTERVAL_MS };
